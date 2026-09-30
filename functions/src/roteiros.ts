import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  extrairClaimsAutoridade,
  resolverAutoridadePersistidaTx,
  validarAutoridadePersistida,
} from "./auth";
import { validatePayload } from "./utils/validation";
import {
  construirIdentidade,
  registrarOperacaoConcluidaTx,
  resolverOperacaoTx,
} from "./idempotencia";
import {
  RegistrarRoteiroSchema,
  ValidarObjetoRoteiroSchema,
  PublicarRoteiroSchema,
  CompartilharRoteiroSchema,
  DescompartilharRoteiroSchema,
  EmitirUrlDownloadRoteiroSchema,
  ListarRoteirosProfessorSchema,
  RemoverRoteiroSchema,
} from "./schemas/roteiros.schema";
import { adicionarNotificacaoTx } from "./notificacoes";

const LIMITE_BYTES_ROTEIRO = 15728640; // 15 MiB (exclusivo)

interface StorageFileMetadata {
  contentType?: string;
  size?: string | number;
  metadata?: Record<string, unknown>;
  generation?: string | number;
  timeCreated?: string;
}

/** Verifica se um usuário tem acesso a um roteiro publicável (dono ou compartilhado). */
export function podeAcessarRoteiro(roteiro: Record<string, unknown> | undefined, uid: string): boolean {
  if (!roteiro || roteiro.status !== "PUBLICAVEL") return false;
  const referencia = roteiro.referencia as Record<string, unknown> | undefined;
  if (!referencia || !referencia.geracao) return false;
  if (roteiro.id_professor_upload === uid) return true;
  const compartilhados = roteiro.professores_compartilhados as string[] | undefined;
  if (compartilhados && compartilhados.includes(uid)) return true;
  return false;
}

/** Valida namespace do Storage (dono e prefixo roteiros/{uid}/). */
function validarNamespaceStorage(storagePath: string, ownerUid: string): void {
  if (!storagePath.startsWith(`roteiros/${ownerUid}/`)) {
    throw new HttpsError("permission-denied", "Caminho do Storage fora do namespace do dono.");
  }
}

/** Inspeciona o objeto no Storage e retorna metadados validados. */
async function inspecionarObjetoRoteiro(storagePath: string, ownerUid: string) {
  validarNamespaceStorage(storagePath, ownerUid);

  const file = admin.storage().bucket().file(storagePath);
  let metadata: StorageFileMetadata;
  try {
    [metadata] = await file.getMetadata();
  } catch {
    throw new HttpsError("failed-precondition", "Objeto no Storage não encontrado ou inacessível.");
  }

  const contentType = metadata.contentType;
  if (contentType !== "application/pdf") {
    throw new HttpsError("failed-precondition", `Tipo do arquivo inválido: ${contentType}.`);
  }

  const tamanho = Number(metadata.size);
  if (Number.isNaN(tamanho) || tamanho <= 0 || tamanho >= LIMITE_BYTES_ROTEIRO) {
    throw new HttpsError("failed-precondition", `Tamanho do arquivo inválido: ${tamanho} bytes.`);
  }

  // Verifica o prefixo mágico do PDF nos primeiros bytes
  try {
    const [primeirosBytes] = await file.download({ start: 0, end: 4 });
    if (!primeirosBytes.toString("binary").startsWith("%PDF-")) {
      throw new HttpsError("failed-precondition", "Arquivo não é um PDF válido.");
    }
  } catch (err: unknown) {
    if (err instanceof HttpsError) throw err;
    throw new HttpsError("failed-precondition", "Não foi possível validar o conteúdo do PDF.");
  }

  const customMetadata = metadata.metadata || {};
  if (customMetadata.owner !== ownerUid) {
    throw new HttpsError("permission-denied", "O objeto no Storage não pertence ao professor.");
  }

  if (!metadata.generation) {
    throw new HttpsError("failed-precondition", "Geração do objeto não encontrada.");
  }

  return {
    storage_path: storagePath,
    content_type: "application/pdf",
    tamanho_bytes: tamanho,
    owner_uid: ownerUid,
    geracao: String(metadata.generation),
    criado_em: metadata.timeCreated || new Date().toISOString(),
  };
}

