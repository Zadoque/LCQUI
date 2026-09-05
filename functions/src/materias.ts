import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * Função para criar uma Matéria garantindo que o código da matéria seja único.
 * Papéis permitidos: Chefe_Geral ou Professor
 */
export const criarMateria = onCall(async (request) => {
  const authRoles = request.auth?.token.roles || [];
  if (!authRoles.includes("Chefe_Geral") && !authRoles.includes("Professor")) {
    throw new HttpsError(
      "permission-denied",
      "Apenas o Chefe Geral ou Professor podem criar matérias."
    );
  }

  const { nome, codigoMateria } = request.data as {
    nome: string;
    codigoMateria: string;
  };

  if (!nome || !codigoMateria) {
    throw new HttpsError(
      "invalid-argument",
      "Nome e código da matéria são obrigatórios."
    );
  }

  const db = admin.firestore();

  // Transação para garantir unicidade do código
  return db.runTransaction(async (tx) => {
    const materiasQuery = await tx.get(
      db.collection("Materia").where("codigo_materia", "==", codigoMateria).limit(1)
    );

    if (!materiasQuery.empty) {
      throw new HttpsError(
        "already-exists",
        "Já existe uma matéria com este código."
      );
    }

    const docRef = db.collection("Materia").doc();
    tx.set(docRef, {
      nome,
      codigo_materia: codigoMateria,
      criado_em: admin.firestore.FieldValue.serverTimestamp(),
      criado_por: request.auth?.uid
    });

    return { id: docRef.id, nome, codigoMateria };
  });
});
