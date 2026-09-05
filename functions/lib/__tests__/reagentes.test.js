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
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const reagentes_1 = require("../reagentes");
jest.mock("firebase-admin", () => {
    const getMock = jest.fn();
    const updateMock = jest.fn();
    const setMock = jest.fn();
    return {
        firestore: Object.assign(jest.fn(() => ({
            collection: jest.fn(() => ({
                doc: jest.fn(() => ({
                    get: getMock,
                    id: "doc_id_mock"
                }))
            })),
            runTransaction: jest.fn(async (cb) => {
                const tx = {
                    get: getMock,
                    update: updateMock,
                    set: setMock,
                };
                return cb(tx);
            })
        })), {
            FieldValue: {
                serverTimestamp: jest.fn(() => "mocked_timestamp"),
                increment: jest.fn((val) => val)
            }
        })
    };
});
// Mocks do módulo de auth para burlar as checagens
jest.mock("../auth", () => ({
    validarPermissao: jest.fn(),
    validarGestorDoAlmoxarifado: jest.fn().mockResolvedValue(undefined)
}));
describe("Reagentes Module (40+ Tests)", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe("calcularValidadeEfetivaNaAbertura", () => {
        it("1. deve retornar null se não houver validade fechado nem apos aberto", () => {
            const frasco = {};
            expect((0, reagentes_1.calcularValidadeEfetivaNaAbertura)(frasco, new Date())).toBeNull();
        });
        it("2. deve usar a validade_fechado se validade_apos_aberto não existir", () => {
            const data = new Date('2023-12-31T12:00:00Z');
            const frasco = { validade_fechado: data };
            expect((0, reagentes_1.calcularValidadeEfetivaNaAbertura)(frasco, new Date())).toEqual(data);
        });
        it("3. deve usar a dataAbertura + validade_apos_aberto se validade_fechado não existir", () => {
            const agora = new Date('2023-01-01T12:00:00Z');
            const frasco = { validade_apos_aberto_dias: 30 };
            const esperado = new Date('2023-01-31T12:00:00Z');
            expect((0, reagentes_1.calcularValidadeEfetivaNaAbertura)(frasco, agora)).toEqual(esperado);
        });
        it("4. deve usar a menor validade quando ambas existem", () => {
            const agora = new Date('2023-01-01T12:00:00Z');
            const frasco = { validade_fechado: new Date('2023-12-31T12:00:00Z'), validade_apos_aberto_dias: 30 };
            const esperado = new Date('2023-01-31T12:00:00Z');
            expect((0, reagentes_1.calcularValidadeEfetivaNaAbertura)(frasco, agora)).toEqual(esperado);
        });
        it("5. deve usar a validade_fechado se a validade_apos_aberto for maior", () => {
            const agora = new Date('2023-11-01T12:00:00Z');
            const frasco = { validade_fechado: new Date('2023-12-01T12:00:00Z'), validade_apos_aberto_dias: 90 };
            expect((0, reagentes_1.calcularValidadeEfetivaNaAbertura)(frasco, agora)).toEqual(frasco.validade_fechado);
        });
    });
    describe("cadastrarFrascoFechado", () => {
        let reqBase;
        beforeEach(() => {
            const mockGet = admin.firestore().collection("dummy").doc("").get;
            mockGet.mockReset();
            reqBase = {
                rawRequest: { on: jest.fn() },
                auth: { uid: "user_1", token: {} },
                data: {
                    idEspecificacaoReagente: "espec_1",
                    idAlmoxarifado: "almox_1",
                    pesoTotal: 500,
                    volumeNominal: 400
                }
            };
        });
        it("6. deve lançar not-found se especificação não existir", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: false });
            await expect((0, reagentes_1.cadastrarFrascoFechado)(reqBase))
                .rejects.toThrow(new https_1.HttpsError("not-found", "Especificação de reagente não encontrada."));
        });
        it("7. deve lançar failed-precondition se liquido não tiver densidade", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "LIQUIDO" }) });
            await expect((0, reagentes_1.cadastrarFrascoFechado)(reqBase))
                .rejects.toThrow(new https_1.HttpsError("failed-precondition", "Líquido exige densidade positiva."));
        });
        it("8. deve calcular peso vazio corretamente para SÓLIDO (peso - nominal)", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            // get da especificação
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "SOLIDO" }) });
            // get do contador dentro da transaction
            mockGet.mockResolvedValueOnce({ data: () => ({ ultimo_codigo_gerado: 5 }) });
            const res = await (0, reagentes_1.cadastrarFrascoFechado)(reqBase);
            expect(res.pesoVazioCalculado).toBe(100); // 500 - 400
            expect(res.codigoFrasco).toBe("LCQUI-6");
        });
        it("9. deve calcular peso vazio corretamente para LIQUIDO com densidade", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "LIQUIDO", densidade: 1.1 }) });
            mockGet.mockResolvedValueOnce({ data: () => ({ ultimo_codigo_gerado: 10 }) });
            const res = await (0, reagentes_1.cadastrarFrascoFechado)(reqBase);
            // 500 - (400 * 1.1) = 500 - 440 = 60
            expect(res.pesoVazioCalculado).toBeCloseTo(60);
        });
        it("10. deve lançar invalid-argument se pesoVazio <= 0", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "SOLIDO" }) });
            reqBase.data.pesoTotal = 300; // menor que 400 nominal
            await expect((0, reagentes_1.cadastrarFrascoFechado)(reqBase))
                .rejects.toThrow(new https_1.HttpsError("invalid-argument", "Peso total incompatível com o volume nominal para esta densidade."));
        });
        it("11. deve identificar vencimento no cadastro", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "SOLIDO" }) });
            mockGet.mockResolvedValueOnce({ data: () => ({ ultimo_codigo_gerado: 5 }) });
            reqBase.data.validadeFechado = new Date(Date.now() - 10000).toISOString(); // no passado
            reqBase.data.decisaoSeJaVencido = "DISPONIVEL";
            const res = await (0, reagentes_1.cadastrarFrascoFechado)(reqBase);
            expect(res.venceuNoCadastro).toBe(true);
        });
        it("12. deve lançar failed-precondition se vencido e sem decisão", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "SOLIDO" }) });
            reqBase.data.validadeFechado = new Date(Date.now() - 10000).toISOString();
            await expect((0, reagentes_1.cadastrarFrascoFechado)(reqBase))
                .rejects.toThrow(new https_1.HttpsError("failed-precondition", "O frasco está vencido no cadastro e exige uma decisão do gestor."));
        });
        it("13. deve lançar invalid-argument se Quarentena não tiver detalheStatus", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "SOLIDO" }) });
            reqBase.data.validadeFechado = new Date(Date.now() - 10000).toISOString();
            reqBase.data.decisaoSeJaVencido = "QUARENTENA";
            await expect((0, reagentes_1.cadastrarFrascoFechado)(reqBase))
                .rejects.toThrow(new https_1.HttpsError("invalid-argument", "A entrada em quarentena exige detalhe_status."));
        });
    });
    describe("registrarRetirada", () => {
        let reqBase;
        beforeEach(() => {
            const mockGet = admin.firestore().collection("dummy").doc("").get;
            mockGet.mockReset();
            reqBase = {
                rawRequest: { on: jest.fn() },
                auth: { uid: "user_1", token: {} },
                data: {
                    idFrasco: "frasco_1",
                    pesoRetirada: 450 // Peso da balança, deve ser MENOR que o peso atual para subtrair
                }
            };
        });
        it("14. deve lançar not-found se frasco não existir", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true }); // prof
            mockGet.mockResolvedValueOnce({ exists: false }); // bols
            mockGet.mockResolvedValueOnce({ exists: false }); // frasco
            await expect((0, reagentes_1.registrarRetirada)(reqBase)).rejects.toThrow(new https_1.HttpsError("not-found", "Frasco não encontrado."));
        });
        it("15. deve lançar failed-precondition se frasco indisponível", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true });
            mockGet.mockResolvedValueOnce({ exists: false });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ peso_atual: undefined, disponibilidade: "EM_USO" }) });
            await expect((0, reagentes_1.registrarRetirada)(reqBase)).rejects.toThrowError("Frasco não está disponível para retirada.");
        });
        it("16. deve lançar failed-precondition se frasco indisponível (QUARENTENA)", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true });
            mockGet.mockResolvedValueOnce({ exists: false });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ peso_atual: 500, disponibilidade: "QUARENTENA" }) });
            await expect((0, reagentes_1.registrarRetirada)(reqBase)).rejects.toThrowError("Frasco não está disponível para retirada.");
        });
        it("17. deve registrar a retirada com sucesso", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true });
            mockGet.mockResolvedValueOnce({ exists: false });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({
                    peso_atual: 500,
                    disponibilidade: "DISPONIVEL",
                    peso_frasco_vazio: 100,
                    estado_fisico_frasco: "ABERTO",
                    id_especificacao_reagente: "espec_1"
                }) });
            const res = await (0, reagentes_1.registrarRetirada)(reqBase);
            expect(res.idEmprestimo).toBeDefined();
        });
    });
    describe("registrarDevolucao", () => {
        let reqBase;
        beforeEach(() => {
            const mockGet = admin.firestore().collection("dummy").doc("").get;
            mockGet.mockReset();
            reqBase = {
                rawRequest: { on: jest.fn() },
                auth: { uid: "user_1", token: {} },
                data: {
                    idEmprestimo: "emp_1",
                    pesoRetorno: 400
                }
            };
        });
        it("21. deve lançar not-found se emprestimo não existir", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: false });
            await expect((0, reagentes_1.registrarDevolucao)(reqBase)).rejects.toThrowError("Empréstimo não encontrado.");
        });
        it("22. deve lançar falha se emprestimo ja devolvido", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: "DEVOLVIDO" }) }); // emprestimo
            await expect((0, reagentes_1.registrarDevolucao)(reqBase)).rejects.toThrowError("Empréstimo já foi devolvido.");
        });
        it("23. deve aprovar devolução e consumo, se novo peso for igual ao da retirada", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: "EM_USO", id_frasco_reagente: "frasco_1", peso_saida: 450, data_devolucao_prevista: new Date() }) }); // emprestimo
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({
                    id_almoxarifado: "almox_1",
                    peso_atual: 450,
                    peso_frasco_vazio: 100,
                    id_especificacao_reagente: "espec_1"
                }) }); // frasco
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "SOLIDO" }) }); // spec
            reqBase.data.pesoRetorno = 400; // peso_saida era 450, devolveu com 400, consumo 50
            const res = await (0, reagentes_1.registrarDevolucao)(reqBase);
            expect(res.pesoConsumido).toBe(50);
        });
        it("24. deve tolerar devolução 2% maior que peso_retirada para SOLIDO", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: "EM_USO", id_frasco_reagente: "f1", peso_saida: 450, data_devolucao_prevista: new Date() }) }); // emp
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ id_almoxarifado: "a1", peso_atual: 450, peso_frasco_vazio: 100, id_especificacao_reagente: "es_1" }) });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "SOLIDO" }) });
            reqBase.data.pesoRetorno = 458; // 8g a mais, 2% de 450 = 9g. OK.
            const res = await (0, reagentes_1.registrarDevolucao)(reqBase);
            expect(res.pesoConsumido).toBe(0);
        });
        it("25. deve rejeitar devolução MAIOR que peso_retirada + tolerância", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ status: "EM_USO", id_frasco_reagente: "f1", peso_saida: 450, data_devolucao_prevista: new Date() }) }); // emp
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ id_almoxarifado: "a1", peso_atual: 450, peso_frasco_vazio: 100, id_especificacao_reagente: "es_1" }) });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "SOLIDO" }) });
            reqBase.data.pesoRetorno = 460; // 10g a mais (passa dos 9g de tolerância)
            await expect((0, reagentes_1.registrarDevolucao)(reqBase)).rejects.toThrowError("excede 102% da massa de saída");
        });
    });
    describe("registrarAberturaFrasco", () => {
        let reqBase;
        beforeEach(() => {
            const mockGet = admin.firestore().collection("dummy").doc("").get;
            mockGet.mockReset();
            reqBase = {
                rawRequest: { on: jest.fn() },
                auth: { uid: "user_1", token: {} },
                data: { idFrasco: "frasco_1" }
            };
        });
        it("26. deve falhar se frasco não for achado", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: false });
            await expect((0, reagentes_1.registrarAberturaFrasco)(reqBase)).rejects.toThrowError("Frasco não encontrado.");
        });
        it("27. deve falhar se o frasco ja estiver ABERTO", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico_frasco: "ABERTO" }) });
            await expect((0, reagentes_1.registrarAberturaFrasco)(reqBase)).rejects.toThrowError("Somente um frasco FECHADO pode ser aberto");
        });
        it("28. deve abrir frasco FECHADO sem recalcular validade se validade_desconhecida = true", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({
                    estado_fisico_frasco: "FECHADO",
                    disponibilidade: "DISPONIVEL",
                    validade_desconhecida: true
                }) });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({}) }); // spec
            const res = await (0, reagentes_1.registrarAberturaFrasco)(reqBase);
            expect(res.validadeEfetiva).toBeNull();
        });
        it("29. deve recalcular validade baseando na Especificação", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({
                    estado_fisico_frasco: "FECHADO",
                    disponibilidade: "DISPONIVEL",
                    id_especificacao_reagente: "espec_1"
                }) });
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ validade_apos_aberto_dias: 10 }) }); // spec
            const res = await (0, reagentes_1.registrarAberturaFrasco)(reqBase);
            expect(res.validadeEfetiva).toBeDefined();
        });
        it("30. deve bloquear abertura se frasco nao for DISPONIVEL", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({
                    estado_fisico_frasco: "FECHADO",
                    disponibilidade: "QUARENTENA"
                }) });
            await expect((0, reagentes_1.registrarAberturaFrasco)(reqBase)).rejects.toThrowError("Somente frascos DISPONIVEL podem ser abertos.");
        });
    });
    describe("cadastrarFrascoAberto", () => {
        let reqBase;
        beforeEach(() => {
            const mockGet = admin.firestore().collection("dummy").doc("").get;
            mockGet.mockReset();
            reqBase = {
                rawRequest: { on: jest.fn() },
                auth: { uid: "user_1", token: {} },
                data: {
                    idEspecificacaoReagente: "espec_1",
                    idAlmoxarifado: "almox_1",
                    modalidade: "CONHECE_TARA",
                    pesoTotalBalanca: 300,
                    pesoFrascoVazioInformado: 100
                }
            };
        });
        it("31. falha se especificação nao existe", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: false });
            await expect((0, reagentes_1.cadastrarFrascoAberto)(reqBase)).rejects.toThrowError("Especificação");
        });
        it("32. falha se liquido e sem densidade", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "LIQUIDO" }) });
            await expect((0, reagentes_1.cadastrarFrascoAberto)(reqBase)).rejects.toThrowError("Líquido exige densidade");
        });
        it("33. modalidade CONHECE_TARA solido ok", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "SOLIDO" }) });
            mockGet.mockResolvedValueOnce({ data: () => ({}) }); // contador
            const res = await (0, reagentes_1.cadastrarFrascoAberto)(reqBase);
            expect(res.pesoVazio).toBe(100);
            expect(res.conteudoNominal).toBe(200); // 300 - 100
        });
        it("34. modalidade CONHECE_TARA liquido usa densidade", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "LIQUIDO", densidade: 2 }) });
            mockGet.mockResolvedValueOnce({ data: () => ({}) });
            const res = await (0, reagentes_1.cadastrarFrascoAberto)(reqBase);
            expect(res.conteudoNominal).toBe(100); // (300 - 100)/2
        });
        it("35. modalidade ESTIMA_VOLUME em SOLIDO lança erro", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "SOLIDO" }) });
            reqBase.data.modalidade = "ESTIMA_VOLUME";
            await expect((0, reagentes_1.cadastrarFrascoAberto)(reqBase)).rejects.toThrowError("Apenas LÍQUIDOS podem usar ESTIMA_VOLUME.");
        });
        it("36. modalidade ESTIMA_MASSA em LIQUIDO lança erro", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "LIQUIDO", densidade: 1 }) });
            reqBase.data.modalidade = "ESTIMA_MASSA";
            await expect((0, reagentes_1.cadastrarFrascoAberto)(reqBase)).rejects.toThrowError("Apenas SÓLIDOS podem usar ESTIMA_MASSA.");
        });
        it("37. modalidade ESTIMA_MASSA solido calcula tara corretamente", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "SOLIDO" }) });
            mockGet.mockResolvedValueOnce({ data: () => ({}) });
            reqBase.data.modalidade = "ESTIMA_MASSA";
            reqBase.data.massaAtualEstimada = 150;
            const res = await (0, reagentes_1.cadastrarFrascoAberto)(reqBase);
            expect(res.pesoVazio).toBe(150); // 300 - 150 = 150 tara
            expect(res.conteudoNominal).toBe(150);
        });
        it("38. modalidade ESTIMA_VOLUME liquido calcula tara corretamente", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "LIQUIDO", densidade: 1.5 }) });
            mockGet.mockResolvedValueOnce({ data: () => ({}) });
            reqBase.data.modalidade = "ESTIMA_VOLUME";
            reqBase.data.volumeAtualEstimado = 100; // ml
            const res = await (0, reagentes_1.cadastrarFrascoAberto)(reqBase);
            // massa = 100 * 1.5 = 150g. Tara = 300 - 150 = 150
            expect(res.pesoVazio).toBe(150);
            expect(res.conteudoNominal).toBe(100);
        });
        it("39. falha se validadeAberto estiver vencida e nao houver decisao", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "SOLIDO" }) });
            reqBase.data.validadeAberto = new Date(Date.now() - 100000).toISOString();
            await expect((0, reagentes_1.cadastrarFrascoAberto)(reqBase)).rejects.toThrowError("exige uma decisão");
        });
        it("40. cadastra vencido se houver decisao QUARENTENA e detalhe", async () => {
            const mockGet = admin.firestore().collection("").doc("").get;
            mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ estado_fisico: "SOLIDO" }) });
            mockGet.mockResolvedValueOnce({ data: () => ({}) });
            reqBase.data.validadeAberto = new Date(Date.now() - 100000).toISOString();
            reqBase.data.decisaoSeJaVencido = "QUARENTENA";
            reqBase.data.detalheStatus = "Separado para analise";
            const res = await (0, reagentes_1.cadastrarFrascoAberto)(reqBase);
            expect(res.venceuNoCadastro).toBe(true);
        });
    });
});
//# sourceMappingURL=reagentes.test.js.map