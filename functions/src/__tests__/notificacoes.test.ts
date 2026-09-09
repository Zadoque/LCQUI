process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { marcarNotificacaoComoLida } from "../notificacoes";

const testEnv = fft({ projectId: "lcqui-dev" });

describe("Módulo de Notificações", () => {
  let db: admin.firestore.Firestore;

  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "lcqui-dev" });
    }
    db = admin.firestore();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  const mockRequest = (data: any, uid: string): any => ({
    data,
    auth: {
      uid,
      token: { roles: [] }
    },
    rawRequest: {}
  });

  it("deve marcar notificação como lida", async () => {
    const notifRef = db.collection("Usuarios").doc("user_notif").collection("Notificacoes").doc("notif1");
    await notifRef.set({
      lida: false,
      tipo: "POST"
    });

    const wrapped = testEnv.wrap(marcarNotificacaoComoLida);
    await wrapped(mockRequest({ idNotificacao: "notif1" }, "user_notif"));

    const snap = await notifRef.get();
    expect(snap.data()?.lida).toBe(true);
    expect(snap.data()?.lida_em).toBeDefined();
  });

  it("deve falhar ao marcar notificação inexistente como lida", async () => {
    const wrapped = testEnv.wrap(marcarNotificacaoComoLida);
    await expect(wrapped(mockRequest({ idNotificacao: "nao_existe" }, "user_notif")))
      .rejects.toThrow(/não encontrada/i);
  });
});
