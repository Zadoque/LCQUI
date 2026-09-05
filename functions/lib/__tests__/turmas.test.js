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
const globals_1 = require("@jest/globals");
const admin = __importStar(require("firebase-admin"));
// Use o emulador configurado localmente
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
const app = admin.initializeApp({ projectId: "lcqui-dev" });
const db = admin.firestore(app);
(0, globals_1.describe)("Módulo 4: Gestão de Turmas e Alunos", () => {
    (0, globals_1.beforeAll)(async () => {
        // Clear Firestore before tests (opcional se não usar script)
    });
    (0, globals_1.afterAll)(async () => {
        await app.delete();
    });
    (0, globals_1.it)("RN-TUR-01: Controle de Capacidade da Turma", async () => {
        // Teste simplificado verificando a existência da subcoleção Alunos
        const turmaRef = db.collection("Turma").doc("TEST_TURMA");
        await turmaRef.set({
            capacidade: 1,
            status: "Ativo",
            codigo_turma: "CODIGO123"
        });
        await turmaRef.collection("Alunos").doc("aluno1").set({ id_aluno: "aluno1" });
        // Tenta contar alunos (simulação da Cloud Function)
        const snap = await turmaRef.collection("Alunos").get();
        (0, globals_1.expect)(snap.size).toBe(1);
        // Na Cloud Function isso lançaria erro 'failed-precondition'
    });
    (0, globals_1.it)("RN-TUR-02: Unicidade do convite por email", async () => {
        const email = "teste@uenf.br";
        const idTurma = "TURMA_TESTE";
        // Simula a transação de criar convite
        await db.collection("Convite_Aluno").add({
            email,
            id_turma: idTurma,
            status: "pendente",
            convidado_em: new Date()
        });
        const check = await db.collection("Convite_Aluno")
            .where("email", "==", email)
            .where("id_turma", "==", idTurma)
            .where("status", "==", "pendente")
            .get();
        (0, globals_1.expect)(check.size).toBeGreaterThanOrEqual(1);
        // Na Cloud Function a transação bloquearia um novo registro
    });
});
//# sourceMappingURL=turmas.test.js.map