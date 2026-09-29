import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  extrairClaimsAutoridade,
  resolverAutoridadePersistidaTx,
} from "./auth";
import {
  construirIdentidade,
  registrarOperacaoConcluidaTx,
  resolverOperacaoTx,
} from "./idempotencia";
import { adicionarNotificacaoTx } from "./notificacoes";
import { validatePayload } from "./utils/validation";
import {
  CriarPostSchema,
  AdicionarComentarioSchema,
  RemoverPostSchema,
  ModerarComentarioSchema,
  ListarComentariosPostSchema,
} from "./schemas/posts.schema";

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Helpers compartilhados
// ---------------------------------------------------------------------------

/** Rejeita escrita acadêmica quando a turma está Arquivada (Q08 / M12.1). */
function validarTurmaNaoArquivada(turmaData: Record<string, unknown>): void {
  if (turmaData.status === "Arquivada") {
    throw new HttpsError(
      "failed-precondition",
      "Turma arquivada não aceita escrita acadêmica."
    );
  }
}

/**
 * Resolve nome de exibição a partir de `Usuarios/{uid}` (projeção mínima de
 * identidade — nunca do documento de papel).
 */
async function resolverNomeIdentidadeTx(
  tx: admin.firestore.Transaction,
  uid: string
): Promise<string> {
  const snap = await tx.get(db.collection("Usuarios").doc(uid));
  const nome = snap.data()?.nome;
  return typeof nome === "string" && nome.trim().length > 0
    ? nome.trim()
    : "Sem nome";
}

// ---------------------------------------------------------------------------
// 1. criarPost
// ---------------------------------------------------------------------------
export const criarPost = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idOperacao, idTurma, titulo, descricao, idRoteiroExperimento } =
    validatePayload(CriarPostSchema, request.data);

  return db.runTransaction(async (tx) => {
    // M9: autoridade persistida relida na transação do efeito.
    const autoridade = await resolverAutoridadePersistidaTx(tx, claims, [
      "Professor",
      "Chefe_Geral",
    ]);

    // M7: replay compatível devolve o receipt; reuso incompatível falha.
    const identidade = construirIdentidade(claims.uid, "CRIAR_POST", {
      idTurma,
      titulo,
      descricao,
      idRoteiroExperimento: idRoteiroExperimento ?? null,
    });
    const decisao = await resolverOperacaoTx(tx, idOperacao, identidade);
    if (decisao.estado === "REPLAY") {
      return decisao.resultado as { id: string; titulo: string };
    }
    if (decisao.estado !== "NOVA") {
      throw new HttpsError(
        "failed-precondition",
        "Operação de criação de post não concluída."
      );
    }

    // Turma: existência, ownership (professor-dono ou chefe) e status.
    const turmaRef = db.collection("Turma").doc(idTurma);
    const turmaSnap = await tx.get(turmaRef);
    if (!turmaSnap.exists) {
      throw new HttpsError("not-found", "Turma não encontrada.");
    }
    const turmaData = turmaSnap.data()!;
    
    // Professor dono ou Chefe_Geral pode criar posts
    const ehDono = turmaData.id_professor === claims.uid;
    const ehChefe = autoridade.papelAutorizado === "Chefe_Geral";
    if (!ehDono && !ehChefe) {
      throw new HttpsError(
        "permission-denied",
        "Apenas o professor responsável ou a chefia pode criar posts."
      );
    }
    
    validarTurmaNaoArquivada(turmaData);

    // Projeção mínima: nome do Usuarios (identidade), nunca do papel.
    const nomeProfessor = await resolverNomeIdentidadeTx(tx, claims.uid);

    // Post structural fields (CUE #M12_1Post).
    const postRef = turmaRef.collection("Posts").doc();
    tx.set(postRef, {
      id_professor: claims.uid,
      nome_professor: nomeProfessor,
      id_turma: idTurma,
      id_roteiro_experimento: idRoteiroExperimento ?? null,
      titulo,
      descricao,
      criado_em: FieldValue.serverTimestamp(),
      editado: false,
      editado_em: null,
      removido_da_apresentacao: false,
      motivo_remocao: null,
      removido_por: null,
      removido_em: null,
    });

    // Notificação aos alunos canônicos (M13 / CUE #M12_1NotificacaoEfeito).
    // Efeito externo: fan-out dentro do commit (cada aluno é um doc separado,
    // não depende de callback pós-transação).
    const alunosSnap = await tx.get(turmaRef.collection("Alunos"));
    for (const alunoDoc of alunosSnap.docs) {
      const alunoData = alunoDoc.data();
      if (alunoData.id_aluno !== alunoDoc.id) continue; // fail-closed canonical
      adicionarNotificacaoTx(tx, db, {
        id_destinatario: alunoDoc.id,
        papel_destinatario: "Aluno",
        tipo: "POST",
        id_quem_fez_acao: claims.uid,
        id_turma: idTurma,
        entidade_alvo: "Post",
        id_alvo: postRef.id,
      });
    }

    const resultado = { id: postRef.id, titulo };
    registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
    return resultado;
  });
});

