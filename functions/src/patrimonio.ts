import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { extrairClaimsAutoridade, resolverAutoridadePersistidaTx } from "./auth";
import { construirIdentidade, registrarOperacaoConcluidaTx, resolverOperacaoTx } from "./idempotencia";
import { validatePayload } from "./utils/validation";
import { CriarRequisicaoEdicaoBemSchema, ResponderRequisicaoBemSchema, CriarRequisicaoAdicaoBemSchema, GerenciarLocalSchema } from "./schemas/patrimonio.schema";
import { adicionarNotificacaoTx } from "./notificacoes";
import { chaveLocal as derivarChaveLocal } from "./chaves";

const STATUS_BEM = ["Ativo", "Inservivel", "Ja_dado_baixa"] as const;
const CONSERVACOES = ["BOM", "REGULAR", "RUIM"] as const;

function normalizarPlaqueta(valor: string): string {
  const normalizada = valor.trim().toUpperCase();
  if (!normalizada || normalizada.length > 30) {
    throw new HttpsError("invalid-argument", "Plaqueta vazia ou maior que 30 caracteres.");
  }
  return normalizada;
}

function chavePlaqueta(normalizada: string) {
  return admin.firestore().collection("Chaves_Unicas").doc(`Bem_Patrimonial__${normalizada}`);
}

function validarConservacao(valor: unknown): typeof CONSERVACOES[number] {
  if (!CONSERVACOES.includes(valor as typeof CONSERVACOES[number])) {
    throw new HttpsError("invalid-argument", "Estado de conservação inválido.");
  }
  return valor as typeof CONSERVACOES[number];
}

function validarStatus(valor: unknown): typeof STATUS_BEM[number] {
  if (!STATUS_BEM.includes(valor as typeof STATUS_BEM[number])) {
    throw new HttpsError("invalid-argument", "Status patrimonial inválido.");
  }
  return valor as typeof STATUS_BEM[number];
}

async function validarFoto(storagePath: unknown, ownerUid?: string): Promise<string> {
  if (typeof storagePath !== "string" || !storagePath) {
    throw new HttpsError("failed-precondition", "Foto do bem é obrigatória.");
  }
  if (ownerUid && !storagePath.startsWith(`requisicoes/${ownerUid}/`)) {
    throw new HttpsError("permission-denied", "A foto não pertence ao namespace do solicitante.");
  }
  const file = admin.storage().bucket().file(storagePath);
  const [existe] = await file.exists();
  if (!existe) throw new HttpsError("failed-precondition", "Foto do bem não encontrada.");
  const [metadata] = await file.getMetadata();
  const tamanho = Number(metadata.size ?? 0);
  if (tamanho >= 5 * 1024 * 1024 || !String(metadata.contentType ?? "").startsWith("image/")) {
    throw new HttpsError("failed-precondition", "Foto inválida: imagem inferior a 5 MiB é obrigatória.");
  }
  return storagePath;
}

export const criarRequisicaoEdicaoBem = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const dados = validatePayload(CriarRequisicaoEdicaoBemSchema, request.data);
  if (dados.novaPhotoUrl) await validarFoto(dados.novaPhotoUrl, claims.uid);

  const lockId = `bem_edicao_${dados.idBemPatrimonial}`;
  const lockRef = admin.firestore().collection("Locks_Requisicao_Patrimonio").doc(lockId);
  const reqRef  = admin.firestore().collection("Requisicao_Edicao_Bem_Patrimonial").doc();

  return admin.firestore().runTransaction(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Professor"]);
    const bemRef = admin.firestore().collection("Bem_Patrimonial").doc(dados.idBemPatrimonial);
    const bemSnap = await tx.get(bemRef);
    if (!bemSnap.exists) throw new HttpsError("not-found", "Bem patrimonial não encontrado.");
    const versaoOrigem = bemSnap.data()?.versao;
    if (!Number.isInteger(versaoOrigem) || versaoOrigem < 1) {
      throw new HttpsError("failed-precondition", "Bem patrimonial sem versão válida.");
    }
    const lockSnap = await tx.get(lockRef);
    if (lockSnap.exists) {
      throw new HttpsError("failed-precondition", "Já existe uma requisição de edição pendente para este bem.");
    }

    const gestoresSnap = await tx.get(admin.firestore().collection("Gestor_Bens_Patrimoniais"));
    
    tx.set(lockRef, {
      id_requisicao: reqRef.id,
      tipo: "EDICAO",
      chave_recurso: dados.idBemPatrimonial,
      criado_em: FieldValue.serverTimestamp(),
    });
    tx.set(reqRef, {
      id_bem_patrimonial: dados.idBemPatrimonial,
      novo_nome: dados.novoNome ?? null,
      novo_id_resumo_bem_patrimonial: dados.novoIdResumoBemPatrimonial ?? null,
      novo_status: dados.novoStatus ?? null,
      novo_estado_conservacao: dados.novoEstadoConservacao ?? null,
      novo_id_local: dados.novoIdLocal ?? null,
      nova_photo_url: dados.novaPhotoUrl ?? null,
      versao_bem_origem: versaoOrigem,
      motivo: dados.motivo,
      status: "pendente",
      feita_em: FieldValue.serverTimestamp(),
      id_usuario_solicitante: request.auth!.uid,
    });

    gestoresSnap.docs.forEach(gestor => {
      adicionarNotificacaoTx(tx, admin.firestore(), {
        id_destinatario: gestor.id,
        papel_destinatario: "Gestor_Bens_Patrimoniais",
        tipo: "REQUISICAO_EDICAO_BEM",
        id_quem_fez_acao: request.auth!.uid,
        entidade_alvo: "Bem_Patrimonial",
        id_alvo: dados.idBemPatrimonial,
      });
    });

    return { idRequisicao: reqRef.id };
  });
});

