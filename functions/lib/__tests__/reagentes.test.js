"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const setup_1 = require("./setup");
const reagentes_1 = require("../reagentes");
describe('Testes do Módulo de Reagentes (reagentes.ts)', () => {
    afterAll(() => {
        setup_1.testEnv.cleanup();
    });
    describe('calcularValidadeEfetivaNaAbertura', () => {
        it('deve retornar null se validade_desconhecida for true', () => {
            const frasco = { validade_desconhecida: true };
            const resultado = (0, reagentes_1.calcularValidadeEfetivaNaAbertura)(frasco, new Date());
            expect(resultado).toBeNull();
        });
        it('deve usar a menor validade quando ambas existem', () => {
            const agora = new Date('2023-01-01T12:00:00Z');
            const frasco = {
                validade_fechado: new Date('2023-12-31T12:00:00Z'),
                validade_apos_aberto_dias: 30
            };
            const resultado = (0, reagentes_1.calcularValidadeEfetivaNaAbertura)(frasco, agora);
            const esperado = new Date('2023-01-31T12:00:00Z');
            expect(resultado).toEqual(esperado);
        });
        it('deve usar a validade_fechado se a validade_apos_aberto for maior', () => {
            const agora = new Date('2023-11-01T12:00:00Z');
            const frasco = {
                validade_fechado: new Date('2023-12-01T12:00:00Z'), // 30 dias depois
                validade_apos_aberto_dias: 90 // 90 dias depois
            };
            const resultado = (0, reagentes_1.calcularValidadeEfetivaNaAbertura)(frasco, agora);
            expect(resultado).toEqual(frasco.validade_fechado);
        });
    });
});
//# sourceMappingURL=reagentes.test.js.map