// ---------------------------------------------------------------------------
// 2. adicionarComentario
// ---------------------------------------------------------------------------
export const adicionarComentario = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idOperacao, idTurma, idPost, texto } = validatePayload(
    AdicionarComentarioSchema,
    request.data
  );

  return db.runTransaction(async (tx) => {
    const autoridade = await resolverAutoridadePersistidaTx(tx, claims, [
      "Professor",
      "Chefe_Geral",
      "Aluno",
      "Bolsista",
    ]);

    const identidade = construirIdentidade(claims.uid, "ADICIONAR_COMENTARIO", {
      idTurma,
      idPost,
      texto,
    });
    const decisao = await resolverOperacaoTx(tx, idOperacao, identidade);
    if (decisao.estado === "REPLAY") {
      return decisao.resultado as { id: string };
    }
    if (decisao.estado !== "NOVA") {
      throw new HttpsError(
        "failed-precondition",
        "Operação de comentário não concluída."
      );
    }

    // Turma: existência + status.
    const turmaRef = db.collection("Turma").doc(idTurma);
    const turmaSnap = await tx.get(turmaRef);
    if (!turmaSnap.exists) {
      throw new HttpsError("not-found", "Turma não encontrada.");
    }
    const turmaData = turmaSnap.data()!;
    validarTurmaNaoArquivada(turmaData);

    // Post: existência + não removido.
    const postRef = turmaRef.collection("Posts").doc(idPost);
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists) {
      throw new HttpsError("not-found", "Post não encontrado.");
    }
    const postData = postSnap.data()!;
    if (postData.id_turma !== idTurma) {
      throw new HttpsError(
        "failed-precondition",
        "Post não pertence à turma indicada (fail-closed)."
      );
    }
    if (postData.removido_da_apresentacao === true) {
      throw new HttpsError(
        "failed-precondition",
        "Post removido não aceita novos comentários."
      );
    }

    // Participação canônica (M11): professor-dono OU vínculo Alunos/{uid}.
    const ehDono = turmaData.id_professor === claims.uid;
    const ehChefe = autoridade.papelAutorizado === "Chefe_Geral";
    if (!ehDono && !ehChefe) {
      const alunoSnap = await tx.get(turmaRef.collection("Alunos").doc(claims.uid));
      if (!alunoSnap.exists) {
        throw new HttpsError(
          "permission-denied",
          "Você não tem vínculo canônico com esta turma."
        );
      }
      const alunoData = alunoSnap.data()!;
      if (alunoData.id_aluno !== claims.uid || alunoData.id_turma !== idTurma) {
        throw new HttpsError(
          "failed-precondition",
          "Vínculo canônico corrompido (fail-closed)."
        );
      }
    }

    const nomeUsuario = await resolverNomeIdentidadeTx(tx, claims.uid);

    // Structural fields (CUE #M12_1Comentario).
    const comentarioRef = postRef.collection("Comentarios").doc();
    tx.set(comentarioRef, {
      id_post: idPost,
      id_usuario: claims.uid,
      nome_usuario: nomeUsuario,
      texto,
      criado_em: FieldValue.serverTimestamp(),
      editado: false,
      editado_em: null,
      moderado: false,
      motivo_moderacao: null,
      moderado_por: null,
      moderado_em: null,
    });

    // Notificação ao professor-dono da turma (M13).
    const professorUid = turmaData.id_professor as string;
    if (professorUid !== claims.uid) {
      adicionarNotificacaoTx(tx, db, {
        id_destinatario: professorUid,
        papel_destinatario: "Professor",
        tipo: "COMENTARIO",
        id_quem_fez_acao: claims.uid,
        id_turma: idTurma,
        entidade_alvo: "Comentario",
        id_alvo: comentarioRef.id,
      });
    }

    const resultado = { id: comentarioRef.id };
    registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
    return resultado;
  });
});

