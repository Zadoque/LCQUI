import {
  AceitarConviteAlunoSchema,
  ConvidarAlunoSchema,
  ObterDetalhesConviteAlunoSchema,
  RejeitarConviteAlunoSchema,
} from "../../schemas/convites.schema";

const BASE_CONVITE = {
  idOperacao: "op_convite_1",
  email: "aluno@uenf.br",
  idTurma: "turma_1",
  excederCapacidade: false,
};

const BASE_ACEITE = {
  idOperacao: "op_aceite_1",
  idConvite: "convite_1",
};

describe("Schemas de payload de Convite_Aluno", () => {
  describe("emissão", () => {
    it("aceita ausência dos campos opcionais no convite ordinário", () => {
      expect(ConvidarAlunoSchema.safeParse(BASE_CONVITE).success).toBe(true);
    });

    it.each([
      ["matricula", { matricula: null }],
      ["justificativaExcecao", { justificativaExcecao: null }],
    ])("rejeita null em %s", (_campo, complemento) => {
      expect(ConvidarAlunoSchema.safeParse({ ...BASE_CONVITE, ...complemento }).success).toBe(false);
    });

    it("exige justificativa não vazia exatamente quando há exceção", () => {
      expect(ConvidarAlunoSchema.safeParse({ ...BASE_CONVITE, excederCapacidade: true }).success).toBe(false);
      expect(ConvidarAlunoSchema.safeParse({
        ...BASE_CONVITE,
        excederCapacidade: true,
        justificativaExcecao: "Exceção nominal documentada.",
      }).success).toBe(true);
      expect(ConvidarAlunoSchema.safeParse({
        ...BASE_CONVITE,
        justificativaExcecao: "Não aplicável ao convite ordinário.",
      }).success).toBe(false);
    });
  });

  describe("aceitação", () => {
    it("aceita exatamente uma das vias canônicas", () => {
      expect(AceitarConviteAlunoSchema.safeParse({ ...BASE_ACEITE, tokenConvite: "token" }).success).toBe(true);
      expect(AceitarConviteAlunoSchema.safeParse({ ...BASE_ACEITE, viaNotificacao: true }).success).toBe(true);
      expect(AceitarConviteAlunoSchema.safeParse(BASE_ACEITE).success).toBe(false);
      expect(AceitarConviteAlunoSchema.safeParse({ ...BASE_ACEITE, tokenConvite: "token", viaNotificacao: false }).success).toBe(false);
      expect(AceitarConviteAlunoSchema.safeParse({
        ...BASE_ACEITE,
        tokenConvite: "token",
        viaNotificacao: true,
      }).success).toBe(false);
    });

    it.each([
      ["viaNotificacao", { viaNotificacao: null }],
      ["matriculaInformada", { tokenConvite: "token", matriculaInformada: null }],
      ["nomeInformado", { tokenConvite: "token", nomeInformado: null }],
      ["tokenConvite", { tokenConvite: null, viaNotificacao: true }],
    ])("rejeita null em %s", (_campo, complemento) => {
      expect(AceitarConviteAlunoSchema.safeParse({ ...BASE_ACEITE, ...complemento }).success).toBe(false);
    });

    it("aceita dados de bootstrap ausentes ou válidos e respeita seus limites", () => {
      expect(AceitarConviteAlunoSchema.safeParse({ ...BASE_ACEITE, tokenConvite: "token" }).success).toBe(true);
      expect(AceitarConviteAlunoSchema.safeParse({
        ...BASE_ACEITE,
        tokenConvite: "token",
        nomeInformado: "Aluno Novo",
        matriculaInformada: "000123",
      }).success).toBe(true);
      expect(AceitarConviteAlunoSchema.safeParse({
        ...BASE_ACEITE,
        tokenConvite: "token",
        nomeInformado: "A".repeat(151),
      }).success).toBe(false);
      expect(AceitarConviteAlunoSchema.safeParse({
        ...BASE_ACEITE,
        tokenConvite: "token",
        matriculaInformada: " ",
      }).success).toBe(false);
    });
  });

  it("rejeita token null nos payloads auxiliares e aceita sua ausência", () => {
    expect(RejeitarConviteAlunoSchema.safeParse(BASE_ACEITE).success).toBe(true);
    expect(ObterDetalhesConviteAlunoSchema.safeParse({ idConvite: "convite_1" }).success).toBe(true);
    expect(RejeitarConviteAlunoSchema.safeParse({ ...BASE_ACEITE, tokenConvite: null }).success).toBe(false);
    expect(ObterDetalhesConviteAlunoSchema.safeParse({ idConvite: "convite_1", tokenConvite: null }).success).toBe(false);
  });
});
