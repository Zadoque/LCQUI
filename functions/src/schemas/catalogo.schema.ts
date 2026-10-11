import { z } from "zod";

export const ResolverCatalogoPorIdsSchema = z.object({
  idResumo: z.string().min(1, "O ID do resumo é obrigatório."),
  idEspecificacao: z.string().min(1, "O ID da especificação é obrigatório."),
});
