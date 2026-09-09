process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { 
  criarRequisicaoEdicaoBem, 
  responderRequisicaoEdicaoBem, 
  criarRequisicaoAdicaoBem, 
  responderRequisicaoAdicaoBem 
} from "../patrimonio";

const testEnv = fft({ projectId: "lcqui-dev" });

describe("Módulo de Patrimônio (Equipamentos, Locais e Requisições)", () => {
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

  it("deve criar uma requisição de adição de bem com lock", async () => {
    const wrapped = testEnv.wrap(criarRequisicaoAdicaoBem);
    const req = mockRequest({
      numeroPatrimonioProposto: "123456",
      estadoConservacaoProposto: "Novo",
      idLocal: "local1",
      nomeResponsavelProposto: "João",
      motivo: "Novo equipamento"
    }, "prof1", ["Professor"]);

    const result = await wrapped(req);
    expect(result.idRequisicao).toBeDefined();

    const lockSnap = await db.collection("Locks_Requisicao_Patrimonio").doc("bem_adicao_123456").get();
    expect(lockSnap.exists).toBe(true);
  });

  it("deve impedir criação de requisição (Adição) duplicada pendente via lock (RF10b reimplementado em transação Firestore)", async () => {
    const wrapped = testEnv.wrap(criarRequisicaoAdicaoBem);
    const req = mockRequest({
      numeroPatrimonioProposto: "654321",
      estadoConservacaoProposto: "Novo",
      idLocal: "local1",
      nomeResponsavelProposto: "Maria",
      motivo: "Equipamento duplicado req"
    }, "prof1", ["Professor"]);

    // Primeira requisição
    await wrapped(req);

    // Segunda requisição
    await expect(wrapped(req)).rejects.toThrow(/Já existe requisição pendente/i);
  });

  it("deve rejeitar criação de bem se número de patrimônio já existir (validação Zod/base)", async () => {
    await db.collection("Bem_Patrimonial").doc("bem1").set({
      numero_patrimonio: "999999",
      nome_equipamento: "Teste",
      status: "Ativo"
    });

    const wrapped = testEnv.wrap(criarRequisicaoAdicaoBem);
    const req = mockRequest({
      numeroPatrimonioProposto: "999999",
      estadoConservacaoProposto: "Novo",
      idLocal: "local1",
      nomeResponsavelProposto: "Maria",
      motivo: "Req"
    }, "prof1", ["Professor"]);

    await expect(wrapped(req)).rejects.toThrow(/Já existe um bem cadastrado com este número/i);
  });

  it("deve falhar se a requisição de adição não tiver um ID de local válido (validação Zod)", async () => {
    const wrapped = testEnv.wrap(criarRequisicaoAdicaoBem);
    const req = mockRequest({
      numeroPatrimonioProposto: "111111",
      estadoConservacaoProposto: "Novo",
      nomeResponsavelProposto: "João",
      motivo: "Falta Local"
      // idLocal is missing
    }, "prof1", ["Professor"]);

    await expect(wrapped(req)).rejects.toThrow(/ID do local é obrigatório/i);
  });

  it("deve disparar notificação transacional ao aprovar requisição de edição", async () => {
    await db.collection("Gestor_Bens_Patrimoniais").doc("gestor_pat").set({ nome: "Gestor" });
    await db.collection("Bem_Patrimonial").doc("bem_editar").set({
      numero_patrimonio: "777777",
      nome_equipamento: "Antigo Nome",
      status: "Ativo"
    });

    const wrappedReq = testEnv.wrap(criarRequisicaoEdicaoBem);
    const resultReq = await wrappedReq(mockRequest({
      idBemPatrimonial: "bem_editar",
      novoNome: "Novo Nome",
      motivo: "Mudança de nome"
    }, "prof2", ["Professor"]));

    const wrappedResponder = testEnv.wrap(responderRequisicaoEdicaoBem);
    await wrappedResponder(mockRequest({
      idRequisicao: resultReq.idRequisicao,
      aprovar: true,
      justificativa: "Aprovado com sucesso"
    }, "gestor_pat", ["Gestor_Bens_Patrimoniais"]));

    const reqSnap = await db.collection("Requisicao_Edicao_Bem_Patrimonial").doc(resultReq.idRequisicao).get();
    expect(reqSnap.data()?.status).toBe("aprovada");

    const bemSnap = await db.collection("Bem_Patrimonial").doc("bem_editar").get();
    expect(bemSnap.data()?.nome_equipamento).toBe("Novo Nome");

    // Verificar notificacao para o professor
    const notifSnap = await db.collection("Usuarios").doc("prof2").collection("Notificacoes")
      .where("entidade_alvo", "==", "Requisicao_Edicao_Bem_Patrimonial")
      .where("tipo", "==", "REQUISICAO_APROVADA")
      .get();
      
    expect(notifSnap.empty).toBe(false);
  });

  it("deve disparar notificação transacional ao rejeitar requisição de adição", async () => {
    const wrappedReq = testEnv.wrap(criarRequisicaoAdicaoBem);
    const resultReq = await wrappedReq(mockRequest({
      numeroPatrimonioProposto: "888888",
      estadoConservacaoProposto: "Novo",
      idLocal: "local1",
      nomeResponsavelProposto: "João",
      motivo: "Novo"
    }, "prof3", ["Professor"]));

    const wrappedResponder = testEnv.wrap(responderRequisicaoAdicaoBem);
    await wrappedResponder(mockRequest({
      idRequisicao: resultReq.idRequisicao,
      aprovar: false,
      justificativa: "Rejeitado"
    }, "gestor_pat", ["Gestor_Bens_Patrimoniais"]));

    const reqSnap = await db.collection("Requisicao_Adicao_Bem_Patrimonial").doc(resultReq.idRequisicao).get();
    expect(reqSnap.data()?.status).toBe("rejeitada");

    // Verificar notificacao para o professor
    const notifSnap = await db.collection("Usuarios").doc("prof3").collection("Notificacoes")
      .where("entidade_alvo", "==", "Requisicao_Adicao_Bem_Patrimonial")
      .where("tipo", "==", "REQUISICAO_REJEITADA")
      .get();
      
    expect(notifSnap.empty).toBe(false);
  });
});
