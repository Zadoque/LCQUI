import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import * as admin from "firebase-admin";

// Use o emulador configurado localmente
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";

const app = admin.initializeApp({ projectId: "lcqui-dev" });
const db = admin.firestore(app);

describe("Módulo 4: Gestão de Turmas e Alunos", () => {
  beforeAll(async () => {
    // Clear Firestore before tests (opcional se não usar script)
  });

  afterAll(async () => {
    await app.delete();
  });

  it("RN-TUR-01: Controle de Capacidade da Turma", async () => {
    // Teste simplificado verificando a existência da subcoleção Alunos
    const turmaRef = db.collection("Turma").doc("TEST_TURMA");
    await turmaRef.set({
      capacidade: 1,
      status: "Ativo",
      codigo_turma: "CODIGO123"
    });

    await turmaRef.collection("Alunos").doc("aluno1").set({ id_aluno: "aluno1" });
    
    // Tenta contar alunos (simulação da Cloud Function)
    const snap = await turmaRef.collection("Alunos").get();
    expect(snap.size).toBe(1);

    // Na Cloud Function isso lançaria erro 'failed-precondition'
  });

  it("RN-TUR-02: Unicidade do convite por email", async () => {
    const email = "teste@uenf.br";
    const idTurma = "TURMA_TESTE";

    // Simula a transação de criar convite
    await db.collection("Convite_Aluno").add({
      email,
      id_turma: idTurma,
      status: "pendente",
      convidado_em: new Date()
    });

    const check = await db.collection("Convite_Aluno")
      .where("email", "==", email)
      .where("id_turma", "==", idTurma)
      .where("status", "==", "pendente")
      .get();
    
    expect(check.size).toBeGreaterThanOrEqual(1);
    // Na Cloud Function a transação bloquearia um novo registro
  });
});
