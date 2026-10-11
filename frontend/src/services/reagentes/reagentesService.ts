/**
 * Serviço de Reagentes — UI-04 / UI-19 / M1–M8
 *
 * Centraliza todas as chamadas Firebase do domínio de reagentes:
 * - Catálogo de reagentes (httpsCallable + fallback Firestore)
 * - Snapshot de Estoque Atual (UI-19 / M8)
 * - Busca do almoxarifado vinculado ao gestor
 *
 * Nunca chame httpsCallable ou Firestore diretamente em componentes — use este serviço.
 */

import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase/config";
import type { FrascoOperacional, ResumoReagente, EstoqueSnapshot } from "@/types/reagentes";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de payload / resposta
// ─────────────────────────────────────────────────────────────────────────────

export interface ObterEstoqueParams {
  idAlmoxarifado: string;
}

export interface LocalRetirada {
  id: string;
  predio: string;
  andar: string;
  sala: string;
}

export async function buscarLocaisParaRetirada(params: { predio?: string; andar?: string; sala?: string }): Promise<LocalRetirada[]> {
  const fn = httpsCallable<typeof params, { locais: LocalRetirada[] }>(functions, "buscarLocaisParaRetirada");
  const payload = Object.fromEntries(Object.entries(params).filter(([, valor]) => valor !== undefined && valor !== ""));
  const res = await fn(payload);
  return res.data.locais;
}

export async function gerarCatalogoReagentes(): Promise<void> {
  const fn = httpsCallable(functions, "gerarCatalogoReagentes");
  await fn({});
}

export interface EstoqueRateError {
  isRateLimit: true;
  message: string;
}

export type ObterEstoqueResult =
  | { ok: true; data: EstoqueSnapshot }
  | { ok: false; rateLimit: boolean; message: string };

export interface HistoricoOperacional {
  id: string;
  id_frasco_reagente?: string;
  id_emprestimo_reagente?: string;
  tipo: string;
  motivo?: string | null;
  timestamp?: { toMillis?: () => number; toDate?: () => Date } | Date | null;
  peso_anterior?: number | null;
  peso_novo?: number | null;
  medida_ajustada?: number | null;
}

export interface PainelOperacionalData {
  movimentacoes: HistoricoOperacional[];
  quarentena: FrascoOperacional[];
  alertas: AlertaOperacional[];
}

export interface AlertaOperacional {
  id: string;
  tipo: string;
  quantidade?: number;
  mensagem_customizada?: string;
  emitida_em?: HistoricoOperacional["timestamp"];
}

