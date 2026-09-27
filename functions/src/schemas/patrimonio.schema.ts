import { z } from "zod";

export const IdOperacaoPatrimonioSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,128}$/, "idOperacao inválido (use [A-Za-z0-9_-]{1,128}).");

// Section 5: Local = { predio <=30, andar <=10, sala <=30 }.
export const GerenciarLocalSchema = z.object({
  idOperacao: IdOperacaoPatrimonioSchema,
  acao: z.enum(["CRIAR", "EDITAR"]),
  idLocal: z.string().min(1).optional(),
  predio: z.string().trim().min(1, "Prédio é obrigatório.").max(30, "Prédio excede 30 caracteres."),
  andar: z.string().trim().min(1, "Andar é obrigatório.").max(10, "Andar excede 10 caracteres."),
  sala: z.string().trim().min(1, "Sala é obrigatória.").max(30, "Sala excede 30 caracteres."),
});

export const CriarRequisicaoEdicaoBemSchema = z.object({
  idBemPatrimonial: z.string().min(1, "ID do bem patrimonial é obrigatório."),
  novoNome: z.string().optional(),
  novoStatus: z.string().optional(),
  novoEstadoConservacao: z.string().optional(),
  novoIdLocal: z.string().optional(),
  motivo: z.string().min(1, "Motivo é obrigatório.")
});

export const ResponderRequisicaoBemSchema = z.object({
  idRequisicao: z.string().min(1, "ID da requisição é obrigatório."),
  aprovar: z.boolean(),
  justificativa: z.string().optional().default("")
});

export const CriarRequisicaoAdicaoBemSchema = z.object({
  numeroPatrimonioProposto: z.string().min(1, "O número de patrimônio proposto é obrigatório."),
  estadoConservacaoProposto: z.string().min(1, "O estado de conservação é obrigatório."),
  idLocal: z.string().min(1, "O ID do local é obrigatório."),
  nomeResponsavelProposto: z.string().min(1, "O nome do responsável é obrigatório."),
  idResumoBemPatrimonial: z.string().optional(),
  nomeResumoProposto: z.string().optional(),
  descricaoResumoProposta: z.string().optional(),
  motivo: z.string().min(1, "Motivo é obrigatório.")
});