// ---------------------------------------------------------------------------
// 3. removerPost (soft-delete; substitui excluirPost)
// ---------------------------------------------------------------------------
export const removerPost = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idOperacao, idTurma, idPost, motivo } = validatePayload(
    RemoverPostSchema,
    request.data
  );

  return db.runTransaction(async (tx) => {
    const autoridade = await resolverAutoridadePersistidaTx(tx, claims, [
      "Professor",
      "Chefe_Geral",
    ]);

    const identidade = construirIdentidade(claims.uid, "REMOVER_POST", {
      idTurma,
      idPost,
      motivo,
    });
    const decisao = await resolverOperacaoTx(tx, idOperacao, identidade);
    if (decisao.estado === "REPLAY") {
      return decisao.resultado as { success: true };
    }
    if (decisao.estado !== "NOVA") {
      throw new HttpsError(
        "failed-precondition",
        "Operação de remoção não concluída."
      );
    }

    const turmaRef = db.collection("Turma").doc(idTurma);
    const turmaSnap = await tx.get(turmaRef);
    if (!turmaSnap.exists) {
      throw new HttpsError("not-found", "Turma não encontrada.");
    }
    const turmaData = turmaSnap.data()!;
    validarTurmaNaoArquivada(turmaData);

    // Professor-dono ou Chefe (Q13) pode remover.
    const ehDono = turmaData.id_professor === claims.uid;
    const ehChefe = autoridade.papelAutorizado === "Chefe_Geral";
    if (!ehDono && !ehChefe) {
      throw new HttpsError(
        "permission-denied",
        "Apenas o professor responsável ou a chefia pode remover posts."
      );
    }

    const postRef = turmaRef.collection("Posts").doc(idPost);
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists) {
      throw new HttpsError("not-found", "Post não encontrado.");
    }
    const postData = postSnap.data()!;
    if (postData.id_turma !== idTurma) {
      throw new HttpsError(
        "failed-precondition",
        "Post não pertence à turma indicada (fail-closed)."
      );
    }

    // Já removido: idempotente (retorna sucesso sem regravar).
    if (postData.removido_da_apresentacao === true) {
      const resultado = { success: true as const };
      registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
      return resultado;
    }

    // Remoção lógica (RF25 / M12.1): preserva documento, histórico, anexos.
    tx.update(postRef, {
      removido_da_apresentacao: true,
      motivo_remocao: motivo,
      removido_por: claims.uid,
      removido_em: FieldValue.serverTimestamp(),
    });

    // Histórico de moderação (M12.1 / Seção 4).
    tx.set(postRef.collection("Historico_Posts_Turma").doc(), {
      id_post: idPost,
      id_turma: idTurma,
      tipo: "moderacao",
      acao: "remocao_logica",
      editado_por: claims.uid,
      motivo,
      timestamp: FieldValue.serverTimestamp(),
    });

    // Notificação aos alunos (sem conteúdo protegido — M13 / CUE).
    const alunosSnap = await tx.get(turmaRef.collection("Alunos"));
    for (const alunoDoc of alunosSnap.docs) {
      const alunoData = alunoDoc.data();
      if (alunoData.id_aluno !== alunoDoc.id) continue;
      adicionarNotificacaoTx(tx, db, {
        id_destinatario: alunoDoc.id,
        papel_destinatario: "Aluno",
        tipo: "REMOVIDO",
        id_quem_fez_acao: claims.uid,
        id_turma: idTurma,
        entidade_alvo: "Post",
        id_alvo: idPost,
      });
    }

    const resultado = { success: true as const };
    registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
    return resultado;
  });
});

