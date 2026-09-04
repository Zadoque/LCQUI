import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { validarPermissao } from "./auth";

export const criarRequisicaoEdicaoBem = onCall(async (request) => {
  validarPermissao(request, ["Professor"]);
  const dados = request.data as { idBemPatrimonial: string; novoNome?: string; novoStatus?: string; novoEstadoConservacao?: string; novoIdLocal?: string; motivo: string };

  const lockId = `bem_edicao_${dados.idBemPatrimonial}`;
  const lockRef = admin.firestore().collection("Locks_Requisicao_Patrimonio").doc(lockId);
  const reqRef  = admin.firestore().collection("Requisicao_Edicao_Bem_Patrimonial").doc();

  return admin.firestore().runTransaction(async (tx) => {
    const lockSnap = await tx.get(lockRef);
    if (lockSnap.exists) {
      throw new HttpsError("failed-precondition", "Já existe uma requisição de edição pendente para este bem.");
    }
    tx.set(lockRef, { criado_em: admin.firestore.FieldValue.serverTimestamp() });
    tx.set(reqRef, {
      id_bem_patrimonial: dados.idBemPatrimonial,
      novo_nome: dados.novoNome ?? null,
      novo_status: dados.novoStatus ?? null,
      novo_estado_conservacao: dados.novoEstadoConservacao ?? null,
      novo_id_local: dados.novoIdLocal ?? null,
      motivo: dados.motivo,
      status: "pendente",
      feita_em: admin.firestore.FieldValue.serverTimestamp(),
      id_usuario_solicitante: request.auth!.uid,
    });
    return { idRequisicao: reqRef.id };
  });
});

export const responderRequisicaoEdicaoBem = onCall(async (request) => {
  validarPermissao(request, ["Chefe_Geral", "Gestor_Bens_Patrimoniais"]);
  const { idRequisicao, aprovar, justificativa } = request.data as { idRequisicao: string; aprovar: boolean; justificativa: string };
  const reqRef = admin.firestore().collection("Requisicao_Edicao_Bem_Patrimonial").doc(idRequisicao);

  return admin.firestore().runTransaction(async (tx) => {
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists) throw new HttpsError("not-found", "Requisição não encontrada.");
    const req = reqSnap.data()!;
    if (req.status !== "pendente") {
      throw new HttpsError("failed-precondition", "Requisição já foi respondida.");
    }

    const lockRef = admin.firestore().collection("Locks_Requisicao_Patrimonio")
      .doc(`bem_edicao_${req.id_bem_patrimonial}`);
    tx.delete(lockRef);

    tx.update(reqRef, {
      status: aprovar ? "aprovada" : "rejeitada",
      respondida_em: admin.firestore.FieldValue.serverTimestamp(),
      id_usuario_respondente: request.auth!.uid,
      justificativa_resposta: justificativa,
    });

    if (aprovar) {
      const bemRef = admin.firestore().collection("Bem_Patrimonial").doc(req.id_bem_patrimonial);
      const bemSnap = await tx.get(bemRef);
      if (!bemSnap.exists) throw new HttpsError("not-found", "Bem patrimonial não encontrado.");

      const camposBem: Record<string, unknown> = {};
      if (req.novo_status) camposBem.status = req.novo_status;
      if (req.novo_estado_conservacao) camposBem.estado_conservacao = req.novo_estado_conservacao;
      if (req.novo_id_local) camposBem.id_local = req.novo_id_local;

      if (req.novo_nome) {
        camposBem.nome_equipamento = req.novo_nome;
      }

      tx.update(bemRef, camposBem);
    }
    return { status: aprovar ? "aprovada" : "rejeitada" };
  });
});

