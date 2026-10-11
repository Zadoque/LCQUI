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
import type { ResumoReagente, EstoqueSnapshot } from "@/types/reagentes";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de payload / resposta
// ─────────────────────────────────────────────────────────────────────────────

export interface ObterEstoqueParams {
  idAlmoxarifado: string;
}

export interface EstoqueRateError {
  isRateLimit: true;
  message: string;
}

export type ObterEstoqueResult =
  | { ok: true; data: EstoqueSnapshot }
  | { ok: false; rateLimit: boolean; message: string };

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
      message: isRateLimit
        ? "Limite de 5 consultas/minuto por usuário atingido (UI-19). Aguarde um instante."
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
