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
        projectId: "lcqui-storage-test",
        storage: {
            rules: fs.readFileSync(path.resolve(__dirname, "../../../../storage.rules"), "utf8"),
            host: "127.0.0.1",
            port: 9199,
        },
    });
});
beforeEach(async () => {
    await testEnv.clearStorage();
});
afterAll(async () => {
    await testEnv.cleanup();
});
describe("Storage Security Rules", () => {
    // Helpers
    const unauthedStorage = () => testEnv.unauthenticatedContext().storage();
    const authedStorage = (uid, roles = []) => testEnv.authenticatedContext(uid, { roles }).storage();
    describe("Acessos Básicos", () => {
        it("não deve permitir leitura ou escrita se não estiver autenticado", async () => {
            const storage = unauthedStorage();
            await (0, rules_unit_testing_1.assertFails)(storage.ref("qualquer_coisa/arquivo.png").getDownloadURL());
            await (0, rules_unit_testing_1.assertFails)(storage.ref("fotos_perfil/user/foto.png").put(Buffer.from("fake image")));
        });
    });
    describe("Fotos de Perfil", () => {
        it("deve permitir que o próprio usuário faça upload de imagem até 5MB", async () => {
            const storage = authedStorage("alice");
            const ref = storage.ref("fotos_perfil/alice/minha_foto.png");
            const content = Buffer.alloc(1024); // 1KB
            await (0, rules_unit_testing_1.assertSucceeds)(ref.put(content, { contentType: "image/png" }));
        });
        it("não deve permitir que um usuário altere a foto de outro", async () => {
            const storage = authedStorage("bob");
            const ref = storage.ref("fotos_perfil/alice/minha_foto.png");
            const content = Buffer.alloc(1024);
            await (0, rules_unit_testing_1.assertFails)(ref.put(content, { contentType: "image/png" }));
        });
        it("não deve permitir upload se não for uma imagem (ex: PDF)", async () => {
            const storage = authedStorage("alice");
            const ref = storage.ref("fotos_perfil/alice/minha_foto.pdf");
            const content = Buffer.alloc(1024);
            await (0, rules_unit_testing_1.assertFails)(ref.put(content, { contentType: "application/pdf" }));
        });
    });
    describe("Patrimônio e Requisições", () => {
        it("um gestor de patrimônio pode fazer upload de foto de patrimônio (com owner correto)", async () => {
            const storage = authedStorage("gestor1", ["Gestor_Bens_Patrimoniais"]);
            const ref = storage.ref("patrimonio/item1/foto.png");
            const content = Buffer.alloc(1024);
            await (0, rules_unit_testing_1.assertSucceeds)(ref.put(content, { contentType: "image/jpeg", customMetadata: { owner: "gestor1" } }));
        });
        it("não deve permitir criar patrimônio se owner no metadata for de outra pessoa", async () => {
            const storage = authedStorage("gestor1", ["Gestor_Bens_Patrimoniais"]);
            const ref = storage.ref("patrimonio/item1/foto.png");
            const content = Buffer.alloc(1024);
            await (0, rules_unit_testing_1.assertFails)(ref.put(content, { contentType: "image/jpeg", customMetadata: { owner: "outrapessoa" } }));
        });
        it("um professor PODE fazer upload de foto nas requisições (com owner)", async () => {
            const storage = authedStorage("prof1", ["Professor"]);
            const ref = storage.ref("requisicoes/req1/foto.png");
            const content = Buffer.alloc(1024);
            await (0, rules_unit_testing_1.assertSucceeds)(ref.put(content, { contentType: "image/jpeg", customMetadata: { owner: "prof1" } }));
        });
        it("não deve permitir alterar owner de uma foto existente (update malicioso)", async () => {
            const storage = authedStorage("gestor1", ["Gestor_Bens_Patrimoniais"]);
            const ref = storage.ref("patrimonio/item1/foto.png");
            const content = Buffer.alloc(1024);
            // Cria o arquivo corretamente
            await (0, rules_unit_testing_1.assertSucceeds)(ref.put(content, { contentType: "image/jpeg", customMetadata: { owner: "gestor1" } }));
            // Tenta dar update alterando o owner
            const hackerStorage = authedStorage("gestor1", ["Gestor_Bens_Patrimoniais"]);
            await (0, rules_unit_testing_1.assertFails)(hackerStorage.ref("patrimonio/item1/foto.png").put(content, { contentType: "image/jpeg", customMetadata: { owner: "hacker" } }));
        });
    });
    describe("Baixas Patrimoniais", () => {
        it("apenas gestor (ou admin) pode fazer upload de PDF para baixa (com owner)", async () => {
            const storageProf = authedStorage("prof1", ["Professor"]);
            const storageGestor = authedStorage("gestor1", ["Gestor_Bens_Patrimoniais"]);
            const content = Buffer.alloc(1024);
            await (0, rules_unit_testing_1.assertFails)(storageProf.ref("baixas_patrimoniais/item1/doc.pdf").put(content, { contentType: "application/pdf", customMetadata: { owner: "prof1" } }));
            await (0, rules_unit_testing_1.assertSucceeds)(storageGestor.ref("baixas_patrimoniais/item1/doc.pdf").put(content, { contentType: "application/pdf", customMetadata: { owner: "gestor1" } }));
        });
    });
    describe("Roteiros", () => {
        it("apenas professor ou admin pode fazer upload de roteiro em PDF (com owner)", async () => {
            const storageAluno = authedStorage("aluno1", ["Aluno"]);
            const storageProf = authedStorage("prof1", ["Professor"]);
            const content = Buffer.alloc(1024);
            await (0, rules_unit_testing_1.assertFails)(storageAluno.ref("roteiros/rot1/doc.pdf").put(content, { contentType: "application/pdf", customMetadata: { owner: "aluno1" } }));
            await (0, rules_unit_testing_1.assertSucceeds)(storageProf.ref("roteiros/rot1/doc.pdf").put(content, { contentType: "application/pdf", customMetadata: { owner: "prof1" } }));
        });
        it("um professor não deve conseguir atualizar o roteiro de outro professor (update/sobrescrita maliciosa)", async () => {
            const storageProf1 = authedStorage("prof1", ["Professor"]);
            const storageProf2 = authedStorage("prof2", ["Professor"]);
            const content = Buffer.alloc(1024);
            const ref = storageProf1.ref("roteiros/rot1/doc.pdf");
            // Prof1 envia seu roteiro
            await (0, rules_unit_testing_1.assertSucceeds)(ref.put(content, { contentType: "application/pdf", customMetadata: { owner: "prof1" } }));
            const ref2 = storageProf2.ref("roteiros/rot1/doc.pdf");
            // Download para garantir que existe no emulador
            await (0, rules_unit_testing_1.assertSucceeds)(ref2.getDownloadURL());
            // Prof2 tenta atualizar os metadados
            await (0, rules_unit_testing_1.assertFails)(ref2.updateMetadata({ customMetadata: { owner: "prof2" } })); // Tenta roubar posse via updateMetadata
            // Prof2 tenta deletar o roteiro do Prof1
            await (0, rules_unit_testing_1.assertFails)(ref2.delete());
        });
        it("não deve permitir roteiro acima de 15MB", async () => {
            const storage = authedStorage("prof1", ["Professor"]);
            const ref = storage.ref("roteiros/rot1/doc.pdf");
            const content = Buffer.alloc(16 * 1024 * 1024); // 16MB
            await (0, rules_unit_testing_1.assertFails)(ref.put(content, { contentType: "application/pdf", customMetadata: { owner: "prof1" } }));
        });
    });
});
//# sourceMappingURL=storage.rules.test.js.map