// ---------------------------------------------------------------------------
// 4. moderarComentario (substitui excluirComentario)
// ---------------------------------------------------------------------------
export const moderarComentario = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idOperacao, idTurma, idPost, idComentario, motivo } = validatePayload(
    ModerarComentarioSchema,
    request.data
  );

  return db.runTransaction(async (tx) => {
    const autoridade = await resolverAutoridadePersistidaTx(tx, claims, [
      "Professor",
      "Chefe_Geral",
    ]);

    const identidade = construirIdentidade(claims.uid, "MODERAR_COMENTARIO", {
      idTurma,
      idPost,
      idComentario,
      motivo,
    });
    const decisao = await resolverOperacaoTx(tx, idOperacao, identidade);
    if (decisao.estado === "REPLAY") {
      return decisao.resultado as { success: true };
    }
    if (decisao.estado !== "NOVA") {
      throw new HttpsError(
        "failed-precondition",
        "Operação de moderação não concluída."
      );
    }

    const turmaRef = db.collection("Turma").doc(idTurma);
    const turmaSnap = await tx.get(turmaRef);
    if (!turmaSnap.exists) {
      throw new HttpsError("not-found", "Turma não encontrada.");
    }
    const turmaData = turmaSnap.data()!;
    validarTurmaNaoArquivada(turmaData);

    // Professor-dono ou Chefe (Q13).
    const ehDono = turmaData.id_professor === claims.uid;
    const ehChefe = autoridade.papelAutorizado === "Chefe_Geral";
    if (!ehDono && !ehChefe) {
      throw new HttpsError(
        "permission-denied",
        "Apenas o professor responsável ou a chefia pode moderar comentários."
      );
    }

    const comentarioRef = turmaRef
      .collection("Posts")
      .doc(idPost)
      .collection("Comentarios")
      .doc(idComentario);
    const comentarioSnap = await tx.get(comentarioRef);
    if (!comentarioSnap.exists) {
      throw new HttpsError("not-found", "Comentário não encontrado.");
    }
    const comentarioData = comentarioSnap.data()!;
    if (comentarioData.id_post !== idPost) {
      throw new HttpsError(
        "failed-precondition",
        "Comentário não pertence ao post indicado (fail-closed)."
      );
    }

    // Já moderado: idempotente.
    if (comentarioData.moderado === true) {
      const resultado = { success: true as const };
      registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
      return resultado;
    }

    // Moderação preserva o original (RF25 / M12.1).
    tx.update(comentarioRef, {
      moderado: true,
      motivo_moderacao: motivo,
      moderado_por: claims.uid,
      moderado_em: FieldValue.serverTimestamp(),
    });

    // Histórico de moderação.
    tx.set(comentarioRef.collection("Historico_Comentario").doc(), {
      id_comentario: idComentario,
      id_post: idPost,
      id_turma: idTurma,
      tipo: "moderacao",
      editado_por: claims.uid,
      motivo,
      timestamp: FieldValue.serverTimestamp(),
    });

    const resultado = { success: true as const };
    registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
    return resultado;
  });
});

