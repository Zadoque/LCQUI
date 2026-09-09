process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { convidarUsuario } from "../../usuarios";

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
      token: { roles }
    },
    rawRequest: {}
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
