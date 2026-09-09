"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../../auth");
const https_1 = require("firebase-functions/v2/https");
describe("Domain: Matriz de Papéis", () => {
    it("Chefe Geral + qualquer outro = erro", () => {
        expect(() => (0, auth_1.validarMatrizPapeis)(["Chefe_Geral", "Professor"])).toThrow(https_1.HttpsError);
        expect(() => (0, auth_1.validarMatrizPapeis)(["Chefe_Geral", "Professor"])).toThrow("Chefe Geral não pode possuir nenhum outro papel.");
    });
    it("Aluno + Professor = erro", () => {
        expect(() => (0, auth_1.validarMatrizPapeis)(["Aluno", "Professor"])).toThrow(https_1.HttpsError);
        expect(() => (0, auth_1.validarMatrizPapeis)(["Aluno", "Professor"])).toThrow("O usuário que é aluno não pode ser professor.");
    });
    it("Bolsista + Gestor_Almoxarifado = erro", () => {
        expect(() => (0, auth_1.validarMatrizPapeis)(["Bolsista", "Gestor_Almoxarifado"])).toThrow(https_1.HttpsError);
        expect(() => (0, auth_1.validarMatrizPapeis)(["Bolsista", "Gestor_Almoxarifado"])).toThrow("O usuário Bolsista não pode ser Gestor de Almoxarifado.");
    });
    it("Professor + Gestor_Bens_Patrimoniais = sucesso", () => {
        expect(() => (0, auth_1.validarMatrizPapeis)(["Professor", "Gestor_Bens_Patrimoniais"])).not.toThrow();
    });
    it("Aluno + Bolsista = sucesso", () => {
        expect(() => (0, auth_1.validarMatrizPapeis)(["Aluno", "Bolsista"])).not.toThrow();
    });
    it("Chefe Geral sozinho = sucesso", () => {
        expect(() => (0, auth_1.validarMatrizPapeis)(["Chefe_Geral"])).not.toThrow();
    });
});
//# sourceMappingURL=roles.test.js.map