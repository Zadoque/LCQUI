import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { validarPermissao } from "./auth";
import { validatePayload } from "./utils/validation";
import { 
  IngressarTurmaPorCodigoSchema, 
  CriarTurmaSchema, 
  RemoverAlunoTurmaSchema, 
  ArquivarTurmaSchema, 
  ConvidarAlunoSchema, 
  AdicionarAlunoExistenteTurmaSchema 
} from "./schemas/turmas.schema";

/**
 * RN-TUR-01: Controle de Capacidade da Turma
 * O ingresso exige que a quantidade de alunos seja estritamente menor que a capacidade.
 */
export const ingressarEmTurmaPorCodigo = onCall(async (request) => {
  validarPermissao(request, ["Aluno", "Bolsista"]);
  
  const { codigoTurma } = validatePayload(IngressarTurmaPorCodigoSchema, request.data);

  const db = admin.firestore();

  const turmaSnap = await db.collection("Turma")
    .where("codigo_turma", "==", codigoTurma)
    .limit(1).get();
  
  if (turmaSnap.empty) throw new HttpsError("not-found", "Turma não encontrada.");
  const turmaRef = turmaSnap.docs[0].ref;

  return db.runTransaction(async (tx) => {
    const turmaDoc = await tx.get(turmaRef);
    if (!turmaDoc.exists) throw new HttpsError("not-found", "Turma sumiu.");
    const turma = turmaDoc.data()!;

    if (turma.status === "Arquivada") {
      throw new HttpsError("failed-precondition", "A turma está arquivada e não aceita novos alunos.");
    }

    const qtdAtual = turma.qtd_alunos || 0;
    if (qtdAtual >= turma.capacidade) {
      throw new HttpsError("failed-precondition", "A capacidade máxima da turma foi atingida.");
    }

    const alunoTurmaRef = turmaRef.collection("Alunos").doc(request.auth!.uid);
    const alunoTurmaDoc = await tx.get(alunoTurmaRef);
    if (alunoTurmaDoc.exists) {
      throw new HttpsError("already-exists", "Você já está matriculado nesta turma.");
    }

    const historicoSnap = await tx.get(
      turmaRef.collection("HistoricoAlunos")
        .where("id_aluno", "==", request.auth!.uid)
        .where("tipo", "==", "exclusao_aluno")
        .limit(1)
    );
    if (!historicoSnap.empty) {
      throw new HttpsError("permission-denied", "Você foi removido pelo professor e não pode retornar pelo código.");
    }

    const userRef = db.collection("Aluno").doc(request.auth!.uid);
    const userDoc = await tx.get(userRef);
    const userData = userDoc.exists ? userDoc.data()! : {};

    tx.set(alunoTurmaRef, {
      id_aluno: request.auth!.uid,
      nome: userData.nome || "Sem nome",
      email: userData.email || "",
      numero_matricula: userData.numero_matricula || "",
      ingressou_em: FieldValue.serverTimestamp()
    });

    const alunoTurmaMirrorRef = db.collection("Usuarios").doc(request.auth!.uid).collection("Turmas").doc(turmaDoc.id);
    tx.set(alunoTurmaMirrorRef, {
      id_turma: turmaDoc.id,
      nome_turma: turma.nome_turma,
      nome_materia: turma.nome_materia,
      ano: turma.ano,
      semestre: turma.semestre,
      id_professor: turma.id_professor,
      ingressou_em: FieldValue.serverTimestamp()
    });

    tx.set(turmaRef.collection("HistoricoAlunos").doc(), {
      id_aluno: request.auth!.uid,
      tipo: "inclusao_aluno",
      timestamp: FieldValue.serverTimestamp()
    });

    tx.update(turmaRef, {
      qtd_alunos: FieldValue.increment(1)
    });

    return { idTurma: turmaDoc.id, nomeTurma: turma.nome_turma };
  });
});

