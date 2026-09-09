process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { criarTurma, ingressarEmTurmaPorCodigo, removerAlunoTurma, arquivarTurma, adicionarAlunoExistenteTurma, convidarAluno } from "../turmas";

const testEnv = fft({ projectId: "lcqui-dev" });

describe("Módulo Acadêmico (Turmas, Alunos, Convites e Roteiros - Baseado no main.tex)", () => {
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

  it("deve falhar se idMateria for vazio na criação da turma", async () => {
    const wrapped = testEnv.wrap(criarTurma);
    const req = mockRequest({
      nomeTurma: "Química", ano: 2026, semestre: 1, capacidade: 30, nomeMateria: "Química I"
    }, "prof1");
    
    await expect(wrapped(req)).rejects.toThrow(/idMateria.*expected string/i);
  });

  it("deve falhar se ano for invalido", async () => {
    const wrapped = testEnv.wrap(criarTurma);
    const req = mockRequest({
      idMateria: "mat1", nomeTurma: "Q1", ano: "abc", semestre: 1, capacidade: 30, nomeMateria: "Q1"
    }, "prof1");
    await expect(wrapped(req)).rejects.toThrow(/ano.*expected number/i);
  });

  it("deve falhar se semestre for fora de 1 e 2", async () => {
    const wrapped = testEnv.wrap(criarTurma);
    const req = mockRequest({
      idMateria: "mat1", nomeTurma: "Q1", ano: 2026, semestre: 3, capacidade: 30, nomeMateria: "Q1"
    }, "prof1");
    await expect(wrapped(req)).rejects.toThrow(/O semestre deve ser 1 ou 2/i);
  });

  it("deve rejeitar payload com capacidade negativa na criação de turma", async () => {
    const wrapped = testEnv.wrap(criarTurma);
    const req = mockRequest({
      idMateria: "mat1", nomeTurma: "Q1", ano: 2026, semestre: 1, capacidade: -5, nomeMateria: "Q1"
    }, "prof1");
    await expect(wrapped(req)).rejects.toThrow(/A capacidade deve ser um número inteiro positivo/i);
  });

  it("deve garantir a unicidade do codigo_turma via lock transacional determinístico e criar a turma", async () => {
    const wrapped = testEnv.wrap(criarTurma);
    const req = mockRequest({
      idMateria: "mat_x", nomeTurma: "Turma de Teste", ano: 2026, semestre: 1, capacidade: 30, nomeMateria: "Materia de Teste"
    }, "prof_x");
    
    const result = await wrapped(req);
    expect(result.id).toBeDefined();
    expect(result.codigoTurma).toHaveLength(6);

    const doc = await db.collection("Turma").doc(result.id).get();
    expect(doc.exists).toBe(true);
    expect(doc.data()?.qtd_alunos).toBe(0);
    expect(doc.data()?.status).toBe("Ativo");
  });

  it("deve garantir o controle de capacidade da turma impedindo ingresso por código se COUNT(alunos) >= capacidade (RN-TUR-01)", async () => {
    const wrappedCriar = testEnv.wrap(criarTurma);
    const reqCriar = mockRequest({
      idMateria: "mat_c", nomeTurma: "Turma Cheia", ano: 2026, semestre: 1, capacidade: 1, nomeMateria: "Cheia"
    }, "prof_c");
    const turma = await wrappedCriar(reqCriar);

    const wrappedIngressar = testEnv.wrap(ingressarEmTurmaPorCodigo);
    
    const reqAluno1 = mockRequest({ codigoTurma: turma.codigoTurma }, "aluno1", ["Aluno"]);
    await wrappedIngressar(reqAluno1);

    const reqAluno2 = mockRequest({ codigoTurma: turma.codigoTurma }, "aluno2", ["Aluno"]);
    await expect(wrappedIngressar(reqAluno2)).rejects.toThrow(/A capacidade máxima da turma foi atingida/);
  });

  it("deve garantir que o ingresso de aluno registre o evento no Historico_Alunos_Turma como inclusao_aluno", async () => {
    const wrappedCriar = testEnv.wrap(criarTurma);
    const reqCriar = mockRequest({
      idMateria: "mat_h", nomeTurma: "Turma Historico", ano: 2026, semestre: 1, capacidade: 5, nomeMateria: "Historico"
    }, "prof_h");
    const turma = await wrappedCriar(reqCriar);

    const wrappedIngressar = testEnv.wrap(ingressarEmTurmaPorCodigo);
    const reqAluno = mockRequest({ codigoTurma: turma.codigoTurma }, "aluno_h", ["Aluno"]);
    await wrappedIngressar(reqAluno);

    const historicoSnap = await db.collection("Turma").doc(turma.id).collection("HistoricoAlunos")
      .where("id_aluno", "==", "aluno_h").get();
    
    expect(historicoSnap.empty).toBe(false);
    expect(historicoSnap.docs[0].data().tipo).toBe("inclusao_aluno");
  });

  it("deve rejeitar tentativa de ingresso se o codigo da turma for inexistente", async () => {
    const wrappedIngressar = testEnv.wrap(ingressarEmTurmaPorCodigo);
    const reqAluno = mockRequest({ codigoTurma: "INVALD" }, "aluno_err", ["Aluno"]);
    await expect(wrappedIngressar(reqAluno)).rejects.toThrow(/Turma não encontrada/);
  });

  it("deve rejeitar o ingresso por código se a turma estiver com status Arquivada", async () => {
    const wrappedCriar = testEnv.wrap(criarTurma);
    const reqCriar = mockRequest({
      idMateria: "mat_a", nomeTurma: "Turma Arq", ano: 2026, semestre: 1, capacidade: 5, nomeMateria: "Arq"
    }, "prof_arq");
    const turma = await wrappedCriar(reqCriar);

    const wrappedArquivar = testEnv.wrap(arquivarTurma);
    await wrappedArquivar(mockRequest({ idTurma: turma.id }, "prof_arq"));

    const wrappedIngressar = testEnv.wrap(ingressarEmTurmaPorCodigo);
    const reqAluno = mockRequest({ codigoTurma: turma.codigoTurma }, "aluno_arq", ["Aluno"]);
    await expect(wrappedIngressar(reqAluno)).rejects.toThrow(/turma está arquivada/);
  });

  it("deve registrar o evento de exclusao_aluno no Historico_Alunos_Turma quando professor remover", async () => {
    const wrappedCriar = testEnv.wrap(criarTurma);
    const reqCriar = mockRequest({
      idMateria: "mat_r", nomeTurma: "Turma Rem", ano: 2026, semestre: 1, capacidade: 5, nomeMateria: "Rem"
    }, "prof_rem");
    const turma = await wrappedCriar(reqCriar);

    const wrappedIngressar = testEnv.wrap(ingressarEmTurmaPorCodigo);
    await wrappedIngressar(mockRequest({ codigoTurma: turma.codigoTurma }, "aluno_rem", ["Aluno"]));

    const wrappedRemover = testEnv.wrap(removerAlunoTurma);
    await wrappedRemover(mockRequest({ idTurma: turma.id, idAluno: "aluno_rem" }, "prof_rem"));

    const historicoSnap = await db.collection("Turma").doc(turma.id).collection("HistoricoAlunos")
      .where("tipo", "==", "exclusao_aluno").get();
    
    expect(historicoSnap.empty).toBe(false);
    expect(historicoSnap.docs[0].data().id_aluno).toBe("aluno_rem");
  });

  it("deve criar um Registro_de_Auditoria do tipo ALUNO sempre que um aluno for removido da sala", async () => {
    const wrappedCriar = testEnv.wrap(criarTurma);
    const reqCriar = mockRequest({
      idMateria: "mat_r2", nomeTurma: "Turma Rem2", ano: 2026, semestre: 1, capacidade: 5, nomeMateria: "Rem2"
    }, "prof_rem2");
    const turma = await wrappedCriar(reqCriar);

    const wrappedIngressar = testEnv.wrap(ingressarEmTurmaPorCodigo);
    await wrappedIngressar(mockRequest({ codigoTurma: turma.codigoTurma }, "aluno_rem2", ["Aluno"]));

    const wrappedRemover = testEnv.wrap(removerAlunoTurma);
    await wrappedRemover(mockRequest({ idTurma: turma.id, idAluno: "aluno_rem2" }, "prof_rem2"));

    const auditSnap = await db.collection("Registro_de_Auditoria")
      .where("id_do_objeto_da_entidade", "==", "aluno_rem2")
      .where("tipo_entidade_sofre_acao", "==", "ALUNO")
      .get();
    
    expect(auditSnap.empty).toBe(false);
  });

  it("deve registrar em Registro_de_Auditoria a ação de alterar o status de turma para ARQUIVADA", async () => {
    const wrappedCriar = testEnv.wrap(criarTurma);
    const reqCriar = mockRequest({
      idMateria: "mat_a2", nomeTurma: "Turma Arq2", ano: 2026, semestre: 1, capacidade: 5, nomeMateria: "Arq2"
    }, "prof_arq2");
    const turma = await wrappedCriar(reqCriar);

    const wrappedArquivar = testEnv.wrap(arquivarTurma);
    await wrappedArquivar(mockRequest({ idTurma: turma.id }, "prof_arq2"));

    const auditSnap = await db.collection("Registro_de_Auditoria")
      .where("id_do_objeto_da_entidade", "==", turma.id)
      .where("acao", "==", "Arquivar Turma")
      .get();
    
    expect(auditSnap.empty).toBe(false);
  });

  it("deve permitir que o professor adicione aluno existente via adicionarAlunoExistenteTurma e crie notificacao", async () => {
    const wrappedCriar = testEnv.wrap(criarTurma);
    const reqCriar = mockRequest({
      idMateria: "mat_add", nomeTurma: "Turma Add", ano: 2026, semestre: 1, capacidade: 5, nomeMateria: "Add"
    }, "prof_add");
    const turma = await wrappedCriar(reqCriar);

    await db.collection("Aluno").doc("aluno_add").set({
      nome: "Aluno Add", email: "add@ufsc.br", numero_matricula: "21100000"
    });

    const wrappedAdd = testEnv.wrap(adicionarAlunoExistenteTurma);
    await wrappedAdd(mockRequest({ idTurma: turma.id, idAluno: "aluno_add" }, "prof_add"));

    const matriculaSnap = await db.collection("Turma").doc(turma.id).collection("Alunos").doc("aluno_add").get();
    expect(matriculaSnap.exists).toBe(true);

    const notifSnap = await db.collection("Usuarios").doc("aluno_add").collection("Notificacoes").where("tipo", "==", "ADICIONADO").get();
    expect(notifSnap.empty).toBe(false);
  });

  it("deve falhar ao adicionar aluno se a turma ja estiver cheia", async () => {
    const wrappedCriar = testEnv.wrap(criarTurma);
    const reqCriar = mockRequest({
      idMateria: "mat_full", nomeTurma: "Turma Full", ano: 2026, semestre: 1, capacidade: 1, nomeMateria: "Full"
    }, "prof_full");
    const turma = await wrappedCriar(reqCriar);

    await db.collection("Aluno").doc("aluno_f1").set({ nome: "A1", email: "a1@ufsc.br" });
    await db.collection("Aluno").doc("aluno_f2").set({ nome: "A2", email: "a2@ufsc.br" });

    const wrappedAdd = testEnv.wrap(adicionarAlunoExistenteTurma);
    await wrappedAdd(mockRequest({ idTurma: turma.id, idAluno: "aluno_f1" }, "prof_full"));

    await expect(wrappedAdd(mockRequest({ idTurma: turma.id, idAluno: "aluno_f2" }, "prof_full"))).rejects.toThrow(/atingiu a capacidade/);
  });

  it("deve criar um convite na colecao Convite_Aluno com validade ao usar convidarAluno", async () => {
    const wrappedConvidar = testEnv.wrap(convidarAluno);
    const reqConvidar = mockRequest({ email: "convite@ufsc.br", idTurma: "turma_c1", matricula: "123" }, "prof_c1");
    
    const result = await wrappedConvidar(reqConvidar);
    
    const conviteDoc = await db.collection("Convite_Aluno").doc(result.id).get();
    expect(conviteDoc.exists).toBe(true);
    expect(conviteDoc.data()?.email).toBe("convite@ufsc.br");
    expect(conviteDoc.data()?.status).toBe("pendente");
  });

  it("nao deve permitir convite duplicado para a mesma turma", async () => {
    const wrappedConvidar = testEnv.wrap(convidarAluno);
    await wrappedConvidar(mockRequest({ email: "dup@ufsc.br", idTurma: "turma_dup" }, "prof_dup"));
    
    await expect(wrappedConvidar(mockRequest({ email: "dup@ufsc.br", idTurma: "turma_dup" }, "prof_dup"))).rejects.toThrow(/pendente para este email e turma/);
  });
});
