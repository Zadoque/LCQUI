/**
 * Serviço de Usuários / Papéis — UI-02
 *
 * Centraliza todas as chamadas Firebase do domínio de usuários:
 * - Busca de pessoas
 * - Concessão e revogação de papéis
 * - Detalhes autorizados de um usuário
 *
 * Isolamento de Firebase SDK do código de UI.
 * Nunca chame httpsCallable diretamente em componentes — use este serviço.
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/config";
import type {
  Pessoa,
  DetalhesUsuario,
  Papel,
  Professor,
  UsuarioSelecionavel,
  Aluno,
} from "@/types/usuarios";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de payload / resposta
// ─────────────────────────────────────────────────────────────────────────────

export interface BuscarUsuariosParams {
  termo?: string;
  papel?: Papel;
}

export interface ConcederPapelParams {
  idOperacao: string;
  papel: Papel;
  uidAlvo?: string;
  nome?: string;
  email?: string;
}

export interface ConcederPapelResult {
  uid: string;
  ativo: boolean;
  contaAuthCriada?: boolean;
  emailEnviado?: boolean;
}

export interface RevogarPapelParams {
  idOperacao: string;
  uidAlvo: string;
  papel: Papel;
  motivo: string;
}

export interface ObterDetalhesParams {
  uid: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Implementação
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca usuários por termo opcional (nome/email).
 * Mapa 1:1 com Cloud Function `buscarUsuariosParaPapel`.
 */
export async function buscarUsuarios(params?: BuscarUsuariosParams): Promise<Pessoa[]> {
  const fn = httpsCallable<BuscarUsuariosParams | Record<string, never>, { usuarios: Pessoa[] }>(
    functions,
    "buscarUsuariosParaPapel"
  );
  const res = await fn({
    ...(params?.termo ? { termo: params.termo } : {}),
    ...(params?.papel ? { papel: params.papel } : {}),
  });
  return res.data.usuarios;
}

/**
 * Concede um papel a um usuário existente ou a uma nova identidade.
 * Mapa 1:1 com Cloud Function `convidarUsuario`.
 */
export async function concederPapel(params: ConcederPapelParams): Promise<ConcederPapelResult> {
  const fn = httpsCallable<ConcederPapelParams, ConcederPapelResult>(functions, "convidarUsuario");
  const res = await fn({
    idOperacao: params.idOperacao,
    papel: params.papel,
    ...(params.uidAlvo ? { uidAlvo: params.uidAlvo } : { nome: params.nome, email: params.email }),
  });
  return res.data;
}

/**
 * Revoga um papel de um usuário com justificativa obrigatória.
 * Mapa 1:1 com Cloud Function `revogarUsuarioPapel`.
 */
export async function revogarPapel(params: RevogarPapelParams): Promise<void> {
  const fn = httpsCallable(functions, "revogarUsuarioPapel");
  await fn({
    idOperacao: params.idOperacao,
    uidAlvo: params.uidAlvo,
    papel: params.papel,
    motivo: params.motivo,
  });
}

/**
 * Obtém os detalhes autorizados de um usuário para exibição administrativa.
 * Mapa 1:1 com Cloud Function `obterDetalhesUsuarioParaPapel`.
 */
export async function obterDetalhesUsuario(params: ObterDetalhesParams): Promise<DetalhesUsuario> {
  const fn = httpsCallable<ObterDetalhesParams, DetalhesUsuario>(
    functions,
    "obterDetalhesUsuarioParaPapel"
  );
  const res = await fn(params);
  return res.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Professores e Alunos
// ─────────────────────────────────────────────────────────────────────────────

export interface ConvidarProfessorParams {
  idOperacao?: string;
  uidAlvo?: string;
  email?: string;
  nome?: string;
  centro: string;
  laboratorio: string;
  materias: string[];
}

export interface ConvidarProfessorResult {
  uid: string;
  ativo: boolean;
  contaAuthCriada?: boolean;
  emailEnviado?: boolean;
}

interface ConvidarProfessorRequest extends ConvidarProfessorParams {
  papel: "Professor";
}

export interface BuscarAlunosParams {
  letra: string;
  termo?: string;
}

export interface UsuarioRetirada {
  id: string;
  nome: string;
  papeis: string[];
}

export interface BuscarUsuariosRetiradaParams {
  letra: string;
  termo?: string;
}

/**
 * Busca a lista de professores ativos cadastrados no sistema.
 */
export async function buscarProfessores(): Promise<Professor[]> {
  const fn = httpsCallable<Record<string, never>, { professores: Professor[] }>(
    functions,
    "buscarProfessores"
  );
  const res = await fn({});
  return res.data.professores;
}

/**
 * Busca usuários elegíveis para seleção ao conceder papéis.
 */
export async function buscarUsuariosSelecionaveis(): Promise<UsuarioSelecionavel[]> {
  const fn = httpsCallable<Record<string, never>, { usuarios: UsuarioSelecionavel[] }>(
    functions,
    "buscarUsuariosParaPapel"
  );
  const res = await fn({});
  return res.data.usuarios;
}

/**
 * Convida um novo professor ou vincula um professor existente via Cloud Function.
 */
export async function convidarProfessor(
  params: ConvidarProfessorParams
): Promise<ConvidarProfessorResult> {
  const fn = httpsCallable<ConvidarProfessorRequest, ConvidarProfessorResult>(functions, "convidarUsuario");
  const res = await fn({
    idOperacao: params.idOperacao ?? crypto.randomUUID(),
    ...(params.uidAlvo ? { uidAlvo: params.uidAlvo } : { email: params.email, nome: params.nome }),
    papel: "Professor",
    centro: params.centro,
    laboratorio: params.laboratorio,
    materias: params.materias,
  });
  return res.data;
}

/**
 * Busca alunos por letra inicial e termo opcional de pesquisa.
 */
export async function buscarAlunosPorLetraETermo(
  params: BuscarAlunosParams
): Promise<Aluno[]> {
  const fn = httpsCallable<BuscarAlunosParams, { alunos: Aluno[] }>(
    functions,
    "buscarAlunos"
  );
  const res = await fn({
    letra: params.letra,
    ...(params.termo?.trim() ? { termo: params.termo.trim() } : {}),
  });
  return res.data.alunos.map((a) => ({ ...a, ativo: true }));
}

/** Busca somente portadores elegíveis da inicial informada, sem listar o diretório. */
export async function buscarUsuariosParaRetirada(
  params: BuscarUsuariosRetiradaParams
): Promise<UsuarioRetirada[]> {
  const fn = httpsCallable<BuscarUsuariosRetiradaParams, { usuarios: UsuarioRetirada[] }>(
    functions,
    "buscarUsuariosParaRetirada"
  );
  const res = await fn({
    letra: params.letra,
    ...(params.termo?.trim() ? { termo: params.termo.trim() } : {}),
  });
  return res.data.usuarios;
}
