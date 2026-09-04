"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const setup_1 = require("./setup");
const auth_1 = require("../auth");
const https_1 = require("firebase-functions/v2/https");
describe('Testes do Módulo de Autenticação e Permissões (auth.ts)', () => {
    afterAll(() => {
        setup_1.testEnv.cleanup();
    });
    describe('resolverPapeisDoToken', () => {
        it('deve retornar array vazio se não houver token auth', () => {
            const papeis = (0, auth_1.resolverPapeisDoToken)(undefined);
            expect(papeis).toEqual([]);
        });
        it('deve extrair a propriedade roles do custom claim JWT', () => {
            const mockAuth = {
                uid: 'user123',
                token: { roles: ['Professor', 'Chefe_Geral'] }
            };
            const papeis = (0, auth_1.resolverPapeisDoToken)(mockAuth);
            expect(papeis).toEqual(['Professor', 'Chefe_Geral']);
        });
        it('deve retornar array vazio se roles não for um array no token', () => {
            const mockAuth = { uid: 'user123', token: { roles: 'StringEmVezDeArray' } };
            const papeis = (0, auth_1.resolverPapeisDoToken)(mockAuth);
            expect(papeis).toEqual([]);
        });
    });
    describe('validarPermissao', () => {
        it('deve lançar erro unauthenticated se não houver uid no request', () => {
            const req = { auth: undefined };
            expect(() => (0, auth_1.validarPermissao)(req, ['Professor'])).toThrow(https_1.HttpsError);
            expect(() => (0, auth_1.validarPermissao)(req, ['Professor'])).toThrow('Usuário não autenticado.');
        });
        it('deve lançar erro permission-denied se usuário não tiver o papel exigido', () => {
            const req = {
                auth: { uid: 'user123', token: { roles: ['Aluno'] } }
            };
            expect(() => (0, auth_1.validarPermissao)(req, ['Professor', 'Chefe_Geral'])).toThrow(https_1.HttpsError);
            expect(() => (0, auth_1.validarPermissao)(req, ['Professor', 'Chefe_Geral'])).toThrow('Usuário sem papel autorizado para esta ação.');
        });
        it('deve retornar os papeis e não lançar erro se o usuário for autorizado', () => {
            const req = {
                auth: { uid: 'user123', token: { roles: ['Gestor_Almoxarifado', 'Bolsista'] } }
            };
            const resultado = (0, auth_1.validarPermissao)(req, ['Professor', 'Gestor_Almoxarifado']);
            expect(resultado).toEqual(['Gestor_Almoxarifado', 'Bolsista']);
        });
    });
});
//# sourceMappingURL=auth.test.js.map