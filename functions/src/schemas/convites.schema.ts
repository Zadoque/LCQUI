import { z } from "zod";

export const IdOperacaoConviteSchema = z
  .string()
  .min(1, "idOperacao é obrigatório.")
  .max(128, "idOperacao excede o limite de 128 caracteres.")
  .regex(/^[A-Za-z0-9_-]{1,128}$/, "idOperacao deve conter apenas caracteres seguros [A-Za-z0-9_-].");

export const ConvidarAlunoSchema = z
  .object({
    idOperacao: IdOperacaoConviteSchema,
    email: z
      .string()
      .trim()
      .email("Formato de e-mail inválido.")
      .max(150, "E-mail deve ter no máximo 150 caracteres."),
    idTurma: z.string().trim().nullable().optional(),
    matricula: z.string().trim().min(1, "Matrícula não pode ser vazia.").max(20, "Matrícula deve ter no máximo 20 caracteres.").optional(),
    excederCapacidade: z.boolean().default(false),
    justificativaExcecao: z.string().trim().optional(),
  })
  .refine(
    (dados) => {
      return dados.excederCapacidade
        ? typeof dados.justificativaExcecao === "string" && dados.justificativaExcecao.length > 0
        : dados.justificativaExcecao === undefined;
    },
    {
      message: "Justificativa de exceção é obrigatória quando exceder_capacidade for true.",
      path: ["justificativaExcecao"],
    }
  );

export const AceitarConviteAlunoSchema = z
  .object({
    idOperacao: IdOperacaoConviteSchema,
    idConvite: z.string().trim().min(1, "idConvite é obrigatório."),
    tokenConvite: z.string().trim().min(1, "tokenConvite não pode ser vazio.").optional(),
    viaNotificacao: z.literal(true).optional(),
    nomeInformado: z.string().trim().min(1, "Nome informado não pode ser vazio.").max(150, "Nome deve ter no máximo 150 caracteres.").optional(),
    matriculaInformada: z.string().trim().min(1, "Matrícula não pode ser vazia.").max(20, "Matrícula deve ter no máximo 20 caracteres.").optional(),
  })
  .refine(
    (dados) => Boolean(dados.tokenConvite) !== Boolean(dados.viaNotificacao),
    {
      message: "Forneça exatamente uma via de aceite: token externo ou notificação interna.",
      path: ["tokenConvite"],
    }
  );

export const RejeitarConviteAlunoSchema = z.object({
  idOperacao: IdOperacaoConviteSchema,
  idConvite: z.string().trim().min(1, "idConvite é obrigatório."),
  tokenConvite: z.string().trim().min(1, "tokenConvite não pode ser vazio.").optional(),
});

export const ObterDetalhesConviteAlunoSchema = z.object({
  idConvite: z.string().trim().min(1, "idConvite é obrigatório."),
  tokenConvite: z.string().trim().min(1, "tokenConvite não pode ser vazio.").optional(),
});