export const registrarRoteiro = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const uid = request.auth!.uid;

  const { idOperacao, nome, descricao, storagePath, nomeArquivo } = validatePayload(
    RegistrarRoteiroSchema,
    request.data
  );

  const identidade = construirIdentidade(uid, "CADASTRAR_ROTEIRO", {
    nome,
    descricao,
    storagePath,
    nomeArquivo,
  });

  const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc();

  return admin.firestore().runTransaction(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Professor"]);

    const decisao = await resolverOperacaoTx(tx, idOperacao, identidade);
    if (decisao.estado === "REPLAY") {
      return decisao.resultado as { idRoteiro: string };
    }
    if (decisao.estado !== "NOVA") {
      throw new HttpsError("failed-precondition", "Operação de cadastro de roteiro não concluída.");
    }

    // Valida namespace e posse sem fixar a geração (será fixada na validação).
    validarNamespaceStorage(storagePath, uid);

    tx.set(roteiroRef, {
      id_professor_upload: uid,
      nome,
      descricao,
      nome_arquivo: nomeArquivo,
      referencia: {
        storage_path: storagePath,
        owner_uid: uid,
      },
      status: "PROVISORIO",
      professores_compartilhados: [],
      file_url: null,
      criado_em: FieldValue.serverTimestamp(),
    });

    const resultado = { idRoteiro: roteiroRef.id };
    registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
    return resultado;
  });
});

export const validarObjetoRoteiro = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const uid = request.auth!.uid;

  const { idOperacao, idRoteiro } = validatePayload(ValidarObjetoRoteiroSchema, request.data);

  const identidade = construirIdentidade(uid, "VALIDAR_OBJETO", { idRoteiro });
  const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc(idRoteiro);

  return admin.firestore().runTransaction(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Professor"]);

    const decisao = await resolverOperacaoTx(tx, idOperacao, identidade);
    if (decisao.estado === "REPLAY") {
      return decisao.resultado as { idRoteiro: string; geracao: string };
    }
    if (decisao.estado !== "NOVA") {
      throw new HttpsError("failed-precondition", "Operação de validação não concluída.");
    }

    const snap = await tx.get(roteiroRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Roteiro não encontrado.");
    }

    const roteiro = snap.data()!;
    if (roteiro.id_professor_upload !== uid) {
      throw new HttpsError("permission-denied", "Somente o dono do roteiro pode validá-lo.");
    }

    if (roteiro.status !== "PROVISORIO") {
      throw new HttpsError("failed-precondition", "Roteiro deve estar PROVISORIO para ser validado.");
    }

    const storagePath = typeof roteiro.referencia?.storage_path === "string"
      ? roteiro.referencia.storage_path
      : null;
    if (!storagePath) {
      throw new HttpsError("failed-precondition", "Referência de Storage ausente.");
    }

    // Inspeção fora da transação (etapa externa) antes de gravar a geração.
    const referencia = await inspecionarObjetoRoteiro(storagePath, uid);

    tx.update(roteiroRef, {
      referencia,
      status: "VALIDADO",
    });

    const resultado = { idRoteiro, geracao: referencia.geracao };
    registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
    return resultado;
  });
});

