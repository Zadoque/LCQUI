process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import {
  obterEstoqueAtual,
  configurarLimiarEscassez,
  frascoAptoParaUso,
} from "../estoque";
import { executarVerificacaoEscassez } from "../jobs/notificacoesReagentes";

const testEnv = fft({ projectId: "lcqui-dev" });

describe("Módulo de Estoque, Escassez e Cache (M8 - IMP-STOCK-001, IMP-STOCK-002, IMP-CACHE-001)", () => {
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

  async function seedGestor(uid: string, idAlmox: string) {
    await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Gestor_Almoxarifado").doc(uid).set({ id_usuario: uid });
    await db.collection("Gestor_Almoxarifado_x_Almoxarifado").doc(`${uid}_${idAlmox}`).set({
      id_gestor_almoxarifado: uid,
      id_almoxarifado: idAlmox,
    });
    await db.collection("Almoxarifado").doc(idAlmox).set({ nome: "Almox Teste M8", ativo: true });
  }

  it("deve verificar predicado único de aptidão frascoAptoParaUso com todas as restrições normativas", () => {
    // Apto básico
    expect(frascoAptoParaUso({
      situacao_localizacao: "LOCALIZADO",
      disponibilidade: "DISPONIVEL",
      estado_fisico_frasco: "FECHADO",
      em_quarentena: false,
      vencido: false,
    })).toBe(true);

    // Inapto: extraviado
    expect(frascoAptoParaUso({
      situacao_localizacao: "EXTRAVIADO",
      disponibilidade: "DISPONIVEL",
      estado_fisico_frasco: "FECHADO",
      em_quarentena: false,
      vencido: false,
    })).toBe(false);

    // Inapto: emprestado
    expect(frascoAptoParaUso({
      situacao_localizacao: "LOCALIZADO",
      disponibilidade: "EMPRESTADO",
      estado_fisico_frasco: "ABERTO",
      em_quarentena: false,
      vencido: false,
    })).toBe(false);

    // Inapto: em quarentena
    expect(frascoAptoParaUso({
      situacao_localizacao: "LOCALIZADO",
      disponibilidade: "DISPONIVEL",
      estado_fisico_frasco: "FECHADO",
      em_quarentena: true,
      vencido: false,
    })).toBe(false);

    // Inapto: vazio, quebrado ou descartado
    expect(frascoAptoParaUso({
      situacao_localizacao: "LOCALIZADO",
      disponibilidade: "DISPONIVEL",
      estado_fisico_frasco: "VAZIO",
      em_quarentena: false,
      vencido: false,
    })).toBe(false);

    // Vencido sem autorização: inapto
    expect(frascoAptoParaUso({
      situacao_localizacao: "LOCALIZADO",
      disponibilidade: "DISPONIVEL",
      estado_fisico_frasco: "FECHADO",
      em_quarentena: false,
      vencido: true,
      uso_vencido_autorizado: false,
    })).toBe(false);

    // Vencido com autorização: apto
    expect(frascoAptoParaUso({
      situacao_localizacao: "LOCALIZADO",
      disponibilidade: "DISPONIVEL",
      estado_fisico_frasco: "FECHADO",
      em_quarentena: false,
      vencido: true,
      uso_vencido_autorizado: true,
    })).toBe(true);
  });

  it("deve agregar estoque atual com precisão segregando aptos, saldos e estados (IMP-STOCK-001)", async () => {
    const idAlmox = `almox_est_${Date.now()}`;
    const uidGestor = `gestor_est_${Date.now()}`;
    await seedGestor(uidGestor, idAlmox);

    const idResumo = `resumo_est_${Date.now()}`;

    // Frasco 1: Apto sólido 100g
    await db.collection("Frasco_Reagente").doc(`f1_${Date.now()}`).set({
      id_almoxarifado: idAlmox,
      id_resumo_reagente: idResumo,
      situacao_localizacao: "LOCALIZADO",
      disponibilidade: "DISPONIVEL",
      estado_fisico_frasco: "FECHADO",
      em_quarentena: false,
      vencido: false,
      saldo_desconhecido: false,
      saldo_aferido_g: 100,
    });

    // Frasco 2: Emprestado sólido 50g
    await db.collection("Frasco_Reagente").doc(`f2_${Date.now()}`).set({
      id_almoxarifado: idAlmox,
      id_resumo_reagente: idResumo,
      situacao_localizacao: "LOCALIZADO",
      disponibilidade: "EMPRESTADO",
      estado_fisico_frasco: "ABERTO",
      em_quarentena: false,
      vencido: false,
      saldo_desconhecido: false,
      saldo_aferido_g: 50,
    });

    // Frasco 3: Apto líquido 200mL com saldo desconhecido
    await db.collection("Frasco_Reagente").doc(`f3_${Date.now()}`).set({
      id_almoxarifado: idAlmox,
      id_resumo_reagente: idResumo,
      situacao_localizacao: "LOCALIZADO",
      disponibilidade: "DISPONIVEL",
      estado_fisico_frasco: "ABERTO",
      em_quarentena: false,
      vencido: false,
      saldo_desconhecido: true,
    });

    // Frasco 4: Em quarentena (inapto)
    await db.collection("Frasco_Reagente").doc(`f4_${Date.now()}`).set({
      id_almoxarifado: idAlmox,
      id_resumo_reagente: idResumo,
      situacao_localizacao: "LOCALIZADO",
      disponibilidade: "INDISPONIVEL",
      estado_fisico_frasco: "FECHADO",
      em_quarentena: true,
      vencido: false,
    });

    const res = await testEnv.wrap(obterEstoqueAtual)(mockRequest({
      idAlmoxarifado: idAlmox,
      idResumoReagente: idResumo,
    }, uidGestor));

    expect(res.qtd_total).toBe(4);
    expect(res.qtd_aptos).toBe(2); // f1 e f3
    expect(res.qtd_emprestados).toBe(1); // f2
    expect(res.qtd_saldo_desconhecido).toBe(1); // f3
    expect(res.massa_aferida_g).toBe(150); // 100 + 50
    expect(res.fonte).toBe("CALCULADO");
  });

  it("deve publicar cache do dashboard e servir requisição subsequente via cache (IMP-CACHE-001)", async () => {
    const idAlmox = `almox_cache_${Date.now()}`;
    const uidGestor = `gestor_cache_${Date.now()}`;
    await seedGestor(uidGestor, idAlmox);

    // 1ª chamada: CALCULADO
    const res1 = await testEnv.wrap(obterEstoqueAtual)(mockRequest({
      idAlmoxarifado: idAlmox,
    }, uidGestor));
    expect(res1.fonte).toBe("CALCULADO");

    // 2ª chamada imediata: CACHE (< 30s)
    const res2 = await testEnv.wrap(obterEstoqueAtual)(mockRequest({
      idAlmoxarifado: idAlmox,
    }, uidGestor));
    expect(res2.fonte).toBe("CACHE");
    expect(res2.qtd_total).toBe(res1.qtd_total);
  });

  it("deve aplicar rate limit de 5 requisições por minuto por UID no dashboard (IMP-CACHE-001)", async () => {
    const idAlmox = `almox_rl_${Date.now()}`;
    const uidGestor = `gestor_rl_${Date.now()}`;
    await seedGestor(uidGestor, idAlmox);

    // Faz 5 requisições com sucesso
    for (let i = 0; i < 5; i++) {
      await testEnv.wrap(obterEstoqueAtual)(mockRequest({
        idAlmoxarifado: idAlmox,
      }, uidGestor));
    }

    // A 6ª requisição dentro da mesma janela de 60s deve falhar com resource-exhausted
    await expect(testEnv.wrap(obterEstoqueAtual)(mockRequest({
      idAlmoxarifado: idAlmox,
    }, uidGestor))).rejects.toThrow(/Limite de requisições do dashboard excedido/i);
  });

  it("deve configurar limiar de escassez e disparar alertas deduplicados diariamente no job (IMP-STOCK-002)", async () => {
    const idAlmox = `almox_scarcity_${Date.now()}`;
    const uidGestor = `gestor_scarcity_${Date.now()}`;
    await seedGestor(uidGestor, idAlmox);

    const idResumo = `resumo_sc_${Date.now()}`;
    const idEspec = `espec_sc_${Date.now()}`;

    // Configura limiar de escassez com idempotência M7
    const reqConfig = mockRequest({
      idOperacao: `op_sc_${Date.now()}`,
      idAlmoxarifado: idAlmox,
      idResumoReagente: idResumo,
      idEspecificacaoReagente: idEspec,
      qtdLimiarEscassez: 3,
      ativo: true,
      notificacaoAtiva: true,
    }, uidGestor);

    const resConfig = await testEnv.wrap(configurarLimiarEscassez)(reqConfig);
    expect(resConfig.status).toBe("OK");
    expect(resConfig.qtdLimiarEscassez).toBe(3);

    // Replay idempotente
    const replay = await testEnv.wrap(configurarLimiarEscassez)(reqConfig);
    expect(replay.status).toBe("OK");

    // Cadastra apenas 1 frasco apto (1 < 3 -> escassez configurada)
    await db.collection("Frasco_Reagente").doc(`f_sc_${Date.now()}`).set({
      id_almoxarifado: idAlmox,
      id_resumo_reagente: idResumo,
      id_especificacao_reagente: idEspec,
      situacao_localizacao: "LOCALIZADO",
      disponibilidade: "DISPONIVEL",
      estado_fisico_frasco: "FECHADO",
      em_quarentena: false,
      vencido: false,
    });

    // Executa job de verificação de escassez
    await executarVerificacaoEscassez();

    // Notificação foi gerada para o gestor vinculado
    const notifsSnap = await db
      .collection("Usuarios")
      .doc(uidGestor)
      .collection("Notificacoes")
      .where("tipo", "==", "ESCASSEZ_ESTOQUE")
      .get();

    expect(notifsSnap.size).toBe(1);
    const notif = notifsSnap.docs[0].data();
    expect(notif.tipo).toBe("ESCASSEZ_ESTOQUE");
    expect(notif.papel_destinatario).toBe("Gestor_Almoxarifado");
    expect(notif.quantidade).toBe(1);
    expect(notif.expira_em).toBeNull(); // Normativo M8/M13: expira_em é null

    // Segunda execução no mesmo dia não duplica notificação (deduplicação diária)
    await executarVerificacaoEscassez();
    const notifsSnap2 = await db
      .collection("Usuarios")
      .doc(uidGestor)
      .collection("Notificacoes")
      .where("tipo", "==", "ESCASSEZ_ESTOQUE")
      .get();
    expect(notifsSnap2.size).toBe(1);
  });
});
