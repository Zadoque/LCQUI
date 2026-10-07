import * as admin from "firebase-admin";
import { FieldPath, FieldValue, Timestamp } from "firebase-admin/firestore";
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
  dados: CriarNotificacao,
  docId?: string
): admin.firestore.DocumentReference {
  const colecaoRef = db
    .collection("Usuarios")
    .doc(dados.id_destinatario)
    .collection("Notificacoes");
  const notificacoesRef = docId ? colecaoRef.doc(docId) : colecaoRef.doc();

  // RN-M13-03: sem prazo determinado na fonte, `expira_em = null` (sem expiração
  // automática). `ESCASSEZ_ESTOQUE` nunca expira e não admite prazo arbitrário.
  if (dados.tipo === "ESCASSEZ_ESTOQUE" && dados.expira_em != null) {
    throw new HttpsError("invalid-argument", "ESCASSEZ_ESTOQUE não admite expiração.");
  }
  const expiraEm = dados.tipo === "ESCASSEZ_ESTOQUE" ? null : dados.expira_em ?? null;

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
    // RN-M13-05: payload mínimo, nunca conteúdo protegido.
    contem_conteudo_protegido: false,
  });

  return notificacoesRef;
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

/**
 * Revalida a abertura de um alvo M13 no instante da navegação. A notificação
 * nunca concede acesso: ela apenas aponta para um recurso cuja ACL corrente é
 * verificada novamente antes de devolver uma rota interna.
 */
