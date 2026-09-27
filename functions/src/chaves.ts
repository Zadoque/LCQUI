/**
 * Derivação única das chaves de unicidade (`Chaves_Unicas`). O runtime e o
 * backfill usam EXATAMENTE estas funções, para não haver dois algoritmos.
 *
 * Formato normativo (Seção 5): `Chave determinística derivada do valor
 * normalizado e domínio`, com campos `{ tipo, id_recurso, criado_em }`.
 *
 * ENCODING INJETIVO COM PREFIXO DE COMPRIMENTO (Length-Prefix Encoding):
 * Quando componentes de texto livre são combinados, qualquer delimitador simples
 * pode sofrer colisões se o delimitador ocorrer dentro do próprio dado (ex:
 * `("A__B", "C")` vs `("A", "B__C")`).
 * Além disso, o alfabeto do base64url (`[A-Za-z0-9_-]`) contém o caractere `_`,
 * logo `__` não está estritamente fora do alfabeto do encoding.
 *
 * Solução arquitetural (Opção B — inequivocamente injetiva e Firestore-safe):
 * Cada componente de texto livre é codificado em base64url (eliminando `/` e
 * caracteres proibidos em document IDs do Firestore) e prefixado com seu tamanho
 * em caracteres decimais e dois-pontos: `<len>:<b64u>`.
 * Como `:` não pertence ao alfabeto do base64url e o tamanho é declarado antes
 * do payload, a fronteira de cada componente é absolutamente determinística e
 * decodificável sem ambiguidade.
 *
 * Prova construtiva de injetividade:
 * As funções `decodificarChaveLocal` e `decodificarChaveMateria` são inversas
 * à esquerda das funções de derivação:
 * decode(encode(x)) == x para qualquer tupla de entrada.
 * Pelo teorema fundamental de funções com inversa à esquerda:
 * f(x) = f(y) => decode(f(x)) = decode(f(y)) => x = y (estritamente injetiva).
 *
 * Para `Turma`, o código é gerado no servidor como `[A-Z0-9]{6}` (alfabeto restrito
 * alfanumérico sem símbolos), sendo injetivo e compatível com `Chaves_Unicas/Turma__{codigo}`.
 */

export const TIPO_CHAVE_MATERIA = "Materia";
export const TIPO_CHAVE_LOCAL = "Local";
export const TIPO_CHAVE_TURMA = "Turma";
export const TIPO_CHAVE_ALUNO = "Aluno";
export const TIPO_CHAVE_CONVITE_PENDENTE = "ConvitePendente";

/**
 * Codifica um componente individual em base64url com prefixo de comprimento.
 * Formato: `<len>:<payload>` onde `<len>` é o tamanho de `<payload>` em caracteres decimais.
 */
export function encodeComponente(s: string): string {
  const b64 = Buffer.from(s, "utf8").toString("base64url");
  return `${b64.length}:${b64}`;
}

/**
 * Decodifica um componente codificado por `encodeComponente`.
 * Retorna o valor decodificado e o restante não consumido da string.
 */
export function decodeComponente(encoded: string): { valor: string; resto: string } {
  const colonIdx = encoded.indexOf(":");
  if (colonIdx === -1) {
    throw new Error(`Componente codificado inválido: ausência de ':' em "${encoded}"`);
  }
  const lenStr = encoded.slice(0, colonIdx);
  const len = parseInt(lenStr, 10);
  if (isNaN(len) || len < 0) {
    throw new Error(`Comprimento inválido em componente codificado: "${lenStr}"`);
  }
  const start = colonIdx + 1;
  const b64 = encoded.slice(start, start + len);
  if (b64.length !== len) {
    throw new Error(`Truncamento em componente: esperado ${len} chars, obtido ${b64.length}`);
  }
  const valor = Buffer.from(b64, "base64url").toString("utf8");
  const resto = encoded.slice(start + len);
  return { valor, resto };
}

/** N(s) = s.trim().toUpperCase(): canonicalização única do código de matéria. */
export function normalizarCodigoMateria(codigo: string): string {
  return codigo.trim().toUpperCase();
}

/**
 * Chave injetiva de matéria: `Materia__<len>:<b64u(codigoNormalizado)>`.
 * Garante unicidade mesmo para códigos com `/`, `__`, espaços ou Unicode.
 */
