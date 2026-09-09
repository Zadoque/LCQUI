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
const patrimonio_1 = require("../patrimonio");
const testEnv = (0, firebase_functions_test_1.default)({ projectId: "lcqui-dev" });
describe("Módulo de Patrimônio (Equipamentos, Locais e Requisições)", () => {
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
    it("deve criar uma requisição de adição de bem com lock", async () => {
        const wrapped = testEnv.wrap(patrimonio_1.criarRequisicaoAdicaoBem);
        const req = mockRequest({
            numeroPatrimonioProposto: "123456",
            estadoConservacaoProposto: "Novo",
            idLocal: "local1",
            nomeResponsavelProposto: "João",
            motivo: "Novo equipamento"
        }, "prof1", ["Professor"]);
        const result = await wrapped(req);
        expect(result.idRequisicao).toBeDefined();
        const lockSnap = await db.collection("Locks_Requisicao_Patrimonio").doc("bem_adicao_123456").get();
        expect(lockSnap.exists).toBe(true);
    });
    it("deve impedir criação de requisição (Adição) duplicada pendente via lock (RF10b reimplementado em transação Firestore)", async () => {
        const wrapped = testEnv.wrap(patrimonio_1.criarRequisicaoAdicaoBem);
        const req = mockRequest({
            numeroPatrimonioProposto: "654321",
            estadoConservacaoProposto: "Novo",
            idLocal: "local1",
            nomeResponsavelProposto: "Maria",
            motivo: "Equipamento duplicado req"
        }, "prof1", ["Professor"]);
        // Primeira requisição
        await wrapped(req);
        // Segunda requisição
        await expect(wrapped(req)).rejects.toThrow(/Já existe requisição pendente/i);
    });
    it("deve rejeitar criação de bem se número de patrimônio já existir (validação Zod/base)", async () => {
        await db.collection("Bem_Patrimonial").doc("bem1").set({
            numero_patrimonio: "999999",
            nome_equipamento: "Teste",
            status: "Ativo"
        });
        const wrapped = testEnv.wrap(patrimonio_1.criarRequisicaoAdicaoBem);
        const req = mockRequest({
            numeroPatrimonioProposto: "999999",
            estadoConservacaoProposto: "Novo",
            idLocal: "local1",
            nomeResponsavelProposto: "Maria",
            motivo: "Req"
        }, "prof1", ["Professor"]);
        await expect(wrapped(req)).rejects.toThrow(/Já existe um bem cadastrado com este número/i);
    });
    it("deve falhar se a requisição de adição não tiver um ID de local válido (validação Zod)", async () => {
        const wrapped = testEnv.wrap(patrimonio_1.criarRequisicaoAdicaoBem);
        const req = mockRequest({
            numeroPatrimonioProposto: "111111",
            estadoConservacaoProposto: "Novo",
            nomeResponsavelProposto: "João",
            motivo: "Falta Local"
            // idLocal is missing
        }, "prof1", ["Professor"]);
        await expect(wrapped(req)).rejects.toThrow(/ID do local é obrigatório/i);
    });
    it("deve disparar notificação transacional ao aprovar requisição de edição", async () => {
        await db.collection("Gestor_Bens_Patrimoniais").doc("gestor_pat").set({ nome: "Gestor" });
        await db.collection("Bem_Patrimonial").doc("bem_editar").set({
            numero_patrimonio: "777777",
            nome_equipamento: "Antigo Nome",
            status: "Ativo"
        });
        const wrappedReq = testEnv.wrap(patrimonio_1.criarRequisicaoEdicaoBem);
        const resultReq = await wrappedReq(mockRequest({
            idBemPatrimonial: "bem_editar",
            novoNome: "Novo Nome",
            motivo: "Mudança de nome"
        }, "prof2", ["Professor"]));
        const wrappedResponder = testEnv.wrap(patrimonio_1.responderRequisicaoEdicaoBem);
        await wrappedResponder(mockRequest({
            idRequisicao: resultReq.idRequisicao,
            aprovar: true,
            justificativa: "Aprovado com sucesso"
        }, "gestor_pat", ["Gestor_Bens_Patrimoniais"]));
        const reqSnap = await db.collection("Requisicao_Edicao_Bem_Patrimonial").doc(resultReq.idRequisicao).get();
        expect(reqSnap.data()?.status).toBe("aprovada");
        const bemSnap = await db.collection("Bem_Patrimonial").doc("bem_editar").get();
        expect(bemSnap.data()?.nome_equipamento).toBe("Novo Nome");
        // Verificar notificacao para o professor
        const notifSnap = await db.collection("Usuarios").doc("prof2").collection("Notificacoes")
            .where("entidade_alvo", "==", "Requisicao_Edicao_Bem_Patrimonial")
            .where("tipo", "==", "REQUISICAO_APROVADA")
            .get();
        expect(notifSnap.empty).toBe(false);
    });
    it("deve disparar notificação transacional ao rejeitar requisição de adição", async () => {
        const wrappedReq = testEnv.wrap(patrimonio_1.criarRequisicaoAdicaoBem);
        const resultReq = await wrappedReq(mockRequest({
            numeroPatrimonioProposto: "888888",
            estadoConservacaoProposto: "Novo",
            idLocal: "local1",
            nomeResponsavelProposto: "João",
            motivo: "Novo"
        }, "prof3", ["Professor"]));
        const wrappedResponder = testEnv.wrap(patrimonio_1.responderRequisicaoAdicaoBem);
        await wrappedResponder(mockRequest({
            idRequisicao: resultReq.idRequisicao,
            aprovar: false,
            justificativa: "Rejeitado"
        }, "gestor_pat", ["Gestor_Bens_Patrimoniais"]));
        const reqSnap = await db.collection("Requisicao_Adicao_Bem_Patrimonial").doc(resultReq.idRequisicao).get();
        expect(reqSnap.data()?.status).toBe("rejeitada");
        // Verificar notificacao para o professor
        const notifSnap = await db.collection("Usuarios").doc("prof3").collection("Notificacoes")
            .where("entidade_alvo", "==", "Requisicao_Adicao_Bem_Patrimonial")
            .where("tipo", "==", "REQUISICAO_REJEITADA")
            .get();
        expect(notifSnap.empty).toBe(false);
    });
});
//# sourceMappingURL=patrimonio.test.js.map