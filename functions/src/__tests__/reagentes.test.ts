process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import { createHash } from "crypto";
import fft from "firebase-functions-test";
import { 
  cadastrarFrascoFechado, 
  cadastrarFrascoAberto,
  registrarAberturaFrasco, 
  registrarRetirada, 
  registrarDevolucao
} from "../reagentes";
import { cadastrarLote } from "../reagentes_base";

const testEnv = fft({ projectId: "lcqui-dev" });

describe("Módulo de Reagentes (Almoxarifado, Frascos, Estoque)", () => {
  let db: admin.firestore.Firestore;

  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "lcqui-dev" });
    }
    db = admin.firestore();
    return db.collection("Contador_Codigo_Frasco").doc("singleton").set({
      ultimo_codigo_gerado: 0,
    });
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  const mockRequest = (data: any, uid: string, roles: string[] = ["Gestor_Almoxarifado"]): any => {
    const payload = data.idEspecificacaoReagente && !data.idResumoReagente
      ? { ...data, idResumoReagente: `resumo_${data.idEspecificacaoReagente}` }
      : data;
    return {
    data: payload.idEspecificacaoReagente
      ? { ...payload, idOperacao: payload.idOperacao ?? `test_${createHash("sha256").update(JSON.stringify({ uid, payload })).digest("hex").slice(0, 24)}` }
      : payload,
    auth: {
      uid,
      token: { roles, versao_permissoes: 1 }
    },
    rawRequest: {}
    };
  };

  async function seedEspecificacao(id: string, densidade: number | null, estadoFisico: "LIQUIDO" | "SOLIDO") {
    const dados = {
      densidade,
      estado_fisico: estadoFisico
    };
    await db.collection("Resumo_Reagente").doc(`resumo_${id}`).set({ nome: `Reagente ${id}`, eh_higroscopico: false });
    await db.collection("Especificacao_Reagente").doc(id).set(dados);
    await db.collection("Resumo_Reagente").doc(`resumo_${id}`)
      .collection("Especificacoes").doc(id).set(dados);
  }

  it("deve cadastrar lote com referência imutável, chave atômica e replay idempotente", async () => {
    await seedEspecificacao("espec_lote", null, "SOLIDO");
    await seedGestorAlmoxarifado("gestor_lote", "almox_lote");
    const request = mockRequest({
      idEspecificacaoReagente: "espec_lote",
      idResumoReagente: "resumo_espec_lote",
      dataAquisicao: "2026-10-09",
      qtdFrascosComprados: 12,
      nomeFornecedor: "  Fornecedor Lote  ",
      numeroLote: "  LT-001  ",
      notaFiscal: " NF-001 ",
      dataFabricacao: "2026-01-01",
      dataValidade: "2027-01-01",
    }, "gestor_lote");
    const primeiro = await testEnv.wrap(cadastrarLote)(request);
    const replay = await testEnv.wrap(cadastrarLote)(request);
    expect(replay).toEqual(primeiro);

    const lote = await db.collection("Lote").doc(primeiro.idLote).get();
    expect(lote.data()).toMatchObject({
      id: primeiro.idLote,
      id_resumo_reagente: "resumo_espec_lote",
      id_especificacao_reagente: "espec_lote",
      nome_fornecedor: "Fornecedor Lote",
      numero_lote: "LT-001",
      nota_fiscal: "NF-001",
      qtd_frascos_comprados: 12,
      data_fabricacao: "2026-01-01",
      data_validade: "2027-01-01",
    });
    const chave = await db.collection("Chaves_Unicas").where("id_recurso", "==", primeiro.idLote).get();
    expect(chave.docs).toHaveLength(1);

    const outroRequest = { ...request, data: { ...request.data, idOperacao: "lote-outro-operacao" } };
    await expect(testEnv.wrap(cadastrarLote)(outroRequest)).rejects.toThrow(/Já existe um lote/i);
  });

  it("deve cadastrar frasco já aberto sem fabricar tara ou saldo", async () => {
    await seedEspecificacao("espec_aberto_convergente", 1.2, "LIQUIDO");
    await seedGestorAlmoxarifado("gestor_aberto_convergente", "almox_aberto_convergente");
    const resultado = await testEnv.wrap(cadastrarFrascoAberto)(mockRequest({
      idEspecificacaoReagente: "espec_aberto_convergente",
      idResumoReagente: "resumo_espec_aberto_convergente",
      idAlmoxarifado: "almox_aberto_convergente",
      pesoTotalBalanca: 500,
      volumeNominal: 250,
      validadeDesconhecida: true,
    }, "gestor_aberto_convergente"));
    const frasco = await db.collection("Frasco_Reagente").doc(resultado.idFrasco).get();
    expect(frasco.data()).toMatchObject({
      condicao_inicial_cadastro: "JA_ABERTO",
      estado_fisico_frasco: "ABERTO",
      disponibilidade: "INDISPONIVEL",
      peso_frasco_vazio: null,
      origem_tara: null,
      saldo_desconhecido: true,
      saldo_aferido_ml: null,
      data_abertura: null,
      id_especificacao_reagente: "espec_aberto_convergente",
    });
    const replay = await testEnv.wrap(cadastrarFrascoAberto)(mockRequest({
      idEspecificacaoReagente: "espec_aberto_convergente",
      idResumoReagente: "resumo_espec_aberto_convergente",
      idAlmoxarifado: "almox_aberto_convergente",
      pesoTotalBalanca: 500,
      volumeNominal: 250,
      validadeDesconhecida: true,
    }, "gestor_aberto_convergente"));
    expect(replay).toEqual(resultado);
  });

  it("deve rejeitar lote com datas impossíveis antes de gravar", async () => {
    await seedEspecificacao("espec_lote_datas", null, "SOLIDO");
    await seedGestorAlmoxarifado("gestor_lote_datas", "almox_lote_datas");
    const base = {
      idEspecificacaoReagente: "espec_lote_datas",
      idResumoReagente: "resumo_espec_lote_datas",
      dataAquisicao: "2027-01-01",
      qtdFrascosComprados: 1,
      nomeFornecedor: "Fornecedor",
      numeroLote: "LT-DATAS",
      notaFiscal: "NF-DATAS",
      dataFabricacao: "2026-12-31",
      dataValidade: "2026-01-01",
    };
    await expect(testEnv.wrap(cadastrarLote)(mockRequest(base, "gestor_lote_datas")))
      .rejects.toThrow(/não pode estar no futuro/i);
  });

  async function seedGestorAlmoxarifado(uid: string, idAlmoxarifado: string) {
    await db.collection("Almoxarifado").doc(idAlmoxarifado).set({ ativo: true, nome: idAlmoxarifado });
    await db.collection("Usuarios").doc(uid).set({
      ativo: true,
      versao_permissoes: 1,
    });
    await db.collection("Gestor_Almoxarifado").doc(uid).set({
      id_usuario: uid,
      ativo: true,
    });
    await db.collection("Gestor_Almoxarifado_x_Almoxarifado").doc(`${uid}_${idAlmoxarifado}`).set({
      id_usuario: uid,
      id_gestor_almoxarifado: uid,
      id_almoxarifado: idAlmoxarifado,
    });
  }

  it("deve recusar cadastro de reagente LÍQUIDO se densidade for nula ou menor/igual a zero", async () => {
    await seedEspecificacao("espec_liq_sem_densidade", null, "LIQUIDO");
    await seedGestorAlmoxarifado("gestor1", "almox1");

    const wrapped = testEnv.wrap(cadastrarFrascoFechado);
    const req = mockRequest({
      idEspecificacaoReagente: "espec_liq_sem_densidade",
      idAlmoxarifado: "almox1",
      pesoTotal: 500,
      volumeNominal: 250
    }, "gestor1");

    await expect(wrapped(req)).rejects.toThrow(/Líquido exige densidade positiva/i);
  });

  it("deve rejeitar cadastro quando a versão de permissões da claim está obsoleta", async () => {
    await seedEspecificacao("espec_claim_obsoleta", null, "SOLIDO");
    await seedGestorAlmoxarifado("gestor_claim_obsoleta", "almox_claim");

    const req = mockRequest({
      idEspecificacaoReagente: "espec_claim_obsoleta",
      idAlmoxarifado: "almox_claim",
      pesoTotal: 600,
      volumeNominal: 500,
    }, "gestor_claim_obsoleta");
    req.auth.token.versao_permissoes = 2;

    await expect(testEnv.wrap(cadastrarFrascoFechado)(req))
      .rejects.toThrow(/Permissões desatualizadas/i);
  });

  it("deve rejeitar operação fora do vínculo persistido do almoxarifado", async () => {
    await seedEspecificacao("espec_escopo", null, "SOLIDO");
    await seedGestorAlmoxarifado("gestor_escopo", "almox_autorizado");

    await expect(testEnv.wrap(cadastrarFrascoFechado)(mockRequest({
      idEspecificacaoReagente: "espec_escopo",
      idAlmoxarifado: "almox_nao_autorizado",
      pesoTotal: 600,
      volumeNominal: 500,
    }, "gestor_escopo"))).rejects.toThrow(/não está designado/i);
  });

  it("deve calcular o peso_vazio do frasco líquido usando a fórmula: pesoTotal - (volumeNominal * densidade)", async () => {
    await seedEspecificacao("espec_liq", 1.2, "LIQUIDO");
    await seedGestorAlmoxarifado("gestor2", "almox2");
    
    // peso total = 500g. volume nominal = 250ml. conteudo pesa 250 * 1.2 = 300g.
    // peso vazio = 500 - 300 = 200g
    const wrapped = testEnv.wrap(cadastrarFrascoFechado);
    const req = mockRequest({
      idEspecificacaoReagente: "espec_liq",
      idAlmoxarifado: "almox2",
      pesoTotal: 500,
      volumeNominal: 250
    }, "gestor2");

    const result = await wrapped(req);
    expect(result.pesoVazioCalculado).toBe(200);

    const frascoSnap = await db.collection("Frasco_Reagente").doc(result.idFrasco).get();
    expect(frascoSnap.data()?.peso_frasco_vazio).toBe(200);
  });

  it("deve calcular o peso_vazio do frasco sólido por subtração direta (g)", async () => {
    await seedEspecificacao("espec_solido", null, "SOLIDO");
    await seedGestorAlmoxarifado("gestor3", "almox3");

    // peso total = 600g. conteudo nominal = 500g. peso vazio = 100g.
    const wrapped = testEnv.wrap(cadastrarFrascoFechado);
    const req = mockRequest({
      idEspecificacaoReagente: "espec_solido",
      idAlmoxarifado: "almox3",
      pesoTotal: 600,
      volumeNominal: 500
    }, "gestor3");

    const result = await wrapped(req);
    expect(result.pesoVazioCalculado).toBe(100);
  });

  it("deve preservar nominal desconhecido sem fabricar tara ou saldo", async () => {
    await seedEspecificacao("espec_desconhecido", 1.2, "LIQUIDO");
    await seedGestorAlmoxarifado("gestor_desconhecido", "almox_desconhecido");

    const resultado = await testEnv.wrap(cadastrarFrascoFechado)(mockRequest({
      idOperacao: "frasco-desconhecido-001",
      idEspecificacaoReagente: "espec_desconhecido",
      idAlmoxarifado: "almox_desconhecido",
      pesoTotal: 600,
      volumeNominal: null,
    }, "gestor_desconhecido"));
    const frasco = (await db.collection("Frasco_Reagente").doc(resultado.idFrasco).get()).data();
    expect(frasco).toMatchObject({
      conteudo_nominal: null,
      peso_frasco_vazio: null,
      origem_tara: null,
      saldo_aferido_g: null,
      saldo_aferido_ml: null,
      saldo_desconhecido: true,
      estado_fisico_frasco: "FECHADO",
      situacao_localizacao: "LOCALIZADO",
      condicao_inicial_cadastro: "FECHADO",
      abertura_historica_desconhecida: false,
    });
    expect((await db.collection("Chaves_Unicas").doc(`Frasco_Reagente__${resultado.codigoFrasco}`).get()).data())
      .toMatchObject({ tipo: "Frasco_Reagente", id_recurso: resultado.idFrasco });
    expect((await db.collection("Historico_Frasco_Reagente").where("id_frasco_reagente", "==", resultado.idFrasco).get()).docs[0].data())
      .toMatchObject({ tipo: "CADASTRO", id_almoxarifado: "almox_desconhecido", id_gestor: "gestor_desconhecido" });
    expect((await db.collection("Operacoes").doc("frasco-desconhecido-001").get()).data()).toMatchObject({
      tipo_operacao: "CADASTRAR_FRASCO_FECHADO", status: "CONCLUIDA",
    });
  });

  it("deve devolver o receipt no replay e rejeitar reuso incompatível", async () => {
    await seedEspecificacao("espec_replay", null, "SOLIDO");
    await seedGestorAlmoxarifado("gestor_replay", "almox_replay");
    const dados = {
      idOperacao: "frasco-replay-001", idEspecificacaoReagente: "espec_replay",
      idAlmoxarifado: "almox_replay", pesoTotal: 600, volumeNominal: 500,
    };
    const wrapped = testEnv.wrap(cadastrarFrascoFechado);
    const primeira = await wrapped(mockRequest(dados, "gestor_replay"));
    const segunda = await wrapped(mockRequest(dados, "gestor_replay"));
    expect(segunda).toEqual(primeira);
    expect((await db.collection("Contador_Codigo_Frasco").doc("singleton").get()).data()?.ultimo_codigo_gerado)
      .toBe(Number(String(primeira.codigoFrasco).replace("LCQUI-", "")));
    await expect(wrapped(mockRequest({ ...dados, pesoTotal: 601 }, "gestor_replay")))
      .rejects.toMatchObject({ code: "already-exists" });
  });

  it("deve exigir detalhe_status preenchido ao colocar um frasco em QUARENTENA", async () => {
    await seedEspecificacao("espec_liq", 1.2, "LIQUIDO");
    await seedGestorAlmoxarifado("gestor4", "almox4");

    const wrapped = testEnv.wrap(cadastrarFrascoFechado);
    const req = mockRequest({
      idEspecificacaoReagente: "espec_liq",
      idAlmoxarifado: "almox4",
      pesoTotal: 500,
      volumeNominal: 250,
      validadeFechado: "2020-01-01", // vencido
      decisaoSeJaVencido: "QUARENTENA"
      // detalheStatus is missing
    }, "gestor4");

    await expect(wrapped(req)).rejects.toThrow(/exige detalhe_status/i);
  });

  it("deve aceitar validade_desconhecida=true ignorando o campo de validade", async () => {
    await seedEspecificacao("espec_sol", null, "SOLIDO");
    await seedGestorAlmoxarifado("gestor5", "almox5");

    const wrapped = testEnv.wrap(cadastrarFrascoFechado);
    const req = mockRequest({
      idEspecificacaoReagente: "espec_sol",
      idAlmoxarifado: "almox5",
      pesoTotal: 600,
      volumeNominal: 500,
      validadeFechado: "2020-01-01", // This would normally mean vencido
      validadeDesconhecida: true
    }, "gestor5");

    const result = await wrapped(req);
    expect(result.venceuNoCadastro).toBe(false);
  });

  it("deve recalcular a validade_efetiva no momento de registro de frasco ABERTO baseada no prazo pos-abertura", async () => {
    await seedEspecificacao("espec_liq_abrir", 1.0, "LIQUIDO");
    await seedGestorAlmoxarifado("gestor6", "almox6");

    const wrapped = testEnv.wrap(cadastrarFrascoFechado);
    const req = mockRequest({
      idEspecificacaoReagente: "espec_liq_abrir",
      idAlmoxarifado: "almox6",
      pesoTotal: 500,
      volumeNominal: 250,
      validadeFechado: "2030-01-01"
    }, "gestor6");

    const frascoResult = await wrapped(req);
    await db.collection("Frasco_Reagente").doc(frascoResult.idFrasco).update({
      validade_apos_aberto_dias: 10 // 10 days
    });

    const wrappedAbrir = testEnv.wrap(registrarAberturaFrasco);
    const resultAbrir = await wrappedAbrir(mockRequest({
      idFrasco: frascoResult.idFrasco
    }, "gestor6"));

    // validadeEfetiva must be approx +10 days from now
    const validadeEsperada = new Date();
    validadeEsperada.setDate(validadeEsperada.getDate() + 10);
    expect(resultAbrir.validadeEfetiva!.getTime()).toBeCloseTo(validadeEsperada.getTime(), -4); 
  });

  it("deve proibir retirada (empréstimo) de frasco em QUARENTENA", async () => {
    await seedEspecificacao("espec_quarentena", null, "SOLIDO");
    await seedGestorAlmoxarifado("gestor7", "almox7");
    await db.collection("Professor").doc("prof1").set({ nome: "Prof 1" });

    const wrapped = testEnv.wrap(cadastrarFrascoFechado);
    const frascoResult = await wrapped(mockRequest({
      idEspecificacaoReagente: "espec_quarentena",
      idAlmoxarifado: "almox7",
      pesoTotal: 600,
      volumeNominal: 500,
      validadeFechado: "2020-01-01",
      decisaoSeJaVencido: "QUARENTENA",
      detalheStatus: "Retido para analise pelo gestor"
    }, "gestor7"));

    const wrappedRetirada = testEnv.wrap(registrarRetirada);
    await expect(wrappedRetirada(mockRequest({
      idFrasco: frascoResult.idFrasco,
      idUsuarioRetirou: "prof1",
      idLocalUsado: "local1",
      pesoSaida: 600,
      dataDevolucaoPrevista: "2030-01-01",
      finalidadeUso: "PESQUISA"
    }, "gestor7"))).rejects.toThrow(/Frasco em quarentena não pode ser retirado/i);
  });

  it("deve proibir nova retirada de frasco vencido se uso_vencido_autorizado for false", async () => {
    await seedEspecificacao("espec_vencido", null, "SOLIDO");
    await seedGestorAlmoxarifado("gestor8", "almox8");
    await db.collection("Professor").doc("prof1").set({ nome: "Prof 1" });

    const wrapped = testEnv.wrap(cadastrarFrascoFechado);
    const frascoResult = await wrapped(mockRequest({
      idEspecificacaoReagente: "espec_vencido",
      idAlmoxarifado: "almox8",
      pesoTotal: 600,
      volumeNominal: 500,
      validadeFechado: "2020-01-01",
      decisaoSeJaVencido: "PENDENTE_DE_DESCARTE"
    }, "gestor8"));

    const pendencia = await db.collection("Pendencias_Descarte_Frasco").doc(frascoResult.idFrasco).get();
    expect(pendencia.data()).toMatchObject({
      id_frasco: frascoResult.idFrasco,
      origem: "QUARENTENA",
      id_operacao_decisao: expect.any(String),
      id_gestor_decisao: "gestor8",
    });

    const wrappedRetirada = testEnv.wrap(registrarRetirada);
    await expect(wrappedRetirada(mockRequest({
      idFrasco: frascoResult.idFrasco,
      idUsuarioRetirou: "prof1",
      idLocalUsado: "local1",
      pesoSaida: 600,
      dataDevolucaoPrevista: "2030-01-01",
      finalidadeUso: "DIDATICO_DEMONSTRACAO"
    }, "gestor8"))).rejects.toThrow(/Frasco vencido requer confirmação explícita/i);
  });

  it("deve calcular volume consumido (mL) na devolução subtraindo peso_retorno e dividindo pela densidade", async () => {
    await seedEspecificacao("espec_dev", 2.0, "LIQUIDO"); // densidade = 2.0
    await seedGestorAlmoxarifado("gestor9", "almox9");
    await db.collection("Professor").doc("prof_dev").set({ nome: "Prof Dev" });

    const wrapped = testEnv.wrap(cadastrarFrascoFechado);
    const frascoResult = await wrapped(mockRequest({
      idEspecificacaoReagente: "espec_dev",
      idAlmoxarifado: "almox9",
      pesoTotal: 500,
      volumeNominal: 200 // peso vazio = 500 - (200*2) = 100g
    }, "gestor9"));

    // Retirada
    const wrappedRetirada = testEnv.wrap(registrarRetirada);
    const retResult = await wrappedRetirada(mockRequest({
      idFrasco: frascoResult.idFrasco,
      idUsuarioRetirou: "prof_dev",
      idLocalUsado: "local1",
      pesoSaida: 500,
      dataDevolucaoPrevista: "2030-01-01",
      finalidadeUso: "PESQUISA",
      abrirNoEmprestimo: true
    }, "gestor9"));

    // Devolucao: peso retorno = 400g (consumiu 100g)
    // densidade = 2, logo 100g = 50ml
    const wrappedDevolucao = testEnv.wrap(registrarDevolucao);
    const devResult = await wrappedDevolucao(mockRequest({
      idEmprestimo: retResult.idEmprestimo,
      pesoRetorno: 400
    }, "gestor9"));

    expect(devResult.pesoConsumido).toBe(100);
    expect(devResult.volumeUtilizado).toBe(50); // ml

    const frascoSnap = await db.collection("Frasco_Reagente").doc(frascoResult.idFrasco).get();
    expect(frascoSnap.data()?.peso_atual).toBe(400);
    expect(frascoSnap.data()?.medida_usada).toBe(50);
  });
  
  it("deve evitar consumo negativo (peso_retorno > peso_saida) lançando erro na devolução (com tolerancia higroscopica)", async () => {
    await seedEspecificacao("espec_dev2", 2.0, "LIQUIDO");
    await seedGestorAlmoxarifado("gestor10", "almox10");
    await db.collection("Professor").doc("prof_dev").set({ nome: "Prof Dev" });

    const wrapped = testEnv.wrap(cadastrarFrascoFechado);
    const frascoResult = await wrapped(mockRequest({
      idEspecificacaoReagente: "espec_dev2",
      idAlmoxarifado: "almox10",
      pesoTotal: 500,
      volumeNominal: 200 
    }, "gestor10"));

    const wrappedRetirada = testEnv.wrap(registrarRetirada);
    const retResult = await wrappedRetirada(mockRequest({
      idFrasco: frascoResult.idFrasco,
      idUsuarioRetirou: "prof_dev",
      idLocalUsado: "local1",
      pesoSaida: 500,
      dataDevolucaoPrevista: "2030-01-01",
      finalidadeUso: "PESQUISA"
    }, "gestor10"));

    const wrappedDevolucao = testEnv.wrap(registrarDevolucao);
    // Retornou com 550g (> 102% de 500g, que é 510g). Deve falhar.
    await expect(wrappedDevolucao(mockRequest({
      idEmprestimo: retResult.idEmprestimo,
      pesoRetorno: 550
    }, "gestor10"))).rejects.toThrow(/excede 102% da massa de saída/i);
  });

  it("deve registrar autoatendimento e notificar a chefia quando não há outro gestor ativo", async () => {
    const uid = `prof_gestor_${Date.now()}`;
    const chefe = `chefe_auto_${Date.now()}`;
    const almox = `almox_auto_${Date.now()}`;
    const frasco = `frasco_auto_${Date.now()}`;

    await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Professor").doc(uid).set({ id_usuario: uid });
    await db.collection("Gestor_Almoxarifado").doc(uid).set({ id_usuario: uid });
    await db.collection("Gestor_Almoxarifado_x_Almoxarifado").doc(`${uid}_${almox}`).set({
      id_gestor_almoxarifado: uid,
      id_almoxarifado: almox,
    });
    await db.collection("Usuarios").doc(chefe).set({ ativo: true });
    await db.collection("Chefe_Geral").doc(chefe).set({ id_usuario: chefe });
    await db.collection("Frasco_Reagente").doc(frasco).set({
      id_almoxarifado: almox,
      disponibilidade: "DISPONIVEL",
      em_quarentena: false,
      estado_fisico_frasco: "FECHADO",
      vencido: false,
    });

    const resultado = await testEnv.wrap(registrarRetirada)(mockRequest({
      idFrasco: frasco,
      idUsuarioRetirou: uid,
      idLocalUsado: "local-auto",
      pesoSaida: 100,
      dataDevolucaoPrevista: "2030-01-01",
      finalidadeUso: "OUTRO",
      justificativaAutoAtendimento: "Não havia outro gestor ativo no almoxarifado.",
    }, uid, ["Professor", "Gestor_Almoxarifado"]));

    expect(resultado.autoAtendimento).toBe(true);
    expect((await db.collection("Emprestimo_Reagente").doc(resultado.idEmprestimo).get()).data()).toMatchObject({
      auto_atendimento: true,
      id_gestor_retirada: uid,
    });
    expect((await db.collection("Usuarios").doc(chefe).collection("Notificacoes")
      .where("tipo", "==", "AUTO_ATENDIMENTO_RETIRADA").get()).size).toBe(1);
  });
});
