export interface ResumoReagente {
  id: string;
  nome: string;
  tipo_substancia: "PURA" | "MISTURA";
  natureza_quimica: "ORGANICO" | "INORGANICO" | "ELEMENTO" | "HIBRIDO";
  requer_pesagem_frequente: boolean;
  qtd_em_que_e_considerado_escasso: number;
  frequencia_pesagem_dias?: number;
  letra_inicial: string;
  
  // Denormalizados para pesquisa no frontend / Firestore
  estado_fisico?: "Sólido" | "Líquido" | "SOLIDO" | "LIQUIDO";
  riscos?: string[]; // Mantendo por retrocompatibilidade temporária se necessário
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
