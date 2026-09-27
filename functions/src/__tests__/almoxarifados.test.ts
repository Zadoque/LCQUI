process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { gerenciarAlmoxarifado } from "../almoxarifados";

const testEnv = fft({ projectId: "lcqui-dev" });

let contador = 0;
function uidUnico(prefixo: string): string {
  contador += 1;
  return `${prefixo}_${Date.now()}_${contador}`;
}

describe("Cadastros base — Almoxarifado (M9 + M7)", () => {
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

  const mockRequest = (data: unknown, uid: string, roles: string[] = ["Chefe_Geral"]): any => ({
    data,
    auth: { uid, token: { roles, versao_permissoes: 1 } },
    rawRequest: {},
  });

  let opSeq = 0;
  const novaOperacao = (): string => `op_almox_${Date.now()}_${++opSeq}`;

  async function semearChefe(uid: string): Promise<void> {
    await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Chefe_Geral").doc(uid).set({ id_usuario: uid, ativo: true });
  }

  async function semearGestorAlmox(uid: string): Promise<void> {
    await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Gestor_Almoxarifado").doc(uid).set({ id_usuario: uid, ativo: true });
  }

  async function semearLocal(id: string): Promise<void> {
    await db.collection("Local").doc(id).set({ predio: "A", andar: "1", sala: id });
  }

  function corpo(extra: Record<string, unknown> = {}) {
    return {
      idOperacao: novaOperacao(),
      acao: "CRIAR",
      nome: "Almox Central",
      descricao: "Principal",
      idLocal: "local_x",
      ...extra,
    };
  }

  it("TEST-INT-ALMOX-001 — cria ativo com gestor, vínculo e contador", async () => {
    const chefe = uidUnico("chefe_almox");
    const gestor = uidUnico("gestor_almox");
    await semearChefe(chefe);
    await semearGestorAlmox(gestor);
    await semearLocal("local_x");

    const wrapped = testEnv.wrap(gerenciarAlmoxarifado);
    const res = await wrapped(mockRequest(corpo({ gestores: [gestor], ativo: true }), chefe));

    const doc = await db.collection("Almoxarifado").doc(res.id).get();
    expect(doc.data()?.ativo).toBe(true);
    expect(doc.data()?.id_local).toBe("local_x");
    expect(doc.data()?.qtd_gestores_ativos).toBe(1);
    const junction = await db.collection("Gestor_Almoxarifado_x_Almoxarifado").doc(`${gestor}_${res.id}`).get();
    expect(junction.exists).toBe(true);
  });

  it("TEST-INT-ALMOX-002 — criação ativa sem gestor é failed-precondition", async () => {
    const chefe = uidUnico("chefe_almox_sem");
    await semearChefe(chefe);
    await semearLocal("local_sem");
    const wrapped = testEnv.wrap(gerenciarAlmoxarifado);
    await expect(
      wrapped(mockRequest(corpo({ idLocal: "local_sem", ativo: true }), chefe))
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-ALMOX-003 — Local inexistente é failed-precondition", async () => {
    const chefe = uidUnico("chefe_almox_local");
    await semearChefe(chefe);
    const wrapped = testEnv.wrap(gerenciarAlmoxarifado);
    await expect(
      wrapped(mockRequest(corpo({ idLocal: "local_fantasma" }), chefe))
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-ALMOX-004 — criação inativa sem gestor é permitida", async () => {
    const chefe = uidUnico("chefe_almox_inativo");
    await semearChefe(chefe);
    await semearLocal("local_inativo");
    const wrapped = testEnv.wrap(gerenciarAlmoxarifado);
    const res = await wrapped(mockRequest(corpo({ idLocal: "local_inativo" }), chefe));
    const doc = await db.collection("Almoxarifado").doc(res.id).get();
    expect(doc.data()?.ativo).toBe(false);
    expect(doc.data()?.qtd_gestores_ativos).toBe(0);
  });

  it("TEST-INT-ALMOX-005 — ativar exige e considera vínculo válido", async () => {
    const chefe = uidUnico("chefe_almox_ativar");
    const gestor = uidUnico("gestor_almox_ativar");
    await semearChefe(chefe);
    await semearGestorAlmox(gestor);
    await semearLocal("local_ativar");
    const wrapped = testEnv.wrap(gerenciarAlmoxarifado);
    const criado = await wrapped(mockRequest(corpo({ idLocal: "local_ativar", gestores: [gestor] }), chefe));

    await expect(
      wrapped(mockRequest(corpo({ acao: "ATIVAR", idAlmoxarifado: criado.id, idLocal: "local_ativar" }), chefe))
    ).resolves.toBeDefined();
    const doc = await db.collection("Almoxarifado").doc(criado.id).get();
    expect(doc.data()?.ativo).toBe(true);
    expect(doc.data()?.qtd_gestores_ativos).toBe(1);
  });

  it("TEST-INT-ALMOX-006 — desativar mantém vínculos", async () => {
    const chefe = uidUnico("chefe_almox_des");
    const gestor = uidUnico("gestor_almox_des");
    await semearChefe(chefe);
    await semearGestorAlmox(gestor);
    await semearLocal("local_des");
    const wrapped = testEnv.wrap(gerenciarAlmoxarifado);
    const criado = await wrapped(mockRequest(corpo({ idLocal: "local_des", gestores: [gestor], ativo: true }), chefe));
    await wrapped(mockRequest(corpo({ acao: "DESATIVAR", idAlmoxarifado: criado.id, idLocal: "local_des" }), chefe));
    const doc = await db.collection("Almoxarifado").doc(criado.id).get();
    expect(doc.data()?.ativo).toBe(false);
    expect((await db.collection("Gestor_Almoxarifado_x_Almoxarifado").doc(`${gestor}_${criado.id}`).get()).exists).toBe(true);
  });

  it("TEST-INT-ALMOX-007 — editar reconcilia o conjunto de gestores", async () => {
    const chefe = uidUnico("chefe_almox_edit");
    const g1 = uidUnico("gestor_edit1");
    const g2 = uidUnico("gestor_edit2");
    await semearChefe(chefe);
    await semearGestorAlmox(g1);
    await semearGestorAlmox(g2);
    await semearLocal("local_edit");
    const wrapped = testEnv.wrap(gerenciarAlmoxarifado);
    const criado = await wrapped(mockRequest(corpo({ idLocal: "local_edit", gestores: [g1] }), chefe));

    await wrapped(mockRequest(corpo({
      acao: "EDITAR", idAlmoxarifado: criado.id, idLocal: "local_edit", gestores: [g2],
    }), chefe));

    const doc = await db.collection("Almoxarifado").doc(criado.id).get();
    expect(doc.data()?.qtd_gestores_ativos).toBe(1);
    expect((await db.collection("Gestor_Almoxarifado_x_Almoxarifado").doc(`${g1}_${criado.id}`).get()).exists).toBe(false);
    expect((await db.collection("Gestor_Almoxarifado_x_Almoxarifado").doc(`${g2}_${criado.id}`).get()).exists).toBe(true);
  });

  it("TEST-INT-ALMOX-008 — editar almoxarifado ativo para zero gestores é negado", async () => {
    const chefe = uidUnico("chefe_almox_zero");
    const gestor = uidUnico("gestor_almox_zero");
    await semearChefe(chefe);
    await semearGestorAlmox(gestor);
    await semearLocal("local_zero");
    const wrapped = testEnv.wrap(gerenciarAlmoxarifado);
    const criado = await wrapped(mockRequest(corpo({ idLocal: "local_zero", gestores: [gestor], ativo: true }), chefe));
    await expect(
      wrapped(mockRequest(corpo({
        acao: "EDITAR", idAlmoxarifado: criado.id, idLocal: "local_zero", gestores: [],
      }), chefe))
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-ALMOX-009 — replay do mesmo idOperacao não duplica", async () => {
    const chefe = uidUnico("chefe_almox_replay");
    await semearChefe(chefe);
    await semearLocal("local_replay");
    const op = novaOperacao();
    const body = corpo({ idOperacao: op, idLocal: "local_replay" });
    const wrapped = testEnv.wrap(gerenciarAlmoxarifado);
    const primeiro = await wrapped(mockRequest(body, chefe));
    const segundo = await wrapped(mockRequest(body, chefe));
    expect(segundo).toEqual(primeiro);
    const almoox = await db.collection("Almoxarifado").where("id_local", "==", "local_replay").get();
    expect(almoox.size).toBe(1);
  });

  it("TEST-INT-ALMOX-010 — sem Chefe_Geral é permission-denied (M9)", async () => {
    const wrapped = testEnv.wrap(gerenciarAlmoxarifado);
    await expect(
      wrapped(mockRequest(corpo(), "sem_chefe", ["Professor"]))
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-ALMOX-011 — gestor inexistente/sem papel é failed-precondition", async () => {
    const chefe = uidUnico("chefe_almox_gestor_inv");
    await semearChefe(chefe);
    await semearLocal("local_inv");
    const wrapped = testEnv.wrap(gerenciarAlmoxarifado);
    await expect(
      wrapped(mockRequest(corpo({ idLocal: "local_inv", gestores: ["nao_existe_gestor"] }), chefe))
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-ALMOX-012 — limites de nome/descrição são aplicados", async () => {
    const chefe = uidUnico("chefe_almox_limite");
    await semearChefe(chefe);
    await semearLocal("local_limite");
    const wrapped = testEnv.wrap(gerenciarAlmoxarifado);
    await expect(
      wrapped(mockRequest(corpo({ idLocal: "local_limite", nome: "N".repeat(101) }), chefe))
    ).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(
      wrapped(mockRequest(corpo({ idLocal: "local_limite", descricao: "D".repeat(501) }), chefe))
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("TEST-INT-ALMOX-013 — mesmo idOperacao com ativo diferente é already-exists", async () => {
    const chefe = uidUnico("chefe_almox_ativo_id");
    const gestor = uidUnico("gestor_almox_ativo_id");
    await semearChefe(chefe);
    await semearGestorAlmox(gestor);
    await semearLocal("local_ativo_id");
    const op = novaOperacao();
    const wrapped = testEnv.wrap(gerenciarAlmoxarifado);
    await wrapped(mockRequest(corpo({ idOperacao: op, idLocal: "local_ativo_id", gestores: [gestor], ativo: false }), chefe));
    await expect(
      wrapped(mockRequest(corpo({ idOperacao: op, idLocal: "local_ativo_id", gestores: [gestor], ativo: true }), chefe))
    ).rejects.toMatchObject({ code: "already-exists" });
  });

  it("TEST-INT-ALMOX-014 — mesma intenção com gestores em ordem diferente é replay", async () => {
    const chefe = uidUnico("chefe_almox_ordem");
    const g1 = uidUnico("gestor_ordem1");
    const g2 = uidUnico("gestor_ordem2");
    await semearChefe(chefe);
    await semearGestorAlmox(g1);
    await semearGestorAlmox(g2);
    await semearLocal("local_ordem");
    const op = novaOperacao();
    const wrapped = testEnv.wrap(gerenciarAlmoxarifado);
    const primeiro = await wrapped(
      mockRequest(corpo({ idOperacao: op, idLocal: "local_ordem", gestores: [g1, g2] }), chefe)
    );
    const segundo = await wrapped(
      mockRequest(corpo({ idOperacao: op, idLocal: "local_ordem", gestores: [g2, g1] }), chefe)
    );
    expect(segundo).toEqual(primeiro);
    const almoox = await db.collection("Almoxarifado").where("id_local", "==", "local_ordem").get();
    expect(almoox.size).toBe(1);
  });

  it("TEST-INT-ALMOX-015 — conjunto de gestores semanticamente diferente é already-exists", async () => {
    const chefe = uidUnico("chefe_almox_conj");
    const g1 = uidUnico("gestor_conj1");
    const g2 = uidUnico("gestor_conj2");
    await semearChefe(chefe);
    await semearGestorAlmox(g1);
    await semearGestorAlmox(g2);
    await semearLocal("local_conj");
    const op = novaOperacao();
    const wrapped = testEnv.wrap(gerenciarAlmoxarifado);
    await wrapped(mockRequest(corpo({ idOperacao: op, idLocal: "local_conj", gestores: [g1] }), chefe));
    await expect(
      wrapped(mockRequest(corpo({ idOperacao: op, idLocal: "local_conj", gestores: [g1, g2] }), chefe))
    ).rejects.toMatchObject({ code: "already-exists" });
  });
});
