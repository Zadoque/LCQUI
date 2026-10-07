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
      admin.initializeApp({ projectId: "lcqui-dev", storageBucket: "lcqui-dev.appspot.com" });
    }
    db = admin.firestore();
    const professores = ["prof1", "prof2", "prof3"];
    const usuarios = professores.map(uid => db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 }));
    const papeisProfessores = professores.map(uid => db.collection("Professor").doc(uid).set({ id_usuario: uid, ativo: true }));
    usuarios.push(db.collection("Usuarios").doc("gestor_pat").set({ ativo: true, versao_permissoes: 1 }));
    papeisProfessores.push(db.collection("Gestor_Bens_Patrimoniais").doc("gestor_pat").set({ id_usuario: "gestor_pat", ativo: true }));
    return Promise.all([...usuarios, ...papeisProfessores]);
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  beforeEach(async () => {
    await Promise.all([
      "bem_adicao_123456",
      "bem_adicao_654321",
      "bem_adicao_888888",
      "bem_edicao_bem_editar",
    ].map(id => db.collection("Locks_Requisicao_Patrimonio").doc(id).delete()));
  });

  const mockRequest = (data: any, uid: string, roles: string[] = ["Professor"]): any => ({
    data,
    auth: {
      uid,
      token: { roles, versao_permissoes: 1 }
    },
    rawRequest: {}
  });

  it("deve criar uma requisição de adição de bem com lock", async () => {
    const wrapped = testEnv.wrap(criarRequisicaoAdicaoBem);
    const req = mockRequest({
      numeroPatrimonioProposto: "123456",
      estadoConservacaoProposto: "BOM",
      photoUrlProposta: "requisicoes/prof1/foto.png",
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
      estadoConservacaoProposto: "BOM",
      photoUrlProposta: "requisicoes/prof1/foto.png",
      idLocal: "local1",
      nomeResponsavelProposto: "Maria",
      motivo: "Equipamento duplicado req"
    }, "prof1", ["Professor"]);

    // Primeira requisição
    await wrapped(req);

    // Segunda requisição
    await expect(wrapped(req)).rejects.toThrow(/Já existe requisição pendente/i);
  });

  it("deve rejeitar na criação uma plaqueta já reservada permanentemente", async () => {
    await db.collection("Chaves_Unicas").doc("Bem_Patrimonial__PAT-CRIACAO-RESERVADA").set({
      tipo: "Bem_Patrimonial",
      id_recurso: "bem-existente",
      chave_recurso: "PAT-CRIACAO-RESERVADA",
    });

    await expect(testEnv.wrap(criarRequisicaoAdicaoBem)(mockRequest({
      numeroPatrimonioProposto: " pat-criacao-reservada ",
      estadoConservacaoProposto: "BOM",
      photoUrlProposta: "requisicoes/prof1/foto.png",
      idLocal: "local1",
      nomeResponsavelProposto: "Maria",
      motivo: "Colisão de reserva",
    }, "prof1", ["Professor"]))).rejects.toThrow(/reservada permanentemente/i);
  });

  it("deve serializar duas requisições equivalentes no mesmo lock canônico", async () => {
    const dados = {
      estadoConservacaoProposto: "BOM",
      photoUrlProposta: "requisicoes/prof1/foto.png",
      idLocal: "local1",
      nomeResponsavelProposto: "Maria",
      motivo: "Corrida de reserva",
    };
    const resultados = await Promise.allSettled([
      testEnv.wrap(criarRequisicaoAdicaoBem)(mockRequest({ ...dados, numeroPatrimonioProposto: " pat-corrida " }, "prof1", ["Professor"])),
      testEnv.wrap(criarRequisicaoAdicaoBem)(mockRequest({ ...dados, numeroPatrimonioProposto: "PAT-CORRIDA" }, "prof2", ["Professor"])),
    ]);

    expect(resultados.filter(resultado => resultado.status === "fulfilled")).toHaveLength(1);
    expect(resultados.filter(resultado => resultado.status === "rejected")).toHaveLength(1);
    expect((await db.collection("Locks_Requisicao_Patrimonio").doc("bem_adicao_PAT-CORRIDA").get()).data()).toMatchObject({
      tipo: "ADICAO",
      chave_recurso: "PAT-CORRIDA",
    });
  });

  it("deve rejeitar requisição patrimonial quando a claim está com versão obsoleta", async () => {
    const req = mockRequest({
      numeroPatrimonioProposto: "777000",
      estadoConservacaoProposto: "BOM",
      photoUrlProposta: "requisicoes/prof1/foto.png",
      idLocal: "local1",
      nomeResponsavelProposto: "Maria",
      motivo: "Versão de autorização obsoleta",
    }, "prof1", ["Professor"]);
    req.auth.token.versao_permissoes = 2;

    await expect(testEnv.wrap(criarRequisicaoAdicaoBem)(req))
      .rejects.toThrow(/Permissões desatualizadas/i);
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
      estadoConservacaoProposto: "BOM",
      photoUrlProposta: "requisicoes/prof1/foto.png",
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
      estadoConservacaoProposto: "BOM",
      photoUrlProposta: "requisicoes/prof1/foto.png",
      nomeResponsavelProposto: "João",
      motivo: "Falta Local"
      // idLocal is missing
    }, "prof1", ["Professor"]);

    await expect(wrapped(req)).rejects.toThrow(/idLocal.*(obrigatório|expected string)/i);
  });

  it("deve disparar notificação transacional ao aprovar requisição de edição", async () => {
    await db.collection("Gestor_Bens_Patrimoniais").doc("gestor_pat").set({ id_usuario: "gestor_pat", ativo: true, nome: "Gestor" });
    await db.collection("Bem_Patrimonial").doc("bem_editar").set({
      numero_patrimonio: "777777",
      nome_equipamento: "Antigo Nome",
      status: "Ativo",
      versao: 1,
      id_resumo_bem_patrimonial: "resumo-antigo",
      id_local: "local1",
    });
    await db.collection("Resumo_Bem_Patrimonial").doc("resumo-antigo").set({ nome: "Antigo Nome", descricao: "Resumo" });
    await db.collection("Resumo_Bem_Patrimonial").doc("resumo-novo").set({ nome: "Novo Nome", descricao: "Resumo novo" });

    const wrappedReq = testEnv.wrap(criarRequisicaoEdicaoBem);
    const resultReq = await wrappedReq(mockRequest({
      idBemPatrimonial: "bem_editar",
      novoEstadoConservacao: "REGULAR",
      novoIdResumoBemPatrimonial: "resumo-novo",
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
      .where("entidade_alvo", "==", "Requisicao_Bem")
      .where("tipo", "==", "REQUISICAO_EDICAO_BEM")
      .get();
      
    expect(notifSnap.empty).toBe(false);
  });

  it("deve disparar notificação transacional ao rejeitar requisição de adição", async () => {
    const wrappedReq = testEnv.wrap(criarRequisicaoAdicaoBem);
    const resultReq = await wrappedReq(mockRequest({
      numeroPatrimonioProposto: "888888",
      estadoConservacaoProposto: "BOM",
      photoUrlProposta: "requisicoes/prof3/foto.png",
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
      .where("entidade_alvo", "==", "Requisicao_Bem")
      .where("tipo", "==", "REQUISICAO_ADICAO_BEM")
      .get();
      
    expect(notifSnap.empty).toBe(false);
  });

  it("deve materializar cadastro canônico com reserva permanente, versão 1 e histórico", async () => {
    const numero = ` pat-${Date.now()} `;
    const photoPath = `requisicoes/prof1/pat-${Date.now()}.png`;
    await db.collection("Local").doc("local-pat-canonico").set({ predio: "P1", andar: "1", sala: "101" });
    await db.collection("Resumo_Bem_Patrimonial").doc("resumo-pat-canonico").set({ nome: "Balança Analítica", descricao: "Balança de precisão" });
    await admin.storage().bucket().file(photoPath).save(Buffer.from("fake-image"), { contentType: "image/png" });

    const criado = await testEnv.wrap(criarRequisicaoAdicaoBem)(mockRequest({
      numeroPatrimonioProposto: numero,
      estadoConservacaoProposto: "BOM",
      photoUrlProposta: photoPath,
      idLocal: "local-pat-canonico",
      idResumoBemPatrimonial: "resumo-pat-canonico",
      nomeResponsavelProposto: "Responsável SEI",
      motivo: "Cadastro canônico",
    }, "prof1", ["Professor"]));

    const aprovado = await testEnv.wrap(responderRequisicaoAdicaoBem)(mockRequest({
      idRequisicao: criado.idRequisicao,
      aprovar: true,
      justificativa: "Aprovado",
    }, "gestor_pat", ["Gestor_Bens_Patrimoniais"]));
    const idBemCriado = aprovado.idBemCriado as string;
    const bem = await db.collection("Bem_Patrimonial").doc(idBemCriado).get();
    expect(bem.data()).toMatchObject({
      id: idBemCriado,
      numero_patrimonio: numero.trim().toUpperCase(),
      versao: 1,
      status: "Ativo",
      id_resumo_bem_patrimonial: "resumo-pat-canonico",
      predio: "P1",
      andar: "1",
      sala: "101",
      photo_url: photoPath,
    });
    expect((await db.collection("Chaves_Unicas").doc(`Bem_Patrimonial__${numero.trim().toUpperCase()}`).get()).exists).toBe(true);
    expect((await bem.ref.collection("Historico_Patrimonio").get()).size).toBe(1);
  });

  it("deve impedir reutilização de plaqueta já reservada por bem terminal", async () => {
    const numero = "PAT-BAIXADO";
    const photoPath = "requisicoes/prof1/pat-baixado.png";
    await db.collection("Chaves_Unicas").doc(`Bem_Patrimonial__${numero}`).set({
      tipo: "Bem_Patrimonial",
      id_recurso: "bem-terminal",
      chave_recurso: numero,
    });
    await admin.storage().bucket().file(photoPath).save(Buffer.from("fake-image"), { contentType: "image/png" });

    await expect(testEnv.wrap(criarRequisicaoAdicaoBem)(mockRequest({
      numeroPatrimonioProposto: ` ${numero.toLowerCase()} `,
      estadoConservacaoProposto: "BOM",
      photoUrlProposta: photoPath,
      idLocal: "local1",
      idResumoBemPatrimonial: "resumo-antigo",
      nomeResponsavelProposto: "Responsável SEI",
      motivo: "Tentativa de reutilização",
    }, "prof1", ["Professor"]))).rejects.toThrow(/reservada permanentemente/i);
    expect((await db.collection("Chaves_Unicas").doc(`Bem_Patrimonial__${numero}`).get()).data()?.id_recurso).toBe("bem-terminal");
  });

  it("deve rejeitar aprovação de edição quando a versão observada ficou obsoleta", async () => {
    await db.collection("Locks_Requisicao_Patrimonio").doc("bem_edicao_bem-versao-pat").delete();
    await db.collection("Bem_Patrimonial").doc("bem-versao-pat").set({
      id: "bem-versao-pat",
      numero_patrimonio: "PAT-VERSAO",
      status: "Ativo",
      versao: 1,
      estado_conservacao: "BOM",
      id_resumo_bem_patrimonial: "resumo-antigo",
      id_local: "local1",
      photo_url: "patrimonio/bem-versao-pat/foto.png",
    });
    const criado = await testEnv.wrap(criarRequisicaoEdicaoBem)(mockRequest({
      idBemPatrimonial: "bem-versao-pat",
      novoEstadoConservacao: "REGULAR",
      motivo: "Teste de conflito",
    }, "prof1", ["Professor"]));
    await db.collection("Bem_Patrimonial").doc("bem-versao-pat").update({ versao: 2 });

    await expect(testEnv.wrap(responderRequisicaoEdicaoBem)(mockRequest({
      idRequisicao: criado.idRequisicao,
      aprovar: true,
      justificativa: "Não aprovar conflito",
    }, "gestor_pat", ["Gestor_Bens_Patrimoniais"]))).rejects.toThrow(/Versão do bem mudou/i);
    expect((await db.collection("Bem_Patrimonial").doc("bem-versao-pat").get()).data()?.estado_conservacao).toBe("BOM");
  });
});
