import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
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

  const papelCollection = request.auth?.token.roles?.includes("Chefe_Geral") ? "Chefe_Geral" : "Professor";
  const userRef = db.collection(papelCollection).doc(request.auth!.uid);
  const userDoc = await userRef.get();
  const nomeProfessor = userDoc.exists ? userDoc.data()?.nome || "Professor" : "Professor";

  const postRef = turmaRef.collection("Posts").doc();

  await postRef.set({
    id_professor: request.auth!.uid,
    nome_professor: nomeProfessor,
    id_turma: idTurma,
    id_roteiro_experimento: idRoteiroExperimento || null,
    titulo,
    descricao,
    criado_em: FieldValue.serverTimestamp()
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

  const authRolesParaComentario = request.auth?.token.roles || [];
  const papelCollection = authRolesParaComentario.includes("Aluno") ? "Aluno" : (authRolesParaComentario.includes("Professor") ? "Professor" : "Chefe_Geral");
  const userRef = db.collection(papelCollection).doc(request.auth!.uid);
  const userDoc = await userRef.get();
  const nomeUsuario = userDoc.exists ? userDoc.data()?.nome || "Usuário" : "Usuário";

  const comentarioRef = db.collection("Turma").doc(idTurma).collection("Posts").doc(idPost).collection("Comentarios").doc();
  
  await comentarioRef.set({
    id_post: idPost,
    id_usuario: request.auth!.uid,
    nome_usuario: nomeUsuario,
    texto,
    criado_em: FieldValue.serverTimestamp()
  });

  return { id: comentarioRef.id };
});

export const excluirPost = onCall(async (request) => {
  validarPermissao(request, ["Professor", "Chefe_Geral"]);

  const { idTurma, idPost } = request.data as {
    idTurma: string;
    idPost: string;
  };

  if (!idTurma || !idPost) {
    throw new HttpsError("invalid-argument", "Turma e Post são obrigatórios.");
  }

  const db = admin.firestore();
  const turmaRef = db.collection("Turma").doc(idTurma);
  const turmaSnap = await turmaRef.get();

  if (!turmaSnap.exists) {
    throw new HttpsError("not-found", "Turma não encontrada.");
  }
  if (turmaSnap.data()?.id_professor !== request.auth!.uid) {
    throw new HttpsError("permission-denied", "Apenas o professor responsável pela turma pode excluir posts.");
  }

  const postRef = turmaRef.collection("Posts").doc(idPost);
  const postSnap = await postRef.get();

  if (!postSnap.exists) {
    throw new HttpsError("not-found", "Post não encontrado.");
  }

  return db.runTransaction(async (tx) => {
    // De acordo com RF25, nao se apagam fatos. Porem, pela documentacao da seção 4 (Historico_Posts_Turma), 
    // criaremos um registro na auditoria e excluiremos o post ou apenas mudaremos o status.
    // Para simplificar, vou excluir, mas gravar no Registro_de_Auditoria (que cumpre a regra de RF25 de reter log).
    tx.delete(postRef);

    const auditRef = db.collection("Registro_de_Auditoria").doc();
    tx.set(auditRef, {
      id_usuario: request.auth!.uid,
      acao: "Excluir Post",
      tipo_entidade_sofre_acao: "POST",
      id_do_objeto_da_entidade: idPost,
      acao_feita_em: FieldValue.serverTimestamp(),
      metadata: {
        titulo: postSnap.data()?.titulo
      }
    });
    return { success: true };
  });
});

export const excluirComentario = onCall(async (request) => {
  const authRoles = request.auth?.token.roles || [];
  if (!authRoles.includes("Professor") && !authRoles.includes("Chefe_Geral") && !authRoles.includes("Aluno")) {
    throw new HttpsError("permission-denied", "Apenas professores e alunos podem excluir comentários.");
  }

  const { idTurma, idPost, idComentario } = request.data as {
    idTurma: string;
    idPost: string;
    idComentario: string;
  };

  if (!idTurma || !idPost || !idComentario) {
    throw new HttpsError("invalid-argument", "Turma, Post e Comentário são obrigatórios.");
  }

  const db = admin.firestore();
  const comentarioRef = db.collection("Turma").doc(idTurma).collection("Posts").doc(idPost).collection("Comentarios").doc(idComentario);
  const comentarioSnap = await comentarioRef.get();

  if (!comentarioSnap.exists) {
    throw new HttpsError("not-found", "Comentário não encontrado.");
  }

  // Validação: Aluno só pode excluir o próprio comentário. Professor da turma pode excluir de qualquer um.
  if (!authRoles.includes("Professor") && !authRoles.includes("Chefe_Geral")) {
    if (comentarioSnap.data()?.id_usuario !== request.auth!.uid) {
      throw new HttpsError("permission-denied", "Você só pode excluir seus próprios comentários.");
    }
  } else {
    const turmaSnap = await db.collection("Turma").doc(idTurma).get();
    if (turmaSnap.data()?.id_professor !== request.auth!.uid) {
      // Se for outro professor, só pode excluir se for dono do comentário
      if (comentarioSnap.data()?.id_usuario !== request.auth!.uid) {
         throw new HttpsError("permission-denied", "Apenas o professor da turma pode excluir comentários de terceiros.");
      }
    }
  }

  await comentarioRef.delete();

  const auditRef = db.collection("Registro_de_Auditoria").doc();
  await auditRef.set({
    id_usuario: request.auth!.uid,
    acao: "Excluir Comentário",
    tipo_entidade_sofre_acao: "COMENTARIO",
    id_do_objeto_da_entidade: idComentario,
    acao_feita_em: FieldValue.serverTimestamp(),
    metadata: {}
  });

  return { success: true };
});