export const resolverDestinoNotificacao = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idNotificacao } = validatePayload(
    z.object({ idNotificacao: z.string().min(1) }),
    request.data,
  );
  const db = admin.firestore();
  const agora = Timestamp.now();

  return db.runTransaction(async (tx) => {
    const autoridade = await resolverAutoridadePersistidaTx(tx, claims, PAPEIS_CONHECIDOS);
    const notificacaoRef = db.collection("Usuarios").doc(claims.uid).collection("Notificacoes").doc(idNotificacao);
    const notificacaoSnap = await tx.get(notificacaoRef);
    if (!notificacaoSnap.exists || notificacaoSnap.data()?.id_destinatario !== claims.uid) {
      throw new HttpsError("not-found", "Notificação não encontrada.");
    }
    const notificacao = notificacaoSnap.data()!;
    const expiraEm = notificacao.expira_em;
    if (expiraEm && typeof expiraEm.toMillis === "function" && expiraEm.toMillis() <= agora.toMillis()) {
      return { autorizado: false, motivo: "expirada" };
    }

    const tipoAlvo = notificacao.entidade_alvo;
    const idAlvo = notificacao.id_alvo;
    if (typeof tipoAlvo !== "string" || typeof idAlvo !== "string" || !idAlvo) {
      return { autorizado: false, motivo: "alvo_invalido" };
    }
    const papeis = new Set(autoridade.papeis);
    const ehChefe = papeis.has("Chefe_Geral");
    const ehGestorPatrimonio = papeis.has("Gestor_Bens_Patrimoniais");
    const ehGestorAlmox = papeis.has("Gestor_Almoxarifado");

    const turmaRef = notificacao.id_turma ? db.collection("Turma").doc(notificacao.id_turma) : null;
    const turmaSnap = turmaRef ? await tx.get(turmaRef) : null;
    const turma = turmaSnap?.data();
    const membro = turmaRef ? await tx.get(turmaRef.collection("Alunos").doc(claims.uid)) : null;
    const ehMembroTurma = membro?.exists === true;
    const acessoTurma = ehChefe || turma?.id_professor === claims.uid || ehMembroTurma;

    let autorizado = false;
    switch (tipoAlvo) {
      case "Convite_Aluno": {
        const convite = await tx.get(db.collection("Convite_Aluno").doc(idAlvo));
        autorizado = convite.exists && (notificacao.tipo === "CONVITE_PARA_TURMA" || ehChefe || convite.data()?.convidado_por === claims.uid);
        break;
      }
      case "Turma": {
        const alvo = await tx.get(db.collection("Turma").doc(idAlvo));
        autorizado = alvo.exists && (ehChefe || alvo.data()?.id_professor === claims.uid || (await tx.get(alvo.ref.collection("Alunos").doc(claims.uid))).exists);
        break;
      }
      case "Post": {
        const alvo = turmaRef ? await tx.get(turmaRef.collection("Posts").doc(idAlvo)) : null;
        autorizado = alvo?.exists === true && acessoTurma && alvo.data()?.removido_da_apresentacao !== true;
        break;
      }
      case "Comentario": {
        const consulta = db.collectionGroup("Comentarios").where(FieldPath.documentId(), "==", idAlvo).limit(1);
        const alvo = await tx.get(consulta);
        autorizado = !alvo.empty && acessoTurma && alvo.docs[0].data()?.removido_da_apresentacao !== true;
        break;
      }
      case "Roteiro": {
        const alvo = await tx.get(db.collection("Roteiro_Experimento").doc(idAlvo));
        const dados = alvo.data();
        autorizado = alvo.exists && (ehChefe || dados?.id_professor_upload === claims.uid || dados?.professores_compartilhados?.includes(claims.uid));
        break;
      }
      case "Almoxarifado": {
        const alvo = await tx.get(db.collection("Almoxarifado").doc(idAlvo));
        const vinculo = await tx.get(db.collection("Gestor_Almoxarifado_x_Almoxarifado")
          .where("id_gestor_almoxarifado", "==", claims.uid)
          .where("id_almoxarifado", "==", idAlvo).limit(1));
        autorizado = alvo.exists && (ehChefe || (ehGestorAlmox && !vinculo.empty));
        break;
      }
      case "Emprestimo": {
        const alvo = await tx.get(db.collection("Emprestimo_Reagente").doc(idAlvo));
        const dados = alvo.data();
        const almoxId = dados?.id_almoxarifado;
        const vinculo = almoxId ? await tx.get(db.collection("Gestor_Almoxarifado_x_Almoxarifado")
          .where("id_gestor_almoxarifado", "==", claims.uid)
          .where("id_almoxarifado", "==", almoxId).limit(1)) : null;
        autorizado = alvo.exists && (ehChefe || dados?.id_usuario_retirou === claims.uid || (ehGestorAlmox && !!vinculo && !vinculo.empty));
        break;
      }
      case "Usuario":
        autorizado = idAlvo === claims.uid || ehChefe;
        break;
      case "Bem_Patrimonial": {
        const alvo = await tx.get(db.collection("Bem_Patrimonial").doc(idAlvo));
        autorizado = alvo.exists && (ehChefe || ehGestorPatrimonio);
        break;
      }
      case "Requisicao_Bem": {
        const colecao = notificacao.tipo === "REQUISICAO_ADICAO_BEM"
          ? "Requisicao_Adicao_Bem_Patrimonial"
          : "Requisicao_Edicao_Bem_Patrimonial";
        const alvo = await tx.get(db.collection(colecao).doc(idAlvo));
        const dados = alvo.data();
        autorizado = alvo.exists && (ehChefe || ehGestorPatrimonio || dados?.id_usuario_solicitante === claims.uid);
        break;
      }
      default:
        autorizado = false;
    }

    if (!autorizado) return { autorizado: false, motivo: "sem_acesso" };
    const encoded = encodeURIComponent(idAlvo);
    const rotas: Record<string, string> = {
      Convite_Aluno: `/convite?id=${encoded}&via=notificacao`,
      Turma: `/turmas?turma=${encoded}`,
      Post: `/turmas?turma=${encodeURIComponent(notificacao.id_turma ?? "")}`,
      Comentario: `/turmas?turma=${encodeURIComponent(notificacao.id_turma ?? "")}`,
      Roteiro: "/turmas?roteiros=1",
      Almoxarifado: `/reagentes?almoxarifado=${encoded}&via=notificacao`,
      Emprestimo: `/reagentes?emprestimo=${encoded}&via=notificacao`,
      Usuario: `/alunos?usuario=${encoded}&via=notificacao`,
      Bem_Patrimonial: `/patrimonio/${encoded}`,
      Requisicao_Bem: "/patrimonio/requisicoes",
    };
    const url = rotas[tipoAlvo];
    return url ? { autorizado: true, url } : { autorizado: false, motivo: "alvo_invalido" };
  });
});

/** Tamanho de página padrão do "Limpar tudo" paginado/reentrante (RN-M13-02). */
export const LIMPAR_TUDO_LIMITE_PADRAO = 100;
/** Teto de página do "Limpar tudo" (limite de transação e previsibilidade). */
export const LIMPAR_TUDO_LIMITE_MAXIMO = 200;
/** Tolerância de relógio aceita para um corte vindo de uma rodada anterior. */
const LIMPAR_TUDO_TOLERANCIA_CORTE_MS = 60_000;
const LIMPAR_TUDO_CURSOR_SEP = "|";