export function chaveMateria(codigoNormalizado: string): string {
  return `${TIPO_CHAVE_MATERIA}__${encodeComponente(codigoNormalizado)}`;
}

/** Inversa para prova construtiva de injetividade de matéria. */
export function decodificarChaveMateria(chave: string): string {
  const prefix = `${TIPO_CHAVE_MATERIA}__`;
  if (!chave.startsWith(prefix)) {
    throw new Error(`Chave de matéria inválida: não começa com "${prefix}"`);
  }
  const d = decodeComponente(chave.slice(prefix.length));
  if (d.resto.length > 0) {
    throw new Error(`Conteúdo residual inesperado na chave: "${d.resto}"`);
  }
  return d.valor;
}

/**
 * Chave injetiva de local: `Local__<len>:<b64(predio)>__<len>:<b64(andar)>__<len>:<b64(sala)>`.
 * Garante injetividade absoluta para os três campos livres (predio, andar, sala).
 */
export function chaveLocal(predio: string, andar: string, sala: string): string {
  const p = encodeComponente(predio.trim());
  const a = encodeComponente(andar.trim());
  const s = encodeComponente(sala.trim());
  return `${TIPO_CHAVE_LOCAL}__${p}__${a}__${s}`;
}

/** Inversa para prova construtiva de injetividade de local. */
export function decodificarChaveLocal(chave: string): [string, string, string] {
  const prefix = `${TIPO_CHAVE_LOCAL}__`;
  if (!chave.startsWith(prefix)) {
    throw new Error(`Chave de local inválida: não começa com "${prefix}"`);
  }
  let resto = chave.slice(prefix.length);
  const d1 = decodeComponente(resto);
  if (!d1.resto.startsWith("__")) {
    throw new Error("Separador '__' esperado após o primeiro componente");
  }
  resto = d1.resto.slice(2);
  const d2 = decodeComponente(resto);
  if (!d2.resto.startsWith("__")) {
    throw new Error("Separador '__' esperado após o segundo componente");
  }
  resto = d2.resto.slice(2);
  const d3 = decodeComponente(resto);
  if (d3.resto.length > 0) {
    throw new Error(`Conteúdo residual inesperado na chave: "${d3.resto}"`);
  }
  return [d1.valor, d2.valor, d3.valor];
}

/**
 * Seção 5: `Chaves_Unicas/Turma__{codigo}`.
 * O código gerado no servidor é `[A-Z0-9]{6}` (alfanumérico estrito sem símbolos),
 * sendo intrinsecamente injetivo e Firestore-safe.
 */
export function chaveTurmaCodigo(codigo: string): string {
  return `${TIPO_CHAVE_TURMA}__${codigo.trim()}`;
}

/**
 * Seção 5: `Chaves_Unicas/Aluno__<len>:<b64(matricula)>`.
 * Matrícula de Aluno: única em Aluno, textual, preserva zeros iniciais, até 20 chars.
 * Injetiva via encodeComponente.
 */
export function chaveAlunoMatricula(matricula: string): string {
  return `${TIPO_CHAVE_ALUNO}__${encodeComponente(matricula.trim())}`;
}

/** Inversa para prova construtiva de injetividade de matrícula. */
export function decodificarChaveAlunoMatricula(chave: string): string {
  const prefix = `${TIPO_CHAVE_ALUNO}__`;
  if (!chave.startsWith(prefix)) {
    throw new Error(`Chave de aluno inválida: não começa com "${prefix}"`);
  }
  const d = decodeComponente(chave.slice(prefix.length));
  if (d.resto.length > 0) {
    throw new Error(`Conteúdo residual inesperado na chave: "${d.resto}"`);
  }
  return d.valor;
}

/**
 * Seção 5 / M11: `Chaves_Unicas/ConvitePendente__<chaveHmac>`.
 * A chave HMAC é opaca, hexadecimal (SHA-256) de 64 chars [0-9a-f]{64}.
 */
export function chaveConvitePendente(chaveHmac: string): string {
  return `${TIPO_CHAVE_CONVITE_PENDENTE}__${chaveHmac.trim()}`;
}
