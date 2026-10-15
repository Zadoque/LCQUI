/** Resultados persistidos nos receipts M7 das operações de reagentes. */
export interface ResultadoOperacaoReagente {
  status: string;
  idFrasco?: string;
  decisao?: string;
  situacao_localizacao?: string;
  em_quarentena?: boolean;
  estado_fisico?: string;
  pesoRetornoEfetivo?: number;
  medidaUtilizada?: number;
  novaTara?: number;
  pesoAtual?: number;
  vazioConfirmado?: boolean;
}

export interface ResultadoRegistrarDevolucao extends ResultadoOperacaoReagente {
  pesoConsumido?: number | null;
  volumeUtilizado?: number | null;
  consumoPendente?: boolean;
  atrasado?: boolean;
  frascoVencido?: boolean;
  anomalia?: string | null;
  avisoHigroscopico?: boolean;
}
