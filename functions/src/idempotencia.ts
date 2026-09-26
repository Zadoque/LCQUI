import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { createHash } from "crypto";
import * as admin from "firebase-admin";

/**
 * Fundação canônica M7 (Seção 7, "Idempotência" e Seção 5).
 *
 * Idempotência de comando NÃO substitui autorização (M9), unicidade
 * (`Chaves_Unicas`), dedup de evento (`Eventos_Processados`), locks nem
 * materializações. Ver a matriz de cinco conceitos distintos de M7.
 */

export const COLECAO_OPERACOES = "Operacoes";

/** Formato normativo: string opaca CSPRNG, 1..128, conjunto seguro [A-Za-z0-9_-]. */
export const ID_OPERACAO_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export const STATUS_OPERACAO = ["PENDENTE", "CONCLUIDA", "FALHOU"] as const;
export type StatusOperacao = (typeof STATUS_OPERACAO)[number];

/** Identidade semântica do comando: `(uid, tipo_operacao, payload_hash)`. */
export interface IdentidadeOperacao {
  uid: string;
  tipoOperacao: string;
  payloadHash: string;
}

/** Receipt persistido em `Operacoes/{idOperacao}`. */
export interface ReceiptOperacao extends IdentidadeOperacao {
  status: StatusOperacao;
  resultado?: unknown;
}

export type DecisaoOperacao =
  | { estado: "NOVA" }
  | { estado: "REPLAY"; resultado: unknown }
  | { estado: "PENDENTE"; resultado?: unknown }
  | { estado: "FALHOU"; resultado?: unknown };

export function validarIdOperacao(idOperacao: unknown): string {
  if (typeof idOperacao !== "string" || !ID_OPERACAO_PATTERN.test(idOperacao)) {
    throw new HttpsError("invalid-argument", "idOperacao inválido.");
  }
  return idOperacao;
}

/**
 * Canonicalização determinística normativa (Seção 7/M7).
 * - objetos: chaves sem `undefined`, ordenadas por code unit, recursivo;
 * - arrays: ordem preservada;
 * - null: valor explícito, distinto de campo ausente;
 * - `undefined` em objeto: equivalente a campo ausente;
 * - strings: sem trim/caixa; números: sem arredondamento nem coerção.
 * Falha fechada para tipos não suportados ou não planos.
 */
export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "boolean" || t === "string") return JSON.stringify(value);
  if (t === "number") {
    if (!Number.isFinite(value as number)) {
      throw new HttpsError("invalid-argument", "canonicalize: número não finito não suportado.");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  if (t === "object") {
    const proto = Object.getPrototypeOf(value as object);
    if (proto !== Object.prototype && proto !== null) {
      throw new HttpsError("invalid-argument", "canonicalize: objeto não plano não suportado.");
    }
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",") + "}";
  }
  throw new HttpsError("invalid-argument", `canonicalize: tipo não suportado (${t}).`);
}

/**
 * Impressão canônica global: `SHA-256(tipoOperacao + "\n" + canonicalize(payload))`.
 * `idOperacao` não entra no payload semântico e, portanto, não altera o hash.
 */
export function hashPayload(tipoOperacao: string, payload: unknown): string {
  return createHash("sha256").update(`${tipoOperacao}\n${canonicalize(payload)}`).digest("hex");
}

export function construirIdentidade(
  uid: string,
  tipoOperacao: string,
  payload: unknown
): IdentidadeOperacao {
  if (typeof uid !== "string" || uid.length === 0) {
    throw new HttpsError("invalid-argument", "uid é obrigatório.");
  }
  if (typeof tipoOperacao !== "string" || tipoOperacao.length === 0) {
    throw new HttpsError("invalid-argument", "tipo_operacao é obrigatório.");
  }
  return { uid, tipoOperacao, payloadHash: hashPayload(tipoOperacao, payload) };
}

function operacaoRef(idOperacao: string) {
  return admin.firestore().collection(COLECAO_OPERACOES).doc(validarIdOperacao(idOperacao));
}

const PAYLOAD_HASH_PATTERN = /^[0-9a-f]{64}$/;

/** Interpreta e valida um receipt; documento inconsistente falha fechado. */
function interpretarReceipt(data: unknown): ReceiptOperacao {
  if (!data || typeof data !== "object") {
    throw new HttpsError("failed-precondition", "Receipt de operação inconsistente.");
  }
  const doc = data as Record<string, unknown>;
  const { uid, tipo_operacao: tipo, payload_hash: hash, status } = doc;
  if (
    typeof uid !== "string" || uid.length === 0 ||
    typeof tipo !== "string" || tipo.length === 0 ||
    typeof hash !== "string" || !PAYLOAD_HASH_PATTERN.test(hash) ||
    !(STATUS_OPERACAO as readonly unknown[]).includes(status)
  ) {
    throw new HttpsError("failed-precondition", "Receipt de operação inconsistente.");
  }
  return {
    uid,
    tipoOperacao: tipo,
    payloadHash: hash,
    status: status as StatusOperacao,
    resultado: doc.resultado,
  };
}

