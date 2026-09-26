process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { CallableRequest } from "firebase-functions/v2/https";
import { convidarUsuario, revogarUsuarioPapel } from "../../usuarios";

const testEnv = fft({ projectId: "lcqui-dev" });

describe("Integração: Múltiplos Papéis (convidarUsuario)", () => {
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

  const mockRequest = (data: any, uid: string, roles: string[] = ["Chefe_Geral"]): any => ({
    data,
    auth: {
      uid,
      token: { roles, versao_permissoes: 1 }
    },
    rawRequest: {}
  });

  // M9: o ator exige autoridade persistida (Usuarios ativo + documento de papel).
  beforeEach(async () => {
    await db.collection("Usuarios").doc("chefe123").set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Chefe_Geral").doc("chefe123").set({ id_usuario: "chefe123" });
  });

  it("deve bloquear a atribuição de Professor para um usuário que já é Aluno, sem poluir Firestore", async () => {
    const wrapped = testEnv.wrap(convidarUsuario);
    
    // Configurar o estado inicial no Firestore
    const userEmail = "aluno_teste_multi@example.com";
    
    // Primeiro, vamos criar o user no Firebase Auth emulator
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(userEmail);
    } catch(e) {
      userRecord = await admin.auth().createUser({
        email: userEmail,
        displayName: "Aluno Teste Multi"
      });
    }

    // Adiciona como Aluno no Firestore
    await db.collection("Aluno").doc(userRecord.uid).set({
      nome: "Aluno Teste Multi",
      email: userEmail
    });

    const req = mockRequest({
      idOperacao: "op-multi-professor-1",
      email: userEmail,
      nome: "Aluno Teste Multi",
      papel: "Professor",
      centro: "CCT",
      laboratorio: "Lab 1"
    }, "chefe123");

    // Tentativa de adicionar papel incompatível
    await expect(wrapped(req)).rejects.toThrow("O usuário que é aluno não pode ser professor.");

    // Verifica que não poluiu o Firestore
    const professorDoc = await db.collection("Professor").doc(userRecord.uid).get();
    expect(professorDoc.exists).toBe(false);
  });

  it("deve desativar o usuário ao revogar seu último papel e manter em Usuarios com ativo = false", async () => {
    const { revogarUsuarioPapel } = require("../../usuarios");
    const wrapped = testEnv.wrap(revogarUsuarioPapel);
    
    const userEmail = "aluno_revogar_unico@example.com";
    
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(userEmail);
    } catch(e) {
      userRecord = await admin.auth().createUser({
        email: userEmail,
        displayName: "Aluno Para Revogar"
      });
    }

    // O usuário é APENAS Aluno
    await db.collection("Aluno").doc(userRecord.uid).set({
      nome: "Aluno Para Revogar",
      email: userEmail
    });

    // Simulando que ele também existe na coleção central Usuarios
    await db.collection("Usuarios").doc(userRecord.uid).set({
      nome: "Aluno Para Revogar",
      email: userEmail,
      ativo: true
    });

    const req = mockRequest({
      idOperacao: "op-revogar-aluno-1",
      email: userEmail,
      papel: "Aluno",
      motivo: "Fim do curso"
    }, "chefe123");

    const result = await wrapped(req);

    // O retorno deve indicar que a conta foi desativada (ativo: false)
    expect(result.ativo).toBe(false);
    expect(result.uid).toBe(userRecord.uid);

    // Verifica que apagou da coleção do Papel
    const alunoDoc = await db.collection("Aluno").doc(userRecord.uid).get();
    expect(alunoDoc.exists).toBe(false);

    // Verifica que a identidade permaneceu em Usuarios, mas inativa
    const usuarioCentralDoc = await db.collection("Usuarios").doc(userRecord.uid).get();
    expect(usuarioCentralDoc.exists).toBe(true);
    expect(usuarioCentralDoc.data()?.ativo).toBe(false);
  });
});

