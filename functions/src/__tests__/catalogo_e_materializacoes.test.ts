process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { Timestamp } from "firebase-admin/firestore";
import {
  gerarCatalogoReagentes,
  obterCatalogoReagentes,
  resolverCatalogoPorIds,
} from "../catalogo";
import { cadastrarEspecificacao, cadastrarResumoReagente } from "../reagentes_base";
import {
  processarMaterializacaoDiariaFlow,
  obterJanelaDiaSaoPaulo,
  consolidarResumosDiariosCallable,
} from "../jobs/materializacoesFlow";

const testEnv = fft({ projectId: "lcqui-dev" });

describe("Catálogo JSON (IMP-BASE-004) e Materializações FLOW (IMP-MVIEW-001)", () => {
  let db: admin.firestore.Firestore;

  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "lcqui-dev" });
    }
    db = admin.firestore();
  });

  afterAll(async () => {
    testEnv.cleanup();
  });

  function mockRequest(data: any, uid: string, roles: string[] = ["Gestor_Almoxarifado"]) {
    return {
      data,
      auth: {
        uid,
        token: {
          roles,
          versao_permissoes: 1,
        },
      },
      rawRequest: {},
    } as any;
  }

  describe("Catálogo JSON de Reagentes (IMP-BASE-004)", () => {
    it("deve gerar o catálogo JSON versionado e atualizar Sistema_Catalogo_Reagentes/estado", async () => {
      const uidGestor = `gestor_cat_${Date.now()}`;
      await db.collection("Usuarios").doc(uidGestor).set({ ativo: true, versao_permissoes: 1 });
      await db.collection("Gestor_Almoxarifado").doc(uidGestor).set({ id_usuario: uidGestor });

      const idResumo = `res_cat_${Date.now()}`;
      const idEspec = `esp_cat_${Date.now()}`;

      await db.collection("Resumo_Reagente").doc(idResumo).set({
        nome: "Ácido Sulfúrico",
        tipo_substancia: "PURA",
        estado_fisico: "LIQUIDO",
        eh_higroscopico: true,
      });

      await db.collection("Resumo_Reagente").doc(idResumo).collection("Especificacoes").doc(idEspec).set({
        descricao: "98% P.A.",
        fabricante: "Merck",
        densidade: 1.84,
        unidade_de_medida: "ml",
        estado_fisico: "LIQUIDO",
      });

      const res = await testEnv.wrap(gerarCatalogoReagentes)(mockRequest({}, uidGestor));
      expect(res.status).toBe("OK");
      expect(res.versaoPublicada).toBeGreaterThan(0);
      expect(res.schemaVersion).toBe(1);

      const estadoDoc = await db.collection("Sistema_Catalogo_Reagentes").doc("estado").get();
      expect(estadoDoc.exists).toBe(true);
      expect(estadoDoc.data()?.versao_publicada).toBe(res.versaoPublicada);
      expect(estadoDoc.data()?.versao_fonte).toBeGreaterThanOrEqual(res.versaoPublicada);
      expect(estadoDoc.data()?.storage_path).toMatch(
        new RegExp(`^catalogo-reagentes/v${res.versaoPublicada}-[a-f0-9]{64}\\.json$`),
      );
      expect(estadoDoc.data()?.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(estadoDoc.data()?.gerado_em).toBeDefined();
    });

    it("deve rejeitar geração com claim antiga após revogação persistida", async () => {
      const uidGestor = `gestor_cat_revogado_${Date.now()}`;
      await db.collection("Usuarios").doc(uidGestor).set({ ativo: true, versao_permissoes: 2 });
      await db.collection("Gestor_Almoxarifado").doc(uidGestor).set({ id_usuario: uidGestor });

      await expect(
        testEnv.wrap(gerarCatalogoReagentes)(mockRequest({}, uidGestor, ["Gestor_Almoxarifado"]))
      ).rejects.toThrow(/permissões desatualizadas/i);
      await expect(
        testEnv.wrap(obterCatalogoReagentes)(mockRequest({}, uidGestor, ["Gestor_Almoxarifado"]))
      ).rejects.toThrow(/permissões desatualizadas/i);
      await expect(
        testEnv.wrap(resolverCatalogoPorIds)(mockRequest({
          idResumo: "resumo_inexistente",
          idEspecificacao: "especificacao_inexistente",
        }, uidGestor, ["Gestor_Almoxarifado"]))
      ).rejects.toThrow(/permissões desatualizadas/i);
    });

    it("deve incrementar versao_fonte atomicamente ao criar resumo e especificação", async () => {
      const uidGestor = `gestor_cat_mutacao_${Date.now()}`;
      await db.collection("Usuarios").doc(uidGestor).set({ ativo: true, versao_permissoes: 1 });
      await db.collection("Gestor_Almoxarifado").doc(uidGestor).set({ id_usuario: uidGestor });

      const estadoRef = db.collection("Sistema_Catalogo_Reagentes").doc("estado");
      const antesResumo = Number((await estadoRef.get()).data()?.versao_fonte ?? 0);
      const resumo = await testEnv.wrap(cadastrarResumoReagente)({
        data: {
          idOperacao: `op_cat_resumo_${Date.now()}`,
          nome: "Reagente de prova do catálogo",
          tipoSubstancia: "PURA",
          naturezaQuimica: "INORGANICO",
          estadoFisico: "SOLIDO",
          requerPesagemFrequente: false,
          frequenciaPesagemDias: null,
          ehHigroscopico: false,
          qtdEmQueEConsideradoEscasso: 1,
        },
        auth: { uid: uidGestor, token: { roles: ["Gestor_Almoxarifado"], versao_permissoes: 1 } },
        rawRequest: {},
      } as any);
      const depoisResumo = Number((await estadoRef.get()).data()?.versao_fonte);
      expect(depoisResumo).toBe(antesResumo + 1);

      const substanciaRef = db.collection("Substancia_Quimica").doc(`sub_cat_${Date.now()}`);
      await substanciaRef.set({ nome: "Substância de prova", ativo: true });
      await testEnv.wrap(cadastrarEspecificacao)({
        data: {
          idOperacao: `op_cat_espec_${Date.now()}`,
          idResumoReagente: resumo.idResumoReagente,
          descricao: "Especificação de prova",
          fabricante: "Fabricante de prova",
          classeInflamabilidade: "NAO_INFLAMAVEL",
          ehControladoPf: false,
          ehControladoEb: false,
          idSubstanciaQuimica: substanciaRef.id,
        },
        auth: { uid: uidGestor, token: { roles: ["Gestor_Almoxarifado"], versao_permissoes: 1 } },
        rawRequest: {},
      } as any);
      const depoisEspecificacao = Number((await estadoRef.get()).data()?.versao_fonte);
      expect(depoisEspecificacao).toBe(depoisResumo + 1);
    });

    it("deve permitir download do catálogo para papéis autorizados (incluindo Aluno) e rejeitar não autorizados", async () => {
      await db.collection("Sistema_Catalogo_Reagentes").doc("estado").set({
        versao_fonte: 99,
        versao_publicada: 0,
        catalogo_embutido: null,
        storage_path: null,
        sha256: null,
        schema_version: 1,
      });
      const uidAluno = `aluno_cat_${Date.now()}`;
      await db.collection("Usuarios").doc(uidAluno).set({ ativo: true, versao_permissoes: 1 });
      await db.collection("Aluno").doc(uidAluno).set({ id_usuario: uidAluno });

      // Aluno autorizado
      const resAluno = await testEnv.wrap(obterCatalogoReagentes)(mockRequest({}, uidAluno, ["Aluno"]));
      expect(resAluno.versaoPublicada).toBeDefined();
      expect(resAluno.schemaVersion).toBe(1);
      expect(resAluno.storagePath).toMatch(/^catalogo-reagentes\/v99-[a-f0-9]{64}\.json$/);
      expect(resAluno.catalogo?.resumos).toBeDefined();

      // Usuário sem papel autorizado deve falhar fechado
      const uidSemPapel = `user_nopaper_${Date.now()}`;
      await expect(testEnv.wrap(obterCatalogoReagentes)(mockRequest({}, uidSemPapel, [])))
        .rejects.toThrow(/permissão negada|não possui autoridade|usuário não habilitado/i);
    });

    it("deve resolver catálogo por IDs com fallback canônico e falhar com erro de integridade referencial se ID não existir", async () => {
      const uidProfessor = `prof_cat_${Date.now()}`;
      await db.collection("Usuarios").doc(uidProfessor).set({ ativo: true, versao_permissoes: 1 });
      await db.collection("Professor").doc(uidProfessor).set({ id_usuario: uidProfessor });

      const idResumo = `res_fall_${Date.now()}`;
      const idEspec = `esp_fall_${Date.now()}`;

      await db.collection("Resumo_Reagente").doc(idResumo).set({
        nome: "Cloreto de Sódio",
        tipo_substancia: "PURA",
        estado_fisico: "SOLIDO",
      });

      await db.collection("Resumo_Reagente").doc(idResumo).collection("Especificacoes").doc(idEspec).set({
        descricao: "99.5% P.A.",
        fabricante: "Synth",
      });

      // Sucesso na resolução
      const res = await testEnv.wrap(resolverCatalogoPorIds)(mockRequest({
        idResumo,
        idEspecificacao: idEspec,
      }, uidProfessor, ["Professor"]));

      expect((res.resumo as any).nome).toBe("Cloreto de Sódio");
      expect((res.especificacao as any).descricao).toBe("99.5% P.A.");

      // Erro de integridade referencial: especificação inexistente
      await expect(testEnv.wrap(resolverCatalogoPorIds)(mockRequest({
        idResumo,
        idEspecificacao: "espec_inexistente_999",
      }, uidProfessor, ["Professor"]))).rejects.toThrow(/Erro de integridade referencial/i);
    });
  });

  describe("Materializações Diárias FLOW (IMP-MVIEW-001)", () => {
    it("deve validar a autoridade persistida e a data civil antes do reprocessamento", async () => {
      const uidGestor = `gestor_mview_validacao_${Date.now()}`;
      await db.collection("Usuarios").doc(uidGestor).set({ ativo: true, versao_permissoes: 1 });
      await db.collection("Gestor_Almoxarifado").doc(uidGestor).set({ id_usuario: uidGestor });

      await expect(
        testEnv.wrap(consolidarResumosDiariosCallable)(mockRequest({ dataAlvo: "2026-02-30" }, uidGestor))
      ).rejects.toThrow(/data civil válida/i);

      await expect(
        testEnv.wrap(consolidarResumosDiariosCallable)(mockRequest({ dataAlvo: "15-06-2026" }, uidGestor))
      ).rejects.toThrow(/YYYY-MM-DD/i);

      await expect(
        testEnv.wrap(consolidarResumosDiariosCallable)(mockRequest({ dataAlvo: "2026-06-15" }, uidGestor, ["Gestor_Almoxarifado"]))
      ).resolves.toMatchObject({ status: "OK", dataAlvo: "2026-06-15" });
    });

    it("deve consolidar Resumo_Almoxarifado_Diario e Resumo_Reagente_Diario com substituição absoluta idempotente", async () => {
      const idAlmox = `almox_mview_${Date.now()}`;
      await db.collection("Almoxarifado").doc(idAlmox).set({ nome: "Almox MView", ativo: true });

      const dataAlvo = "2026-06-15";
      const { inicio } = obterJanelaDiaSaoPaulo(dataAlvo);
      const dataHoraFato = Timestamp.fromDate(new Date(inicio.getTime() + 10 * 3600 * 1000)); // 10h da manhã

      const idResumo = `res_mview_${Date.now()}`;

      // Fato 1: Devolução com consumo de 30 mL
      await db.collection("Emprestimo_Reagente").doc(`emp_mview_${Date.now()}`).set({
        id_almoxarifado: idAlmox,
        id_resumo_reagente: idResumo,
        data_devolucao_efetuada: dataHoraFato,
        consumo_validado: true,
        medida_utilizada: 30,
        unidade_medida_utilizada: "ml",
        peso_perda_evaporacao: 1.5,
      });

      // Fato 2: Evento histórico de descarte
      await db.collection("Historico_Frasco_Reagente").doc(`hist_mview_${Date.now()}`).set({
        id_almoxarifado: idAlmox,
        tipo: "FOI_DESCARTADO",
        timestamp: dataHoraFato,
      });

      // 1ª execução
      const resultado1 = await processarMaterializacaoDiariaFlow(dataAlvo);
      expect(resultado1.dataAlvo).toBe(dataAlvo);

      const docAlmox = await db.collection("Resumo_Almoxarifado_Diario").doc(`${dataAlvo}__${idAlmox}`).get();
      expect(docAlmox.exists).toBe(true);
      const dataAlmox = docAlmox.data()!;
      expect(dataAlmox.versao_calculo).toBe("flow-v2");
      expect(dataAlmox.total_devolucoes).toBe(1);
      expect(dataAlmox.volume_utilizado_no_dia_ml).toBe(30);
      expect(dataAlmox.volume_evaporado_no_dia_ml).toBe(1.5);
      expect(dataAlmox.total_descartes).toBe(1);

      const docResumo = await db.collection("Resumo_Reagente_Diario").doc(`${dataAlvo}__${idAlmox}__${idResumo}`).get();
      expect(docResumo.exists).toBe(true);
      expect(docResumo.data()?.volume_utilizado_no_dia_ml).toBe(30);

      // 2ª execução na mesma data alvo: deve substituir absolutamente sem incrementar
      await processarMaterializacaoDiariaFlow(dataAlvo);
      const docAlmoxReexec = await db.collection("Resumo_Almoxarifado_Diario").doc(`${dataAlvo}__${idAlmox}`).get();
      expect(docAlmoxReexec.data()?.total_devolucoes).toBe(1);
      expect(docAlmoxReexec.data()?.volume_utilizado_no_dia_ml).toBe(30);
    });
  });
});
