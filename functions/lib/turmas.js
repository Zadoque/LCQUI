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
exports.convidarAluno = exports.arquivarTurma = exports.removerAlunoTurma = exports.criarTurma = exports.ingressarEmTurmaPorCodigo = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("./auth");
/**
 * RN-TUR-01: Controle de Capacidade da Turma
 * O ingresso exige que a quantidade de alunos seja estritamente menor que a capacidade.
 */
exports.ingressarEmTurmaPorCodigo = (0, https_1.onCall)(async (request) => {
    (0, auth_1.validarPermissao)(request, ["Aluno", "Bolsista"]);
    const { codigoTurma } = request.data;
    if (!codigoTurma)
        throw new https_1.HttpsError("invalid-argument", "Código da turma não fornecido.");
    const db = admin.firestore();
    const turmaSnap = await db.collection("Turma")
        .where("codigo_turma", "==", codigoTurma)
        .limit(1).get();
    if (turmaSnap.empty)
        throw new https_1.HttpsError("not-found", "Turma não encontrada.");
    const turmaRef = turmaSnap.docs[0].ref;
    return db.runTransaction(async (tx) => {
        const turmaDoc = await tx.get(turmaRef);
        if (!turmaDoc.exists)
            throw new https_1.HttpsError("not-found", "Turma sumiu.");
        const turma = turmaDoc.data();
        if (turma.status === "Arquivada") {
            throw new https_1.HttpsError("failed-precondition", "A turma está arquivada e não aceita novos alunos.");
        }
        const qtdAtual = turma.qtd_alunos || 0;
        if (qtdAtual >= turma.capacidade) {
            throw new https_1.HttpsError("failed-precondition", "A capacidade máxima da turma foi atingida.");
        }
        const alunoTurmaRef = turmaRef.collection("Alunos").doc(request.auth.uid);
        const alunoTurmaDoc = await tx.get(alunoTurmaRef);
        if (alunoTurmaDoc.exists) {
            throw new https_1.HttpsError("already-exists", "Você já está matriculado nesta turma.");
        }
        const historicoSnap = await tx.get(turmaRef.collection("HistoricoAlunos")
            .where("id_aluno", "==", request.auth.uid)
            .where("tipo", "==", "exclusao_aluno")
            .limit(1));
        if (!historicoSnap.empty) {
            throw new https_1.HttpsError("permission-denied", "Você foi removido pelo professor e não pode retornar pelo código.");
        }
        tx.set(alunoTurmaRef, {
            id_aluno: request.auth.uid,
            ingressou_em: firestore_1.FieldValue.serverTimestamp()
        });
        tx.set(turmaRef.collection("HistoricoAlunos").doc(), {
            id_aluno: request.auth.uid,
            tipo: "inclusao_aluno",
            timestamp: firestore_1.FieldValue.serverTimestamp()
        });
        tx.update(turmaRef, {
            qtd_alunos: firestore_1.FieldValue.increment(1)
        });
        return { idTurma: turmaDoc.id, nomeTurma: turma.nome_turma };
    });
});
exports.criarTurma = (0, https_1.onCall)(async (request) => {
    try {
        (0, auth_1.validarPermissao)(request, ["Professor", "Chefe_Geral"]);
        const { idMateria, nomeTurma, ano, semestre, capacidade, nomeMateria } = request.data;
        console.log("Recebido payload criarTurma:", request.data);
        if (!idMateria || !nomeTurma || !nomeMateria || !ano || !semestre || !capacidade) {
            throw new https_1.HttpsError("invalid-argument", "Dados incompletos para criar a turma.");
        }
        const anoNum = parseInt(ano, 10);
        const semestreNum = parseInt(semestre, 10);
        const capacidadeNum = parseInt(capacidade, 10);
        if (isNaN(anoNum) || anoNum < 2000)
            throw new https_1.HttpsError("invalid-argument", "Ano inválido.");
        if (isNaN(semestreNum) || (semestreNum !== 1 && semestreNum !== 2))
            throw new https_1.HttpsError("invalid-argument", "Semestre deve ser 1 ou 2.");
        if (isNaN(capacidadeNum) || capacidadeNum <= 0)
            throw new https_1.HttpsError("invalid-argument", "Capacidade deve ser positiva.");
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
                const query = await tx.get(db.collection("Turma").where("codigo_turma", "==", tempCode).limit(1));
                if (query.empty) {
                    uniqueCode = tempCode;
                    codeIsUnique = true;
                }
                attempts++;
            }
            if (!codeIsUnique) {
                throw new https_1.HttpsError("internal", "Não foi possível gerar um código único. Tente novamente.");
            }
            const docRef = db.collection("Turma").doc();
            tx.set(docRef, {
                id_materia: idMateria,
                nome_materia: nomeMateria,
                id_professor: request.auth.uid,
                status: "Ativo",
                nome_turma: nomeTurma,
                ano: anoNum,
                semestre: semestreNum,
                capacidade: capacidadeNum,
                qtd_alunos: 0,
                codigo_turma: uniqueCode,
                data_criacao: firestore_1.FieldValue.serverTimestamp()
            });
            return { id: docRef.id, codigoTurma: uniqueCode };
        });
    }
    catch (error) {
        console.error("ERRO FATAL NO BACKEND (criarTurma):", error);
        throw new https_1.HttpsError("internal", `ERRO INTERNO: ${error?.message || error}`);
    }
});
exports.removerAlunoTurma = (0, https_1.onCall)(async (request) => {
    (0, auth_1.validarPermissao)(request, ["Professor", "Chefe_Geral"]);
    const { idTurma, idAluno } = request.data;
    if (!idTurma || !idAluno)
        throw new https_1.HttpsError("invalid-argument", "Faltam parâmetros.");
    const db = admin.firestore();
    const turmaRef = db.collection("Turma").doc(idTurma);
    return db.runTransaction(async (tx) => {
        const turmaDoc = await tx.get(turmaRef);
        if (!turmaDoc.exists)
            throw new https_1.HttpsError("not-found", "Turma não encontrada.");
        if (turmaDoc.data().id_professor !== request.auth.uid) {
            const papeis = request.auth.token["roles"];
            if (!papeis.includes("Chefe_Geral")) {
                throw new https_1.HttpsError("permission-denied", "Você não é o dono desta turma.");
            }
        }
        const alunoTurmaRef = turmaRef.collection("Alunos").doc(idAluno);
        const alunoDoc = await tx.get(alunoTurmaRef);
        if (!alunoDoc.exists) {
            throw new https_1.HttpsError("not-found", "O aluno não está matriculado na turma.");
        }
        tx.delete(alunoTurmaRef);
        tx.set(turmaRef.collection("HistoricoAlunos").doc(), {
            id_aluno: idAluno,
            tipo: "exclusao_aluno",
            timestamp: firestore_1.FieldValue.serverTimestamp()
        });
        tx.update(turmaRef, {
            qtd_alunos: firestore_1.FieldValue.increment(-1)
        });
        const auditRef = db.collection("Registro_de_Auditoria").doc();
        tx.set(auditRef, {
            id_usuario: request.auth.uid,
            acao: "Remover Aluno da Turma",
            tipo_entidade_sofre_acao: "ALUNO",
            id_do_objeto_da_entidade: idAluno,
            acao_feita_em: firestore_1.FieldValue.serverTimestamp(),
            metadata: { idTurma }
        });
        return { success: true };
    });
});
exports.arquivarTurma = (0, https_1.onCall)(async (request) => {
    (0, auth_1.validarPermissao)(request, ["Professor", "Chefe_Geral"]);
    const { idTurma } = request.data;
    if (!idTurma)
        throw new https_1.HttpsError("invalid-argument", "idTurma obrigatório.");
    const db = admin.firestore();
    const turmaRef = db.collection("Turma").doc(idTurma);
    return db.runTransaction(async (tx) => {
        const turmaDoc = await tx.get(turmaRef);
        if (!turmaDoc.exists)
            throw new https_1.HttpsError("not-found", "Turma não encontrada.");
        if (turmaDoc.data().id_professor !== request.auth.uid) {
            const papeis = request.auth.token["roles"];
            if (!papeis.includes("Chefe_Geral")) {
                throw new https_1.HttpsError("permission-denied", "Você não é o dono desta turma.");
            }
        }
        tx.update(turmaRef, {
            status: "Arquivada"
        });
        const auditRef = db.collection("Registro_de_Auditoria").doc();
        tx.set(auditRef, {
            id_usuario: request.auth.uid,
            acao: "Arquivar Turma",
            tipo_entidade_sofre_acao: "TURMA",
            id_do_objeto_da_entidade: idTurma,
            acao_feita_em: firestore_1.FieldValue.serverTimestamp(),
            metadata: {}
        });
        return { success: true };
    });
});
exports.convidarAluno = (0, https_1.onCall)(async (request) => {
    (0, auth_1.validarPermissao)(request, ["Professor", "Chefe_Geral"]);
    const { email, idTurma, matricula } = request.data;
    if (!email) {
        throw new https_1.HttpsError("invalid-argument", "Email é obrigatório.");
    }
    const emailNormalizado = email.toLowerCase().trim();
    const db = admin.firestore();
    return db.runTransaction(async (tx) => {
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
            throw new https_1.HttpsError("already-exists", "Já existe um convite pendente.");
        }
        const docRef = db.collection("Convite_Aluno").doc();
        const expiraEm = new Date();
        expiraEm.setDate(expiraEm.getDate() + 7);
        tx.set(docRef, {
            id_turma: idTurma || null,
            email: emailNormalizado,
            convidado_em: firestore_1.FieldValue.serverTimestamp(),
            status: "pendente",
            expira_em: firestore_1.Timestamp.fromDate(expiraEm),
            convidado_por: request.auth.uid,
            numero_matricula: matricula || null
        });
        return { id: docRef.id };
    });
});
//# sourceMappingURL=turmas.js.map