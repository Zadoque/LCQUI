import { testEnv } from './setup';
import { resolverPapeisDoToken, validarPermissao } from '../auth';
import { HttpsError } from 'firebase-functions/v2/https';

describe('Testes do Módulo de Autenticação e Permissões (auth.ts)', () => {

  afterAll(() => {
    testEnv.cleanup();
  });

  describe('resolverPapeisDoToken', () => {
    it('deve retornar array vazio se não houver token auth', () => {
      const papeis = resolverPapeisDoToken(undefined);
      expect(papeis).toEqual([]);
    });

    it('deve extrair a propriedade roles do custom claim JWT', () => {
      const mockAuth = {
        uid: 'user123',
        token: { roles: ['Professor', 'Chefe_Geral'] }
      };
      const papeis = resolverPapeisDoToken(mockAuth);
      expect(papeis).toEqual(['Professor', 'Chefe_Geral']);
    });

    it('deve retornar array vazio se roles não for um array no token', () => {
      const mockAuth = { uid: 'user123', token: { roles: 'StringEmVezDeArray' } };
      const papeis = resolverPapeisDoToken(mockAuth);
      expect(papeis).toEqual([]);
    });
  });

  describe('validarPermissao', () => {
    it('deve lançar erro unauthenticated se não houver uid no request', () => {
      const req: any = { auth: undefined };
      expect(() => validarPermissao(req, ['Professor'])).toThrow(HttpsError);
      expect(() => validarPermissao(req, ['Professor'])).toThrow('Usuário não autenticado.');
    });

    it('deve lançar erro permission-denied se usuário não tiver o papel exigido', () => {
      const req: any = {
        auth: { uid: 'user123', token: { roles: ['Aluno'] } }
      };
      expect(() => validarPermissao(req, ['Professor', 'Chefe_Geral'])).toThrow(HttpsError);
      expect(() => validarPermissao(req, ['Professor', 'Chefe_Geral'])).toThrow('Usuário sem papel autorizado para esta ação.');
    });

    it('deve retornar os papeis e não lançar erro se o usuário for autorizado', () => {
      const req: any = {
        auth: { uid: 'user123', token: { roles: ['Gestor_Almoxarifado', 'Bolsista'] } }
      };
      const resultado = validarPermissao(req, ['Professor', 'Gestor_Almoxarifado']);
      expect(resultado).toEqual(['Gestor_Almoxarifado', 'Bolsista']);
    });
  });

});
