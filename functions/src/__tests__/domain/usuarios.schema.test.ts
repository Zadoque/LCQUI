import { AtualizarPerfilSchema, BuscarProfessoresSchema } from "../../schemas/usuarios.schema";

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

describe("BuscarProfessoresSchema", () => {
  it("aceita payload vazio {}", () => {
    expect(BuscarProfessoresSchema.safeParse({}).success).toBe(true);
  });

  it("aceita { termo } válido", () => {
    expect(BuscarProfessoresSchema.safeParse({ termo: "Silva" }).success).toBe(true);
  });

  it("faz trim do termo", () => {
    const result = BuscarProfessoresSchema.parse({ termo: "  João  " });
    expect(result.termo).toBe("João");
  });

  it("rejeita termo com mais de 150 caracteres", () => {
    expect(BuscarProfessoresSchema.safeParse({ termo: "A".repeat(151) }).success).toBe(false);
  });

  it("aceita termo com exatamente 150 caracteres", () => {
    expect(BuscarProfessoresSchema.safeParse({ termo: "A".repeat(150) }).success).toBe(true);
  });

  it("rejeita termo não-string", () => {
    expect(BuscarProfessoresSchema.safeParse({ termo: 123 }).success).toBe(false);
  });
});
