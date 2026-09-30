import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { validarPermissao } from "./auth";
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
  validarPermissao(request, ["Professor"]);
  const uid = request.auth!.uid;

  const dados = validatePayload(RegistrarRoteiroSchema, request.data);

  // Inspeciona e valida o objeto no Storage (tipo, tamanho, dono, geração).
  const referencia = await inspecionarObjetoRoteiro(dados.storagePath, uid);

  const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc();

  await roteiroRef.set({
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

export const compartilharRoteiro = onCall(async (request) => {
  validarPermissao(request, ["Professor"]);

  const { idRoteiro, uidProfessor } = validatePayload(CompartilharRoteiroSchema, request.data);

  const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc(idRoteiro);

  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(roteiroRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Roteiro não encontrado.");
    }

    const roteiro = snap.data()!;
    if (roteiro.id_professor_upload !== request.auth!.uid) {
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

    // Verifica se o destinatário é um Professor ativo.
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
      id_quem_fez_acao: request.auth!.uid,
      entidade_alvo: "Roteiro",
      id_alvo: idRoteiro,
    });

    return { success: true };
  });
});

export const descompartilharRoteiro = onCall(async (request) => {
  validarPermissao(request, ["Professor"]);

  const { idRoteiro, uidProfessor } = validatePayload(DescompartilharRoteiroSchema, request.data);

  const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc(idRoteiro);

  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(roteiroRef);
    if (!snap.exists) {
      throw new HttpsError("not-found", "Roteiro não encontrado.");
    }

    const roteiro = snap.data()!;
    if (roteiro.id_professor_upload !== request.auth!.uid) {
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
  validarPermissao(request, ["Professor", "Chefe_Geral"]);
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
  validarPermissao(request, ["Professor"]);
  const uid = request.auth!.uid;
  const { idRoteiro } = validatePayload(RemoverRoteiroSchema, request.data);

  const roteiroRef = admin.firestore().collection("Roteiro_Experimento").doc(idRoteiro);

  const referencia = await admin.firestore().runTransaction(async (tx) => {
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

/** Emite URL assinada de download para quem possui acesso ao roteiro. */
export const emitirUrlDownloadRoteiro = onCall(async (request) => {
  validarPermissao(request, ["Professor", "Aluno", "Bolsista", "Chefe_Geral"]);

  const dados = validatePayload(EmitirUrlDownloadRoteiroSchema, request.data);
  const { idRoteiro } = dados;
  const uid = request.auth!.uid;
  const token = request.auth!.token as Record<string, unknown>;
  const roles = Array.isArray(token.roles) ? (token.roles as string[]) : [];
  const isAlunoBolsista = roles.includes("Aluno") || roles.includes("Bolsista");
  const isChefe = roles.includes("Chefe_Geral");

  return admin.firestore().runTransaction(async (tx) => {
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

    // Professor: dono ou compartilhado.
    if (roteiro.id_professor_upload === uid) {
      via = "PROPRIETARIO";
    } else if ((roteiro.professores_compartilhados || []).includes(uid)) {
      via = "COMPARTILHADO";
    } else if (isAlunoBolsista) {
      if (!dados.idTurma || !dados.idPost) {
        throw new HttpsError("invalid-argument", "Aluno/Bolsista deve informar idTurma e idPost.");
      }

      // Vínculo canônico atual na turma.
      const alunoRef = admin.firestore().collection("Turma").doc(dados.idTurma).collection("Alunos").doc(uid);
      const alunoSnap = await tx.get(alunoRef);
      if (!alunoSnap.exists) {
        throw new HttpsError("permission-denied", "Vínculo canônico não encontrado.");
      }
      const alunoData = alunoSnap.data()!;
      if (alunoData.id_aluno !== uid || alunoData.id_turma !== dados.idTurma) {
        throw new HttpsError("failed-precondition", "Vínculo canônico corrompido.");
      }

      // Post acessível e não removido com o roteiro anexado.
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
      via = "ALUNO_POST";
    } else if (isChefe) {
      const auditoriaQuery = admin
        .firestore()
        .collection("Registro_de_Auditoria")
        .where("id_chefe", "==", uid)
        .where("id_roteiro", "==", idRoteiro)
        .limit(1);
      const auditoriaSnap = await tx.get(auditoriaQuery);
      if (auditoriaSnap.empty) {
        throw new HttpsError("permission-denied", "Chefe sem escopo de auditoria para este roteiro.");
      }
      via = "CHEFE_Q13";
    } else {
      throw new HttpsError("permission-denied", "Usuário não possui acesso ao roteiro.");
    }

    const file = admin.storage().bucket().file(referencia.storage_path);
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutos
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