export async function lerReceiptTx(
  tx: admin.firestore.Transaction,
  idOperacao: string
): Promise<ReceiptOperacao | null> {
  const snap = await tx.get(operacaoRef(idOperacao));
  if (!snap.exists) return null;
  return interpretarReceipt(snap.data());
}

/**
 * Decide o estado de uma operação na transação.
 * - ausente → NOVA;
 * - identidade `(uid, tipo_operacao, payload_hash)` incompatível → already-exists;
 * - compatível → REPLAY (CONCLUIDA), PENDENTE ou FALHOU.
 * Receipt inconsistente falha fechado.
 */
export async function resolverOperacaoTx(
  tx: admin.firestore.Transaction,
  idOperacao: string,
  identidade: IdentidadeOperacao
): Promise<DecisaoOperacao> {
  const receipt = await lerReceiptTx(tx, idOperacao);
  if (!receipt) return { estado: "NOVA" };
  const compativel =
    receipt.uid === identidade.uid &&
    receipt.tipoOperacao === identidade.tipoOperacao &&
    receipt.payloadHash === identidade.payloadHash;
  if (!compativel) {
    throw new HttpsError("already-exists", "idOperacao reutilizado com identidade incompatível.");
  }
  if (receipt.status === "CONCLUIDA") return { estado: "REPLAY", resultado: receipt.resultado };
  if (receipt.status === "PENDENTE") return { estado: "PENDENTE", resultado: receipt.resultado };
  return { estado: "FALHOU", resultado: receipt.resultado };
}

export function registrarOperacaoConcluidaTx(
  tx: admin.firestore.Transaction,
  idOperacao: string,
  identidade: IdentidadeOperacao,
  resultado: unknown
): void {
  tx.create(operacaoRef(idOperacao), {
    uid: identidade.uid,
    tipo_operacao: identidade.tipoOperacao,
    payload_hash: identidade.payloadHash,
    status: "CONCLUIDA",
    resultado: resultado ?? null,
    criado_em: FieldValue.serverTimestamp(),
    atualizado_em: FieldValue.serverTimestamp(),
  });
}

export function registrarOperacaoPendenteTx(
  tx: admin.firestore.Transaction,
  idOperacao: string,
  identidade: IdentidadeOperacao
): void {
  tx.create(operacaoRef(idOperacao), {
    uid: identidade.uid,
    tipo_operacao: identidade.tipoOperacao,
    payload_hash: identidade.payloadHash,
    status: "PENDENTE",
    resultado: null,
    criado_em: FieldValue.serverTimestamp(),
    atualizado_em: FieldValue.serverTimestamp(),
  });
}

/**
 * Processador idempotente de etapa externa: PENDENTE → CONCLUIDA.
 * Verifica a existência e o estado antes de transicionar.
 */
export async function concluirOperacaoPendenteTx(
  tx: admin.firestore.Transaction,
  idOperacao: string,
  resultado: unknown
): Promise<void> {
  const ref = operacaoRef(idOperacao);
  const snap = await tx.get(ref);
  if (!snap.exists) {
    throw new HttpsError("failed-precondition", "Operação pendente inexistente.");
  }
  const receipt = interpretarReceipt(snap.data());
  if (receipt.status !== "PENDENTE") {
    throw new HttpsError("failed-precondition", "Operação não está PENDENTE.");
  }
  tx.update(ref, {
    status: "CONCLUIDA",
    resultado: resultado ?? null,
    atualizado_em: FieldValue.serverTimestamp(),
  });
}

/** Processador idempotente de etapa externa: PENDENTE → FALHOU (terminal). */
export async function falharOperacaoPendenteTx(
  tx: admin.firestore.Transaction,
  idOperacao: string
): Promise<void> {
  const ref = operacaoRef(idOperacao);
  const snap = await tx.get(ref);
  if (!snap.exists) {
    throw new HttpsError("failed-precondition", "Operação pendente inexistente.");
  }
  const receipt = interpretarReceipt(snap.data());
  if (receipt.status !== "PENDENTE") {
    throw new HttpsError("failed-precondition", "Operação não está PENDENTE.");
  }
  tx.update(ref, {
    status: "FALHOU",
    atualizado_em: FieldValue.serverTimestamp(),
  });
}
