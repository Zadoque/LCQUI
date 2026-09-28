const PAPEIS_CONHECIDOS = new Set([
  "Chefe_Geral",
  "Gestor_Almoxarifado",
  "Gestor_Bens_Patrimoniais",
  "Professor",
  "Aluno",
  "Bolsista",
]);

/**
 * Claims são projeção de transporte. Valores desconhecidos não entram no
 * estado de navegação do cliente; a autoridade permanece no backend/Rules.
 *
 * @param {unknown} valor
 * @returns {string[]}
 */
export function extrairPapeisClaims(valor) {
  if (!Array.isArray(valor)) return [];
  return [...new Set(valor.filter((papel) => typeof papel === "string" && PAPEIS_CONHECIDOS.has(papel)))];
}

/**
 * Uma sessão Firebase Auth sem papéis continua sendo uma sessão válida para o
 * bootstrap de convite. `ativo` aqui controla apenas navegação; a autorização
 * definitiva continua fail-closed no backend/Rules.
 *
 * @param {unknown} rolesClaim
 * @returns {{ roles: string[], ativo: boolean }}
 */
export function construirEstadoAutenticacao(rolesClaim) {
  const roles = extrairPapeisClaims(rolesClaim);
  return { roles, ativo: roles.length > 0 };
}

/**
 * Força um novo ID token depois de uma mutação que conceda ou revogue papéis.
 * O Firebase não substitui imediatamente o token já mantido pelo cliente quando
 * o Admin SDK altera custom claims no servidor.
 *
 * @param {{ getIdTokenResult: (forceRefresh?: boolean) => Promise<{ claims: Record<string, unknown> }> }} user
 * @returns {Promise<{ roles: string[], ativo: boolean }>}
 */
export async function renovarEstadoAutenticacao(user) {
  const tokenResult = await user.getIdTokenResult(true);
  return construirEstadoAutenticacao(tokenResult.claims.roles);
}

/**
 * Aceita somente caminhos locais absolutos para impedir open redirect.
 *
 * @param {string} search
 * @returns {string}
 */
export function destinoSeguroAposLogin(search) {
  const destino = new URLSearchParams(search).get("redirect");
  return destino && destino.startsWith("/") && !destino.startsWith("//")
    ? destino
    : "/";
}
