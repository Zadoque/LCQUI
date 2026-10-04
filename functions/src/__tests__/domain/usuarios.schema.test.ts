import { AtualizarPerfilSchema } from "../../schemas/usuarios.schema";

describe("AtualizarPerfilSchema", () => {
  it("aceita nome válido", () => {
    expect(AtualizarPerfilSchema.safeParse({ nome: "João da Silva" }).success).toBe(true);
  });

  it("faz trim de espaços nas extremidades", () => {
    const result = AtualizarPerfilSchema.parse({ nome: "  Maria  " });
    expect(result.nome).toBe("Maria");
  });

  it("rejeita nome vazio (após trim)", () => {
    expect(AtualizarPerfilSchema.safeParse({ nome: "   " }).success).toBe(false);
  });

  it("rejeita nome ausente", () => {
    expect(AtualizarPerfilSchema.safeParse({}).success).toBe(false);
  });

  it("rejeita nome com mais de 150 caracteres", () => {
    expect(AtualizarPerfilSchema.safeParse({ nome: "A".repeat(151) }).success).toBe(false);
  });

  it("aceita nome com exatamente 150 caracteres", () => {
    expect(AtualizarPerfilSchema.safeParse({ nome: "A".repeat(150) }).success).toBe(true);
  });

  it("rejeita nome não-string", () => {
    expect(AtualizarPerfilSchema.safeParse({ nome: 123 }).success).toBe(false);
  });
});
