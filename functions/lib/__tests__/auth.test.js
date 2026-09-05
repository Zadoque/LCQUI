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
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("../auth");
// Mocks
jest.mock("firebase-admin", () => {
    const getMock = jest.fn();
    const whereMock = jest.fn().mockReturnThis();
    const limitMock = jest.fn().mockReturnThis();
    const setCustomUserClaimsMock = jest.fn();
    const authMock = { setCustomUserClaims: setCustomUserClaimsMock };
    return {
        firestore: jest.fn(() => ({
            collection: jest.fn(() => ({
                doc: jest.fn(() => ({
                    get: getMock
                })),
                where: whereMock,
                limit: limitMock,
                get: getMock
            }))
        })),
        auth: jest.fn(() => authMock)
    };
});
describe("Auth Module (40+ Tests)", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe("resolverPapeisDoToken", () => {
        it("1. deve retornar [] se auth for undefined", () => {
            expect((0, auth_1.resolverPapeisDoToken)(undefined)).toEqual([]);
        });
        it("2. deve retornar [] se auth.token for vazio", () => {
            expect((0, auth_1.resolverPapeisDoToken)({ token: {} })).toEqual([]);
        });
        it("3. deve retornar [] se roles for null", () => {
            expect((0, auth_1.resolverPapeisDoToken)({ token: { roles: null } })).toEqual([]);
        });
        it("4. deve retornar [] se roles for undefined", () => {
            expect((0, auth_1.resolverPapeisDoToken)({ token: { roles: undefined } })).toEqual([]);
        });
        it("5. deve retornar [] se roles for uma string simples", () => {
            expect((0, auth_1.resolverPapeisDoToken)({ token: { roles: "Chefe_Geral" } })).toEqual([]);
        });
        it("6. deve retornar [] se roles for um número", () => {
            expect((0, auth_1.resolverPapeisDoToken)({ token: { roles: 123 } })).toEqual([]);
        });
        it("7. deve retornar [] se roles for um objeto", () => {
            expect((0, auth_1.resolverPapeisDoToken)({ token: { roles: { Chefe_Geral: true } } })).toEqual([]);
        });
        it("8. deve retornar os papeis corretos quando roles for array com 1 item", () => {
            expect((0, auth_1.resolverPapeisDoToken)({ token: { roles: ["Professor"] } })).toEqual(["Professor"]);
        });
        it("9. deve retornar os papeis corretos quando roles for array com múltiplos itens", () => {
            expect((0, auth_1.resolverPapeisDoToken)({ token: { roles: ["Chefe_Geral", "Professor"] } })).toEqual(["Chefe_Geral", "Professor"]);
        });
        it("10. deve lidar com array vazio", () => {
            expect((0, auth_1.resolverPapeisDoToken)({ token: { roles: [] } })).toEqual([]);
        });
        it("11. deve manter itens inválidos no array se existirem (typescript array as string[])", () => {
            // @ts-ignore
            expect((0, auth_1.resolverPapeisDoToken)({ token: { roles: [123, "Chefe_Geral"] } })).toEqual([123, "Chefe_Geral"]);
        });
    });
    describe("validarPermissao", () => {
        it("12. deve lançar unauthenticated se auth for undefined", () => {
            const req = { data: {}, rawRequest: {} };
            expect(() => (0, auth_1.validarPermissao)(req, ["Professor"])).toThrow(new https_1.HttpsError("unauthenticated", "Usuário não autenticado."));
        });
        it("13. deve lançar unauthenticated se auth.uid não existir", () => {
            const req = { data: {}, auth: { token: {} }, rawRequest: {} };
            expect(() => (0, auth_1.validarPermissao)(req, ["Professor"])).toThrowError("Usuário não autenticado.");
        });
        it("14. deve lançar permission-denied se roles for ausente", () => {
            const req = { data: {}, auth: { uid: "123", token: {} }, rawRequest: {} };
            expect(() => (0, auth_1.validarPermissao)(req, ["Professor"])).toThrowError("Usuário sem papel autorizado para esta ação.");
        });
        it("15. deve lançar permission-denied se tiver papéis mas nenhum bater", () => {
            const req = { data: {}, auth: { uid: "123", token: { roles: ["Aluno"] } }, rawRequest: {} };
            expect(() => (0, auth_1.validarPermissao)(req, ["Professor"])).toThrowError("Usuário sem papel");
        });
        it("16. deve lançar permission-denied se tiver múltiplos papéis mas nenhum bater", () => {
            const req = { data: {}, auth: { uid: "123", token: { roles: ["Aluno", "Bolsista"] } }, rawRequest: {} };
            expect(() => (0, auth_1.validarPermissao)(req, ["Professor", "Chefe_Geral"])).toThrowError("Usuário sem papel");
        });
        it("17. deve passar se o usuário tiver exatamente o papel", () => {
            const req = { data: {}, auth: { uid: "123", token: { roles: ["Professor"] } }, rawRequest: {} };
            expect((0, auth_1.validarPermissao)(req, ["Professor"])).toEqual(["Professor"]);
        });
        it("18. deve passar se o usuário tiver um dos papéis permitidos", () => {
            const req = { data: {}, auth: { uid: "123", token: { roles: ["Professor"] } }, rawRequest: {} };
            expect((0, auth_1.validarPermissao)(req, ["Professor", "Chefe_Geral"])).toEqual(["Professor"]);
        });
        it("19. deve passar se o usuário tiver o papel Chefe_Geral", () => {
            const req = { data: {}, auth: { uid: "123", token: { roles: ["Chefe_Geral"] } }, rawRequest: {} };
            expect((0, auth_1.validarPermissao)(req, ["Professor", "Chefe_Geral"])).toEqual(["Chefe_Geral"]);
        });
        it("20. deve retornar todos os papéis do usuário", () => {
            const req = { data: {}, auth: { uid: "123", token: { roles: ["Professor", "Gestor_Almoxarifado"] } }, rawRequest: {} };
            expect((0, auth_1.validarPermissao)(req, ["Professor"])).toEqual(["Professor", "Gestor_Almoxarifado"]);
        });
        it("21. deve falhar se papeis permitidos for array vazio", () => {
            const req = { data: {}, auth: { uid: "123", token: { roles: ["Professor"] } }, rawRequest: {} };
            expect(() => (0, auth_1.validarPermissao)(req, [])).toThrowError("Usuário sem papel");
        });
    });
    describe("validarGestorDoAlmoxarifado", () => {
        let mockGet;
        beforeEach(() => {
            // Acessando o mock encadeado
            mockGet = admin.firestore().collection("dummy").where("").limit(1).get;
        });
        it("22. deve passar se for Chefe_Geral (escopo global), não consulta firestore", async () => {
            await (0, auth_1.validarGestorDoAlmoxarifado)("uid_123", { roles: ["Chefe_Geral"] }, "almox_1");
            expect(mockGet).not.toHaveBeenCalled();
        });
        it("23. deve passar se for Chefe_Geral e Gestor_Almoxarifado ao mesmo tempo (curto circuito no chefe)", async () => {
            await (0, auth_1.validarGestorDoAlmoxarifado)("uid_123", { roles: ["Chefe_Geral", "Gestor_Almoxarifado"] }, "almox_1");
            expect(mockGet).not.toHaveBeenCalled();
        });
        it("24. deve falhar se não tiver papel de gestor ou chefe", async () => {
            await expect((0, auth_1.validarGestorDoAlmoxarifado)("uid_123", { roles: ["Professor"] }, "almox_1"))
                .rejects.toThrowError("Usuário não é Gestor de Almoxarifado.");
            expect(mockGet).not.toHaveBeenCalled();
        });
        it("25. deve falhar se os roles não estiverem presentes", async () => {
            await expect((0, auth_1.validarGestorDoAlmoxarifado)("uid_123", {}, "almox_1"))
                .rejects.toThrowError("Usuário não é Gestor de Almoxarifado.");
        });
        it("26. deve falhar se for um array vazio de roles", async () => {
            await expect((0, auth_1.validarGestorDoAlmoxarifado)("uid_123", { roles: [] }, "almox_1"))
                .rejects.toThrowError("Usuário não é Gestor de Almoxarifado.");
        });
        it("27. deve consultar o firestore se for Gestor_Almoxarifado", async () => {
            mockGet.mockResolvedValueOnce({ empty: false });
            await (0, auth_1.validarGestorDoAlmoxarifado)("uid_123", { roles: ["Gestor_Almoxarifado"] }, "almox_1");
            expect(mockGet).toHaveBeenCalledTimes(1);
        });
        it("28. deve falhar se o vinculo no firestore estiver vazio", async () => {
            mockGet.mockResolvedValueOnce({ empty: true });
            await expect((0, auth_1.validarGestorDoAlmoxarifado)("uid_123", { roles: ["Gestor_Almoxarifado"] }, "almox_1"))
                .rejects.toThrow(new https_1.HttpsError("permission-denied", "Gestor não está designado para este almoxarifado."));
        });
        it("29. deve verificar os parâmetros passados para a consulta onde = uid e id", async () => {
            const mockWhere = admin.firestore().collection("dummy").where;
            mockGet.mockResolvedValueOnce({ empty: false });
            await (0, auth_1.validarGestorDoAlmoxarifado)("meu_uid", { roles: ["Gestor_Almoxarifado"] }, "meu_almox");
            expect(mockWhere).toHaveBeenCalledWith("id_gestor_almoxarifado", "==", "meu_uid");
            expect(mockWhere).toHaveBeenCalledWith("id_almoxarifado", "==", "meu_almox");
        });
        it("30. deve rejeitar caso a query rejeite", async () => {
            mockGet.mockRejectedValueOnce(new Error("Erro do banco"));
            await expect((0, auth_1.validarGestorDoAlmoxarifado)("meu_uid", { roles: ["Gestor_Almoxarifado"] }, "meu_almox"))
                .rejects.toThrowError("Erro do banco");
        });
    });
    describe("atualizarCustomClaims", () => {
        let mockGet;
        let mockSetCustomUserClaims;
        beforeEach(() => {
            mockGet = admin.firestore().collection("dummy").doc("").get;
            mockGet.mockReset();
            mockGet.mockResolvedValue({ exists: false });
            mockSetCustomUserClaims = admin.auth().setCustomUserClaims;
            mockSetCustomUserClaims.mockClear();
        });
        it("31. deve chamar get 6 vezes (uma para cada papel possível)", async () => {
            mockGet.mockResolvedValue({ exists: false });
            await (0, auth_1.atualizarCustomClaims)("uid_1");
            expect(mockGet).toHaveBeenCalledTimes(6);
        });
        it("32. deve definir array de roles vazio se não existir em nenhuma coleção", async () => {
            mockGet.mockResolvedValue({ exists: false });
            await (0, auth_1.atualizarCustomClaims)("uid_1");
            expect(mockSetCustomUserClaims).toHaveBeenCalledWith("uid_1", { roles: [] });
        });
        it("33. deve definir Chefe_Geral se existir apenas na primeira coleção", async () => {
            mockGet
                .mockResolvedValueOnce({ exists: true }) // Chefe_Geral
                .mockResolvedValue({ exists: false }); // Resto
            await (0, auth_1.atualizarCustomClaims)("uid_1");
            expect(mockSetCustomUserClaims).toHaveBeenCalledWith("uid_1", { roles: ["Chefe_Geral"] });
        });
        it("34. deve definir Gestor_Almoxarifado se existir na segunda coleção", async () => {
            mockGet
                .mockResolvedValueOnce({ exists: false })
                .mockResolvedValueOnce({ exists: true }) // Gestor
                .mockResolvedValue({ exists: false });
            await (0, auth_1.atualizarCustomClaims)("uid_1");
            expect(mockSetCustomUserClaims).toHaveBeenCalledWith("uid_1", { roles: ["Gestor_Almoxarifado"] });
        });
        it("35. deve definir Professor se existir na quarta coleção", async () => {
            mockGet
                .mockResolvedValueOnce({ exists: false })
                .mockResolvedValueOnce({ exists: false })
                .mockResolvedValueOnce({ exists: false })
                .mockResolvedValueOnce({ exists: true }) // Professor
                .mockResolvedValue({ exists: false });
            await (0, auth_1.atualizarCustomClaims)("uid_1");
            expect(mockSetCustomUserClaims).toHaveBeenCalledWith("uid_1", { roles: ["Professor"] });
        });
        it("36. deve definir Aluno e Bolsista se existir na quinta e sexta coleções", async () => {
            mockGet
                .mockResolvedValueOnce({ exists: false })
                .mockResolvedValueOnce({ exists: false })
                .mockResolvedValueOnce({ exists: false })
                .mockResolvedValueOnce({ exists: false })
                .mockResolvedValueOnce({ exists: true }) // Aluno
                .mockResolvedValueOnce({ exists: true }); // Bolsista
            await (0, auth_1.atualizarCustomClaims)("uid_1");
            expect(mockSetCustomUserClaims).toHaveBeenCalledWith("uid_1", { roles: ["Aluno", "Bolsista"] });
        });
        it("37. deve definir todos os roles se o usuário for super", async () => {
            mockGet.mockResolvedValue({ exists: true });
            await (0, auth_1.atualizarCustomClaims)("uid_1");
            expect(mockSetCustomUserClaims).toHaveBeenCalledWith("uid_1", {
                roles: ["Chefe_Geral", "Gestor_Almoxarifado", "Gestor_Bens_Patrimoniais", "Professor", "Aluno", "Bolsista"]
            });
        });
        it("38. deve consultar coleções específicas usando os nomes exatos do projeto", async () => {
            const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
            const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
            admin.firestore.mockReturnValue({ collection: mockCollection });
            mockGet.mockResolvedValue({ exists: false });
            await (0, auth_1.atualizarCustomClaims)("uid_teste");
            expect(mockCollection).toHaveBeenCalledWith("Chefe_Geral");
            expect(mockCollection).toHaveBeenCalledWith("Gestor_Almoxarifado");
            expect(mockCollection).toHaveBeenCalledWith("Gestor_Bens_Patrimoniais");
            expect(mockCollection).toHaveBeenCalledWith("Professor");
            expect(mockCollection).toHaveBeenCalledWith("Aluno");
            expect(mockCollection).toHaveBeenCalledWith("Bolsista");
        });
        it("39. deve definir o doc usando o UID", async () => {
            const mockDoc = jest.fn().mockReturnValue({ get: mockGet });
            const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
            admin.firestore.mockReturnValue({ collection: mockCollection });
            mockGet.mockResolvedValue({ exists: false });
            await (0, auth_1.atualizarCustomClaims)("uid_999");
            expect(mockDoc).toHaveBeenCalledWith("uid_999");
            expect(mockDoc).toHaveBeenCalledTimes(6);
        });
        it("40. deve lançar exceção se uma das consultas falhar (Promise.all rejeita)", async () => {
            mockGet
                .mockResolvedValueOnce({ exists: false })
                .mockRejectedValueOnce(new Error("Erro de conexão"));
            await expect((0, auth_1.atualizarCustomClaims)("uid_1")).rejects.toThrowError("Erro de conexão");
            expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
        });
        it("41. deve garantir que o uid repassado ao setCustomUserClaims seja exatamente o string uid do argumento", async () => {
            mockGet.mockResolvedValue({ exists: false });
            const unusualUid = "uid_com_caracteres_especiais_!@#";
            await (0, auth_1.atualizarCustomClaims)(unusualUid);
            expect(mockSetCustomUserClaims).toHaveBeenCalledWith(unusualUid, { roles: [] });
        });
    });
});
//# sourceMappingURL=auth.test.js.map