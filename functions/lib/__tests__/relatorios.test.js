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
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
process.env.FUNCTIONS_EMULATOR = "true";
const admin = __importStar(require("firebase-admin"));
const relatorios_1 = require("../relatorios");
// Certifique-se de estar rodando com os emuladores ativados (FIRESTORE_EMULATOR_HOST etc)
// Esse teste deve ser executado no ambiente de emulação
describe("Relatórios PDF - Geração e Agregação", () => {
    beforeAll(async () => {
        if (!admin.apps.length) {
            admin.initializeApp({
                projectId: "lcqui-dev",
                storageBucket: "lcqui-dev.appspot.com"
            });
        }
    });
    afterAll(async () => {
        // limpar se precisar
    });
    it("não deve misturar gramas e mililitros no relatório de almoxarifado", async () => {
        // Idealmente, testaríamos a função isolada. 
        // Como a função onCall lê do Firestore diretamente, podemos inserir dados de mock.
        const db = admin.firestore();
        const almoxRef = await db.collection("Almoxarifado").add({
            nome_almoxarifado: "Almox Teste",
            predio: "T", sala: "1", andar: "1"
        });
        const idAlmox = almoxRef.id;
        // Inserir emprestimos mistos
        const hoje = new Date();
        await db.collection("Emprestimo_Reagente").add({
            id_almoxarifado: idAlmox,
            data_devolucao_efetuada: hoje,
            medida_utilizada: 50,
            unidade_medida_utilizada: "g",
            status: "DEVOLVIDO",
            id_usuario_retirou: "u1"
        });
        await db.collection("Emprestimo_Reagente").add({
            id_almoxarifado: idAlmox,
            data_devolucao_efetuada: hoje,
            medida_utilizada: 100,
            unidade_medida_utilizada: "ml",
            status: "DEVOLVIDO",
            id_usuario_retirou: "u2"
        });
        // Como a função gerarRelatorioAlmoxarifado verifica a role do usuário no Auth, 
        // precisaremos mockar a request.
        const req = {
            data: {
                idAlmoxarifado: idAlmox,
                mes: hoje.getMonth() + 1,
                ano: hoje.getFullYear()
            },
            auth: {
                uid: "gestor_id",
                token: {
                    roles: ["Gestor_Almoxarifado"]
                }
            }
        };
        // Criar a relação gestor_almoxarifado
        await db.collection("Gestor_Almoxarifado_x_Almoxarifado").doc(`gestor_id_${idAlmox}`).set({
            id_gestor_almoxarifado: "gestor_id",
            id_almoxarifado: idAlmox
        });
        try {
            const testEnv = require("firebase-functions-test")();
            const wrapped = testEnv.wrap(relatorios_1.gerarRelatorioAlmoxarifado);
            const res = await wrapped(req);
            expect(res.url).toBeDefined();
            expect(typeof res.url).toBe("string");
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    });
});
//# sourceMappingURL=relatorios.test.js.map