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

import { onAuthStateChanged } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "@/lib/firebase/config";
import type {
  Pessoa,
  DetalhesUsuario,
  Professor,
  UsuarioSelecionavel,
  Aluno,
} from "@/types/usuarios";
import type {
  BuscarAlunosParams,
  BuscarUsuariosParams,
  BuscarUsuariosRetiradaParams,
  ConcederPapelParams,
  ConcederPapelResult,
  ConvidarProfessorParams,
  ConvidarProfessorRequest,
  ConvidarProfessorResult,
  ObterDetalhesParams,
  RevogarPapelParams,
  UsuarioRetirada,
} from "@/types/usuariosApi";
export type { BuscarUsuariosRetiradaParams, UsuarioRetirada } from "@/types/usuariosApi";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de payload / resposta
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Implementação
// ─────────────────────────────────────────────────────────────────────────────

type ListenerUsuariosSelecionaveis = (usuarios: UsuarioSelecionavel[]) => void;

const cacheBuscasUsuarios = new Map<string, Pessoa[]>();
const carregamentosBuscasUsuarios = new Map<string, Promise<Pessoa[]>>();
let cacheUsuariosSelecionaveis: UsuarioSelecionavel[] | null = null;
let carregamentoUsuariosSelecionaveis: Promise<UsuarioSelecionavel[]> | null = null;
const listenersUsuariosSelecionaveis = new Set<ListenerUsuariosSelecionaveis>();
let versaoCacheUsuarios = 0;

function chaveBuscaUsuarios(params?: BuscarUsuariosParams): string {
  return JSON.stringify({
    uid: auth.currentUser?.uid ?? "anonymous",
    recurso: "usuarios",
    papel: params?.papel ?? null,
    letra: params?.letra?.trim().toUpperCase() ?? null,
    termo: params?.termo?.trim().toLocaleLowerCase("pt-BR") ?? null,
  });
}

function normalizarBuscaUsuarios(params?: BuscarUsuariosParams): BuscarUsuariosParams {
  return {
    ...(params?.termo?.trim() ? { termo: params.termo.trim() } : {}),
    ...(params?.papel ? { papel: params.papel } : {}),
    ...(params?.letra?.trim() ? { letra: params.letra.trim().toUpperCase() } : {}),
  };
}

async function carregarUsuariosSelecionaveis(): Promise<UsuarioSelecionavel[]> {
  if (cacheUsuariosSelecionaveis) return cacheUsuariosSelecionaveis;
  if (!carregamentoUsuariosSelecionaveis) {
    const versaoDaBusca = versaoCacheUsuarios;
    carregamentoUsuariosSelecionaveis = buscarUsuarios({ papel: "Professor" })
      .then((usuarios) => {
        if (versaoDaBusca === versaoCacheUsuarios) {
          cacheUsuariosSelecionaveis = usuarios;
          for (const listener of listenersUsuariosSelecionaveis) listener(usuarios);
        }
        return usuarios;
      })
      .finally(() => {
        if (versaoDaBusca === versaoCacheUsuarios) carregamentoUsuariosSelecionaveis = null;
      });
  }
  return carregamentoUsuariosSelecionaveis;
}

/**
 * Assina a projeção autorizada de identidades que podem receber Professor.
 *
 * Este não é um onSnapshot intencionalmente: a norma e as Rules não permitem
 * listar `Usuarios` no cliente. A fonte é a callable server-side; a assinatura
 * mantém a projeção em cache entre aberturas do modal e evita chamadas
 * duplicadas enquanto não houver invalidação. O Firestore persistentLocalCache
 * continua reservado aos listeners Firestore autorizados.
 */
export function assinarUsuariosSelecionaveis(
  onData: ListenerUsuariosSelecionaveis,
  onError?: (error: unknown) => void,
): () => void {
  listenersUsuariosSelecionaveis.add(onData);

  if (cacheUsuariosSelecionaveis) {
    queueMicrotask(() => {
      if (listenersUsuariosSelecionaveis.has(onData)) onData(cacheUsuariosSelecionaveis!);
    });
  } else {
    void carregarUsuariosSelecionaveis().catch((error: unknown) => {
      if (onError) onError(error);
    });
  }

  return () => {
    listenersUsuariosSelecionaveis.delete(onData);
  };
}

export function invalidarCacheUsuariosSelecionaveis(): void {
  versaoCacheUsuarios += 1;
  cacheUsuariosSelecionaveis = null;
  carregamentoUsuariosSelecionaveis = null;
}

/**
 * Invalida as projeções administrativas de pessoas após uma mutação de papel.
 * O cache é de sessão e não é fonte de autorização: o backend sempre relê e
 * valida a matriz M9 antes de conceder, revogar ou detalhar um usuário.
 */
export function invalidarCacheBuscasUsuarios(): void {
  versaoCacheUsuarios += 1;
  cacheBuscasUsuarios.clear();
  carregamentosBuscasUsuarios.clear();
  cacheUsuariosSelecionaveis = null;
  carregamentoUsuariosSelecionaveis = null;
}

let uidDoCache = auth.currentUser?.uid ?? null;
onAuthStateChanged(auth, (usuario) => {
  const novoUid = usuario?.uid ?? null;
  if (novoUid === uidDoCache) return;
  uidDoCache = novoUid;
  invalidarCacheBuscasUsuarios();
});

/**
 * Busca usuários por termo opcional (nome/email).
 * Mapa 1:1 com Cloud Function `buscarUsuariosParaPapel`.
 */
export async function buscarUsuarios(params?: BuscarUsuariosParams): Promise<Pessoa[]> {
  const parametrosNormalizados = normalizarBuscaUsuarios(params);
  const chave = chaveBuscaUsuarios(parametrosNormalizados);
  const cacheado = cacheBuscasUsuarios.get(chave);
  if (cacheado) return cacheado;

  const carregamentoExistente = carregamentosBuscasUsuarios.get(chave);
  if (carregamentoExistente) return carregamentoExistente;

  const fn = httpsCallable<BuscarUsuariosParams | Record<string, never>, { usuarios: Pessoa[] }>(
    functions,
    "buscarUsuariosParaPapel"
  );
  const versaoDaBusca = versaoCacheUsuarios;
  const carregamento = fn(parametrosNormalizados)
    .then((res) => {
      if (versaoDaBusca === versaoCacheUsuarios) cacheBuscasUsuarios.set(chave, res.data.usuarios);
      return res.data.usuarios;
    })
    .finally(() => {
      if (carregamentosBuscasUsuarios.get(chave) === carregamento) {
        carregamentosBuscasUsuarios.delete(chave);
      }
    });
  carregamentosBuscasUsuarios.set(chave, carregamento);
  return carregamento;
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
  invalidarCacheBuscasUsuarios();
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
  invalidarCacheBuscasUsuarios();
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
  return carregarUsuariosSelecionaveis();
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
  invalidarCacheBuscasUsuarios();
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
