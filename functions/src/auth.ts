import { HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * Papéis lidos diretamente do JWT (Firebase Custom Claims).
 * Zero leituras extras no Firestore por chamada de API.
 * PREREQUISITO: toda mutação de papel deve chamar atualizarCustomClaims(uid).
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
 * Isso atualiza os custom claims e invalida o token atual.
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
  await admin.auth().setCustomUserClaims(uid, { roles });
}
