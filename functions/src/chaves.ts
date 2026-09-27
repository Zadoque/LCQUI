/**
 * Derivação única das chaves de unicidade (`Chaves_Unicas`). O runtime e o
 * backfill usam EXATAMENTE estas funções, para não haver dois algoritmos.
 *
 * Formato normativo (Seção 5): `Chave determinística derivada do valor
 * normalizado e domínio`, com campos `{ tipo, id_recurso, criado_em }`.
 */

export const TIPO_CHAVE_MATERIA = "Materia";
export const TIPO_CHAVE_LOCAL = "Local";
export const TIPO_CHAVE_TURMA = "Turma";

/** N(s) = s.trim().toUpperCase(): canonicalização única do código de matéria. */
export function normalizarCodigoMateria(codigo: string): string {
  return codigo.trim().toUpperCase();
}

export function chaveMateria(codigoNormalizado: string): string {
  return `${TIPO_CHAVE_MATERIA}__${codigoNormalizado}`;
}

export function chaveLocal(predio: string, andar: string, sala: string): string {
  return `${TIPO_CHAVE_LOCAL}__${predio.trim()}__${andar.trim()}__${sala.trim()}`;
}

/** Seção 5: `Chaves_Unicas/Turma__{codigo}`. */
export function chaveTurmaCodigo(codigo: string): string {
  return `${TIPO_CHAVE_TURMA}__${codigo.trim()}`;
}
