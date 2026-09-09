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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";
const admin = __importStar(require("firebase-admin"));
const firebase_functions_test_1 = __importDefault(require("firebase-functions-test"));
const usuarios_1 = require("../../usuarios");
const testEnv = (0, firebase_functions_test_1.default)({ projectId: "lcqui-dev" });
describe("Integração: Múltiplos Papéis (convidarUsuario)", () => {
    let db;
    beforeAll(() => {
        if (!admin.apps.length) {
            admin.initializeApp({ projectId: "lcqui-dev" });
        }
        db = admin.firestore();
    });
    afterAll(async () => {
        testEnv.cleanup();
    });
    const mockRequest = (data, uid, roles = ["Chefe_Geral"]) => ({
        data,
        auth: {
            uid,
            token: { roles }
        },
        rawRequest: {}
    });
    it("deve bloquear a atribuição de Professor para um usuário que já é Aluno, sem poluir Firestore", async () => {
        const wrapped = testEnv.wrap(usuarios_1.convidarUsuario);
        // Configurar o estado inicial no Firestore
        const userEmail = "aluno_teste_multi@example.com";
        // Primeiro, vamos criar o user no Firebase Auth emulator
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(userEmail);
        }
        catch (e) {
            userRecord = await admin.auth().createUser({
                email: userEmail,
                displayName: "Aluno Teste Multi"
            });
        }
        // Adiciona como Aluno no Firestore
        await db.collection("Aluno").doc(userRecord.uid).set({
            nome: "Aluno Teste Multi",
            email: userEmail
        });
        const req = mockRequest({
            email: userEmail,
            nome: "Aluno Teste Multi",
            papel: "Professor",
            centro: "CCT",
            laboratorio: "Lab 1"
        }, "chefe123");
        // Tentativa de adicionar papel incompatível
        await expect(wrapped(req)).rejects.toThrow("O usuário que é aluno não pode ser professor.");
        // Verifica que não poluiu o Firestore
        const professorDoc = await db.collection("Professor").doc(userRecord.uid).get();
        expect(professorDoc.exists).toBe(false);
    });
    it("deve desativar o usuário ao revogar seu último papel e manter em Usuarios com ativo = false", async () => {
        const { revogarUsuarioPapel } = require("../../usuarios");
        const wrapped = testEnv.wrap(revogarUsuarioPapel);
        const userEmail = "aluno_revogar_unico@example.com";
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(userEmail);
        }
        catch (e) {
            userRecord = await admin.auth().createUser({
                email: userEmail,
                displayName: "Aluno Para Revogar"
            });
        }
        // O usuário é APENAS Aluno
        await db.collection("Aluno").doc(userRecord.uid).set({
            nome: "Aluno Para Revogar",
            email: userEmail
        });
        // Simulando que ele também existe na coleção central Usuarios
        await db.collection("Usuarios").doc(userRecord.uid).set({
            nome: "Aluno Para Revogar",
            email: userEmail,
            ativo: true
        });
        const req = mockRequest({
            email: userEmail,
            papel: "Aluno",
            motivo: "Fim do curso"
        }, "chefe123");
        const result = await wrapped(req);
        // O retorno deve indicar que a conta foi desativada (ativo: false)
        expect(result.ativo).toBe(false);
        expect(result.uid).toBe(userRecord.uid);
        // Verifica que apagou da coleção do Papel
        const alunoDoc = await db.collection("Aluno").doc(userRecord.uid).get();
        expect(alunoDoc.exists).toBe(false);
        // Verifica que a identidade permaneceu em Usuarios, mas inativa
        const usuarioCentralDoc = await db.collection("Usuarios").doc(userRecord.uid).get();
        expect(usuarioCentralDoc.exists).toBe(true);
        expect(usuarioCentralDoc.data()?.ativo).toBe(false);
    });
});
//# sourceMappingURL=usuarios.integration.test.js.map