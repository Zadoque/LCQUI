process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { 
  cadastrarFrascoFechado, 
  registrarAberturaFrasco, 
  registrarRetirada, 
  registrarDevolucao 
} from "../reagentes";

const testEnv = fft({ projectId: "lcqui-dev" });

describe("Módulo de Reagentes (Almoxarifado, Frascos, Estoque)", () => {
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

  const mockRequest = (data: any, uid: string, roles: string[] = ["Gestor_Almoxarifado"]): any => ({
    data,
    auth: {
      uid,
      token: { roles }
    },
    rawRequest: {}
  });

  async function seedEspecificacao(id: string, densidade: number | null, estadoFisico: "LIQUIDO" | "SOLIDO") {
    await db.collection("Especificacao_Reagente").doc(id).set({
      densidade,
      estado_fisico: estadoFisico
    });
  }

  async function seedGestorAlmoxarifado(uid: string, idAlmoxarifado: string) {
    await db.collection("Gestor_Almoxarifado_x_Almoxarifado").doc(`${uid}_${idAlmoxarifado}`).set({
      id_usuario: uid,
      id_almoxarifado: idAlmoxarifado
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
      detalheStatus: "Retido para analise"
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
});