export const publicarRoteiro = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const uid = request.auth!.uid;

  const { idOperacao, idRoteiro } = validatePayload(PublicarRoteiroSchema, request.data);

  const identidade = construirIdentidade(uid, "PUBLICAR_ROTEIRO", { idRoteiro });
  const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc(idRoteiro);

  return admin.firestore().runTransaction(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Professor"]);

    const decisao = await resolverOperacaoTx(tx, idOperacao, identidade);
    if (decisao.estado === "REPLAY") {
      return decisao.resultado as { idRoteiro: string };
    }
    if (decisao.estado !== "NOVA") {
      throw new HttpsError("failed-precondition", "Operação de publicação não concluída.");
    }

    const snap = await tx.get(roteiroRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Roteiro não encontrado.");
    }

    const roteiro = snap.data()!;
    if (roteiro.id_professor_upload !== uid) {
      throw new HttpsError("permission-denied", "Somente o dono do roteiro pode publicá-lo.");
    }

    if (roteiro.status !== "VALIDADO") {
      throw new HttpsError("failed-precondition", "Roteiro deve estar VALIDADO para ser publicado.");
    }

    const geracao = roteiro.referencia?.geracao;
    if (typeof geracao !== "string" || geracao.length === 0) {
      throw new HttpsError("failed-precondition", "Geração do objeto não foi fixada.");
    }

    tx.update(roteiroRef, {
      status: "PUBLICAVEL",
    });

    const resultado = { idRoteiro };
    registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
    return resultado;
  });
});

export const compartilharRoteiro = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idOperacao, idRoteiro, uidProfessor } = validatePayload(
    CompartilharRoteiroSchema,
    request.data
  );

  const identidade = construirIdentidade(claims.uid, "COMPARTILHAR_ROTEIRO", {
    idRoteiro,
    uidProfessor,
  });
  const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc(idRoteiro);

  return admin.firestore().runTransaction(async (tx) => {
    const autoridade = await resolverAutoridadePersistidaTx(tx, claims, ["Professor"]);

    const decisao = await resolverOperacaoTx(tx, idOperacao, identidade);
    if (decisao.estado === "REPLAY") {
      return decisao.resultado as { success: true };
    }
    if (decisao.estado !== "NOVA") {
      throw new HttpsError("failed-precondition", "Operação de compartilhamento não concluída.");
    }

    const snap = await tx.get(roteiroRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Roteiro não encontrado.");
    }

    const roteiro = snap.data()!;
    if (roteiro.id_professor_upload !== autoridade.uid) {
      throw new HttpsError("permission-denied", "Somente o dono do roteiro pode compartilhá-lo.");
    }

    if (roteiro.status !== "PUBLICAVEL") {
      throw new HttpsError("failed-precondition", "Roteiro deve estar PUBLICAVEL para ser compartilhado.");
    }

    if (roteiro.id_professor_upload === uidProfessor) {
      throw new HttpsError("failed-precondition", "Não é possível compartilhar com o próprio dono.");
    }

    const compartilhados: string[] = roteiro.professores_compartilhados || [];
    if (compartilhados.includes(uidProfessor)) {
      throw new HttpsError("already-exists", "O roteiro já está compartilhado com este professor.");
    }

    const profSnap = await tx.get(admin.firestore().collection("Usuarios").doc(uidProfessor));
    if (!profSnap.exists) {
      throw new HttpsError("failed-precondition", "Professor destinatário não encontrado.");
    }
    const profData = profSnap.data()!;
    if (profData.ativo !== true) {
      throw new HttpsError("failed-precondition", "Professor destinatário não está ativo.");
    }
    const profRoleSnap = await tx.get(admin.firestore().collection("Professor").doc(uidProfessor));
    if (!profRoleSnap.exists) {
      throw new HttpsError("failed-precondition", "Professor destinatário não possui papel de Professor.");
    }

    tx.update(roteiroRef, {
      professores_compartilhados: FieldValue.arrayUnion(uidProfessor),
    });

    adicionarNotificacaoTx(tx, admin.firestore(), {
      id_destinatario: uidProfessor,
      papel_destinatario: "Professor",
      tipo: "ROTEIRO_COMPARTILHADO",
      id_quem_fez_acao: autoridade.uid,
      entidade_alvo: "Roteiro",
      id_alvo: idRoteiro,
    });

    const resultado = { success: true };
    registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
    return resultado;
  });
});

