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
exports.marcarNotificacaoComoLida = void 0;
exports.adicionarNotificacaoTx = adicionarNotificacaoTx;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const validation_1 = require("./utils/validation");
const zod_1 = require("zod");
/**
 * Adiciona uma notificação de forma transacional.
 * @param tx Transação Firestore
 * @param db Instância do Firestore
 * @param dados Dados validados da notificação
 */
function adicionarNotificacaoTx(tx, db, dados) {
    const notificacoesRef = db
        .collection("Usuarios")
        .doc(dados.id_destinatario)
        .collection("Notificacoes")
        .doc();
    // Expira em 30 dias por padrão
    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);
    tx.set(notificacoesRef, {
        id_destinatario: dados.id_destinatario,
        papel_destinatario: dados.papel_destinatario,
        tipo: dados.tipo,
        id_quem_fez_acao: dados.id_quem_fez_acao ?? null,
        id_turma: dados.id_turma ?? null,
        quantidade: dados.quantidade ?? null,
        entidade_alvo: dados.entidade_alvo,
        id_alvo: dados.id_alvo,
        mensagem_customizada: dados.mensagem_customizada ?? null,
        lida: false,
        lida_em: null,
        emitida_em: firestore_1.FieldValue.serverTimestamp(),
        expira_em: expiraEm,
    });
}
// Endpoint para marcar notificação como lida
exports.marcarNotificacaoComoLida = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Usuário não autenticado.");
    }
    const { idNotificacao } = (0, validation_1.validatePayload)(zod_1.z.object({ idNotificacao: zod_1.z.string().min(1) }), request.data);
    const notificacaoRef = admin
        .firestore()
        .collection("Usuarios")
        .doc(request.auth.uid)
        .collection("Notificacoes")
        .doc(idNotificacao);
    return admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(notificacaoRef);
        if (!snap.exists) {
            throw new https_1.HttpsError("not-found", "Notificação não encontrada.");
        }
        if (snap.data()?.lida) {
            return { success: true };
        }
        tx.update(notificacaoRef, {
            lida: true,
            lida_em: firestore_1.FieldValue.serverTimestamp(),
        });
        return { success: true };
    });
});
//# sourceMappingURL=notificacoes.js.map