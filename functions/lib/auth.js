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
exports.resolverPapeisDoToken = resolverPapeisDoToken;
exports.validarPermissao = validarPermissao;
exports.validarGestorDoAlmoxarifado = validarGestorDoAlmoxarifado;
exports.atualizarCustomClaims = atualizarCustomClaims;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
/**
 * Papéis lidos diretamente do JWT (Firebase Custom Claims).
 * Zero leituras extras no Firestore por chamada de API.
 * PREREQUISITO: toda mutação de papel deve chamar atualizarCustomClaims(uid).
 */
function resolverPapeisDoToken(auth) {
    if (!auth)
        return [];
    const roles = auth.token["roles"];
    if (!Array.isArray(roles))
        return [];
    return roles;
}
/**
 * Valida a permissão do usuário verificando os Custom Claims no JWT.
 * Lança um HttpsError se o usuário não estiver autenticado ou não tiver nenhum dos papéis permitidos.
 */
function validarPermissao(request, papeisPermitidos) {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "Usuário não autenticado.");
    }
    const papeis = resolverPapeisDoToken(request.auth);
    if (!papeisPermitidos.some((p) => papeis.includes(p))) {
        throw new https_1.HttpsError("permission-denied", "Usuário sem papel autorizado para esta ação.");
    }
    return papeis;
}
/**
 * Verifica se um usuário com o papel Gestor_Almoxarifado realmente
 * tem acesso de gestor ao almoxarifado especificado.
 * Um Chefe_Geral tem escopo global e passa nesta verificação automaticamente.
 */
async function validarGestorDoAlmoxarifado(uid, token, idAlmoxarifado) {
    const papeis = resolverPapeisDoToken({ token });
    if (papeis.includes("Chefe_Geral"))
        return; // Chefe tem escopo global
    if (!papeis.includes("Gestor_Almoxarifado")) {
        throw new https_1.HttpsError("permission-denied", "Usuário não é Gestor de Almoxarifado.");
    }
    // 1 leitura: o vínculo de escopo (não o papel - esse já veio do token)
    const vinculo = await admin.firestore().collection("Gestor_Almoxarifado_x_Almoxarifado")
        .where("id_gestor_almoxarifado", "==", uid)
        .where("id_almoxarifado", "==", idAlmoxarifado)
        .limit(1)
        .get();
    if (vinculo.empty) {
        throw new https_1.HttpsError("permission-denied", "Gestor não está designado para este almoxarifado.");
    }
}
/**
 * Chamada após TODA concessão ou remoção de papel.
 * Isso atualiza os custom claims e invalida o token atual.
 * O cliente precisará renovar o token chamando `user.getIdToken(true)`.
 */
async function atualizarCustomClaims(uid) {
    const colecoes = [
        "Chefe_Geral",
        "Gestor_Almoxarifado",
        "Gestor_Bens_Patrimoniais",
        "Professor",
        "Aluno",
        "Bolsista"
    ];
    const leituras = await Promise.all(colecoes.map((c) => admin.firestore().collection(c).doc(uid).get()));
    const roles = colecoes.filter((_, i) => leituras[i].exists);
    await admin.auth().setCustomUserClaims(uid, { roles });
}
//# sourceMappingURL=auth.js.map