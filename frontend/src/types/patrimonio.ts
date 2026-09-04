export interface BemPatrimonial {
  id: string; // id_bem_patrimonial
  id_resumo_bem_patrimonial: string;
  numero_patrimonio: string;
  estado_conservacao: string;
  id_local: string;
  photo_url: string;
  nome_responsavel_sei: string;
  status: "Ativo" | "Inservivel" | "Ja_dado_baixa";
  documento_dado_baixa_pdf_url?: string | null;
  descricao_complementar?: string | null;
  
  // Denormalized fields for search/display
  predio?: string;
  andar?: string;
  sala?: string;
  letra_inicial_nome?: string;
  nome_equipamento?: string;
}

export interface RequisicaoProfessor {
  id: string;
  id_bem_patrimonial: string;
  id_usuario_solicitante: string;
  status: "pendente" | "aprovada" | "rejeitada";
  tipo: "edicao" | "adicao";
  feita_em: Date;
  respondida_em?: Date | null;
  
  // Denormalized
  nome_equipamento: string;
  numero_patrimonio: string;
  
  // Payload de propostas
  novo_numero_patrimonio?: string;
  novo_estado_conservacao?: string;
  novo_id_local?: string;
  nova_photo_url?: string;
  novo_nome_responsavel_sei?: string;
  novo_status?: "Ativo" | "Inservivel" | "Ja_dado_baixa" | null;
  novo_documento_dado_baixa_pdf_url?: string | null;
  nova_descricao_complementar?: string | null;
}
