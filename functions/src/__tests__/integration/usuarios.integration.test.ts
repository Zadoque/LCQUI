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
});
