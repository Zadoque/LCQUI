process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import { createHash } from "crypto";
import fft from "firebase-functions-test";
import type { CallableRequest } from "firebase-functions/v2/https";
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

  const mockRequest = (data: Record<string, unknown>, uid: string, roles: string[] = ["Professor"]) => ({
    data: data.idBemPatrimonial || data.idRequisicao
      ? { ...data, idOperacao: data.idOperacao ?? `test_${createHash("sha256").update(JSON.stringify({ uid, data })).digest("hex").slice(0, 24)}` }
      : data,
    auth: {
      uid,
      token: {
        roles, versao_permissoes: 1, uid, sub: uid,
        aud: "lcqui-dev", iss: "https://securetoken.google.com/lcqui-dev",
        auth_time: 1, iat: 1, exp: 4102444800,
        firebase: { identities: {}, sign_in_provider: "custom" },
      }
    },
    rawRequest: {} as CallableRequest["rawRequest"]
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
    }, "gestor_pat", ["Gestor_Bens_Patrimoniais"]))).resolves.toEqual({ status: "rejeitada", motivo: "CONFLITO_VERSAO" });
    expect((await db.collection("Bem_Patrimonial").doc("bem-versao-pat").get()).data()?.estado_conservacao).toBe("BOM");
    expect((await db.collection("Bem_Patrimonial").doc("bem-versao-pat").get()).data()?.versao).toBe(2);
    expect((await db.collection("Requisicao_Edicao_Bem_Patrimonial").doc(criado.idRequisicao).get()).data()?.status).toBe("rejeitada");
    expect((await db.collection("Locks_Requisicao_Patrimonio").doc("bem_edicao_bem-versao-pat").get()).exists).toBe(false);
    expect((await db.collection("Bem_Patrimonial").doc("bem-versao-pat").collection("Historico_Patrimonio").get()).empty).toBe(true);
  });

  describe("IMP-PAT-004 — desfechos normativos de edição (Seções 10.8, 7, 8 e M10)", () => {
    // IDs exclusivos tornam cada cenário independente do restante da suíte.
    async function preparar(proposta: Record<string, unknown> = {}) {
      const bem = db.collection("Bem_Patrimonial").doc();
      const resumo = db.collection("Resumo_Bem_Patrimonial").doc();
      const local = db.collection("Local").doc();
      await resumo.set({ nome: "Balança original", descricao: "Modelo original" });
      await local.set({ predio: "P1", andar: "1", sala: "101" });
      await bem.set({
        id: bem.id, numero_patrimonio: bem.id, versao: 1, status: "Ativo",
        estado_conservacao: "BOM", id_resumo_bem_patrimonial: resumo.id,
        nome_equipamento: "Balança original", letra_inicial_nome: "B",
        id_local: local.id, predio: "P1", andar: "1", sala: "101",
        photo_url: `patrimonio/${bem.id}/foto.png`,
      });
      const criada = await testEnv.wrap(criarRequisicaoEdicaoBem)(mockRequest({
        idOperacao: `criar_${bem.id}`, idBemPatrimonial: bem.id, novoEstadoConservacao: "REGULAR",
        motivo: "Revisão patrimonial", ...proposta,
      }, "prof1"));
      const req = db.collection("Requisicao_Edicao_Bem_Patrimonial").doc(criada.idRequisicao);
      const lock = db.collection("Locks_Requisicao_Patrimonio").doc(`bem_edicao_${bem.id}`);
      // Lock de outra requisição: os desfechos desta resposta jamais podem removê-lo.
      const lockSentinela = db.collection("Locks_Requisicao_Patrimonio").doc(`sentinela_${req.id}`);
      const dadosLockSentinela = {
        id_requisicao: `requisicao-sentinela-${req.id}`,
        tipo: "EDICAO",
        chave_recurso: `bem-sentinela-${req.id}`,
      };
      await lockSentinela.set(dadosLockSentinela);
      const historico = bem.collection("Historico_Patrimonio");
      const notificacoes = db.collection("Usuarios").doc("prof1").collection("Notificacoes")
        .where("id_alvo", "==", req.id);
      const responder = (aprovar = true, justificativa: unknown = "Decisão fundamentada") =>
        testEnv.wrap(responderRequisicaoEdicaoBem)(mockRequest({
          idOperacao: `responder_${req.id}`, idRequisicao: req.id, aprovar, justificativa,
        }, "gestor_pat", ["Gestor_Bens_Patrimoniais"]));
      const estado = async () => ({
        bem: (await bem.get()).data(), req: (await req.get()).data(),
        lock: (await lock.get()).data(),
        lockSentinela: (await lockSentinela.get()).data(),
        historico: (await historico.get()).docs.map(doc => ({ id: doc.id, ...doc.data() })),
        notificacoes: (await notificacoes.get()).docs.map(doc => ({ id: doc.id, ...doc.data() })),
      });
      expect((await req.get()).data()?.versao_bem_origem).toBe(1);
      expect((await lock.get()).data()).toMatchObject({
        id_requisicao: req.id, tipo: "EDICAO", chave_recurso: bem.id,
      });
      return { bem, resumo, local, req, lock, lockSentinela, dadosLockSentinela, historico, notificacoes, responder, estado };
    }

    it.each(["conflito", "rejeicao humana", "bem ausente", "local ausente", "resumo ausente"])(
      "%s finaliza, libera somente o lock e não altera Bem/histórico", async (caso) => {
        const alvo = db.collection(caso === "local ausente" ? "Local" : "Resumo_Bem_Patrimonial").doc();
        await alvo.set(caso === "local ausente"
          ? { predio: "P2", andar: "2", sala: "202" }
          : { nome: "Novo modelo", descricao: "Descrição" });
        const f = await preparar(caso === "local ausente" ? { novoIdLocal: alvo.id }
          : caso === "resumo ausente" ? { novoIdResumoBemPatrimonial: alvo.id } : {});
        if (caso === "conflito" || caso === "rejeicao humana") await f.bem.update({ versao: 2 });
        if (caso === "bem ausente") await f.bem.delete();
        if (caso === "local ausente" || caso === "resumo ausente") await alvo.delete();
        const antes = await f.estado();
        const resultado = await f.responder(caso !== "rejeicao humana");
        expect(resultado).toMatchObject({ status: "rejeitada" });
        if (caso !== "rejeicao humana") expect(resultado).toMatchObject({
          motivo: caso === "local ausente" ? "LOCAL_NAO_ENCONTRADO"
            : caso === "resumo ausente" ? "RESUMO_ALVO_NAO_ENCONTRADO" : "CONFLITO_VERSAO",
        });
        const depois = await f.estado();
        expect(depois.bem).toEqual(antes.bem);
        expect(depois.historico).toEqual(antes.historico);
        expect(depois.lock).toBeUndefined();
        expect(depois.lockSentinela).toEqual(f.dadosLockSentinela);
        expect(depois.req).toMatchObject({
          status: "rejeitada", id_usuario_respondente: "gestor_pat",
          respondida_em: expect.any(admin.firestore.Timestamp),
          justificativa_resposta: expect.stringMatching(/\S/),
        });
        if (caso === "rejeicao humana") expect(depois.req?.justificativa_resposta).toBe("Decisão fundamentada");
        expect(depois.notificacoes).toHaveLength(1);
        await expect(f.responder(caso === "rejeicao humana" ? false : true)).resolves.toMatchObject({ status: "rejeitada" });
        expect(await f.estado()).toEqual(depois);
      },
    );

    it.each(["ausente", "id_requisicao", "tipo", "chave_recurso"])(
      "lock %s impede aprovação e rejeição sem qualquer mutação", async (campo) => {
        const f = await preparar();
        if (campo === "ausente") await f.lock.delete();
        else await f.lock.update({ [campo]: campo === "tipo" ? "ADICAO" : "outro-recurso" });
        const antes = await f.estado();
        for (const aprovar of [true, false]) {
          await expect(f.responder(aprovar)).rejects.toMatchObject({ code: "failed-precondition" });
          expect(await f.estado()).toEqual(antes);
        }
      },
    );

    it.each([undefined, "", "   "])("justificativa inválida (%s) não produz fatos", async (justificativa) => {
      const f = await preparar();
      const antes = await f.estado();
      for (const aprovar of [true, false]) {
        const data = { idRequisicao: f.req.id, aprovar, ...(justificativa === undefined ? {} : { justificativa }) };
        await expect(testEnv.wrap(responderRequisicaoEdicaoBem)(mockRequest(data, "gestor_pat", ["Gestor_Bens_Patrimoniais"])))
          .rejects.toMatchObject({ code: "invalid-argument" });
        expect(await f.estado()).toEqual(antes);
      }
    });

    it.each(["existente", "novo"])("aprova Resumo %s com vínculo, versão e histórico únicos", async (tipo) => {
      const alvo = db.collection("Resumo_Bem_Patrimonial").doc();
      if (tipo === "existente") await alvo.set({ nome: "Microscópio", descricao: "Modelo óptico" });
      const f = await preparar(tipo === "existente" ? { novoIdResumoBemPatrimonial: alvo.id }
        : { novoNome: "Microscópio", novaDescricaoResumo: "Modelo óptico" });
      const original = (await f.resumo.get()).data();
      await expect(f.responder()).resolves.toEqual({ status: "aprovada" });
      const depois = await f.estado();
      const idResumo = depois.bem?.id_resumo_bem_patrimonial;
      expect(typeof idResumo).toBe("string");
      expect(idResumo).not.toBe(f.resumo.id);
      if (tipo === "existente") expect(idResumo).toBe(alvo.id);
      expect((await db.collection("Resumo_Bem_Patrimonial").doc(idResumo).get()).data())
        .toMatchObject({ nome: "Microscópio", descricao: "Modelo óptico" });
      expect((await f.resumo.get()).data()).toEqual(original);
      expect(depois.bem).toMatchObject({ versao: 2, nome_equipamento: "Microscópio", estado_conservacao: "REGULAR" });
      expect(depois.req).toMatchObject({ status: "aprovada", novo_id_resumo_bem_patrimonial: idResumo });
      expect(depois.lock).toBeUndefined();
      expect(depois.lockSentinela).toEqual(f.dadosLockSentinela);
      expect(depois.notificacoes).toHaveLength(1);
      expect(depois.historico).toHaveLength(1);
      expect(depois.historico[0]).toMatchObject({
        tipo: "edicao", id_bem_patrimonial: f.bem.id, id_usuario: "gestor_pat",
        alteracoes: expect.arrayContaining([
          { campo: "estado_conservacao", valor_anterior: "BOM", valor_novo: "REGULAR" },
          { campo: "id_resumo_bem_patrimonial", valor_anterior: f.resumo.id, valor_novo: idResumo },
        ]),
      });
      expect(depois.historico[0].id).toBe(`edicao_responder_${f.req.id}`);
      expect((await db.collection("Operacoes").doc(`responder_${f.req.id}`).get()).data()).toMatchObject({
        tipo_operacao: "RESPONDER_REQUISICAO_EDICAO_BEM",
        status: "CONCLUIDA",
        resultado: { status: "aprovada" },
      });
      await expect(f.responder()).resolves.toEqual({ status: "aprovada" });
      expect(await f.estado()).toEqual(depois);
    });

    it("rejeita reuso incompatível do idOperacao sem tocar no estado terminal", async () => {
      const f = await preparar();
      await expect(f.responder()).resolves.toEqual({ status: "aprovada" });
      await expect(testEnv.wrap(responderRequisicaoEdicaoBem)(mockRequest({
        idOperacao: `responder_${f.req.id}`,
        idRequisicao: f.req.id,
        aprovar: true,
        justificativa: "Payload divergente",
      }, "gestor_pat", ["Gestor_Bens_Patrimoniais"]))).rejects.toMatchObject({ code: "already-exists" });
    });
  });
});