export const responderRequisicaoEdicaoBem = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idRequisicao, aprovar, justificativa } = validatePayload(ResponderRequisicaoBemSchema, request.data);
  const reqRef = admin.firestore().collection("Requisicao_Edicao_Bem_Patrimonial").doc(idRequisicao);

  return admin.firestore().runTransaction(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Chefe_Geral", "Gestor_Bens_Patrimoniais"]);
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists) throw new HttpsError("not-found", "Requisição não encontrada.");
    const req = reqSnap.data()!;
    if (req.status !== "pendente") {
      throw new HttpsError("failed-precondition", "Requisição já foi respondida.");
    }

    const bemRef = admin.firestore().collection("Bem_Patrimonial").doc(req.id_bem_patrimonial);
    const bemSnap = aprovar ? await tx.get(bemRef) : null;
    if (aprovar && !bemSnap?.exists) throw new HttpsError("not-found", "Bem patrimonial não encontrado.");

    const lockRef = admin.firestore().collection("Locks_Requisicao_Patrimonio")
      .doc(`bem_edicao_${req.id_bem_patrimonial}`);
    const lockSnap = await tx.get(lockRef);
    if (!lockSnap.exists || lockSnap.data()?.id_requisicao !== idRequisicao || lockSnap.data()?.tipo !== "EDICAO") {
      throw new HttpsError("failed-precondition", "Lock da requisição de edição ausente ou incompatível.");
    }
    if (aprovar) {
      const bem = bemSnap!.data()!;
      if (bem.versao !== req.versao_bem_origem || !Number.isInteger(bem.versao) || bem.versao < 1) {
        throw new HttpsError("failed-precondition", "Versão do bem mudou; a requisição não pode sobrescrever a edição.");
      }
      const camposBem: Record<string, unknown> = {};
      const statusAtual = validarStatus(bem.status);
      if (req.novo_status) {
        const novoStatus = validarStatus(req.novo_status);
        if (statusAtual === "Ja_dado_baixa" || (statusAtual === "Ativo" && novoStatus === "Ja_dado_baixa") || (statusAtual === "Inservivel" && novoStatus === "Ativo")) {
          throw new HttpsError("failed-precondition", "Transição de status patrimonial inválida.");
        }
        camposBem.status = novoStatus;
      }
      if (req.novo_estado_conservacao) camposBem.estado_conservacao = validarConservacao(req.novo_estado_conservacao);
      if (req.novo_id_local) {
        const localSnap = await tx.get(admin.firestore().collection("Local").doc(req.novo_id_local));
        if (!localSnap.exists) throw new HttpsError("failed-precondition", "O novo local não existe.");
        const local = localSnap.data()!;
        camposBem.id_local = req.novo_id_local;
        camposBem.predio = local.predio;
        camposBem.andar = local.andar;
        camposBem.sala = local.sala;
      }
      if (req.nova_photo_url) camposBem.photo_url = req.nova_photo_url;
      if (req.novo_id_resumo_bem_patrimonial) {
        const resumoSnap = await tx.get(admin.firestore().collection("Resumo_Bem_Patrimonial").doc(req.novo_id_resumo_bem_patrimonial));
        if (!resumoSnap.exists) throw new HttpsError("failed-precondition", "Resumo de bem não encontrado.");
        camposBem.id_resumo_bem_patrimonial = req.novo_id_resumo_bem_patrimonial;
        camposBem.nome_equipamento = resumoSnap.data()!.nome;
        camposBem.letra_inicial_nome = String(resumoSnap.data()!.nome).charAt(0).toUpperCase();
      } else if (req.novo_nome) {
        throw new HttpsError("failed-precondition", "Reclassificação exige novo resumo, não nome avulso.");
      }
      const alteracoes = Object.keys(camposBem).map((campo) => ({ campo, valor_anterior: String(bem[campo] ?? ""), valor_novo: String(camposBem[campo] ?? "") }));
      if (alteracoes.length === 0) throw new HttpsError("invalid-argument", "A edição não contém alterações.");
      camposBem.versao = bem.versao + 1;
      tx.update(bemRef, camposBem);
      tx.set(bemRef.collection("Historico_Patrimonio").doc(), {
        id_bem_patrimonial: bemRef.id,
        tipo: "edicao",
        id_usuario: request.auth!.uid,
        timestamp: FieldValue.serverTimestamp(),
        predio: bem.predio ?? null,
        andar: bem.andar ?? null,
        sala: bem.sala ?? null,
        alteracoes,
      });
    }
    tx.delete(lockRef);
    tx.update(reqRef, {
      status: aprovar ? "aprovada" : "rejeitada",
      respondida_em: FieldValue.serverTimestamp(),
      id_usuario_respondente: request.auth!.uid,
      justificativa_resposta: justificativa,
    });
    adicionarNotificacaoTx(tx, admin.firestore(), {
      id_destinatario: req.id_usuario_solicitante,
      papel_destinatario: "Professor",
      tipo: "REQUISICAO_EDICAO_BEM",
      id_quem_fez_acao: request.auth!.uid,
      entidade_alvo: "Requisicao_Bem",
      id_alvo: idRequisicao,
      mensagem_customizada: justificativa,
    });
    return { status: aprovar ? "aprovada" : "rejeitada" };
  });
});

