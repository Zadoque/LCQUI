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
exports.convidarUsuario = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("./auth");
const validation_1 = require("./utils/validation");
const usuarios_schema_1 = require("./schemas/usuarios.schema");
exports.convidarUsuario = (0, https_1.onCall)(async (request) => {
    (0, auth_1.validarPermissao)(request, ["Chefe_Geral"]);
    const { email, nome, papel, centro, laboratorio, materias } = (0, validation_1.validatePayload)(usuarios_schema_1.ConvidarUsuarioSchema, request.data);
    const db = admin.firestore();
    let userRecord;
    try {
        userRecord = await admin.auth().getUserByEmail(email);
    }
    catch (error) {
        if (error.code === 'auth/user-not-found') {
            userRecord = await admin.auth().createUser({
                email,
                displayName: nome,
            });
        }
        else {
            throw new https_1.HttpsError("internal", "Erro ao verificar usuário na autenticação.");
        }
    }
    const uid = userRecord.uid;
    // Add user to the corresponding collection
    const dataToSave = {
        nome,
        email,
        ativo: true,
        createdAt: firestore_1.FieldValue.serverTimestamp()
    };
    if (papel === "Aluno") {
        dataToSave.letra_inicial = nome.charAt(0).toUpperCase();
    }
    if (papel === "Professor") {
        dataToSave.centro = centro || "N/A";
        dataToSave.laboratorio = laboratorio || "N/A";
    }
    await db.collection(papel).doc(uid).set(dataToSave, { merge: true });
    if (papel === "Professor" && materias && materias.length > 0) {
        const batch = db.batch();
        for (const materiaId of materias) {
            const relRef = db.collection("Professor_x_Materia").doc();
            batch.set(relRef, {
                id_usuario: uid,
                id_materia: materiaId
            });
        }
        await batch.commit();
    }
    // Update Custom Claims
    await (0, auth_1.atualizarCustomClaims)(uid);
    // Generate Reset Link
    const resetLink = await admin.auth().generatePasswordResetLink(email);
    // Audit log
    await db.collection("Registro_de_Auditoria").add({
        id_usuario: request.auth.uid,
        acao: "Convidar Usuário",
        tipo_entidade_sofre_acao: "USUARIO",
        id_do_objeto_da_entidade: uid,
        acao_feita_em: firestore_1.FieldValue.serverTimestamp(),
        metadata: {
            email,
            papel
        }
    });
    return { resetLink, uid };
});
//# sourceMappingURL=usuarios.js.map