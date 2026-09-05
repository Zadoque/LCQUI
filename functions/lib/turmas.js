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
exports.convidarAluno = exports.criarTurma = exports.ingressarEmTurmaPorCodigo = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("./auth");
exports.ingressarEmTurmaPorCodigo = (0, https_1.onCall)(async (request) => {
    (0, auth_1.validarPermissao)(request, ["Aluno"]);
    const { codigoTurma } = request.data;
    const turmaSnap = await admin.firestore().collection("Turma")
        .where("codigo_turma", "==", codigoTurma)
        .where("status", "==", "Ativo")
        .limit(1).get();
    if (turmaSnap.empty)
        throw new https_1.HttpsError("not-found", "Turma não encontrada ou arquivada.");
    const turmaDoc = turmaSnap.docs[0];
    const turma = turmaDoc.data();
    return admin.firestore().runTransaction(async (tx) => {
        const alunosSnap = await tx.get(turmaDoc.ref.collection("Alunos"));
        if (alunosSnap.size >= turma.capacidade) {
            throw new https_1.HttpsError("failed-precondition", "Turma lotada.");
        }
        const jaMatriculado = alunosSnap.docs.some((d) => d.id === request.auth.uid);
        if (jaMatriculado) {
            throw new https_1.HttpsError("already-exists", "Você já está nesta turma.");
        }
        const historico = await tx.get(turmaDoc.ref.collection("HistoricoAlunos")
            .where("id_aluno", "==", request.auth.uid)
            .where("tipo", "==", "exclusao_aluno")
            .limit(1));
        if (!historico.empty) {
            throw new https_1.HttpsError("failed-precondition", "Você foi removido desta turma pelo professor. O re-ingresso requer convite explícito.");
        }
        tx.set(turmaDoc.ref.collection("Alunos").doc(request.auth.uid), {
            id_aluno: request.auth.uid,
            ingressou_em: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.set(turmaDoc.ref.collection("HistoricoAlunos").doc(), {
            id_aluno: request.auth.uid,
            tipo: "inclusao_aluno",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { idTurma: turmaDoc.id, nomeTurma: turma.nome_turma };
    });
});
/**
 * Função para criar Turma garantindo unicidade do código.
 */
exports.criarTurma = (0, https_1.onCall)(async (request) => {
    (0, auth_1.validarPermissao)(request, ["Professor", "Chefe_Geral"]);
    const { idMateria, nomeTurma, ano, semestre, capacidade, codigoTurma, nomeMateria } = request.data;
    if (!idMateria || !nomeTurma || !ano || !semestre || !capacidade || !codigoTurma || !nomeMateria) {
        throw new https_1.HttpsError("invalid-argument", "Dados incompletos para criar a turma.");
    }
    const db = admin.firestore();
    return db.runTransaction(async (tx) => {
        // Checar se código já existe
        const query = await tx.get(db.collection("Turma").where("codigo_turma", "==", codigoTurma).limit(1));
        if (!query.empty) {
            throw new https_1.HttpsError("already-exists", "Já existe uma turma com este código.");
        }
        const docRef = db.collection("Turma").doc();
        tx.set(docRef, {
            id_materia: idMateria,
            nome_materia: nomeMateria, // Denorm para evitar join
            id_professor: request.auth.uid,
            status: "Ativo",
            nome_turma: nomeTurma,
            ano: parseInt(ano, 10),
            semestre: parseInt(semestre, 10),
            capacidade: parseInt(capacidade, 10),
            codigo_turma: codigoTurma,
            data_criacao: admin.firestore.FieldValue.serverTimestamp()
        });
        return { id: docRef.id, codigoTurma };
    });
});
/**
 * Convida um aluno por email para ingressar em uma turma
 * Ou convite global (sem turma).
 */
exports.convidarAluno = (0, https_1.onCall)(async (request) => {
    (0, auth_1.validarPermissao)(request, ["Professor", "Chefe_Geral"]);
    const { email, idTurma, matricula } = request.data;
    if (!email) {
        throw new https_1.HttpsError("invalid-argument", "Email é obrigatório.");
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
        }
        else {
            queryRef = queryRef.where("id_turma", "==", null);
        }
        const snap = await tx.get(queryRef.limit(1));
        if (!snap.empty) {
            throw new https_1.HttpsError("already-exists", "Já existe um convite pendente para este aluno nesta condição.");
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
            convidado_por: request.auth.uid,
            numero_matricula: matricula || null
        });
        return {
            message: "Convite registrado com sucesso! (Modo Dev: Email não enviado)",
            id: docRef.id
        };
    });
});
//# sourceMappingURL=turmas.js.map