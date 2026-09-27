process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";
process.env.CONVITE_HMAC_SECRET = "segredo-de-teste-32-bytes-seguro!!";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { criarTurma, ingressarEmTurmaPorCodigo, removerAlunoTurma, alterarStatusTurma, adicionarAlunoExistenteTurma, convidarAluno, aceitarConviteAluno, rejeitarConviteAluno, obterDetalhesConviteAluno } from "../turmas";
import { executarConvidarAluno } from "../convites";
import { chaveTurmaCodigo } from "../chaves";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockRequest = (data: any, uid: string, roles: string[] = ["Professor"], versao_permissoes = 1): any => ({
    data,
    auth: {
      uid,
      token: { roles, versao_permissoes }
    },
    rawRequest: {}
  });

  async function semearChefeGeral(uid: string, ativo = true, versao = 1): Promise<void> {
    await db.collection("Usuarios").doc(uid).set({ ativo, versao_permissoes: versao });
    await db.collection("Chefe_Geral").doc(uid).set({ id_usuario: uid, ativo });
  }

  async function semearBolsista(uid: string): Promise<void> {
    await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Bolsista").doc(uid).set({ id_usuario: uid, ativo: true });
  }

  async function semearGestorAlmoxarifado(uid: string): Promise<void> {
    await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Gestor_Almoxarifado").doc(uid).set({ id_usuario: uid, ativo: true });
  }

  async function semearGestorPatrimonial(uid: string): Promise<void> {
    await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Gestor_Patrimonial").doc(uid).set({ id_usuario: uid, ativo: true });
  }

  let opSeq = 0;
  const novaOperacao = (): string => `op_turma_${Date.now()}_${++opSeq}`;

  async function semearProfessor(uid: string): Promise<void> {
    await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Professor").doc(uid).set({ id_usuario: uid, ativo: true });
  }

  async function semearAluno(uid: string, matricula = `MAT_${uid}`): Promise<void> {
    await db.collection("Usuarios").doc(uid).set({ ativo: true, versao_permissoes: 1 });
    await db.collection("Aluno").doc(uid).set({ id_usuario: uid, ativo: true, numero_matricula: matricula });
  }

  async function ingressar(uid: string, codigoTurma: string): Promise<{ idTurma: string; nomeTurma: string }> {
    await semearAluno(uid);
    const wrapped = testEnv.wrap(ingressarEmTurmaPorCodigo);
    return wrapped(mockRequest({ idOperacao: novaOperacao(), codigoTurma }, uid, ["Aluno"]));
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
    const chave = await db.collection("Chaves_Unicas").doc(chaveTurmaCodigo(result.codigoTurma)).get();
    expect(chave.exists).toBe(true);
    expect(chave.data()?.id_recurso).toBe(result.id);
  });

  it("deve garantir o controle de capacidade da turma impedindo ingresso por código se COUNT(alunos) >= capacidade (RN-TUR-01)", async () => {
    const turma = await criarTurmaOk("prof_c", {
      idMateria: "mat_c", nomeTurma: "Turma Cheia", capacidade: 1, nomeMateria: "Cheia"
    });

    await ingressar("aluno1", turma.codigoTurma);
    await semearAluno("aluno2");

    const wrappedIngressar = testEnv.wrap(ingressarEmTurmaPorCodigo);
    await expect(
      wrappedIngressar(mockRequest({ idOperacao: novaOperacao(), codigoTurma: turma.codigoTurma }, "aluno2", ["Aluno"]))
    ).rejects.toThrow(/A capacidade máxima da turma foi atingida/);
  });

  it("deve garantir que o ingresso de aluno registre o evento no Historico_Alunos_Turma como inclusao_aluno", async () => {
    const turma = await criarTurmaOk("prof_h", {
      idMateria: "mat_h", nomeTurma: "Turma Historico", capacidade: 5, nomeMateria: "Historico"
    });

    await ingressar("aluno_h", turma.codigoTurma);

    const historicoSnap = await db.collection("Turma").doc(turma.id).collection("HistoricoAlunos")
      .where("id_aluno", "==", "aluno_h").get();
    
    expect(historicoSnap.empty).toBe(false);
    expect(historicoSnap.docs[0].data().tipo).toBe("inclusao_aluno");
  });

  it("deve rejeitar tentativa de ingresso se o codigo da turma for inexistente", async () => {
    await semearAluno("aluno_err");
    const wrappedIngressar = testEnv.wrap(ingressarEmTurmaPorCodigo);
    await expect(
      wrappedIngressar(mockRequest({ idOperacao: novaOperacao(), codigoTurma: "INVALD" }, "aluno_err", ["Aluno"]))
    ).rejects.toThrow(/Turma não encontrada/);
  });

  it("deve rejeitar o ingresso por código se a turma estiver com status Arquivada", async () => {
    const turma = await criarTurmaOk("prof_arq", {
      idMateria: "mat_a", nomeTurma: "Turma Arq", capacidade: 5, nomeMateria: "Arq"
    });

    const wrappedArquivar = testEnv.wrap(alterarStatusTurma);
    await wrappedArquivar(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, status: "Arquivada" }, "prof_arq"));

    await semearAluno("aluno_arq");
    const wrappedIngressar = testEnv.wrap(ingressarEmTurmaPorCodigo);
    await expect(
      wrappedIngressar(mockRequest({ idOperacao: novaOperacao(), codigoTurma: turma.codigoTurma }, "aluno_arq", ["Aluno"]))
    ).rejects.toThrow(/turma está arquivada/);
  });

  it("deve registrar o evento de exclusao_aluno no Historico_Alunos_Turma quando professor remover", async () => {
    const turma = await criarTurmaOk("prof_rem", {
      idMateria: "mat_r", nomeTurma: "Turma Rem", capacidade: 5, nomeMateria: "Rem"
    });

    await ingressar("aluno_rem", turma.codigoTurma);

    const wrappedRemover = testEnv.wrap(removerAlunoTurma);
    await wrappedRemover(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, idAluno: "aluno_rem" }, "prof_rem"));

    const historicoSnap = await db.collection("Turma").doc(turma.id).collection("HistoricoAlunos")
      .where("tipo", "==", "exclusao_aluno").get();
    
    expect(historicoSnap.empty).toBe(false);
    expect(historicoSnap.docs[0].data().id_aluno).toBe("aluno_rem");
  });

  it("deve criar um Registro_de_Auditoria do tipo ALUNO sempre que um aluno for removido da sala", async () => {
    const turma = await criarTurmaOk("prof_rem2", {
      idMateria: "mat_r2", nomeTurma: "Turma Rem2", capacidade: 5, nomeMateria: "Rem2"
    });

    await ingressar("aluno_rem2", turma.codigoTurma);

    const wrappedRemover = testEnv.wrap(removerAlunoTurma);
    await wrappedRemover(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, idAluno: "aluno_rem2" }, "prof_rem2"));

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

    const wrappedArquivar = testEnv.wrap(alterarStatusTurma);
    await wrappedArquivar(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, status: "Arquivada" }, "prof_arq2"));

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
    await wrappedAdd(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, idAluno: "aluno_add" }, "prof_add"));

    const matriculaSnap = await db.collection("Turma").doc(turma.id).collection("Alunos").doc("aluno_add").get();
    expect(matriculaSnap.exists).toBe(true);

    const notifSnap = await db.collection("Usuarios").doc("aluno_add").collection("Notificacoes").where("tipo", "==", "ADICIONADO").get();
    expect(notifSnap.empty).toBe(false);
    const notif = notifSnap.docs[0].data();
    expect(notif.id_destinatario).toBe("aluno_add");
    expect(notif.papel_destinatario).toBe("Aluno");
    expect(notif.entidade_alvo).toBe("Turma");
    expect(notif.id_alvo).toBe(turma.id);
    expect(notif.lida).toBe(false);
    expect(notif.lida_em).toBeNull();
    expect(notif.expira_em).toBeNull();
    expect(notif.contem_conteudo_protegido).toBe(false);
  });

  it("deve falhar ao adicionar aluno se a turma ja estiver cheia", async () => {
    const turma = await criarTurmaOk("prof_full", {
      idMateria: "mat_full", nomeTurma: "Turma Full", capacidade: 1, nomeMateria: "Full"
    });

    await db.collection("Aluno").doc("aluno_f1").set({ nome: "A1", email: "a1@ufsc.br" });
    await db.collection("Aluno").doc("aluno_f2").set({ nome: "A2", email: "a2@ufsc.br" });

    const wrappedAdd = testEnv.wrap(adicionarAlunoExistenteTurma);
    await wrappedAdd(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, idAluno: "aluno_f1" }, "prof_full"));

    await expect(wrappedAdd(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, idAluno: "aluno_f2" }, "prof_full"))).rejects.toThrow(/atingiu a capacidade/);
  });

  it("deve criar um convite na colecao Convite_Aluno com validade ao usar convidarAluno", async () => {
    await semearProfessor("prof_c1");
    await semearMateria("mat_c1", "Química");
    const turma = await criarTurmaOk("prof_c1", { idMateria: "mat_c1", nomeTurma: "Turma C1", capacidade: 10 });

    const wrappedConvidar = testEnv.wrap(convidarAluno);
    const op1 = novaOperacao();
    const reqConvidar = mockRequest({ idOperacao: op1, email: "convite@ufsc.br", idTurma: turma.id, matricula: "123" }, "prof_c1");
    
    const result = await wrappedConvidar(reqConvidar);
    expect(result.registrado).toBe(true);
    expect(result.reenvio).toBe(false);
    
    const conviteDoc = await db.collection("Convite_Aluno").doc(result.id).get();
    expect(conviteDoc.exists).toBe(true);
    expect(conviteDoc.data()?.email).toBe("convite@ufsc.br");
    expect(conviteDoc.data()?.status).toBe("pendente");
    expect(conviteDoc.data()?.token_hash).toBeDefined();

    // Replay M7 da mesma operação
    const replay = await wrappedConvidar(reqConvidar);
    expect(replay.id).toBe(result.id);

    // Nova operação para o mesmo e-mail e turma funciona como reenvio canônico
    const op2 = novaOperacao();
    const reqReenvio = mockRequest({ idOperacao: op2, email: "convite@ufsc.br", idTurma: turma.id }, "prof_c1");
    const resultReenvio = await wrappedConvidar(reqReenvio);
    expect(resultReenvio.id).toBe(result.id);
    expect(resultReenvio.reenvio).toBe(true);
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

  it("TEST-INT-TURMA-ARQ-001 — arquivar incrementa versao, preserva dados e notifica membros", async () => {
    const turma = await criarTurmaOk("prof_arq3", {
      idMateria: "mat_arq3", nomeTurma: "Turma Arq3", capacidade: 5, nomeMateria: "Arq3"
    });
    await ingressar("aluno_arq3", turma.codigoTurma);

    const antes = (await db.collection("Turma").doc(turma.id).get()).data()!;
    const wrapped = testEnv.wrap(alterarStatusTurma);
    await wrapped(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, status: "Arquivada" }, "prof_arq3"));

    const depois = (await db.collection("Turma").doc(turma.id).get()).data()!;
    expect(depois.status).toBe("Arquivada");
    expect(depois.versao).toBe((antes.versao ?? 0) + 1);
    expect(depois.codigo_turma).toBe(antes.codigo_turma);
    expect(depois.qtd_alunos).toBe(antes.qtd_alunos);
    expect((await db.collection("Turma").doc(turma.id).collection("Alunos").doc("aluno_arq3").get()).exists).toBe(true);

    const notif = await db.collection("Usuarios").doc("aluno_arq3").collection("Notificacoes")
      .where("tipo", "==", "TURMA_ARQUIVADA").get();
    expect(notif.empty).toBe(false);
    expect(notif.docs[0].data().entidade_alvo).toBe("Turma");
    expect(notif.docs[0].data().id_turma).toBe(turma.id);

    const mirror = await db.collection("Usuarios").doc("aluno_arq3").collection("Turmas").doc(turma.id).get();
    expect(mirror.data()?.status).toBe("Arquivada");
  });

  it("TEST-INT-TURMA-ARQ-002 — desarquivar volta a Ativo, incrementa versao e notifica", async () => {
    const turma = await criarTurmaOk("prof_arq4", {
      idMateria: "mat_arq4", nomeTurma: "Turma Arq4", capacidade: 5, nomeMateria: "Arq4"
    });
    await ingressar("aluno_arq4", turma.codigoTurma);
    const wrapped = testEnv.wrap(alterarStatusTurma);
    await wrapped(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, status: "Arquivada" }, "prof_arq4"));
    const versaoArquivada = (await db.collection("Turma").doc(turma.id).get()).data()!.versao;

    await wrapped(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, status: "Ativo" }, "prof_arq4"));

    const depois = (await db.collection("Turma").doc(turma.id).get()).data()!;
    expect(depois.status).toBe("Ativo");
    expect(depois.versao).toBe(versaoArquivada + 1);
    const notif = await db.collection("Usuarios").doc("aluno_arq4").collection("Notificacoes")
      .where("tipo", "==", "TURMA_DESARQUIVADA").get();
    expect(notif.empty).toBe(false);
    const mirror = await db.collection("Usuarios").doc("aluno_arq4").collection("Turmas").doc(turma.id).get();
    expect(mirror.data()?.status).toBe("Ativo");
  });

  it("TEST-INT-TURMA-ARQ-003 — professor não dono não altera status", async () => {
    const turma = await criarTurmaOk("prof_dono4", {
      idMateria: "mat_arq5", nomeTurma: "Turma Arq5", capacidade: 5, nomeMateria: "Arq5"
    });
    await semearProfessor("prof_outro4");
    const wrapped = testEnv.wrap(alterarStatusTurma);
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(), idTurma: turma.id, status: "Arquivada"
    }, "prof_outro4"))).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-TURMA-ARQ-004 — arquivar turma já arquivada é failed-precondition", async () => {
    const turma = await criarTurmaOk("prof_arq5", {
      idMateria: "mat_arq6", nomeTurma: "Turma Arq6", capacidade: 5, nomeMateria: "Arq6"
    });
    const wrapped = testEnv.wrap(alterarStatusTurma);
    await wrapped(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, status: "Arquivada" }, "prof_arq5"));
    await expect(wrapped(mockRequest({
      idOperacao: novaOperacao(), idTurma: turma.id, status: "Arquivada"
    }, "prof_arq5"))).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-TURMA-ARQ-005 — replay do mesmo idOperacao não duplica notificação nem versão", async () => {
    const turma = await criarTurmaOk("prof_arq6", {
      idMateria: "mat_arq7", nomeTurma: "Turma Arq7", capacidade: 5, nomeMateria: "Arq7"
    });
    await ingressar("aluno_arq7", turma.codigoTurma);
    const op = novaOperacao();
    const body = { idOperacao: op, idTurma: turma.id, status: "Arquivada" };
    const wrapped = testEnv.wrap(alterarStatusTurma);
    await wrapped(mockRequest(body, "prof_arq6"));
    const versao1 = (await db.collection("Turma").doc(turma.id).get()).data()!.versao;
    await wrapped(mockRequest(body, "prof_arq6"));
    const versao2 = (await db.collection("Turma").doc(turma.id).get()).data()!.versao;
    expect(versao2).toBe(versao1);
    const notif = await db.collection("Usuarios").doc("aluno_arq7").collection("Notificacoes")
      .where("tipo", "==", "TURMA_ARQUIVADA").get();
    expect(notif.size).toBe(1);
  });

  it("TEST-INT-TURMA-ING-001 — ingresso sem papel persistido é negado (M9)", async () => {
    const turma = await criarTurmaOk("prof_ing1", {
      idMateria: "mat_ing1", nomeTurma: "Turma Ing1", capacidade: 5, nomeMateria: "Ing1"
    });
    const wrapped = testEnv.wrap(ingressarEmTurmaPorCodigo);
    await expect(
      wrapped(mockRequest({ idOperacao: novaOperacao(), codigoTurma: turma.codigoTurma }, "aluno_sem_papel", ["Aluno"]))
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-TURMA-ING-002 — replay do mesmo idOperacao não duplica matrícula nem contador", async () => {
    const turma = await criarTurmaOk("prof_ing2", {
      idMateria: "mat_ing2", nomeTurma: "Turma Ing2", capacidade: 5, nomeMateria: "Ing2"
    });
    await semearAluno("aluno_ing2");
    const op = novaOperacao();
    const body = { idOperacao: op, codigoTurma: turma.codigoTurma };
    const wrapped = testEnv.wrap(ingressarEmTurmaPorCodigo);
    const primeiro = await wrapped(mockRequest(body, "aluno_ing2", ["Aluno"]));
    const segundo = await wrapped(mockRequest(body, "aluno_ing2", ["Aluno"]));
    expect(segundo).toEqual(primeiro);

    const alunos = await db.collection("Turma").doc(turma.id).collection("Alunos").get();
    expect(alunos.size).toBe(1);
    const doc = await db.collection("Turma").doc(turma.id).get();
    expect(doc.data()?.qtd_alunos).toBe(1);
    const hist = await db.collection("Turma").doc(turma.id).collection("HistoricoAlunos")
      .where("id_aluno", "==", "aluno_ing2").get();
    expect(hist.size).toBe(1);
  });

  it("TEST-INT-TURMA-ING-003 — código acima de 20 caracteres é invalid-argument", async () => {
    await semearAluno("aluno_ing3");
    const wrapped = testEnv.wrap(ingressarEmTurmaPorCodigo);
    await expect(
      wrapped(mockRequest({ idOperacao: novaOperacao(), codigoTurma: "X".repeat(21) }, "aluno_ing3", ["Aluno"]))
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("TEST-INT-TURMA-ING-004 — aluno removido não retorna pelo código", async () => {
    const turma = await criarTurmaOk("prof_ing4", {
      idMateria: "mat_ing4", nomeTurma: "Turma Ing4", capacidade: 5, nomeMateria: "Ing4"
    });
    await ingressar("aluno_ing4", turma.codigoTurma);
    await testEnv.wrap(removerAlunoTurma)(
      mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, idAluno: "aluno_ing4" }, "prof_ing4")
    );
    const wrapped = testEnv.wrap(ingressarEmTurmaPorCodigo);
    await expect(
      wrapped(mockRequest({ idOperacao: novaOperacao(), codigoTurma: turma.codigoTurma }, "aluno_ing4", ["Aluno"]))
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-TURMA-ADM-001 — inclusão sem papel persistido é negada (M9)", async () => {
    const turma = await criarTurmaOk("prof_adm1", {
      idMateria: "mat_adm1", nomeTurma: "Turma Adm1", capacidade: 5, nomeMateria: "Adm1"
    });
    await db.collection("Aluno").doc("aluno_adm1").set({ nome: "A", email: "a@x", numero_matricula: "1" });
    const wrapped = testEnv.wrap(adicionarAlunoExistenteTurma);
    await expect(
      wrapped(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, idAluno: "aluno_adm1" }, "sem_papel_adm"))
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-TURMA-ADM-002 — replay da inclusão não duplica matrícula/notificação/contador", async () => {
    const turma = await criarTurmaOk("prof_adm2", {
      idMateria: "mat_adm2", nomeTurma: "Turma Adm2", capacidade: 5, nomeMateria: "Adm2"
    });
    await db.collection("Aluno").doc("aluno_adm2").set({ nome: "B", email: "b@x", numero_matricula: "2" });
    const op = novaOperacao();
    const body = { idOperacao: op, idTurma: turma.id, idAluno: "aluno_adm2" };
    const wrapped = testEnv.wrap(adicionarAlunoExistenteTurma);
    const primeiro = await wrapped(mockRequest(body, "prof_adm2"));
    const segundo = await wrapped(mockRequest(body, "prof_adm2"));
    expect(segundo).toEqual(primeiro);

    const alunos = await db.collection("Turma").doc(turma.id).collection("Alunos").get();
    expect(alunos.size).toBe(1);
    expect((await db.collection("Turma").doc(turma.id).get()).data()?.qtd_alunos).toBe(1);
    const notif = await db.collection("Usuarios").doc("aluno_adm2").collection("Notificacoes")
      .where("tipo", "==", "ADICIONADO").get();
    expect(notif.size).toBe(1);
  });

  it("TEST-INT-TURMA-ADM-003 — professor não dono não inclui aluno", async () => {
    const turma = await criarTurmaOk("prof_adm3", {
      idMateria: "mat_adm3", nomeTurma: "Turma Adm3", capacidade: 5, nomeMateria: "Adm3"
    });
    await db.collection("Aluno").doc("aluno_adm3").set({ nome: "C", email: "c@x", numero_matricula: "3" });
    await semearProfessor("prof_outro_adm3");
    const wrapped = testEnv.wrap(adicionarAlunoExistenteTurma);
    await expect(
      wrapped(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, idAluno: "aluno_adm3" }, "prof_outro_adm3"))
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("TEST-INT-TURMA-ADM-004 — replay da remoção não decrementa o contador duas vezes", async () => {
    const turma = await criarTurmaOk("prof_adm4", {
      idMateria: "mat_adm4", nomeTurma: "Turma Adm4", capacidade: 5, nomeMateria: "Adm4"
    });
    await ingressar("aluno_adm4", turma.codigoTurma);
    const op = novaOperacao();
    const body = { idOperacao: op, idTurma: turma.id, idAluno: "aluno_adm4" };
    const wrapped = testEnv.wrap(removerAlunoTurma);
    await wrapped(mockRequest(body, "prof_adm4"));
    const primeiro = (await db.collection("Turma").doc(turma.id).get()).data()?.qtd_alunos;
    await wrapped(mockRequest(body, "prof_adm4"));
    const segundo = (await db.collection("Turma").doc(turma.id).get()).data()?.qtd_alunos;
    expect(primeiro).toBe(0);
    expect(segundo).toBe(0);
  });

  it("TEST-INT-TURMA-ADM-005 — remover aluno não matriculado é not-found", async () => {
    const turma = await criarTurmaOk("prof_adm5", {
      idMateria: "mat_adm5", nomeTurma: "Turma Adm5", capacidade: 5, nomeMateria: "Adm5"
    });
    const wrapped = testEnv.wrap(removerAlunoTurma);
    await expect(
      wrapped(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, idAluno: "aluno_ausente" }, "prof_adm5"))
    ).rejects.toMatchObject({ code: "not-found" });
  });

  it("TEST-INT-TURMA-ING-005 — aluno já matriculado em turma cheia recebe acesso sem duplicar", async () => {
    const turma = await criarTurmaOk("prof_ing5", {
      idMateria: "mat_ing5", nomeTurma: "Turma Ing5", capacidade: 1, nomeMateria: "Ing5"
    });
    await ingressar("aluno_ing5", turma.codigoTurma);

    const wrapped = testEnv.wrap(ingressarEmTurmaPorCodigo);
    const res = await wrapped(
      mockRequest({ idOperacao: novaOperacao(), codigoTurma: turma.codigoTurma }, "aluno_ing5", ["Aluno"])
    );

    expect(res.idTurma).toBe(turma.id);
    expect((await db.collection("Turma").doc(turma.id).get()).data()?.qtd_alunos).toBe(1);
    expect((await db.collection("Turma").doc(turma.id).collection("Alunos").get()).size).toBe(1);
    const hist = await db.collection("Turma").doc(turma.id).collection("HistoricoAlunos")
      .where("id_aluno", "==", "aluno_ing5").get();
    expect(hist.size).toBe(1);
  });

  it("TEST-INT-TURMA-ING-006 — shape canônico do vínculo, espelho e histórico (CODIGO)", async () => {
    const turma = await criarTurmaOk("prof_ing6", {
      idMateria: "mat_ing6", nomeTurma: "Turma Ing6", capacidade: 5, nomeMateria: "Ing6"
    });
    await ingressar("aluno_ing6", turma.codigoTurma);

    const vinculo = (await db.collection("Turma").doc(turma.id).collection("Alunos").doc("aluno_ing6").get()).data()!;
    expect(vinculo.id_aluno).toBe("aluno_ing6");
    expect(vinculo.id_turma).toBe(turma.id);
    expect(vinculo.ingressou_em).toBeDefined();
    expect(vinculo.email).toBeUndefined();
    expect(vinculo.numero_matricula).toBeUndefined();

    const espelho = (await db.collection("Usuarios").doc("aluno_ing6").collection("Turmas").doc(turma.id).get()).data()!;
    expect(espelho.id_materia).toBe("mat_ing6");
    expect(espelho.id_professor).toBe("prof_ing6");
    expect(espelho.status).toBe("Ativo");

    const evento = (await db.collection("Turma").doc(turma.id).collection("HistoricoAlunos")
      .where("id_aluno", "==", "aluno_ing6").get()).docs[0].data();
    expect(evento.id_turma).toBe(turma.id);
    expect(evento.tipo).toBe("inclusao_aluno");
    expect(evento.modo_ingresso).toBe("CODIGO");
    expect(evento.justificativa).toBeNull();
    expect(evento.removido_por).toBeNull();
  });

  it("TEST-INT-TURMA-ING-007 — contador persistido inválido falha fechado", async () => {
    const turma = await criarTurmaOk("prof_ing7", {
      idMateria: "mat_ing7", nomeTurma: "Turma Ing7", capacidade: 5, nomeMateria: "Ing7"
    });
    await db.collection("Turma").doc(turma.id).update({ qtd_alunos: "invalido" });
    await semearAluno("aluno_ing7");
    const wrapped = testEnv.wrap(ingressarEmTurmaPorCodigo);
    await expect(
      wrapped(mockRequest({ idOperacao: novaOperacao(), codigoTurma: turma.codigoTurma }, "aluno_ing7", ["Aluno"]))
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-TURMA-ING-008 — nome vem de Usuarios e o vínculo não tem e-mail/matrícula", async () => {
    const turma = await criarTurmaOk("prof_ing8", {
      idMateria: "mat_ing8", nomeTurma: "Turma Ing8", capacidade: 5, nomeMateria: "Ing8"
    });
    await db.collection("Usuarios").doc("aluno_ing8").set({ ativo: true, versao_permissoes: 1, nome: "Nome Real" });
    await db.collection("Aluno").doc("aluno_ing8").set({
      id_usuario: "aluno_ing8", ativo: true, nome: "Papel", email: "p@x", numero_matricula: "999"
    });
    const wrapped = testEnv.wrap(ingressarEmTurmaPorCodigo);
    await wrapped(mockRequest({ idOperacao: novaOperacao(), codigoTurma: turma.codigoTurma }, "aluno_ing8", ["Aluno"]));

    const vinculo = (await db.collection("Turma").doc(turma.id).collection("Alunos").doc("aluno_ing8").get()).data()!;
    expect(vinculo.nome).toBe("Nome Real");
    expect(vinculo.email).toBeUndefined();
    expect(vinculo.numero_matricula).toBeUndefined();
  });

  it("TEST-INT-TURMA-ADM-006 — shape canônico da inclusão pelo professor", async () => {
    const turma = await criarTurmaOk("prof_adm6", {
      idMateria: "mat_adm6", nomeTurma: "Turma Adm6", capacidade: 5, nomeMateria: "Adm6"
    });
    await db.collection("Aluno").doc("aluno_adm6").set({ id_usuario: "aluno_adm6", numero_matricula: "1" });
    await db.collection("Usuarios").doc("aluno_adm6").set({ ativo: true, versao_permissoes: 1, nome: "Aluno Seis" });
    const wrapped = testEnv.wrap(adicionarAlunoExistenteTurma);
    await wrapped(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, idAluno: "aluno_adm6" }, "prof_adm6"));

    const vinculo = (await db.collection("Turma").doc(turma.id).collection("Alunos").doc("aluno_adm6").get()).data()!;
    expect(vinculo.id_turma).toBe(turma.id);
    expect(vinculo.nome).toBe("Aluno Seis");
    expect(vinculo.email).toBeUndefined();
    expect(vinculo.numero_matricula).toBeUndefined();

    const espelho = (await db.collection("Usuarios").doc("aluno_adm6").collection("Turmas").doc(turma.id).get()).data()!;
    expect(espelho.id_materia).toBe("mat_adm6");

    const evento = (await db.collection("Turma").doc(turma.id).collection("HistoricoAlunos")
      .where("id_aluno", "==", "aluno_adm6").get()).docs[0].data();
    expect(evento.id_turma).toBe(turma.id);
    expect(evento.modo_ingresso).toBe("CONVITE");
    expect(evento.justificativa).toBeNull();
    expect(evento.removido_por).toBeNull();
  });

  it("TEST-INT-TURMA-ADM-007 — evento de exclusão tem id_turma e não inventa modo", async () => {
    const turma = await criarTurmaOk("prof_adm7", {
      idMateria: "mat_adm7", nomeTurma: "Turma Adm7", capacidade: 5, nomeMateria: "Adm7"
    });
    await ingressar("aluno_adm7", turma.codigoTurma);
    await testEnv.wrap(removerAlunoTurma)(
      mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, idAluno: "aluno_adm7" }, "prof_adm7")
    );
    const evento = (await db.collection("Turma").doc(turma.id).collection("HistoricoAlunos")
      .where("tipo", "==", "exclusao_aluno").get()).docs[0].data();
    expect(evento.id_turma).toBe(turma.id);
    expect(evento.modo_ingresso).toBeNull();
    expect(evento.justificativa).toBeNull();
    expect(evento.removido_por).toBe("prof_adm7");
  });

  // ── Testes fail-closed M11 (vínculo canônico e contador de remoção) ──────

  it("TEST-INT-TURMA-M11-FC-001 — membro com id_aluno divergente do docId → fail-closed", async () => {
    const turma = await criarTurmaOk("prof_fc1", {
      idMateria: "mat_fc1", nomeTurma: "Turma FC1", capacidade: 5, nomeMateria: "FC1"
    });
    await semearAluno("aluno_fc1");
    // Grava vínculo com id_aluno divergente do docId
    await db.collection("Turma").doc(turma.id).collection("Alunos").doc("aluno_fc1").set({
      id_aluno: "outro_uid", // errado
      id_turma: turma.id,
      ingressou_em: new Date(),
    });
    const wrapped = testEnv.wrap(ingressarEmTurmaPorCodigo);
    await expect(
      wrapped(mockRequest({ idOperacao: novaOperacao(), codigoTurma: turma.codigoTurma }, "aluno_fc1", ["Aluno"]))
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-TURMA-M11-FC-002 — membro com id_turma divergente do path → fail-closed", async () => {
    const turma = await criarTurmaOk("prof_fc2", {
      idMateria: "mat_fc2", nomeTurma: "Turma FC2", capacidade: 5, nomeMateria: "FC2"
    });
    await semearAluno("aluno_fc2");
    await db.collection("Turma").doc(turma.id).collection("Alunos").doc("aluno_fc2").set({
      id_aluno: "aluno_fc2",
      id_turma: "outra_turma_id", // errado
      ingressou_em: new Date(),
    });
    const wrapped = testEnv.wrap(ingressarEmTurmaPorCodigo);
    await expect(
      wrapped(mockRequest({ idOperacao: novaOperacao(), codigoTurma: turma.codigoTurma }, "aluno_fc2", ["Aluno"]))
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-TURMA-M11-FC-003 — membro sem ingressou_em → fail-closed", async () => {
    const turma = await criarTurmaOk("prof_fc3", {
      idMateria: "mat_fc3", nomeTurma: "Turma FC3", capacidade: 5, nomeMateria: "FC3"
    });
    await semearAluno("aluno_fc3");
    await db.collection("Turma").doc(turma.id).collection("Alunos").doc("aluno_fc3").set({
      id_aluno: "aluno_fc3",
      id_turma: turma.id,
      // ingressou_em ausente
    });
    const wrapped = testEnv.wrap(ingressarEmTurmaPorCodigo);
    await expect(
      wrapped(mockRequest({ idOperacao: novaOperacao(), codigoTurma: turma.codigoTurma }, "aluno_fc3", ["Aluno"]))
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-TURMA-M11-FC-004 — turma com status desconhecido + vínculo existente → fail-closed", async () => {
    const turma = await criarTurmaOk("prof_fc4", {
      idMateria: "mat_fc4", nomeTurma: "Turma FC4", capacidade: 5, nomeMateria: "FC4"
    });
    await semearAluno("aluno_fc4");
    await db.collection("Turma").doc(turma.id).collection("Alunos").doc("aluno_fc4").set({
      id_aluno: "aluno_fc4",
      id_turma: turma.id,
      ingressou_em: new Date(),
    });
    // Forçar status inválido
    await db.collection("Turma").doc(turma.id).update({ status: "StatusInvalido" });
    const wrapped = testEnv.wrap(ingressarEmTurmaPorCodigo);
    await expect(
      wrapped(mockRequest({ idOperacao: novaOperacao(), codigoTurma: turma.codigoTurma }, "aluno_fc4", ["Aluno"]))
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-TURMA-M11-FC-005 — membro correto em turma cheia → sucesso sem incremento", async () => {
    const turma = await criarTurmaOk("prof_fc5", {
      idMateria: "mat_fc5", nomeTurma: "Turma FC5", capacidade: 1, nomeMateria: "FC5"
    });
    await ingressar("aluno_fc5", turma.codigoTurma);
    const qtdAntes = (await db.collection("Turma").doc(turma.id).get()).data()?.qtd_alunos;

    const wrapped = testEnv.wrap(ingressarEmTurmaPorCodigo);
    const res = await wrapped(
      mockRequest({ idOperacao: novaOperacao(), codigoTurma: turma.codigoTurma }, "aluno_fc5", ["Aluno"])
    );

    expect(res.idTurma).toBe(turma.id);
    const qtdDepois = (await db.collection("Turma").doc(turma.id).get()).data()?.qtd_alunos;
    expect(qtdDepois).toBe(qtdAntes);
  });

  it("TEST-INT-TURMA-M11-FC-006 — remoção com qtd_alunos=0 → fail-closed, vínculo permanece", async () => {
    const turma = await criarTurmaOk("prof_fc6", {
      idMateria: "mat_fc6", nomeTurma: "Turma FC6", capacidade: 5, nomeMateria: "FC6"
    });
    await ingressar("aluno_fc6", turma.codigoTurma);
    // Forçar contador corrompido
    await db.collection("Turma").doc(turma.id).update({ qtd_alunos: 0 });
    const wrapped = testEnv.wrap(removerAlunoTurma);
    await expect(
      wrapped(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, idAluno: "aluno_fc6" }, "prof_fc6"))
    ).rejects.toMatchObject({ code: "failed-precondition" });
    // Vínculo deve permanecer
    const vinculo = await db.collection("Turma").doc(turma.id).collection("Alunos").doc("aluno_fc6").get();
    expect(vinculo.exists).toBe(true);
  });

  it("TEST-INT-TURMA-M11-FC-007 — remoção com qtd_alunos ausente → fail-closed", async () => {
    const turma = await criarTurmaOk("prof_fc7", {
      idMateria: "mat_fc7", nomeTurma: "Turma FC7", capacidade: 5, nomeMateria: "FC7"
    });
    await ingressar("aluno_fc7", turma.codigoTurma);
    // Remover o campo contador
    await db.collection("Turma").doc(turma.id).update({
      qtd_alunos: admin.firestore.FieldValue.delete()
    });
    const wrapped = testEnv.wrap(removerAlunoTurma);
    await expect(
      wrapped(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, idAluno: "aluno_fc7" }, "prof_fc7"))
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-TURMA-M11-FC-008 — remoção com qtd_alunos string → fail-closed", async () => {
    const turma = await criarTurmaOk("prof_fc8", {
      idMateria: "mat_fc8", nomeTurma: "Turma FC8", capacidade: 5, nomeMateria: "FC8"
    });
    await ingressar("aluno_fc8", turma.codigoTurma);
    await db.collection("Turma").doc(turma.id).update({ qtd_alunos: "invalido" });
    const wrapped = testEnv.wrap(removerAlunoTurma);
    await expect(
      wrapped(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, idAluno: "aluno_fc8" }, "prof_fc8"))
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-TURMA-M11-FC-009 — remoção com qtd fracionário → fail-closed", async () => {
    const turma = await criarTurmaOk("prof_fc9", {
      idMateria: "mat_fc9", nomeTurma: "Turma FC9", capacidade: 5, nomeMateria: "FC9"
    });
    await ingressar("aluno_fc9", turma.codigoTurma);
    await db.collection("Turma").doc(turma.id).update({ qtd_alunos: 1.5 });
    const wrapped = testEnv.wrap(removerAlunoTurma);
    await expect(
      wrapped(mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, idAluno: "aluno_fc9" }, "prof_fc9"))
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("TEST-INT-TURMA-M11-FC-010 — remoção + qtd=1 → remove e qtd=0", async () => {
    const turma = await criarTurmaOk("prof_fc10", {
      idMateria: "mat_fc10", nomeTurma: "Turma FC10", capacidade: 5, nomeMateria: "FC10"
    });
    await ingressar("aluno_fc10", turma.codigoTurma);
    expect((await db.collection("Turma").doc(turma.id).get()).data()?.qtd_alunos).toBe(1);
    await testEnv.wrap(removerAlunoTurma)(
      mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, idAluno: "aluno_fc10" }, "prof_fc10")
    );
    expect((await db.collection("Turma").doc(turma.id).get()).data()?.qtd_alunos).toBe(0);
  });

  it("TEST-INT-TURMA-M11-FC-011 — remoção + qtd=2 → qtd=1", async () => {
    const turma = await criarTurmaOk("prof_fc11", {
      idMateria: "mat_fc11", nomeTurma: "Turma FC11", capacidade: 5, nomeMateria: "FC11"
    });
    await ingressar("aluno_fc11a", turma.codigoTurma);
    await ingressar("aluno_fc11b", turma.codigoTurma);
    expect((await db.collection("Turma").doc(turma.id).get()).data()?.qtd_alunos).toBe(2);
    await testEnv.wrap(removerAlunoTurma)(
      mockRequest({ idOperacao: novaOperacao(), idTurma: turma.id, idAluno: "aluno_fc11a" }, "prof_fc11")
    );
    expect((await db.collection("Turma").doc(turma.id).get()).data()?.qtd_alunos).toBe(1);
  });

  describe("Reconciliação M9, M11 e M13 — Canais de Convite, Rejeição e Autoridade do Chefe Geral", () => {
    let profTurmaId: string;
    const profId = "prof_autoridade_m9";
    const chefeId = "chefe_autoridade_m9";

    beforeAll(async () => {
      await semearProfessor(profId);
      await semearChefeGeral(chefeId);
      await semearMateria("mat_convites", "Laboratório Reconciliado");
      const t = await criarTurmaOk(profId, {
        idMateria: "mat_convites",
        nomeTurma: "Turma Convites M9-M11-M13",
        capacidade: 20,
        ano: 2026,
        semestre: 1,
      });
      profTurmaId = t.id;
    });

    it("TEST-INT-CONV-M9-001 — Professor dono convida para própria turma Ativo -> PASS", async () => {
      const wrapped = testEnv.wrap(convidarAluno);
      const email = `aluno_dono_${Date.now()}@ufsc.br`;
      const res = await wrapped(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: profTurmaId,
        email,
      }, profId, ["Professor"]));

      expect(res.registrado).toBe(true);
      expect(res.id).toBeDefined();

      const conviteDoc = await db.collection("Convite_Aluno").doc(res.id).get();
      expect(conviteDoc.exists).toBe(true);
      expect(conviteDoc.data()?.convidado_por).toBe(profId);
      expect(conviteDoc.data()?.status).toBe("pendente");
    });

    it("TEST-INT-CONV-M9-002 — Professor terceiro convida para turma de outro professor -> DENY", async () => {
      await semearProfessor("prof_terceiro");
      const wrapped = testEnv.wrap(convidarAluno);
      const email = `aluno_terceiro_${Date.now()}@ufsc.br`;
      await expect(wrapped(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: profTurmaId,
        email,
      }, "prof_terceiro", ["Professor"]))).rejects.toMatchObject({ code: "permission-denied" });
    });

    it("TEST-INT-CONV-M9-003 — Chefe_Geral convida para turma de Professor -> PASS ordinário sem alterar ownership", async () => {
      const wrapped = testEnv.wrap(convidarAluno);
      const email = `aluno_chefe_ord_${Date.now()}@ufsc.br`;
      const res = await wrapped(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: profTurmaId,
        email,
        excederCapacidade: false,
      }, chefeId, ["Chefe_Geral"]));

      expect(res.registrado).toBe(true);
      const conviteDoc = await db.collection("Convite_Aluno").doc(res.id).get();
      expect(conviteDoc.data()?.convidado_por).toBe(chefeId); // Chefe registrou

      // Verificar que a turma não mudou de dono
      const turmaDoc = await db.collection("Turma").doc(profTurmaId).get();
      expect(turmaDoc.data()?.id_professor).toBe(profId);
    });

    it("TEST-INT-CONV-M9-004 — Chefe_Geral convida para turma Arquivada -> DENY", async () => {
      await semearProfessor("prof_arq");
      await semearMateria("mat_arq", "Materia Arq");
      const turmaArq = await criarTurmaOk("prof_arq", {
        idMateria: "mat_arq",
        nomeTurma: "Turma Arquivada",
        capacidade: 5,
      });
      await testEnv.wrap(alterarStatusTurma)(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: turmaArq.id,
        status: "Arquivada",
      }, "prof_arq", ["Professor"]));

      const wrapped = testEnv.wrap(convidarAluno);
      await expect(wrapped(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: turmaArq.id,
        email: `aluno_arq_${Date.now()}@ufsc.br`,
      }, chefeId, ["Chefe_Geral"]))).rejects.toMatchObject({ code: "failed-precondition" });
    });

    it("TEST-INT-CONV-M9-005 — Chefe_Geral com excederCapacidade=true -> DENY", async () => {
      const wrapped = testEnv.wrap(convidarAluno);
      await expect(wrapped(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: profTurmaId,
        email: `aluno_exceder_${Date.now()}@ufsc.br`,
        excederCapacidade: true,
        justificativaExcecao: "Justificativa de teste do chefe",
      }, chefeId, ["Chefe_Geral"]))).rejects.toMatchObject({ code: "permission-denied" });
    });

    it("TEST-INT-CONV-M9-006 — Chefe não consegue usar operação genérica de Professor (ex: criar turma para si)", async () => {
      const wrappedCriar = testEnv.wrap(criarTurma);
      await expect(wrappedCriar(mockRequest({
        idOperacao: novaOperacao(),
        idMateria: "mat_convites",
        nomeTurma: "Turma Chefe Proibida",
        ano: 2026,
        semestre: 1,
        capacidade: 10,
      }, chefeId, ["Chefe_Geral"]))).rejects.toMatchObject({ code: "permission-denied" });
    });

    it("TEST-INT-CONV-M9-007 — Aluno, Bolsista, Gestores não podem convidar", async () => {
      await semearAluno("aluno_tentativa");
      await semearBolsista("bolsista_tentativa");
      await semearGestorAlmoxarifado("almox_tentativa");
      await semearGestorPatrimonial("patrimonio_tentativa");

      const wrapped = testEnv.wrap(convidarAluno);
      const email = `aluno_bloqueado_${Date.now()}@ufsc.br`;

      await expect(wrapped(mockRequest({
        idOperacao: novaOperacao(), idTurma: profTurmaId, email
      }, "aluno_tentativa", ["Aluno"]))).rejects.toMatchObject({ code: "permission-denied" });

      await expect(wrapped(mockRequest({
        idOperacao: novaOperacao(), idTurma: profTurmaId, email
      }, "bolsista_tentativa", ["Bolsista"]))).rejects.toMatchObject({ code: "permission-denied" });

      await expect(wrapped(mockRequest({
        idOperacao: novaOperacao(), idTurma: profTurmaId, email
      }, "almox_tentativa", ["Gestor_Almoxarifado"]))).rejects.toMatchObject({ code: "permission-denied" });

      await expect(wrapped(mockRequest({
        idOperacao: novaOperacao(), idTurma: profTurmaId, email
      }, "patrimonio_tentativa", ["Gestor_Patrimonial"]))).rejects.toMatchObject({ code: "permission-denied" });
    });

    it("TEST-INT-CONV-M9-008 — Chefe revogado/inativo -> DENY", async () => {
      await semearChefeGeral("chefe_inativo", false, 1);
      const wrapped = testEnv.wrap(convidarAluno);
      await expect(wrapped(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: profTurmaId,
        email: `aluno_rev_${Date.now()}@ufsc.br`,
      }, "chefe_inativo", ["Chefe_Geral"]))).rejects.toMatchObject({ code: "permission-denied" });
    });

    it("TEST-INT-CONV-M9-009 — Claim antiga de Chefe após revogação de versão -> DENY", async () => {
      await semearChefeGeral("chefe_versao_antiga", true, 2); // Banco tem versão 2
      const wrapped = testEnv.wrap(convidarAluno);
      // Token tem versão 1 (obsoleta)
      await expect(wrapped(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: profTurmaId,
        email: `aluno_obsoleto_${Date.now()}@ufsc.br`,
      }, "chefe_versao_antiga", ["Chefe_Geral"], 1))).rejects.toMatchObject({ code: "permission-denied" });
    });

    it("TEST-INT-CONV-M13-001 — Destinatário com conta Auth recebe notificação interna CONVITE_PARA_TURMA", async () => {
      const emailAuth = `aluno_com_auth_${Date.now()}@ufsc.br`;
      const authUser = await admin.auth().createUser({ email: emailAuth, emailVerified: true });
      await semearAluno(authUser.uid);

      const wrapped = testEnv.wrap(convidarAluno);
      const res = await wrapped(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: profTurmaId,
        email: emailAuth,
      }, profId, ["Professor"]));

      expect(res.canal_entrega).toBe("notificacao_interna");

      // Verificar que a notificação interna foi gravada no path do usuário
      const notifDoc = await db.collection("Usuarios").doc(authUser.uid).collection("Notificacoes").doc(res.id).get();
      expect(notifDoc.exists).toBe(true);
      const notifData = notifDoc.data();
      expect(notifData?.tipo).toBe("CONVITE_PARA_TURMA");
      expect(notifData?.papel_destinatario).toBe("Aluno");
      expect(notifData?.entidade_alvo).toBe("Convite_Aluno");
      expect(notifData?.id_alvo).toBe(res.id);
      expect(notifData?.lida).toBe(false);
      // Garantir que nenhum token em texto claro foi salvo na notificação
      expect(notifData?.metadata?.token).toBeUndefined();
      expect(notifData?.metadata?.tokenConvite).toBeUndefined();
      expect(notifData?.metadata?.token_hash).toBeUndefined();
    });

    it("TEST-INT-CONV-M13-002 — Destinatário sem conta Auth provisiona Auth", async () => {
      const emailSemAuth = `aluno_novo_sem_auth_${Date.now()}@ufsc.br`;
      const wrapped = testEnv.wrap(convidarAluno);
      const res = await wrapped(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: profTurmaId,
        email: emailSemAuth,
      }, profId, ["Professor"]));

      expect(res.canal_entrega).toBe("firebase_auth");
      // Verificar que agora existe no Auth
      const provUser = await admin.auth().getUserByEmail(emailSemAuth);
      expect(provUser.uid).toBeDefined();
    });

    it("TEST-INT-CONV-M13-003 — Destinatário desativado no Auth falha fechado (failed-precondition)", async () => {
      const emailDesativado = `aluno_desativado_${Date.now()}@ufsc.br`;
      await admin.auth().createUser({ email: emailDesativado, disabled: true });

      const wrapped = testEnv.wrap(convidarAluno);
      await expect(wrapped(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: profTurmaId,
        email: emailDesativado,
      }, profId, ["Professor"]))).rejects.toMatchObject({ code: "failed-precondition" });
    });

    it("TEST-INT-CONV-M11-001 — Aceite via externa com token -> matriculado e M7", async () => {
      const emailExt = `aluno_aceite_ext_${Date.now()}@ufsc.br`;
      const authUser = await admin.auth().createUser({ email: emailExt, emailVerified: true });
      await semearAluno(authUser.uid);

      const reqConvidar = mockRequest({
        idOperacao: novaOperacao(),
        idTurma: profTurmaId,
        email: emailExt,
      }, profId, ["Professor"]);
      const resConvidar = await executarConvidarAluno(reqConvidar.data, reqConvidar);

      const tokenEfemero = resConvidar.tokenEfemero;
      expect(tokenEfemero).toBeDefined();

      const wrappedAceitar = testEnv.wrap(aceitarConviteAluno);
      const opAceite = novaOperacao();
      const resAceite = await wrappedAceitar(mockRequest({
        idOperacao: opAceite,
        idConvite: resConvidar.id,
        tokenConvite: tokenEfemero,
      }, authUser.uid, ["Aluno"]));

      expect(resAceite.criouMatricula).toBe(true);

      // Verificar status aceito
      const conviteDoc = await db.collection("Convite_Aluno").doc(resConvidar.id).get();
      expect(conviteDoc.data()?.status).toBe("aceitado");
      expect(conviteDoc.data()?.aceitado_em).toBeDefined();

      // Verificar matrícula no subcollection Alunos
      const alunoNaTurma = await db.collection("Turma").doc(profTurmaId).collection("Alunos").doc(authUser.uid).get();
      expect(alunoNaTurma.exists).toBe(true);

      // Replay M7 do aceite é idempotente
      const replayAceite = await wrappedAceitar(mockRequest({
        idOperacao: opAceite,
        idConvite: resConvidar.id,
        tokenConvite: tokenEfemero,
      }, authUser.uid, ["Aluno"]));
      expect(replayAceite.criouMatricula).toBe(true);
    });

    it("TEST-INT-CONV-M11-002 — Aceite via notificação interna (sem token) -> PASS", async () => {
      const emailInt = `aluno_aceite_int_${Date.now()}@ufsc.br`;
      const authUser = await admin.auth().createUser({ email: emailInt, emailVerified: true });
      await semearAluno(authUser.uid);

      const wrappedConvidar = testEnv.wrap(convidarAluno);
      const resConvidar = await wrappedConvidar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: profTurmaId,
        email: emailInt,
      }, profId, ["Professor"]));

      const wrappedAceitar = testEnv.wrap(aceitarConviteAluno);
      const resAceite = await wrappedAceitar(mockRequest({
        idOperacao: novaOperacao(),
        idConvite: resConvidar.id,
        viaNotificacao: true,
      }, authUser.uid, ["Aluno"]));

      expect(resAceite.criouMatricula).toBe(true);

      // Notificação interna deve ter sido marcada como lida
      const notifDoc = await db.collection("Usuarios").doc(authUser.uid).collection("Notificacoes").doc(resConvidar.id).get();
      expect(notifDoc.data()?.lida).toBe(true);
    });

    it("TEST-INT-CONV-M11-003 — Rejeição terminal (rejeitarConviteAluno) -> status rejeitado e libera chave única", async () => {
      const emailRej = `aluno_rejeicao_${Date.now()}@ufsc.br`;
      const authUser = await admin.auth().createUser({ email: emailRej, emailVerified: true });
      await semearAluno(authUser.uid);

      const wrappedConvidar = testEnv.wrap(convidarAluno);
      const resConvidar = await wrappedConvidar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: profTurmaId,
        email: emailRej,
      }, profId, ["Professor"]));

      const wrappedRejeitar = testEnv.wrap(rejeitarConviteAluno);
      const opRejeicao = novaOperacao();
      const resRejeitar = await wrappedRejeitar(mockRequest({
        idOperacao: opRejeicao,
        idConvite: resConvidar.id,
      }, authUser.uid, ["Aluno"]));

      expect(resRejeitar.status).toBe("rejeitado");

      const conviteDoc = await db.collection("Convite_Aluno").doc(resConvidar.id).get();
      expect(conviteDoc.data()?.status).toBe("rejeitado");
      expect(conviteDoc.data()?.rejeitado_por).toBe(authUser.uid);
      expect(conviteDoc.data()?.rejeitado_em).toBeDefined();

      // Lock em Chaves_Unicas foi liberado
      const chaveLock = await db.collection("Chaves_Unicas").doc(`chave_unica_convite_pendente_${profTurmaId}_${emailRej}`).get();
      expect(chaveLock.exists).toBe(false);

      // Replay M7 da rejeição
      const replayRejeicao = await wrappedRejeitar(mockRequest({
        idOperacao: opRejeicao,
        idConvite: resConvidar.id,
      }, authUser.uid, ["Aluno"]));
      expect(replayRejeicao.status).toBe("rejeitado");

      // Tentar aceitar convite rejeitado falha
      const wrappedAceitar = testEnv.wrap(aceitarConviteAluno);
      await expect(wrappedAceitar(mockRequest({
        idOperacao: novaOperacao(),
        idConvite: resConvidar.id,
        viaNotificacao: true,
      }, authUser.uid, ["Aluno"]))).rejects.toMatchObject({ code: "failed-precondition" });
    });

    it("TEST-INT-CONV-M11-004 — Obter detalhes do convite projeta nomes e não vaza token_hash", async () => {
      const emailDet = `aluno_detalhes_${Date.now()}@ufsc.br`;
      const wrappedConvidar = testEnv.wrap(convidarAluno);
      const resConvidar = await wrappedConvidar(mockRequest({
        idOperacao: novaOperacao(),
        idTurma: profTurmaId,
        email: emailDet,
      }, chefeId, ["Chefe_Geral"]));

      const wrappedDetalhes = testEnv.wrap(obterDetalhesConviteAluno);
      const detalhes = await wrappedDetalhes(mockRequest({
        idConvite: resConvidar.id,
      }, chefeId, ["Chefe_Geral"]));

      expect(detalhes.id).toBe(resConvidar.id);
      expect(detalhes.email).toBe(emailDet);
      expect(detalhes.nome_turma).toBe("Turma Convites M9-M11-M13");
      expect(detalhes.convidado_por_papel).toBe("Chefe_Geral");
      expect("token_hash" in detalhes).toBe(false);
    });
  });
});
