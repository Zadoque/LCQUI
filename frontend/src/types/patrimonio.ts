// ===================================================================
// Tipos de Bens Patrimoniais — Modelados conforme main.tex Seção 4
// ===================================================================

// Seção 4.9: Resumo_Bem_Patrimonial
export interface ResumoBemPatrimonial {
  id: string;
  nome: string;         // Nome catalográfico (ex: "Microscópio Óptico Binocular Coleman")
  descricao: string;    // Descrição do modelo
}

// Seção 4.7: Bem_Patrimonial (com campos denormalizados para Firestore — Seção 5.5)
export interface BemPatrimonial {
  id: string;
  id_resumo_bem_patrimonial: string;
  numero_patrimonio: string;                                  // UNIQUE, NOT NULL
  estado_conservacao: "BOM" | "REGULAR" | "RUIM";             // ENUM, NOT NULL
  id_local: string;                                           // FK, NOT NULL
  photo_url: string;                                          // NOT NULL
  documento_dado_baixa_pdf_url?: string | null;               // NULL (só quando Ja_dado_baixa)
  nome_responsavel_sei: string;                               // NOT NULL
  status: "Ativo" | "Inservivel" | "Ja_dado_baixa";          // ENUM, NOT NULL
  descricao_complementar?: string | null;                     // NULL (notas opcionais)

  // Campos denormalizados (Seção 5.5, linha 1170-1175, 1228)
  nome_equipamento?: string;       // derivado de Resumo_Bem_Patrimonial.nome
  predio?: string;                 // derivado de Local.predio
  andar?: string;                  // derivado de Local.andar
  sala?: string;                   // derivado de Local.sala
  letra_inicial_nome?: string;     // derivado da primeira letra de nome_equipamento
}

// Seção 4.10: Requisicao_Edicao_Bem_Patrimonial
export interface RequisicaoEdicaoBemPatrimonial {
  id: string;
  id_bem_patrimonial: string;                                           // FK, NOT NULL
  status: "pendente" | "aprovada" | "rejeitada";                        // ENUM, NOT NULL
  feita_em: Date;                                                       // NOT NULL
  respondida_em?: Date | null;                                          // NULL
  id_usuario_solicitante: string;                                       // FK, NOT NULL
  id_usuario_respondente?: string | null;                               // FK, NULL
  novo_nome?: string | null;                                            // VARCHAR(150), NULL
  novo_status?: "Ativo" | "Inservivel" | "Ja_dado_baixa" | null;       // ENUM, NULL
  novo_estado_conservacao?: "BOM" | "REGULAR" | "RUIM" | null;         // ENUM, NULL
  novo_id_local?: string | null;                                        // FK, NULL
  nova_photo_url?: string | null;                                       // TEXT, NULL
  motivo: string;                                                       // TEXT, NOT NULL
  justificativa_resposta?: string | null;                               // TEXT, NULL

  // Denormalizados (Seção 5.8, linha 1231)
  nome_equipamento?: string;
  numero_patrimonio?: string;
}

// Seção 4.11: Requisicao_Adicao_Bem_Patrimonial
export interface RequisicaoAdicaoBemPatrimonial {
  id: string;
  numero_patrimonio_proposto: string;                                   // NOT NULL
  status: "pendente" | "aprovada" | "rejeitada";                        // ENUM, NOT NULL
  feita_em: Date;                                                       // NOT NULL
  id_bem_patrimonial_se_aprovado?: string | null;                       // FK, NULL
  respondida_em?: Date | null;                                          // NULL
  id_usuario_solicitante: string;                                       // FK, NOT NULL
  id_usuario_respondente?: string | null;                               // FK, NULL
  estado_conservacao_proposto: "BOM" | "REGULAR" | "RUIM";             // ENUM, NOT NULL
  photo_url_proposta?: string | null;                                   // TEXT, NULL
  nome_responsavel_proposto: string;                                    // NOT NULL
  id_local: string;                                                     // FK, NOT NULL
  id_resumo_bem_patrimonial?: string | null;                            // FK, NULL
  nome_resumo_proposto?: string | null;                                 // NULL
  descricao_resumo_proposta?: string | null;                            // NULL
  motivo: string;                                                       // TEXT, NOT NULL
}

// Alias de retrocompatibilidade (usado por componentes antigos)
export type RequisicaoProfessor = RequisicaoEdicaoBemPatrimonial;
