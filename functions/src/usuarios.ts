import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { validarPermissao, atualizarCustomClaims } from "./auth";
import { validatePayload } from "./utils/validation";
import { ConvidarUsuarioSchema } from "./schemas/usuarios.schema";

export const convidarUsuario = onCall(async (request) => {
  validarPermissao(request, ["Chefe_Geral"]);

  const { email, nome, papel, centro, laboratorio, materias } = validatePayload(ConvidarUsuarioSchema, request.data);

  const db = admin.firestore();
  
  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      userRecord = await admin.auth().createUser({
        email,
        displayName: nome,
      });
    } else {
      throw new HttpsError("internal", "Erro ao verificar usuário na autenticação.");
    }
  }

  const uid = userRecord.uid;

  // Add user to the corresponding collection
  const dataToSave: any = {
    nome,
    email,
    ativo: true,
    createdAt: FieldValue.serverTimestamp()
  };

  if (papel === "Aluno") {
    dataToSave.letra_inicial = nome.charAt(0).toUpperCase();
  }

  if (papel === "Professor") {
    dataToSave.centro = centro || "N/A";
    dataToSave.laboratorio = laboratorio || "N/A";
  }

  await db.collection(papel).doc(uid).set(dataToSave, { merge: true });

  if (papel === "Professor" && materias && materias.length > 0) {
    const batch = db.batch();
    for (const materiaId of materias) {
      const relRef = db.collection("Professor_x_Materia").doc();
      batch.set(relRef, {
        id_usuario: uid,
        id_materia: materiaId
      });
    }
    await batch.commit();
  }

  // Update Custom Claims
  await atualizarCustomClaims(uid);

  // Generate Reset Link
  const resetLink = await admin.auth().generatePasswordResetLink(email);

  // Audit log
  await db.collection("Registro_de_Auditoria").add({
    id_usuario: request.auth!.uid,
    acao: "Convidar Usuário",
    tipo_entidade_sofre_acao: "USUARIO",
    id_do_objeto_da_entidade: uid,
    acao_feita_em: FieldValue.serverTimestamp(),
    metadata: {
      email,
      papel
    }
  });

  return { resetLink, uid };
});
