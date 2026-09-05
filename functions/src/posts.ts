import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { validarPermissao } from "./auth";

/**
 * Função para criar um Post.
 * Papéis permitidos: Professor
 */
export const criarPost = onCall(async (request) => {
  validarPermissao(request, ["Professor", "Chefe_Geral"]);

  const { idTurma, titulo, descricao, idRoteiroExperimento } = request.data as {
    idTurma: string;
    titulo: string;
    descricao: string;
    idRoteiroExperimento?: string;
  };

  if (!idTurma || !titulo || !descricao) {
    throw new HttpsError("invalid-argument", "Turma, título e descrição são obrigatórios.");
  }

  const db = admin.firestore();

  const turmaRef = db.collection("Turma").doc(idTurma);
  const turmaSnap = await turmaRef.get();

  if (!turmaSnap.exists) {
    throw new HttpsError("not-found", "Turma não encontrada.");
  }
  if (turmaSnap.data()?.id_professor !== request.auth!.uid) {
    throw new HttpsError("permission-denied", "Apenas o professor responsável pela turma pode criar posts.");
  }

  const postRef = turmaRef.collection("Posts").doc();

  await postRef.set({
    id_professor: request.auth!.uid,
    id_turma: idTurma,
    id_roteiro_experimento: idRoteiroExperimento || null,
    titulo,
    descricao,
    criado_em: admin.firestore.FieldValue.serverTimestamp()
  });

  return { id: postRef.id, titulo };
});

/**
 * Função para adicionar um Comentário a um Post.
 * Papéis permitidos: Professor ou Aluno (matriculado na turma).
 */
export const adicionarComentario = onCall(async (request) => {
  const authRoles = request.auth?.token.roles || [];
  if (!authRoles.includes("Professor") && !authRoles.includes("Chefe_Geral") && !authRoles.includes("Aluno")) {
    throw new HttpsError("permission-denied", "Apenas professores e alunos podem comentar.");
  }

  const { idTurma, idPost, texto } = request.data as {
    idTurma: string;
    idPost: string;
    texto: string;
  };

  if (!idTurma || !idPost || !texto) {
    throw new HttpsError("invalid-argument", "Turma, Post e texto são obrigatórios.");
  }

  const db = admin.firestore();

  // Validar se o usuário pode acessar a turma (se é o professor ou se é aluno matriculado)
  if (!authRoles.includes("Professor") && !authRoles.includes("Chefe_Geral")) {
    // É Aluno, verificar matrícula
    const alunoSnap = await db.collection("Turma").doc(idTurma).collection("Alunos").doc(request.auth!.uid).get();
    if (!alunoSnap.exists) {
      throw new HttpsError("permission-denied", "Você não está matriculado nesta turma.");
    }
  } else {
    // É professor ou chefe geral, verificar se é o dono da turma
    const turmaSnap = await db.collection("Turma").doc(idTurma).get();
    if (turmaSnap.data()?.id_professor !== request.auth!.uid) {
      throw new HttpsError("permission-denied", "Você não é o professor responsável desta turma.");
    }
  }

  const comentarioRef = db.collection("Turma").doc(idTurma).collection("Posts").doc(idPost).collection("Comentarios").doc();
  
  await comentarioRef.set({
    id_post: idPost,
    id_usuario: request.auth!.uid,
    texto,
    criado_em: admin.firestore.FieldValue.serverTimestamp()
  });

  return { id: comentarioRef.id };
});