export const descompartilharRoteiro = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idOperacao, idRoteiro, uidProfessor } = validatePayload(
    DescompartilharRoteiroSchema,
    request.data
  );

  const identidade = construirIdentidade(claims.uid, "REVOGAR_COMPARTILHAMENTO", {
    idRoteiro,
    uidProfessor,
  });
  const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc(idRoteiro);

  return admin.firestore().runTransaction(async (tx) => {
    const autoridade = await resolverAutoridadePersistidaTx(tx, claims, ["Professor"]);

    const decisao = await resolverOperacaoTx(tx, idOperacao, identidade);
    if (decisao.estado === "REPLAY") {
      return decisao.resultado as { success: true };
    }
    if (decisao.estado !== "NOVA") {
      throw new HttpsError("failed-precondition", "Operação de revogação não concluída.");
    }

    const snap = await tx.get(roteiroRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Roteiro não encontrado.");
    }

    const roteiro = snap.data()!;
    if (roteiro.id_professor_upload !== autoridade.uid) {
      throw new HttpsError("permission-denied", "Somente o dono do roteiro pode remover o compartilhamento.");
    }

    tx.update(roteiroRef, {
      professores_compartilhados: FieldValue.arrayRemove(uidProfessor),
    });

    const resultado = { success: true };
    registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
    return resultado;
  });
});

/** Lista os roteiros acessíveis ao professor (dono ou compartilhado). */
export const listarRoteirosProfessor = onCall(async (request) => {
  await validarAutoridadePersistida(request, ["Professor", "Chefe_Geral"]);
  validatePayload(ListarRoteirosProfessorSchema, request.data);
  const uid = request.auth!.uid;

  const db = admin.firestore();
  const [donosSnap, compartilhadosSnap] = await Promise.all([
    db.collection("Roteiro_Experimento").where("id_professor_upload", "==", uid).get(),
    db.collection("Roteiro_Experimento").where("professores_compartilhados", "array-contains", uid).get(),
  ]);

  const map = new Map<string, { id: string; nome: string; status: string }>();
  for (const snap of [donosSnap, compartilhadosSnap]) {
    for (const doc of snap.docs) {
      if (map.has(doc.id)) continue;
      const data = doc.data();
      map.set(doc.id, {
        id: doc.id,
        nome: typeof data.nome === "string" ? data.nome : "",
        status: typeof data.status === "string" ? data.status : "",
      });
    }
  }

  return { roteiros: Array.from(map.values()) };
});

/** Remove o roteiro do dono e tenta remover o objeto do Storage.
 *  Posts históricos preservam o snapshot do anexo (download futuro falha fechada). */
export const removerRoteiro = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const uid = request.auth!.uid;
  const { idOperacao, idRoteiro } = validatePayload(RemoverRoteiroSchema, request.data);

  const identidade = construirIdentidade(uid, "REMOVER_ROTEIRO", { idRoteiro });
  const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc(idRoteiro);

  const referencia = await admin.firestore().runTransaction<Record<string, unknown> | undefined>(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Professor"]);

    const decisao = await resolverOperacaoTx(tx, idOperacao, identidade);
    if (decisao.estado === "REPLAY") {
      return decisao.resultado as Record<string, unknown> | undefined;
    }
    if (decisao.estado !== "NOVA") {
      throw new HttpsError("failed-precondition", "Operação de remoção não concluída.");
    }

    const snap = await tx.get(roteiroRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Roteiro não encontrado.");
    }
    const roteiro = snap.data()!;
    if (roteiro.id_professor_upload !== uid) {
      throw new HttpsError("permission-denied", "Somente o dono do roteiro pode removê-lo.");
    }

    tx.delete(roteiroRef);
    const resultado = { success: true };
    registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
    return roteiro.referencia as Record<string, unknown> | undefined;
  });

  const storagePath = typeof referencia?.storage_path === "string" ? referencia.storage_path : null;
  if (storagePath) {
    try {
      await admin.storage().bucket().file(storagePath).delete();
    } catch (err: unknown) {
      const code = (err as { code?: unknown }).code;
      if (code !== 404) {
        console.error("Falha ao remover objeto do Storage:", err);
      }
    }
  }

  return { success: true };
});