export const criarTurma = onCall(async (request) => {
  try {
    validarPermissao(request, ["Professor", "Chefe_Geral"]);

    const payload = validatePayload(CriarTurmaSchema, request.data);
    const { idMateria, nomeTurma, ano, semestre, capacidade, nomeMateria, idProfessor } = payload;
    console.log("Recebido payload criarTurma:", payload);

    const authRoles = request.auth?.token.roles || [];
    const isChefeGeral = authRoles.includes("Chefe_Geral");
    
    let id_professor = request.auth!.uid;
    if (isChefeGeral && idProfessor) {
      if (idProfessor === request.auth!.uid) {
        throw new HttpsError("invalid-argument", "O chefe geral não pode criar uma turma para si mesmo.");
      }
      id_professor = idProfessor;
    }

    const anoNum = ano;
    const semestreNum = semestre;
    const capacidadeNum = capacidade;

    const db = admin.firestore();

    return await db.runTransaction(async (tx) => {
      const generateCode = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      let uniqueCode = "";
      let codeIsUnique = false;
      let attempts = 0;

      while (!codeIsUnique && attempts < 5) {
        const tempCode = generateCode();
        const query = await tx.get(
          db.collection("Turma").where("codigo_turma", "==", tempCode).limit(1)
        );
        if (query.empty) {
          uniqueCode = tempCode;
          codeIsUnique = true;
        }
        attempts++;
      }

      if (!codeIsUnique) {
        throw new HttpsError("internal", "Não foi possível gerar um código único. Tente novamente.");
      }

      const docRef = db.collection("Turma").doc();
      tx.set(docRef, {
        id_materia: idMateria,
        nome_materia: nomeMateria,
        id_professor: id_professor,
        status: "Ativo",
        nome_turma: nomeTurma,
        ano: anoNum,
        semestre: semestreNum,
        capacidade: capacidadeNum,
        qtd_alunos: 0,
        codigo_turma: uniqueCode,
        data_criacao: FieldValue.serverTimestamp()
      });

      return { id: docRef.id, codigoTurma: uniqueCode };
    });
  } catch (error: any) {
    console.error("ERRO FATAL NO BACKEND (criarTurma):", error);
    throw new HttpsError("internal", `ERRO INTERNO: ${error?.message || error}`);
  }
});

export const removerAlunoTurma = onCall(async (request) => {
  validarPermissao(request, ["Professor", "Chefe_Geral"]);
  
  const { idTurma, idAluno } = validatePayload(RemoverAlunoTurmaSchema, request.data);

  const db = admin.firestore();
  const turmaRef = db.collection("Turma").doc(idTurma);

  return db.runTransaction(async (tx) => {
    const turmaDoc = await tx.get(turmaRef);
    if (!turmaDoc.exists) throw new HttpsError("not-found", "Turma não encontrada.");
    
    if (turmaDoc.data()!.id_professor !== request.auth!.uid) {
      const papeis = request.auth!.token["roles"] as string[];
      if (!papeis.includes("Chefe_Geral")) {
        throw new HttpsError("permission-denied", "Você não é o dono desta turma.");
      }
    }

    const alunoTurmaRef = turmaRef.collection("Alunos").doc(idAluno);
    const alunoDoc = await tx.get(alunoTurmaRef);
    if (!alunoDoc.exists) {
      throw new HttpsError("not-found", "O aluno não está matriculado na turma.");
    }

    tx.delete(alunoTurmaRef);
    
    const alunoTurmaMirrorRef = db.collection("Usuarios").doc(idAluno).collection("Turmas").doc(idTurma);
    tx.delete(alunoTurmaMirrorRef);

    tx.set(turmaRef.collection("HistoricoAlunos").doc(), {
      id_aluno: idAluno,
      tipo: "exclusao_aluno",
      timestamp: FieldValue.serverTimestamp()
    });

    tx.update(turmaRef, {
      qtd_alunos: FieldValue.increment(-1)
    });

    const auditRef = db.collection("Registro_de_Auditoria").doc();
    tx.set(auditRef, {
      id_usuario: request.auth!.uid,
      acao: "Remover Aluno da Turma",
      tipo_entidade_sofre_acao: "ALUNO",
      id_do_objeto_da_entidade: idAluno,
      acao_feita_em: FieldValue.serverTimestamp(),
      metadata: { idTurma }
    });

    return { success: true };
  });
});

