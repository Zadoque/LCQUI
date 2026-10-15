// ===================================================================
// Tipos de Usuários, Papéis e Autenticação — Conforme Seção 3, 7 e M9
// ===================================================================

import type { User as FirebaseUser } from "firebase/auth";

/**
 * Papéis canônicos de autoridade e atuação normativa no LCQUI (#M9Papel).
 */
export type Papel =
  | "Chefe_Geral"
  | "Gestor_Almoxarifado"
  | "Gestor_Bens_Patrimoniais"
  | "Professor"
  | "Aluno"
  | "Bolsista";

export const PAPEIS_CANONICOS: readonly Papel[] = [
  "Chefe_Geral",
  "Gestor_Almoxarifado",
  "Gestor_Bens_Patrimoniais",
  "Professor",
  "Aluno",
  "Bolsista",
] as const;

/**
 * Entidade Usuário persistida no Firestore em Usuarios/{uid} (#M9Usuario).
 */
export interface Usuario {
  uid: string;
  nome: string;
  email: string | null;
  ativo: boolean;
  versao_permissoes: number;
  papeis_persistidos?: Papel[];
  photo_url?: string | null;
  matricula?: string | null;
  siape?: string | null;
}

/**
 * Projeção resumida de pessoa para diretórios e seletores administrativos (UI-02).
 */
export interface Pessoa {
  id: string;
  nome: string;
  papeis: string[];
}

export interface UsuarioSelecionavel {
  id: string;
  nome: string;
  papeis?: string[];
  ativo?: boolean;
}

/**
 * Detalhes completos de usuário para inspeção em abas da UI-02 (Dados/Papéis/Vínculos/Turmas/Atividade).
 */
export interface DetalhesUsuario {
  dados: {
    id: string;
    nome: string;
    email: string | null;
    ativo: boolean;
    versao_permissoes: number;
  };
  papeis: string[];
  turmas: Array<{ id: string; [key: string]: unknown }>;
  atividade: Array<{
    id: string;
    acao?: string;
    instante?: string | number | { _seconds?: number; _nanoseconds?: number; seconds?: number; nanoseconds?: number } | null;
  }>;
}

/**
 * Projeção mínima server-side para listagem e seleção de professores.
 */
export interface Professor {
  id: string;
  nome: string;
  uid?: string;
  email?: string;
  ativo?: boolean;
  centro?: string;
  laboratorio?: string;
  materias?: string[];
}

export interface ProfessorProjecao {
  id?: string;
  uid: string;
  nome: string;
  ativo?: boolean;
}

/**
 * Projeção de aluno para listagem em turmas e controle de matrículas.
 */
export interface Aluno {
  id: string;
  nome: string;
  ativo: boolean;
  matricula?: string | null;
}

/**
 * Estado decodificado de autenticação e claims persistidas do usuário logado.
 */
export interface EstadoAutenticacao {
  roles: string[];
  ativo: boolean;
}

/**
 * Contrato exposto pelo AuthContext no frontend Next.js.
 */
export interface AuthContextType {
  user: FirebaseUser | null;
  roles: string[];
  ativo: boolean;
  papelAtivo: string | null;
  isLoading: boolean;
  refreshSession: () => Promise<EstadoAutenticacao>;
  setPapelAtivo: (role: string) => void;
}
