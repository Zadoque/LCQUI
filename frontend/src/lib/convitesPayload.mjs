/**
 * @typedef {{
 *   idOperacao: string,
 *   email: string,
 *   idTurma: string | null,
 *   excederCapacidade: boolean,
 *   matricula?: string,
 *   justificativaExcecao?: string,
 * }} PayloadConvidarAluno
 */

/**
 * @param {{
 *   idOperacao: string,
 *   email: string,
 *   idTurma: string,
 *   matricula: string,
 *   excederCapacidade: boolean,
 *   justificativaExcecao: string,
 * }} entrada
 * @returns {PayloadConvidarAluno}
 */
export function construirPayloadConvidarAluno(entrada) {
  const matricula = entrada.matricula.trim();
  const justificativaExcecao = entrada.justificativaExcecao.trim();
  /** @type {PayloadConvidarAluno} */
  const payload = {
    idOperacao: entrada.idOperacao,
    email: entrada.email,
    idTurma: entrada.idTurma || null,
    excederCapacidade: entrada.excederCapacidade,
  };

  if (matricula) payload.matricula = matricula;
  if (entrada.excederCapacidade && justificativaExcecao) {
    payload.justificativaExcecao = justificativaExcecao;
  }

  return payload;
}

/**
 * @typedef {{
 *   idOperacao: string,
 *   idConvite: string,
 *   tokenConvite?: string,
 *   viaNotificacao?: true,
 *   nomeInformado?: string,
 *   matriculaInformada?: string,
 * }} PayloadAceitarConvite
 */

/**
 * @param {{
 *   idOperacao: string,
 *   idConvite: string,
 *   tokenConvite: string,
 *   nomeInformado: string,
 *   matriculaInformada: string,
 * }} entrada
 * @returns {PayloadAceitarConvite}
 */
export function construirPayloadAceitarConvite(entrada) {
  const tokenConvite = entrada.tokenConvite.trim();
  const nomeInformado = entrada.nomeInformado.trim();
  const matriculaInformada = entrada.matriculaInformada.trim();
  /** @type {PayloadAceitarConvite} */
  const payload = {
    idOperacao: entrada.idOperacao,
    idConvite: entrada.idConvite,
  };

  if (tokenConvite) payload.tokenConvite = tokenConvite;
  else payload.viaNotificacao = true;
  if (nomeInformado) payload.nomeInformado = nomeInformado;
  if (matriculaInformada) payload.matriculaInformada = matriculaInformada;

  return payload;
}

/**
 * @param {string} idConvite
 * @param {string} tokenConvite
 * @returns {{ idConvite: string, tokenConvite?: string }}
 */
export function construirPayloadAcessoConvite(idConvite, tokenConvite) {
  const token = tokenConvite.trim();
  return token ? { idConvite, tokenConvite: token } : { idConvite };
}

/**
 * @param {string} idOperacao
 * @param {string} idConvite
 * @param {string} tokenConvite
 * @returns {{ idOperacao: string, idConvite: string, tokenConvite?: string }}
 */
export function construirPayloadRejeitarConvite(idOperacao, idConvite, tokenConvite) {
  return {
    idOperacao,
    ...construirPayloadAcessoConvite(idConvite, tokenConvite),
  };
}
