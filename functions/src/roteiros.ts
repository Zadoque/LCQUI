import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { validarPermissao } from "./auth";
import { validatePayload } from "./utils/validation";
import { 
  RegistrarRoteiroSchema, 
  CompartilharRoteiroSchema, 
  DescompartilharRoteiroSchema 
} from "./schemas/roteiros.schema";
import { adicionarNotificacaoTx } from "./notificacoes";

export const registrarRoteiro = onCall(async (request) => {
  validarPermissao(request, ["Professor"]);

  const dados = validatePayload(RegistrarRoteiroSchema, request.data);

  const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc();

  await roteiroRef.set({
    id_professor: request.auth!.uid,
    titulo: dados.titulo,
    descricao: dados.descricao ?? null,
    pdf_url: dados.pdf_url,
    criado_em: FieldValue.serverTimestamp(),
    compartilhado_com_emails: [] // array de emails
  });

  return { idRoteiro: roteiroRef.id };
});

export const compartilharRoteiro = onCall(async (request) => {
  validarPermissao(request, ["Professor"]);

  const { idRoteiro, emailCompartilhar } = validatePayload(CompartilharRoteiroSchema, request.data);

  const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc(idRoteiro);

  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(roteiroRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Roteiro não encontrado.");
    }

    const roteiro = snap.data()!;
    if (roteiro.id_professor !== request.auth!.uid) {
      throw new HttpsError("permission-denied", "Somente o dono do roteiro pode compartilhá-lo.");
    }

    if (roteiro.compartilhado_com_emails && roteiro.compartilhado_com_emails.includes(emailCompartilhar)) {
      throw new HttpsError("already-exists", "O roteiro já está compartilhado com este e-mail.");
    }

    tx.update(roteiroRef, {
      compartilhado_com_emails: FieldValue.arrayUnion(emailCompartilhar)
    });

    // Encontrar o usuário que receberá para notificar
    const profSnap = await tx.get(admin.firestore().collection("Professor").where("email", "==", emailCompartilhar).limit(1));
    if (!profSnap.empty) {
      const profId = profSnap.docs[0].id;
      adicionarNotificacaoTx(tx, admin.firestore(), {
        id_destinatario: profId,
        papel_destinatario: "Professor",
        tipo: "ROTEIRO_COMPARTILHADO",
        id_quem_fez_acao: request.auth!.uid,
        entidade_alvo: "Roteiro_Experimento",
        id_alvo: idRoteiro
      });
    }

    return { success: true };
  });
});

export const descompartilharRoteiro = onCall(async (request) => {
  validarPermissao(request, ["Professor"]);

  const { idRoteiro, emailDescompartilhar } = validatePayload(DescompartilharRoteiroSchema, request.data);

  const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc(idRoteiro);

  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(roteiroRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Roteiro não encontrado.");
    }

    const roteiro = snap.data()!;
    if (roteiro.id_professor !== request.auth!.uid) {
      throw new HttpsError("permission-denied", "Somente o dono do roteiro pode remover o compartilhamento.");
    }

    tx.update(roteiroRef, {
      compartilhado_com_emails: FieldValue.arrayRemove(emailDescompartilhar)
    });

    return { success: true };
  });
});
