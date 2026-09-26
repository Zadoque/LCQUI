import { HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * Conjunto fechado de papéis normativos (M9 / Seção 7). Fonte única no backend.
 */
export const PAPEIS_CONHECIDOS = [
  "Chefe_Geral",
  "Gestor_Almoxarifado",
  "Gestor_Bens_Patrimoniais",
  "Professor",
  "Aluno",
  "Bolsista",
] as const;

export type PapelConhecido = (typeof PAPEIS_CONHECIDOS)[number];

export function ehPapelConhecido(valor: unknown): valor is PapelConhecido {
  return typeof valor === "string" && (PAPEIS_CONHECIDOS as readonly string[]).includes(valor);
}

/** Claims de autoridade já validadas estruturalmente. */
export interface ClaimsAutoridade {
  uid: string;
  papeis: PapelConhecido[];
  versaoPermissoes: number;
}

/** Resultado de uma decisão M9 de autoridade base (sem escopo/ownership de domínio). */
export interface AutoridadePersistida {
  uid: string;
  papeis: PapelConhecido[];
  versaoPermissoes: number;
  papelAutorizado: PapelConhecido;
}

/**
 * Extrai e valida ESTRUTURALMENTE as claims de autoridade (auth + roles + versão).
 * Não consulta o Firestore: papéis persistidos e versão corrente são decididos
 * por `resolverAutoridadePersistidaTx`.
 */
export function extrairClaimsAutoridade(request: CallableRequest): ClaimsAutoridade {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }
  const token = request.auth.token as Record<string, unknown>;
  const bruto = token["roles"];
  if (!Array.isArray(bruto)) {
    throw new HttpsError("permission-denied", "Claims de papel ausentes ou inválidas.");
  }
  const papeis: PapelConhecido[] = [];
  for (const item of bruto) {
    if (!ehPapelConhecido(item)) {
      throw new HttpsError("permission-denied", "Papel desconhecido na claim.");
    }
    if (!papeis.includes(item)) papeis.push(item);
  }
  const versao = token["versao_permissoes"];
  if (typeof versao !== "number" || !Number.isInteger(versao) || versao < 0) {
    throw new HttpsError("permission-denied", "Versão de permissões ausente ou inválida na claim.");
  }
  return { uid: request.auth.uid, papeis, versaoPermissoes: versao };
}

/**
 * Núcleo M9: resolve a autoridade PERSISTIDA de forma transacional.
 * Lê, na mesma transação do efeito, Usuário ativo, versão corrente e os
 * documentos de papel do UID. A claim só participa quando a versão coincide e
 * os papéis por ela afirmados têm concessão persistida. Falha fechada.
 */
export async function resolverAutoridadePersistidaTx(
  tx: admin.firestore.Transaction,
  claims: ClaimsAutoridade,
  papeisRequeridos: readonly PapelConhecido[]
): Promise<AutoridadePersistida> {
  const db = admin.firestore();
  const usuarioRef = db.collection("Usuarios").doc(claims.uid);
  const refsPorPapel = claims.papeis.map((papel) => db.collection(papel).doc(claims.uid));
  const snaps = await tx.getAll(usuarioRef, ...refsPorPapel);
  const usuarioSnap = snaps[0];

  if (!usuarioSnap.exists) {
    throw new HttpsError("permission-denied", "Usuário não habilitado.");
  }
  const dados = usuarioSnap.data()!;
  if (dados.ativo !== true) {
    throw new HttpsError("permission-denied", "Conta desativada ou não habilitada.");
  }
  const versaoPersistida = dados.versao_permissoes;
  if (typeof versaoPersistida !== "number" || !Number.isInteger(versaoPersistida) || versaoPersistida < 0) {
    throw new HttpsError("permission-denied", "Versão de permissões persistida inválida.");
  }
  if (versaoPersistida !== claims.versaoPermissoes) {
    throw new HttpsError("permission-denied", "Permissões desatualizadas. Faça login novamente.");
  }

  const papeisPersistidos: PapelConhecido[] = [];
  claims.papeis.forEach((papel, indice) => {
    const snap = snaps[indice + 1];
    if (!snap.exists) {
      throw new HttpsError("permission-denied", "Claim de papel sem concessão persistida.");
    }
    if (snap.data()?.id_usuario !== claims.uid) {
      throw new HttpsError("permission-denied", "Documento de papel com UID incompatível.");
    }
    papeisPersistidos.push(papel);
  });

  const papelAutorizado = papeisRequeridos.find((papel) => papeisPersistidos.includes(papel));
  if (!papelAutorizado) {
    throw new HttpsError("permission-denied", "Usuário sem papel autorizado para esta ação.");
  }

  return {
    uid: claims.uid,
    papeis: papeisPersistidos,
    versaoPermissoes: versaoPersistida,
    papelAutorizado,
  };
}

/**
 * Conveniência não-transacional: reexecuta a decisão em uma transação de leitura
 * para obter um snapshot consistente. Para mutações críticas prefira
 * `resolverAutoridadePersistidaTx` dentro da transação do efeito (fecha TOCTOU).
 */
