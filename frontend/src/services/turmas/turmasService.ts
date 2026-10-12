/**
 * Serviço de Turmas — M11 / M12.1 / M12.2
 *
 * Centraliza todas as chamadas Firebase do domínio acadêmico:
 * - Feed de posts com onSnapshot (real-time)
 * - Roteiros do professor
 * - CRUD de posts (criar, editar, remover)
 * - Arquivamento de turma (M7 idempotente)
 *
 * Nunca chame httpsCallable, onSnapshot ou Firestore diretamente
 * em componentes — use este serviço.
 */

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDocs,
  where,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase/config";
import { ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase/config";
import {
  resolverIdOperacao,
  lerIntencao,
  gravarIntencao,
  limparIntencao,
  chaveIntencaoStatusTurma,
  assinaturaStatusTurma,
  chaveIntencaoEmitirUrl,
  assinaturaIntencaoEmitirUrl,
  chaveIntencaoMembro,
  assinaturaMembro,
  obterIntencaoPersistida,
} from "@/lib/intencaoOperacao";
import type {
  Turma,
  Post,
  RoteiroProjecao,
  ComentarioItem,
  VisaoComentario,
  MembroTurma,
  HistoricoAlunoTurmaEntry,
} from "@/types/turmas";
import type { MateriaItem } from "@/types/cadastros";
import type {
  AdicionarAlunoTurmaInput,
  AlunosListaResponse,
  AlterarStatusTurmaInput,
  BuscarAlunosInput,
  CompartilharRoteiroInput,
  ConvidarAlunoInput,
  CriarTurmaInput,
  IngressarTurmaInput,
  MateriaRelacao,
  ProfessorListaResponse,
  RoteiroIdInput,
  RoteiroRegistradoResponse,
  RoteiroUploadInput,
  AdicionarComentarioParams,
  ArquivarTurmaParams,
  CriarPostParams,
  EditarComentarioParams,
  EditarPostParams,
  EmitirUrlDownloadRoteiroParams,
  ListarComentariosResult,
  ModerarComentarioParams,
  RemoverAlunoTurmaParams,
  RemoverPostParams,
} from "@/types/turmasApi";
export type { CriarPostParams, EditarPostParams, RemoverPostParams, ArquivarTurmaParams, ListarComentariosResult, AdicionarComentarioParams, ModerarComentarioParams, EditarComentarioParams, EmitirUrlDownloadRoteiroParams, RemoverAlunoTurmaParams } from "@/types/turmasApi";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de payload / resposta
// ─────────────────────────────────────────────────────────────────────────────

async function chamarTurmas<TInput>(nome: string, payload: TInput): Promise<void> {
  const fn = httpsCallable<TInput, Record<string, never>>(getFunctions(), nome);
  await fn(payload);
}

export async function criarTurma(payload: CriarTurmaInput): Promise<void> {
  await chamarTurmas("criarTurma", payload);
}

export async function ingressarEmTurmaPorCodigo(payload: IngressarTurmaInput): Promise<void> {
  await chamarTurmas("ingressarEmTurmaPorCodigo", payload);
}

export async function alterarStatusTurma(payload: AlterarStatusTurmaInput): Promise<void> {
  await chamarTurmas("alterarStatusTurma", payload);
}

export function assinarMaterias(onData: (materias: MateriaItem[]) => void): () => void {
  const q = query(collection(db, "Materia"), orderBy("nome", "asc"));
  return onSnapshot(q, (snap) => onData(snap.docs.map((item) => ({
    id: item.id,
    nome: String(item.data().nome ?? ""),
    codigo: String(item.data().codigo_materia ?? ""),
  }))));
}

export function assinarMateriasDoProfessor(idProfessor: string, onData: (relacoes: MateriaRelacao[]) => void): () => void {
  const q = query(collection(db, "Professor_x_Materia"), where("id_usuario", "==", idProfessor));
  return onSnapshot(q, (snap) => onData(snap.docs.map((item) => ({ id_materia: String(item.data().id_materia ?? "") }))));
}

export async function buscarProfessoresAcademicos(): Promise<ProfessorListaResponse["professores"]> {
  const fn = httpsCallable<Record<string, never>, ProfessorListaResponse>(getFunctions(), "buscarProfessores");
  return (await fn({})).data.professores;
}

export async function buscarAlunosAcademicos(payload: BuscarAlunosInput): Promise<AlunosListaResponse["alunos"]> {
  const fn = httpsCallable<BuscarAlunosInput, AlunosListaResponse>(getFunctions(), "buscarAlunos");
  return (await fn(payload)).data.alunos;
}

export async function adicionarAlunoExistenteTurma(payload: AdicionarAlunoTurmaInput): Promise<void> {
  await chamarTurmas("adicionarAlunoExistenteTurma", payload);
}

export async function convidarAluno(payload: ConvidarAlunoInput): Promise<{ canal_entrega?: string; status_entrega?: string }> {
  const fn = httpsCallable<ConvidarAlunoInput, { canal_entrega?: string; status_entrega?: string }>(getFunctions(), "convidarAluno");
  return (await fn(payload)).data;
}

export async function enviarRoteiroParaStorage(uid: string, arquivo: File): Promise<string> {
  const arquivoRef = ref(storage, `roteiros/${uid}/${Date.now()}_${arquivo.name}`);
  await uploadBytes(arquivoRef, arquivo, { customMetadata: { owner: uid } });
  return arquivoRef.fullPath;
}

export async function registrarRoteiro(payload: RoteiroUploadInput): Promise<string> {
  const fn = httpsCallable<RoteiroUploadInput, RoteiroRegistradoResponse>(getFunctions(), "registrarRoteiro");
  return (await fn(payload)).data.idRoteiro;
}

export async function validarObjetoRoteiro(payload: RoteiroIdInput): Promise<void> {
  await chamarTurmas("validarObjetoRoteiro", payload);
}

export async function publicarRoteiro(payload: RoteiroIdInput): Promise<void> {
  await chamarTurmas("publicarRoteiro", payload);
}

export async function removerRoteiro(payload: RoteiroIdInput): Promise<void> {
  await chamarTurmas("removerRoteiro", payload);
}

export async function compartilharRoteiro(payload: CompartilharRoteiroInput): Promise<void> {
  await chamarTurmas("compartilharRoteiro", payload);
}

export async function descompartilharRoteiro(payload: CompartilharRoteiroInput): Promise<void> {
  await chamarTurmas("descompartilharRoteiro", payload);
}

// ─────────────────────────────────────────────────────────────────────────────
// Real-time subscription
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assina o feed de posts de uma turma em tempo real via onSnapshot.
 * Retorna a função de cancelamento da subscription (unsubscribe).
 *
 * @param idTurma - ID da turma no Firestore
 * @param onData  - callback com a lista de posts filtrados
 * @param uidUsuario - uid do usuário autenticado (para filtragem de removidos)
 * @param isAuditor  - se true, exibe posts removidos (Chefe_Geral / professor dono)
 */
export function assinarFeedPosts(
  idTurma: string,
  onData: (posts: Post[]) => void,
  uidUsuario: string,
  isAuditor: boolean
): () => void {
  const q = query(
    collection(db, "Turma", idTurma, "Posts"),
    orderBy("criado_em", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const todos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Post[];
    const visiveis = todos.filter((p) => {
      if (!p.removido_da_apresentacao) return true;
      // Post removido — só o professor dono ou auditores veem
      return isAuditor || uidUsuario === p.id_professor;
    });
    onData(visiveis);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Cloud Functions callables
// ─────────────────────────────────────────────────────────────────────────────

/** Lista roteiros do professor autenticado. */
export async function listarRoteirosProfessor(): Promise<RoteiroProjecao[]> {
  const fn = getFunctions();
  const listar = httpsCallable<
    Record<string, never>,
    { roteiros: RoteiroProjecao[] }
  >(fn, "listarRoteirosProfessor");
  const res = await listar({});
  return res.data.roteiros;
}

/** Cria um post na turma. Idempotente via idOperacao (M7). */
export async function criarPost(params: CriarPostParams): Promise<void> {
  const fn = getFunctions();
  const criar = httpsCallable(fn, "criarPost");
  const payload: Record<string, string> = {
    idOperacao: params.idOperacao,
    idTurma: params.idTurma,
    titulo: params.titulo,
    descricao: params.descricao,
  };
  if (params.idRoteiroExperimento) {
    payload.idRoteiroExperimento = params.idRoteiroExperimento;
  }
  await criar(payload);
}

/** Edita um post existente. Idempotente via idOperacao (M7). */
export async function editarPost(params: EditarPostParams): Promise<void> {
  const fn = getFunctions();
  const editar = httpsCallable(fn, "editarPost");
  const payload: Record<string, string | null | undefined> = {
    idOperacao: params.idOperacao,
    idTurma: params.idTurma,
    idPost: params.idPost,
    titulo: params.titulo,
    descricao: params.descricao,
  };
  if (params.idRoteiroExperimento !== undefined) {
    payload.idRoteiroExperimento = params.idRoteiroExperimento;
  }
  await editar(payload);
}

/** Remove (soft-delete) um post com motivo obrigatório. Idempotente via idOperacao (M7). */
export async function removerPost(params: RemoverPostParams): Promise<void> {
  const fn = getFunctions();
  const remover = httpsCallable(fn, "removerPost");
  await remover({
    idOperacao: params.idOperacao,
    idTurma: params.idTurma,
    idPost: params.idPost,
    motivo: params.motivo.trim(),
  });
}

/**
 * Arquiva uma turma.
 * Implementa o protocolo M7: reutiliza o idOperacao da intenção
 * persistida em sessionStorage para garantir idempotência em retries.
 */
export async function arquivarTurma(params: ArquivarTurmaParams): Promise<void> {
  const status = "Arquivada";
  const session = typeof window !== "undefined" ? window.sessionStorage : null;
  const chave = chaveIntencaoStatusTurma(params.idTurma, status);
  const assinatura = assinaturaStatusTurma(params.idTurma, status);
  const atual = session ? lerIntencao(session, chave) : null;
  const intencao = resolverIdOperacao(atual, assinatura, () => crypto.randomUUID());
  if (session) gravarIntencao(session, chave, intencao);

  const fn = getFunctions();
  const alterarStatus = httpsCallable(fn, "alterarStatusTurma");
  await alterarStatus({
    idOperacao: intencao.idOperacao,
    idTurma: params.idTurma,
    status,
  });

  if (session) limparIntencao(session, chave);
}

// ─────────────────────────────────────────────────────────────────────────────
// Comentários de Posts (M12.1)
// ─────────────────────────────────────────────────────────────────────────────

/** Lista comentários de um post considerando projeção mascarada pela visão. */
export async function listarComentariosPost(params: {
  idTurma: string;
  idPost: string;
}): Promise<ListarComentariosResult> {
  const fn = getFunctions();
  const listar = httpsCallable<
    { idOperacao: string; idTurma: string; idPost: string },
    { comentarios: ComentarioItem[]; visao: VisaoComentario }
  >(fn, "listarComentariosPost");
  const idOp = `listar-${params.idTurma}-${params.idPost}-${Date.now()}`;
  const resp = await listar({ idOperacao: idOp, idTurma: params.idTurma, idPost: params.idPost });
  return resp.data;
}

/** Adiciona um comentário a um post. Idempotente via idOperacao. */
export async function adicionarComentario(params: AdicionarComentarioParams): Promise<void> {
  const fn = getFunctions();
  const call = httpsCallable(fn, "adicionarComentario");
  const idOp = `coment-${params.idTurma}-${params.idPost}-${Date.now()}`;
  await call({
    idOperacao: idOp,
    idTurma: params.idTurma,
    idPost: params.idPost,
    texto: params.texto,
  });
}

/** Modera um comentário com justificativa institucional obrigatória. */
export async function moderarComentario(params: ModerarComentarioParams): Promise<void> {
  const fn = getFunctions();
  const call = httpsCallable(fn, "moderarComentario");
  const idOp = `mod-${params.idTurma}-${params.idPost}-${params.idComentario}-${Date.now()}`;
  await call({
    idOperacao: idOp,
    idTurma: params.idTurma,
    idPost: params.idPost,
    idComentario: params.idComentario,
    motivo: params.motivo.trim(),
  });
}

/** Edita o texto de um comentário feito pelo próprio autor. */
export async function editarComentario(params: EditarComentarioParams): Promise<void> {
  const fn = getFunctions();
  const call = httpsCallable(fn, "editarComentario");
  const idOp = `editar-comentario-${params.idTurma}-${params.idPost}-${params.idComentario}-${Date.now()}`;
  await call({
    idOperacao: idOp,
    idTurma: params.idTurma,
    idPost: params.idPost,
    idComentario: params.idComentario,
    texto: params.texto.trim(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Roteiros e Anexos (M12.2)
// ─────────────────────────────────────────────────────────────────────────────

/** Emite URL de download assinada para o roteiro em anexo, com protocolo M7 de intenção. */
export async function emitirUrlDownloadRoteiro(params: EmitirUrlDownloadRoteiroParams): Promise<string> {
  const fn = getFunctions();
  const emitir = httpsCallable<
    { idOperacao: string; idRoteiro: string; idTurma?: string; idPost?: string },
    { url: string }
  >(fn, "emitirUrlDownloadRoteiro");

  const idTurmaParaIntencao = params.isAlunoBolsista ? (params.idTurma ?? null) : null;
  const idPostParaIntencao = params.isAlunoBolsista ? (params.idPost ?? null) : null;
  const session = typeof window !== "undefined" ? window.sessionStorage : null;
  const chave = chaveIntencaoEmitirUrl(params.idRoteiro, idTurmaParaIntencao, idPostParaIntencao);
  const assinatura = assinaturaIntencaoEmitirUrl(params.idRoteiro, idTurmaParaIntencao, idPostParaIntencao);
  const intencao = session
    ? obterIntencaoPersistida(session, chave, assinatura, () => crypto.randomUUID())
    : { idOperacao: crypto.randomUUID(), assinatura };

  const payload: { idOperacao: string; idRoteiro: string; idTurma?: string; idPost?: string } = {
    idOperacao: intencao.idOperacao,
    idRoteiro: params.idRoteiro,
  };
  if (params.isAlunoBolsista && params.idTurma && params.idPost) {
    payload.idTurma = params.idTurma;
    payload.idPost = params.idPost;
  }

  const res = await emitir(payload);
  if (session) limparIntencao(session, chave);
  return res.data.url;
}

// ─────────────────────────────────────────────────────────────────────────────
// Membros e Histórico de Alunos (M11)
// ─────────────────────────────────────────────────────────────────────────────

/** Assina em tempo real o professor responsável pela turma. */
export function assinarProfessorDonoTurma(
  idTurma: string,
  onData: (idProfessor: string | null) => void
): () => void {
  return onSnapshot(doc(db, "Turma", idTurma), (snap) => {
    onData(snap.exists() ? (snap.data()?.id_professor ?? null) : null);
  });
}

/** Assina em tempo real a lista de alunos matriculados na turma. */
export function assinarMembrosTurma(
  idTurma: string,
  onData: (membros: MembroTurma[]) => void
): () => void {
  return onSnapshot(collection(db, "Turma", idTurma, "Alunos"), (snap) => {
    const lista: MembroTurma[] = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          nome: typeof data.nome === "string" ? data.nome : "Sem nome",
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
    onData(lista);
  });
}

/** Remove aluno da turma utilizando o protocolo M7 de intenção persistida. */
export async function removerAlunoTurma(params: RemoverAlunoTurmaParams): Promise<void> {
  const session = typeof window !== "undefined" ? window.sessionStorage : null;
  const chave = chaveIntencaoMembro(params.idTurma, params.idAluno, "REMOVER");
  const assinatura = assinaturaMembro(params.idTurma, params.idAluno, "REMOVER");
  const intencao = session
    ? obterIntencaoPersistida(session, chave, assinatura, () => crypto.randomUUID())
    : { idOperacao: crypto.randomUUID(), assinatura };

  const fn = getFunctions();
  const remover = httpsCallable(fn, "removerAlunoTurma");
  await remover({
    idOperacao: intencao.idOperacao,
    idTurma: params.idTurma,
    idAluno: params.idAluno,
  });

  if (session) limparIntencao(session, chave);
}

/** Busca histórico de eventos de auditoria do aluno na turma. */
export async function buscarHistoricoAlunoTurma(
  idTurma: string,
  idAluno: string
): Promise<HistoricoAlunoTurmaEntry[]> {
  const q = query(
    collection(db, "Turma", idTurma, "HistoricoAlunos"),
    where("id_aluno", "==", idAluno),
    orderBy("timestamp", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as HistoricoAlunoTurmaEntry[];
}

/** Assina em tempo real as turmas ativas vinculadas a um professor. */
export function assinarTurmasAtivasDoProfessor(
  idProfessor: string,
  onData: (turmas: Turma[]) => void
): () => void {
  const q = query(
    collection(db, "Turma"),
    where("id_professor", "==", idProfessor),
    where("status", "==", "Ativo")
  );
  return onSnapshot(q, (snap) => {
    const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Turma[];
    onData(lista);
  });
}

export function assinarTurmasArquivadasDoProfessor(
  idProfessor: string,
  onData: (turmas: Turma[]) => void,
): () => void {
  const q = query(collection(db, "Turma"), where("id_professor", "==", idProfessor), where("status", "==", "Arquivada"));
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((item) => ({ id: item.id, ...item.data() })) as Turma[]);
  });
}

export function assinarTurmasAtivas(
  isChefeGeral: boolean,
  idProfessor: string,
  onData: (turmas: Turma[]) => void,
): () => void {
  const q = isChefeGeral
    ? query(collection(db, "Turma"), where("status", "==", "Ativo"))
    : query(collection(db, "Turma"), where("id_professor", "==", idProfessor), where("status", "==", "Ativo"));
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((item) => ({ id: item.id, ...item.data() })) as Turma[]);
  });
}
