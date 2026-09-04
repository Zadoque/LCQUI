export interface ResumoReagente {
  id: string;
  nome: string;
  estado_fisico: "Sólido" | "Líquido" | "Gasoso";
  letra_inicial: string;
  natureza_quimica: string;
  riscos: string[];
}

export interface FrascoReagente {
  id: string;
  id_resumo_reagente: string;
  id_almoxarifado: string;
  estado_fisico_frasco: "FECHADO" | "ABERTO";
  disponibilidade: "DISPONIVEL" | "EMPRESTADO";
  vencido: boolean;
  em_quarentena: boolean;
  detalhe_status?: string | null;
  lote: string;
  fornecedor: string;
  quantidade_inicial_mg_ml: number;
  quantidade_atual_mg_ml: number;
  unidade_medida: "mg" | "ml";
  validade_efetiva: Date | null;
}