export const arquivarTurma = onCall(async (request) => {
  validarPermissao(request, ["Professor", "Chefe_Geral"]);
  const { idTurma } = validatePayload(ArquivarTurmaSchema, request.data);

  const db = admin.firestore();
  const turmaRef = db.collection("Turma").doc(idTurma);

  return db.runTransaction(async (tx) => {
    const turmaDoc = await tx.get(turmaRef);
    if (!turmaDoc.exists) throw new HttpsError("not-found", "Turma não encontrada.");
    
    if (turmaDoc.data()!.id_professor !== request.auth!.uid) {
      const papeis = request.auth!.token["roles"] as string[];
      if (!papeis.includes("Chefe_Geral")) {
        throw new HttpsError("permission-denied", "Você não é o dono desta turma.");
      }
    }

    tx.update(turmaRef, {
      status: "Arquivada"
    });

    const auditRef = db.collection("Registro_de_Auditoria").doc();
    tx.set(auditRef, {
      id_usuario: request.auth!.uid,
      acao: "Arquivar Turma",
      tipo_entidade_sofre_acao: "TURMA",
      id_do_objeto_da_entidade: idTurma,
      acao_feita_em: FieldValue.serverTimestamp(),
      metadata: {}
    });

    return { success: true };
  });
});

export const convidarAluno = onCall(async (request) => {
  validarPermissao(request, ["Professor", "Chefe_Geral"]);

  const { email, idTurma, matricula } = validatePayload(ConvidarAlunoSchema, request.data);
  const emailNormalizado = email.toLowerCase().trim();
  const db = admin.firestore();

  return db.runTransaction(async (tx) => {
    let queryRef = db.collection("Convite_Aluno")
      .where("email", "==", emailNormalizado)
      .where("status", "==", "pendente");
      
    if (idTurma) {
      queryRef = queryRef.where("id_turma", "==", idTurma);
    } else {
      queryRef = queryRef.where("id_turma", "==", null);
    }

    const snap = await tx.get(queryRef.limit(1));
    if (!snap.empty) {
      throw new HttpsError("already-exists", "Já existe um convite pendente para este email e turma.");
    }

    if (matricula) {
      const convitesMat = await tx.get(db.collection("Convite_Aluno").where("numero_matricula", "==", matricula).limit(1));
      if (!convitesMat.empty) {
        throw new HttpsError("already-exists", "Esta matrícula já possui um convite pendente.");
      }
      const usuariosMat = await tx.get(db.collection("Aluno").where("numero_matricula", "==", matricula).limit(1));
      if (!usuariosMat.empty) {
        throw new HttpsError("already-exists", "Esta matrícula já está cadastrada no sistema.");
      }
    }

    const docRef = db.collection("Convite_Aluno").doc();
    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + 7);

    tx.set(docRef, {
      id_turma: idTurma || null,
      email: emailNormalizado,
      convidado_em: FieldValue.serverTimestamp(),
      status: "pendente",
      expira_em: Timestamp.fromDate(expiraEm),
      convidado_por: request.auth!.uid,
      numero_matricula: matricula || null
    });

    return { id: docRef.id };
  });
});

