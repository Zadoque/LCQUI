process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { CallableRequest } from "firebase-functions/v2/https";
import { marcarNotificacaoComoLida } from "../notificacoes";

const testEnv = fft({ projectId: "lcqui-dev" });

let contador = 0;
function uidUnico(prefixo: string): string {
  contador += 1;
  return `${prefixo}_${Date.now()}_${contador}`;
}

describe("Módulo de Notificações (M9 + server-owned)", () => {
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

  const mockRequest = (data: unknown, uid: string | undefined, versao = 1): CallableRequest =>
    ({
      data,
      auth: uid === undefined ? undefined : { uid, token: { roles: ["Aluno"], versao_permissoes: versao } },
      rawRequest: {},
    }) as unknown as CallableRequest;

  async function semear(
    uid: string,
    opcoes: { ativo?: boolean; versao?: number; comPapel?: boolean } = {}
  ): Promise<void> {
    const { ativo = true, versao = 1, comPapel = true } = opcoes;
    await db.collection("Usuarios").doc(uid).set({ ativo, versao_permissoes: versao });
    if (comPapel) await db.collection("Aluno").doc(uid).set({ id_usuario: uid });
  }

  // Fixture coerente com #M13Notificacao: id_destinatario == uid do caminho e
  // lida=false => lida_em=null.
  async function semearNotificacao(
    uid: string,
    id: string,
    campos: Record<string, unknown> = {}
  ): Promise<admin.firestore.DocumentReference> {
    const ref = db.collection("Usuarios").doc(uid).collection("Notificacoes").doc(id);
    await ref.set({ id_destinatario: uid, lida: false, lida_em: null, tipo: "POST", ...campos });
    return ref;
  }

  it("TEST-INT-NOTIF-M9-001 — dono ativo e corrente marca como lida", async () => {
    const uid = uidUnico("notif_ok");
    await semear(uid);
    const ref = await semearNotificacao(uid, "n1");

    const wrapped = testEnv.wrap(marcarNotificacaoComoLida);
    const resultado = await wrapped(mockRequest({ idNotificacao: "n1" }, uid));

    expect(resultado).toEqual({ success: true });
    const snap = await ref.get();
    expect(snap.data()?.lida).toBe(true);
    expect(snap.data()?.lida_em).toBeDefined();
    expect(snap.data()?.lida_em).not.toBeNull();
  });

  it("TEST-INT-NOTIF-M9-002 — não autenticado nega", async () => {
    const wrapped = testEnv.wrap(marcarNotificacaoComoLida);
    await expect(wrapped(mockRequest({ idNotificacao: "n1" }, undefined))).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("TEST-INT-NOTIF-M9-003 — usuário inativo nega e não altera a notificação", async () => {
    const uid = uidUnico("notif_inativo");
    await semear(uid, { ativo: false });
    const ref = await semearNotificacao(uid, "n1");

    const wrapped = testEnv.wrap(marcarNotificacaoComoLida);
    await expect(wrapped(mockRequest({ idNotificacao: "n1" }, uid))).rejects.toMatchObject({
      code: "permission-denied",
    });
    expect((await ref.get()).data()?.lida).toBe(false);
  });

  it("TEST-INT-NOTIF-M9-004 — token com versão obsoleta nega", async () => {
    const uid = uidUnico("notif_obsoleto");
    await semear(uid, { versao: 5 });
    await semearNotificacao(uid, "n1");
    const wrapped = testEnv.wrap(marcarNotificacaoComoLida);
    await expect(wrapped(mockRequest({ idNotificacao: "n1" }, uid, 4))).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-NOTIF-M9-005 — claim de papel sem concessão persistida nega", async () => {
    const uid = uidUnico("notif_sem_papel");
    await semear(uid, { comPapel: false });
    await semearNotificacao(uid, "n1");
    const wrapped = testEnv.wrap(marcarNotificacaoComoLida);
    await expect(wrapped(mockRequest({ idNotificacao: "n1" }, uid))).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-NOTIF-M9-006 — repetir preserva o lida_em (instante estável)", async () => {
    const uid = uidUnico("notif_idem");
    await semear(uid);
    const ref = await semearNotificacao(uid, "n1");
    const wrapped = testEnv.wrap(marcarNotificacaoComoLida);

    await wrapped(mockRequest({ idNotificacao: "n1" }, uid));
    const primeiro = (await ref.get()).data()?.lida_em.toMillis();
    await wrapped(mockRequest({ idNotificacao: "n1" }, uid));
    const segundo = (await ref.get()).data()?.lida_em.toMillis();
    expect(segundo).toBe(primeiro);
  });

  it("TEST-INT-NOTIF-M9-007 — notificação inexistente nega", async () => {
    const uid = uidUnico("notif_ausente");
    await semear(uid);
    const wrapped = testEnv.wrap(marcarNotificacaoComoLida);
    await expect(wrapped(mockRequest({ idNotificacao: "nao_existe" }, uid))).rejects.toMatchObject({
      code: "not-found",
    });
  });

  it("TEST-INT-NOTIF-M13-008 — caminho de u1 com id_destinatario de u2 nega e não altera", async () => {
    const uid = uidUnico("notif_dest_divergente");
    const outro = uidUnico("notif_dest_alvo");
    await semear(uid);
    const ref = await semearNotificacao(uid, "n_alheia", { id_destinatario: outro });

    const wrapped = testEnv.wrap(marcarNotificacaoComoLida);
    await expect(wrapped(mockRequest({ idNotificacao: "n_alheia" }, uid))).rejects.toMatchObject({
      code: "permission-denied",
    });

    const snap = await ref.get();
    expect(snap.data()?.id_destinatario).toBe(outro);
    expect(snap.data()?.lida).toBe(false);
    expect(snap.data()?.lida_em).toBeNull();
  });

  it("TEST-INT-NOTIF-M13-009 — estado lida=true com lida_em=null é fail-closed sem mutação", async () => {
    const uid = uidUnico("notif_estado_incoerente");
    await semear(uid);
    const ref = await semearNotificacao(uid, "n_incoerente", { lida: true, lida_em: null });

    const wrapped = testEnv.wrap(marcarNotificacaoComoLida);
    await expect(wrapped(mockRequest({ idNotificacao: "n_incoerente" }, uid))).rejects.toMatchObject({
      code: "failed-precondition",
    });

    const snap = await ref.get();
    expect(snap.data()?.lida).toBe(true);
    expect(snap.data()?.lida_em).toBeNull();
  });

  it("TEST-INT-NOTIF-M13-010 — estado lida=false com lida_em preenchido é fail-closed sem mutação", async () => {
    const uid = uidUnico("notif_estado_inverso");
    await semear(uid);
    const ref = await semearNotificacao(uid, "n_inverso", { lida: false, lida_em: new Date() });

    const wrapped = testEnv.wrap(marcarNotificacaoComoLida);
    await expect(wrapped(mockRequest({ idNotificacao: "n_inverso" }, uid))).rejects.toMatchObject({
      code: "failed-precondition",
    });

    const snap = await ref.get();
    expect(snap.data()?.lida).toBe(false);
    expect(snap.data()?.lida_em).not.toBeNull();
  });

  it("TEST-INT-NOTIF-M13-011 — notificação sem id_destinatario nega (fail-closed)", async () => {
    const uid = uidUnico("notif_sem_dest");
    await semear(uid);
    const ref = db.collection("Usuarios").doc(uid).collection("Notificacoes").doc("n_sem_dest");
    await ref.set({ lida: false, lida_em: null, tipo: "POST" });

    const wrapped = testEnv.wrap(marcarNotificacaoComoLida);
    await expect(wrapped(mockRequest({ idNotificacao: "n_sem_dest" }, uid))).rejects.toMatchObject({
      code: "permission-denied",
    });

    const snap = await ref.get();
    expect(snap.data()?.lida).toBe(false);
  });
});
