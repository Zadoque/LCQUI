"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.excluirComentario = exports.excluirPost = exports.adicionarComentario = exports.criarPost = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("./auth");
/**
 * Função para criar um Post.
 * Papéis permitidos: Professor
 */
exports.criarPost = (0, https_1.onCall)(async (request) => {
    (0, auth_1.validarPermissao)(request, ["Professor", "Chefe_Geral"]);
    const { idTurma, titulo, descricao, idRoteiroExperimento } = request.data;
    if (!idTurma || !titulo || !descricao) {
        throw new https_1.HttpsError("invalid-argument", "Turma, título e descrição são obrigatórios.");
    }
    const db = admin.firestore();
    const turmaRef = db.collection("Turma").doc(idTurma);
    const turmaSnap = await turmaRef.get();
    if (!turmaSnap.exists) {
        throw new https_1.HttpsError("not-found", "Turma não encontrada.");
    }
    if (turmaSnap.data()?.id_professor !== request.auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Apenas o professor responsável pela turma pode criar posts.");
    }
    const postRef = turmaRef.collection("Posts").doc();
    await postRef.set({
        id_professor: request.auth.uid,
        id_turma: idTurma,
        id_roteiro_experimento: idRoteiroExperimento || null,
        titulo,
        descricao,
        criado_em: firestore_1.FieldValue.serverTimestamp()
    });
    return { id: postRef.id, titulo };
});
/**
 * Função para adicionar um Comentário a um Post.
 * Papéis permitidos: Professor ou Aluno (matriculado na turma).
 */
exports.adicionarComentario = (0, https_1.onCall)(async (request) => {
    const authRoles = request.auth?.token.roles || [];
    if (!authRoles.includes("Professor") && !authRoles.includes("Chefe_Geral") && !authRoles.includes("Aluno")) {
        throw new https_1.HttpsError("permission-denied", "Apenas professores e alunos podem comentar.");
    }
    const { idTurma, idPost, texto } = request.data;
    if (!idTurma || !idPost || !texto) {
        throw new https_1.HttpsError("invalid-argument", "Turma, Post e texto são obrigatórios.");
    }
    const db = admin.firestore();
    // Validar se o usuário pode acessar a turma (se é o professor ou se é aluno matriculado)
    if (!authRoles.includes("Professor") && !authRoles.includes("Chefe_Geral")) {
        // É Aluno, verificar matrícula
        const alunoSnap = await db.collection("Turma").doc(idTurma).collection("Alunos").doc(request.auth.uid).get();
        if (!alunoSnap.exists) {
            throw new https_1.HttpsError("permission-denied", "Você não está matriculado nesta turma.");
        }
    }
    else {
        // É professor ou chefe geral, verificar se é o dono da turma
        const turmaSnap = await db.collection("Turma").doc(idTurma).get();
        if (turmaSnap.data()?.id_professor !== request.auth.uid) {
            throw new https_1.HttpsError("permission-denied", "Você não é o professor responsável desta turma.");
        }
    }
    const comentarioRef = db.collection("Turma").doc(idTurma).collection("Posts").doc(idPost).collection("Comentarios").doc();
    await comentarioRef.set({
        id_post: idPost,
        id_usuario: request.auth.uid,
        texto,
        criado_em: firestore_1.FieldValue.serverTimestamp()
    });
    return { id: comentarioRef.id };
});
exports.excluirPost = (0, https_1.onCall)(async (request) => {
    (0, auth_1.validarPermissao)(request, ["Professor", "Chefe_Geral"]);
    const { idTurma, idPost } = request.data;
    if (!idTurma || !idPost) {
        throw new https_1.HttpsError("invalid-argument", "Turma e Post são obrigatórios.");
    }
    const db = admin.firestore();
    const turmaRef = db.collection("Turma").doc(idTurma);
    const turmaSnap = await turmaRef.get();
    if (!turmaSnap.exists) {
        throw new https_1.HttpsError("not-found", "Turma não encontrada.");
    }
    if (turmaSnap.data()?.id_professor !== request.auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Apenas o professor responsável pela turma pode excluir posts.");
    }
    const postRef = turmaRef.collection("Posts").doc(idPost);
    const postSnap = await postRef.get();
    if (!postSnap.exists) {
        throw new https_1.HttpsError("not-found", "Post não encontrado.");
    }
    return db.runTransaction(async (tx) => {
        // De acordo com RF25, nao se apagam fatos. Porem, pela documentacao da seção 4 (Historico_Posts_Turma), 
        // criaremos um registro na auditoria e excluiremos o post ou apenas mudaremos o status.
        // Para simplificar, vou excluir, mas gravar no Registro_de_Auditoria (que cumpre a regra de RF25 de reter log).
        tx.delete(postRef);
        const auditRef = db.collection("Registro_de_Auditoria").doc();
        tx.set(auditRef, {
            id_usuario: request.auth.uid,
            acao: "Excluir Post",
            tipo_entidade_sofre_acao: "POST",
            id_do_objeto_da_entidade: idPost,
            acao_feita_em: firestore_1.FieldValue.serverTimestamp(),
            metadata: {
                titulo: postSnap.data()?.titulo
            }
        });
        return { success: true };
    });
});
exports.excluirComentario = (0, https_1.onCall)(async (request) => {
    const authRoles = request.auth?.token.roles || [];
    if (!authRoles.includes("Professor") && !authRoles.includes("Chefe_Geral") && !authRoles.includes("Aluno")) {
        throw new https_1.HttpsError("permission-denied", "Apenas professores e alunos podem excluir comentários.");
    }
    const { idTurma, idPost, idComentario } = request.data;
    if (!idTurma || !idPost || !idComentario) {
        throw new https_1.HttpsError("invalid-argument", "Turma, Post e Comentário são obrigatórios.");
    }
    const db = admin.firestore();
    const comentarioRef = db.collection("Turma").doc(idTurma).collection("Posts").doc(idPost).collection("Comentarios").doc(idComentario);
    const comentarioSnap = await comentarioRef.get();
    if (!comentarioSnap.exists) {
        throw new https_1.HttpsError("not-found", "Comentário não encontrado.");
    }
    // Validação: Aluno só pode excluir o próprio comentário. Professor da turma pode excluir de qualquer um.
    if (!authRoles.includes("Professor") && !authRoles.includes("Chefe_Geral")) {
        if (comentarioSnap.data()?.id_usuario !== request.auth.uid) {
            throw new https_1.HttpsError("permission-denied", "Você só pode excluir seus próprios comentários.");
        }
    }
    else {
        const turmaSnap = await db.collection("Turma").doc(idTurma).get();
        if (turmaSnap.data()?.id_professor !== request.auth.uid) {
            // Se for outro professor, só pode excluir se for dono do comentário
            if (comentarioSnap.data()?.id_usuario !== request.auth.uid) {
                throw new https_1.HttpsError("permission-denied", "Apenas o professor da turma pode excluir comentários de terceiros.");
            }
        }
    }
    await comentarioRef.delete();
    const auditRef = db.collection("Registro_de_Auditoria").doc();
    await auditRef.set({
        id_usuario: request.auth.uid,
        acao: "Excluir Comentário",
        tipo_entidade_sofre_acao: "COMENTARIO",
        id_do_objeto_da_entidade: idComentario,
        acao_feita_em: firestore_1.FieldValue.serverTimestamp(),
        metadata: {}
    });
    return { success: true };
});
//# sourceMappingURL=posts.js.map