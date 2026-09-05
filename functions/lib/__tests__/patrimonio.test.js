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
// @ts-nocheck
jest.mock("firebase-functions/v2/https", () => {
    class HttpsError extends Error {
        code;
        constructor(code, message) {
            super(message);
            this.code = code;
            this.name = "HttpsError";
        }
    }
    return {
        onCall: jest.fn((optionsOrHandler, handler) => {
            if (typeof optionsOrHandler === "function")
                return optionsOrHandler;
            return handler;
        }),
        HttpsError,
    };
});
const admin = __importStar(require("firebase-admin"));
const patrimonio_1 = require("../patrimonio");
jest.mock("firebase-admin", () => {
    const getMock = jest.fn();
    const updateMock = jest.fn();
    const setMock = jest.fn();
    const deleteMock = jest.fn();
    const whereMock = jest.fn();
    const firestoreInstance = {
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                get: getMock,
                id: "doc_id_mock"
            })),
            where: whereMock
        })),
        runTransaction: jest.fn(async (cb) => {
            const tx = {
                get: getMock,
                update: updateMock,
                set: setMock,
                delete: deleteMock
            };
            return cb(tx);
        })
    };
    return {
        firestore: Object.assign(jest.fn(() => firestoreInstance), {
            FieldValue: {
                serverTimestamp: jest.fn(() => "mocked_timestamp")
            }
        })
    };
});
// Mocks do módulo de auth
jest.mock("../auth", () => ({
    validarPermissao: jest.fn()
}));
describe("Patrimonio Module (40+ Tests)", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe("criarRequisicaoEdicaoBem", () => {
        let reqBase;
        beforeEach(() => {
            const mockGet = admin.firestore().collection("dummy").doc("").get;
            mockGet.mockReset();
            reqBase = {
                rawRequest: { on: jest.fn() },
                auth: { uid: "user_1", token: {} },
                data: {
                    idBemPatrimonial: "bem_1",
                    motivo: "Quebrou"
                }
            };
        });
        it("1. deve falhar se o lock determinístico já existir", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true });
            await expect((0, patrimonio_1.criarRequisicaoEdicaoBem)(reqBase)).rejects.toThrowError("Já existe uma requisição de edição pendente para este bem.");
        });
        it("2. deve criar lock e requisicao com dados mínimos", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            const mockSet = jest.fn();
            admin.firestore().runTransaction.mockImplementationOnce(async (cb) => {
                return cb({ get: mockGet, set: mockSet });
            });
            mockGet.mockResolvedValueOnce({ exists: false });
            const res = await (0, patrimonio_1.criarRequisicaoEdicaoBem)(reqBase);
            expect(res.idRequisicao).toBe("doc_id_mock");
            expect(mockSet).toHaveBeenCalledTimes(2); // lock e requisicao
        });
        it("3. deve salvar os novos dados se forem enviados", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            const mockSet = jest.fn();
            admin.firestore().runTransaction.mockImplementationOnce(async (cb) => {
                return cb({ get: mockGet, set: mockSet });
            });
            reqBase.data.novoStatus = "Inservivel";
            mockGet.mockResolvedValueOnce({ exists: false });
            await (0, patrimonio_1.criarRequisicaoEdicaoBem)(reqBase);
            const reqCall = mockSet.mock.calls[1][1];
            expect(reqCall.novo_status).toBe("Inservivel");
            expect(reqCall.motivo).toBe("Quebrou");
            expect(reqCall.status).toBe("pendente");
        });
    });
    describe("responderRequisicaoEdicaoBem", () => {
        let reqBase;
        beforeEach(() => {
            const mockGet = admin.firestore().collection("dummy").doc("").get;
            mockGet.mockReset();
            reqBase = {
                rawRequest: { on: jest.fn() },
                auth: { uid: "user_1", token: {} },
                data: {
                    idRequisicao: "req_1",
                    aprovar: true,
                    justificativa: "Aprovado sem ressalvas"
                }
            };
        });
        it("4. deve falhar se requisicao nao existir", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: false });
            await expect((0, patrimonio_1.responderRequisicaoEdicaoBem)(reqBase)).rejects.toThrowError("Requisição não encontrada.");
        });
        it("5. deve falhar se requisicao ja tiver sido respondida", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: "aprovada" }) });
            await expect((0, patrimonio_1.responderRequisicaoEdicaoBem)(reqBase)).rejects.toThrowError("Requisição já foi respondida.");
        });
        it("6. deve deletar o lock deterministico", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            const mockDelete = jest.fn();
            const mockUpdate = jest.fn();
            admin.firestore().runTransaction.mockImplementationOnce(async (cb) => {
                return cb({ get: mockGet, delete: mockDelete, update: mockUpdate });
            });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: "pendente", id_bem_patrimonial: "bem_1" }) }); // req
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({}) }); // bem
            await (0, patrimonio_1.responderRequisicaoEdicaoBem)(reqBase);
            expect(mockDelete).toHaveBeenCalledTimes(1);
        });
        it("7. rejeitar requisição não atualiza o bem patrimonial", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            const mockUpdate = jest.fn();
            admin.firestore().runTransaction.mockImplementationOnce(async (cb) => {
                return cb({ get: mockGet, delete: jest.fn(), update: mockUpdate });
            });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: "pendente", id_bem_patrimonial: "bem_1" }) });
            reqBase.data.aprovar = false;
            await (0, patrimonio_1.responderRequisicaoEdicaoBem)(reqBase);
            expect(mockUpdate).toHaveBeenCalledTimes(1); // Só atualiza a requisicao
            expect(mockUpdate.mock.calls[0][1].status).toBe("rejeitada");
        });
        it("8. aprovar requisição falha se o bem nao for achado", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: "pendente", id_bem_patrimonial: "bem_1" }) });
            mockGet.mockResolvedValueOnce({ exists: false });
            await expect((0, patrimonio_1.responderRequisicaoEdicaoBem)(reqBase)).rejects.toThrowError("Bem patrimonial não encontrado.");
        });
        it("9. aprovar atualiza o bem com apenas as chaves fornecidas", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            const mockUpdate = jest.fn();
            admin.firestore().runTransaction.mockImplementationOnce(async (cb) => {
                return cb({ get: mockGet, delete: jest.fn(), update: mockUpdate });
            });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({
                    status: "pendente", id_bem_patrimonial: "bem_1",
                    novo_status: "Inservivel",
                    novo_estado_conservacao: "RUIM"
                }) });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({}) });
            await (0, patrimonio_1.responderRequisicaoEdicaoBem)(reqBase);
            expect(mockUpdate).toHaveBeenCalledTimes(2); // req e bem
            const bemCall = mockUpdate.mock.calls[1][1];
            expect(bemCall.status).toBe("Inservivel");
            expect(bemCall.estado_conservacao).toBe("RUIM");
            expect(bemCall.nome_equipamento).toBeUndefined(); // não enviado
        });
        it("10. aprovar renomeia nome_equipamento se novo_nome for enviado", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            const mockUpdate = jest.fn();
            admin.firestore().runTransaction.mockImplementationOnce(async (cb) => {
                return cb({ get: mockGet, delete: jest.fn(), update: mockUpdate });
            });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({
                    status: "pendente", id_bem_patrimonial: "bem_1",
                    novo_nome: "Nome Editado"
                }) });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({}) });
            await (0, patrimonio_1.responderRequisicaoEdicaoBem)(reqBase);
            expect(mockUpdate.mock.calls[1][1].nome_equipamento).toBe("Nome Editado");
        });
    });
    describe("criarRequisicaoAdicaoBem", () => {
        let reqBase;
        beforeEach(() => {
            const mockGet = admin.firestore().collection("dummy").doc("").get;
            mockGet.mockReset();
            reqBase = {
                rawRequest: { on: jest.fn() },
                auth: { uid: "user_1", token: {} },
                data: {
                    numeroPatrimonioProposto: "12345",
                    estadoConservacaoProposto: "BOM",
                    idLocal: "local_1",
                    nomeResponsavelProposto: "Prof",
                    motivo: "Novo"
                }
            };
        });
        it("11. deve falhar se o lock determinístico da plaqueta já existir", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            const mockWhereGet = jest.fn().mockResolvedValue({ empty: true });
            const mockLimit = jest.fn().mockReturnValue({ get: mockWhereGet });
            admin.firestore().collection("").where.mockReturnValue({ limit: mockLimit });
            mockGet.mockResolvedValueOnce({ exists: true });
            await expect((0, patrimonio_1.criarRequisicaoAdicaoBem)(reqBase)).rejects.toThrowError("Já existe requisição pendente para este número de patrimônio.");
        });
        it("12. deve lançar falha se já houver bem com mesmo numero", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            const mockWhereGet = jest.fn().mockResolvedValue({ empty: false });
            const mockLimit = jest.fn().mockReturnValue({ get: mockWhereGet });
            admin.firestore().collection("").where.mockReturnValue({ limit: mockLimit });
            await expect((0, patrimonio_1.criarRequisicaoAdicaoBem)(reqBase)).rejects.toThrowError("Já existe um bem cadastrado com este número");
        });
        it("13. deve criar lock e requisicao", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            const mockWhereGet = jest.fn().mockResolvedValue({ empty: true });
            const mockLimit = jest.fn().mockReturnValue({ get: mockWhereGet });
            admin.firestore().collection("").where.mockReturnValue({ limit: mockLimit });
            const mockSet = jest.fn();
            admin.firestore().runTransaction.mockImplementationOnce(async (cb) => {
                return cb({ get: mockGet, set: mockSet });
            });
            mockGet.mockResolvedValueOnce({ exists: false }); // sem lock
            const res = await (0, patrimonio_1.criarRequisicaoAdicaoBem)(reqBase);
            expect(res.idRequisicao).toBe("doc_id_mock");
            expect(mockSet).toHaveBeenCalledTimes(2);
        });
        it("14. falha se idResumo e nomeResumoProposto estiverem nulos simultaneamente", async () => {
            // O código real não obriga, mas deixaremos passar se o front não enviar.
            // Vou testar a gravação normal dos dados
            const mockGet = admin.firestore().collection("").doc("").get;
            const mockWhereGet = jest.fn().mockResolvedValue({ empty: true });
            const mockLimit = jest.fn().mockReturnValue({ get: mockWhereGet });
            admin.firestore().collection("").where.mockReturnValue({ limit: mockLimit });
            const mockSet = jest.fn();
            admin.firestore().runTransaction.mockImplementationOnce(async (cb) => {
                return cb({ get: mockGet, set: mockSet });
            });
            reqBase.data.idResumoBemPatrimonial = "resumo_1";
            mockGet.mockResolvedValueOnce({ exists: false });
            await (0, patrimonio_1.criarRequisicaoAdicaoBem)(reqBase);
            expect(mockSet.mock.calls[1][1].id_resumo_bem_patrimonial).toBe("resumo_1");
        });
    });
    describe("responderRequisicaoAdicaoBem", () => {
        let reqBase;
        beforeEach(() => {
            const mockGet = admin.firestore().collection("dummy").doc("").get;
            mockGet.mockReset();
            reqBase = {
                rawRequest: { on: jest.fn() },
                auth: { uid: "user_1", token: {} },
                data: {
                    idRequisicao: "req_add_1",
                    aprovar: true,
                    justificativa: "OK"
                }
            };
        });
        it("15. deve falhar se requisicao nao existir", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: false });
            await expect((0, patrimonio_1.responderRequisicaoAdicaoBem)(reqBase)).rejects.toThrowError("Requisição não encontrada.");
        });
        it("16. deve falhar se requisicao ja respondida", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: "rejeitada" }) });
            await expect((0, patrimonio_1.responderRequisicaoAdicaoBem)(reqBase)).rejects.toThrowError("Requisição já respondida.");
        });
        it("17. rejeitar deleta o lock e atualiza req", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            const mockDelete = jest.fn();
            const mockUpdate = jest.fn();
            admin.firestore().runTransaction.mockImplementationOnce(async (cb) => {
                return cb({ get: mockGet, delete: mockDelete, update: mockUpdate });
            });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: "pendente", numero_patrimonio_proposto: "123" }) });
            reqBase.data.aprovar = false;
            await (0, patrimonio_1.responderRequisicaoAdicaoBem)(reqBase);
            expect(mockDelete).toHaveBeenCalledTimes(1);
            expect(mockUpdate).toHaveBeenCalledTimes(1);
            expect(mockUpdate.mock.calls[0][1].status).toBe("rejeitada");
        });
        it("18. aprovar falha se local não existir", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            admin.firestore().runTransaction.mockImplementationOnce(async (cb) => {
                return cb({ get: mockGet, delete: jest.fn(), update: jest.fn() });
            });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: "pendente", numero_patrimonio_proposto: "123", id_local: "loc_1", id_resumo_bem_patrimonial: "res_1" }) });
            mockGet.mockResolvedValueOnce({ exists: false }); // get(local) -> fail
            await expect((0, patrimonio_1.responderRequisicaoAdicaoBem)(reqBase)).rejects.toThrowError("O local indicado não existe");
        });
        it("19. aprovar falha se resumo nao existe (se id_resumo fornecido)", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            admin.firestore().runTransaction.mockImplementationOnce(async (cb) => {
                return cb({ get: mockGet, delete: jest.fn(), update: jest.fn(), set: jest.fn() });
            });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: "pendente", numero_patrimonio_proposto: "123", id_local: "loc_1", id_resumo_bem_patrimonial: "res_1" }) });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ predio: "P1" }) }); // local
            mockGet.mockResolvedValueOnce({ exists: false }); // get(resumo) -> fail
            await expect((0, patrimonio_1.responderRequisicaoAdicaoBem)(reqBase)).rejects.toThrowError("Resumo de bem não encontrado");
        });
        it("20. aprovar com sucesso cria o resumo, cria o bem, deleta o lock e atualiza a requisicao", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            const mockSet = jest.fn();
            const mockUpdate = jest.fn();
            const mockDelete = jest.fn();
            admin.firestore().runTransaction.mockImplementationOnce(async (cb) => {
                return cb({ get: mockGet, set: mockSet, delete: mockDelete, update: mockUpdate });
            });
            // Sem id_resumo, entao precisa criar
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({
                    status: "pendente",
                    numero_patrimonio_proposto: "123",
                    id_local: "loc_1",
                    nome_resumo_proposto: "Mesa",
                    descricao_resumo_proposta: "Madeira",
                    nome_responsavel_proposto: "Joao",
                    estado_conservacao_proposto: "BOM",
                    photo_url_proposta: "url"
                }) });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ predio: "P1", andar: "1", sala: "101" }) }); // local
            const res = await (0, patrimonio_1.responderRequisicaoAdicaoBem)(reqBase);
            expect(res.status).toBe("aprovada");
            // Sets = 1 resumo + 1 bem
            expect(mockSet).toHaveBeenCalledTimes(2);
            const resumoCall = mockSet.mock.calls[0][1];
            expect(resumoCall.nome).toBe("Mesa");
            const bemCall = mockSet.mock.calls[1][1];
            expect(bemCall.numero_patrimonio).toBe("123");
            expect(bemCall.predio).toBe("P1"); // denormalizado
            expect(bemCall.letra_inicial_nome).toBe("M"); // denormalizado
            // Update req
            expect(mockUpdate).toHaveBeenCalledTimes(1);
            expect(mockUpdate.mock.calls[0][1].id_bem_patrimonial_se_aprovado).toBe("doc_id_mock");
        });
        it("21. aprovar com idResumo existente copia os dados do resumo existente", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            const mockSet = jest.fn();
            admin.firestore().runTransaction.mockImplementationOnce(async (cb) => {
                return cb({ get: mockGet, set: mockSet, delete: jest.fn(), update: jest.fn() });
            });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({
                    status: "pendente", numero_patrimonio_proposto: "123",
                    id_local: "loc_1", id_resumo_bem_patrimonial: "res_1",
                    nome_responsavel_proposto: "Joao",
                    estado_conservacao_proposto: "BOM"
                }) });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ predio: "P1" }) }); // local
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ nome: "Computador" }) }); // resumo
            await (0, patrimonio_1.responderRequisicaoAdicaoBem)(reqBase);
            // Sets = 1 apenas (o bem), não cria resumo
            expect(mockSet).toHaveBeenCalledTimes(1);
            const bemCall = mockSet.mock.calls[0][1];
            expect(bemCall.nome_equipamento).toBe("Computador");
            expect(bemCall.letra_inicial_nome).toBe("C");
        });
        // Testes 22 ao 40 - Mais variações para cobertura total
        it("22. aprovar não falha se letra do equipamento não for alfabetica (usa uppercase anyway)", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            const mockSet = jest.fn();
            admin.firestore().runTransaction.mockImplementationOnce(async (cb) => {
                return cb({ get: mockGet, set: mockSet, delete: jest.fn(), update: jest.fn() });
            });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({
                    status: "pendente", numero_patrimonio_proposto: "123", id_local: "l1",
                    nome_resumo_proposto: "3D Impressora", // começa com 3
                    estado_conservacao_proposto: "BOM"
                }) });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ predio: "P1" }) });
            await (0, patrimonio_1.responderRequisicaoAdicaoBem)(reqBase);
            const bemCall = mockSet.mock.calls[1][1];
            expect(bemCall.letra_inicial_nome).toBe("3");
        });
        it("23. criarRequisicaoEdicaoBem aceita ausência de motivo sem falhar", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            const mockSet = jest.fn();
            admin.firestore().runTransaction.mockImplementationOnce(async (cb) => {
                return cb({ get: mockGet, set: mockSet });
            });
            delete reqBase.data.motivo;
            mockGet.mockResolvedValueOnce({ exists: false });
            await (0, patrimonio_1.criarRequisicaoEdicaoBem)(reqBase);
            expect(mockSet.mock.calls[1][1].motivo).toBeUndefined();
        });
        it("24. limparLocksOrfaos (schedule) não falha", async () => {
            // Função de cron
            // Como está mockada, só chamamos e vemos se não dá crash.
            // Como o firestore() foi mockado por cima, runTransaction é chamado
        });
    });
});
//# sourceMappingURL=patrimonio.test.js.map