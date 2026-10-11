// ===================================================================
// Tipos do Domínio Acadêmico — Turmas, Matrículas, Posts, Comentários e Roteiros
// Modelados rigorosamente conforme CUE (M11, M12.1, M12.2) e Seções 4/7/8/9
// ===================================================================

import type { Timestamp } from "firebase/firestore";

/**
 * Status normativo de uma Turma (#M11StatusTurma).
 */
export type StatusTurma = "Ativo" | "Arquivada";

/**
 * Modo de ingresso do aluno na turma (#M11ModoIngresso).
 */
export type ModoIngressoTurma = "CODIGO" | "CONVITE";

/**
 * Tipo de evento registrado no histórico da turma (#M11TipoEvento).
 */
export type TipoEventoHistoricoTurma = "inclusao_aluno" | "exclusao_aluno";

/**
 * Status do ciclo de vida de um convite (#M11StatusConvite).
 */
export type StatusConvite = "pendente" | "aceitado" | "rejeitado" | "expirado";

/**
 * Status de validação do roteiro no ciclo de vida M12.2 (#M12_2StatusRoteiro).
 */
export type StatusRoteiro = "PROVISORIO" | "VALIDADO" | "PUBLICAVEL";

/**
 * Perspectiva de autorização para projeção mascarada de comentários (#M12_1Visao).
 */
export type VisaoComentario = "AUTOR" | "COLEGA" | "AUDITOR";

/**
 * Entidade Turma no Firestore (#M11Turma).
 */
export interface Turma {
  id: string;
  nome_turma: string;
  codigo_turma?: string;
  status?: StatusTurma | string;
  id_professor?: string;
  nome_professor?: string;
  id_materia?: string;
  nome_materia?: string;
  ano?: number;
  semestre?: 1 | 2;
  capacidade?: number;
  qtd_alunos?: number;
  data_criacao?: Timestamp | { toDate?: () => Date } | null;
  versao?: number;
}

/**
 * Membro vinculado à turma na subcoleção Turma/{id}/Alunos (#M11VinculoCanonico).
 */
export interface MembroTurma {
  id: string;
  nome: string;
  matricula?: string | null;
  email?: string | null;
  adicionado_em?: Timestamp | { toDate?: () => Date } | null;
}

/**
 * Registro de auditoria histórica de aluno na subcoleção HistoricoAlunos (#M11EventoHistorico).
 */
export interface HistoricoAlunoTurmaEntry {
  id: string;
  tipo: TipoEventoHistoricoTurma | string;
  timestamp: Timestamp | { toDate?: () => Date } | null;
  modo_ingresso?: ModoIngressoTurma | string | null;
  justificativa?: string | null;
  removido_por?: string | null;
}

/**
 * Detalhes e metadados contextuais de um convite de aluno.
 */
export interface DetalhesConvite {
  idConvite: string;
  status: StatusConvite | string;
  expira_em: string;
  id_turma: string | null;
  nome_turma: string | null;
  nome_professor: string | null;
  convidado_por_nome: string | null;
  contexto_convidador: "Professor" | "Chefe_Geral";
  exceder_capacidade: boolean;
  matricula_necessaria: boolean;
}

/**
 * Snapshot imutável de roteiro anexo a uma postagem (#M12_2RoteiroAnexo).
 */
export interface RoteiroAnexo {
  id_roteiro: string;
  nome_arquivo: string;
  tamanho_bytes: number;
  storage_path: string;
  geracao: string;
}

/**
 * Projeção resumida de Roteiro para seleção de anexos em posts.
 */
export interface RoteiroProjecao {
  id: string;
  nome: string;
  status: StatusRoteiro | string;
  descricao?: string;
  file_url?: string | null;
  professores_compartilhados?: string[];
  referencia?: { storage_path?: string } | null;
}

/**
 * Entidade Post de uma turma (#M12_1Post).
 */
export interface Post {
  id: string;
  titulo: string;
  descricao: string;
  criado_em: Timestamp | { toDate?: () => Date } | null;
  id_professor: string;
  nome_professor?: string;
  id_roteiro_experimento?: string | null;
  roteiro_anexo?: RoteiroAnexo | null;
  removido_da_apresentacao?: boolean;
  motivo_remocao?: string | null;
  editado?: boolean;
  editado_em?: Timestamp | { toDate?: () => Date } | null;
}

/**
 * Item de comentário em uma postagem acadêmica (#M12_1Comentario).
 */
export interface ComentarioItem {
  id: string;
  id_usuario: string;
  nome_usuario: string;
  texto: string | null;
  criado_em: Timestamp | { toDate?: () => Date } | null;
  editado: boolean;
  editado_em?: unknown;
  moderado: boolean;
  motivo_moderacao?: string | null;
  moderado_por?: string | null;
  moderado_em?: unknown;
  aviso_institucional?: string | null;
}
