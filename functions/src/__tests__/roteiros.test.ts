process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { registrarRoteiro, compartilharRoteiro, descompartilharRoteiro } from "../roteiros";

const testEnv = fft({ projectId: "lcqui-dev" });

describe("Módulo de Roteiros", () => {
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

  const mockRequest = (data: any, uid: string, roles: string[] = ["Professor"]): any => ({
    data,
    auth: {
      uid,
      token: { roles }
    },
    rawRequest: {}
  });

  it("deve permitir que um professor registre um roteiro", async () => {
    const wrapped = testEnv.wrap(registrarRoteiro);
    const result = await wrapped(mockRequest({
      titulo: "Roteiro de Titulação",
      descricao: "Titulação ácido-base",
      pdf_url: "https://example.com/roteiro.pdf"
    }, "prof1"));

    expect(result.idRoteiro).toBeDefined();

    const roteiroSnap = await db.collection("Roteiro_Experimento").doc(result.idRoteiro).get();
    expect(roteiroSnap.exists).toBe(true);
    expect(roteiroSnap.data()?.id_professor).toBe("prof1");
    expect(roteiroSnap.data()?.titulo).toBe("Roteiro de Titulação");
    expect(roteiroSnap.data()?.compartilhado_com_emails).toEqual([]);
  });

  it("deve permitir compartilhar roteiro apenas se for o dono e enviar notificação", async () => {
    const wrappedReg = testEnv.wrap(registrarRoteiro);
    const resultReg = await wrappedReg(mockRequest({
      titulo: "Roteiro 2",
      pdf_url: "https://example.com/roteiro2.pdf"
    }, "prof2"));

    await db.collection("Professor").doc("prof_alvo").set({
      nome: "Prof Alvo", email: "alvo@ufsc.br"
    });

    const wrappedComp = testEnv.wrap(compartilharRoteiro);
    
    // Tenta compartilhar com outro prof (diferente do dono) -> Falha
    await expect(wrappedComp(mockRequest({
      idRoteiro: resultReg.idRoteiro,
      emailCompartilhar: "alvo@ufsc.br"
    }, "prof_errado"))).rejects.toThrow(/Somente o dono/i);

    // Compartilha corretamente
    await wrappedComp(mockRequest({
      idRoteiro: resultReg.idRoteiro,
      emailCompartilhar: "alvo@ufsc.br"
    }, "prof2"));

    const roteiroSnap = await db.collection("Roteiro_Experimento").doc(resultReg.idRoteiro).get();
    expect(roteiroSnap.data()?.compartilhado_com_emails).toContain("alvo@ufsc.br");

    const notifSnap = await db.collection("Usuarios").doc("prof_alvo").collection("Notificacoes")
      .where("tipo", "==", "ROTEIRO_COMPARTILHADO").get();
    expect(notifSnap.empty).toBe(false);
  });

  it("deve permitir descompartilhar roteiro", async () => {
    const wrappedReg = testEnv.wrap(registrarRoteiro);
    const resultReg = await wrappedReg(mockRequest({
      titulo: "Roteiro 3",
      pdf_url: "https://example.com/roteiro3.pdf"
    }, "prof3"));

    const wrappedComp = testEnv.wrap(compartilharRoteiro);
    await wrappedComp(mockRequest({
      idRoteiro: resultReg.idRoteiro,
      emailCompartilhar: "alvo2@ufsc.br"
    }, "prof3"));

    const wrappedDescomp = testEnv.wrap(descompartilharRoteiro);
    await wrappedDescomp(mockRequest({
      idRoteiro: resultReg.idRoteiro,
      emailDescompartilhar: "alvo2@ufsc.br"
    }, "prof3"));

    const roteiroSnap = await db.collection("Roteiro_Experimento").doc(resultReg.idRoteiro).get();
    expect(roteiroSnap.data()?.compartilhado_com_emails).not.toContain("alvo2@ufsc.br");
  });
});