export const criarRequisicaoAdicaoBem = onCall(async (request) => {
  validarPermissao(request, ["Professor"]);

  const dados = request.data as {
    numeroPatrimonioProposto: string;
    estadoConservacaoProposto: string;
    idLocal: string;
    nomeResponsavelProposto: string;
    idResumoBemPatrimonial?: string;
    nomeResumoProposto?: string;
    descricaoResumoProposta?: string;
    motivo: string;
  };

  const checkBem = await admin.firestore().collection("Bem_Patrimonial")
    .where("numero_patrimonio", "==", dados.numeroPatrimonioProposto)
    .limit(1).get();
  if (!checkBem.empty) {
    throw new HttpsError("failed-precondition", "Já existe um bem cadastrado com este número de patrimônio.");
  }

  const lockId = `bem_adicao_${dados.numeroPatrimonioProposto}`;
  const lockRef = admin.firestore().collection("Locks_Requisicao_Patrimonio").doc(lockId);
  const reqRef  = admin.firestore().collection("Requisicao_Adicao_Bem_Patrimonial").doc();

  return admin.firestore().runTransaction(async (tx) => {
    const lockSnap = await tx.get(lockRef);
    if (lockSnap.exists) {
      throw new HttpsError("failed-precondition", "Já existe requisição pendente para este número de patrimônio.");
    }
    tx.set(lockRef, { criado_em: admin.firestore.FieldValue.serverTimestamp() });
    tx.set(reqRef, {
      numero_patrimonio_proposto: dados.numeroPatrimonioProposto,
      estado_conservacao_proposto: dados.estadoConservacaoProposto,
      photo_url_proposta: null,
      nome_responsavel_proposto: dados.nomeResponsavelProposto,
      id_local: dados.idLocal,
      id_resumo_bem_patrimonial: dados.idResumoBemPatrimonial ?? null,
      nome_resumo_proposto: dados.nomeResumoProposto ?? null,
      descricao_resumo_proposta: dados.descricaoResumoProposta ?? null,
      motivo: dados.motivo,
      status: "pendente",
      feita_em: admin.firestore.FieldValue.serverTimestamp(),
      id_usuario_solicitante: request.auth!.uid,
      respondida_em: null,
      id_usuario_respondente: null,
    });
    return { idRequisicao: reqRef.id };
  });
});