export async function validarAutoridadePersistida(
  request: CallableRequest,
  papeisRequeridos: readonly PapelConhecido[]
): Promise<AutoridadePersistida> {
  const claims = extrairClaimsAutoridade(request);
  return admin.firestore().runTransaction((tx) => resolverAutoridadePersistidaTx(tx, claims, papeisRequeridos));
}

/**
 * Igual a `validarAutoridadePersistida`, mas reutiliza claims já extraídas.
 * Útil como pré-checagem antes de efeitos externos (Auth) quando o chamador
 * também revalidará de forma transacional no commit.
 */
export async function validarAutoridadePersistidaComClaims(
  claims: ClaimsAutoridade,
  papeisRequeridos: readonly PapelConhecido[]
): Promise<AutoridadePersistida> {
  return admin.firestore().runTransaction((tx) => resolverAutoridadePersistidaTx(tx, claims, papeisRequeridos));
}

/**
 * Papéis lidos diretamente do JWT (Firebase Custom Claims).
 * Zero leituras extras no Firestore por chamada de API.
 * PREREQUISITO: toda mutação de papel deve chamar atualizarCustomClaims(uid).
 *
 * LEGACY AUTH PATH: NÃO é suficiente para mutações críticas M9. Use
 * `validarAutoridadePersistida`/`resolverAutoridadePersistidaTx`.
 */
export function resolverPapeisDoToken(auth: { token: Record<string, unknown> } | undefined): string[] {
  if (!auth) return [];
  const roles = auth.token["roles"];
  if (!Array.isArray(roles)) return [];
  return roles as string[];
}

/**
 * Valida a permissão do usuário verificando os Custom Claims no JWT.
 * Lança um HttpsError se o usuário não estiver autenticado ou não tiver nenhum dos papéis permitidos.
 */
export function validarPermissao(request: CallableRequest, papeisPermitidos: string[]): string[] {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }
  const papeis = resolverPapeisDoToken(request.auth);
  if (!papeisPermitidos.some((p) => papeis.includes(p))) {
    throw new HttpsError("permission-denied", "Usuário sem papel autorizado para esta ação.");
  }
  return papeis;
}

/**
 * Verifica se um usuário com o papel Gestor_Almoxarifado realmente
 * tem acesso de gestor ao almoxarifado especificado.
 * Um Chefe_Geral tem escopo global e passa nesta verificação automaticamente.
 */
export async function validarGestorDoAlmoxarifado(
  uid: string,
  token: Record<string, unknown>,
  idAlmoxarifado: string
): Promise<void> {
  const papeis = resolverPapeisDoToken({ token });
  if (papeis.includes("Chefe_Geral")) return; // Chefe tem escopo global

  if (!papeis.includes("Gestor_Almoxarifado")) {
    throw new HttpsError("permission-denied", "Usuário não é Gestor de Almoxarifado.");
  }

  // 1 leitura: o vínculo de escopo (não o papel - esse já veio do token)
  const vinculo = await admin.firestore().collection("Gestor_Almoxarifado_x_Almoxarifado")
    .where("id_gestor_almoxarifado", "==", uid)
    .where("id_almoxarifado", "==", idAlmoxarifado)
    .limit(1)
    .get();

  if (vinculo.empty) {
    throw new HttpsError("permission-denied", "Gestor não está designado para este almoxarifado.");
  }
}

/**
 * Chamada após TODA concessão ou remoção de papel.
 * Isso atualiza os custom claims para o próximo token; não invalida o token atual.
 * O cliente precisará renovar o token chamando `user.getIdToken(true)`.
 */
export async function atualizarCustomClaims(uid: string): Promise<void> {
  const colecoes = [
    "Chefe_Geral",
    "Gestor_Almoxarifado",
    "Gestor_Bens_Patrimoniais",
    "Professor",
    "Aluno",
    "Bolsista"
  ];

  const leituras = await Promise.all(
    colecoes.map((c) => admin.firestore().collection(c).doc(uid).get())
  );

  const roles = colecoes.filter((_, i) => leituras[i].exists);

  validarMatrizPapeis(roles);

  await admin.auth().setCustomUserClaims(uid, { roles });
}

/**
 * Valida a compatibilidade de múltiplos papéis (Multi-Role) para um usuário.
 * Lança um HttpsError (failed-precondition) se a combinação de papéis for inválida.
 */
export function validarMatrizPapeis(roles: string[]): void {
  if (roles.includes("Chefe_Geral") && roles.length > 1) {
    throw new HttpsError("failed-precondition", "Chefe Geral não pode possuir nenhum outro papel.");
  }
  if (roles.includes("Aluno") && roles.includes("Professor")) {
    throw new HttpsError("failed-precondition", "O usuário que é aluno não pode ser professor.");
  }
  if (roles.includes("Bolsista") && !roles.includes("Aluno")) {
    throw new HttpsError("failed-precondition", "Bolsista exige papel Aluno.");
  }
  if (roles.includes("Bolsista") && roles.includes("Gestor_Almoxarifado")) {
    throw new HttpsError("failed-precondition", "O usuário Bolsista não pode ser Gestor de Almoxarifado.");
  }
}
