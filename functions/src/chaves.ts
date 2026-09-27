/**
 * Derivação única das chaves de unicidade (`Chaves_Unicas`). O runtime e o
 * backfill usam EXATAMENTE estas funções, para não haver dois algoritmos.
 *
 * Formato normativo (Seção 5): `Chave determinística derivada do valor
 * normalizado e domínio`, com campos `{ tipo, id_recurso, criado_em }`.
 *
 * ENCODING INJETIVO (obrigatório):
 * O separador `__` não pode ser usado diretamente quando os componentes são
 * texto livre, pois `chaveLocal("A__B", "C", "D")` e `chaveLocal("A", "B__C", "D")`
 * produziriam a mesma string — colisão silenciosa.
 *
 * Solução: cada componente é codificado em base64url sem padding antes de
 * ser concatenado com `__`. Base64url usa apenas `[A-Za-z0-9_-]`, portanto
 * nunca produz `__`, eliminando a ambiguidade de forma simples e auditável.
 *
 * Para `Turma`, o código é sempre `[A-Z0-9]{6}` gerado pelo servidor — já
 * injetivo sem encoding adicional — mas aplicamos base64url por consistência.
 */

export const TIPO_CHAVE_MATERIA = "Materia";
export const TIPO_CHAVE_LOCAL = "Local";
export const TIPO_CHAVE_TURMA = "Turma";

/** Codifica um componente em base64url sem padding. */
function b64u(s: string): string {
  return Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/** N(s) = s.trim().toUpperCase(): canonicalização única do código de matéria. */
export function normalizarCodigoMateria(codigo: string): string {
  return codigo.trim().toUpperCase();
}

/**
 * Chave injetiva de matéria: `Materia__<b64u(codigoNormalizado)>`.
 * Garante unicidade mesmo para códigos que contenham `__` ou caracteres
 * especiais permitidos pela norma.
 */
export function chaveMateria(codigoNormalizado: string): string {
  return `${TIPO_CHAVE_MATERIA}__${b64u(codigoNormalizado)}`;
}

/**
 * Chave injetiva de local: `Local__<b64u(predio)>__<b64u(andar)>__<b64u(sala)>`.
 * Garante injetividade para campos de texto livre (predio, andar, sala podem
 * conter `__`, `/`, espaços etc).
 */
export function chaveLocal(predio: string, andar: string, sala: string): string {
  return `${TIPO_CHAVE_LOCAL}__${b64u(predio.trim())}__${b64u(andar.trim())}__${b64u(sala.trim())}`;
}

/**
 * Chave injetiva de turma: `Turma__<b64u(codigo)>`.
 * O código gerado é `[A-Z0-9]{6}`, mas o encoding é aplicado por consistência
 * com as demais funções.
 */
export function chaveTurmaCodigo(codigo: string): string {
  return `${TIPO_CHAVE_TURMA}__${b64u(codigo.trim())}`;
}