export const criarRequisicaoAdicaoBem = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);

  const dados = validatePayload(CriarRequisicaoAdicaoBemSchema, request.data);
  const numeroNormalizado = normalizarPlaqueta(dados.numeroPatrimonioProposto);

  const checkBem = await admin.firestore().collection("Bem_Patrimonial")
    .where("numero_patrimonio", "==", numeroNormalizado)
    .limit(1).get();
  if (!checkBem.empty) {
    throw new HttpsError("failed-precondition", "Já existe um bem cadastrado com este número de patrimônio.");
  }

  const lockId = `bem_adicao_${numeroNormalizado}`;
  const lockRef = admin.firestore().collection("Locks_Requisicao_Patrimonio").doc(lockId);
  const reqRef  = admin.firestore().collection("Requisicao_Adicao_Bem_Patrimonial").doc();

  return admin.firestore().runTransaction(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Professor"]);
    const lockSnap = await tx.get(lockRef);
    if (lockSnap.exists) {
      throw new HttpsError("failed-precondition", "Já existe requisição pendente para este número de patrimônio.");
    }
    const gestoresSnap = await tx.get(admin.firestore().collection("Gestor_Bens_Patrimoniais"));

    tx.set(lockRef, {
      id_requisicao: reqRef.id,
      tipo: "ADICAO",
      chave_recurso: numeroNormalizado,
      criado_em: FieldValue.serverTimestamp(),
    });
    tx.set(reqRef, {
      numero_patrimonio_proposto: dados.numeroPatrimonioProposto,
      numero_patrimonio_normalizado: numeroNormalizado,
      estado_conservacao_proposto: dados.estadoConservacaoProposto,
      photo_url_proposta: dados.photoUrlProposta,
      nome_responsavel_proposto: dados.nomeResponsavelProposto,
      id_local: dados.idLocal,
      id_resumo_bem_patrimonial: dados.idResumoBemPatrimonial ?? null,
      nome_resumo_proposto: dados.nomeResumoProposto ?? null,
      descricao_resumo_proposta: dados.descricaoResumoProposta ?? null,
      motivo: dados.motivo,
      status: "pendente",
      feita_em: FieldValue.serverTimestamp(),
      id_usuario_solicitante: request.auth!.uid,
      respondida_em: null,
      id_usuario_respondente: null,
    });

    gestoresSnap.docs.forEach(gestor => {
      adicionarNotificacaoTx(tx, admin.firestore(), {
        id_destinatario: gestor.id,
        papel_destinatario: "Gestor_Bens_Patrimoniais",
        tipo: "REQUISICAO_ADICAO_BEM",
        id_quem_fez_acao: request.auth!.uid,
        entidade_alvo: "Requisicao_Bem",
        id_alvo: reqRef.id,
      });
    });

    return { idRequisicao: reqRef.id };
  });
});

