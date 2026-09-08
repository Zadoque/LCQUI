import { z } from "zod";

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
