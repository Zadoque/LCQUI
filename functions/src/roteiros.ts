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
  RegistrarRoteiroSchema,
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

/** Inspeciona o objeto no Storage e retorna metadados validados. */
async function inspecionarObjetoRoteiro(storagePath: string, ownerUid: string) {
  if (!storagePath.startsWith(`roteiros/${ownerUid}/`)) {
    throw new HttpsError("permission-denied", "Caminho do Storage fora do namespace do dono.");
  }

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

  const dados = validatePayload(RegistrarRoteiroSchema, request.data);

  const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc();

  return admin.firestore().runTransaction(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Professor"]);

    const referencia = await inspecionarObjetoRoteiro(dados.storagePath, uid);

    tx.set(roteiroRef, {
      id_professor_upload: uid,
      nome: dados.nome,
      descricao: dados.descricao,
      nome_arquivo: dados.nomeArquivo,
      referencia,
      status: "PUBLICAVEL",
      professores_compartilhados: [],
      file_url: null,
      criado_em: FieldValue.serverTimestamp(),
    });

    return { idRoteiro: roteiroRef.id };
  });
});

export const compartilharRoteiro = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idRoteiro, uidProfessor } = validatePayload(CompartilharRoteiroSchema, request.data);

  const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc(idRoteiro);

  return admin.firestore().runTransaction(async (tx) => {
    const autoridade = await resolverAutoridadePersistidaTx(tx, claims, ["Professor"]);

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

    return { success: true };
  });
});

export const descompartilharRoteiro = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idRoteiro, uidProfessor } = validatePayload(DescompartilharRoteiroSchema, request.data);

  const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc(idRoteiro);

  return admin.firestore().runTransaction(async (tx) => {
    const autoridade = await resolverAutoridadePersistidaTx(tx, claims, ["Professor"]);

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

    return { success: true };
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
  const { idRoteiro } = validatePayload(RemoverRoteiroSchema, request.data);

  const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc(idRoteiro);

  const referencia = await admin.firestore().runTransaction(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Professor"]);

    const snap = await tx.get(roteiroRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Roteiro não encontrado.");
    }
    const roteiro = snap.data()!;
    if (roteiro.id_professor_upload !== uid) {
      throw new HttpsError("permission-denied", "Somente o dono do roteiro pode removê-lo.");
    }
    tx.delete(roteiroRef);
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

/**
 * Emite URL assinada de download para quem possui acesso ao roteiro.
 *
 * PENDÊNCIA Q13 (B03): o caminho Chefe_Geral foi fechado porque o repo não
 * grava Registro_de_Auditoria com id_post/id_turma e id_roteiro de forma
 * confiável. Para reabrir o caminho CHEFE_Q13 é necessário: (1) contrato
 * de auditoria com id_roteiro, id_chefe, id_post, id_turma, motivo; (2)
 * validação transacional de que o Post existe, removido_da_apresentacao
 * === true e roteiro_anexo.id_roteiro === id_roteiro.
 */
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