// ---------------------------------------------------------------------------
// 5. listarComentariosPost (endpoint autorizado com projeções — Seção 11)
// ---------------------------------------------------------------------------
export const listarComentariosPost = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idOperacao, idTurma, idPost } = validatePayload(
    ListarComentariosPostSchema,
    request.data
  );

  return db.runTransaction(async (tx) => {
    const autoridade = await resolverAutoridadePersistidaTx(tx, claims, [
      "Professor",
      "Chefe_Geral",
      "Aluno",
      "Bolsista",
    ]);

    // Replay: leitura é determinística pelo estado no commit; devolve
    // resultado anterior se a identidade coincide (M7).
    const identidade = construirIdentidade(claims.uid, "LISTAR_COMENTARIOS_POST", {
      idTurma,
      idPost,
    });
    const decisao = await resolverOperacaoTx(tx, idOperacao, identidade);
    if (decisao.estado === "REPLAY") {
      return decisao.resultado;
    }
    if (decisao.estado !== "NOVA") {
      throw new HttpsError(
        "failed-precondition",
        "Operação de listagem não concluída."
      );
    }

    const turmaRef = db.collection("Turma").doc(idTurma);
    const turmaSnap = await tx.get(turmaRef);
    if (!turmaSnap.exists) {
      throw new HttpsError("not-found", "Turma não encontrada.");
    }
    const turmaData = turmaSnap.data()!;

    // Post: existência.
    const postRef = turmaRef.collection("Posts").doc(idPost);
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists) {
      throw new HttpsError("not-found", "Post não encontrado.");
    }
    const postData = postSnap.data()!;
    if (postData.id_turma !== idTurma) {
      throw new HttpsError(
        "failed-precondition",
        "Post não pertence à turma indicada (fail-closed)."
      );
    }

    // Participação canônica para leitura (M11).
    const ehDono = turmaData.id_professor === claims.uid;
    const ehChefe = autoridade.papelAutorizado === "Chefe_Geral";
    let visao: "AUTOR" | "COLEGA" | "AUDITOR";
    if (ehDono || ehChefe) {
      visao = "AUDITOR";
    } else {
      const alunoSnap = await tx.get(
        turmaRef.collection("Alunos").doc(claims.uid)
      );
      if (!alunoSnap.exists) {
        throw new HttpsError(
          "permission-denied",
          "Você não tem vínculo canônico com esta turma."
        );
      }
      visao = "COLEGA";
    }

    // Comentários ordenados por criado_em (asc).
    const comentariosSnap = await tx.get(
      postRef
        .collection("Comentarios")
        .orderBy("criado_em", "asc")
    );

    // Projeção por visão (CUE #M12_1ComentarioLeitura).
    const AVISO_INSTITUCIONAL =
      "Este comentário foi moderado pelo professor responsável.";

    const itens = comentariosSnap.docs.map((doc) => {
      const d = doc.data();
      const ehAutor = d.id_usuario === claims.uid;
      const moderado = d.moderado === true;

      // Visão AUTOR: autor vê o original com marcador.
      if (ehAutor) {
        return {
          id: doc.id,
          id_usuario: d.id_usuario,
          nome_usuario: d.nome_usuario,
          texto: d.texto,
          criado_em: d.criado_em,
          editado: d.editado ?? false,
          editado_em: d.editado_em ?? null,
          moderado,
          motivo_moderacao: moderado ? d.motivo_moderacao : null,
        };
      }

      // Visão COLEGA: texto original escondido se moderado.
      if (visao === "COLEGA") {
        if (moderado) {
          return {
            id: doc.id,
            id_usuario: d.id_usuario,
            nome_usuario: d.nome_usuario,
            texto: null,
            criado_em: d.criado_em,
            editado: d.editado ?? false,
            editado_em: d.editado_em ?? null,
            moderado: true,
            aviso_institucional: AVISO_INSTITUCIONAL,
          };
        }
        return {
          id: doc.id,
          id_usuario: d.id_usuario,
          nome_usuario: d.nome_usuario,
          texto: d.texto,
          criado_em: d.criado_em,
          editado: d.editado ?? false,
          editado_em: d.editado_em ?? null,
          moderado: false,
          aviso_institucional: null,
        };
      }

      // Visão AUDITOR (professor-dono / Chefe): original + histórico.
      return {
        id: doc.id,
        id_usuario: d.id_usuario,
        nome_usuario: d.nome_usuario,
        texto: d.texto,
        criado_em: d.criado_em,
        editado: d.editado ?? false,
        editado_em: d.editado_em ?? null,
        moderado,
        motivo_moderacao: moderado ? d.motivo_moderacao : null,
        moderado_por: moderado ? d.moderado_por : null,
        moderado_em: moderado ? d.moderado_em : null,
      };
    });

    const resultado = { comentarios: itens, visao };
    registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
    return resultado;
  });
});

