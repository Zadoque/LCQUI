import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { validarPermissao, atualizarCustomClaims, validarMatrizPapeis } from "./auth";
import { validatePayload } from "./utils/validation";
import { ConvidarUsuarioSchema, RevogarUsuarioPapelSchema } from "./schemas/usuarios.schema";
import { validarRevogacaoChefeGeral, validarRevogacaoGestorAlmoxarifado, validarRevogacaoGestorPatrimonial } from "./domain/revogarPapel";

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

  // Validação Prévia da Matriz de Multi-Role
  const colecoes = [
    "Chefe_Geral",
    "Gestor_Almoxarifado",
    "Gestor_Bens_Patrimoniais",
    "Professor",
    "Aluno",
    "Bolsista"
  ];
  const leiturasAtuais = await Promise.all(
    colecoes.map((c) => db.collection(c).doc(uid).get())
  );
  const rolesAtuais = colecoes.filter((_, i) => leiturasAtuais[i].exists);
  const novasRoles = Array.from(new Set([...rolesAtuais, papel]));

  validarMatrizPapeis(novasRoles);

  // Centraliza a criação na coleção Usuarios
  await db.collection("Usuarios").doc(uid).set({
    nome,
    email,
    ativo: true,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

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

export const revogarUsuarioPapel = onCall(async (request) => {
  // Apenas Chefe Geral pode revogar (RN-ROLE-02 permite auto-revogação, vamos assumir que o sistema só permite a Chefes Gerais usarem esta tela inicialmente)
  validarPermissao(request, ["Chefe_Geral"]);

  const { email, papel, motivo } = validatePayload(RevogarUsuarioPapelSchema, request.data);
  const db = admin.firestore();
  
  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch (error: any) {
    throw new HttpsError("not-found", "Usuário não encontrado.");
  }

  const uid = userRecord.uid;

  // Verifica se o usuário tem o papel que está sendo revogado
  const papelDoc = await db.collection(papel).doc(uid).get();
  if (!papelDoc.exists) {
    throw new HttpsError("failed-precondition", `O usuário não possui o papel de ${papel}.`);
  }

  // Validação de RN de Revogação
  if (papel === "Chefe_Geral") {
    await validarRevogacaoChefeGeral(uid);
  } else if (papel === "Gestor_Almoxarifado") {
    await validarRevogacaoGestorAlmoxarifado(uid);
  } else if (papel === "Gestor_Bens_Patrimoniais") {
    await validarRevogacaoGestorPatrimonial(uid);
  }

  // Executa a remoção do papel (removendo da coleção do papel)
  await db.collection(papel).doc(uid).delete();

  // Recalcula Custom Claims
  await atualizarCustomClaims(uid);

  // Lê novamente para verificar se restou algum papel
  const colecoes = [
    "Chefe_Geral",
    "Gestor_Almoxarifado",
    "Gestor_Bens_Patrimoniais",
    "Professor",
    "Aluno",
    "Bolsista"
  ];
  const leiturasPos = await Promise.all(
    colecoes.map((c) => db.collection(c).doc(uid).get())
  );
  const restamPapeis = leiturasPos.some(doc => doc.exists);

  let ativo = true;
  if (!restamPapeis) {
    ativo = false;
    await db.collection("Usuarios").doc(uid).set({
      ativo: false,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  }

  // Audit log
  await db.collection("Registro_de_Auditoria").add({
    id_usuario: request.auth!.uid,
    acao: "Revogar Papel",
    tipo_entidade_sofre_acao: "USUARIO",
    id_do_objeto_da_entidade: uid,
    acao_feita_em: FieldValue.serverTimestamp(),
    metadata: {
      email,
      papel_removido: papel,
      motivo: motivo || "Não informado",
      situacao_conta: ativo ? "ATIVA" : "DESATIVADA"
    }
  });

  return { uid, ativo };
});
