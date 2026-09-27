import * as crypto from "crypto";
import { encodeComponente, decodeComponente } from "../chaves";

export type ContextoConvite = "GLOBAL" | "TURMA";

/**
 * Normaliza e valida e-mail de convite.
 * Semântica M11 / CUE:
 * - trim() + toLowerCase()
 * - min: 1, max: 150 caracteres
 * - formato sintático de e-mail
 */
export function normalizarEmailConvite(email: string): string {
  if (typeof email !== "string") {
    throw new Error("E-mail deve ser uma string.");
  }
  const norm = email.trim().toLowerCase();
  if (norm.length === 0) {
    throw new Error("E-mail não pode ser vazio.");
  }
  if (norm.length > 150) {
    throw new Error("E-mail excede o limite máximo de 150 caracteres.");
  }
  // Validação sintática básica fail-closed
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(norm)) {
    throw new Error("Formato de e-mail inválido.");
  }
  return norm;
}

/**
 * Normaliza matrícula de convite/aluno.
 * - Textual;
 * - Preserva zeros iniciais;
 * - Máximo 20 caracteres;
 * - Retorna null se ausente/vazia.
 */
export function normalizarMatriculaConvite(matricula: unknown): string | null {
  if (matricula === undefined || matricula === null) return null;
  if (typeof matricula !== "string") {
    throw new Error("Matrícula deve ser uma string.");
  }
  const m = matricula.trim();
  if (m.length === 0) return null;
  if (m.length > 20) {
    throw new Error("Matrícula excede o limite máximo de 20 caracteres.");
  }
  return m;
}

/**
 * Serialização canônica inequívoca e injetiva do contexto e e-mail.
 *
 * Utiliza Length-Prefix Encoding com base64url via `encodeComponente`.
 * - GLOBAL: `GLOBAL__<len>:<b64u(email)>`
 * - TURMA:  `TURMA__<len>:<b64u(idTurma)>__<len>:<b64u(email)>`
 *
 * Prova construtiva de injetividade demonstrada por `deserializarPendenciaConvite`.
 */
export function serializarPendenciaConvite(
  contexto: ContextoConvite,
  idTurma: string | null | undefined,
  emailNormalizado: string
): string {
  const emailEnc = encodeComponente(emailNormalizado);
  if (contexto === "GLOBAL") {
    return `GLOBAL__${emailEnc}`;
  }
  if (contexto === "TURMA") {
    if (!idTurma || typeof idTurma !== "string" || idTurma.trim().length === 0) {
      throw new Error("idTurma é obrigatório para contexto TURMA.");
    }
    const turmaEnc = encodeComponente(idTurma.trim());
    return `TURMA__${turmaEnc}__${emailEnc}`;
  }
  throw new Error(`Contexto de convite desconhecido: "${contexto}"`);
}

/**
 * Inversa à esquerda de `serializarPendenciaConvite` para prova construtiva de injetividade.
 */
export function deserializarPendenciaConvite(serializado: string): {
  contexto: ContextoConvite;
  idTurma: string | null;
  emailNormalizado: string;
} {
  if (serializado.startsWith("GLOBAL__")) {
    const resto = serializado.slice("GLOBAL__".length);
    const d = decodeComponente(resto);
    if (d.resto.length > 0) {
      throw new Error(`Conteúdo residual inesperado na serialização: "${d.resto}"`);
    }
    return { contexto: "GLOBAL", idTurma: null, emailNormalizado: d.valor };
  }
  if (serializado.startsWith("TURMA__")) {
    let resto = serializado.slice("TURMA__".length);
    const d1 = decodeComponente(resto);
    if (!d1.resto.startsWith("__")) {
      throw new Error("Separador '__' esperado após idTurma");
    }
    resto = d1.resto.slice(2);
    const d2 = decodeComponente(resto);
    if (d2.resto.length > 0) {
      throw new Error(`Conteúdo residual inesperado na serialização: "${d2.resto}"`);
    }
    return { contexto: "TURMA", idTurma: d1.valor, emailNormalizado: d2.valor };
  }
  throw new Error(`Prefixo de serialização inválido: "${serializado}"`);
}

/**
 * Deriva a chave HMAC da pendência de convite a partir do segredo do servidor.
 * Se o segredo estiver ausente ou vazio, falha fechado imediatamente.
 */
export function derivarChavePendenciaConvite(
  secret: string,
  contexto: ContextoConvite,
  idTurma: string | null | undefined,
  emailNormalizado: string
): string {
  if (!secret || typeof secret !== "string" || secret.trim().length === 0) {
    throw new Error("Segredo do servidor ausente para derivação HMAC da pendência.");
  }
  const payload = serializarPendenciaConvite(contexto, idTurma, emailNormalizado);
  return crypto.createHmac("sha256", secret.trim()).update(payload).digest("hex");
}

/**
 * Gera um token de convite seguro usando 32 bytes CSPRNG.
 * Retorna o token em formato hexadecimal (64 caracteres) e seu respectivo SHA-256.
 * O token em claro NUNCA deve ser persistido em disco ou banco.
 */
export function gerarTokenConvite(): { token: string; tokenHash: string } {
  const tokenBytes = crypto.randomBytes(32);
  const token = tokenBytes.toString("hex");
  const tokenHash = hashTokenConvite(token);
  return { token, tokenHash };
}

/**
 * Calcula o hash SHA-256 de um token.
 */
export function hashTokenConvite(token: string): string {
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("Token para hash não pode ser vazio.");
  }
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Comparação em tempo constante entre um token informado pelo cliente e o hash persistido.
 * Evita timing attacks ao verificar o token no aceite.
 */
export function compararTokenConstantTime(tokenInformado: string, tokenHashPersistido: string): boolean {
  if (
    typeof tokenInformado !== "string" ||
    tokenInformado.length === 0 ||
    typeof tokenHashPersistido !== "string" ||
    tokenHashPersistido.length === 0
  ) {
    return false;
  }
  const hashCalculado = hashTokenConvite(tokenInformado);
  const bufCalculado = Buffer.from(hashCalculado, "hex");
  const bufPersistido = Buffer.from(tokenHashPersistido, "hex");

  if (bufCalculado.length !== 32 || bufPersistido.length !== 32) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(bufCalculado, bufPersistido);
  } catch {
    return false;
  }
}

/**
 * Verifica se um convite está expirado com base no instante atual.
 */
interface FirestoreTimestampLike {
  toMillis?: () => number;
  toDate?: () => Date;
}

export function isConviteExpirado(
  expiraEm: FirestoreTimestampLike | Date | string | number,
  agoraDate?: Date
): boolean {
  const agoraMs = agoraDate ? agoraDate.getTime() : Date.now();
  let expiraMs: number;

  if (typeof expiraEm === "object" && expiraEm !== null) {
    const ts = expiraEm as FirestoreTimestampLike;
    if (typeof ts.toMillis === "function") {
      expiraMs = ts.toMillis();
    } else if (typeof ts.toDate === "function") {
      expiraMs = ts.toDate().getTime();
    } else if (expiraEm instanceof Date) {
      expiraMs = expiraEm.getTime();
    } else {
      throw new Error("Formato de expira_em inválido.");
    }
  } else if (typeof expiraEm === "number") {
    expiraMs = expiraEm;
  } else if (typeof expiraEm === "string") {
    expiraMs = new Date(expiraEm).getTime();
  } else {
    throw new Error("Formato de expira_em inválido.");
  }

  if (isNaN(expiraMs)) {
    throw new Error("Data de expiração inválida.");
  }

  return agoraMs >= expiraMs;
}
