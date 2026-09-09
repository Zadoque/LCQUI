import { validarRevogacaoChefeGeral, validarRevogacaoGestorAlmoxarifado, validarRevogacaoGestorPatrimonial } from "../domain/revogarPapel";
import { HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

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
  let mockGet: jest.Mock;
  let mockWhere: jest.Mock;

  beforeEach(() => {
    mockGet = admin.firestore().collection("").get as jest.Mock;
    mockWhere = admin.firestore().collection("").where as jest.Mock;
    jest.clearAllMocks();
  });

  describe("validarRevogacaoChefeGeral", () => {
    it("deve permitir a revogação se houver mais de um Chefe Geral", async () => {
      mockGet.mockResolvedValueOnce({ size: 2, docs: [] });
      await expect(validarRevogacaoChefeGeral("uid1")).resolves.not.toThrow();
    });

    it("deve rejeitar se o usuário for o único Chefe Geral", async () => {
      mockGet.mockResolvedValueOnce({ size: 1, docs: [{ id: "uid1" }] });
      await expect(validarRevogacaoChefeGeral("uid1")).rejects.toThrow(HttpsError);
    });
  });

  describe("validarRevogacaoGestorPatrimonial", () => {
    it("deve permitir se houver mais de um Gestor", async () => {
      mockGet.mockResolvedValueOnce({ size: 2, docs: [] });
      await expect(validarRevogacaoGestorPatrimonial("uid1")).resolves.not.toThrow();
    });

    it("deve rejeitar se for o único Gestor Patrimonial", async () => {
      mockGet.mockResolvedValueOnce({ size: 1, docs: [{ id: "uid1" }] });
      await expect(validarRevogacaoGestorPatrimonial("uid1")).rejects.toThrow(HttpsError);
    });
  });
});
