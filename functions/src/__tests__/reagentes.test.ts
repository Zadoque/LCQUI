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
  registrarDevolucao,
  repetirPesagemDevolucaoAnomala,
  confirmarEsgotamentoAposInspecao,
  recalibrarTaraFrascoEsgotado,
  registrarPesagemRotina,
  descartarFrasco,
  registrarExtravioOuReencontro,
  colocarFrascoEmQuarentena,
  resolverQuarentenaFrasco
} from "../reagentes";
import { 
  cadastrarLote,
  cadastrarSubstanciaQuimica,
  cadastrarResumoReagente,
  cadastrarEspecificacao
} from "../reagentes_base";

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
    const idOp = payload.idOperacao ?? `test_${createHash("sha256").update(JSON.stringify({ uid, payload })).digest("hex").slice(0, 24)}`;
    return {
      data: { ...payload, idOperacao: idOp },
      auth: {
        uid,
        token: { roles, versao_permissoes: 1 }
      },
      rawRequest: {}
    };
  };

  async function seedEspecificacao(id: string, densidade: number | null, estadoFisico: "LIQUIDO" | "SOLIDO") {
    const resumoDados = {
      nome: `Reagente ${id}`,
      tipo_substancia: "PURA",
      natureza_quimica: "INORGANICO",
      estado_fisico: estadoFisico,
      requer_pesagem_frequente: false,
      frequencia_pesagem_dias: null,
      qtd_em_que_e_considerado_escasso: 1,
      eh_higroscopico: false,
    };
    const especificacaoDados = { densidade };
    await db.collection("Resumo_Reagente").doc(`resumo_${id}`).set(resumoDados);
    await db.collection("Especificacao_Reagente").doc(id).set(especificacaoDados);
    await db.collection("Resumo_Reagente").doc(`resumo_${id}`)
      .collection("Especificacoes").doc(id).set(especificacaoDados);
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
    await Promise.all([db.collection("Professor").doc("prof1").set({ nome: "Prof 1" }), db.collection("Usuarios").doc("prof1").set({ ativo: true, versao_permissoes: 1 })]);

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
    await Promise.all([db.collection("Professor").doc("prof1").set({ nome: "Prof 1" }), db.collection("Usuarios").doc("prof1").set({ ativo: true, versao_permissoes: 1 })]);

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
    await Promise.all([db.collection("Professor").doc("prof_dev").set({ nome: "Prof Dev" }), db.collection("Usuarios").doc("prof_dev").set({ ativo: true, versao_permissoes: 1 })]);

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
  
  it("deve evitar consumo negativo (peso_retorno > peso_saida) retendo frasco em anomalia Q06 e quarentena", async () => {
    await seedEspecificacao("espec_dev2", 2.0, "LIQUIDO");
    await seedGestorAlmoxarifado("gestor10", "almox10");
    await Promise.all([db.collection("Professor").doc("prof_dev").set({ nome: "Prof Dev" }), db.collection("Usuarios").doc("prof_dev").set({ ativo: true, versao_permissoes: 1 })]);

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
    // Retornou com 550g (> limite Q06).
    const devResult = await wrappedDevolucao(mockRequest({
      idEmprestimo: retResult.idEmprestimo,
      pesoRetorno: 550
    }, "gestor10"));

    expect(devResult.anomalia).toBe("GANHO_ACIMA_Q06");
    expect(devResult.consumoPendente).toBe(true);

    const empDoc = await db.collection("Emprestimo_Reagente").doc(retResult.idEmprestimo).get();
    expect(empDoc.data()?.status).toBe("DEVOLVIDO_COM_ANOMALIA");
    expect(empDoc.data()?.consumo_validado).toBe(false);

    const frascoDoc = await db.collection("Frasco_Reagente").doc(frascoResult.idFrasco).get();
    expect(frascoDoc.data()?.em_quarentena).toBe(true);
    expect(frascoDoc.data()?.disponibilidade).toBe("INDISPONIVEL");
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

  describe("Catálogo Canônico (IMP-REAG-001)", () => {
    it("deve cadastrar substância com CAS, reservar chave determinística e validar replay", async () => {
      const uid = `gestor_cat_${Date.now()}`;
      await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
      await db.collection("Gestor_Almoxarifado").doc(uid).set({ id_usuario: uid });

      const casValido = "7732-18-5";
      const req: any = {
        data: {
          idOperacao: `op_subst_${Date.now()}`,
          nome: "Água P.A.",
          casNumber: casValido,
          formulaQuimica: "H2O",
          ativo: true,
        },
        auth: {
          uid,
          token: { roles: ["Gestor_Almoxarifado"], versao_permissoes: 1 },
        },
        rawRequest: {},
      };

      const res1 = await testEnv.wrap(cadastrarSubstanciaQuimica)(req);
      expect(res1.idSubstanciaQuimica).toBeDefined();

      // Replay idempotente com mesmo idOperacao
      const replay = await testEnv.wrap(cadastrarSubstanciaQuimica)(req);
      expect(replay.idSubstanciaQuimica).toBe(res1.idSubstanciaQuimica);

      // Chave única de CAS reservada
      const chaveCas = await db.collection("Chaves_Unicas").doc(`Substancia_Quimica__CAS__${casValido}`).get();
      expect(chaveCas.exists).toBe(true);
      expect(chaveCas.data()?.id_recurso).toBe(res1.idSubstanciaQuimica);

      // Conflito de CAS com idOperacao diferente deve falhar fechado com already-exists
      const reqColisao: any = {
        ...req,
        data: {
          ...req.data,
          idOperacao: `op_subst_outro_${Date.now()}`,
          nome: "Outra Água",
        },
        rawRequest: {},
      };
      await expect(testEnv.wrap(cadastrarSubstanciaQuimica)(reqColisao)).rejects.toThrow(/Já existe uma substância química/i);
    });

    it("deve cadastrar resumo com higroscopicidade e replay idempotente", async () => {
      const uid = `gestor_res_${Date.now()}`;
      await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
      await db.collection("Gestor_Almoxarifado").doc(uid).set({ id_usuario: uid });

      const req: any = {
        data: {
          idOperacao: `op_res_${Date.now()}`,
          nome: "Hidróxido de Potássio",
          tipoSubstancia: "PURA",
          naturezaQuimica: "INORGANICO",
          estadoFisico: "SOLIDO",
          requerPesagemFrequente: true,
          frequenciaPesagemDias: 15,
          ehHigroscopico: true,
          qtdEmQueEConsideradoEscasso: 3,
        },
        auth: {
          uid,
          token: { roles: ["Gestor_Almoxarifado"], versao_permissoes: 1 },
        },
        rawRequest: {},
      };

      const res = await testEnv.wrap(cadastrarResumoReagente)(req);
      expect(res.idResumoReagente).toBeDefined();

      const doc = await db.collection("Resumo_Reagente").doc(res.idResumoReagente).get();
      expect(doc.data()).toMatchObject({
        nome: "Hidróxido de Potássio",
        eh_higroscopico: true,
        estado_fisico: "SOLIDO",
        letra_inicial: "H",
        frequencia_pesagem_dias: 15,
      });

      // Replay idempotente
      const replay = await testEnv.wrap(cadastrarResumoReagente)(req);
      expect(replay.idResumoReagente).toBe(res.idResumoReagente);
    });

    it("deve cadastrar especificação líquida com densidade obrigatória e composição pura", async () => {
      const uid = `gestor_esp_${Date.now()}`;
      await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
      await db.collection("Gestor_Almoxarifado").doc(uid).set({ id_usuario: uid });

      // Cria substância base
      const subRef = db.collection("Substancia_Quimica").doc();
      await subRef.set({ nome: "Etanol Absoluto", cas_number: "64-17-5", ativo: true });

      // Cria resumo líquido puro
      const resRef = db.collection("Resumo_Reagente").doc();
      await resRef.set({
        nome: "Etanol 99%",
        tipo_substancia: "PURA",
        natureza_quimica: "ORGANICO",
        estado_fisico: "LIQUIDO",
        requer_pesagem_frequente: false,
        frequencia_pesagem_dias: null,
        eh_higroscopico: false,
        qtd_em_que_e_considerado_escasso: 2,
      });

      // Tentar cadastrar líquido sem densidade deve falhar
      const reqSemDensidade: any = {
        data: {
          idOperacao: `op_esp_sem_dens_${Date.now()}`,
          idResumoReagente: resRef.id,
          descricao: "Etanol P.A. 99.5%",
          classeInflamabilidade: "CLASSE_1",
          ehControladoPf: false,
          ehControladoEb: false,
          idSubstanciaQuimica: subRef.id,
        },
        auth: {
          uid,
          token: { roles: ["Gestor_Almoxarifado"], versao_permissoes: 1 },
        },
        rawRequest: {},
      };
      await expect(testEnv.wrap(cadastrarEspecificacao)(reqSemDensidade)).rejects.toThrow(/Densidade é obrigatória/i);

      // Com densidade válida
      const reqComDensidade: any = {
        ...reqSemDensidade,
        data: {
          ...reqSemDensidade.data,
          idOperacao: `op_esp_com_dens_${Date.now()}`,
          densidade: 0.789,
        },
        rawRequest: {},
      };
      const resEsp = await testEnv.wrap(cadastrarEspecificacao)(reqComDensidade);
      expect(resEsp.idEspecificacao).toBeDefined();

      const especDoc = await resRef.collection("Especificacoes").doc(resEsp.idEspecificacao).get();
      expect(especDoc.data()).toMatchObject({
        densidade: 0.789,
        unidade_de_medida: "ml",
        composicao: [{ id_substancia_quimica: subRef.id, tipo_concentracao: "M_M" }],
      });
      expect(especDoc.data()).not.toHaveProperty("estado_fisico");
    });
  });

  describe("Devolução e Metrologia Quantitativa (IMP-DEV-001, IMP-MET-001, IMP-MET-002, IMP-TERM-001)", () => {
    const uidGestor = "gestor_metrologia";
    const idAlmox = "almox_metrologia";

    beforeEach(async () => {
      await seedGestorAlmoxarifado(uidGestor, idAlmox);
      await Promise.all([
        db.collection("Professor").doc("prof_met").set({ nome: "Prof Metrologia" }),
        db.collection("Usuarios").doc("prof_met").set({ ativo: true, versao_permissoes: 1 }),
      ]);
    });

    it("deve registrar devolução com evaporação dentro da perda bruta e calcular volume corretamente", async () => {
      await seedEspecificacao("espec_dev_evap", 1.5, "LIQUIDO");
      const frasco = await testEnv.wrap(cadastrarFrascoFechado)(mockRequest({
        idEspecificacaoReagente: "espec_dev_evap",
        idAlmoxarifado: idAlmox,
        pesoTotal: 500,
        volumeNominal: 200,
      }, uidGestor));

      const ret = await testEnv.wrap(registrarRetirada)(mockRequest({
        idFrasco: frasco.idFrasco,
        idUsuarioRetirou: "prof_met",
        idLocalUsado: "local1",
        pesoSaida: 500,
        dataDevolucaoPrevista: "2030-01-01",
        finalidadeUso: "PESQUISA",
      }, uidGestor));

      const dev = await testEnv.wrap(registrarDevolucao)(mockRequest({
        idEmprestimo: ret.idEmprestimo,
        pesoRetorno: 470,
        pesoPerdaEvaporacao: 10,
      }, uidGestor));

      expect(dev.pesoConsumido).toBe(20);
      expect(dev.volumeUtilizado).toBeCloseTo(20 / 1.5);
      expect(dev.consumoPendente).toBe(false);

      const empDoc = await db.collection("Emprestimo_Reagente").doc(ret.idEmprestimo).get();
      expect(empDoc.data()?.status).toBe("DEVOLVIDO");
      expect(empDoc.data()?.consumo_validado).toBe(true);
      expect(empDoc.data()?.peso_perda_evaporacao).toBe(10);
    });

    it("deve rejeitar devolução se perda por evaporação exceder a perda bruta observada (constraint M6)", async () => {
      await seedEspecificacao("espec_dev_evap_inv", 1.0, "LIQUIDO");
      const frasco = await testEnv.wrap(cadastrarFrascoFechado)(mockRequest({
        idEspecificacaoReagente: "espec_dev_evap_inv",
        idAlmoxarifado: idAlmox,
        pesoTotal: 300,
        volumeNominal: 100,
      }, uidGestor));

      const ret = await testEnv.wrap(registrarRetirada)(mockRequest({
        idFrasco: frasco.idFrasco,
        idUsuarioRetirou: "prof_met",
        idLocalUsado: "local1",
        pesoSaida: 300,
        dataDevolucaoPrevista: "2030-01-01",
        finalidadeUso: "PESQUISA",
      }, uidGestor));

      await expect(testEnv.wrap(registrarDevolucao)(mockRequest({
        idEmprestimo: ret.idEmprestimo,
        pesoRetorno: 295,
        pesoPerdaEvaporacao: 8,
      }, uidGestor))).rejects.toThrow(/Perda por evaporação excede a perda bruta observada/i);
    });

    it("deve registrar esgotamento confirmado (confirmarEsgotamento) tornando o frasco VAZIO com tara real e saldo zero", async () => {
      await seedEspecificacao("espec_dev_esgotar", 1.0, "LIQUIDO");
      const frasco = await testEnv.wrap(cadastrarFrascoFechado)(mockRequest({
        idEspecificacaoReagente: "espec_dev_esgotar",
        idAlmoxarifado: idAlmox,
        pesoTotal: 250,
        volumeNominal: 100,
      }, uidGestor));

      const ret = await testEnv.wrap(registrarRetirada)(mockRequest({
        idFrasco: frasco.idFrasco,
        idUsuarioRetirou: "prof_met",
        idLocalUsado: "local1",
        pesoSaida: 250,
        dataDevolucaoPrevista: "2030-01-01",
        finalidadeUso: "PESQUISA",
      }, uidGestor));

      const dev = await testEnv.wrap(registrarDevolucao)(mockRequest({
        idEmprestimo: ret.idEmprestimo,
        pesoRetorno: 148,
        confirmarEsgotamento: true,
      }, uidGestor));

      expect(dev.consumoPendente).toBe(false);

      const frascoDoc = await db.collection("Frasco_Reagente").doc(frasco.idFrasco).get();
      expect(frascoDoc.data()?.estado_fisico_frasco).toBe("VAZIO");
      expect(frascoDoc.data()?.origem_tara).toBe("MEDIDA_REAL");
      expect(frascoDoc.data()?.peso_frasco_vazio).toBe(148);
      expect(frascoDoc.data()?.saldo_desconhecido).toBe(false);
      expect(frascoDoc.data()?.saldo_aferido_g).toBe(0);
      expect(frascoDoc.data()?.disponibilidade).toBe("INDISPONIVEL");
    });

    it("deve resolver pendência metrológica anômala pela Rota 1 (repetirPesagemDevolucaoAnomala)", async () => {
      await seedEspecificacao("espec_dev_r1", 1.0, "LIQUIDO");
      const frasco = await testEnv.wrap(cadastrarFrascoFechado)(mockRequest({
        idEspecificacaoReagente: "espec_dev_r1",
        idAlmoxarifado: idAlmox,
        pesoTotal: 500,
        volumeNominal: 200,
      }, uidGestor));

      const ret = await testEnv.wrap(registrarRetirada)(mockRequest({
        idFrasco: frasco.idFrasco,
        idUsuarioRetirou: "prof_met",
        idLocalUsado: "local1",
        pesoSaida: 500,
        dataDevolucaoPrevista: "2030-01-01",
        finalidadeUso: "PESQUISA",
      }, uidGestor));

      const dev = await testEnv.wrap(registrarDevolucao)(mockRequest({
        idEmprestimo: ret.idEmprestimo,
        pesoRetorno: 530,
      }, uidGestor));
      expect(dev.anomalia).toBe("GANHO_ACIMA_Q06");

      const res = await testEnv.wrap(repetirPesagemDevolucaoAnomala)(mockRequest({
        idEmprestimo: ret.idEmprestimo,
        pesoNovaMedicao: 480,
        motivo: "Revisão e repetição de pesagem em balança calibrada de precisão.",
      }, uidGestor));

      expect(res.status).toBe("OK");
      expect(res.pesoRetornoEfetivo).toBe(480);
      expect(res.medidaUtilizada).toBe(20);

      const empDoc = await db.collection("Emprestimo_Reagente").doc(ret.idEmprestimo).get();
      expect(empDoc.data()?.consumo_validado).toBe(true);
      expect(empDoc.data()?.peso_retorno_efetivo).toBe(480);
      expect(empDoc.data()?.peso_retorno).toBe(530);
      expect(empDoc.data()?.id_resolucao_metrologica).toBeDefined();
    });

    it("deve resolver pendência metrológica pela Rota 2 (confirmarEsgotamentoAposInspecao)", async () => {
      await seedEspecificacao("espec_dev_r2", 1.0, "LIQUIDO");
      const frasco = await testEnv.wrap(cadastrarFrascoFechado)(mockRequest({
        idEspecificacaoReagente: "espec_dev_r2",
        idAlmoxarifado: idAlmox,
        pesoTotal: 300,
        volumeNominal: 100,
      }, uidGestor));

      await db.collection("Frasco_Reagente").doc(frasco.idFrasco).update({
        origem_tara: "MEDIDA_REAL",
        peso_frasco_vazio: 200,
      });

      const ret = await testEnv.wrap(registrarRetirada)(mockRequest({
        idFrasco: frasco.idFrasco,
        idUsuarioRetirou: "prof_met",
        idLocalUsado: "local1",
        pesoSaida: 300,
        dataDevolucaoPrevista: "2030-01-01",
        finalidadeUso: "PESQUISA",
      }, uidGestor));

      const dev = await testEnv.wrap(registrarDevolucao)(mockRequest({
        idEmprestimo: ret.idEmprestimo,
        pesoRetorno: 195,
      }, uidGestor));
      expect(dev.anomalia).toBe("RETORNO_ABAIXO_TARA_REAL");

      const res = await testEnv.wrap(confirmarEsgotamentoAposInspecao)(mockRequest({
        idEmprestimo: ret.idEmprestimo,
        pesoVazioRealMedido: 195,
        motivo: "Inspeção visual confirmou frasco completamente esgotado e limpo.",
      }, uidGestor));

      expect(res.status).toBe("OK");
      expect(res.vazioConfirmado).toBe(true);

      const frascoDoc = await db.collection("Frasco_Reagente").doc(frasco.idFrasco).get();
      expect(frascoDoc.data()?.estado_fisico_frasco).toBe("VAZIO");
      expect(frascoDoc.data()?.disponibilidade).toBe("INDISPONIVEL");

      const empDoc = await db.collection("Emprestimo_Reagente").doc(ret.idEmprestimo).get();
      expect(empDoc.data()?.consumo_validado).toBe(true);
      expect(empDoc.data()?.peso_retorno_efetivo).toBe(195);
    });

    it("deve recalibrar tara pela Rota 3 (recalibrarTaraFrascoEsgotado) e rejeitar se frasco não estiver VAZIO", async () => {
      const idFrasco = `frasco_tara_${Date.now()}`;
      await db.collection("Frasco_Reagente").doc(idFrasco).set({
        id: idFrasco,
        id_almoxarifado: idAlmox,
        estado_fisico_frasco: "ABERTO",
        peso_atual: 150,
      });

      await expect(testEnv.wrap(recalibrarTaraFrascoEsgotado)(mockRequest({
        idFrasco,
        pesoVazioReal: 145,
        motivo: "Tentativa de recalibrar frasco ainda com reagente.",
      }, uidGestor))).rejects.toThrow(/recipiente efetivamente vazio/i);

      await db.collection("Frasco_Reagente").doc(idFrasco).update({
        estado_fisico_frasco: "VAZIO",
      });

      const res = await testEnv.wrap(recalibrarTaraFrascoEsgotado)(mockRequest({
        idFrasco,
        pesoVazioReal: 145,
        motivo: "Homologação de tara real com frasco seco e completamente esgotado.",
      }, uidGestor));

      expect(res.status).toBe("OK");
      expect(res.novaTara).toBe(145);

      const doc = await db.collection("Frasco_Reagente").doc(idFrasco).get();
      expect(doc.data()?.peso_frasco_vazio).toBe(145);
      expect(doc.data()?.origem_tara).toBe("MEDIDA_REAL");
    });

    it("deve registrar pesagem de rotina (registrarPesagemRotina) e rejeitar se frasco estiver emprestado", async () => {
      const idFrasco = `frasco_rotina_${Date.now()}`;
      await db.collection("Frasco_Reagente").doc(idFrasco).set({
        id: idFrasco,
        id_almoxarifado: idAlmox,
        disponibilidade: "EMPRESTADO",
        peso_atual: 400,
      });

      await expect(testEnv.wrap(registrarPesagemRotina)(mockRequest({
        idFrasco,
        pesoAtual: 395,
        motivo: "Pesagem de inventário em frasco fora do almoxarifado",
      }, uidGestor))).rejects.toThrow(/empréstimo ativo não pode sofrer pesagem/i);

      await db.collection("Frasco_Reagente").doc(idFrasco).update({ disponibilidade: "DISPONIVEL" });
      const res = await testEnv.wrap(registrarPesagemRotina)(mockRequest({
        idFrasco,
        pesoAtual: 395,
        motivo: "Pesagem periódica semestral de controle de estoque.",
      }, uidGestor));

      expect(res.status).toBe("OK");
      expect(res.pesoAtual).toBe(395);

      const doc = await db.collection("Frasco_Reagente").doc(idFrasco).get();
      expect(doc.data()?.peso_atual).toBe(395);
    });

    it("deve realizar descarte terminal (descartarFrasco) em frasco VAZIO e rejeitar se em quarentena", async () => {
      const idFrasco = `frasco_desc_${Date.now()}`;
      await db.collection("Frasco_Reagente").doc(idFrasco).set({
        id: idFrasco,
        id_almoxarifado: idAlmox,
        disponibilidade: "INDISPONIVEL",
        em_quarentena: true,
        estado_fisico_frasco: "VAZIO",
      });

      await expect(testEnv.wrap(descartarFrasco)(mockRequest({
        idFrasco,
        motivo: "Descarte de frasco vazio ainda sob regime de quarentena.",
      }, uidGestor))).rejects.toThrow(/Resolva a quarentena antes do descarte/i);

      await db.collection("Frasco_Reagente").doc(idFrasco).update({ em_quarentena: false });

      const res = await testEnv.wrap(descartarFrasco)(mockRequest({
        idFrasco,
        motivo: "Descarte técnico institucional de resíduo e embalagem esgotada.",
      }, uidGestor));

      expect(res.status).toBe("OK");

      const doc = await db.collection("Frasco_Reagente").doc(idFrasco).get();
      expect(doc.data()?.estado_fisico_frasco).toBe("DESCARTADO");
      expect(doc.data()?.disponibilidade).toBe("INDISPONIVEL");
    });
  });

  describe("Extravio, Reencontro e Quarentena (IMP-M5-001, IMP-M5-002, IMP-M5-003)", () => {
    const uidGestor = "gestor_m5";
    const idAlmox = "almox_m5";

    beforeEach(async () => {
      await seedGestorAlmoxarifado(uidGestor, idAlmox);
    });

    it("deve registrar extravio (IMP-M5-001) encerrando extraordinariamente empréstimo ativo e preservando estado físico", async () => {
      const idFrasco = `frasco_ext_${Date.now()}`;
      const idEmp = `emp_ext_${Date.now()}`;
      await db.collection("Frasco_Reagente").doc(idFrasco).set({
        id: idFrasco,
        id_almoxarifado: idAlmox,
        estado_fisico_frasco: "ABERTO",
        situacao_localizacao: "LOCALIZADO",
        disponibilidade: "EMPRESTADO",
        saldo_desconhecido: false,
        peso_atual: 250,
      });

      await db.collection("Emprestimo_Frasco").doc(idEmp).set({
        id_frasco_reagente: idFrasco,
        status: "EMPRESTADO",
        id_usuario_retirou: "usuario_teste",
      });

      const reqExtrair = mockRequest({
        idOperacao: `op_ext_${Date.now()}`,
        idFrasco,
        tipoAcao: "EXTRAVIAR",
        motivo: "Frasco não localizado após auditoria de bancada.",
      }, uidGestor);

      const res = await testEnv.wrap(registrarExtravioOuReencontro)(reqExtrair);
      expect(res.status).toBe("OK");
      expect(res.situacao_localizacao).toBe("EXTRAVIADO");

      // Replay idempotente
      const replay = await testEnv.wrap(registrarExtravioOuReencontro)(reqExtrair);
      expect(replay.status).toBe("OK");

      // Frasco preserva estado físico e peso
      const frascoDoc = await db.collection("Frasco_Reagente").doc(idFrasco).get();
      expect(frascoDoc.data()?.situacao_localizacao).toBe("EXTRAVIADO");
      expect(frascoDoc.data()?.disponibilidade).toBe("INDISPONIVEL");
      expect(frascoDoc.data()?.estado_fisico_frasco).toBe("ABERTO");
      expect(frascoDoc.data()?.peso_atual).toBe(250);

      // Empréstimo sofre encerramento extraordinário
      const empDoc = await db.collection("Emprestimo_Frasco").doc(idEmp).get();
      expect(empDoc.data()?.status).toBe("ENCERRADO_EXTRAORDINARIO");
      expect(empDoc.data()?.tipo_encerramento_excepcional).toBe("EXTRAVIO_SINISTRO");

      // Segunda tentativa de extraviar o mesmo frasco falha fechado
      await expect(testEnv.wrap(registrarExtravioOuReencontro)(mockRequest({
        idFrasco,
        tipoAcao: "EXTRAVIAR",
        motivo: "Tentativa de extraviar frasco já extraviado.",
      }, uidGestor))).rejects.toThrow(/já está registrado como extraviado/i);
    });

    it("deve reencontrar frasco (IMP-M5-002) com validação de transição, quarentena compulsória e sem reabrir empréstimo", async () => {
      const idFrasco = `frasco_reen_${Date.now()}`;
      await db.collection("Frasco_Reagente").doc(idFrasco).set({
        id: idFrasco,
        id_almoxarifado: idAlmox,
        estado_fisico_frasco: "FECHADO",
        situacao_localizacao: "EXTRAVIADO",
        disponibilidade: "INDISPONIVEL",
        saldo_desconhecido: false,
        peso_atual: 300,
      });

      // Reencontro constatado como ABERTO a partir de FECHADO: marca abertura histórica desconhecida
      const res = await testEnv.wrap(registrarExtravioOuReencontro)(mockRequest({
        idFrasco,
        tipoAcao: "REENCONTRAR",
        estadoFisicoConstatado: "ABERTO",
        motivo: "Frasco localizado em armário secundário com selo rompido.",
      }, uidGestor));

      expect(res.status).toBe("OK");
      expect(res.situacao_localizacao).toBe("LOCALIZADO");
      expect(res.em_quarentena).toBe(true);

      const frascoDoc = await db.collection("Frasco_Reagente").doc(idFrasco).get();
      expect(frascoDoc.data()?.situacao_localizacao).toBe("LOCALIZADO");
      expect(frascoDoc.data()?.em_quarentena).toBe(true);
      expect(frascoDoc.data()?.disponibilidade).toBe("INDISPONIVEL");
      expect(frascoDoc.data()?.estado_fisico_frasco).toBe("ABERTO");
      expect(frascoDoc.data()?.abertura_historica_desconhecida).toBe(true);
      expect(frascoDoc.data()?.peso_atual).toBe(300); // preserva medição anterior
    });

    it("deve rejeitar reencontro com transição física impossível (ex: frasco aberto reencontrado como fechado)", async () => {
      const idFrasco = `frasco_imposs_${Date.now()}`;
      await db.collection("Frasco_Reagente").doc(idFrasco).set({
        id: idFrasco,
        id_almoxarifado: idAlmox,
        estado_fisico_frasco: "ABERTO",
        situacao_localizacao: "EXTRAVIADO",
        disponibilidade: "INDISPONIVEL",
        data_abertura: "2026-01-01",
      });

      await expect(testEnv.wrap(registrarExtravioOuReencontro)(mockRequest({
        idFrasco,
        tipoAcao: "REENCONTRAR",
        estadoFisicoConstatado: "FECHADO",
        motivo: "Afirmação impossível de que frasco aberto voltou a ser fechado.",
      }, uidGestor))).rejects.toThrow(/Frasco aberto anteriormente não pode ser reencontrado como fechado/i);
    });

    it("deve colocar frasco em quarentena (IMP-M5-003) e rejeitar se já em quarentena ou emprestado", async () => {
      const idFrasco = `frasco_quar_${Date.now()}`;
      await db.collection("Frasco_Reagente").doc(idFrasco).set({
        id: idFrasco,
        id_almoxarifado: idAlmox,
        estado_fisico_frasco: "ABERTO",
        situacao_localizacao: "LOCALIZADO",
        disponibilidade: "DISPONIVEL",
        em_quarentena: false,
      });

      const res = await testEnv.wrap(colocarFrascoEmQuarentena)(mockRequest({
        idFrasco,
        motivo: "Suspeita de contaminação por turvação observada no líquido.",
      }, uidGestor));

      expect(res.status).toBe("OK");
      expect(res.em_quarentena).toBe(true);

      const frascoDoc = await db.collection("Frasco_Reagente").doc(idFrasco).get();
      expect(frascoDoc.data()?.em_quarentena).toBe(true);
      expect(frascoDoc.data()?.disponibilidade).toBe("INDISPONIVEL");

      // Rejeita colocar novamente em quarentena
      await expect(testEnv.wrap(colocarFrascoEmQuarentena)(mockRequest({
        idFrasco,
        motivo: "Segunda tentativa de entrada em quarentena para mesmo frasco.",
      }, uidGestor))).rejects.toThrow(/Frasco já se encontra em quarentena/i);
    });

    it("deve resolver quarentena pela rota VOLTAR_A_DISPONIVEL ou PENDENTE_DE_DESCARTE (IMP-M5-003)", async () => {
      // Caso 1: Frasco VAZIO não pode voltar a disponível
      const idVazio = `frasco_quar_vazio_${Date.now()}`;
      await db.collection("Frasco_Reagente").doc(idVazio).set({
        id: idVazio,
        id_almoxarifado: idAlmox,
        estado_fisico_frasco: "VAZIO",
        situacao_localizacao: "LOCALIZADO",
        disponibilidade: "INDISPONIVEL",
        em_quarentena: true,
      });

      await expect(testEnv.wrap(resolverQuarentenaFrasco)(mockRequest({
        idFrasco: idVazio,
        decisao: "VOLTAR_A_DISPONIVEL",
        motivo: "Tentativa indevida de disponibilizar frasco vazio.",
      }, uidGestor))).rejects.toThrow(/Frasco vazio ou quebrado não pode voltar a disponível/i);

      // Caso 2: Resolução por PENDENTE_DE_DESCARTE gera autorização e permite descarte posterior
      const resDescarte = await testEnv.wrap(resolverQuarentenaFrasco)(mockRequest({
        idFrasco: idVazio,
        decisao: "PENDENTE_DE_DESCARTE",
        motivo: "Laudo técnico confirma frasco completamente esgotado e apto a descarte.",
      }, uidGestor));

      expect(resDescarte.status).toBe("OK");
      expect(resDescarte.decisao).toBe("PENDENTE_DE_DESCARTE");

      const pendenciaDoc = await db.collection("Pendencias_Descarte_Frasco").doc(idVazio).get();
      expect(pendenciaDoc.exists).toBe(true);
      expect(pendenciaDoc.data()?.origem).toBe("QUARENTENA");

      // Agora descarte terminal é admitido consumindo a pendência
      const resFinal = await testEnv.wrap(descartarFrasco)(mockRequest({
        idFrasco: idVazio,
        motivo: "Execução do descarte autorizado com descarte em bombona apropriada.",
      }, uidGestor));
      expect(resFinal.status).toBe("OK");

      const frascoFinal = await db.collection("Frasco_Reagente").doc(idVazio).get();
      expect(frascoFinal.data()?.estado_fisico_frasco).toBe("DESCARTADO");

      // Caso 3: Frasco ABERTO liberado da quarentena volta a DISPONIVEL
      const idAberto = `frasco_quar_aberto_${Date.now()}`;
      await db.collection("Frasco_Reagente").doc(idAberto).set({
        id: idAberto,
        id_almoxarifado: idAlmox,
        estado_fisico_frasco: "ABERTO",
        situacao_localizacao: "LOCALIZADO",
        disponibilidade: "INDISPONIVEL",
        em_quarentena: true,
        vencido: false,
      });

      const resLibera = await testEnv.wrap(resolverQuarentenaFrasco)(mockRequest({
        idFrasco: idAberto,
        decisao: "VOLTAR_A_DISPONIVEL",
        motivo: "Inspeção visual e teste de pureza confirmam ausência de contaminantes.",
      }, uidGestor));

      expect(resLibera.status).toBe("OK");
      const frascoLib = await db.collection("Frasco_Reagente").doc(idAberto).get();
      expect(frascoLib.data()?.em_quarentena).toBe(false);
      expect(frascoLib.data()?.disponibilidade).toBe("DISPONIVEL");
    });
  });
});
