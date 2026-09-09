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
const rules_unit_testing_1 = require("@firebase/rules-unit-testing");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let testEnv;
beforeAll(async () => {
    // Inicializa o ambiente de teste apontando para o emulador
    testEnv = await (0, rules_unit_testing_1.initializeTestEnvironment)({
        projectId: "lcqui-test",
        firestore: {
            rules: fs.readFileSync(path.resolve(__dirname, "../../../../firestore.rules"), "utf8"),
            host: "127.0.0.1",
            port: 8080,
        },
    });
});
beforeEach(async () => {
    await testEnv.clearFirestore();
});
afterAll(async () => {
    await testEnv.cleanup();
});
describe("Firestore Security Rules", () => {
    // Helpers
    const unauthedDb = () => testEnv.unauthenticatedContext().firestore();
    const authedDb = (uid, roles = []) => testEnv.authenticatedContext(uid, { roles }).firestore();
    describe("Acessos Básicos", () => {
        it("não deve permitir leitura ou escrita se não estiver autenticado", async () => {
            const db = unauthedDb();
            await (0, rules_unit_testing_1.assertFails)(db.collection("Turma").get());
            await (0, rules_unit_testing_1.assertFails)(db.collection("Frasco_Reagente").add({ nome: "Teste" }));
            await (0, rules_unit_testing_1.assertFails)(db.collection("QualquerCoisa").get());
        });
    });
    describe("Coleção Usuarios", () => {
        it("deve permitir que o usuário leia a si mesmo", async () => {
            const db = authedDb("alice");
            await (0, rules_unit_testing_1.assertSucceeds)(db.collection("Usuarios").doc("alice").get());
        });
        it("não deve permitir que o usuário leia outro usuário (sem ser chefe)", async () => {
            const db = authedDb("alice");
            await (0, rules_unit_testing_1.assertFails)(db.collection("Usuarios").doc("bob").get());
        });
        it("deve permitir que o chefe leia qualquer usuário", async () => {
            const db = authedDb("boss", ["Chefe_Geral"]);
            await (0, rules_unit_testing_1.assertSucceeds)(db.collection("Usuarios").doc("alice").get());
        });
    });
    describe("Turmas", () => {
        it("deve permitir que qualquer usuário logado liste turmas", async () => {
            const db = authedDb("aluno1", ["Aluno"]);
            await (0, rules_unit_testing_1.assertSucceeds)(db.collection("Turma").get());
        });
        it("não deve permitir que um aluno crie uma turma", async () => {
            const db = authedDb("aluno1", ["Aluno"]);
            await (0, rules_unit_testing_1.assertFails)(db.collection("Turma").add({ nome: "Nova Turma" }));
        });
        it("deve permitir que um professor crie uma turma", async () => {
            const db = authedDb("prof1", ["Professor"]);
            await (0, rules_unit_testing_1.assertSucceeds)(db.collection("Turma").add({ nome: "Turma do Prof" }));
        });
    });
    describe("Patrimônio", () => {
        it("não deve permitir que um aluno leia patrimônio", async () => {
            const db = authedDb("aluno1", ["Aluno"]);
            await (0, rules_unit_testing_1.assertFails)(db.collection("Bem_Patrimonial").get());
        });
        it("deve permitir que um professor leia patrimônio, mas não crie diretamente", async () => {
            const db = authedDb("prof1", ["Professor"]);
            await (0, rules_unit_testing_1.assertSucceeds)(db.collection("Bem_Patrimonial").get());
            await (0, rules_unit_testing_1.assertFails)(db.collection("Bem_Patrimonial").add({ nome: "Microscópio" }));
        });
        it("deve permitir que um gestor de patrimônio crie patrimônio", async () => {
            const db = authedDb("gestor1", ["Gestor_Bens_Patrimoniais"]);
            await (0, rules_unit_testing_1.assertSucceeds)(db.collection("Bem_Patrimonial").add({ nome: "Microscópio" }));
        });
        it("deve permitir que um professor crie requisição de patrimônio", async () => {
            const db = authedDb("prof1", ["Professor"]);
            await (0, rules_unit_testing_1.assertSucceeds)(db.collection("Requisicao_Adicao_Bem_Patrimonial").add({ nome: "Microscópio" }));
        });
    });
    describe("Almoxarifado e Reagentes", () => {
        it("qualquer usuário autenticado pode listar frascos", async () => {
            const db = authedDb("aluno1", ["Aluno"]);
            await (0, rules_unit_testing_1.assertSucceeds)(db.collection("Frasco_Reagente").get());
        });
        it("apenas gestor almoxarifado (ou admin) pode criar frascos", async () => {
            const dbAluno = authedDb("aluno1", ["Aluno"]);
            await (0, rules_unit_testing_1.assertFails)(dbAluno.collection("Frasco_Reagente").add({ nome: "NaCl" }));
            const dbGestor = authedDb("gestorAlm", ["Gestor_Almoxarifado"]);
            await (0, rules_unit_testing_1.assertSucceeds)(dbGestor.collection("Frasco_Reagente").add({ nome: "NaCl" }));
        });
    });
    describe("Auditoria", () => {
        it("ninguém pelo frontend pode escrever em auditoria", async () => {
            const dbAdmin = authedDb("boss", ["Chefe_Geral"]);
            await (0, rules_unit_testing_1.assertFails)(dbAdmin.collection("Registro_de_Auditoria").add({ acao: "Teste" }));
        });
        it("apenas chefe/admin pode ler auditoria", async () => {
            const dbProf = authedDb("prof", ["Professor"]);
            await (0, rules_unit_testing_1.assertFails)(dbProf.collection("Registro_de_Auditoria").get());
            const dbAdmin = authedDb("boss", ["Chefe_Geral"]);
            await (0, rules_unit_testing_1.assertSucceeds)(dbAdmin.collection("Registro_de_Auditoria").get());
        });
    });
});
//# sourceMappingURL=firestore.rules.test.js.map