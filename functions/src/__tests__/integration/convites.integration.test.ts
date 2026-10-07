process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";
process.env.CONVITE_HMAC_SECRET = "segredo-de-teste-32-bytes-seguro!!";

import * as admin from "firebase-admin";
import fft from "firebase-functions-test";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import {
  executarConvidarAluno,
  executarAceitarConviteAluno,
} from "../../convites";
import {
  derivarChavePendenciaConvite,
  hashTokenConvite,
} from "../../domain/convites";
import { chaveConvitePendente, chaveAlunoMatricula } from "../../chaves";

const testEnv = fft({ projectId: "lcqui-dev" });

describe("Integração ACAD-005 e ACAD-006: Ciclo de Vida de Convites e Aceite (M11 / PRE11-03)", () => {
  let db: admin.firestore.Firestore;
  const SECRET_TEST = "segredo-de-teste-32-bytes-seguro!!";

  beforeAll(() => {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "lcqui-dev" });
    }
    db = admin.firestore();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  let opCount = 0;
  function novaOp(): string {
    return `op_convite_${Date.now()}_${++opCount}`;
  }

  const mockRequest = (data: any, uid: string, roles: string[] = ["Professor"]): any => ({
    data,
    auth: {
      uid,
      token: { roles, versao_permissoes: 1 },
    },
    rawRequest: {},
  });

  async function semearProfessor(uid: string): Promise<void> {
    await db.collection("Usuarios").doc(uid).set({
      id_usuario: uid,
      nome: `Professor ${uid}`,
      email: `${uid}@ufsc.br`,
      ativo: true,
      versao_permissoes: 1,
    });
    await db.collection("Professor").doc(uid).set({
      id_usuario: uid,
      ativo: true,
    });
  }

  async function semearChefe(uid: string): Promise<void> {
    await db.collection("Usuarios").doc(uid).set({
      id_usuario: uid,
      nome: `Chefe ${uid}`,
      email: `${uid}@ufsc.br`,
      ativo: true,
      versao_permissoes: 1,
    });
    await db.collection("Chefe_Geral").doc(uid).set({
      id_usuario: uid,
      ativo: true,
    });
  }

  async function criarTurmaHelper(
    profUid: string,
    idMateria: string,
    capacidade = 10,
    status: "Ativo" | "Arquivada" = "Ativo"
  ): Promise<string> {
    await semearProfessor(profUid);
    await db.collection("Materia").doc(idMateria).set({
      nome: "Matéria Teste",
      codigo_materia: idMateria.toUpperCase(),
    });
    const turmaRef = db.collection("Turma").doc();
    await turmaRef.set({
      id_professor: profUid,
      id_materia: idMateria,
      nome_turma: "Turma Alpha",
      nome_materia: "Matéria Teste",
      ano: 2026,
      semestre: 1,
      capacidade,
      qtd_alunos: 0,
      codigo_turma: `COD${Date.now().toString().slice(-4)}`,
      status,
      versao: 1,
      data_criacao: new Date().toISOString(),
    });
    return turmaRef.id;
  }

  async function criarUsuarioAuth(email: string, emailVerified = true, displayName = "Aluno Teste"): Promise<string> {
    try {
      const u = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(u.uid, { emailVerified, displayName });
      return u.uid;
    } catch {
      const u = await admin.auth().createUser({
        email,
        emailVerified,
        displayName,
      });
      return u.uid;
    }
  }

  describe("ACAD-005: Convidar e Reenviar Aluno", () => {
    it("TEST-INT-CONVITE-001 — emissão de convite de turma pelo professor dono cria Convite e lock em Chaves_Unicas", async () => {
      const profId = "prof_owner_1";
      const turmaId = await criarTurmaHelper(profId, "mat_1", 5);
      const email = "aluno1@ufsc.br";
      const idOperacao = novaOp();

      const req = mockRequest({ idOperacao, email, idTurma: turmaId, matricula: "20261001" }, profId);
      const res = await executarConvidarAluno(req.data, req, SECRET_TEST);

      expect(res.registrado).toBe(true);
      expect(res.reenvio).toBe(false);
      expect(typeof res.tokenEfemero).toBe("string");
      expect(res.tokenEfemero?.length).toBe(64); // 32 bytes CSPRNG em hex

      const conviteSnap = await db.collection("Convite_Aluno").doc(res.id).get();
      expect(conviteSnap.exists).toBe(true);
      const conviteData = conviteSnap.data()!;
      expect(conviteData.email).toBe(email);
      expect(conviteData.id_turma).toBe(turmaId);
      expect(conviteData.status).toBe("pendente");
      expect(conviteData.convidado_por).toBe(profId);
      expect(conviteData.numero_matricula).toBe("20261001");
      // O token em claro NUNCA é persistido
      expect(conviteData.token).toBeUndefined();
      expect(conviteData.token_hash).toBe(hashTokenConvite(res.tokenEfemero!));

      // Lock em Chaves_Unicas
      const hmac = derivarChavePendenciaConvite(SECRET_TEST, "TURMA", turmaId, email);
      const chaveDoc = chaveConvitePendente(hmac);
      const lockSnap = await db.collection("Chaves_Unicas").doc(chaveDoc).get();
      expect(lockSnap.exists).toBe(true);
      expect(lockSnap.data()?.id_recurso).toBe(res.id);
    });

    it("TEST-INT-CONVITE-002 — convite global cria convite com id_turma nulo", async () => {
      const profId = "prof_owner_2";
      await semearProfessor(profId);
      // Identidade única evita que execuções repetidas reutilizem o lock GLOBAL
      // no Emulator; cada cenário deve começar com estado limpo.
      const email = `global.aluno.${Date.now()}@ufsc.br`;
      const idOperacao = novaOp();

      const req = mockRequest({ idOperacao, email, idTurma: null }, profId);
      const res = await executarConvidarAluno(req.data, req, SECRET_TEST);

      expect(res.registrado).toBe(true);
      expect(res.reenvio).toBe(false);

      const conviteSnap = await db.collection("Convite_Aluno").doc(res.id).get();
      expect(conviteSnap.data()?.id_turma).toBeNull();

      const hmac = derivarChavePendenciaConvite(SECRET_TEST, "GLOBAL", null, email);
      const lockSnap = await db.collection("Chaves_Unicas").doc(chaveConvitePendente(hmac)).get();
      expect(lockSnap.exists).toBe(true);
      expect(lockSnap.data()?.id_recurso).toBe(res.id);
    });

    it("TEST-INT-CONVITE-002A — convite global para Auth existente chega na caixa interna", async () => {
      const profId = "prof_global_auth_2a";
      await semearProfessor(profId);
      const email = "global.auth.existente@ufsc.br";
      const alunoUid = await criarUsuarioAuth(email, true, "Aluno Global Auth");

      const res = await executarConvidarAluno({
        idOperacao: novaOp(), email, idTurma: null,
      }, mockRequest({}, profId), SECRET_TEST);

      expect(res.canal_entrega).toBe("notificacao_interna");
      const notificacao = await db.collection("Usuarios").doc(alunoUid)
        .collection("Notificacoes").doc(res.id).get();
      expect(notificacao.exists).toBe(true);
      expect(notificacao.data()).toMatchObject({
        tipo: "CONVITE_PARA_TURMA",
        id_destinatario: alunoUid,
        id_turma: null,
        entidade_alvo: "Convite_Aluno",
        id_alvo: res.id,
      });
    });

    it("TEST-INT-CONVITE-003 — professor tentando convidar para turma alheia é negado (DENY)", async () => {
      const dono = "prof_dono_3";
      const intruso = "prof_intruso_3";
      const turmaId = await criarTurmaHelper(dono, "mat_3", 5);
      await semearProfessor(intruso);

      const req = mockRequest({ idOperacao: novaOp(), email: "aluno3@ufsc.br", idTurma: turmaId }, intruso);
      await expect(executarConvidarAluno(req.data, req, SECRET_TEST)).rejects.toMatchObject({
        code: "permission-denied",
      });
    });

    it("TEST-INT-CONVITE-004 — Chefe_Geral pode emitir convite ordinário sem alterar ownership, mas não pode exceder capacidade", async () => {
      const dono = "prof_dono_4";
      const chefe = "chefe_4";
      const turmaId = await criarTurmaHelper(dono, "mat_4", 5);
      await semearChefe(chefe);

      // Convite ordinário pelo Chefe -> PASS
      const req = mockRequest({ idOperacao: novaOp(), email: "aluno4@ufsc.br", idTurma: turmaId, excederCapacidade: false }, chefe, ["Chefe_Geral"]);
      const res = await executarConvidarAluno(req.data, req, SECRET_TEST);
      expect(res.registrado).toBe(true);

      // Ownership de professor permanece intocado
      const snapTurma = await db.collection("Turma").doc(turmaId).get();
      expect(snapTurma.data()?.id_professor).toBe(dono);

      // Chefe tentando exceder capacidade -> DENY
      const reqExceder = mockRequest({
        idOperacao: novaOp(),
        email: "aluno4_excesso@ufsc.br",
        idTurma: turmaId,
        excederCapacidade: true,
        justificativaExcecao: "Tentativa de excesso pelo chefe",
      }, chefe, ["Chefe_Geral"]);
      await expect(executarConvidarAluno(reqExceder.data, reqExceder, SECRET_TEST)).rejects.toMatchObject({
        code: "permission-denied",
      });
    });

    it("TEST-INT-CONVITE-005 — convite para turma arquivada é negado", async () => {
      const profId = "prof_arq_5";
      const turmaId = await criarTurmaHelper(profId, "mat_5", 5, "Arquivada");

      const req = mockRequest({ idOperacao: novaOp(), email: "aluno5@ufsc.br", idTurma: turmaId }, profId);
      await expect(executarConvidarAluno(req.data, req, SECRET_TEST)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });

    it("TEST-INT-CONVITE-006 — normalização de e-mail e rejeição de e-mail > 150 caracteres", async () => {
      const profId = "prof_norm_6";
      const turmaId = await criarTurmaHelper(profId, "mat_6", 5);

      const reqValido = mockRequest({ idOperacao: novaOp(), email: "  ALUNO.CAPS@UFSC.BR  ", idTurma: turmaId }, profId);
      const res = await executarConvidarAluno(reqValido.data, reqValido, SECRET_TEST);
      const snap = await db.collection("Convite_Aluno").doc(res.id).get();
      expect(snap.data()?.email).toBe("aluno.caps@ufsc.br");

      const emailLongo = "a".repeat(145) + "@ufsc.br"; // 153 chars
      const reqInvalido = mockRequest({ idOperacao: novaOp(), email: emailLongo, idTurma: turmaId }, profId);
      await expect(executarConvidarAluno(reqInvalido.data, reqInvalido, SECRET_TEST)).rejects.toThrow();
    });

    it("TEST-INT-CONVITE-007 — matrícula não é única em Convite_Aluno (dois convites históricos podem tê-la)", async () => {
      const profId = "prof_mat_7";
      const t1 = await criarTurmaHelper(profId, "mat_7a", 5);
      const t2 = await criarTurmaHelper(profId, "mat_7b", 5);

      const res1 = await executarConvidarAluno({
        idOperacao: novaOp(),
        email: "aluno7a@ufsc.br",
        idTurma: t1,
        matricula: "MAT123",
      }, mockRequest({}, profId), SECRET_TEST);

      const res2 = await executarConvidarAluno({
        idOperacao: novaOp(),
        email: "aluno7b@ufsc.br",
        idTurma: t2,
        matricula: "MAT123", // Mesma matrícula em outro convite é permitida
      }, mockRequest({}, profId), SECRET_TEST);

      expect(res1.id).not.toBe(res2.id);
      expect((await db.collection("Convite_Aluno").doc(res1.id).get()).data()?.numero_matricula).toBe("MAT123");
      expect((await db.collection("Convite_Aluno").doc(res2.id).get()).data()?.numero_matricula).toBe("MAT123");
    });

    it("TEST-INT-CONVITE-008 — mesmo e-mail em GLOBAL e TURMA produzem pendências distintas e coexistem", async () => {
      const profId = "prof_ctx_8";
      const turmaId = await criarTurmaHelper(profId, "mat_8", 5);
      const email = "multi.context@ufsc.br";

      const resTurma = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      const resGlobal = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: null,
      }, mockRequest({}, profId), SECRET_TEST);

      expect(resTurma.id).not.toBe(resGlobal.id);

      const hmacTurma = derivarChavePendenciaConvite(SECRET_TEST, "TURMA", turmaId, email);
      const hmacGlobal = derivarChavePendenciaConvite(SECRET_TEST, "GLOBAL", null, email);
      expect(hmacTurma).not.toBe(hmacGlobal);

      const lockTurma = await db.collection("Chaves_Unicas").doc(chaveConvitePendente(hmacTurma)).get();
      const lockGlobal = await db.collection("Chaves_Unicas").doc(chaveConvitePendente(hmacGlobal)).get();
      expect(lockTurma.exists).toBe(true);
      expect(lockGlobal.exists).toBe(true);
    });

    it("TEST-INT-CONVITE-009 — mesmo idOperacao retorna REPLAY M7 sem rotacionar token", async () => {
      const profId = "prof_rep_9";
      const turmaId = await criarTurmaHelper(profId, "mat_9", 5);
      const email = "replay@ufsc.br";
      const idOp = novaOp();

      const req = mockRequest({ idOperacao: idOp, email, idTurma: turmaId }, profId);
      const r1 = await executarConvidarAluno(req.data, req, SECRET_TEST);

      const r2 = await executarConvidarAluno(req.data, req, SECRET_TEST);
      expect(r2.id).toBe(r1.id);
      expect(r2.reenvio).toBe(false);

      const conviteSnap = await db.collection("Convite_Aluno").doc(r1.id).get();
      expect(conviteSnap.data()?.token_hash).toBe(hashTokenConvite(r1.tokenEfemero!));
    });

    it("TEST-INT-CONVITE-010 — nova operação sobre convite pendente atua como REENVIO (novo token, mesmo idConvite)", async () => {
      const profId = "prof_reenv_10";
      const turmaId = await criarTurmaHelper(profId, "mat_10", 5);
      const email = "reenvio@ufsc.br";

      const r1 = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      const r2 = await executarConvidarAluno({
        idOperacao: novaOp(), // nova operação
        email,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      expect(r2.id).toBe(r1.id); // Mesmo idConvite!
      expect(r2.reenvio).toBe(true);
      expect(r2.tokenEfemero).not.toBe(r1.tokenEfemero); // Novo token

      const conviteSnap = await db.collection("Convite_Aluno").doc(r1.id).get();
      expect(conviteSnap.data()?.ultimo_reenvio_por).toBe(profId);
      expect(conviteSnap.data()?.token_hash).toBe(hashTokenConvite(r2.tokenEfemero!));
    });

    it("TEST-INT-CONVITE-011 — convite pendente expirado + nova emissão reconcilia antigo para expirado e gera novo idConvite", async () => {
      const profId = "prof_exp_11";
      const turmaId = await criarTurmaHelper(profId, "mat_11", 5);
      const email = "expirando@ufsc.br";

      const r1 = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      // Simula passagem do tempo / expiração no Firestore
      const passado = new Date();
      passado.setDate(passado.getDate() - 10);
      await db.collection("Convite_Aluno").doc(r1.id).update({
        expira_em: Timestamp.fromDate(passado),
      });

      // Nova emissão
      const r2 = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      expect(r2.id).not.toBe(r1.id); // Novo idConvite!
      expect(r2.reenvio).toBe(false);

      // Convite antigo preservado como 'expirado'
      const antigoSnap = await db.collection("Convite_Aluno").doc(r1.id).get();
      expect(antigoSnap.data()?.status).toBe("expirado");

      // Lock aponta para o novo
      const hmac = derivarChavePendenciaConvite(SECRET_TEST, "TURMA", turmaId, email);
      const lockSnap = await db.collection("Chaves_Unicas").doc(chaveConvitePendente(hmac)).get();
      expect(lockSnap.data()?.id_recurso).toBe(r2.id);
    });

    it("TEST-INT-CONVITE-012 — turma cheia sem exceção é negada; com exceção válida do professor dono é aceita", async () => {
      const profId = "prof_cap_12";
      const turmaId = await criarTurmaHelper(profId, "mat_12", 2);

      // Preenche a turma
      await db.collection("Turma").doc(turmaId).update({ qtd_alunos: 2 });

      // Sem exceção -> DENY
      await expect(executarConvidarAluno({
        idOperacao: novaOp(),
        email: "cheia1@ufsc.br",
        idTurma: turmaId,
        excederCapacidade: false,
      }, mockRequest({}, profId), SECRET_TEST)).rejects.toMatchObject({
        code: "failed-precondition",
      });

      // Com exceção sem justificativa -> DENY
      await expect(executarConvidarAluno({
        idOperacao: novaOp(),
        email: "cheia2@ufsc.br",
        idTurma: turmaId,
        excederCapacidade: true,
        justificativaExcecao: "",
      }, mockRequest({}, profId), SECRET_TEST)).rejects.toMatchObject({
        code: "invalid-argument",
      });

      // Com exceção e justificativa válida -> PASS
      const resExcecao = await executarConvidarAluno({
        idOperacao: novaOp(),
        email: "cheia_ok@ufsc.br",
        idTurma: turmaId,
        excederCapacidade: true,
        justificativaExcecao: "Vaga extraordinária autorizada",
      }, mockRequest({}, profId), SECRET_TEST);

      expect(resExcecao.registrado).toBe(true);
      const snap = await db.collection("Convite_Aluno").doc(resExcecao.id).get();
      expect(snap.data()?.exceder_capacidade).toBe(true);
      expect(snap.data()?.justificativa_excecao).toBe("Vaga extraordinária autorizada");
    });
  });

  describe("ACAD-006: Aceitar Convite de Aluno", () => {
    it("TEST-INT-ACEITE-001 — aceite de turma válido cria Usuario, Aluno, vínculo sanitizado, espelho e HistoricoAlunos", async () => {
      const profId = "prof_aceite_1";
      const turmaId = await criarTurmaHelper(profId, "mat_ac1", 10);
      const email = "aluno_aceite_1@ufsc.br";
      const alunoUid = await criarUsuarioAuth(email, true, "Aluno Primeiro Acesso");

      const convite = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
        matricula: "20260001",
      }, mockRequest({}, profId), SECRET_TEST);

      const idOpAceite = novaOp();
      const reqAceite: any = {
        auth: { uid: alunoUid },
      };

      const resAceite = await executarAceitarConviteAluno({
        idOperacao: idOpAceite,
        idConvite: convite.id,
        tokenConvite: convite.tokenEfemero!,
        nomeInformado: "Aluno Primeiro Acesso",
        matriculaInformada: "20260001",
      }, reqAceite, SECRET_TEST);

      expect(resAceite.idConvite).toBe(convite.id);
      expect(resAceite.uid).toBe(alunoUid);
      expect(resAceite.criouMatricula).toBe(true);

      // Convite marcado como 'aceitado'
      const conviteSnap = await db.collection("Convite_Aluno").doc(convite.id).get();
      expect(conviteSnap.data()?.status).toBe("aceitado");
      expect(conviteSnap.data()?.aceitado_por).toBe(alunoUid);

      // Chave de pendência liberada (excluída)
      const hmac = derivarChavePendenciaConvite(SECRET_TEST, "TURMA", turmaId, email);
      const pendSnap = await db.collection("Chaves_Unicas").doc(chaveConvitePendente(hmac)).get();
      expect(pendSnap.exists).toBe(false);

      // Usuário e Aluno criados
      const userSnap = await db.collection("Usuarios").doc(alunoUid).get();
      expect(userSnap.exists).toBe(true);
      expect(userSnap.data()?.ativo).toBe(true);

      const papelAlunoSnap = await db.collection("Aluno").doc(alunoUid).get();
      expect(papelAlunoSnap.exists).toBe(true);
      expect(papelAlunoSnap.data()?.numero_matricula).toBe("20260001");

      // Matrícula reservada em Chaves_Unicas
      const chaveMat = await db.collection("Chaves_Unicas").doc(chaveAlunoMatricula("20260001")).get();
      expect(chaveMat.exists).toBe(true);
      expect(chaveMat.data()?.id_recurso).toBe(alunoUid);

      // Vínculo canônico: projeção mínima sanitizada (SEM email, SEM matricula)
      const vinculoSnap = await db.collection("Turma").doc(turmaId).collection("Alunos").doc(alunoUid).get();
      expect(vinculoSnap.exists).toBe(true);
      expect(vinculoSnap.data()?.id_aluno).toBe(alunoUid);
      expect(vinculoSnap.data()?.id_turma).toBe(turmaId);
      expect(vinculoSnap.data()?.email).toBeUndefined();
      expect(vinculoSnap.data()?.numero_matricula).toBeUndefined();
      expect(vinculoSnap.data()?.matricula).toBeUndefined();

      // Espelho de consulta em Usuarios/{uid}/Turmas
      const espelhoSnap = await db.collection("Usuarios").doc(alunoUid).collection("Turmas").doc(turmaId).get();
      expect(espelhoSnap.exists).toBe(true);
      expect(espelhoSnap.data()?.id_turma).toBe(turmaId);

      // Evento de inclusão em HistoricoAlunos com modo_ingresso CONVITE
      const histQuery = await db.collection("Turma").doc(turmaId).collection("HistoricoAlunos")
        .where("id_aluno", "==", alunoUid).get();
      expect(histQuery.empty).toBe(false);
      expect(histQuery.docs[0].data().tipo).toBe("inclusao_aluno");
      expect(histQuery.docs[0].data().modo_ingresso).toBe("CONVITE");

      // Contador incrementado
      const turmaAtualizada = await db.collection("Turma").doc(turmaId).get();
      expect(turmaAtualizada.data()?.qtd_alunos).toBe(1);

      // Replay M7 do aceite retorna mesmo resultado sem re-processar
      const resReplay = await executarAceitarConviteAluno({
        idOperacao: idOpAceite,
        idConvite: convite.id,
        tokenConvite: convite.tokenEfemero!,
      }, reqAceite, SECRET_TEST);
      expect(resReplay.idConvite).toBe(convite.id);
      expect(resReplay.uid).toBe(alunoUid);

      // Contador NÃO duplicado no replay
      const turmaPosReplay = await db.collection("Turma").doc(turmaId).get();
      expect(turmaPosReplay.data()?.qtd_alunos).toBe(1);
    });

    it("TEST-INT-ACEITE-002 — aceite global NÃO cria vínculo de turma, espelho nem evento em HistoricoAlunos", async () => {
      const profId = "prof_aceite_2";
      await semearProfessor(profId);
      const email = "aluno_global@ufsc.br";
      const alunoUid = await criarUsuarioAuth(email, true, "Aluno Global");

      const convite = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: null,
      }, mockRequest({}, profId), SECRET_TEST);

      const resAceite = await executarAceitarConviteAluno({
        idOperacao: novaOp(),
        idConvite: convite.id,
        tokenConvite: convite.tokenEfemero!,
        nomeInformado: "Aluno Global",
        matriculaInformada: "20260002",
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST);

      expect(resAceite.criouMatricula).toBe(false);
      expect(resAceite.idTurma).toBeNull();

      // Perfil Aluno criado
      const papelAluno = await db.collection("Aluno").doc(alunoUid).get();
      expect(papelAluno.exists).toBe(true);

      // Sem vínculos em Turma
      const turmasQuery = await db.collectionGroup("Alunos").where("id_aluno", "==", alunoUid).get();
      expect(turmasQuery.empty).toBe(true);

      // Sem espelhos em Usuarios/{uid}/Turmas
      const espelhos = await db.collection("Usuarios").doc(alunoUid).collection("Turmas").get();
      expect(espelhos.empty).toBe(true);
    });

    it("TEST-INT-ACEITE-003 — token inválido ou antigo após reenvio é negado (DENY)", async () => {
      const profId = "prof_aceite_3";
      const turmaId = await criarTurmaHelper(profId, "mat_ac3", 5);
      const email = "token_errado@ufsc.br";
      const alunoUid = await criarUsuarioAuth(email, true);

      const convite = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      // Reenvio gera novo token e invalida o anterior
      await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      // Tentativa com token original antigo -> DENY
      await expect(executarAceitarConviteAluno({
        idOperacao: novaOp(),
        idConvite: convite.id,
        tokenConvite: convite.tokenEfemero!,
        matriculaInformada: "20260003",
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST)).rejects.toMatchObject({
        code: "permission-denied",
      });

      // Tentativa com token inventado -> DENY
      await expect(executarAceitarConviteAluno({
        idOperacao: novaOp(),
        idConvite: convite.id,
        tokenConvite: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        matriculaInformada: "20260003",
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST)).rejects.toMatchObject({
        code: "permission-denied",
      });
    });

    it("TEST-INT-ACEITE-004 — e-mail não verificado no Auth é negado (DENY)", async () => {
      const profId = "prof_aceite_4";
      const turmaId = await criarTurmaHelper(profId, "mat_ac4", 5);
      const email = "nao_verificado@ufsc.br";
      const alunoUid = await criarUsuarioAuth(email, false); // emailVerified = false

      const convite = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      await expect(executarAceitarConviteAluno({
        idOperacao: novaOp(),
        idConvite: convite.id,
        tokenConvite: convite.tokenEfemero!,
        matriculaInformada: "20260004",
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });

    it("TEST-INT-ACEITE-005 — e-mail Auth divergente do convite é negado (DENY)", async () => {
      const profId = "prof_aceite_5";
      const turmaId = await criarTurmaHelper(profId, "mat_ac5", 5);
      const emailConvite = "convite_dest@ufsc.br";
      const emailOutro = "outro_aluno@ufsc.br";
      const alunoUid = await criarUsuarioAuth(emailOutro, true);

      const convite = await executarConvidarAluno({
        idOperacao: novaOp(),
        email: emailConvite,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      await expect(executarAceitarConviteAluno({
        idOperacao: novaOp(),
        idConvite: convite.id,
        tokenConvite: convite.tokenEfemero!,
        matriculaInformada: "20260005",
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST)).rejects.toMatchObject({
        code: "permission-denied",
      });
    });

    it("TEST-INT-ACEITE-006 — convite expirado materializa status=expirado e libera Chaves_Unicas sem rollback", async () => {
      const profId = "prof_aceite_6";
      const turmaId = await criarTurmaHelper(profId, "mat_ac6", 5);
      const email = "expirou_aceite@ufsc.br";
      const alunoUid = await criarUsuarioAuth(email, true);

      const convite = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      // Simula convite expirado no Firestore
      const passado = new Date();
      passado.setDate(passado.getDate() - 10);
      await db.collection("Convite_Aluno").doc(convite.id).update({
        expira_em: Timestamp.fromDate(passado),
      });

      // Tentativa de aceite falha
      await expect(executarAceitarConviteAluno({
        idOperacao: novaOp(),
        idConvite: convite.id,
        tokenConvite: convite.tokenEfemero!,
        matriculaInformada: "20260006",
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST)).rejects.toMatchObject({
        code: "failed-precondition",
      });

      // Mas o status foi materializado como 'expirado' e a pendência foi liberada!
      const conviteSnap = await db.collection("Convite_Aluno").doc(convite.id).get();
      expect(conviteSnap.data()?.status).toBe("expirado");

      const hmac = derivarChavePendenciaConvite(SECRET_TEST, "TURMA", turmaId, email);
      const pendSnap = await db.collection("Chaves_Unicas").doc(chaveConvitePendente(hmac)).get();
      expect(pendSnap.exists).toBe(false);
    });

    it("TEST-INT-ACEITE-007 — contadores de turma inválidos (ausente, string, negativo) falham fechado", async () => {
      const profId = "prof_aceite_7";
      const turmaId = await criarTurmaHelper(profId, "mat_ac7", 5);
      const email = "fail_closed_cnt@ufsc.br";
      const alunoUid = await criarUsuarioAuth(email, true);

      const convite = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      // Corrompe o contador
      await db.collection("Turma").doc(turmaId).update({ qtd_alunos: -1 });

      await expect(executarAceitarConviteAluno({
        idOperacao: novaOp(),
        idConvite: convite.id,
        tokenConvite: convite.tokenEfemero!,
        matriculaInformada: "20260007",
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });

    it("TEST-INT-ACEITE-008 — aluno com vínculo ativo na turma tentando novo aceite é negado (DENY)", async () => {
      const profId = "prof_aceite_8";
      const turmaId = await criarTurmaHelper(profId, "mat_ac8", 5);
      const email = "ja_matriculado@ufsc.br";
      const alunoUid = await criarUsuarioAuth(email, true);

      // Simula que o aluno já possui vínculo ativo
      await db.collection("Turma").doc(turmaId).collection("Alunos").doc(alunoUid).set({
        id_aluno: alunoUid,
        id_turma: turmaId,
        ingressou_em: FieldValue.serverTimestamp(),
      });

      const convite = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      await expect(executarAceitarConviteAluno({
        idOperacao: novaOp(),
        idConvite: convite.id,
        tokenConvite: convite.tokenEfemero!,
        matriculaInformada: "20260008",
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST)).rejects.toMatchObject({
        code: "already-exists",
      });
    });

    it("TEST-INT-ACEITE-009 — reingresso de aluno após remoção anterior é permitido e gera novo evento", async () => {
      const profId = "prof_aceite_9";
      const turmaId = await criarTurmaHelper(profId, "mat_ac9", 5);
      const email = "reingresso@ufsc.br";
      const alunoUid = await criarUsuarioAuth(email, true);

      // Simula evento histórico de exclusão anterior
      await db.collection("Turma").doc(turmaId).collection("HistoricoAlunos").doc().set({
        id_turma: turmaId,
        id_aluno: alunoUid,
        tipo: "exclusao_aluno",
        modo_ingresso: null,
        removido_por: profId,
        timestamp: new Date().toISOString(),
      });

      const convite = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      const resAceite = await executarAceitarConviteAluno({
        idOperacao: novaOp(),
        idConvite: convite.id,
        tokenConvite: convite.tokenEfemero!,
        matriculaInformada: "20260009",
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST);

      expect(resAceite.criouMatricula).toBe(true);

      // Verifica que o novo evento de inclusão foi gerado e o evento anterior de exclusão permaneceu
      const eventos = await db.collection("Turma").doc(turmaId).collection("HistoricoAlunos")
        .where("id_aluno", "==", alunoUid).get();
      expect(eventos.docs.length).toBe(2);
      const tipos = eventos.docs.map(d => d.data().tipo);
      expect(tipos).toContain("exclusao_aluno");
      expect(tipos).toContain("inclusao_aluno");
    });

    it("TEST-INT-ACEITE-010 — convite inexistente retorna not-found", async () => {
      const email = "inexistente@ufsc.br";
      const alunoUid = await criarUsuarioAuth(email, true);

      await expect(executarAceitarConviteAluno({
        idOperacao: novaOp(),
        idConvite: "convite_inexistente_123",
        tokenConvite: "0".repeat(64),
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST)).rejects.toMatchObject({
        code: "not-found",
      });
    });

    it("TEST-INT-ACEITE-011 — convite já consumido é negado (failed-precondition)", async () => {
      const profId = "prof_consumido";
      const turmaId = await criarTurmaHelper(profId, "mat_cons", 5);
      const email = "consumido@ufsc.br";
      const alunoUid = await criarUsuarioAuth(email, true);

      const convite = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      // Primeiro aceite ok
      await executarAceitarConviteAluno({
        idOperacao: novaOp(),
        idConvite: convite.id,
        tokenConvite: convite.tokenEfemero!,
        matriculaInformada: "20260010",
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST);

      // Segundo aceite com nova operação deve falhar
      await expect(executarAceitarConviteAluno({
        idOperacao: novaOp(),
        idConvite: convite.id,
        tokenConvite: convite.tokenEfemero!,
        matriculaInformada: "20260010",
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });

    it("TEST-INT-ACEITE-012 — turma arquivada após emissão é negada no momento do aceite", async () => {
      const profId = "prof_arq_pos";
      const turmaId = await criarTurmaHelper(profId, "mat_arq_pos", 5);
      const email = "turma_arq_pos@ufsc.br";
      const alunoUid = await criarUsuarioAuth(email, true);

      const convite = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      // Arquiva a turma antes do aceite
      await db.collection("Turma").doc(turmaId).update({ status: "Arquivada" });

      await expect(executarAceitarConviteAluno({
        idOperacao: novaOp(),
        idConvite: convite.id,
        tokenConvite: convite.tokenEfemero!,
        matriculaInformada: "20260012",
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST)).rejects.toMatchObject({
        code: "failed-precondition",
      });
    });

    it("TEST-INT-ACEITE-013 — mesmo idOperacao com payload incompatível é negado por M7 (already-exists)", async () => {
      const profId = "prof_m7_inc";
      const turmaId = await criarTurmaHelper(profId, "mat_m7", 5);
      const email = "m7_incomp@ufsc.br";
      const alunoUid = await criarUsuarioAuth(email, true);

      const convite = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      const idOp = novaOp();
      await executarAceitarConviteAluno({
        idOperacao: idOp,
        idConvite: convite.id,
        tokenConvite: convite.tokenEfemero!,
        matriculaInformada: "20260013",
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST);

      // Tentativa de reutilizar o mesmo idOperacao com token diferente -> already-exists
      await expect(executarAceitarConviteAluno({
        idOperacao: idOp,
        idConvite: convite.id,
        tokenConvite: "outro_token_diferente",
        matriculaInformada: "20260013",
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST)).rejects.toMatchObject({
        code: "already-exists",
      });
    });

    it("TEST-INT-ACEITE-014 — usuário existente inativo é negado (permission-denied)", async () => {
      const profId = "prof_inativo";
      const turmaId = await criarTurmaHelper(profId, "mat_inat", 5);
      const email = "inativo@ufsc.br";
      const alunoUid = await criarUsuarioAuth(email, true);

      // Usuário marcado como inativo no Firestore
      await db.collection("Usuarios").doc(alunoUid).set({
        id_usuario: alunoUid,
        ativo: false,
        email,
        versao_permissoes: 1,
      });

      const convite = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      await expect(executarAceitarConviteAluno({
        idOperacao: novaOp(),
        idConvite: convite.id,
        tokenConvite: convite.tokenEfemero!,
        matriculaInformada: "20260014",
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST)).rejects.toMatchObject({
        code: "permission-denied",
      });
    });

    it("TEST-INT-ACEITE-015 — matrícula já em uso por outro aluno é negada por Chaves_Unicas (already-exists)", async () => {
      const profId = "prof_mat_dup";
      const turmaId = await criarTurmaHelper(profId, "mat_dup", 5);
      const email = "mat_conflito@ufsc.br";
      const alunoUid = await criarUsuarioAuth(email, true);

      // Outro aluno já ocupa a matrícula MAT_OCUPADA
      await db.collection("Chaves_Unicas").doc(chaveAlunoMatricula("MAT_OCUPADA")).set({
        tipo: "Aluno",
        id_recurso: "outro_aluno_uid",
      });

      const convite = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
      }, mockRequest({}, profId), SECRET_TEST);

      await expect(executarAceitarConviteAluno({
        idOperacao: novaOp(),
        idConvite: convite.id,
        tokenConvite: convite.tokenEfemero!,
        matriculaInformada: "MAT_OCUPADA",
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST)).rejects.toMatchObject({
        code: "already-exists",
      });
    });

    it("TEST-INT-ACEITE-016 — aceite em turma lotada com exceção válida tem sucesso e registra justificativa", async () => {
      const profId = "prof_lot_exc";
      const turmaId = await criarTurmaHelper(profId, "mat_lot", 1);
      const email = "lotada_exc@ufsc.br";
      const alunoUid = await criarUsuarioAuth(email, true);

      // Lota a turma
      await db.collection("Turma").doc(turmaId).update({ qtd_alunos: 1 });

      const convite = await executarConvidarAluno({
        idOperacao: novaOp(),
        email,
        idTurma: turmaId,
        excederCapacidade: true,
        justificativaExcecao: "Vaga excepcional autorizada pelo colegiado",
      }, mockRequest({}, profId), SECRET_TEST);

      const resAceite = await executarAceitarConviteAluno({
        idOperacao: novaOp(),
        idConvite: convite.id,
        tokenConvite: convite.tokenEfemero!,
        matriculaInformada: "20260016",
      }, { auth: { uid: alunoUid } } as any, SECRET_TEST);

      expect(resAceite.criouMatricula).toBe(true);
      const turmaApos = await db.collection("Turma").doc(turmaId).get();
      expect(turmaApos.data()?.qtd_alunos).toBe(2);

      const histQuery = await db.collection("Turma").doc(turmaId).collection("HistoricoAlunos")
        .where("id_aluno", "==", alunoUid).get();
      expect(histQuery.docs[0].data().justificativa).toBe("Vaga excepcional autorizada pelo colegiado");
    });
  });
});
