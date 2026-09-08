import { z } from "zod";

export const DecisaoFrascoVencidoSchema = z.enum(["QUARENTENA", "PENDENTE_DE_DESCARTE", "DISPONIVEL"]);

export const CadastroFrascoFechadoSchema = z.object({
  idEspecificacaoReagente: z.string().min(1, "A especificação do reagente é obrigatória."),
  idAlmoxarifado: z.string().min(1, "O almoxarifado é obrigatório."),
  idLote: z.string().optional(),
  pesoTotal: z.number().positive("O peso total deve ser positivo."),
  volumeNominal: z.number().positive("O volume nominal deve ser positivo."),
  validadeFechado: z.string().optional(),
  validadeDesconhecida: z.boolean().optional(),
  decisaoSeJaVencido: DecisaoFrascoVencidoSchema.optional(),
  detalheStatus: z.string().optional(),
});

export const CadastroFrascoAbertoSchema = z.object({
  idEspecificacaoReagente: z.string().min(1, "A especificação do reagente é obrigatória."),
  idAlmoxarifado: z.string().min(1, "O almoxarifado é obrigatório."),
  idLote: z.string().optional(),
  modalidade: z.enum(["CONHECE_TARA", "ESTIMA_VOLUME", "ESTIMA_MASSA"]),
  pesoTotalBalanca: z.number().positive("O peso total deve ser positivo."),
  pesoFrascoVazioInformado: z.number().positive("O peso do frasco vazio deve ser positivo.").optional(),
  volumeAtualEstimado: z.number().positive("O volume atual estimado deve ser positivo.").optional(),
  massaAtualEstimada: z.number().positive("A massa atual estimada deve ser positiva.").optional(),
  validadeAberto: z.string().optional(),
  validadeDesconhecida: z.boolean().optional(),
  decisaoSeJaVencido: DecisaoFrascoVencidoSchema.optional(),
  detalheStatus: z.string().optional(),
});

export const AberturaFrascoSchema = z.object({
  idFrasco: z.string().min(1, "O ID do frasco é obrigatório."),
  destinoSeVencerNaAbertura: DecisaoFrascoVencidoSchema.optional(),
  detalheStatus: z.string().optional(),
});

export const RetiradaFrascoSchema = z.object({
  idFrasco: z.string().min(1, "O ID do frasco é obrigatório."),
  idUsuarioRetirou: z.string().min(1, "O ID do usuário é obrigatório."),
  idLocalUsado: z.string().min(1, "O ID do local é obrigatório."),
  pesoSaida: z.number().positive("O peso de saída deve ser positivo."),
  dataDevolucaoPrevista: z.string().min(1, "A data de devolução é obrigatória."),
  confirmarUsoVencido: z.boolean().optional(),
  abrirNoEmprestimo: z.boolean().optional(),
  finalidadeUso: z.enum(["PESQUISA", "DIDATICO_DEMONSTRACAO", "OUTRO"]),
});

export const DevolucaoFrascoSchema = z.object({
  idEmprestimo: z.string().min(1, "O ID do empréstimo é obrigatório."),
  pesoRetorno: z.number().min(0, "O peso de retorno não pode ser negativo."),
  destinoPosDevolucao: DecisaoFrascoVencidoSchema.optional(),
});
