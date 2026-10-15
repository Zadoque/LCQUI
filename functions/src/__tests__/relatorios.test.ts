process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import {
  gerarRelatorioAlmoxarifado,
  gerarRelatorioBensPredio,
  gerarRelatorioPersonalizado,
  gerarPdfEtiquetasVirgens,
  gerarPdfReimpressaoFrascos,
} from "../relatorios";
import { criarRequestDeTeste } from "../types/testing";

describe("Relatórios e Etiquetas (IMP-REP-001, IMP-REP-002, IMP-REP-003, IMP-LABEL-001, IMP-LABEL-002)", () => {
  let db: admin.firestore.Firestore;

  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "lcqui-dev" });
    }
    db = admin.firestore();
  });

  function mockRequest(data: Record<string, unknown>, uid: string, roles: string[] = ["Chefe_Geral"]) {
    return criarRequestDeTeste(data, uid, roles);
  }

  async function criarUsuario(uid: string, papel: string, ativo = true) {
    await db.collection("Usuarios").doc(uid).set({ ativo, versao_permissoes: 1 });
    await db.collection(papel).doc(uid).set({ id_usuario: uid });
  }

  describe("IMP-REP-001: Relatório de Almoxarifado por Período", () => {
    it("TEST-INT-REP-M9-AUTH-001: deve rejeitar Aluno com permission-denied", async () => {
      const uidAluno = `aluno_rep_${Date.now()}`;
      await criarUsuario(uidAluno, "Aluno");

      const req = mockRequest(
        { idAlmoxarifado: "almox_1", mes: 5, ano: 2025 },
        uidAluno,
        ["Aluno"]
      );

      await expect(gerarRelatorioAlmoxarifado.run(req)).rejects.toMatchObject({
        code: "permission-denied",
      });
    });

    it("TEST-INT-REP-SCOPE-002: deve impedir Gestor de Almox A de gerar relatório de Almox B", async () => {
      const uidGestor = `gestor_scope_${Date.now()}`;
      await criarUsuario(uidGestor, "Gestor_Almoxarifado");
      // Vincula apenas a almox_A
      await db.collection("Gestor_Almoxarifado").doc(uidGestor).set({
        id_usuario: uidGestor,
        almoxarifados_vinculados: ["almox_A"],
      });

      const req = mockRequest(
        { idAlmoxarifado: "almox_B", mes: 5, ano: 2025 },
        uidGestor,
        ["Gestor_Almoxarifado"]
      );

      await expect(gerarRelatorioAlmoxarifado.run(req)).rejects.toMatchObject({
        code: "permission-denied",
      });
    });

    it("TEST-INT-REP-DATE-003: deve rejeitar períodos no futuro", async () => {
      const uidChefe = `chefe_fut_${Date.now()}`;
      await criarUsuario(uidChefe, "Chefe_Geral");

      const anoFuturo = new Date().getFullYear() + 2;
      const req = mockRequest(
        { idAlmoxarifado: "almox_ok", mes: 1, ano: anoFuturo },
        uidChefe,
        ["Chefe_Geral"]
      );

      await expect(gerarRelatorioAlmoxarifado.run(req)).rejects.toMatchObject({
        code: "invalid-argument",
      });
    });

    it("TEST-INT-REP-FLOW-004: deve agregar Resumo_Almoxarifado_Diario e gerar PDF com hash canônico determinístico", async () => {
      const uidChefe = `chefe_rep_${Date.now()}`;
      await criarUsuario(uidChefe, "Chefe_Geral");

      const idAlmox = `almox_flow_${Date.now()}`;
      await db.collection("Almoxarifado").doc(idAlmox).set({
        nome_almoxarifado: "Almoxarifado Central",
        predio: "CCT",
        sala: "101",
      });

      // Cria resumo diário para o mês 05/2025
      const docAlmoxId = `2025-05-15__${idAlmox}`;
      await db.collection("Resumo_Almoxarifado_Diario").doc(docAlmoxId).set({
        data_alvo: "2025-05-15",
        id_almoxarifado: idAlmox,
        massa_utilizada_g: 45.5,
        volume_utilizado_ml: 120.0,
        total_retiradas: 3,
        total_devolucoes: 3,
        total_descartes: 0,
        total_quebras: 0,
      });

      const req = mockRequest(
        { idAlmoxarifado: idAlmox, mes: 5, ano: 2025 },
        uidChefe,
        ["Chefe_Geral"]
      );

      const res1 = await gerarRelatorioAlmoxarifado.run(req);
      expect(res1).toBeDefined();
      expect(res1.base64).toBeDefined();
      expect(res1.hash).toBeDefined();
      expect(res1.consumoMassaG).toBe(45.5);
      expect(res1.consumoVolumeMl).toBe(120.0);
      expect(res1.tamanhoBytes).toBeGreaterThan(0);

      // Chamada idêntica deve gerar o MESMO hash canônico determinístico (sem Date.now)
      const res2 = await gerarRelatorioAlmoxarifado.run(req);
      expect(res2.hash).toBe(res1.hash);
    });
  });

  describe("IMP-REP-002: Relatórios Patrimoniais", () => {
    it("TEST-INT-REP-PAT-001: deve gerar relatório filtrado por prédio e status", async () => {
      const uidChefe = `chefe_pat_${Date.now()}`;
      await criarUsuario(uidChefe, "Chefe_Geral");

      const idBem = `bem_${Date.now()}`;
      await db.collection("Bem_Patrimonial").doc(idBem).set({
        numero_patrimonio: "PAT-99901",
        nome_equipamento: "Espectrofotômetro",
        predio: "CCT",
        sala: "LAB-02",
        andar: "1",
        status: "BAIXADO",
        estado_conservacao: "INSERVIVEL",
        nome_responsavel_sei: "Prof. Alberto",
      });

      const req = mockRequest(
        { predio: "CCT", status: "BAIXADO" },
        uidChefe,
        ["Chefe_Geral"]
      );

      const res = await gerarRelatorioBensPredio.run(req);
      expect(res.base64).toBeDefined();
      expect(res.hash).toBeDefined();
      expect(res.totalBens).toBeGreaterThanOrEqual(1);
    });

    it("TEST-INT-REP-PERS-002: deve validar máximo de 31 dias no relatório personalizado", async () => {
      const uidChefe = `chefe_pers_${Date.now()}`;
      await criarUsuario(uidChefe, "Chefe_Geral");

      const req = mockRequest(
        {
          dataInicio: "2025-01-01",
          dataFim: "2025-03-01", // > 31 dias
          entidade: "Reagentes",
        },
        uidChefe,
        ["Chefe_Geral"]
      );

      await expect(gerarRelatorioPersonalizado.run(req)).rejects.toMatchObject({
        code: "invalid-argument",
      });
    });
  });

  describe("IMP-REP-003: Rate Limiting de Relatórios", () => {
    it("TEST-INT-REP-RATE-001: deve aplicar limite de requisições por UID (máximo 10/min)", async () => {
      const uidSpam = `chefe_spam_${Date.now()}`;
      await criarUsuario(uidSpam, "Chefe_Geral");

      const req = mockRequest(
        { predio: "CCT" },
        uidSpam,
        ["Chefe_Geral"]
      );

      // Pré-popula 10 requisições recentes na coleção de rate limit
      const agora = Date.now();
      const requisicoes = Array(10).fill(agora - 1000);
      await db.collection("Sistema_Rate_Limit_Relatorios").doc(uidSpam).set({
        requisicoes,
        ultimo_acesso: agora,
      });

      await expect(gerarRelatorioBensPredio.run(req)).rejects.toMatchObject({
        code: "resource-exhausted",
      });
    });
  });

  describe("IMP-LABEL-001: Etiquetas Virgens", () => {
    it("TEST-INT-LABEL-001: deve rejeitar lote com quantidade inválida (< 1 ou > 50)", async () => {
      const uidChefe = `chefe_etiq_${Date.now()}`;
      await criarUsuario(uidChefe, "Chefe_Geral");

      // Intervalo de 60 etiquetas (> 50)
      const req = mockRequest(
        { codigoInicial: 1, codigoFinal: 60 },
        uidChefe,
        ["Chefe_Geral"]
      );

      await expect(gerarPdfEtiquetasVirgens.run(req)).rejects.toMatchObject({
        code: "invalid-argument",
      });
    });

    it("TEST-INT-LABEL-IDEM-002: deve suportar idempotência M7 com idOperacao", async () => {
      const uidChefe = `chefe_etiq_idem_${Date.now()}`;
      await criarUsuario(uidChefe, "Chefe_Geral");

      const idOperacao = `op_etiq_${Date.now()}`;
      const req = mockRequest(
        { codigoInicial: 100, codigoFinal: 105, idOperacao },
        uidChefe,
        ["Chefe_Geral"]
      );

      const res1 = await gerarPdfEtiquetasVirgens.run(req);
      expect(res1.totalEtiquetas).toBe(6);
      expect(res1.base64).toBeDefined();

      // Chamada repetida com mesmo idOperacao deve dar replay
      const res2 = await gerarPdfEtiquetasVirgens.run(req);
      expect(res2.totalEtiquetas).toBe(6);
      expect(res2.base64).toBe(res1.base64);
    });
  });

  describe("IMP-LABEL-002: Reimpressão e Ficha de Frascos (Fail-Closed)", () => {
    it("TEST-INT-LABEL-REIMP-FAIL-CLOSED-001: deve falhar fechado se qualquer frasco não existir e NÃO criar auditoria", async () => {
      const uidChefe = `chefe_reimp_fail_${Date.now()}`;
      await criarUsuario(uidChefe, "Chefe_Geral");

      const idValido = `frasco_val_${Date.now()}`;
      await db.collection("Frasco_Reagente").doc(idValido).set({
        codigo_frasco: "LCQUI-001",
        nome_reagente: "Acetona",
        id_almoxarifado: "almox_1",
      });

      const auditCountBefore = (await db.collection("Registro_de_Auditoria").get()).size;

      const req = mockRequest(
        { frascoIds: [idValido, "frasco_inexistente_999"] },
        uidChefe,
        ["Chefe_Geral"]
      );

      await expect(gerarPdfReimpressaoFrascos.run(req)).rejects.toMatchObject({
        code: "not-found",
      });

      // Verifica que nenhuma auditoria foi gravada na falha
      const auditCountAfter = (await db.collection("Registro_de_Auditoria").get()).size;
      expect(auditCountAfter).toBe(auditCountBefore);
    });

    it("TEST-INT-LABEL-REIMP-SCOPE-002: Gestor deve ser impedido se frasco pertencer a outro almoxarifado", async () => {
      const uidGestor = `gestor_reimp_scope_${Date.now()}`;
      await criarUsuario(uidGestor, "Gestor_Almoxarifado");
      await db.collection("Gestor_Almoxarifado").doc(uidGestor).set({
        id_usuario: uidGestor,
        almoxarifados_vinculados: ["almox_gestor_autorizado"],
      });

      const idFrascoOutro = `frasco_outro_${Date.now()}`;
      await db.collection("Frasco_Reagente").doc(idFrascoOutro).set({
        codigo_frasco: "LCQUI-OUTRO",
        nome_reagente: "Etanol",
        id_almoxarifado: "almox_estranho",
      });

      const req = mockRequest(
        { frascoIds: [idFrascoOutro] },
        uidGestor,
        ["Gestor_Almoxarifado"]
      );

      await expect(gerarPdfReimpressaoFrascos.run(req)).rejects.toMatchObject({
        code: "permission-denied",
      });
    });

    it("TEST-INT-LABEL-REIMP-SUCCESS-003: deve gerar ficha e registrar auditoria para cada frasco somente no sucesso", async () => {
      const uidChefe = `chefe_reimp_ok_${Date.now()}`;
      await criarUsuario(uidChefe, "Chefe_Geral");

      const idFrasco1 = `frasco_ok_1_${Date.now()}`;
      const idFrasco2 = `frasco_ok_2_${Date.now()}`;

      await db.collection("Frasco_Reagente").doc(idFrasco1).set({
        codigo_frasco: "LCQUI-201",
        nome_reagente: "Metanol P.A.",
        id_almoxarifado: "almox_1",
        peso_atual: 500,
        estado_fisico_frasco: "DISPONIVEL",
      });

      await db.collection("Frasco_Reagente").doc(idFrasco2).set({
        codigo_frasco: "LCQUI-202",
        nome_reagente: "Clorofórmio",
        id_almoxarifado: "almox_1",
        peso_atual: 1200,
        estado_fisico_frasco: "DISPONIVEL",
      });

      const req = mockRequest(
        { frascoIds: [idFrasco1, idFrasco2] },
        uidChefe,
        ["Chefe_Geral"]
      );

      const res = await gerarPdfReimpressaoFrascos.run(req);
      expect(res.totalFrascos).toBe(2);
      expect(res.base64).toBeDefined();

      // Auditoria deve ter exatamente os 2 registros
      const auditsSnap = await db.collection("Registro_de_Auditoria")
        .where("id_usuario", "==", uidChefe)
        .where("acao", "==", "REIMPRESSAO_ETIQUETA")
        .get();

      expect(auditsSnap.docs.length).toBe(2);
    });
  });
});
