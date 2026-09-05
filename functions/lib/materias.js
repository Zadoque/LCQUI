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
exports.criarMateria = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
/**
 * Função para criar uma Matéria garantindo que o código da matéria seja único.
 * Papéis permitidos: Chefe_Geral ou Professor
 */
exports.criarMateria = (0, https_1.onCall)(async (request) => {
    const authRoles = request.auth?.token.roles || [];
    if (!authRoles.includes("Chefe_Geral") && !authRoles.includes("Professor")) {
        throw new https_1.HttpsError("permission-denied", "Apenas o Chefe Geral ou Professor podem criar matérias.");
    }
    const { nome, codigoMateria } = request.data;
    if (!nome || !codigoMateria) {
        throw new https_1.HttpsError("invalid-argument", "Nome e código da matéria são obrigatórios.");
    }
    const db = admin.firestore();
    // Transação para garantir unicidade do código
    return db.runTransaction(async (tx) => {
        const materiasQuery = await tx.get(db.collection("Materia").where("codigo_materia", "==", codigoMateria).limit(1));
        if (!materiasQuery.empty) {
            throw new https_1.HttpsError("already-exists", "Já existe uma matéria com este código.");
        }
        const docRef = db.collection("Materia").doc();
        tx.set(docRef, {
            nome,
            codigo_materia: codigoMateria,
            criado_em: admin.firestore.FieldValue.serverTimestamp(),
            criado_por: request.auth?.uid
        });
        return { id: docRef.id, nome, codigoMateria };
    });
});
//# sourceMappingURL=materias.js.map