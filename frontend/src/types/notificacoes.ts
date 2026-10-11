// ===================================================================
// Tipos de Notificações — Modelados rigorosamente conforme CUE M13 e Seção 7/8
// ===================================================================

import type { Timestamp } from "firebase/firestore";

/**
 * Os 21 tipos normativos fechados de notificação do LCQUI (#M13Tipo).
 */
export type TipoNotificacao =
  | "ADICIONADO"
  | "POST"
  | "COMENTARIO"
  | "REMOVIDO"
  | "TURMA_ARQUIVADA"
  | "TURMA_DESARQUIVADA"
  | "CONVITE_PARA_TURMA"
  | "REQUISICAO_BEM"
  | "DATA_DEVOLUCAO_REAGENTE"
  | "ROTEIRO_COMPARTILHADO"
  | "REQUISICAO_EDICAO_BEM"
  | "REQUISICAO_ADICAO_BEM"
  | "BEM_INSERVIVEL"
  | "ENTREGA_ATRASADA"
  | "FRASCOS_VAZIOS"
  | "FRASCOS_QUEBRADOS"
  | "FRASCOS_VENCIDOS"
  | "FRASCOS_A_SEREM_PESADOS"
  | "FRASCOS_EM_QUARENTENA"
  | "ESCASSEZ_ESTOQUE"
  | "AUTO_ATENDIMENTO_RETIRADA";

/**
 * Papéis de destinatário da notificação (#M13PapelDestinatario).
 */
export type PapelDestinatarioNotificacao =
  | "Aluno"
  | "Professor"
  | "Bolsista"
  | "Gestor_Bens_Patrimoniais"
  | "Gestor_Almoxarifado"
  | "Chefe_Geral";

/**
 * Entidades alvo conhecidas para rotas e deep links seguros (#M13EntidadeAlvo).
 */
export type EntidadeAlvoNotificacao =
  | "Turma"
  | "Post"
  | "Comentario"
  | "Roteiro"
  | "Almoxarifado"
  | "Emprestimo"
  | "Usuario"
  | "Requisicao_Bem"
  | "Bem_Patrimonial"
  | "Convite_Aluno";

/**
 * Item de notificação unificada persistido em Usuarios/{uid}/Notificacoes/{id} (#M13Notificacao).
 */
export interface NotificacaoItem {
  id: string;
  tipo: TipoNotificacao | string;
  papel_destinatario: PapelDestinatarioNotificacao | string;
  id_destinatario: string;
  id_alvo: string;
  entidade_alvo?: EntidadeAlvoNotificacao | string | null;
  id_turma?: string | null;
  id_quem_fez_acao?: string | null;
  lida: boolean;
  lida_em?: Timestamp | null;
  emitida_em?: Timestamp | null;
  expira_em?: Timestamp | null;
  mensagem_customizada?: string | null;
  quantidade?: number | null;
}

/**
 * Rótulos legíveis normativos para os tipos de notificação.
 */
export const ROTULO_TIPO_NOTIFICACAO: Record<string, string> = {
  POST: "Nova postagem",
  COMENTARIO: "Novo comentário",
  ADICIONADO: "Adicionado à turma",
  REMOVIDO: "Removido da turma",
  TURMA_ARQUIVADA: "Turma arquivada",
  TURMA_DESARQUIVADA: "Turma desarquivada",
  CONVITE_PARA_TURMA: "Convite de matrícula",
  ROTEIRO_COMPARTILHADO: "Roteiro compartilhado",
  REQUISICAO_BEM: "Requisição de patrimônio",
  REQUISICAO_EDICAO_BEM: "Requisição de edição de bem",
  REQUISICAO_ADICAO_BEM: "Requisição de adição de bem",
  BEM_INSERVIVEL: "Bem classificado como inservível",
  DATA_DEVOLUCAO_REAGENTE: "Devolução de reagente pendente",
  ENTREGA_ATRASADA: "Entrega atrasada",
  FRASCOS_VAZIOS: "Frasco esgotado / vazio",
  FRASCOS_QUEBRADOS: "Frasco quebrado",
  FRASCOS_VENCIDOS: "Frasco com validade vencida",
  FRASCOS_A_SEREM_PESADOS: "Pesagem de rotina requerida",
  FRASCOS_EM_QUARENTENA: "Frasco colocado em quarentena",
  ESCASSEZ_ESTOQUE: "Alerta de escassez de estoque",
  AUTO_ATENDIMENTO_RETIRADA: "Retirada em auto-atendimento",
};
