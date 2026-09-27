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
    matricula: z.string().trim().max(20, "Matrícula deve ter no máximo 20 caracteres.").optional(),
    excederCapacidade: z.boolean().default(false),
    justificativaExcecao: z.string().trim().optional(),
  })
  .refine(
    (dados) => {
      if (dados.excederCapacidade) {
        return typeof dados.justificativaExcecao === "string" && dados.justificativaExcecao.length > 0;
      }
      return true;
    },
    {
      message: "Justificativa de exceção é obrigatória quando exceder_capacidade for true.",
      path: ["justificativaExcecao"],
    }
  );

export const AceitarConviteAlunoSchema = z.object({
  idOperacao: IdOperacaoConviteSchema,
  idConvite: z.string().trim().min(1, "idConvite é obrigatório."),
  tokenConvite: z.string().trim().min(1, "tokenConvite é obrigatório."),
  nomeInformado: z.string().trim().min(1, "Nome informado não pode ser vazio.").max(200, "Nome muito longo.").optional(),
  matriculaInformada: z.string().trim().max(20, "Matrícula deve ter no máximo 20 caracteres.").optional(),
});
