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
exports.descompartilharRoteiro = exports.compartilharRoteiro = exports.registrarRoteiro = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("./auth");
const validation_1 = require("./utils/validation");
const roteiros_schema_1 = require("./schemas/roteiros.schema");
const notificacoes_1 = require("./notificacoes");
exports.registrarRoteiro = (0, https_1.onCall)(async (request) => {
    (0, auth_1.validarPermissao)(request, ["Professor"]);
    const dados = (0, validation_1.validatePayload)(roteiros_schema_1.RegistrarRoteiroSchema, request.data);
    const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc();
    await roteiroRef.set({
        id_professor: request.auth.uid,
        titulo: dados.titulo,
        descricao: dados.descricao ?? null,
        pdf_url: dados.pdf_url,
        criado_em: firestore_1.FieldValue.serverTimestamp(),
        compartilhado_com_emails: [] // array de emails
    });
    return { idRoteiro: roteiroRef.id };
});
exports.compartilharRoteiro = (0, https_1.onCall)(async (request) => {
    (0, auth_1.validarPermissao)(request, ["Professor"]);
    const { idRoteiro, emailCompartilhar } = (0, validation_1.validatePayload)(roteiros_schema_1.CompartilharRoteiroSchema, request.data);
    const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc(idRoteiro);
    return admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(roteiroRef);
        if (!snap.exists) {
            throw new https_1.HttpsError("not-found", "Roteiro não encontrado.");
        }
        const roteiro = snap.data();
        if (roteiro.id_professor !== request.auth.uid) {
            throw new https_1.HttpsError("permission-denied", "Somente o dono do roteiro pode compartilhá-lo.");
        }
        if (roteiro.compartilhado_com_emails && roteiro.compartilhado_com_emails.includes(emailCompartilhar)) {
            throw new https_1.HttpsError("already-exists", "O roteiro já está compartilhado com este e-mail.");
        }
        tx.update(roteiroRef, {
            compartilhado_com_emails: firestore_1.FieldValue.arrayUnion(emailCompartilhar)
        });
        // Encontrar o usuário que receberá para notificar
        const profSnap = await tx.get(admin.firestore().collection("Professor").where("email", "==", emailCompartilhar).limit(1));
        if (!profSnap.empty) {
            const profId = profSnap.docs[0].id;
            (0, notificacoes_1.adicionarNotificacaoTx)(tx, admin.firestore(), {
                id_destinatario: profId,
                papel_destinatario: "Professor",
                tipo: "ROTEIRO_COMPARTILHADO",
                id_quem_fez_acao: request.auth.uid,
                entidade_alvo: "Roteiro_Experimento",
                id_alvo: idRoteiro
            });
        }
        return { success: true };
    });
});
exports.descompartilharRoteiro = (0, https_1.onCall)(async (request) => {
    (0, auth_1.validarPermissao)(request, ["Professor"]);
    const { idRoteiro, emailDescompartilhar } = (0, validation_1.validatePayload)(roteiros_schema_1.DescompartilharRoteiroSchema, request.data);
    const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc(idRoteiro);
    return admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(roteiroRef);
        if (!snap.exists) {
            throw new https_1.HttpsError("not-found", "Roteiro não encontrado.");
        }
        const roteiro = snap.data();
        if (roteiro.id_professor !== request.auth.uid) {
            throw new https_1.HttpsError("permission-denied", "Somente o dono do roteiro pode remover o compartilhamento.");
        }
        tx.update(roteiroRef, {
            compartilhado_com_emails: firestore_1.FieldValue.arrayRemove(emailDescompartilhar)
        });
        return { success: true };
    });
});
//# sourceMappingURL=roteiros.js.map