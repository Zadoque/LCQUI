import { z } from "zod";
import { ID_OPERACAO_PATTERN } from "../idempotencia";

const idOperacaoField = z.string().regex(ID_OPERACAO_PATTERN, "idOperacao inválido.");

export const ObterEstoqueAtualSchema = z.object({
  idAlmoxarifado: z.string().min(1, "O ID do almoxarifado é obrigatório."),
  idResumoReagente: z.string().optional(),
});

export const ConfigurarLimiarEscassezSchema = z.object({
  idOperacao: idOperacaoField,
  idAlmoxarifado: z.string().min(1, "O ID do almoxarifado é obrigatório."),
  idResumoReagente: z.string().min(1, "O ID do resumo de reagente é obrigatório."),
  idEspecificacaoReagente: z.string().min(1, "O ID da especificação é obrigatório."),
  qtdLimiarEscassez: z.number().int().min(0, "O limiar de escassez deve ser um número inteiro maior ou igual a zero."),
  ativo: z.boolean(),
  notificacaoAtiva: z.boolean(),
});
