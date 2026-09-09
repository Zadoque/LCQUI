import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { CriarNotificacao } from "./schemas/notificacoes.schema";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { validatePayload } from "./utils/validation";
import { z } from "zod";

/**
 * Adiciona uma notificação de forma transacional.
 * @param tx Transação Firestore
 * @param db Instância do Firestore
 * @param dados Dados validados da notificação
 */
export function adicionarNotificacaoTx(
  tx: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  dados: CriarNotificacao
): void {
  const notificacoesRef = db
    .collection("Usuarios")
    .doc(dados.id_destinatario)
    .collection("Notificacoes")
    .doc();

  // Expira em 30 dias por padrão
  const agora = new Date();
  const expiraEm = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);

  tx.set(notificacoesRef, {
    id_destinatario: dados.id_destinatario,
    papel_destinatario: dados.papel_destinatario,
    tipo: dados.tipo,
    id_quem_fez_acao: dados.id_quem_fez_acao ?? null,
    id_turma: dados.id_turma ?? null,
    quantidade: dados.quantidade ?? null,
    entidade_alvo: dados.entidade_alvo,
    id_alvo: dados.id_alvo,
    mensagem_customizada: dados.mensagem_customizada ?? null,
    lida: false,
    lida_em: null,
    emitida_em: FieldValue.serverTimestamp(),
    expira_em: expiraEm,
  });
}

// Endpoint para marcar notificação como lida
export const marcarNotificacaoComoLida = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const { idNotificacao } = validatePayload(
    z.object({ idNotificacao: z.string().min(1) }),
    request.data
  );

  const notificacaoRef = admin
    .firestore()
    .collection("Usuarios")
    .doc(request.auth.uid)
    .collection("Notificacoes")
    .doc(idNotificacao);

  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(notificacaoRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Notificação não encontrada.");
    }

    if (snap.data()?.lida) {
      return { success: true };
    }

    tx.update(notificacaoRef, {
      lida: true,
      lida_em: FieldValue.serverTimestamp(),
    });

    return { success: true };
  });
});
