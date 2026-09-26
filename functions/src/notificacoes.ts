import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { CriarNotificacao } from "./schemas/notificacoes.schema";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { validatePayload } from "./utils/validation";
import { z } from "zod";
import {
  PAPEIS_CONHECIDOS,
  extrairClaimsAutoridade,
  resolverAutoridadePersistidaTx,
} from "./auth";

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
  const claims = extrairClaimsAutoridade(request);

  const { idNotificacao } = validatePayload(
    z.object({ idNotificacao: z.string().min(1) }),
    request.data
  );

  const notificacaoRef = admin
    .firestore()
    .collection("Usuarios")
    .doc(claims.uid)
    .collection("Notificacoes")
    .doc(idNotificacao);

  return admin.firestore().runTransaction(async (tx) => {
    // M9: autoridade persistida (usuário ativo + versão corrente) relida na mesma
    // transação do efeito. A notificação é acessível somente ao próprio UID.
    await resolverAutoridadePersistidaTx(tx, claims, PAPEIS_CONHECIDOS);

    const snap = await tx.get(notificacaoRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Notificação não encontrada.");
    }

    const dados = snap.data();
    // RN-M13-01: o UID do caminho e `id_destinatario` correspondem ao
    // destinatário autenticado. Documento endereçado a outro UID não é
    // mutável por `claims.uid`, ainda que esteja no caminho dele (fail-closed).
    if (typeof dados?.id_destinatario !== "string" || dados.id_destinatario !== claims.uid) {
      throw new HttpsError(
        "permission-denied",
        "Notificação não pertence ao destinatário autenticado."
      );
    }

    // M13: `lida` e `lida_em` são coerentes por invariante (#M13Notificacao):
    // lida=false => lida_em=null; lida=true => lida_em definido. Estado
    // persistido incoerente não é reparado silenciosamente: falha fechada.
    const lida = dados.lida;
    const lidaEmPresente = dados.lida_em !== null && dados.lida_em !== undefined;
    if (typeof lida !== "boolean" || lida !== lidaEmPresente) {
      throw new HttpsError(
        "failed-precondition",
        "Notificação com estado de leitura incoerente."
      );
    }

    // Idempotente: repetir a marcação preserva o instante original.
    if (lida) {
      return { success: true };
    }

    tx.update(notificacaoRef, {
      lida: true,
      lida_em: FieldValue.serverTimestamp(),
    });

    return { success: true };
  });
});