// ---------------------------------------------------------------------------
// 6. excluirPost — REMOVIDO: substituído por removerPost (soft-delete).
//    Mantido como alias deprecado para compatibilidade com testes legados
//    que ainda não migraram. NÃO usar em código novo.
// ---------------------------------------------------------------------------
/** @deprecated Use `removerPost`. Será removido quando todos os testes migrarem. */
export const excluirPost = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idTurma, idPost } = validatePayload(
    // Schema mínimo sem idOperacao (retrocompat).
    (await import("./schemas/posts.schema")).RemoverPostSchema.omit({
      idOperacao: true,
      motivo: true,
    }),
    request.data
  );

  return db.runTransaction(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Professor", "Chefe_Geral"]);

    const turmaRef = db.collection("Turma").doc(idTurma);
    const turmaSnap = await tx.get(turmaRef);
    if (!turmaSnap.exists) {
      throw new HttpsError("not-found", "Turma não encontrada.");
    }
    if (turmaSnap.data()!.id_professor !== claims.uid) {
      throw new HttpsError(
        "permission-denied",
        "Apenas o professor responsável pela turma pode remover posts."
      );
    }

    const postRef = turmaRef.collection("Posts").doc(idPost);
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists) {
      throw new HttpsError("not-found", "Post não encontrado.");
    }

    // Remoção lógica mesmo no path legado.
    tx.update(postRef, {
      removido_da_apresentacao: true,
      motivo_remocao: "Remoção via endpoint legado (migrar para removerPost).",
      removido_por: claims.uid,
      removido_em: FieldValue.serverTimestamp(),
    });

    return { success: true };
  });
});

/** @deprecated Use `moderarComentario`. */
export const excluirComentario = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idTurma, idPost, idComentario } = validatePayload(
    (await import("./schemas/posts.schema")).ModerarComentarioSchema.omit({
      idOperacao: true,
      motivo: true,
    }),
    request.data
  );

  return db.runTransaction(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Professor", "Chefe_Geral"]);

    const turmaRef = db.collection("Turma").doc(idTurma);
    const turmaSnap = await tx.get(turmaRef);
    if (!turmaSnap.exists) {
      throw new HttpsError("not-found", "Turma não encontrada.");
    }
    const turmaData = turmaSnap.data()!;

    const ehDono = turmaData.id_professor === claims.uid;
    const comentarioRef = turmaRef
      .collection("Posts")
      .doc(idPost)
      .collection("Comentarios")
      .doc(idComentario);
    const comentarioSnap = await tx.get(comentarioRef);
    if (!comentarioSnap.exists) {
      throw new HttpsError("not-found", "Comentário não encontrado.");
    }
    const comentarioData = comentarioSnap.data()!;

    // Legado: Aluno dono pode "excluir" (moderar próprio comentário).
    const ehAutorComentario = comentarioData.id_usuario === claims.uid;
    if (!ehDono && !ehAutorComentario) {
      throw new HttpsError(
        "permission-denied",
        "Sem autorização para moderar este comentário."
      );
    }

    // Moderação lógica (preserva original — RF25).
    tx.update(comentarioRef, {
      moderado: true,
      motivo_moderacao: ehAutorComentario
        ? "Remoção pelo autor via endpoint legado."
        : "Moderação via endpoint legado (migrar para moderarComentario).",
      moderado_por: claims.uid,
      moderado_em: FieldValue.serverTimestamp(),
    });

    return { success: true };
  });
});
