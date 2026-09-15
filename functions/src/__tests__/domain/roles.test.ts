import { validarMatrizPapeis } from "../../auth";
import { HttpsError } from "firebase-functions/v2/https";

describe("Domain: Matriz de Papéis", () => {
  it("Chefe Geral + qualquer outro = erro", () => {
    expect(() => validarMatrizPapeis(["Chefe_Geral", "Professor"])).toThrow(HttpsError);
    expect(() => validarMatrizPapeis(["Chefe_Geral", "Professor"])).toThrow("Chefe Geral não pode possuir nenhum outro papel.");
  });

  it("Aluno + Professor = erro", () => {
    expect(() => validarMatrizPapeis(["Aluno", "Professor"])).toThrow(HttpsError);
    expect(() => validarMatrizPapeis(["Aluno", "Professor"])).toThrow("O usuário que é aluno não pode ser professor.");
  });

  it.each([
    { caso: "Bolsista isolado", roles: ["Bolsista"] },
    { caso: "Bolsista com Gestor", roles: ["Bolsista", "Gestor_Almoxarifado"] },
  ])("$caso sem Aluno = erro", ({ roles }) => {
    expect(() => validarMatrizPapeis(roles)).toThrow(HttpsError);
    expect(() => validarMatrizPapeis(roles)).toThrow("Bolsista exige papel Aluno.");
  });

  it("Aluno + Bolsista + Gestor_Almoxarifado = erro", () => {
    expect(() => validarMatrizPapeis(["Aluno", "Bolsista", "Gestor_Almoxarifado"])).toThrow(HttpsError);
    expect(() => validarMatrizPapeis(["Aluno", "Bolsista", "Gestor_Almoxarifado"])).toThrow("O usuário Bolsista não pode ser Gestor de Almoxarifado.");
  });

  it("Professor + Gestor_Bens_Patrimoniais = sucesso", () => {
    expect(() => validarMatrizPapeis(["Professor", "Gestor_Bens_Patrimoniais"])).not.toThrow();
  });

  it("Aluno + Bolsista = sucesso", () => {
    expect(() => validarMatrizPapeis(["Aluno", "Bolsista"])).not.toThrow();
  });
  
  it("Chefe Geral sozinho = sucesso", () => {
    expect(() => validarMatrizPapeis(["Chefe_Geral"])).not.toThrow();
  });
});
