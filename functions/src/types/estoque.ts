export interface M8Estoque {
  qtd_aptos: number;
  qtd_total: number;
  qtd_emprestados: number;
  qtd_saldo_desconhecido: number;
  massa_aferida_g: number | null;
  volume_aferido_ml: number | null;
}

export interface ResultadoConfiguracaoEscassez {
  status: "OK";
  idConfiguracao: string;
  qtdLimiarEscassez: number;
  ativo: boolean;
  notificacaoAtiva: boolean;
}