export const adicionarAlunoExistenteTurma = onCall(async (request) => {
  const papeis = validarPermissao(request, ["Chefe_Geral", "Professor"]);
  const { idTurma, idAluno } = validatePayload(AdicionarAlunoExistenteTurmaSchema, request.data);

  const db = admin.firestore();
  const turmaRef = db.collection("Turma").doc(idTurma);
  const alunoRef = db.collection("Aluno").doc(idAluno); // NOTE: we fetch from Usuarios to get name/email

  return db.runTransaction(async (tx) => {
    // 1. Valida existência da turma
    const turmaSnap = await tx.get(turmaRef);
    if (!turmaSnap.exists) {
      throw new HttpsError("not-found", "Turma não encontrada.");
    }
    const turma = turmaSnap.data()!;

    // 2. Valida se o professor é o dono da turma (ou Chefe Geral)
    if (!papeis.includes("Chefe_Geral") && turma.id_professor !== request.auth!.uid) {
      throw new HttpsError("permission-denied", "Você não é o professor responsável por esta disciplina.");
    }

    if (turma.status === "Arquivada") {
      throw new HttpsError("failed-precondition", "Não é possível adicionar alunos em turmas arquivadas.");
    }

    // 3. Valida existência do aluno
    const alunoSnap = await tx.get(alunoRef);
    if (!alunoSnap.exists) {
      throw new HttpsError("not-found", "Aluno não encontrado no sistema.");
    }
    const alunoData = alunoSnap.data()!;

    // 4. Checa se o aluno já está matriculado
    const matriculaRef = turmaRef.collection("Alunos").doc(idAluno);
    const matriculaSnap = await tx.get(matriculaRef);
    if (matriculaSnap.exists) {
      throw new HttpsError("already-exists", "Este aluno já faz parte desta turma.");
    }

    // 5. Checa capacidade da turma (RN-TUR-01)
    const alunosAtuaisSnap = await tx.get(turmaRef.collection("Alunos"));
    if (alunosAtuaisSnap.size >= turma.capacidade) {
      throw new HttpsError("failed-precondition", `A turma atingiu a capacidade máxima de ${turma.capacidade} alunos.`);
    }

    const agora = FieldValue.serverTimestamp();

    // 6. Persistência atômica nos 3 pontos de dados:
    // A) Visão da Turma
    tx.set(matriculaRef, {
      id_aluno: idAluno,
      nome: alunoData.nome || "Sem nome",
      email: alunoData.email || "",
      numero_matricula: alunoData.numero_matricula || "",
      ingressou_em: agora,
      adicionado_por_professor: true,
    });

    // B) Visão do Aluno (Espelho para busca em tempo real)
    const alunoTurmaRef = db.collection("Usuarios").doc(idAluno).collection("Turmas").doc(idTurma);
    tx.set(alunoTurmaRef, {
      id_turma: idTurma,
      nome_turma: turma.nome_turma,
      nome_materia: turma.nome_materia,
      ano: turma.ano,
      semestre: turma.semestre,
      id_professor: turma.id_professor,
      ingressou_em: agora,
    });

    // C) Histórico da Turma
    const histRef = turmaRef.collection("HistoricoAlunos").doc();
    tx.set(histRef, {
      id_aluno: idAluno,
      tipo: "inclusao_aluno",
      responsavel_uid: request.auth!.uid,
      timestamp: agora,
    });

    // D) Notificação para o Aluno (Seção 4.36)
    const notifRef = db.collection("Usuarios").doc(idAluno).collection("Notificacoes").doc();
    tx.set(notifRef, {
      id_destinatario: idAluno,
      papel_destinatario: "Aluno",
      tipo: "ADICIONADO",
      id_quem_fez_acao: request.auth!.uid,
      id_turma: idTurma,
      entidade_alvo: "TURMA",
      id_alvo: idTurma,
      lida: false,
      emitida_em: agora,
      expira_em: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 dias
    });

    // Atualiza contagem na turma
    tx.update(turmaRef, {
      qtd_alunos: FieldValue.increment(1)
    });

    return { sucesso: true, idAluno, idTurma };
  });
});
