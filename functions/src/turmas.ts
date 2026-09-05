import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { validarPermissao } from "./auth";

/**
 * RN-TUR-01: Controle de Capacidade da Turma
 * O ingresso exige que a quantidade de alunos seja estritamente menor que a capacidade.
 */
export const ingressarEmTurmaPorCodigo = onCall(async (request) => {
  validarPermissao(request, ["Aluno", "Bolsista"]);
  
  const { codigoTurma } = request.data as { codigoTurma: string };
  if (!codigoTurma) throw new HttpsError("invalid-argument", "Código da turma não fornecido.");

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

    tx.set(alunoTurmaRef, {
      id_aluno: request.auth!.uid,
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

    const { idMateria, nomeTurma, ano, semestre, capacidade, nomeMateria } = request.data;
    console.log("Recebido payload criarTurma:", request.data);
    
    if (!idMateria || !nomeTurma || !nomeMateria || !ano || !semestre || !capacidade) {
      throw new HttpsError("invalid-argument", "Dados incompletos para criar a turma.");
    }

    const anoNum = parseInt(ano, 10);
    const semestreNum = parseInt(semestre, 10);
    const capacidadeNum = parseInt(capacidade, 10);

    if (isNaN(anoNum) || anoNum < 2000) throw new HttpsError("invalid-argument", "Ano inválido.");
    if (isNaN(semestreNum) || (semestreNum !== 1 && semestreNum !== 2)) throw new HttpsError("invalid-argument", "Semestre deve ser 1 ou 2.");
    if (isNaN(capacidadeNum) || capacidadeNum <= 0) throw new HttpsError("invalid-argument", "Capacidade deve ser positiva.");

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
        id_professor: request.auth!.uid,
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
  
  const { idTurma, idAluno } = request.data as { idTurma: string, idAluno: string };
  if (!idTurma || !idAluno) throw new HttpsError("invalid-argument", "Faltam parâmetros.");

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
  const { idTurma } = request.data as { idTurma: string };
  if (!idTurma) throw new HttpsError("invalid-argument", "idTurma obrigatório.");

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
      throw new HttpsError("already-exists", "Já existe um convite pendente.");
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
