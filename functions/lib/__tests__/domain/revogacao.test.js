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
const revogarPapel_1 = require("../../domain/revogarPapel");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
// Mocks
jest.mock("firebase-admin", () => {
    const getMock = jest.fn();
    const whereMock = jest.fn().mockReturnThis();
    return {
        firestore: jest.fn(() => ({
            collection: jest.fn(() => ({
                get: getMock,
                where: whereMock
            }))
        }))
    };
});
describe("Domain: Regras de Revogação de Papéis", () => {
    let mockGet;
    beforeEach(() => {
        mockGet = admin.firestore().collection("").get;
        jest.clearAllMocks();
    });
    describe("validarRevogacaoChefeGeral", () => {
        it("deve permitir a revogação se houver mais de um Chefe Geral", async () => {
            mockGet.mockResolvedValueOnce({ size: 2, docs: [] });
            await expect((0, revogarPapel_1.validarRevogacaoChefeGeral)("uid1")).resolves.not.toThrow();
        });
        it("deve rejeitar se o usuário for o único Chefe Geral", async () => {
            mockGet.mockResolvedValueOnce({ size: 1, docs: [{ id: "uid1" }] });
            await expect((0, revogarPapel_1.validarRevogacaoChefeGeral)("uid1")).rejects.toThrow(https_1.HttpsError);
        });
    });
    describe("validarRevogacaoGestorPatrimonial", () => {
        it("deve permitir se houver mais de um Gestor", async () => {
            mockGet.mockResolvedValueOnce({ size: 2, docs: [] });
            await expect((0, revogarPapel_1.validarRevogacaoGestorPatrimonial)("uid1")).resolves.not.toThrow();
        });
        it("deve rejeitar se for o único Gestor Patrimonial", async () => {
            mockGet.mockResolvedValueOnce({ size: 1, docs: [{ id: "uid1" }] });
            await expect((0, revogarPapel_1.validarRevogacaoGestorPatrimonial)("uid1")).rejects.toThrow(https_1.HttpsError);
        });
    });
});
//# sourceMappingURL=revogacao.test.js.map