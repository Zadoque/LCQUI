// ===================================================================
// Tipos de Cadastros Básicos — Locais, Matérias e Almoxarifados
// Modelados conforme Seções 4, 5 e 8 (UI-03)
// ===================================================================

/**
 * Entidade de Local físico de armazenamento ou patrimônio (prédio, andar, sala).
 */
export interface LocalItem {
  id: string;
  predio: string;
  andar: string;
  sala: string;
  apelido?: string | null;
  ativo?: boolean;
}

export type Local = LocalItem;

/**
 * Interface para formulário de criação/edição de Local.
 */
export interface LocalEditavel {
  id: string;
  predio: string;
  andar: string;
  sala: string;
  apelido?: string | null;
}

/**
 * Entidade Matéria curricular vinculada a turmas.
 */
export interface MateriaItem {
  id: string;
  codigo: string;
  nome: string;
  ativa?: boolean;
}

export type Materia = MateriaItem;

/**
 * Ações administrativas sobre almoxarifado no backend M9/M7.
 */
export type AcaoAlmoxarifado = "CRIAR" | "EDITAR" | "ATIVAR" | "DESATIVAR";

/**
 * Entidade Almoxarifado cadastrado no sistema.
 */
export interface AlmoxarifadoItem {
  id: string;
  id_local: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  qtd_gestores_ativos: number;
}

export type Almoxarifado = AlmoxarifadoItem;

/**
 * Gestor vinculado a um almoxarifado.
 */
export interface GestorAlmoxarifado {
  id: string;
  nome: string;
  email?: string | null;
  ativo?: boolean;
}
