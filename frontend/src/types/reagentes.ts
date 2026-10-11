// ===================================================================
// Tipos do Domínio de Reagentes — Modelados conforme main.tex Seções 4, 5, 7 e M1–M8
// ===================================================================

export interface SubstanciaQuimica {
  id: string;
  cas_number: string;
  nome_quimico: string;
  formula_quimica?: string;
  tipo_substancia: "PURA" | "MISTURA";
  natureza_quimica: "ORGANICO" | "INORGANICO" | "ELEMENTO" | "HIBRIDO";
}

export interface ResumoReagente {
  id: string;
  nome: string;
  tipo_substancia: "PURA" | "MISTURA";
  natureza_quimica: "ORGANICO" | "INORGANICO" | "ELEMENTO" | "HIBRIDO";
  requer_pesagem_frequente: boolean;
  qtd_em_que_e_considerado_escasso: number;
  frequencia_pesagem_dias?: number;
  letra_inicial: string;
  eh_higroscopico?: boolean;

  // Denormalizados para pesquisa no frontend / Firestore (UI-04)
  estado_fisico?: "Sólido" | "Líquido" | "SOLIDO" | "LIQUIDO";
  riscos?: string[];
}

export interface EspecificacaoReagente {
  id: string;
  id_resumo_reagente: string;
  descricao: string;
  fabricante?: string;
  codigo_produto_fabricante?: string;
  grau_pureza?: string;
  densidade?: number;
  estado_fisico: "SOLIDO" | "LIQUIDO";
  unidade_de_medida: "ml" | "g";
  classe_inflamabilidade: "NAO_INFLAMAVEL" | "CLASSE_1" | "CLASSE_2" | "CLASSE_3";
  eh_controlado_pf: boolean;
  eh_controlado_eb: boolean;
  link_fds_fispq?: string;
}

export interface LoteReagente {
  id: string;
  id_especificacao_reagente: string;
  id_resumo_reagente: string;
  numero_lote: string;
  fornecedor: string;
  data_fabricacao?: string;
  data_aquisicao: string;
  data_validade: string;
  nota_fiscal?: string;
}

export interface FrascoReagente {
  id: string;
  id_almoxarifado: string;
  id_lote?: string;
  id_especificacao_reagente?: string;
  detalhe_local_armazenamento?: string;
  codigo_frasco: string;

  data_ultima_pesagem?: Date;
  conteudo_nominal: number;
  peso_no_cadastrado: number;
  peso_atual: number;
  peso_frasco_vazio?: number;
  medida_usada: number;

  estado_fisico_frasco: "FECHADO" | "ABERTO" | "VAZIO" | "QUEBRADO" | "DESCARTADO";
  disponibilidade: "DISPONIVEL" | "EMPRESTADO";
  vencido: boolean;
  em_quarentena: boolean;
  uso_vencido_autorizado: boolean;
  detalhe_status?: string;

  cadastrado_em: Date;
  cadastrado_por: string;
}

/** Projeção validada usada pelos cards de quarentena e ações operacionais. */
export interface FrascoOperacional {
  id: string;
  codigo_frasco: string;
  estado_fisico_frasco: FrascoReagente["estado_fisico_frasco"];
  peso_atual?: number | null;
  peso_no_cadastrado?: number | null;
  em_quarentena: boolean;
  situacao_localizacao?: string | null;
  disponibilidade?: FrascoReagente["disponibilidade"] | string | null;
  vencido: boolean;
}

/**
 * Snapshot de Estoque Atual calculado pelo backend M8 (UI-19 / obterEstoqueAtual).
 */
export interface EstoqueSnapshot {
  qtd_aptos: number;
  qtd_total: number;
  qtd_emprestados: number;
  qtd_saldo_desconhecido: number;
  massa_aferida_g?: number | null;
  volume_aferido_ml?: number | null;
  idadeMs?: number;
  fonte?: "cache" | "recalculado";
  calculadoEm?: Date;
}
