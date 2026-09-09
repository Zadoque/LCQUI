import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

/**
 * RN-ROLE-03: Chefe Geral não pode ser o único.
 */
export async function validarRevogacaoChefeGeral(uid: string): Promise<void> {
  const db = admin.firestore();
  const chefesRef = db.collection("Chefe_Geral");
  const chefesSnapshot = await chefesRef.get();
  
  if (chefesSnapshot.size <= 1) {
    const unicoChefe = chefesSnapshot.docs[0];
    if (unicoChefe && unicoChefe.id === uid) {
      throw new HttpsError("failed-precondition", "Ação negada: Você é o único Chefe Geral ativo no sistema.");
    }
  }
}

/**
 * RN-ROLE-05: Almoxarifado deve possuir pelo menos um gestor.
 */
export async function validarRevogacaoGestorAlmoxarifado(uid: string): Promise<void> {
  const db = admin.firestore();
  const relacoesRef = db.collection("Gestor_Almoxarifado_x_Almoxarifado");
  const vinculosSnapshot = await relacoesRef.where("id_gestor_almoxarifado", "==", uid).get();
  
  for (const doc of vinculosSnapshot.docs) {
    const idAlmoxarifado = doc.data().id_almoxarifado;
    
    // Conta quantos gestores existem para esse almoxarifado
    const gestoresDoAlmoxarifado = await relacoesRef.where("id_almoxarifado", "==", idAlmoxarifado).get();
    
    if (gestoresDoAlmoxarifado.size <= 1) {
      throw new HttpsError("failed-precondition", `Ação negada: O usuário é o único gestor do almoxarifado ${idAlmoxarifado}.`);
    }
  }
}

/**
 * RN-ROLE-09: Gestor de Bens Patrimoniais não pode ser o único.
 */
export async function validarRevogacaoGestorPatrimonial(uid: string): Promise<void> {
  const db = admin.firestore();
  const gestoresRef = db.collection("Gestor_Bens_Patrimoniais");
  const gestoresSnapshot = await gestoresRef.get();
  
  if (gestoresSnapshot.size <= 1) {
    const unicoGestor = gestoresSnapshot.docs[0];
    if (unicoGestor && unicoGestor.id === uid) {
      throw new HttpsError("failed-precondition", "Ação negada: O usuário é o único Gestor de Bens Patrimoniais ativo no sistema.");
    }
  }
}
