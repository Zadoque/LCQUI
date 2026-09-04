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
