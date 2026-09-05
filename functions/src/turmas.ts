import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { validarPermissao } from "./auth";

export const ingressarEmTurmaPorCodigo = onCall(async (request) => {
  validarPermissao(request, ["Aluno"]);
  const { codigoTurma } = request.data as { codigoTurma: string };

  const turmaSnap = await admin.firestore().collection("Turma")
    .where("codigo_turma", "==", codigoTurma)
    .where("status", "==", "Ativo")
    .limit(1).get();
  
  if (turmaSnap.empty) throw new HttpsError("not-found", "Turma não encontrada ou arquivada.");
  const turmaDoc = turmaSnap.docs[0];
  const turma = turmaDoc.data();

  return admin.firestore().runTransaction(async (tx) => {
    const alunosSnap = await tx.get(
      turmaDoc.ref.collection("Alunos")
    );
    if (alunosSnap.size >= turma.capacidade) {
      throw new HttpsError("failed-precondition", "Turma lotada.");
    }

    const jaMatriculado = alunosSnap.docs.some(
      (d) => d.id === request.auth!.uid
    );
    if (jaMatriculado) {
      throw new HttpsError("already-exists", "Você já está nesta turma.");
    }

    const historico = await tx.get(
      turmaDoc.ref.collection("HistoricoAlunos")
        .where("id_aluno", "==", request.auth!.uid)
        .where("tipo", "==", "exclusao_aluno")
        .limit(1)
    );
    if (!historico.empty) {
      throw new HttpsError("failed-precondition",
        "Você foi removido desta turma pelo professor. O re-ingresso requer convite explícito.");
    }

    tx.set(turmaDoc.ref.collection("Alunos").doc(request.auth!.uid), {
      id_aluno: request.auth!.uid,
      ingressou_em: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(turmaDoc.ref.collection("HistoricoAlunos").doc(), {
      id_aluno: request.auth!.uid,
      tipo: "inclusao_aluno",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { idTurma: turmaDoc.id, nomeTurma: turma.nome_turma };
  });
});

/**
 * Função para criar Turma garantindo unicidade do código.
 */
export const criarTurma = onCall(async (request) => {
  validarPermissao(request, ["Professor", "Chefe_Geral"]);

  const { idMateria, nomeTurma, ano, semestre, capacidade, nomeMateria } = request.data;
  if (!idMateria || !nomeTurma || !ano || !semestre || !capacidade || !nomeMateria) {
    throw new HttpsError("invalid-argument", "Dados incompletos para criar a turma.");
  }

  const db = admin.firestore();

  return db.runTransaction(async (tx) => {
    // Gerar código único de 6 caracteres (letras e números)
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
      nome_materia: nomeMateria, // Denorm para evitar join
      id_professor: request.auth!.uid,
      status: "Ativo",
      nome_turma: nomeTurma,
      ano: parseInt(ano, 10),
      semestre: parseInt(semestre, 10),
      capacidade: parseInt(capacidade, 10),
      codigo_turma: uniqueCode,
      data_criacao: admin.firestore.FieldValue.serverTimestamp()
    });

    return { id: docRef.id, codigoTurma: uniqueCode };
  });
});

/**
 * Convida um aluno por email para ingressar em uma turma
 * Ou convite global (sem turma).
 */
export const convidarAluno = onCall(async (request) => {
  validarPermissao(request, ["Professor", "Chefe_Geral"]);

  const { email, idTurma, matricula } = request.data as {
    email: string;
    idTurma?: string;
    matricula?: string;
  };

  if (!email) {
    throw new HttpsError("invalid-argument", "Email é obrigatório.");
  }
  const emailNormalizado = email.toLowerCase().trim();
  const db = admin.firestore();

  return db.runTransaction(async (tx) => {
    // Implementa: UNIQUE(email_normalizado, id_turma) WHERE status = 'pendente'
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
      throw new HttpsError("already-exists", "Já existe um convite pendente para este aluno nesta condição.");
    }

    const docRef = db.collection("Convite_Aluno").doc();
    
    // Prazo de 7 dias para expirar
    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + 7);

    tx.set(docRef, {
      id_turma: idTurma || null,
      email: emailNormalizado,
      convidado_em: admin.firestore.FieldValue.serverTimestamp(),
      status: "pendente",
      expira_em: admin.firestore.Timestamp.fromDate(expiraEm),
      convidado_por: request.auth!.uid,
      numero_matricula: matricula || null
    });

    return { 
      message: "Convite registrado com sucesso! (Modo Dev: Email não enviado)",
      id: docRef.id 
    };
  });
});
