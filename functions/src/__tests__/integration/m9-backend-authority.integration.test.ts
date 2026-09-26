process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { CallableRequest } from "firebase-functions/v2/https";
import {
  PAPEIS_CONHECIDOS,
  PapelConhecido,
  validarAutoridadePersistida,
} from "../../auth";
import { revogarUsuarioPapel } from "../../usuarios";

const testEnv = fft({ projectId: "lcqui-dev" });

type TokenInput = { roles?: unknown; versao_permissoes?: unknown };

function mockRequest(uid: string | undefined, token: TokenInput, data: unknown = {}): CallableRequest {
  return {
    data,
    auth: uid === undefined ? undefined : { uid, token },
    rawRequest: {},
  } as unknown as CallableRequest;
}

let contador = 0;
function uidUnico(prefixo: string): string {
  contador += 1;
  return `${prefixo}_${Date.now()}_${contador}`;
}

async function semearAutoridade(
  db: admin.firestore.Firestore,
  opcoes: {
    uid: string;
    ativo?: boolean;
    versaoPersistida?: number;
    papeisPersistidos?: PapelConhecido[];
    idUsuarioRole?: string;
    criarUsuario?: boolean;
  }
): Promise<void> {
  const {
    uid,
    ativo = true,
    versaoPersistida = 1,
    papeisPersistidos = [],
    idUsuarioRole = uid,
    criarUsuario = true,
  } = opcoes;

  if (criarUsuario) {
    await db.collection("Usuarios").doc(uid).set({ ativo, versao_permissoes: versaoPersistida });
  }
  for (const papel of papeisPersistidos) {
    await db.collection(papel).doc(uid).set({ id_usuario: idUsuarioRole });
  }
}

function claimDe(opcoes: {
  papeisPersistidos?: PapelConhecido[];
  versaoPersistida?: number;
  versaoClaim?: number;
  papeisClaim?: unknown;
}): TokenInput {
  const versaoClaim = opcoes.versaoClaim ?? opcoes.versaoPersistida ?? 1;
  const papeisClaim = opcoes.papeisClaim ?? opcoes.papeisPersistidos ?? [];
  return { roles: papeisClaim, versao_permissoes: versaoClaim };
}