function registro(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function texto(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numeroOuNulo(value: unknown): number | null | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : value === null ? null : undefined;
}

function timestampOuNulo(value: unknown): HistoricoOperacional["timestamp"] {
  if (value instanceof Date) return value;
  const data = registro(value);
  return data && (typeof data.toDate === "function" || typeof data.toMillis === "function")
    ? value as HistoricoOperacional["timestamp"]
    : null;
}

function normalizarFrascoOperacional(id: string, value: unknown): FrascoOperacional | null {
  const data = registro(value);
  const codigo = texto(data?.codigo_frasco);
  const estado = data?.estado_fisico_frasco;
  if (!codigo || !["FECHADO", "ABERTO", "VAZIO", "QUEBRADO", "DESCARTADO"].includes(String(estado))) return null;
  if (typeof data?.em_quarentena !== "boolean" || typeof data?.vencido !== "boolean") return null;
  const disponibilidade = data.disponibilidade;
  return {
    id,
    codigo_frasco: codigo,
    estado_fisico_frasco: estado as FrascoOperacional["estado_fisico_frasco"],
    peso_atual: numeroOuNulo(data.peso_atual),
    peso_no_cadastrado: numeroOuNulo(data.peso_no_cadastrado),
    em_quarentena: data.em_quarentena,
    situacao_localizacao: texto(data.situacao_localizacao),
    disponibilidade: typeof disponibilidade === "string" ? disponibilidade : null,
    vencido: data.vencido,
  };
}

function normalizarAlertaOperacional(id: string, value: unknown): AlertaOperacional | null {
  const data = registro(value);
  const tipo = texto(data?.tipo);
  if (!tipo) return null;
  return {
    id,
    tipo,
    quantidade: typeof data?.quantidade === "number" ? data.quantidade : undefined,
    mensagem_customizada: texto(data?.mensagem_customizada) ?? undefined,
    emitida_em: timestampOuNulo(data?.emitida_em),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Implementação
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca o catálogo de reagentes.
 * Primeiro tenta a Cloud Function `obterCatalogoReagentes`;
 * em caso de falha, faz fallback para leitura direta da coleção Firestore.
 */
export async function obterCatalogoReagentes(): Promise<ResumoReagente[]> {
  // Tentativa via callable
  try {
    const fn = httpsCallable<
      Record<string, never>,
      { catalogo?: { resumos?: Record<string, ResumoReagente> } }
    >(functions, "obterCatalogoReagentes");
    const res = await fn({});
    if (res.data?.catalogo?.resumos) {
      const lista = Object.values(res.data.catalogo.resumos);
      return lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    }
  } catch {
    // Fallback intencional — a função pode estar indisponível em dev sem emulador completo
  }

  // Fallback: Firestore direto
  const q = query(collection(db, "Resumo_Reagente"), limit(200));
  const snap = await getDocs(q);
  const lista = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ResumoReagente[];
  return lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
}

/**
 * Obtém o snapshot de estoque atual do almoxarifado (UI-19 / M8).
 * Encapsula o tratamento de rate-limit (resource-exhausted).
 */
export async function obterEstoqueAtual(params: ObterEstoqueParams): Promise<ObterEstoqueResult> {
  try {
    const fn = httpsCallable<ObterEstoqueParams, Partial<EstoqueSnapshot>>(
      functions,
      "obterEstoqueAtual"
    );
    const res = await fn(params);
    const data = res.data;
    return {
      ok: true,
      data: {
        qtd_aptos: data.qtd_aptos ?? 0,
        qtd_total: data.qtd_total ?? 0,
        qtd_emprestados: data.qtd_emprestados ?? 0,
        qtd_saldo_desconhecido: data.qtd_saldo_desconhecido ?? 0,
        massa_aferida_g: data.massa_aferida_g ?? null,
        volume_aferido_ml: data.volume_aferido_ml ?? null,
        idadeMs: data.idadeMs,
        fonte: data.fonte,
        calculadoEm: new Date(),
      },
    };
  } catch (err: unknown) {
    const errObj = err as { code?: string; message?: string };
    const isRateLimit =
      errObj?.code === "resource-exhausted" ||
      Boolean(errObj?.message?.includes("Rate limit"));
    return {
      ok: false,
      rateLimit: isRateLimit,
      // UI-19: o limite protege a consulta do estoque contra abuso.
      message: isRateLimit
        ? "Você atingiu o limite de consultas por minuto. Aguarde um instante e tente novamente."
        : (errObj?.message ?? "Não foi possível calcular o estoque atual."),
    };
  }
}

/**
 * Busca o id do almoxarifado vinculado a um gestor via Firestore.
 */
export async function buscarAlmoxarifadoDoGestor(
  uidGestor: string
): Promise<string | undefined> {
  const q = query(
    collection(db, "Gestor_Almoxarifado_x_Almoxarifado"),
    where("id_gestor_almoxarifado", "==", uidGestor),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.docs[0]?.data().id_almoxarifado as string | undefined;
}

/**
 * Carrega as três visões operacionais do gestor no escopo do almoxarifado
 * vinculado. As coleções server-owned são somente leitura no cliente; as
 * mutações continuam exclusivamente nos callables normativos.
 */
export async function obterPainelOperacional(
  idAlmoxarifado: string,
  uidGestor: string,
): Promise<PainelOperacionalData> {
  const historicoQuery = query(
    collection(db, "Historico_Frasco_Reagente"),
    where("id_almoxarifado", "==", idAlmoxarifado),
    limit(100),
  );
  const frascosQuery = query(
    collection(db, "Frasco_Reagente"),
    where("id_almoxarifado", "==", idAlmoxarifado),
    limit(200),
  );
  const notificacoesQuery = query(
    collection(db, "Usuarios", uidGestor, "Notificacoes"),
    where("id_destinatario", "==", uidGestor),
    limit(200),
  );

  const [historico, frascos, notificacoes] = await Promise.all([
    getDocs(historicoQuery),
    getDocs(frascosQuery),
    getDocs(notificacoesQuery),
  ]);

  const timestampMillis = (value: HistoricoOperacional["timestamp"]): number => {
    if (value && typeof (value as { toMillis?: () => number }).toMillis === "function") {
      return (value as { toMillis: () => number }).toMillis();
    }
    if (value instanceof Date) return value.getTime();
    return 0;
  };

  const movimentacoes = historico.docs
    .map((doc) => {
      const data = registro(doc.data());
      const tipo = texto(data?.tipo);
      return tipo ? { id: doc.id, ...data, tipo } as HistoricoOperacional : null;
    })
    .filter((item): item is HistoricoOperacional => item !== null)
    .sort((a, b) => timestampMillis(b.timestamp) - timestampMillis(a.timestamp));

  const quarentena = frascos.docs
    .map((doc) => normalizarFrascoOperacional(doc.id, doc.data()))
    .filter((frasco): frasco is FrascoOperacional => frasco?.em_quarentena === true);

  const tiposOperacionais = new Set([
    "DATA_DEVOLUCAO_REAGENTE",
    "ENTREGA_ATRASADA",
    "ESCASSEZ_ESTOQUE",
    "FRASCOS_A_SEREM_PESADOS",
    "FRASCOS_EM_QUARENTENA",
    "FRASCOS_VENCIDOS",
    "FRASCOS_VAZIOS",
    "FRASCOS_QUEBRADOS",
    "AUTO_ATENDIMENTO_RETIRADA",
  ]);
  const alertas = notificacoes.docs
    .map((doc) => normalizarAlertaOperacional(doc.id, doc.data()))
    .filter((alerta): alerta is AlertaOperacional => alerta !== null)
    .filter((notificacao) => tiposOperacionais.has(notificacao.tipo))
    .sort((a, b) => timestampMillis(b.emitida_em) - timestampMillis(a.emitida_em));

  return { movimentacoes, quarentena, alertas };
}