interface CursorLimparTudo {
  emitidaEm: Timestamp;
  id: string;
}

/** Cursor estável `(emitida_em, docId)`: preserva empates do serverTimestamp. */
function serializarCursor(cursor: CursorLimparTudo): string {
  return `${cursor.emitidaEm.seconds}.${cursor.emitidaEm.nanoseconds}${LIMPAR_TUDO_CURSOR_SEP}${cursor.id}`;
}

function interpretarCursor(raw: string): CursorLimparTudo {
  const indice = raw.indexOf(LIMPAR_TUDO_CURSOR_SEP);
  if (indice <= 0) throw new HttpsError("invalid-argument", "Cursor inválido.");
  const partes = raw.slice(0, indice).split(".");
  const id = raw.slice(indice + 1);
  if (partes.length !== 2 || id.length === 0) {
    throw new HttpsError("invalid-argument", "Cursor inválido.");
  }
  const segundos = Number(partes[0]);
  const nanos = Number(partes[1]);
  if (!Number.isInteger(segundos) || !Number.isInteger(nanos) || nanos < 0 || nanos >= 1e9) {
    throw new HttpsError("invalid-argument", "Cursor inválido.");
  }
  return { emitidaEm: new Timestamp(segundos, nanos), id };
}

// Endpoint "Limpar tudo": marca como lida, por rodadas paginadas e reentrantes,
// todas as notificações ATIVAS do próprio UID, sem DELETE e preservando o
// histórico. O `corte` (instante do início da primeira rodada) é estável entre
// rodadas: avisos emitidos depois dele ficam para uma nova invocação.
// RN-M13-03: notificação com `expira_em` alcançado já não pertence ao conjunto
// ativo e é ignorada (permanece no histórico). Como itens ignorados não são
// mutados, o avanço usa o cursor `(emitida_em, docId)`, que também sobrevive a
// empates de `serverTimestamp`.
export const limparTudoNotificacoes = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);

  const { corte, cursor, limite } = validatePayload(
    z.object({
      corte: z.string().min(1).optional(),
      cursor: z.string().min(1).optional(),
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
  if (cursor !== undefined && corte === undefined) {
    throw new HttpsError("invalid-argument", "Cursor exige corte.");
  }
  const cursorEfetivo = cursor === undefined ? null : interpretarCursor(cursor);

  const db = admin.firestore();
  const colecao = db.collection("Usuarios").doc(claims.uid).collection("Notificacoes");
  const agora = new Date();

  return db.runTransaction(async (tx) => {
    // M9: autoridade persistida relida na mesma transação do efeito.
    await resolverAutoridadePersistidaTx(tx, claims, PAPEIS_CONHECIDOS);

    // RN-M13-01: só notificações endereçadas ao próprio UID entram no lote.
    // O corte limita a itens existentes no início (`emitida_em <= corte`).
    let consulta = colecao
      .where("id_destinatario", "==", claims.uid)
      .where("lida", "==", false)
      .where("emitida_em", "<=", corteEfetivo)
      .orderBy("emitida_em", "asc")
      .orderBy(FieldPath.documentId(), "asc")
      .limit(limiteEfetivo);
    if (cursorEfetivo) {
      consulta = consulta.startAfter(cursorEfetivo.emitidaEm, colecao.doc(cursorEfetivo.id));
    }

    const snap = await tx.get(consulta);

    let marcadas = 0;
    let ultimo: CursorLimparTudo | null = null;
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
      const emitida = dados.emitida_em;
      if (!emitida || typeof emitida.toMillis !== "function") {
        throw new HttpsError("failed-precondition", "Notificação sem instante de emissão.");
      }
      ultimo = { emitidaEm: emitida, id: doc.id };

      // RN-M13-03: expirado sai do conjunto ativo sem apagar o fato.
      const expiraEm = dados.expira_em;
      if (expiraEm !== null && expiraEm !== undefined) {
        if (typeof expiraEm.toMillis !== "function") {
          throw new HttpsError("failed-precondition", "Notificação com expiração incoerente.");
        }
        if (expiraEm.toMillis() <= agora.getTime()) continue;
      }

      tx.update(doc.ref, { lida: true, lida_em: FieldValue.serverTimestamp() });
      marcadas += 1;
    }

    return {
      corte: corteEfetivo.toISOString(),
      marcadas,
      continuar: snap.size === limiteEfetivo,
      proximo_cursor: snap.size > 0 && ultimo ? serializarCursor(ultimo) : null,
    };
  });
});
