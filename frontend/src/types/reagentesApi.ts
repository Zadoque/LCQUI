import type {
  CatalogoEspecificacao,
  CatalogoSubstancia,
  ResumoReagente,
  EstoqueSnapshot,
} from "@/types/reagentes";

export interface LocalRetirada {
  id: string;
  predio: string;
  andar: string;
  sala: string;
}

export interface UsuarioRetirada {
  id: string;
  nome: string;
  papeis: string[];
}

export interface CadastroResumoReagenteInput {
  idOperacao: string;
  nome: string;
  tipoSubstancia: "PURA" | "MISTURA";
  naturezaQuimica: "ORGANICO" | "INORGANICO" | "ELEMENTO" | "HIBRIDO";
  estadoFisico: "SOLIDO" | "LIQUIDO";
  requerPesagemFrequente: boolean;
  frequenciaPesagemDias: number | null;
  ehHigroscopico: boolean;
  qtdEmQueEConsideradoEscasso: number;
}

export interface CadastroSubstanciaInput {
  idOperacao: string;
  nome: string;
  casNumber?: string;
  formulaQuimica?: string;
  ativo: boolean;
}

export interface CadastroLoteInput {
  idOperacao: string;
  idResumoReagente: string;
  idEspecificacaoReagente: string;
  numeroLote: string;
  nomeFornecedor: string;
  qtdFrascosComprados: number;
  dataAquisicao: string;
  notaFiscal: string;
  dataFabricacao: string;
  dataValidade: string;
}

export interface ComposicaoEspecificacaoInput {
  idSubstanciaQuimica: string;
  valorMin?: number;
  valorMax?: number;
  tipoConcentracao: "M_M" | "V_V" | "M_V" | "MOL_L" | "MOL_KG" | "PPM" | "PPB";
  notacaoOriginalFabricante?: string;
}

export interface CadastroEspecificacaoInput {
  idOperacao: string;
  idResumoReagente: string;
  descricao: string;
  fabricante?: string;
  densidade?: number;
  classeInflamabilidade: "NAO_INFLAMAVEL" | "CLASSE_1" | "CLASSE_2" | "CLASSE_3";
  ehControladoPf: boolean;
  ehControladoEb: boolean;
  idSubstanciaQuimica?: string;
  composicao?: ComposicaoEspecificacaoInput[];
}

export interface CadastroFrascoInputBase {
  idOperacao: string;
  idResumoReagente: string;
  idEspecificacaoReagente: string;
  idAlmoxarifado: string;
  idLote?: string;
  volumeNominal: number | null;
  validadeDesconhecida: boolean;
  decisaoSeJaVencido?: "QUARENTENA" | "PENDENTE_DE_DESCARTE" | "DISPONIVEL";
  detalheStatus?: string;
}

export interface CadastroFrascoFechadoInput extends CadastroFrascoInputBase {
  pesoTotal: number;
  validadeFechado?: string;
}

export interface CadastroFrascoAbertoInput extends CadastroFrascoInputBase {
  pesoTotalBalanca: number;
  validadeAberto?: string;
}

export interface CadastroFrascoResult {
  codigoFrasco: string;
  idFrasco?: string;
  venceuNoCadastro: boolean;
}

export interface RegistrarRetiradaInput {
  idOperacao: string;
  idFrasco: string;
  idUsuarioRetirou: string;
  idLocalUsado: string;
  pesoSaida: number;
  dataDevolucaoPrevista: string;
  finalidadeUso: "PESQUISA" | "DIDATICO_DEMONSTRACAO" | "OUTRO";
  abrirNoEmprestimo: boolean;
  confirmarUsoVencido: boolean;
  justificativaAutoAtendimento: string;
}

export interface RegistrarDevolucaoInput {
  idOperacao: string;
  idEmprestimo: string;
  pesoRetorno: number;
  confirmarEsgotamento: boolean;
  idUsuarioDevolveu?: string;
  pesoPerdaEvaporacao?: number;
}