describe("Integração: M7 em mutações de papel", () => {
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

  beforeEach(async () => {
    await db.collection("Usuarios").doc("chefe123").set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Chefe_Geral").doc("chefe123").set({ id_usuario: "chefe123" });
  });

  const mockRequest = (data: unknown, uid: string, roles: string[] = ["Chefe_Geral"]): CallableRequest =>
    ({
      data,
      auth: { uid, token: { roles, versao_permissoes: 1 } },
      rawRequest: {}
    }) as unknown as CallableRequest;

  async function criarAlvo(email: string): Promise<string> {
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch {
      user = await admin.auth().createUser({ email, displayName: "Alvo M7" });
    }
    await db.collection("Aluno").doc(user.uid).set({ nome: "Alvo M7", email });
    await db.collection("Usuarios").doc(user.uid).set({ nome: "Alvo M7", email, ativo: true, versao_permissoes: 0 });
    return user.uid;
  }

  it("TEST-INT-ROLE-M7-001 — idOperacao ausente é rejeitado (invalid-argument)", async () => {
    const wrapped = testEnv.wrap(revogarUsuarioPapel);
    const email = "m7_sem_id@example.com";
    await criarAlvo(email);
    const req = mockRequest({ email, papel: "Aluno", motivo: "Sem id" }, "chefe123");
    await expect(wrapped(req)).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("TEST-INT-ROLE-M7-002 — receipt canônico gravado em Operacoes/{idOperacao}", async () => {
    const wrapped = testEnv.wrap(revogarUsuarioPapel);
    const email = "m7_receipt@example.com";
    const alvo = await criarAlvo(email);
    const id = "op-m7-receipt-1";
    await wrapped(mockRequest({ idOperacao: id, email, papel: "Aluno", motivo: "Receipt" }, "chefe123"));
    const receipt = await db.collection("Operacoes").doc(id).get();
    expect(receipt.exists).toBe(true);
    expect(receipt.data()).toMatchObject({
      uid: "chefe123",
      tipo_operacao: "REVOGAR_PAPEL",
      status: "CONCLUIDA",
    });
    expect(receipt.data()?.payload_hash).toMatch(/^[0-9a-f]{64}$/);
    const aluno = await db.collection("Aluno").doc(alvo).get();
    expect(aluno.exists).toBe(false);
  });

  it("TEST-INT-ROLE-M7-003 — replay devolve o mesmo resultado e não reaplica efeito", async () => {
    const wrapped = testEnv.wrap(revogarUsuarioPapel);
    const email = "m7_replay@example.com";
    const alvo = await criarAlvo(email);
    const id = "op-m7-replay-1";
    const dados = { idOperacao: id, email, papel: "Aluno", motivo: "Replay" };
    const primeira = await wrapped(mockRequest(dados, "chefe123"));
    const receipt1 = await db.collection("Operacoes").doc(id).get();
    const segunda = await wrapped(mockRequest(dados, "chefe123"));
    const receipt2 = await db.collection("Operacoes").doc(id).get();
    expect(segunda).toEqual(primeira);
    expect(receipt1.data()?.criado_em.toMillis()).toBe(receipt2.data()?.criado_em.toMillis());
    const auditorias = await db.collection("Registro_de_Auditoria").where("id_do_objeto_da_entidade", "==", alvo).get();
    expect(auditorias.size).toBe(1);
  });

  it("TEST-INT-ROLE-M7-004 — mesmo idOperacao com payload diferente é rejeitado", async () => {
    const wrapped = testEnv.wrap(revogarUsuarioPapel);
    const email = "m7_conflito@example.com";
    await criarAlvo(email);
    const id = "op-m7-conflito-1";
    await wrapped(mockRequest({ idOperacao: id, email, papel: "Aluno", motivo: "Motivo A" }, "chefe123"));
    await expect(
      wrapped(mockRequest({ idOperacao: id, email, papel: "Aluno", motivo: "Motivo B" }, "chefe123"))
    ).rejects.toMatchObject({ code: "already-exists" });
  });
});
