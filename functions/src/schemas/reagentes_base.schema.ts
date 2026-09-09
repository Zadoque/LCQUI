import { z } from "zod";

export const CadastroResumoReagenteSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório."),
  tipoSubstancia: z.enum(["PURA", "MISTURA"]),
  naturezaQuimica: z.enum(["ORGANICO", "INORGANICO", "ELEMENTO", "HIBRIDO"]),
  requerPesagemFrequente: z.boolean(),
  qtdEmQueEConsideradoEscasso: z.number().int().positive("A quantidade de escassez deve ser positiva."),
  frequenciaPesagemDias: z.number().int().positive().optional(),
}).refine(data => {
  if (data.requerPesagemFrequente && !data.frequenciaPesagemDias) return false;
  return true;
}, {
  message: "Frequência de pesagem é obrigatória se o reagente requerer pesagem frequente.",
  path: ["frequenciaPesagemDias"]
});

export const ComposicaoSchema = z.object({
  idSubstanciaQuimica: z.string().min(1, "Substância é obrigatória."),
  valorComposicao: z.number().optional(),
  tipoConcentracao: z.enum(["M_M", "V_V", "M_V", "MOL_L", "MOL_KG", "PPM", "PPB"]).optional(),
  unidade: z.string().optional(),
});

export const CadastroEspecificacaoSchema = z.object({
  idResumoReagente: z.string().min(1, "O ID do resumo é obrigatório."),
  descricao: z.string().min(1, "Descrição é obrigatória."),
  fabricante: z.string().optional(),
  codigoProdutoFabricante: z.string().optional(),
  grauPureza: z.string().optional(),
  densidade: z.number().positive().optional(),
  estadoFisico: z.enum(["SOLIDO", "LIQUIDO"]),
  unidadeDeMedida: z.enum(["ml", "g"]),
  classeInflamabilidade: z.enum(["NAO_INFLAMAVEL", "CLASSE_1", "CLASSE_2", "CLASSE_3"]),
  ehControladoPf: z.boolean(),
  ehControladoEb: z.boolean(),
  linkFdsFispq: z.string().optional(),
  composicao: z.array(ComposicaoSchema).optional(),
}).refine(data => {
  if (data.estadoFisico === "LIQUIDO" && !data.densidade) return false;
  return true;
}, {
  message: "Densidade é obrigatória para reagentes líquidos.",
  path: ["densidade"]
});

export const CadastroLoteSchema = z.object({
  idEspecificacaoReagente: z.string().min(1, "A especificação do reagente é obrigatória."),
  dataAquisicao: z.string().min(1, "Data de aquisição é obrigatória."),
  qtdFrascosComprados: z.number().int().nonnegative(),
  nomeFornecedor: z.string().min(1, "Fornecedor é obrigatório."),
  numeroLote: z.string().min(1, "Número do lote é obrigatório."),
  notaFiscal: z.string().min(1, "Nota fiscal é obrigatória."),
  dataFabricacao: z.string().min(1, "Data de fabricação é obrigatória."),
  dataValidade: z.string().min(1, "Data de validade é obrigatória."),
});
