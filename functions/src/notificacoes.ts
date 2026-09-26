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

/** Tamanho de página padrão do "Limpar tudo" paginado/reentrante (RN-M13-02). */
export const LIMPAR_TUDO_LIMITE_PADRAO = 100;
/** Teto de página do "Limpar tudo" (limite de transação e previsibilidade). */
export const LIMPAR_TUDO_LIMITE_MAXIMO = 200;
/** Tolerância de relógio aceita para um corte vindo de uma rodada anterior. */
const LIMPAR_TUDO_TOLERANCIA_CORTE_MS = 60_000;

// Endpoint "Limpar tudo": marca como lida, por rodadas paginadas e reentrantes,
// todas as notificações ativas do próprio UID, sem DELETE e preservando o
// histórico. O `corte` (instante do início da primeira rodada) é estável entre
// rodadas: avisos emitidos depois dele ficam para uma nova invocação.
export const limparTudoNotificacoes = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);

  const { corte, limite } = validatePayload(
    z.object({
      corte: z.string().min(1).optional(),
      limite: z.number().int().min(1).max(LIMPAR_TUDO_LIMITE_MAXIMO).optional(),
    }),
    request.data ?? {}
  );

  const limiteEfetivo = limite ?? LIMPAR_TUDO_LIMITE_PADRAO;
  const corteEfetivo = corte === undefined ? new Date() : new Date(corte);
  if (Number.isNaN(corteEfetivo.getTime())) {
    throw new HttpsError("invalid-argument", "Corte inválido.");
  }
  if (corteEfetivo.getTime() > Date.now() + LIMPAR_TUDO_TOLERANCIA_CORTE_MS) {
    throw new HttpsError("invalid-argument", "Corte inválido.");
  }

  const db = admin.firestore();
  const colecao = db.collection("Usuarios").doc(claims.uid).collection("Notificacoes");

  return db.runTransaction(async (tx) => {
    // M9: autoridade persistida relida na mesma transação do efeito.
    await resolverAutoridadePersistidaTx(tx, claims, PAPEIS_CONHECIDOS);

    // RN-M13-01: só notificações endereçadas ao próprio UID entram no lote.
    // O corte limita a itens existentes no início (`emitida_em <= corte`).
    const consulta = colecao
      .where("id_destinatario", "==", claims.uid)
      .where("lida", "==", false)
      .where("emitida_em", "<=", corteEfetivo)
      .orderBy("emitida_em", "asc")
      .limit(limiteEfetivo);

    const snap = await tx.get(consulta);

    for (const doc of snap.docs) {
      const dados = doc.data();
      // `lida=false => lida_em=null` (#M13Notificacao). Estado incoerente não é
      // reparado silenciosamente: falha fechada e a rodada inteira é revertida.
      const lidaEmPresente = dados.lida_em !== null && dados.lida_em !== undefined;
      if (dados.lida !== false || lidaEmPresente) {
        throw new HttpsError(
          "failed-precondition",
          "Notificação com estado de leitura incoerente."
        );
      }
      tx.update(doc.ref, { lida: true, lida_em: FieldValue.serverTimestamp() });
    }

    // Avisos já marcados saem da consulta (`lida == false`), então repetir com o
    // mesmo corte retoma do ponto sem marcar item novo por engano.
    return {
      corte: corteEfetivo.toISOString(),
      marcadas: snap.size,
      continuar: snap.size === limiteEfetivo,
    };
  });
});