export const responderRequisicaoAdicaoBem = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idRequisicao, aprovar, justificativa } = validatePayload(ResponderRequisicaoBemSchema, request.data);
  const reqRef = admin.firestore().collection("Requisicao_Adicao_Bem_Patrimonial").doc(idRequisicao);

  if (aprovar) {
    const reqPre = await reqRef.get();
    await validarFoto(reqPre.data()?.photo_url_proposta, reqPre.data()?.id_usuario_solicitante);
  }

  return admin.firestore().runTransaction(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Chefe_Geral", "Gestor_Bens_Patrimoniais"]);
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists) throw new HttpsError("not-found", "Requisição não encontrada.");
    const req = reqSnap.data()!;
    if (req.status !== "pendente") throw new HttpsError("failed-precondition", "Requisição já respondida.");

    const numeroNormalizado = typeof req.numero_patrimonio_normalizado === "string"
      ? normalizarPlaqueta(req.numero_patrimonio_normalizado)
      : normalizarPlaqueta(req.numero_patrimonio_proposto);
    const lockRef = admin.firestore().collection("Locks_Requisicao_Patrimonio")
      .doc(`bem_adicao_${numeroNormalizado}`);
    const lockSnap = await tx.get(lockRef);
    if (!lockSnap.exists || lockSnap.data()?.id_requisicao !== idRequisicao || lockSnap.data()?.tipo !== "ADICAO" || lockSnap.data()?.chave_recurso !== numeroNormalizado) {
      throw new HttpsError("failed-precondition", "Lock da requisição de adição ausente ou incompatível.");
    }
    const chaveRef = chavePlaqueta(numeroNormalizado);
    const chaveSnap = await tx.get(chaveRef);
    if (aprovar && chaveSnap.exists) throw new HttpsError("already-exists", "A plaqueta já está reservada permanentemente.");
    let idBemCriado: string | null = null;

    if (aprovar) {
      let idResumo = req.id_resumo_bem_patrimonial;
      let nomeEquipamento = req.nome_resumo_proposto ?? "Equipamento";

      if (!idResumo && req.nome_resumo_proposto) {
        if (typeof req.descricao_resumo_proposta !== "string" || !req.descricao_resumo_proposta.trim()) {
          throw new HttpsError("failed-precondition", "Novo resumo exige descrição.");
        }
        const novoResumoRef = admin.firestore().collection("Resumo_Bem_Patrimonial").doc();
        tx.set(novoResumoRef, {
          nome: req.nome_resumo_proposto,
          descricao: req.descricao_resumo_proposta,
          letra_inicial_nome: String(req.nome_resumo_proposto).charAt(0).toUpperCase(),
          criado_em: FieldValue.serverTimestamp(),
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

      const letra = nomeEquipamento.charAt(0).toUpperCase();

      const bemRef = admin.firestore().collection("Bem_Patrimonial").doc();
      idBemCriado = bemRef.id;

      tx.set(bemRef, {
        id: bemRef.id,
        id_resumo_bem_patrimonial: idResumo,
        nome_equipamento: nomeEquipamento,
        letra_inicial_nome: letra,
        predio: localData.predio,
        andar: localData.andar,
        sala: localData.sala,
        numero_patrimonio: numeroNormalizado,
        estado_conservacao: req.estado_conservacao_proposto,
        id_local: req.id_local,
        photo_url: req.photo_url_proposta,
        documento_dado_baixa_pdf_url: null,
        nome_responsavel_sei: req.nome_responsavel_proposto,
        status: "Ativo",
        descricao_complementar: null,
        versao: 1,
        cadastrado_em: FieldValue.serverTimestamp(),
      });
      tx.set(chaveRef, { tipo: "Bem_Patrimonial", id_recurso: bemRef.id, chave_recurso: numeroNormalizado, criado_em: FieldValue.serverTimestamp() });
      tx.set(bemRef.collection("Historico_Patrimonio").doc(), {
        id_bem_patrimonial: bemRef.id,
        tipo: "cadastro",
        id_usuario: request.auth!.uid,
        timestamp: FieldValue.serverTimestamp(),
        predio: localData.predio,
        andar: localData.andar,
        sala: localData.sala,
        alteracoes: [],
      });

      tx.delete(lockRef);
      tx.update(reqRef, {
        status: "aprovada",
        respondida_em: FieldValue.serverTimestamp(),
        id_usuario_respondente: request.auth!.uid,
        id_bem_patrimonial_se_aprovado: idBemCriado,
        justificativa_resposta: justificativa,
      });
    } else {
      tx.delete(lockRef);
      tx.update(reqRef, {
        status: "rejeitada",
        respondida_em: FieldValue.serverTimestamp(),
        id_usuario_respondente: request.auth!.uid,
        justificativa_resposta: justificativa,
      });
    }

    adicionarNotificacaoTx(tx, admin.firestore(), {
      id_destinatario: req.id_usuario_solicitante,
      papel_destinatario: "Professor",
      tipo: "REQUISICAO_ADICAO_BEM",
      id_quem_fez_acao: request.auth!.uid,
      entidade_alvo: "Requisicao_Bem",
      id_alvo: idRequisicao,
      mensagem_customizada: justificativa,
    });

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

/** N(s) para unicidade de Local: apenas trim (sem inventar case-folding). */
function chaveLocal(predio: string, andar: string, sala: string) {
  return admin.firestore().collection("Chaves_Unicas").doc(derivarChaveLocal(predio, andar, sala));
}

// UI-03: criação/edição server-owned de Local com unicidade (prédio, andar, sala),
// M9 persistido e M7. A propagação para Bem_Patrimonial é feita pelo trigger
// `onLocalAtualizado` na alteração de endereço.
export const gerenciarLocal = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const dados = validatePayload(GerenciarLocalSchema, request.data);
  const predio = dados.predio.trim();
  const andar = dados.andar.trim();
  const sala = dados.sala.trim();

  const db = admin.firestore();
  const novaChaveRef = chaveLocal(predio, andar, sala);

  return db.runTransaction(async (tx) => {
    // M9: autoridade persistida relida na transação.
    await resolverAutoridadePersistidaTx(tx, claims, ["Gestor_Bens_Patrimoniais", "Chefe_Geral"]);

    if (dados.acao === "CRIAR") {
      const identidade = construirIdentidade(claims.uid, "CRIAR_LOCAL", { predio, andar, sala });
      const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
      if (decisao.estado === "REPLAY") return decisao.resultado as { id: string };
      if (decisao.estado !== "NOVA") {
        throw new HttpsError("failed-precondition", "Operação de criação de local não concluída.");
      }
      const chave = await tx.get(novaChaveRef);
      if (chave.exists) {
        throw new HttpsError("already-exists", "Já existe um local com este prédio, andar e sala.");
      }
      const localRef = db.collection("Local").doc();
      tx.set(localRef, {
        predio,
        andar,
        sala,
        criado_por: claims.uid,
        criado_em: FieldValue.serverTimestamp(),
      });
      tx.set(novaChaveRef, {
        tipo: "Local",
        id_recurso: localRef.id,
        criado_em: FieldValue.serverTimestamp(),
      });
      const resultado = { id: localRef.id };
      registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
      return resultado;
    }

    if (!dados.idLocal) {
      throw new HttpsError("invalid-argument", "idLocal é obrigatório para editar.");
    }
    const identidade = construirIdentidade(claims.uid, "EDITAR_LOCAL", {
      idLocal: dados.idLocal,
      predio,
      andar,
      sala,
    });
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as { id: string };
    if (decisao.estado !== "NOVA") {
      throw new HttpsError("failed-precondition", "Operação de edição de local não concluída.");
    }
    const localRef = db.collection("Local").doc(dados.idLocal);
    const localSnap = await tx.get(localRef);
    if (!localSnap.exists) throw new HttpsError("not-found", "Local não encontrado.");
    const atual = localSnap.data()!;
    const predioAtual = (atual.predio as string) ?? "";
    const andarAtual = (atual.andar as string) ?? "";
    const salaAtual = (atual.sala as string) ?? "";
    const trocouEndereco = predio !== predioAtual || andar !== andarAtual || sala !== salaAtual;
    if (trocouEndereco) {
      const chave = await tx.get(novaChaveRef);
      if (chave.exists) {
        throw new HttpsError("already-exists", "Já existe um local com este prédio, andar e sala.");
      }
    }
    if (trocouEndereco) {
      tx.delete(chaveLocal(predioAtual, andarAtual, salaAtual));
      tx.set(novaChaveRef, {
        tipo: "Local",
        id_recurso: dados.idLocal,
        criado_em: FieldValue.serverTimestamp(),
      });
    }
    tx.update(localRef, { predio, andar, sala });
    const resultado = { id: dados.idLocal };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
  });
});

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

export const limparLocksOrfaos = onSchedule("every 24 hours", async () => {
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