export const responderRequisicaoAdicaoBem = onCall(async (request) => {
  validarPermissao(request, ["Chefe_Geral", "Gestor_Bens_Patrimoniais"]);
  const { idRequisicao, aprovar, justificativa } = request.data as { idRequisicao: string; aprovar: boolean; justificativa: string };
  const reqRef = admin.firestore().collection("Requisicao_Adicao_Bem_Patrimonial").doc(idRequisicao);

  return admin.firestore().runTransaction(async (tx) => {
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists) throw new HttpsError("not-found", "Requisição não encontrada.");
    const req = reqSnap.data()!;
    if (req.status !== "pendente") throw new HttpsError("failed-precondition", "Requisição já respondida.");

    const lockRef = admin.firestore().collection("Locks_Requisicao_Patrimonio")
      .doc(`bem_adicao_${req.numero_patrimonio_proposto}`);
    tx.delete(lockRef);

    let idBemCriado: string | null = null;

    if (aprovar) {
      let idResumo = req.id_resumo_bem_patrimonial;
      let nomeEquipamento = req.nome_resumo_proposto ?? "Equipamento";

      if (!idResumo && req.nome_resumo_proposto) {
        const novoResumoRef = admin.firestore().collection("Resumo_Bem_Patrimonial").doc();
        tx.set(novoResumoRef, {
          nome: req.nome_resumo_proposto,
          descricao: req.descricao_resumo_proposta ?? "",
          criado_em: admin.firestore.FieldValue.serverTimestamp(),
        });
        idResumo = novoResumoRef.id;
      }

      if (!idResumo) throw new HttpsError("failed-precondition", "A aprovação exige vincular um resumo.");

      const localRef = admin.firestore().collection("Local").doc(req.id_local);
      const localSnap = await tx.get(localRef);
      if (!localSnap.exists) throw new HttpsError("failed-precondition", "O local indicado não existe.");
      const localData = localSnap.data()!;

      if (req.id_resumo_bem_patrimonial) {
        const resumoRef = admin.firestore().collection("Resumo_Bem_Patrimonial").doc(req.id_resumo_bem_patrimonial);
        const resumoSnap = await tx.get(resumoRef);
        if (!resumoSnap.exists) throw new HttpsError("failed-precondition", "Resumo de bem não encontrado.");
        nomeEquipamento = resumoSnap.data()!.nome;
      }

      let letra = nomeEquipamento.charAt(0).toUpperCase();
      if (!/[A-Z]/.test(letra)) letra = letra; // stays what it is

      const bemRef = admin.firestore().collection("Bem_Patrimonial").doc();
      idBemCriado = bemRef.id;

      tx.set(bemRef, {
        id_resumo_bem_patrimonial: idResumo,
        nome_equipamento: nomeEquipamento,
        letra_inicial_nome: letra,
        predio: localData.predio,
        numero_patrimonio: req.numero_patrimonio_proposto,
        estado_conservacao: req.estado_conservacao_proposto,
        id_local: req.id_local,
        photo_url: req.photo_url_proposta ?? "https://placeholder",
        documento_dado_baixa_pdf_url: null,
        nome_responsavel_sei: req.nome_responsavel_proposto,
        status: "Ativo",
        cadastrado_em: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.update(reqRef, {
        status: "aprovada",
        respondida_em: admin.firestore.FieldValue.serverTimestamp(),
        id_usuario_respondente: request.auth!.uid,
        id_bem_patrimonial_se_aprovado: idBemCriado,
        justificativa_resposta: justificativa,
      });
    } else {
      tx.update(reqRef, {
        status: "rejeitada",
        respondida_em: admin.firestore.FieldValue.serverTimestamp(),
        id_usuario_respondente: request.auth!.uid,
        justificativa_resposta: justificativa,
      });
    }

    return { status: aprovar ? "aprovada" : "rejeitada", idBemCriado };
  });
});

export const onResumoBemPatrimonialNomeAtualizado = onDocumentUpdated(
  "Resumo_Bem_Patrimonial/{resumoId}",
  async (event) => {
    const antes = event.data?.before.data();
    const depois = event.data?.after.data();
    if (!antes || !depois || antes.nome === depois.nome) return;

    const bens = await admin.firestore().collection("Bem_Patrimonial")
      .where("id_resumo_bem_patrimonial", "==", event.params.resumoId)
      .get();

    const chunks = [];
    for (let i = 0; i < bens.docs.length; i += 400) {
      chunks.push(bens.docs.slice(i, i + 400));
    }
    for (const chunk of chunks) {
      const batch = admin.firestore().batch();
      chunk.forEach((bem) => batch.update(bem.ref, { nome_equipamento: depois.nome }));
      await batch.commit();
    }
  }
);

export const onLocalAtualizado = onDocumentUpdated(
  "Local/{localId}",
  async (event) => {
    const antes = event.data?.before.data();
    const depois = event.data?.after.data();
    if (!antes || !depois) return;
    if (antes.predio === depois.predio && antes.andar === depois.andar && antes.sala === depois.sala) return;

    const bens = await admin.firestore().collection("Bem_Patrimonial")
      .where("id_local", "==", event.params.localId)
      .get();

    const chunks = [];
    for (let i = 0; i < bens.docs.length; i += 400) {
      chunks.push(bens.docs.slice(i, i + 400));
    }
    for (const chunk of chunks) {
      const batch = admin.firestore().batch();
      chunk.forEach((bem) => batch.update(bem.ref, {
        predio: depois.predio,
        andar: depois.andar,
        sala: depois.sala,
      }));
      await batch.commit();
    }
  }
);

export const limparLocksOrfaos = onSchedule("every 24 hours", async (event) => {
  const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const locks = await admin.firestore().collection("Locks_Requisicao_Patrimonio")
    .where("criado_em", "<", ontem)
    .get();

  for (const doc of locks.docs) {
    const lockId = doc.id;
    let pendente = false;

    if (lockId.startsWith("bem_edicao_")) {
      const idBem = lockId.replace("bem_edicao_", "");
      const reqs = await admin.firestore().collection("Requisicao_Edicao_Bem_Patrimonial")
        .where("id_bem_patrimonial", "==", idBem)
        .where("status", "==", "pendente")
        .limit(1)
        .get();
      if (!reqs.empty) pendente = true;
    } else if (lockId.startsWith("bem_adicao_")) {
      const numProposto = lockId.replace("bem_adicao_", "");
      const reqs = await admin.firestore().collection("Requisicao_Adicao_Bem_Patrimonial")
        .where("numero_patrimonio_proposto", "==", numProposto)
        .where("status", "==", "pendente")
        .limit(1)
        .get();
      if (!reqs.empty) pendente = true;
    }

    if (!pendente) {
      await doc.ref.delete();
    }
  }
});
