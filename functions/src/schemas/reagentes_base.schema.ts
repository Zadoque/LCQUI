import { z } from "zod";
import { ID_OPERACAO_PATTERN } from "../idempotencia";

const idOperacaoField = z.string().regex(ID_OPERACAO_PATTERN, "idOperacao inválido.");

export const CadastroSubstanciaQuimicaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório."),
  casNumber: z.string().optional(),
  formulaQuimica: z.string().optional(),
  ativo: z.boolean().default(true),
});

export const CadastroResumoReagenteSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório."),
  tipoSubstancia: z.enum(["PURA", "MISTURA"]),
  naturezaQuimica: z.enum(["ORGANICO", "INORGANICO", "ELEMENTO", "HIBRIDO"]),
  estadoFisico: z.enum(["SOLIDO", "LIQUIDO", "GASOSO"]),
  requerPesagemFrequente: z.boolean(),
  qtdEmQueEConsideradoEscasso: z.number().int().positive("A quantidade de escassez deve ser positiva."),
  frequenciaPesagemDias: z.number().int().positive().nullable().optional(),
}).refine(data => {
  if (data.requerPesagemFrequente && !data.frequenciaPesagemDias) return false;
  return true;
}, {
  message: "Frequência de pesagem é obrigatória se o reagente requerer pesagem frequente.",
  path: ["frequenciaPesagemDias"]
});

export const ComposicaoSchema = z.object({
  idSubstanciaQuimica: z.string().min(1, "Substância é obrigatória."),
  valorComposicao: z.number().nullish(),
  tipoConcentracao: z.enum(["M_M", "V_V", "M_V", "MOL_L", "MOL_KG", "PPM", "PPB"]).nullish(),
  unidade: z.string().nullish(),
});

export const CadastroEspecificacaoSchema = z.object({
  idResumoReagente: z.string().min(1, "O ID do resumo é obrigatório."),
  descricao: z.string().min(1, "Descrição é obrigatória."),
  fabricante: z.string().nullish(),
  codigoProdutoFabricante: z.string().nullish(),
  grauPureza: z.string().nullish(),
  densidade: z.number().positive().nullish(),
  classeInflamabilidade: z.enum(["NAO_INFLAMAVEL", "CLASSE_1", "CLASSE_2", "CLASSE_3"]),
  ehControladoPf: z.boolean(),
  ehControladoEb: z.boolean(),
  linkFdsFispq: z.string().nullish(),
  idSubstanciaQuimica: z.string().nullish(), // Para substâncias PURAS
  composicao: z.array(ComposicaoSchema).nullish(), // Para MISTURAS
});

export const CadastroLoteSchema = z.object({
  idOperacao: idOperacaoField,
  idResumoReagente: z.string().min(1, "O ID do resumo é obrigatório."),
  idEspecificacaoReagente: z.string().min(1, "A especificação do reagente é obrigatória."),
  dataAquisicao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de aquisição deve estar em YYYY-MM-DD."),
  qtdFrascosComprados: z.number().int().nonnegative(),
  nomeFornecedor: z.string().trim().min(1, "Fornecedor é obrigatório.").max(80),
  numeroLote: z.string().trim().min(1, "Número do lote é obrigatório.").max(100),
  notaFiscal: z.string().trim().min(1, "Nota fiscal é obrigatória.").max(100),
  dataFabricacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de fabricação deve estar em YYYY-MM-DD."),
  dataValidade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de validade deve estar em YYYY-MM-DD."),
});
