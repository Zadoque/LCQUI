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
      token: { roles, versao_permissoes: 1 }
    },
    rawRequest: {}
  });

  let opSeq = 0;
  const novaOperacao = (): string => `op_turma_${Date.now()}_${++opSeq}`;

  async function semearProfessor(uid: string): Promise<void> {
    await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Professor").doc(uid).set({ id_usuario: uid, ativo: true });
  }

  async function semearMateria(id: string, nome: string): Promise<void> {
    await db.collection("Materia").doc(id).set({ nome, codigo_materia: id.toUpperCase() });
  }

  async function criarTurmaOk(
    uid: string,
    campos: { idMateria: string; nomeTurma: string; ano?: number; semestre?: number; capacidade?: number; nomeMateria?: string }
  ): Promise<{ id: string; codigoTurma: string }> {
    await semearProfessor(uid);
    await semearMateria(campos.idMateria, campos.nomeMateria ?? campos.nomeTurma);
    const wrapped = testEnv.wrap(criarTurma);
    return wrapped(mockRequest({
      idOperacao: novaOperacao(),
      idMateria: campos.idMateria,
      nomeTurma: campos.nomeTurma,
      ano: campos.ano ?? 2026,
      semestre: campos.semestre ?? 1,
      capacidade: campos.capacidade ?? 30,
    }, uid));
  }

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
    const result = await criarTurmaOk("prof_x", {
      idMateria: "mat_x", nomeTurma: "Turma de Teste", ano: 2026, semestre: 1, capacidade: 30, nomeMateria: "Materia de Teste"
    });

    expect(result.id).toBeDefined();
    expect(result.codigoTurma).toHaveLength(6);

    const doc = await db.collection("Turma").doc(result.id).get();
    expect(doc.exists).toBe(true);
    expect(doc.data()?.qtd_alunos).toBe(0);
    expect(doc.data()?.status).toBe("Ativo");
    const chave = await db.collection("Chaves_Unicas").doc(`Turma_codigo__${result.codigoTurma}`).get();
    expect(chave.exists).toBe(true);
    expect(chave.data()?.id_recurso).toBe(result.id);
  });

  it("deve garantir o controle de capacidade da turma impedindo ingresso por código se COUNT(alunos) >= capacidade (RN-TUR-01)", async () => {
    const turma = await criarTurmaOk("prof_c", {
      idMateria: "mat_c", nomeTurma: "Turma Cheia", capacidade: 1, nomeMateria: "Cheia"
    });

    const wrappedIngressar = testEnv.wrap(ingressarEmTurmaPorCodigo);
    
    const reqAluno1 = mockRequest({ codigoTurma: turma.codigoTurma }, "aluno1", ["Aluno"]);
    await wrappedIngressar(reqAluno1);

    const reqAluno2 = mockRequest({ codigoTurma: turma.codigoTurma }, "aluno2", ["Aluno"]);
    await expect(wrappedIngressar(reqAluno2)).rejects.toThrow(/A capacidade máxima da turma foi atingida/);
  });

  it("deve garantir que o ingresso de aluno registre o evento no Historico_Alunos_Turma como inclusao_aluno", async () => {
    const turma = await criarTurmaOk("prof_h", {
      idMateria: "mat_h", nomeTurma: "Turma Historico", capacidade: 5, nomeMateria: "Historico"
    });

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
    const turma = await criarTurmaOk("prof_arq", {
      idMateria: "mat_a", nomeTurma: "Turma Arq", capacidade: 5, nomeMateria: "Arq"
    });

    const wrappedArquivar = testEnv.wrap(arquivarTurma);
    await wrappedArquivar(mockRequest({ idTurma: turma.id }, "prof_arq"));

    const wrappedIngressar = testEnv.wrap(ingressarEmTurmaPorCodigo);
    const reqAluno = mockRequest({ codigoTurma: turma.codigoTurma }, "aluno_arq", ["Aluno"]);
    await expect(wrappedIngressar(reqAluno)).rejects.toThrow(/turma está arquivada/);
  });

  it("deve registrar o evento de exclusao_aluno no Historico_Alunos_Turma quando professor remover", async () => {
    const turma = await criarTurmaOk("prof_rem", {
      idMateria: "mat_r", nomeTurma: "Turma Rem", capacidade: 5, nomeMateria: "Rem"
    });

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
    const turma = await criarTurmaOk("prof_rem2", {
      idMateria: "mat_r2", nomeTurma: "Turma Rem2", capacidade: 5, nomeMateria: "Rem2"
    });

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
    const turma = await criarTurmaOk("prof_arq2", {
      idMateria: "mat_a2", nomeTurma: "Turma Arq2", capacidade: 5, nomeMateria: "Arq2"
    });

    const wrappedArquivar = testEnv.wrap(arquivarTurma);
    await wrappedArquivar(mockRequest({ idTurma: turma.id }, "prof_arq2"));

    const auditSnap = await db.collection("Registro_de_Auditoria")
      .where("id_do_objeto_da_entidade", "==", turma.id)
      .where("acao", "==", "Arquivar Turma")
      .get();
    
    expect(auditSnap.empty).toBe(false);
  });

  it("deve permitir que o professor adicione aluno existente via adicionarAlunoExistenteTurma e crie notificacao", async () => {
    const turma = await criarTurmaOk("prof_add", {
      idMateria: "mat_add", nomeTurma: "Turma Add", capacidade: 5, nomeMateria: "Add"
    });

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
    const turma = await criarTurmaOk("prof_full", {
      idMateria: "mat_full", nomeTurma: "Turma Full", capacidade: 1, nomeMateria: "Full"
    });

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

  it("TEST-INT-TURMA-M9-001 — professor sem papel persistido é negado (M9)", async () => {
    await semearMateria("mat_m9", "M9");
    const wrapped = testEnv.wrap(criarTurma);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(), idMateria: "mat_m9", nomeTurma: "T", ano: 2026, semestre: 1, capacidade: 5
    }, "prof_sem_papel"))).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-TURMA-MAT-001 — idMateria inexistente é not-found", async () => {
    await semearProfessor("prof_mat");
    const wrapped = testEnv.wrap(criarTurma);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(), idMateria: "mat_inexistente", nomeTurma: "T", ano: 2026, semestre: 1, capacidade: 5
    }, "prof_mat"))).rejects.toMatchObject({ code: "not-found" });
  });

  it("TEST-INT-TURMA-NAME-001 — nome_materia vem do documento persistido, não do payload", async () => {
    await semearProfessor("prof_nome");
    await semearMateria("mat_nome", "Química Geral");
    const wrapped = testEnv.wrap(criarTurma);
    const res = await wrapped(mockRequest({
      idOperacao: novaOperacao(), idMateria: "mat_nome", nomeTurma: "Minha Turma",
      ano: 2026, semestre: 1, capacidade: 5, nomeMateria: "Falsa"
    }, "prof_nome"));
    const doc = await db.collection("Turma").doc(res.id).get();
    expect(doc.data()?.nome_materia).toBe("Química Geral");
  });

  it("TEST-INT-TURMA-M7-001 — replay do mesmo idOperacao não duplica a turma", async () => {
    await semearProfessor("prof_replay");
    await semearMateria("mat_replay", "Replay");
    const op = novaOperacao();
    const body = { idOperacao: op, idMateria: "mat_replay", nomeTurma: "Turma Replay", ano: 2026, semestre: 1, capacidade: 5 };
    const wrapped = testEnv.wrap(criarTurma);
    const primeiro = await wrapped(mockRequest(body, "prof_replay"));
    const segundo = await wrapped(mockRequest(body, "prof_replay"));
    expect(segundo).toEqual(primeiro);
    const turmas = await db.collection("Turma").where("id_materia", "==", "mat_replay").get();
    expect(turmas.size).toBe(1);
  });

  it("TEST-INT-TURMA-M7-002 — reuso incompatível do idOperacao é already-exists", async () => {
    await semearProfessor("prof_reuso");
    await semearMateria("mat_reuso", "Reuso");
    const op = novaOperacao();
    const wrapped = testEnv.wrap(criarTurma);
    await wrapped(mockRequest({
      idOperacao: op, idMateria: "mat_reuso", nomeTurma: "A", ano: 2026, semestre: 1, capacidade: 5
    }, "prof_reuso"));
    await expect(wrapped(mockRequest({
      idOperacao: op, idMateria: "mat_reuso", nomeTurma: "B", ano: 2026, semestre: 1, capacidade: 5
    }, "prof_reuso"))).rejects.toMatchObject({ code: "already-exists" });
  });

  it("TEST-INT-TURMA-Q13-001 — professor não cria turma em nome de outro (M9/Q13)", async () => {
    await semearProfessor("prof_q13");
    await semearMateria("mat_q13", "Q13");
    const wrapped = testEnv.wrap(criarTurma);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(), idMateria: "mat_q13", nomeTurma: "T", ano: 2026, semestre: 1,
      capacidade: 5, idProfessor: "outro_prof"
    }, "prof_q13"))).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-TURMA-Q13-002 — Chefe cria em nome de professor ativo e audita", async () => {
    const chefe = "chefe_q13";
    const alvo = "prof_alvo_q13";
    await db.collection("Usuarios").doc(chefe).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Chefe_Geral").doc(chefe).set({ id_usuario: chefe, ativo: true });
    await semearProfessor(alvo);
    await semearMateria("mat_q13b", "Q13B");
    const op = novaOperacao();
    const wrapped = testEnv.wrap(criarTurma);
    const res = await wrapped(mockRequest({
      idOperacao: op, idMateria: "mat_q13b", nomeTurma: "Turma do Alvo", ano: 2026, semestre: 1,
      capacidade: 5, idProfessor: alvo
    }, chefe, ["Chefe_Geral"]));
    const doc = await db.collection("Turma").doc(res.id).get();
    expect(doc.data()?.id_professor).toBe(alvo);
    const audit = await db.collection("Registro_de_Auditoria").doc(`criar_turma_${op}`).get();
    expect(audit.exists).toBe(true);
    expect(audit.data()?.id_usuario).toBe(chefe);
  });

  it("TEST-INT-TURMA-Q13-003 — Chefe sem idProfessor não cria turma para si", async () => {
    const chefe = "chefe_sem_alvo";
    await db.collection("Usuarios").doc(chefe).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Chefe_Geral").doc(chefe).set({ id_usuario: chefe, ativo: true });
    await semearMateria("mat_q13_sem", "Q13 sem alvo");
    const op = novaOperacao();
    const wrapped = testEnv.wrap(criarTurma);
    await expect(wrapped(mockRequest({
      idOperacao: op, idMateria: "mat_q13_sem", nomeTurma: "T", ano: 2026, semestre: 1, capacidade: 5
    }, chefe, ["Chefe_Geral"]))).rejects.toMatchObject({ code: "permission-denied" });

    const turmas = await db.collection("Turma").where("id_materia", "==", "mat_q13_sem").get();
    expect(turmas.size).toBe(0);
    expect((await db.collection("Operacoes").doc(op).get()).exists).toBe(false);
    const chaves = await db.collection("Chaves_Unicas").where("tipo", "==", "Turma").get();
    expect(chaves.docs.some(d => d.data().id_recurso && turmas.docs.some(t => t.id === d.data().id_recurso))).toBe(false);
  });

  it("TEST-INT-TURMA-Q13-004 — Chefe não usa o próprio UID como professor alvo", async () => {
    const chefe = "chefe_self";
    await db.collection("Usuarios").doc(chefe).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Chefe_Geral").doc(chefe).set({ id_usuario: chefe, ativo: true });
    await semearMateria("mat_q13_self", "Q13 self");
    const op = novaOperacao();
    const wrapped = testEnv.wrap(criarTurma);
    await expect(wrapped(mockRequest({
      idOperacao: op, idMateria: "mat_q13_self", nomeTurma: "T", ano: 2026, semestre: 1,
      capacidade: 5, idProfessor: chefe
    }, chefe, ["Chefe_Geral"]))).rejects.toMatchObject({ code: "permission-denied" });
    expect((await db.collection("Turma").where("id_materia", "==", "mat_q13_self").get()).size).toBe(0);
  });

  it("TEST-INT-TURMA-Q13-005 — Chefe com alvo inexistente é negado", async () => {
    const chefe = "chefe_alvo_ausente";
    await db.collection("Usuarios").doc(chefe).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Chefe_Geral").doc(chefe).set({ id_usuario: chefe, ativo: true });
    await semearMateria("mat_q13_ausente", "Q13 ausente");
    const wrapped = testEnv.wrap(criarTurma);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(), idMateria: "mat_q13_ausente", nomeTurma: "T", ano: 2026, semestre: 1,
      capacidade: 5, idProfessor: "nao_existe_prof"
    }, chefe, ["Chefe_Geral"]))).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-TURMA-Q13-006 — Chefe com alvo sem papel Professor é negado", async () => {
    const chefe = "chefe_alvo_sem_papel";
    const alvo = "usuario_sem_professor";
    await db.collection("Usuarios").doc(chefe).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Chefe_Geral").doc(chefe).set({ id_usuario: chefe, ativo: true });
    await db.collection("Usuarios").doc(alvo).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Aluno").doc(alvo).set({ id_usuario: alvo, ativo: true });
    await semearMateria("mat_q13_sem_papel", "Q13 sem papel");
    const wrapped = testEnv.wrap(criarTurma);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(), idMateria: "mat_q13_sem_papel", nomeTurma: "T", ano: 2026, semestre: 1,
      capacidade: 5, idProfessor: alvo
    }, chefe, ["Chefe_Geral"]))).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-TURMA-Q13-007 — Chefe com professor alvo inativo é negado", async () => {
    const chefe = "chefe_alvo_inativo";
    const alvo = "prof_inativo_q13";
    await db.collection("Usuarios").doc(chefe).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Chefe_Geral").doc(chefe).set({ id_usuario: chefe, ativo: true });
    await db.collection("Usuarios").doc(alvo).set({ ativo: false, versao_permissoes: 1 });
    await db.collection("Professor").doc(alvo).set({ id_usuario: alvo, ativo: true });
    await semearMateria("mat_q13_inativo", "Q13 inativo");
    const wrapped = testEnv.wrap(criarTurma);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(), idMateria: "mat_q13_inativo", nomeTurma: "T", ano: 2026, semestre: 1,
      capacidade: 5, idProfessor: alvo
    }, chefe, ["Chefe_Geral"]))).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-TURMA-Q13-008 — Professor alvo com id_usuario inconsistente é negado", async () => {
    const chefe = "chefe_alvo_inconsistente";
    const alvo = "prof_alvo_inconsistente";
    await db.collection("Usuarios").doc(chefe).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Chefe_Geral").doc(chefe).set({ id_usuario: chefe, ativo: true });
    await db.collection("Usuarios").doc(alvo).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Professor").doc(alvo).set({ id_usuario: "outro_uid", ativo: true });
    await semearMateria("mat_q13_incons", "Q13 inconsistente");
    const wrapped = testEnv.wrap(criarTurma);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(), idMateria: "mat_q13_incons", nomeTurma: "T", ano: 2026, semestre: 1,
      capacidade: 5, idProfessor: alvo
    }, chefe, ["Chefe_Geral"]))).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-TURMA-ANO-001 — ano=1 é permitido pelo contrato (inteiro >= 1)", async () => {
    const turma = await criarTurmaOk("prof_ano1", {
      idMateria: "mat_ano1", nomeTurma: "Turma Ano 1", ano: 1, capacidade: 5
    });
    const doc = await db.collection("Turma").doc(turma.id).get();
    expect(doc.data()?.ano).toBe(1);
  });

  it("TEST-INT-TURMA-ANO-002 — ano=0 é rejeitado", async () => {
    await semearProfessor("prof_ano0");
    await semearMateria("mat_ano0", "Ano 0");
    const wrapped = testEnv.wrap(criarTurma);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(), idMateria: "mat_ano0", nomeTurma: "T", ano: 0, semestre: 1, capacidade: 5
    }, "prof_ano0"))).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("TEST-INT-TURMA-ANO-003 — ano=-1 é rejeitado", async () => {
    await semearProfessor("prof_ano_neg");
    await semearMateria("mat_ano_neg", "Ano negativo");
    const wrapped = testEnv.wrap(criarTurma);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(), idMateria: "mat_ano_neg", nomeTurma: "T", ano: -1, semestre: 1, capacidade: 5
    }, "prof_ano_neg"))).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("TEST-INT-TURMA-ANO-004 — ano fracionário é rejeitado", async () => {
    await semearProfessor("prof_ano_frac");
    await semearMateria("mat_ano_frac", "Ano fracionário");
    const wrapped = testEnv.wrap(criarTurma);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(), idMateria: "mat_ano_frac", nomeTurma: "T", ano: 2026.5, semestre: 1, capacidade: 5
    }, "prof_ano_frac"))).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("TEST-INT-TURMA-CAP-001 — capacidade=201 não é limitada por teto inventado", async () => {
    const turma = await criarTurmaOk("prof_cap201", {
      idMateria: "mat_cap201", nomeTurma: "Turma 201", capacidade: 201
    });
    const doc = await db.collection("Turma").doc(turma.id).get();
    expect(doc.data()?.capacidade).toBe(201);
  });

  it("TEST-INT-TURMA-CAP-002 — capacidade=0 é rejeitada", async () => {
    await semearProfessor("prof_cap0");
    await semearMateria("mat_cap0", "Cap 0");
    const wrapped = testEnv.wrap(criarTurma);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(), idMateria: "mat_cap0", nomeTurma: "T", ano: 2026, semestre: 1, capacidade: 0
    }, "prof_cap0"))).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("TEST-INT-TURMA-CAP-003 — capacidade fracionária é rejeitada", async () => {
    await semearProfessor("prof_cap_frac");
    await semearMateria("mat_cap_frac", "Cap fracionária");
    const wrapped = testEnv.wrap(criarTurma);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(), idMateria: "mat_cap_frac", nomeTurma: "T", ano: 2026, semestre: 1, capacidade: 1.5
    }, "prof_cap_frac"))).rejects.toMatchObject({ code: "invalid-argument" });
  });
});