describe("TEST-INT-M9-AUTH — autoridade persistida backend (Admin SDK)", () => {
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

  it("TEST-INT-M9-AUTH-001 (M9 §Claims; Seção 10/10.3) — não autenticado nega", async () => {
    const req = mockRequest(undefined, { roles: ["Chefe_Geral"], versao_permissoes: 1 });
    await expect(validarAutoridadePersistida(req, ["Chefe_Geral"])).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("TEST-INT-M9-AUTH-002 (M9 §Modelo; Usuarios/uid.ativo) — Usuarios ausente nega", async () => {
    const uid = uidUnico("sem_usuario");
    await db.collection("Chefe_Geral").doc(uid).set({ id_usuario: uid });
    const req = mockRequest(uid, { roles: ["Chefe_Geral"], versao_permissoes: 1 });
    await expect(validarAutoridadePersistida(req, ["Chefe_Geral"])).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-M9-AUTH-003 (M9-INV-001/008) — usuário inativo nega", async () => {
    const uid = uidUnico("inativo");
    await semearAutoridade(db, {
      uid,
      ativo: false,
      papeisPersistidos: ["Chefe_Geral"],
      versaoPersistida: 1,
    });
    const req = mockRequest(uid, claimDe({ papeisPersistidos: ["Chefe_Geral"], versaoPersistida: 1 }));
    await expect(validarAutoridadePersistida(req, ["Chefe_Geral"])).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-M9-AUTH-004 (M9 §Claims) — claim sem versao_permissoes nega", async () => {
    const uid = uidUnico("sem_versao");
    await semearAutoridade(db, { uid, papeisPersistidos: ["Chefe_Geral"], versaoPersistida: 3 });
    const req = mockRequest(uid, { roles: ["Chefe_Geral"] });
    await expect(validarAutoridadePersistida(req, ["Chefe_Geral"])).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-M9-AUTH-005 (M9-INV-005; M9 §TOCTOU) — versão obsoleta nega", async () => {
    const uid = uidUnico("obsoleto");
    await semearAutoridade(db, {
      uid,
      papeisPersistidos: ["Chefe_Geral"],
      versaoPersistida: 5,
    });
    const req = mockRequest(uid, { roles: ["Chefe_Geral"], versao_permissoes: 4 });
    await expect(validarAutoridadePersistida(req, ["Chefe_Geral"])).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-M9-AUTH-006 (M9-WIT-017) — versão corrente + papel persistido válido autoriza", async () => {
    const uid = uidUnico("valido");
    await semearAutoridade(db, {
      uid,
      papeisPersistidos: ["Chefe_Geral"],
      versaoPersistida: 7,
    });
    const req = mockRequest(uid, { roles: ["Chefe_Geral"], versao_permissoes: 7 });
    const autoridade = await validarAutoridadePersistida(req, ["Chefe_Geral"]);
    expect(autoridade.uid).toBe(uid);
    expect(autoridade.papeis).toEqual(["Chefe_Geral"]);
    expect(autoridade.versaoPermissoes).toBe(7);
    expect(autoridade.papelAutorizado).toBe("Chefe_Geral");
  });

  it("TEST-INT-M9-AUTH-007 (M9-INV-002) — papel permitido ausente nega", async () => {
    const uid = uidUnico("sem_papel_req");
    await semearAutoridade(db, { uid, papeisPersistidos: ["Professor"], versaoPersistida: 2 });
    const req = mockRequest(uid, { roles: ["Professor"], versao_permissoes: 2 });
    await expect(validarAutoridadePersistida(req, ["Chefe_Geral"])).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-M9-AUTH-008 (M9 §papéis fechados) — papel desconhecido nega", async () => {
    const uid = uidUnico("desconhecido");
    await semearAutoridade(db, { uid, papeisPersistidos: [], versaoPersistida: 1 });
    const req = mockRequest(uid, { roles: ["Super_Admin"], versao_permissoes: 1 });
    await expect(validarAutoridadePersistida(req, ["Chefe_Geral"])).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-M9-AUTH-009 (M9 §autoridade persistida) — claim afirma papel sem concessão persistida nega", async () => {
    const uid = uidUnico("claim_sem_doc");
    await semearAutoridade(db, { uid, papeisPersistidos: [], versaoPersistida: 1 });
    const req = mockRequest(uid, { roles: ["Chefe_Geral"], versao_permissoes: 1 });
    await expect(validarAutoridadePersistida(req, ["Chefe_Geral"])).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-M9-AUTH-010 (M9 §claim projeção) — papel persistido mas claim não o afirma nega", async () => {
    const uid = uidUnico("persistido_sem_claim");
    await semearAutoridade(db, { uid, papeisPersistidos: ["Chefe_Geral"], versaoPersistida: 1 });
    const req = mockRequest(uid, { roles: [], versao_permissoes: 1 });
    await expect(validarAutoridadePersistida(req, ["Chefe_Geral"])).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-M9-AUTH-011 (M9 §papel pertence ao UID) — documento de papel com id_usuario incompatível nega", async () => {
    const uid = uidUnico("uid_incompativel");
    await semearAutoridade(db, {
      uid,
      papeisPersistidos: ["Chefe_Geral"],
      versaoPersistida: 1,
      idUsuarioRole: "outro_uid",
    });
    const req = mockRequest(uid, { roles: ["Chefe_Geral"], versao_permissoes: 1 });
    await expect(validarAutoridadePersistida(req, ["Chefe_Geral"])).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-M9-AUTH-012 (M9 §claims) — roles não-array nega", async () => {
    const uid = uidUnico("roles_nao_array");
    await semearAutoridade(db, { uid, papeisPersistidos: [], versaoPersistida: 1 });
    const req = mockRequest(uid, { roles: "Chefe_Geral", versao_permissoes: 1 });
    await expect(validarAutoridadePersistida(req, ["Chefe_Geral"])).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-M9-AUTH-013 (M9 §Bolsista implica Aluno) — multi-role válido (Aluno+Bolsista) autoriza", async () => {
    const uid = uidUnico("multi_valido");
    await semearAutoridade(db, {
      uid,
      papeisPersistidos: ["Aluno", "Bolsista"],
      versaoPersistida: 4,
    });
    const req = mockRequest(uid, { roles: ["Aluno", "Bolsista"], versao_permissoes: 4 });
    const autoridade = await validarAutoridadePersistida(req, ["Bolsista"]);
    expect(autoridade.papeis.sort()).toEqual(["Aluno", "Bolsista"]);
    expect(autoridade.papelAutorizado).toBe("Bolsista");
  });

  it("TEST-INT-M9-AUTH-014 (M9 §papéis fechados) — multi-role com papel desconhecido nega", async () => {
    const uid = uidUnico("multi_invalido");
    await semearAutoridade(db, {
      uid,
      papeisPersistidos: ["Aluno"],
      versaoPersistida: 1,
    });
    const req = mockRequest(uid, { roles: ["Aluno", "Super_Admin"], versao_permissoes: 1 });
    await expect(validarAutoridadePersistida(req, ["Aluno"])).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-M9-AUTH-015 (sanity) — o conjunto fechado do backend é o M9", () => {
    expect([...PAPEIS_CONHECIDOS]).toEqual([
      "Chefe_Geral",
      "Gestor_Almoxarifado",
      "Gestor_Bens_Patrimoniais",
      "Professor",
      "Aluno",
      "Bolsista",
    ]);
  });

  it("TEST-INT-M9-AUTH-016 (M9 §fontes de verdade; RN-ROLE-01) — Chefe+Professor persistidos nega mesmo com claim só de Chefe", async () => {
    const uid = uidUnico("persistido_chefe_professor");
    await semearAutoridade(db, {
      uid,
      papeisPersistidos: ["Chefe_Geral", "Professor"],
      versaoPersistida: 2,
    });
    const req = mockRequest(uid, { roles: ["Chefe_Geral"], versao_permissoes: 2 });
    await expect(validarAutoridadePersistida(req, ["Chefe_Geral"])).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-M9-AUTH-017 (M9 §fontes de verdade) — Professor+Aluno persistidos negam", async () => {
    const uid = uidUnico("persistido_professor_aluno");
    await semearAutoridade(db, {
      uid,
      papeisPersistidos: ["Professor", "Aluno"],
      versaoPersistida: 2,
    });
    const req = mockRequest(uid, { roles: ["Professor"], versao_permissoes: 2 });
    await expect(validarAutoridadePersistida(req, ["Professor"])).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-M9-AUTH-018 (RN-ROLE-BOLSISTA) — Bolsista persistido sem Aluno nega", async () => {
    const uid = uidUnico("persistido_bolsista_sem_aluno");
    await semearAutoridade(db, {
      uid,
      papeisPersistidos: ["Bolsista"],
      versaoPersistida: 1,
    });
    const req = mockRequest(uid, { roles: ["Bolsista"], versao_permissoes: 1 });
    await expect(validarAutoridadePersistida(req, ["Bolsista"])).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-M9-AUTH-019 (RN-ROLE-BOLSISTA) — Bolsista+Gestor_Almoxarifado persistidos negam", async () => {
    const uid = uidUnico("persistido_bolsista_gestor");
    await semearAutoridade(db, {
      uid,
      papeisPersistidos: ["Aluno", "Bolsista", "Gestor_Almoxarifado"],
      versaoPersistida: 3,
    });
    const req = mockRequest(uid, {
      roles: ["Aluno", "Bolsista", "Gestor_Almoxarifado"],
      versao_permissoes: 3,
    });
    await expect(validarAutoridadePersistida(req, ["Bolsista"])).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-M9-AUTH-020 (M9 §Claims projeção) — claim incompleta (subconjunto) nega", async () => {
    const uid = uidUnico("claim_incompleta");
    await semearAutoridade(db, {
      uid,
      papeisPersistidos: ["Aluno", "Bolsista"],
      versaoPersistida: 5,
    });
    const req = mockRequest(uid, { roles: ["Aluno"], versao_permissoes: 5 });
    await expect(validarAutoridadePersistida(req, ["Aluno"])).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("TEST-INT-M9-AUTH-021 (M9 §Claims projeção) — claim superconjunto (papel sem persistência) nega", async () => {
    const uid = uidUnico("claim_superconjunto");
    await semearAutoridade(db, {
      uid,
      papeisPersistidos: ["Aluno"],
      versaoPersistida: 5,
    });
    const req = mockRequest(uid, { roles: ["Aluno", "Bolsista"], versao_permissoes: 5 });
    await expect(validarAutoridadePersistida(req, ["Aluno"])).rejects.toMatchObject({
      code: "permission-denied",
    });
  });
});

describe("TEST-INT-M9-AUTH-OP — operação real protegida (revogarUsuarioPapel)", () => {
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

  async function criarAlvo(email: string): Promise<{ uid: string }> {
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch {
      user = await admin.auth().createUser({ email, displayName: "Alvo M9" });
    }
    await db.collection("Aluno").doc(user.uid).set({ nome: "Alvo M9", email });
    await db.collection("Usuarios").doc(user.uid).set({
      nome: "Alvo M9",
      email,
      ativo: true,
      versao_permissoes: 0,
    });
    return { uid: user.uid };
  }

  it("TEST-INT-M9-AUTH-OP-001 (M9 §matriz; WIT-014) — Chefe corrente e persistido autoriza a mutação", async () => {
    const wrapped = testEnv.wrap(revogarUsuarioPapel);
    const ator = uidUnico("ator_chefe_ok");
    await db.collection("Usuarios").doc(ator).set({ ativo: true, versao_permissoes: 11 });
    await db.collection("Chefe_Geral").doc(ator).set({ id_usuario: ator });

    const alvo = await criarAlvo(`${ator}@example.com`);

    const req = mockRequest(
      ator,
      { roles: ["Chefe_Geral"], versao_permissoes: 11 },
      { email: `${ator}@example.com`, papel: "Aluno", motivo: "Fim do vínculo" }
    );
    const resultado = await wrapped(req);
    expect(resultado.uid).toBe(alvo.uid);
    expect(resultado.ativo).toBe(false);

    const aluno = await db.collection("Aluno").doc(alvo.uid).get();
    expect(aluno.exists).toBe(false);
  });

  it("TEST-INT-M9-AUTH-OP-002 (M9-INV-005; TOCTOU) — token obsoleto nega e não muta o Firestore", async () => {
    const wrapped = testEnv.wrap(revogarUsuarioPapel);
    const ator = uidUnico("ator_chefe_obsoleto");
    await db.collection("Usuarios").doc(ator).set({ ativo: true, versao_permissoes: 20 });
    await db.collection("Chefe_Geral").doc(ator).set({ id_usuario: ator });

    const alvo = await criarAlvo(`${ator}@example.com`);

    const req = mockRequest(
      ator,
      { roles: ["Chefe_Geral"], versao_permissoes: 19 },
      { email: `${ator}@example.com`, papel: "Aluno", motivo: "Tentativa com token velho" }
    );
    await expect(wrapped(req)).rejects.toMatchObject({ code: "permission-denied" });

    const aluno = await db.collection("Aluno").doc(alvo.uid).get();
    expect(aluno.exists).toBe(true);
    const usuario = await db.collection("Usuarios").doc(alvo.uid).get();
    expect(usuario.data()?.ativo).toBe(true);
  });

  it("TEST-INT-M9-AUTH-OP-003 (M9-INV-001/008) — Chefe inativo nega e não muta o Firestore", async () => {
    const wrapped = testEnv.wrap(revogarUsuarioPapel);
    const ator = uidUnico("ator_chefe_inativo");
    await db.collection("Usuarios").doc(ator).set({ ativo: false, versao_permissoes: 2 });
    await db.collection("Chefe_Geral").doc(ator).set({ id_usuario: ator });

    const alvo = await criarAlvo(`${ator}@example.com`);

    const req = mockRequest(
      ator,
      { roles: ["Chefe_Geral"], versao_permissoes: 2 },
      { email: `${ator}@example.com`, papel: "Aluno", motivo: "Tentativa inativa" }
    );
    await expect(wrapped(req)).rejects.toMatchObject({ code: "permission-denied" });

    const aluno = await db.collection("Aluno").doc(alvo.uid).get();
    expect(aluno.exists).toBe(true);
  });

  it("TEST-INT-M9-AUTH-OP-004 (M9 §autoridade persistida) — claim Chefe sem documento persistido nega e não muta", async () => {
    const wrapped = testEnv.wrap(revogarUsuarioPapel);
    const ator = uidUnico("ator_sem_chefe_doc");
    await db.collection("Usuarios").doc(ator).set({ ativo: true, versao_permissoes: 3 });

    const alvo = await criarAlvo(`${ator}@example.com`);

    const req = mockRequest(
      ator,
      { roles: ["Chefe_Geral"], versao_permissoes: 3 },
      { email: `${ator}@example.com`, papel: "Aluno", motivo: "Sem concessão persistida" }
    );
    await expect(wrapped(req)).rejects.toMatchObject({ code: "permission-denied" });

    const aluno = await db.collection("Aluno").doc(alvo.uid).get();
    expect(aluno.exists).toBe(true);
  });
});