export const emitirUrlDownloadRoteiro = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const dados = validatePayload(EmitirUrlDownloadRoteiroSchema, request.data);
  const { idRoteiro } = dados;

  return admin.firestore().runTransaction(async (tx) => {
    const autoridade = await resolverAutoridadePersistidaTx(tx, claims, [
      "Professor",
      "Aluno",
      "Bolsista",
    ]);

    const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc(idRoteiro);
    const snap = await tx.get(roteiroRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Roteiro não encontrado.");
    }

    const roteiro = snap.data()!;
    if (roteiro.status !== "PUBLICAVEL") {
      throw new HttpsError("failed-precondition", "Roteiro não está publicável.");
    }

    const referencia = roteiro.referencia || {};
    if (!referencia.storage_path || !referencia.geracao) {
      throw new HttpsError("failed-precondition", "Referência canônica incompleta.");
    }

    let via: string;

    if (roteiro.id_professor_upload === autoridade.uid) {
      via = "PROPRIETARIO";
    } else if ((roteiro.professores_compartilhados || []).includes(autoridade.uid)) {
      via = "COMPARTILHADO";
    } else if (autoridade.papeis.includes("Aluno") || autoridade.papeis.includes("Bolsista")) {
      if (!dados.idTurma || !dados.idPost) {
        throw new HttpsError("invalid-argument", "Aluno/Bolsista deve informar idTurma e idPost.");
      }

      const alunoRef = admin.firestore().collection("Turma").doc(dados.idTurma).collection("Alunos").doc(autoridade.uid);
      const alunoSnap = await tx.get(alunoRef);
      if (!alunoSnap.exists) {
        throw new HttpsError("permission-denied", "Vínculo canônico não encontrado.");
      }
      const alunoData = alunoSnap.data()!;
      if (alunoData.id_aluno !== autoridade.uid || alunoData.id_turma !== dados.idTurma) {
        throw new HttpsError("failed-precondition", "Vínculo canônico corrompido.");
      }

      const postRef = admin.firestore().collection("Turma").doc(dados.idTurma).collection("Posts").doc(dados.idPost);
      const postSnap = await tx.get(postRef);
      if (!postSnap.exists) {
        throw new HttpsError("not-found", "Post não encontrado.");
      }
      const postData = postSnap.data()!;
      if (postData.removido_da_apresentacao === true) {
        throw new HttpsError("failed-precondition", "Post removido.");
      }
      const roteiroAnexo = postData.roteiro_anexo as Record<string, unknown> | null | undefined;
      if (!roteiroAnexo || roteiroAnexo.id_roteiro !== idRoteiro) {
        throw new HttpsError("permission-denied", "Post não possui o roteiro anexado.");
      }
      if (
        roteiroAnexo.geracao !== referencia.geracao ||
        roteiroAnexo.storage_path !== referencia.storage_path
      ) {
        throw new HttpsError("failed-precondition", "Referência canônica do anexo divergente.");
      }
      via = "ALUNO_POST";
    } else {
      throw new HttpsError("permission-denied", "Usuário não possui acesso ao roteiro.");
    }

    const file = admin.storage().bucket().file(referencia.storage_path);

    // No Storage Emulator o Admin SDK não possui credenciais para assinar URL.
    // Retornamos a URL pública do emulador, preservando a geração para evitar
    // race com sobrescritas. Em produção continuamos a emitir signed URL v4.
    const storageEmulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
    if (storageEmulatorHost) {
      const bucketName = admin.storage().bucket().name;
      const encodedPath = encodeURIComponent(referencia.storage_path);
      const url = `http://${storageEmulatorHost}/v0/b/${bucketName}/o/${encodedPath}?alt=media&generation=${referencia.geracao}`;

      return {
        id_roteiro: idRoteiro,
        storage_path: referencia.storage_path,
        geracao: referencia.geracao,
        url,
        emitida_em: new Date().toISOString(),
        expira_em: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        via,
        validade: "ATIVA",
      };
    }

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000,
      version: "v4",
    });

    return {
      id_roteiro: idRoteiro,
      storage_path: referencia.storage_path,
      geracao: referencia.geracao,
      url,
      emitida_em: new Date().toISOString(),
      expira_em: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      via,
      validade: "ATIVA",
    };
  });

});
