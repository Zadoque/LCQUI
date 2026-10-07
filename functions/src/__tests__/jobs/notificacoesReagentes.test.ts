process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

import * as admin from "firebase-admin";
import { dataCivilSaoPaulo, executarVerificacaoEscassez, executarVerificacaoVencimentos } from "../../jobs/notificacoesReagentes";

describe("jobs de notificações de reagentes", () => {
  let db: admin.firestore.Firestore;

  beforeAll(() => {
    if (!admin.apps.length) admin.initializeApp({ projectId: "lcqui-dev" });
    db = admin.firestore();
  });

  it("deriva a data civil no fuso institucional de São Paulo", () => {
    expect(dataCivilSaoPaulo(new Date("2026-10-07T02:30:00.000Z"))).toBe("2026-10-06");
    expect(dataCivilSaoPaulo(new Date("2026-10-07T03:30:00.000Z"))).toBe("2026-10-07");
  });

  it("marca vencimento, registra histórico e deduplica alerta por dia e almoxarifado", async () => {
    const idAlmoxarifado = `almox-job-${Date.now()}`;
    const uid = `gestor-job-${Date.now()}`;
    const idFrasco = `frasco-job-${Date.now()}`;
    await db.collection("Frasco_Reagente").doc(idFrasco).set({
      id_almoxarifado: idAlmoxarifado,
      validade_efetiva: new Date(Date.now() - 60_000),
      vencido: false,
    });
    await db.collection("Gestor_Almoxarifado_x_Almoxarifado").doc(`${uid}_${idAlmoxarifado}`).set({
      id_gestor_almoxarifado: uid,
      id_almoxarifado: idAlmoxarifado,
    });

    await executarVerificacaoVencimentos();
    await executarVerificacaoVencimentos();

    expect((await db.collection("Frasco_Reagente").doc(idFrasco).get()).data()?.vencido).toBe(true);
    expect((await db.collection("Historico_Frasco_Reagente")
      .where("id_frasco_reagente", "==", idFrasco).get()).size).toBe(1);
    expect((await db.collection("Usuarios").doc(uid).collection("Notificacoes")
      .where("tipo", "==", "FRASCOS_VENCIDOS").get()).size).toBe(1);
  });

  it("emite escassez somente abaixo do limiar e deduplica a configuração diária", async () => {
    const idAlmoxarifado = `almox-escassez-${Date.now()}`;
    const uid = `gestor-escassez-${Date.now()}`;
    await db.collection("Almoxarifado").doc(idAlmoxarifado).set({ ativo: true });
    await db.collection("Almoxarifado").doc(idAlmoxarifado)
      .collection("Estoques_Configurados").doc("cfg").set({
        id_resumo_reagente: "resumo",
        id_especificacao_reagente: "especificacao",
        qtd_limiar_escassez: 2,
        ativo: true,
        notificacao_ativa: true,
      });
    await db.collection("Gestor_Almoxarifado_x_Almoxarifado").doc(`${uid}_${idAlmoxarifado}`).set({
      id_gestor_almoxarifado: uid,
      id_almoxarifado: idAlmoxarifado,
    });
    await executarVerificacaoEscassez();
    await executarVerificacaoEscassez();

    const notificacoes = await db.collection("Usuarios").doc(uid).collection("Notificacoes")
      .where("tipo", "==", "ESCASSEZ_ESTOQUE").get();
    expect(notificacoes.size).toBe(1);
    expect(notificacoes.docs[0].data().quantidade).toBe(0);
    expect(notificacoes.docs[0].data().expira_em).toBeNull();
  });
});
