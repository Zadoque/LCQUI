import { z } from "zod";
import { ID_OPERACAO_PATTERN } from "../idempotencia";

const idOperacaoField = z.string().regex(ID_OPERACAO_PATTERN, "idOperacao inválido.");

export function validarCasNumber(cas: string): boolean {
  const match = cas.match(/^(\d{2,7})-(\d{2})-(\d)$/);
  if (!match) return false;
  const digits = (match[1] + match[2]).split("").map(Number);
  const checkDigit = Number(match[3]);
  const len = digits.length;
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const weight = len - i;
    sum += digits[i] * weight;
  }
  return sum % 10 === checkDigit;
}

export const CadastroSubstanciaQuimicaSchema = z.object({
  idOperacao: idOperacaoField,
  nome: z.string().trim().min(1, "Nome é obrigatório.").max(150, "Nome deve ter no máximo 150 caracteres."),
  casNumber: z.string().trim().max(15, "Número CAS deve ter no máximo 15 caracteres.").refine(
    (val) => !val || validarCasNumber(val),
    "Número CAS inválido (formato ou dígito verificador incorreto)."
  ).nullable().optional(),
  formulaQuimica: z.string().trim().min(1).max(50, "Fórmula química deve ter no máximo 50 caracteres.").nullable().optional(),
  ativo: z.boolean().default(true),
});

export const CadastroResumoReagenteSchema = z.object({
  idOperacao: idOperacaoField,
  nome: z.string().trim().min(1, "Nome é obrigatório.").max(150, "Nome deve ter no máximo 150 caracteres."),
  tipoSubstancia: z.enum(["PURA", "MISTURA"]),
  naturezaQuimica: z.enum(["ORGANICO", "INORGANICO", "ELEMENTO", "HIBRIDO"]),
  estadoFisico: z.enum(["SOLIDO", "LIQUIDO"]),
  requerPesagemFrequente: z.boolean(),
  frequenciaPesagemDias: z.number().int().positive("Frequência de pesagem deve ser positiva.").nullable().optional(),
  ehHigroscopico: z.boolean().default(false),
  qtdEmQueEConsideradoEscasso: z.number().int().positive("A quantidade de escassez deve ser positiva."),
}).refine(data => {
  if (data.requerPesagemFrequente && (!data.frequenciaPesagemDias || data.frequenciaPesagemDias <= 0)) return false;
  if (!data.requerPesagemFrequente && data.frequenciaPesagemDias != null) return false;
  return true;
}, {
  message: "Frequência de pesagem é obrigatória se e somente se o reagente requerer pesagem frequente.",
  path: ["frequenciaPesagemDias"]
});

export const ComposicaoSchema = z.object({
  idSubstanciaQuimica: z.string().trim().min(1, "Substância é obrigatória."),
  valorMin: z.number().nonnegative("Concentração mínima não pode ser negativa.").nullable().optional(),
  valorMax: z.number().nonnegative("Concentração máxima não pode ser negativa.").nullable().optional(),
  tipoConcentracao: z.enum(["M_M", "V_V", "M_V", "MOL_L", "MOL_KG", "PPM", "PPB"]),
  notacaoOriginalFabricante: z.string().trim().max(50, "Notação deve ter no máximo 50 caracteres.").nullable().optional(),
}).refine(data => {
  if (data.valorMax != null) {
    if (data.valorMin == null) return false;
    if (data.valorMin > data.valorMax) return false;
  }
  return true;
}, {
  message: "Quando valorMax for informado, valorMin é obrigatório e deve ser menor ou igual a valorMax.",
  path: ["valorMax"]
});

export const CadastroEspecificacaoSchema = z.object({
  idOperacao: idOperacaoField,
  idResumoReagente: z.string().trim().min(1, "O ID do resumo é obrigatório."),
  descricao: z.string().trim().min(1, "Descrição é obrigatória.").max(150, "Descrição deve ter no máximo 150 caracteres."),
  fabricante: z.string().trim().max(150, "Fabricante deve ter no máximo 150 caracteres.").nullable().optional(),
  codigoProdutoFabricante: z.string().trim().max(100, "Código do produto deve ter no máximo 100 caracteres.").nullable().optional(),
  grauPureza: z.string().trim().max(30, "Grau de pureza deve ter no máximo 30 caracteres.").nullable().optional(),
  densidade: z.number().positive("Densidade deve ser positiva.").max(10000, "Densidade deve ser menor que 10000.").nullable().optional(),
  classeInflamabilidade: z.enum(["NAO_INFLAMAVEL", "CLASSE_1", "CLASSE_2", "CLASSE_3"]),
  ehControladoPf: z.boolean(),
  ehControladoEb: z.boolean(),
  linkFdsFispq: z.string().trim().regex(/^https:\/\/[^/?#\s]+[^\s]*$/, "Link FDS/FISPQ deve ser uma URL HTTPS válida.").max(255, "Link FDS/FISPQ deve ter no máximo 255 caracteres.").nullable().optional(),
  idSubstanciaQuimica: z.string().trim().min(1).nullable().optional(), // Para substâncias PURAS
  composicao: z.array(ComposicaoSchema).nullable().optional(), // Para MISTURAS
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

