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
const roteiros_1 = require("../roteiros");
const testEnv = (0, firebase_functions_test_1.default)({ projectId: "lcqui-dev" });
describe("Módulo de Roteiros", () => {
    let db;
    beforeAll(() => {
        if (!admin.apps.length) {
            admin.initializeApp({ projectId: "lcqui-dev" });
        }
        db = admin.firestore();
    });
    afterAll(() => {
        testEnv.cleanup();
    });
    const mockRequest = (data, uid, roles = ["Professor"]) => ({
        data,
        auth: {
            uid,
            token: { roles }
        },
        rawRequest: {}
    });
    it("deve permitir que um professor registre um roteiro", async () => {
        const wrapped = testEnv.wrap(roteiros_1.registrarRoteiro);
        const result = await wrapped(mockRequest({
            titulo: "Roteiro de Titulação",
            descricao: "Titulação ácido-base",
            pdf_url: "https://example.com/roteiro.pdf"
        }, "prof1"));
        expect(result.idRoteiro).toBeDefined();
        const roteiroSnap = await db.collection("Roteiro_Experimento").doc(result.idRoteiro).get();
        expect(roteiroSnap.exists).toBe(true);
        expect(roteiroSnap.data()?.id_professor).toBe("prof1");
        expect(roteiroSnap.data()?.titulo).toBe("Roteiro de Titulação");
        expect(roteiroSnap.data()?.compartilhado_com_emails).toEqual([]);
    });
    it("deve permitir compartilhar roteiro apenas se for o dono e enviar notificação", async () => {
        const wrappedReg = testEnv.wrap(roteiros_1.registrarRoteiro);
        const resultReg = await wrappedReg(mockRequest({
            titulo: "Roteiro 2",
            pdf_url: "https://example.com/roteiro2.pdf"
        }, "prof2"));
        await db.collection("Professor").doc("prof_alvo").set({
            nome: "Prof Alvo", email: "alvo@ufsc.br"
        });
        const wrappedComp = testEnv.wrap(roteiros_1.compartilharRoteiro);
        // Tenta compartilhar com outro prof (diferente do dono) -> Falha
        await expect(wrappedComp(mockRequest({
            idRoteiro: resultReg.idRoteiro,
            emailCompartilhar: "alvo@ufsc.br"
        }, "prof_errado"))).rejects.toThrow(/Somente o dono/i);
        // Compartilha corretamente
        await wrappedComp(mockRequest({
            idRoteiro: resultReg.idRoteiro,
            emailCompartilhar: "alvo@ufsc.br"
        }, "prof2"));
        const roteiroSnap = await db.collection("Roteiro_Experimento").doc(resultReg.idRoteiro).get();
        expect(roteiroSnap.data()?.compartilhado_com_emails).toContain("alvo@ufsc.br");
        const notifSnap = await db.collection("Usuarios").doc("prof_alvo").collection("Notificacoes")
            .where("tipo", "==", "ROTEIRO_COMPARTILHADO").get();
        expect(notifSnap.empty).toBe(false);
    });
    it("deve permitir descompartilhar roteiro", async () => {
        const wrappedReg = testEnv.wrap(roteiros_1.registrarRoteiro);
        const resultReg = await wrappedReg(mockRequest({
            titulo: "Roteiro 3",
            pdf_url: "https://example.com/roteiro3.pdf"
        }, "prof3"));
        const wrappedComp = testEnv.wrap(roteiros_1.compartilharRoteiro);
        await wrappedComp(mockRequest({
            idRoteiro: resultReg.idRoteiro,
            emailCompartilhar: "alvo2@ufsc.br"
        }, "prof3"));
        const wrappedDescomp = testEnv.wrap(roteiros_1.descompartilharRoteiro);
        await wrappedDescomp(mockRequest({
            idRoteiro: resultReg.idRoteiro,
            emailDescompartilhar: "alvo2@ufsc.br"
        }, "prof3"));
        const roteiroSnap = await db.collection("Roteiro_Experimento").doc(resultReg.idRoteiro).get();
        expect(roteiroSnap.data()?.compartilhado_com_emails).not.toContain("alvo2@ufsc.br");
    });
});
//# sourceMappingURL=roteiros.test.js.map