import { z } from "zod";
import { ID_OPERACAO_PATTERN } from "../idempotencia";

const idOperacaoField = z.string().regex(ID_OPERACAO_PATTERN, "idOperacao inválido.");

export const DecisaoFrascoVencidoSchema = z.enum(["QUARENTENA", "PENDENTE_DE_DESCARTE", "DISPONIVEL"]);

export const CadastroFrascoFechadoSchema = z.object({
  idOperacao: idOperacaoField,
  idResumoReagente: z.string().min(1, "O ID do resumo é obrigatório."),
  idEspecificacaoReagente: z.string().min(1, "A especificação do reagente é obrigatória."),
  idAlmoxarifado: z.string().min(1, "O almoxarifado é obrigatório."),
  idLote: z.string().nullable().optional(),
  pesoTotal: z.number().positive("O peso total deve ser positivo."),
  volumeNominal: z.number().positive("O volume nominal deve ser positivo.").nullable().optional(),
  validadeFechado: z.string().optional(),
  validadeDesconhecida: z.boolean().optional(),
  decisaoSeJaVencido: DecisaoFrascoVencidoSchema.optional(),
  detalheStatus: z.string().optional(),
});

export const CadastroFrascoAbertoSchema = z.object({
  idOperacao: idOperacaoField,
  idResumoReagente: z.string().min(1, "O ID do resumo é obrigatório."),
  idEspecificacaoReagente: z.string().min(1, "A especificação do reagente é obrigatória."),
  idAlmoxarifado: z.string().min(1, "O almoxarifado é obrigatório."),
  idLote: z.string().nullable().optional(),
  pesoTotalBalanca: z.number().positive("O peso total deve ser positivo."),
  volumeNominal: z.number().positive("O conteúdo nominal deve ser positivo.").nullable().optional(),
  validadeAberto: z.string().optional(),
  validadeDesconhecida: z.boolean().optional(),
  decisaoSeJaVencido: DecisaoFrascoVencidoSchema.optional(),
  detalheStatus: z.string().optional(),
});

export const AberturaFrascoSchema = z.object({
  idOperacao: idOperacaoField,
  idFrasco: z.string().min(1, "O ID do frasco é obrigatório."),
  destinoSeVencerNaAbertura: DecisaoFrascoVencidoSchema.optional(),
  detalheStatus: z.string().optional(),
});

export const RetiradaFrascoSchema = z.object({
  idOperacao: idOperacaoField,
  idFrasco: z.string().min(1, "O ID do frasco é obrigatório."),
  idUsuarioRetirou: z.string().min(1, "O ID do usuário é obrigatório."),
  idLocalUsado: z.string().min(1, "O ID do local é obrigatório."),
  pesoSaida: z.number().positive("O peso de saída deve ser positivo."),
  dataDevolucaoPrevista: z.string().min(1, "A data de devolução é obrigatória."),
  confirmarUsoVencido: z.boolean().optional(),
  abrirNoEmprestimo: z.boolean().optional(),
  finalidadeUso: z.enum(["PESQUISA", "DIDATICO_DEMONSTRACAO", "OUTRO"]),
  justificativaAutoAtendimento: z.string().trim().optional(),
});

export const DevolucaoFrascoSchema = z.object({
  idOperacao: idOperacaoField,
  idEmprestimo: z.string().min(1, "O ID do empréstimo é obrigatório."),
  pesoRetorno: z.number().positive("O peso de retorno deve ser positivo."),
  pesoPerdaEvaporacao: z.number().min(0, "A perda por evaporação não pode ser negativa.").optional(),
  confirmarEsgotamento: z.boolean().optional(),
  idUsuarioDevolveu: z.string().min(1).optional(),
  destinoPosDevolucao: DecisaoFrascoVencidoSchema.optional(),
});

export const RepetirPesagemDevolucaoAnomalaSchema = z.object({
  idOperacao: idOperacaoField,
  idEmprestimo: z.string().min(1, "O ID do empréstimo é obrigatório."),
  pesoNovaMedicao: z.number().positive("O peso medido deve ser positivo."),
  motivo: z.string().trim().min(20, "A justificativa deve conter pelo menos 20 caracteres."),
});

export const ConfirmarEsgotamentoAposInspecaoSchema = z.object({
  idOperacao: idOperacaoField,
  idEmprestimo: z.string().min(1, "O ID do empréstimo é obrigatório."),
  pesoVazioRealMedido: z.number().positive("O peso do frasco vazio medido deve ser positivo."),
  motivo: z.string().trim().min(20, "A justificativa deve conter pelo menos 20 caracteres."),
});

export const RecalibrarTaraFrascoEsgotadoSchema = z.object({
  idOperacao: idOperacaoField,
  idFrasco: z.string().min(1, "O ID do frasco é obrigatório."),
  pesoVazioReal: z.number().positive("O peso do recipiente vazio deve ser positivo."),
  motivo: z.string().trim().min(20, "A justificativa deve conter pelo menos 20 caracteres."),
});

export const RegistrarPesagemRotinaSchema = z.object({
  idOperacao: idOperacaoField,
  idFrasco: z.string().min(1, "O ID do frasco é obrigatório."),
  pesoAtual: z.number().positive("O peso medido deve ser positivo."),
  motivo: z.string().trim().optional(),
});

export const DescartarFrascoSchema = z.object({
  idOperacao: idOperacaoField,
  idFrasco: z.string().min(1, "O ID do frasco é obrigatório."),
  motivo: z.string().trim().min(20, "A justificativa do descarte institucional deve conter pelo menos 20 caracteres."),
});

