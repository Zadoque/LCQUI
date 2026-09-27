process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { CallableRequest } from "firebase-functions/v2/https";
import { marcarNotificacaoComoLida, limparTudoNotificacoes } from "../notificacoes";

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

  describe("Limpar tudo (RN-M13-02, M7/M13)", () => {
    const agora = Date.now();
    const corte = new Date(agora).toISOString();

    it("TEST-INT-NOTIF-M13-012 — marca todas as ativas do próprio UID sem DELETE", async () => {
      const uid = uidUnico("notif_limpar");
      await semear(uid);
      const n1 = await semearNotificacao(uid, "a", {
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora - 2000),
      });
      const n2 = await semearNotificacao(uid, "b", {
        papel_destinatario: "Gestor_Almoxarifado",
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora - 1000),
      });

      const wrapped = testEnv.wrap(limparTudoNotificacoes);
      const resultado = await wrapped(mockRequest({ corte }, uid));

      expect(resultado.marcadas).toBe(2);
      expect(resultado.continuar).toBe(false);
      for (const ref of [n1, n2]) {
        const dados = (await ref.get()).data();
        expect(dados?.lida).toBe(true);
        expect(dados?.lida_em).not.toBeNull();
      }
      const snap = await db.collection("Usuarios").doc(uid).collection("Notificacoes").get();
      expect(snap.size).toBe(2);
    });

    it("TEST-INT-NOTIF-M13-013 — retry preserva o instante já gravado", async () => {
      const uid = uidUnico("notif_limpar_idem");
      await semear(uid);
      const antigo = new Date(agora - 100000);
      const jaLida = await semearNotificacao(uid, "ja_lida", {
        lida: true,
        lida_em: antigo,
        emitida_em: new Date(agora - 2000),
      });
      const nova = await semearNotificacao(uid, "nova", {
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora - 1000),
      });

      const wrapped = testEnv.wrap(limparTudoNotificacoes);
      await wrapped(mockRequest({ corte }, uid));
      const primeiro = (await nova.get()).data()?.lida_em.toMillis();
      await wrapped(mockRequest({ corte }, uid));
      const segundo = (await nova.get()).data()?.lida_em.toMillis();

      expect(segundo).toBe(primeiro);
      expect((await jaLida.get()).data()?.lida_em.toMillis()).toBe(antigo.getTime());
    });

    it("TEST-INT-NOTIF-M13-014 — corte estável exclui emissão posterior", async () => {
      const uid = uidUnico("notif_limpar_corte");
      await semear(uid);
      const antes = await semearNotificacao(uid, "antes", {
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora - 1000),
      });
      const depois = await semearNotificacao(uid, "depois", {
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora + 30000),
      });

      const wrapped = testEnv.wrap(limparTudoNotificacoes);
      const resultado = await wrapped(mockRequest({ corte }, uid));

      expect(resultado.marcadas).toBe(1);
      expect((await antes.get()).data()?.lida).toBe(true);
      expect((await depois.get()).data()?.lida).toBe(false);

      const proxima = await wrapped(
        mockRequest({ corte: new Date(agora + 45000).toISOString() }, uid)
      );
      expect(proxima.marcadas).toBe(1);
      expect((await depois.get()).data()?.lida).toBe(true);
    });

    it("TEST-INT-NOTIF-M13-015 — não age na caixa de terceiro", async () => {
      const uid = uidUnico("notif_limpar_dono");
      const outro = uidUnico("notif_limpar_outro");
      await semear(uid);
      await semear(outro);
      const alheia = await semearNotificacao(outro, "x", {
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora - 1000),
      });

      const wrapped = testEnv.wrap(limparTudoNotificacoes);
      await wrapped(mockRequest({ corte }, uid));

      expect((await alheia.get()).data()?.lida).toBe(false);
    });

    it("TEST-INT-NOTIF-M13-016 — paginação reentrante com mesmo corte", async () => {
      const uid = uidUnico("notif_limpar_pag");
      await semear(uid);
      for (const id of ["a", "b", "c"]) {
        await semearNotificacao(uid, id, {
          tipo: "FRASCOS_VAZIOS",
          emitida_em: new Date(agora - 5000),
        });
      }

      const wrapped = testEnv.wrap(limparTudoNotificacoes);
      const primeira = await wrapped(mockRequest({ corte, limite: 2 }, uid));
      expect(primeira.marcadas).toBe(2);
      expect(primeira.continuar).toBe(true);

      const segunda = await wrapped(mockRequest({ corte, limite: 2 }, uid));
      expect(segunda.marcadas).toBe(1);
      expect(segunda.continuar).toBe(false);
    });

    it("TEST-INT-NOTIF-M13-017 — documento com id_destinatario divergente não é marcado", async () => {
      const uid = uidUnico("notif_limpar_div");
      const outro = uidUnico("notif_limpar_div_alvo");
      await semear(uid);
      const coerente = await semearNotificacao(uid, "ok", {
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora - 1000),
      });
      const divergente = await semearNotificacao(uid, "div", {
        id_destinatario: outro,
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora - 2000),
      });

      const wrapped = testEnv.wrap(limparTudoNotificacoes);
      const resultado = await wrapped(mockRequest({ corte }, uid));

      expect(resultado.marcadas).toBe(1);
      expect((await coerente.get()).data()?.lida).toBe(true);
      expect((await divergente.get()).data()?.lida).toBe(false);
    });

    it("TEST-INT-NOTIF-M13-018 — estado lida=false com lida_em preenchido falha fechado", async () => {
      const uid = uidUnico("notif_limpar_incoerente");
      await semear(uid);
      const ruim = await semearNotificacao(uid, "ruim", {
        lida: false,
        lida_em: new Date(agora - 5000),
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora - 1000),
      });

      const wrapped = testEnv.wrap(limparTudoNotificacoes);
      await expect(wrapped(mockRequest({ corte }, uid))).rejects.toMatchObject({
        code: "failed-precondition",
      });
      expect((await ruim.get()).data()?.lida).toBe(false);
    });

    it("TEST-INT-NOTIF-M13-019 — autoridade inativa nega sem marcar nada", async () => {
      const uid = uidUnico("notif_limpar_inativo");
      await semear(uid, { ativo: false });
      await semearNotificacao(uid, "a", {
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora - 1000),
      });

      const wrapped = testEnv.wrap(limparTudoNotificacoes);
      await expect(wrapped(mockRequest({ corte }, uid))).rejects.toMatchObject({
        code: "permission-denied",
      });
    });

    it("TEST-INT-NOTIF-M13-020 — corte inválido é invalid-argument", async () => {
      const uid = uidUnico("notif_limpar_corte_invalido");
      await semear(uid);
      const wrapped = testEnv.wrap(limparTudoNotificacoes);
      await expect(wrapped(mockRequest({ corte: "nao-e-data" }, uid))).rejects.toMatchObject({
        code: "invalid-argument",
      });
    });

    it("TEST-INT-NOTIF-M13-021 — notificação expirada não é marcada e permanece persistida", async () => {
      const uid = uidUnico("notif_limpar_expirada");
      await semear(uid);
      const expirada = await semearNotificacao(uid, "expirada", {
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora - 3000),
        expira_em: new Date(agora - 1000),
      });

      const wrapped = testEnv.wrap(limparTudoNotificacoes);
      const resultado = await wrapped(mockRequest({ corte }, uid));

      expect(resultado.marcadas).toBe(0);
      const snap = await expirada.get();
      expect(snap.exists).toBe(true);
      expect(snap.data()?.lida).toBe(false);
      expect(snap.data()?.lida_em).toBeNull();
    });

    it("TEST-INT-NOTIF-M13-022 — notificação com expiração futura é elegível", async () => {
      const uid = uidUnico("notif_limpar_futura");
      await semear(uid);
      const futura = await semearNotificacao(uid, "futura", {
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora - 1000),
        expira_em: new Date(agora + 60000),
      });

      const wrapped = testEnv.wrap(limparTudoNotificacoes);
      const resultado = await wrapped(mockRequest({ corte }, uid));

      expect(resultado.marcadas).toBe(1);
      const dados = (await futura.get()).data();
      expect(dados?.lida).toBe(true);
      expect(dados?.lida_em).not.toBeNull();
    });

    it("TEST-INT-NOTIF-M13-023 — expira_em=null permanece elegível (ESCASSEZ_ESTOQUE)", async () => {
      const uid = uidUnico("notif_limpar_sem_expiracao");
      await semear(uid);
      const escassez = await semearNotificacao(uid, "escassez", {
        tipo: "ESCASSEZ_ESTOQUE",
        emitida_em: new Date(agora - 1000),
        expira_em: null,
      });

      const wrapped = testEnv.wrap(limparTudoNotificacoes);
      const resultado = await wrapped(mockRequest({ corte }, uid));

      expect(resultado.marcadas).toBe(1);
      expect((await escassez.get()).data()?.lida).toBe(true);
    });

    it("TEST-INT-NOTIF-M13-024 — paginação com expiradas intercaladas não perde ativos", async () => {
      const uid = uidUnico("notif_limpar_pag_exp");
      await semear(uid);
      const e1 = await semearNotificacao(uid, "e1", {
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora - 5000),
        expira_em: new Date(agora - 4000),
      });
      const a1 = await semearNotificacao(uid, "a1", {
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora - 4000),
        expira_em: null,
      });
      const e2 = await semearNotificacao(uid, "e2", {
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora - 3000),
        expira_em: new Date(agora - 2000),
      });
      const a2 = await semearNotificacao(uid, "a2", {
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora - 2000),
        expira_em: null,
      });

      const wrapped = testEnv.wrap(limparTudoNotificacoes);
      const primeira = await wrapped(mockRequest({ corte, limite: 3 }, uid));
      expect(primeira.marcadas).toBe(1);
      expect(primeira.continuar).toBe(true);
      expect(primeira.proximo_cursor).toBeTruthy();
      expect((await a1.get()).data()?.lida).toBe(true);
      expect((await a2.get()).data()?.lida).toBe(false);

      const segunda = await wrapped(
        mockRequest({ corte, limite: 3, cursor: primeira.proximo_cursor }, uid)
      );
      expect(segunda.marcadas).toBe(1);
      expect(segunda.continuar).toBe(false);
      expect((await a2.get()).data()?.lida).toBe(true);

      expect((await e1.get()).data()?.lida).toBe(false);
      expect((await e2.get()).data()?.lida).toBe(false);
    });

    it("TEST-INT-NOTIF-M13-025 — retry com mesmo cursor preserva lida_em e não duplica", async () => {
      const uid = uidUnico("notif_limpar_retry_exp");
      await semear(uid);
      await semearNotificacao(uid, "e1", {
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora - 2000),
        expira_em: new Date(agora - 1000),
      });
      const a1 = await semearNotificacao(uid, "a1", {
        tipo: "FRASCOS_VAZIOS",
        emitida_em: new Date(agora - 1000),
        expira_em: null,
      });

      const wrapped = testEnv.wrap(limparTudoNotificacoes);
      const primeira = await wrapped(mockRequest({ corte, limite: 2 }, uid));
      expect(primeira.marcadas).toBe(1);
      const primeiro = (await a1.get()).data()?.lida_em.toMillis();

      const segunda = await wrapped(
        mockRequest({ corte, limite: 2, cursor: primeira.proximo_cursor }, uid)
      );
      expect(segunda.marcadas).toBe(0);
      expect(segunda.continuar).toBe(false);
      const segundo = (await a1.get()).data()?.lida_em.toMillis();
      expect(segundo).toBe(primeiro);
    });

    it("TEST-INT-NOTIF-M13-026 — cursor inválido é invalid-argument", async () => {
      const uid = uidUnico("notif_limpar_cursor_invalido");
      await semear(uid);
      const wrapped = testEnv.wrap(limparTudoNotificacoes);
      await expect(wrapped(mockRequest({ corte, cursor: "lixo" }, uid))).rejects.toMatchObject({
        code: "invalid-argument",
      });
    });
  });
});
