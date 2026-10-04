export const CHAVE_PAPEL_ATIVO = "lcqui.papelAtivo";

/**
 * Resolve o papel ativo efetivo: preferido se ainda autorizado; senão o primeiro; senão null.
 */
export function resolverPapelAtivo(roles, preferido) {
  if (!Array.isArray(roles) || roles.length === 0) return null;
  if (typeof preferido === "string" && roles.includes(preferido)) return preferido;
  return roles[0];
}