export interface ConfigurarEscassezInput {
  idOperacao: string;
  idAlmoxarifado: string;
  idResumoReagente: string;
  idEspecificacaoReagente: string;
  qtdLimiarEscassez: number;
  ativo: boolean;
  notificacaoAtiva: boolean;
}

export interface AcaoFrascoInput {
  idOperacao: string;
  idFrasco: string;
  motivo: string;
}

export interface RegistrarExtravioInput extends AcaoFrascoInput {
  tipoAcao: "EXTRAVIAR";
  estadoFisicoConstatado?: never;
}

export interface RegistrarReencontroInput extends AcaoFrascoInput {
  tipoAcao: "REENCONTRAR";
  estadoFisicoConstatado: "ABERTO" | "FECHADO" | "VAZIO" | "QUEBRADO";
}

export type RegistrarExtravioOuReencontroInput = RegistrarExtravioInput | RegistrarReencontroInput;

export interface ResolverQuarentenaInput extends AcaoFrascoInput {
  decisao: "VOLTAR_A_DISPONIVEL" | "PENDENTE_DE_DESCARTE";
}

export interface RepetirPesagemInput extends Omit<AcaoFrascoInput, "idFrasco"> {
  idEmprestimo: string;
  pesoNovaMedicao: number;
}

export interface ConfirmarEsgotamentoInput extends Omit<AcaoFrascoInput, "idFrasco"> {
  idEmprestimo: string;
  pesoVazioRealMedido: number;
}

export interface RecalibrarTaraInput extends AcaoFrascoInput {
  pesoVazioReal: number;
}

export interface RegistrarPesagemRotinaInput extends Omit<AcaoFrascoInput, "motivo"> {
  pesoAtual: number;
  motivo?: string;
}

export interface ObterCatalogoReagentesResponse {
  catalogo?: {
    resumos?: Record<string, ResumoReagente>;
    especificacoes?: Record<string, CatalogoEspecificacao>;
  };
}

export interface ObterCatalogoSubstanciasResponse {
  catalogo?: { substancias?: Record<string, CatalogoSubstancia> };
}

export interface ObterEstoqueParams {
  idAlmoxarifado: string;
}

export type ObterEstoqueResponse = Partial<EstoqueSnapshot>;
export interface EstoqueRateError { isRateLimit: true; message: string; }
export type ObterEstoqueResult = { ok: true; data: EstoqueSnapshot } | { ok: false; rateLimit: boolean; message: string };
export interface HistoricoOperacional {
  id: string; id_frasco_reagente?: string; id_emprestimo_reagente?: string; tipo: string; motivo?: string | null;
  timestamp?: { toMillis?: () => number; toDate?: () => Date } | Date | null;
  peso_anterior?: number | null; peso_novo?: number | null; medida_ajustada?: number | null;
}
export interface PainelOperacionalData { movimentacoes: HistoricoOperacional[]; quarentena: import("@/types/reagentes").FrascoOperacional[]; alertas: AlertaOperacional[]; }
export interface AlertaOperacional { id: string; tipo: string; quantidade?: number; mensagem_customizada?: string; emitida_em?: HistoricoOperacional["timestamp"]; }

export interface LoteCatalogo {
  id: string;
  numero_lote?: string;
  nome_fornecedor?: string;
}

export interface FrascoCatalogo {
  id: string;
  codigo_frasco: string;
  id_reagente?: string;
  [campo: string]: unknown;
}

export interface RelatorioReagentesMensalInput {
  idAlmoxarifado: string;
  mes: number;
  ano: number;
}

export interface RelatorioReagentesPersonalizadoInput {
  dataInicio: string;
  dataFim: string;
  entidade: "Reagentes";
}

export interface GerarEtiquetasVirgensInput {
  codigoInicial: number;
  codigoFinal: number;
  startRow: number;
  startCol: number;
}

export interface GerarReimpressaoFrascosInput {
  frascoIds: string[];
}
