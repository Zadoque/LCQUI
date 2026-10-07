process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

import * as admin from "firebase-admin";
import { dataCivilSaoPaulo, executarVerificacaoVencimentos } from "../../jobs/notificacoesReagentes";

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
});
