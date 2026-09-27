import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import {
  extrairClaimsAutoridade,
  resolverAutoridadePersistidaTx,
  validarMatrizPapeis,
  PapelConhecido,
  PAPEIS_CONHECIDOS,
} from "./auth";
import {
  construirIdentidade,
  resolverOperacaoTx,
  registrarOperacaoConcluidaTx,
} from "./idempotencia";
import { validatePayload } from "./utils/validation";
import {
  ConvidarAlunoSchema,
  AceitarConviteAlunoSchema,
  RejeitarConviteAlunoSchema,
  ObterDetalhesConviteAlunoSchema,
} from "./schemas/convites.schema";
import {
  normalizarEmailConvite,
  normalizarMatriculaConvite,
  derivarChavePendenciaConvite,
  gerarTokenConvite,
  hashTokenConvite,
  compararTokenConstantTime,
  isConviteExpirado,
  ContextoConvite,
} from "./domain/convites";
import {
  chaveAlunoMatricula,
  chaveConvitePendente,
  TIPO_CHAVE_ALUNO,
  TIPO_CHAVE_CONVITE_PENDENTE,
} from "./chaves";
import { reconciliarClaimsUsuario } from "./usuarios";

export const conviteHmacSecret = defineSecret("CONVITE_HMAC_SECRET");

export type CanalEntregaConvite = "notificacao_interna" | "firebase_auth";

/**
 * Obtém o segredo do servidor para HMAC de pendência de convite.
 * Falha fechado caso o segredo não esteja configurado.
 */
export function obterSegredoHmac(): string {
  let segredo: string | undefined;
  try {
    segredo = conviteHmacSecret.value();
  } catch {
    segredo = process.env.CONVITE_HMAC_SECRET;
  }
  if (!segredo) {
    segredo = process.env.CONVITE_HMAC_SECRET;
  }
  if (!segredo || segredo.trim().length === 0) {
    throw new HttpsError("internal", "Segredo de HMAC não configurado no servidor.");
  }
  return segredo.trim();
}

/**
 * Reconciliação transacional idempotente de expiração de convite.
 * Segue estritamente a ordenação N-12: READS FIRST -> VALIDATIONS -> WRITES.
 * Se o convite estiver pendente com prazo vencido:
 * - lê a pendência em Chaves_Unicas;
 * - atualiza status para 'expirado';
 * - remove/libera a chave determinística em Chaves_Unicas se ainda apontar para ele.
 * Retorna true se uma expiração foi materializada, false caso contrário.
 */
export async function reconciliarConviteExpiradoTx(
  tx: admin.firestore.Transaction,
  conviteRef: admin.firestore.DocumentReference,
  secret: string
): Promise<boolean> {
  // READS FIRST
  const conviteSnap = await tx.get(conviteRef);
  if (!conviteSnap.exists) return false;
  const convite = conviteSnap.data()!;

  if (convite.status !== "pendente") return false;
  if (!isConviteExpirado(convite.expira_em)) return false;

  const contexto: ContextoConvite = convite.id_turma ? "TURMA" : "GLOBAL";
  const chaveHmac = derivarChavePendenciaConvite(secret, contexto, convite.id_turma ?? null, convite.email);
  const pendenciaRef = admin.firestore().collection("Chaves_Unicas").doc(chaveConvitePendente(chaveHmac));
  const pendSnap = await tx.get(pendenciaRef);

  // WRITES
  tx.update(conviteRef, {
    status: "expirado",
    atualizado_em: FieldValue.serverTimestamp(),
  });

  if (pendSnap.exists && pendSnap.data()?.id_recurso === conviteRef.id) {
    tx.delete(pendenciaRef);
  }

  return true;
}

/**
 * Execução lógica de emissão/reenvio de convite (ACAD-005).
 * - Identifica o canal de entrega com base na existência de conta no Firebase Auth fora da transação.
 * - Se possui conta Auth ativa: emite notificação interna CONVITE_PARA_TURMA.
 * - Se não possui conta Auth: provisiona conta Auth no pós-commit e dispara fluxo de definição de senha.
 * - Se conta está desativada no Auth: fail-closed imediato.
 * - Professor dono convida para sua turma (com ou sem exceção de capacidade justificada).
 * - Chefe Geral pode emitir convite ordinário para turma ativa de qualquer professor (sem assumir ownership e sem exceção de capacidade).
 */
export async function executarConvidarAluno(
  dados: {
    idOperacao: string;
    email: string;
    idTurma?: string | null;
    matricula?: string | null;
    excederCapacidade?: boolean;
    justificativaExcecao?: string | null;
  },
  request: CallableRequest,
  segredoInjetado?: string
): Promise<{
  id: string;
  registrado: boolean;
  reenvio: boolean;
  canal_entrega: CanalEntregaConvite;
  tokenEfemero?: string;
}> {
  const claims = extrairClaimsAutoridade(request);
  const secret = segredoInjetado ?? obterSegredoHmac();

  const emailNormalizado = normalizarEmailConvite(dados.email);
  const matriculaNormalizada = normalizarMatriculaConvite(dados.matricula);
  const contexto: ContextoConvite = dados.idTurma && dados.idTurma.trim().length > 0 ? "TURMA" : "GLOBAL";
  const idTurmaFinal = contexto === "TURMA" ? dados.idTurma!.trim() : null;
  const excederCapacidade = Boolean(dados.excederCapacidade);
  const justificativaExcecao = dados.justificativaExcecao?.trim() || null;

  if (excederCapacidade && !justificativaExcecao) {
    throw new HttpsError("invalid-argument", "Justificativa de exceção é obrigatória quando exceder_capacidade for true.");
  }
  if (excederCapacidade && contexto !== "TURMA") {
    throw new HttpsError("invalid-argument", "Exceção de capacidade só é aplicável a convites de turma.");
  }

  // Consulta do canal de entrega no Firebase Authentication fora da transação Firestore
  let authUser: admin.auth.UserRecord | null = null;
  try {
    authUser = await admin.auth().getUserByEmail(emailNormalizado);
  } catch (err: unknown) {
    const authErr = err as { code?: string; message?: string };
    if (authErr.code !== "auth/user-not-found") {
      throw new HttpsError("internal", `Erro ao consultar Firebase Authentication: ${authErr.message || String(err)}`);
    }
  }

  // Falha fechada se a conta de destino existir mas estiver desabilitada
  if (authUser && authUser.disabled) {
    throw new HttpsError("failed-precondition", "A conta associada a este e-mail está desativada no Firebase Authentication.");
  }

  const canalEntrega: CanalEntregaConvite = authUser ? "notificacao_interna" : "firebase_auth";

  const db = admin.firestore();
  const identidade = construirIdentidade(claims.uid, "CONVIDAR_ALUNO", {
    email: emailNormalizado,
    idTurma: idTurmaFinal,
    matricula: matriculaNormalizada,
    excederCapacidade,
    justificativaExcecao,
  });

  const resultadoTx = await db.runTransaction(async (tx) => {
    // M7: Resolução de idempotência antes de efeitos
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") {
      return decisao.resultado as { id: string; registrado: boolean; reenvio: boolean; tokenEfemero?: string };
    }
    if (decisao.estado !== "NOVA") {
      throw new HttpsError("failed-precondition", "Operação de convite não concluída.");
    }

    // M9: Autoridade persistida relida na mesma transação
    const autoridade = await resolverAutoridadePersistidaTx(tx, claims, ["Professor", "Chefe_Geral"]);

    // Validações de escopo de turma
    if (contexto === "TURMA") {
      const turmaRef = db.collection("Turma").doc(idTurmaFinal!);
      const turmaSnap = await tx.get(turmaRef);
      if (!turmaSnap.exists) {
        throw new HttpsError("not-found", "Turma não encontrada.");
      }
      const turma = turmaSnap.data()!;
      if (turma.status !== "Ativo") {
        throw new HttpsError("failed-precondition", "Turma arquivada ou inativa.");
      }

      // Regra M9 reconciliada:
      // - Professor: exige ownership da turma (turma.id_professor == claims.uid).
      // - Chefe_Geral: autoridade administrativa para convite ordinário, vedada exceção de capacidade e sem alterar id_professor.
      if (autoridade.papelAutorizado === "Professor") {
        if (turma.id_professor !== claims.uid) {
          throw new HttpsError("permission-denied", "Apenas o professor dono da turma pode emitir convites para ela.");
        }
      } else if (autoridade.papelAutorizado === "Chefe_Geral") {
        if (excederCapacidade) {
          throw new HttpsError("permission-denied", "Chefe Geral não possui autorização para conceder exceção de capacidade.");
        }
      } else {
        throw new HttpsError("permission-denied", "Papel não autorizado a convidar alunos.");
      }

      // Validação fail-closed dos contadores
      const qtdAtual = turma.qtd_alunos;
      const capacidade = turma.capacidade;
      if (typeof qtdAtual !== "number" || !Number.isInteger(qtdAtual) || qtdAtual < 0) {
        throw new HttpsError("failed-precondition", "Contador de alunos inválido (fail-closed).");
      }
      if (typeof capacidade !== "number" || !Number.isInteger(capacidade) || capacidade < 1) {
        throw new HttpsError("failed-precondition", "Capacidade da turma inválida (fail-closed).");
      }

      if (!excederCapacidade) {
        if (qtdAtual >= capacidade) {
          throw new HttpsError("failed-precondition", `A turma atingiu a capacidade máxima de ${capacidade} alunos.`);
        }
      } else {
        if (!justificativaExcecao || justificativaExcecao.length === 0) {
          throw new HttpsError("failed-precondition", "Justificativa de exceção é obrigatória.");
        }
      }
    } else {
      // Convite global: professor ou chefe geral podem emitir
      if (!["Professor", "Chefe_Geral"].includes(autoridade.papelAutorizado)) {
        throw new HttpsError("permission-denied", "Usuário sem permissão para convite global.");
      }
    }

    // Pendência determinística em Chaves_Unicas
    const chaveHmac = derivarChavePendenciaConvite(secret, contexto, idTurmaFinal, emailNormalizado);
    const pendenciaRef = db.collection("Chaves_Unicas").doc(chaveConvitePendente(chaveHmac));
    const pendenciaSnap = await tx.get(pendenciaRef);

    const agora = FieldValue.serverTimestamp();
    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + 7);

    if (pendenciaSnap.exists) {
      const pendData = pendenciaSnap.data()!;
      const idConviteExistente = pendData.id_recurso;
      if (typeof idConviteExistente !== "string" || !idConviteExistente) {
        throw new HttpsError("internal", "Lock de pendência inconsistente (id_recurso ausente).");
      }

      const conviteRef = db.collection("Convite_Aluno").doc(idConviteExistente);
      const conviteSnap = await tx.get(conviteRef);
      if (!conviteSnap.exists) {
        throw new HttpsError("internal", "Lock de pendência aponta para convite inexistente.");
      }

      const conviteData = conviteSnap.data()!;
      if (conviteData.email !== emailNormalizado || (conviteData.id_turma ?? null) !== idTurmaFinal) {
        throw new HttpsError("internal", "Lock de pendência com contexto incompatível.");
      }
      if (conviteData.status !== "pendente") {
        throw new HttpsError("internal", "Lock de pendência aponta para convite não pendente.");
      }

      // Verifica expiração do convite pendente existente
      if (isConviteExpirado(conviteData.expira_em)) {
        // Reconciliação atômica: marca o antigo como expirado e cria um novo documento
        tx.update(conviteRef, {
          status: "expirado",
          atualizado_em: agora,
        });

        const novoDocRef = db.collection("Convite_Aluno").doc();
        const { token, tokenHash } = gerarTokenConvite();

        tx.set(novoDocRef, {
          id_turma: idTurmaFinal,
          email: emailNormalizado,
          convidado_em: agora,
          status: "pendente",
          expira_em: Timestamp.fromDate(expiraEm),
          convidado_por: claims.uid,
          numero_matricula: matriculaNormalizada,
          token_hash: tokenHash,
          ultimo_reenvio_por: null,
          exceder_capacidade: excederCapacidade,
          justificativa_excecao: excederCapacidade ? justificativaExcecao : null,
          aceitado_por: null,
          aceitado_em: null,
          rejeitado_por: null,
          rejeitado_em: null,
        });

        tx.set(pendenciaRef, {
          tipo: TIPO_CHAVE_CONVITE_PENDENTE,
          id_recurso: novoDocRef.id,
          criado_em: agora,
        });

        // Se destinatário possui conta Auth: emite notificação interna M13
        if (authUser) {
          const notifRef = db.collection("Usuarios").doc(authUser.uid).collection("Notificacoes").doc(novoDocRef.id);
          tx.set(notifRef, {
            id: novoDocRef.id,
            id_usuario: authUser.uid,
            tipo: "CONVITE_PARA_TURMA",
            papel_destinatario: "Aluno",
            entidade_alvo: "Convite_Aluno",
            id_alvo: novoDocRef.id,
            id_turma: idTurmaFinal,
            id_quem_fez_acao: claims.uid,
            expira_em: Timestamp.fromDate(expiraEm),
            criado_em: agora,
            lida: false,
            resumo: "Convite para ingresso em turma",
          });
        }

        const resultado = {
          id: novoDocRef.id,
          registrado: true,
          reenvio: false,
        };
        registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);

        tx.set(db.collection("Registro_de_Auditoria").doc(`convite_${dados.idOperacao}`), {
          id_usuario: claims.uid,
          acao: "EMISSAO_CONVITE_POS_EXPIRACAO",
          tipo_entidade_sofre_acao: "CONVITE_ALUNO",
          id_do_objeto_da_entidade: novoDocRef.id,
          acao_feita_em: agora,
          metadata: {
            id_turma: idTurmaFinal,
            email: emailNormalizado,
            convite_anterior_expirado: idConviteExistente,
            canal_entrega: canalEntrega,
          },
        });

        return { ...resultado, tokenEfemero: token };
      }

      // Reenvio sobre o mesmo convite pendente não expirado
      const { token, tokenHash } = gerarTokenConvite();
      tx.update(conviteRef, {
        token_hash: tokenHash,
        expira_em: Timestamp.fromDate(expiraEm),
        ultimo_reenvio_por: claims.uid,
        atualizado_em: agora,
      });

      if (authUser) {
        const notifRef = db.collection("Usuarios").doc(authUser.uid).collection("Notificacoes").doc(idConviteExistente);
        tx.set(
          notifRef,
          {
            id: idConviteExistente,
            id_usuario: authUser.uid,
            tipo: "CONVITE_PARA_TURMA",
            papel_destinatario: "Aluno",
            entidade_alvo: "Convite_Aluno",
            id_alvo: idConviteExistente,
            id_turma: idTurmaFinal,
            id_quem_fez_acao: claims.uid,
            expira_em: Timestamp.fromDate(expiraEm),
            criado_em: agora,
            lida: false,
            resumo: "Convite para ingresso em turma",
          },
          { merge: true }
        );
      }

      const resultado = {
        id: idConviteExistente,
        registrado: true,
        reenvio: true,
      };
      registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);

      tx.set(db.collection("Registro_de_Auditoria").doc(`convite_${dados.idOperacao}`), {
        id_usuario: claims.uid,
        acao: "REENVIO_CONVITE",
        tipo_entidade_sofre_acao: "CONVITE_ALUNO",
        id_do_objeto_da_entidade: idConviteExistente,
        acao_feita_em: agora,
        metadata: {
          id_turma: idTurmaFinal,
          email: emailNormalizado,
          canal_entrega: canalEntrega,
        },
      });

      return { ...resultado, tokenEfemero: token };
    }

    // Primeiro convite (lock ausente)
    const novoDocRef = db.collection("Convite_Aluno").doc();
    const { token, tokenHash } = gerarTokenConvite();

    tx.set(novoDocRef, {
      id_turma: idTurmaFinal,
      email: emailNormalizado,
      convidado_em: agora,
      status: "pendente",
      expira_em: Timestamp.fromDate(expiraEm),
      convidado_por: claims.uid,
      numero_matricula: matriculaNormalizada,
      token_hash: tokenHash,
      ultimo_reenvio_por: null,
      exceder_capacidade: excederCapacidade,
      justificativa_excecao: excederCapacidade ? justificativaExcecao : null,
      aceitado_por: null,
      aceitado_em: null,
      rejeitado_por: null,
      rejeitado_em: null,
    });

    tx.set(pendenciaRef, {
      tipo: TIPO_CHAVE_CONVITE_PENDENTE,
      id_recurso: novoDocRef.id,
      criado_em: agora,
    });

    if (authUser) {
      const notifRef = db.collection("Usuarios").doc(authUser.uid).collection("Notificacoes").doc(novoDocRef.id);
      tx.set(notifRef, {
        id: novoDocRef.id,
        id_usuario: authUser.uid,
        tipo: "CONVITE_PARA_TURMA",
        papel_destinatario: "Aluno",
        entidade_alvo: "Convite_Aluno",
        id_alvo: novoDocRef.id,
        id_turma: idTurmaFinal,
        id_quem_fez_acao: claims.uid,
        expira_em: Timestamp.fromDate(expiraEm),
        criado_em: agora,
        lida: false,
        resumo: "Convite para ingresso em turma",
      });
    }

    const resultado = {
      id: novoDocRef.id,
      registrado: true,
      reenvio: false,
    };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);

    tx.set(db.collection("Registro_de_Auditoria").doc(`convite_${dados.idOperacao}`), {
      id_usuario: claims.uid,
      acao: "EMISSAO_CONVITE",
      tipo_entidade_sofre_acao: "CONVITE_ALUNO",
      id_do_objeto_da_entidade: novoDocRef.id,
      acao_feita_em: agora,
      metadata: {
        id_turma: idTurmaFinal,
        email: emailNormalizado,
        canal_entrega: canalEntrega,
      },
    });

    return { ...resultado, tokenEfemero: token };
  });

  // Pós-commit: se o usuário não possuía conta no Auth, provisiona e gera fluxo oficial de definição de senha
  if (!authUser) {
    try {
      await admin.auth().createUser({ email: emailNormalizado });
    } catch (err: unknown) {
      const createErr = err as { code?: string };
      if (createErr.code !== "auth/email-already-exists") {
        console.error("Erro ao provisionar usuário no Firebase Auth:", err);
      }
    }
    try {
      const continueUrl = `${process.env.APP_BASE_URL || "http://localhost:3000"}/login`;
      await admin.auth().generatePasswordResetLink(emailNormalizado, { url: continueUrl });
    } catch (err: unknown) {
      console.error("Erro ao disparar link de definição de senha no Firebase Auth:", err);
    }
  }

  return {
    ...resultadoTx,
    canal_entrega: canalEntrega,
  };
}

/**
 * Callable pública para convidar/reenviar aluno (ACAD-005).
 * Jamais retorna o token efêmero ao cliente.
 */
export const convidarAluno = onCall({ secrets: [conviteHmacSecret] }, async (request) => {
  const dados = validatePayload(ConvidarAlunoSchema, request.data);
  const resultado = await executarConvidarAluno(dados, request);
  return {
    id: resultado.id,
    registrado: resultado.registrado,
    reenvio: resultado.reenvio,
    canal_entrega: resultado.canal_entrega,
  };
});

/**
 * Execução lógica de aceite de convite por aluno (ACAD-006).
 * Suporta duas portas de entrada convergentes:
 * 1. Via Externa: exige token fornecido pelo cliente (`tokenConvite`).
 * 2. Via Interna: usuário autenticado com e-mail verificado correspondente e notificação própria CONVITE_PARA_TURMA (`viaNotificacao = true`).
 */
export async function executarAceitarConviteAluno(
  dados: {
    idOperacao: string;
    idConvite: string;
    tokenConvite?: string;
    viaNotificacao?: boolean;
    nomeInformado?: string;
    matriculaInformada?: string;
  },
  request: CallableRequest,
  segredoInjetado?: string
): Promise<{
  idConvite: string;
  uid: string;
  emailVerificado: boolean;
  criouMatricula: boolean;
  idTurma: string | null;
}> {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const secret = segredoInjetado ?? obterSegredoHmac();

  // Auth é fronteira externa ao Firestore; executada ANTES da transação
  const authUser = await admin.auth().getUser(request.auth.uid);
  if (!authUser.emailVerified) {
    throw new HttpsError("failed-precondition", "E-mail da conta não verificado.");
  }
  if (!authUser.email) {
    throw new HttpsError("failed-precondition", "E-mail ausente na conta de autenticação.");
  }
  const emailAuthNormalizado = normalizarEmailConvite(authUser.email);

  const db = admin.firestore();
  const conviteRef = db.collection("Convite_Aluno").doc(dados.idConvite);

  // M7: Identidade semântica do comando de aceite
  const identidade = construirIdentidade(authUser.uid, "ACEITAR_CONVITE", {
    idConvite: dados.idConvite,
    modo: dados.viaNotificacao ? "NOTIFICACAO_INTERNA" : "TOKEN_EXTERNO",
    tokenHash: dados.tokenConvite ? hashTokenConvite(dados.tokenConvite) : "via_notificacao",
  });

  type TransacaoResultado =
    | { tipo: "REPLAY"; resultado: unknown }
    | { tipo: "EXPIRADO_RECONCILIADO" }
    | { tipo: "SUCESSO"; resultado: unknown; precisaSyncClaims: boolean };

  const txRes = await db.runTransaction(async (tx): Promise<TransacaoResultado> => {
    // ==========================================
    // FASE 1: TODAS AS LEITURAS (READS FIRST)
    // ==========================================

    // 1. M7: Resolver Operações antes de consumir o convite
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") {
      return { tipo: "REPLAY", resultado: decisao.resultado };
    }
    if (decisao.estado !== "NOVA") {
      throw new HttpsError("failed-precondition", "Operação de aceite não concluída.");
    }

    // 2. Leitura do Convite_Aluno
    const conviteSnap = await tx.get(conviteRef);
    if (!conviteSnap.exists) {
      throw new HttpsError("not-found", "Convite não encontrado.");
    }
    const convite = conviteSnap.data()!;

    // Validação fail-closed dos campos estruturais do convite
    if (
      typeof convite.email !== "string" ||
      typeof convite.token_hash !== "string" ||
      typeof convite.status !== "string"
    ) {
      throw new HttpsError("internal", "Dados do convite corrompidos ou inconsistentes.");
    }

    // 3. Leitura da Pendência em Chaves_Unicas
    const contexto: ContextoConvite = convite.id_turma ? "TURMA" : "GLOBAL";
    const chaveHmac = derivarChavePendenciaConvite(secret, contexto, convite.id_turma ?? null, convite.email);
    const pendenciaRef = db.collection("Chaves_Unicas").doc(chaveConvitePendente(chaveHmac));
    const pendSnap = await tx.get(pendenciaRef);

    // 4. Leitura da notificação interna (se aplicável ou se existir)
    const notifRef = db.collection("Usuarios").doc(authUser.uid).collection("Notificacoes").doc(dados.idConvite);
    const notifSnap = await tx.get(notifRef);

    // Se o convite está expirado, podemos materializar a expiração imediatamente
    if (convite.status === "expirado" || isConviteExpirado(convite.expira_em)) {
      tx.update(conviteRef, {
        status: "expirado",
        atualizado_em: FieldValue.serverTimestamp(),
      });
      if (pendSnap.exists && pendSnap.data()?.id_recurso === dados.idConvite) {
        tx.delete(pendenciaRef);
      }
      return { tipo: "EXPIRADO_RECONCILIADO" };
    }

    // 5. Leitura do Usuário e Papéis M9
    const usuarioRef = db.collection("Usuarios").doc(authUser.uid);
    const usuarioSnap = await tx.get(usuarioRef);
    const perfisSnaps = await tx.getAll(...PAPEIS_CONHECIDOS.map((p) => db.collection(p).doc(authUser.uid)));
    const papeisAtuais = PAPEIS_CONHECIDOS.filter((_, i) => perfisSnaps[i].exists);
    const jaTemAluno = papeisAtuais.includes("Aluno");

    // 6. Leitura da chave de matrícula em Chaves_Unicas (se for cadastrar perfil Aluno novo)
    const matDesejada = normalizarMatriculaConvite(dados.matriculaInformada || convite.numero_matricula);
    let chaveMatriculaRef: FirebaseFirestore.DocumentReference | null = null;
    let chaveMatriculaSnap: FirebaseFirestore.DocumentSnapshot | null = null;
    if (!jaTemAluno && matDesejada) {
      chaveMatriculaRef = db.collection("Chaves_Unicas").doc(chaveAlunoMatricula(matDesejada));
      chaveMatriculaSnap = await tx.get(chaveMatriculaRef);
    }

    // 7. Leitura da Turma e Vínculo de Aluno (se for contexto TURMA)
    let turmaRef: FirebaseFirestore.DocumentReference | null = null;
    let turmaSnap: FirebaseFirestore.DocumentSnapshot | null = null;
    let vinculoRef: FirebaseFirestore.DocumentReference | null = null;
    let vinculoSnap: FirebaseFirestore.DocumentSnapshot | null = null;

    if (contexto === "TURMA") {
      turmaRef = db.collection("Turma").doc(convite.id_turma);
      turmaSnap = await tx.get(turmaRef);
      vinculoRef = turmaRef.collection("Alunos").doc(authUser.uid);
      vinculoSnap = await tx.get(vinculoRef);
    }

    // ==========================================
    // FASE 2: VALIDAÇÕES DE NEGÓCIO
    // ==========================================

    // Validação da porta de entrada
    if (dados.viaNotificacao) {
      if (!notifSnap.exists) {
        throw new HttpsError("permission-denied", "Notificação de convite não encontrada para este usuário.");
      }
      const notifData = notifSnap.data()!;
      if (notifData.tipo !== "CONVITE_PARA_TURMA" || notifData.id_alvo !== dados.idConvite) {
        throw new HttpsError("permission-denied", "Notificação não corresponde ao convite indicado.");
      }
    } else {
      if (!dados.tokenConvite) {
        throw new HttpsError("invalid-argument", "Token de convite é obrigatório para aceite externo.");
      }
      const tokenValido = compararTokenConstantTime(dados.tokenConvite, convite.token_hash);
      if (!tokenValido) {
        throw new HttpsError("permission-denied", "Token de convite inválido.");
      }
    }

    // Validação de e-mail verificado correspondente
    if (convite.email !== emailAuthNormalizado) {
      throw new HttpsError("permission-denied", "O e-mail da conta autenticada não corresponde ao convite.");
    }

    if (convite.status === "aceitado") {
      throw new HttpsError("failed-precondition", "Este convite já foi aceito anteriormente.");
    }
    if (convite.status === "rejeitado") {
      throw new HttpsError("failed-precondition", "Este convite foi rejeitado.");
    }

    // Validação de pendência ativa
    if (!pendSnap.exists || pendSnap.data()?.id_recurso !== dados.idConvite) {
      throw new HttpsError("failed-precondition", "Pendência de convite inexistente ou inconsistente.");
    }

    // Validações de Usuário
    let versaoPermissoes = 0;
    let nomeUsuario = "";
    if (usuarioSnap.exists) {
      const uData = usuarioSnap.data()!;
      if (uData.ativo !== true) {
        throw new HttpsError("permission-denied", "Conta de usuário inativa.");
      }
      versaoPermissoes = typeof uData.versao_permissoes === "number" ? uData.versao_permissoes : 0;
      nomeUsuario = typeof uData.nome === "string" ? uData.nome.trim() : "";
    } else {
      const nomeFinal = (dados.nomeInformado || authUser.displayName || "").trim();
      if (!nomeFinal) {
        throw new HttpsError("invalid-argument", "Nome do usuário é obrigatório para cadastrar perfil.");
      }
      nomeUsuario = nomeFinal;
      versaoPermissoes = 1;
    }

    // Validações de Aluno
    const alunoRef = db.collection("Aluno").doc(authUser.uid);
    let matriculaFinal: string;

    if (jaTemAluno) {
      const alunoIndex = PAPEIS_CONHECIDOS.indexOf("Aluno");
      const alunoSnap = perfisSnaps[alunoIndex];
      if (!alunoSnap.exists || alunoSnap.data()?.id_usuario !== authUser.uid) {
        throw new HttpsError("permission-denied", "Documento de papel Aluno com UID incompatível.");
      }
      const matriculaExistente = alunoSnap.data()?.numero_matricula;
      if (typeof matriculaExistente !== "string" || matriculaExistente.trim().length === 0) {
        throw new HttpsError("internal", "Aluno existente sem matrícula cadastrada.");
      }
      matriculaFinal = matriculaExistente.trim();

      if (matDesejada && matDesejada !== matriculaFinal) {
        throw new HttpsError("failed-precondition", "Matrícula informada diverge da matrícula já cadastrada do aluno.");
      }
    } else {
      validarMatrizPapeis([...papeisAtuais]);
      const posteriores = [...new Set([...papeisAtuais, "Aluno" as PapelConhecido])];
      validarMatrizPapeis(posteriores);

      if (!matDesejada) {
        throw new HttpsError("invalid-argument", "Número de matrícula é obrigatório para criar perfil de Aluno.");
      }
      matriculaFinal = matDesejada;

      if (chaveMatriculaSnap?.exists && chaveMatriculaSnap.data()?.id_recurso !== authUser.uid) {
        throw new HttpsError("already-exists", `A matrícula ${matriculaFinal} já está em uso por outro aluno.`);
      }
      versaoPermissoes += 1;
    }

    // Validações de Turma
    let qtdAtual = 0;
    if (contexto === "TURMA") {
      if (!turmaSnap || !turmaSnap.exists) {
        throw new HttpsError("not-found", "Turma referenciada no convite não encontrada.");
      }
      const turma = turmaSnap.data()!;
      if (turma.status !== "Ativo") {
        throw new HttpsError("failed-precondition", "A turma não está mais ativa.");
      }

      qtdAtual = turma.qtd_alunos;
      const capacidade = turma.capacidade;
      if (typeof qtdAtual !== "number" || !Number.isInteger(qtdAtual) || qtdAtual < 0) {
        throw new HttpsError("failed-precondition", "Contador de alunos inválido (fail-closed).");
      }
      if (typeof capacidade !== "number" || !Number.isInteger(capacidade) || capacidade < 1) {
        throw new HttpsError("failed-precondition", "Capacidade da turma inválida (fail-closed).");
      }

      if (vinculoSnap && vinculoSnap.exists) {
        throw new HttpsError("already-exists", "Aluno já possui vínculo ativo nesta turma.");
      }

      if (!convite.exceder_capacidade) {
        if (qtdAtual >= capacidade) {
          throw new HttpsError("failed-precondition", `A turma atingiu a capacidade máxima de ${capacidade} alunos.`);
        }
      } else {
        if (!convite.justificativa_excecao || typeof convite.justificativa_excecao !== "string" || convite.justificativa_excecao.trim().length === 0) {
          throw new HttpsError("failed-precondition", "Exceção de capacidade requer justificativa válida.");
        }
        if (convite.convidado_por !== turma.id_professor) {
          throw new HttpsError("permission-denied", "Exceção de capacidade só pode ser concedida pelo professor dono da turma.");
        }
      }
    }

    // ==========================================
    // FASE 3: TODAS AS ESCRITAS (WRITES)
    // ==========================================
    const agora = FieldValue.serverTimestamp();

    if (!usuarioSnap.exists) {
      tx.set(usuarioRef, {
        id_usuario: authUser.uid,
        nome: nomeUsuario,
        email: emailAuthNormalizado,
        ativo: true,
        versao_permissoes: versaoPermissoes,
        claims_pendentes: true,
        criado_em: agora,
        atualizado_em: agora,
      });
    } else if (!jaTemAluno) {
      tx.update(usuarioRef, {
        versao_permissoes: versaoPermissoes,
        claims_pendentes: true,
        atualizado_em: agora,
      });
    }

    if (!jaTemAluno) {
      tx.set(chaveMatriculaRef!, {
        tipo: TIPO_CHAVE_ALUNO,
        id_recurso: authUser.uid,
        criado_em: agora,
      });

      tx.set(alunoRef, {
        id_usuario: authUser.uid,
        nome: nomeUsuario,
        email: emailAuthNormalizado,
        numero_matricula: matriculaFinal,
        letra_inicial: nomeUsuario.charAt(0).toUpperCase(),
        ativo: true,
        criado_em: agora,
      });
    }

    let criouMatricula = false;
    if (contexto === "TURMA") {
      const idTurma = convite.id_turma;
      const turma = turmaSnap!.data()!;

      tx.set(vinculoRef!, {
        id_aluno: authUser.uid,
        id_turma: idTurma,
        nome: nomeUsuario,
        ingressou_em: agora,
      });

      tx.set(db.collection("Usuarios").doc(authUser.uid).collection("Turmas").doc(idTurma), {
        id_turma: idTurma,
        id_professor: turma.id_professor,
        id_materia: turma.id_materia,
        nome_turma: turma.nome_turma,
        nome_materia: turma.nome_materia,
        ano: turma.ano,
        semestre: turma.semestre,
        status: turma.status,
        ingressou_em: agora,
      });

      tx.set(turmaRef!.collection("HistoricoAlunos").doc(), {
        id_turma: idTurma,
        id_aluno: authUser.uid,
        tipo: "inclusao_aluno",
        modo_ingresso: "CONVITE",
        justificativa: convite.exceder_capacidade ? convite.justificativa_excecao : null,
        removido_por: null,
        timestamp: agora,
      });

      tx.update(turmaRef!, {
        qtd_alunos: qtdAtual + 1,
      });

      criouMatricula = true;
    }

    // Finalizar convite, excluir pendência e marcar notificação lida se existir
    tx.update(conviteRef, {
      status: "aceitado",
      aceitado_por: authUser.uid,
      aceitado_em: agora,
      atualizado_em: agora,
    });

    tx.delete(pendenciaRef);

    if (notifSnap.exists) {
      tx.update(notifRef, {
        lida: true,
        atualizado_em: agora,
      });
    }

    const resultadoAceite = {
      idConvite: dados.idConvite,
      uid: authUser.uid,
      emailVerificado: true,
      criouMatricula,
      idTurma: convite.id_turma ?? null,
    };

    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultadoAceite);

    tx.set(db.collection("Registro_de_Auditoria").doc(`aceite_${dados.idOperacao}`), {
      id_usuario: authUser.uid,
      acao: "ACEITE_CONVITE",
      tipo_entidade_sofre_acao: "CONVITE_ALUNO",
      id_do_objeto_da_entidade: dados.idConvite,
      acao_feita_em: agora,
      metadata: {
        id_turma: convite.id_turma ?? null,
        email: emailAuthNormalizado,
        criouMatricula,
        modo: dados.viaNotificacao ? "NOTIFICACAO_INTERNA" : "TOKEN_EXTERNO",
      },
    });

    return {
      tipo: "SUCESSO",
      resultado: resultadoAceite,
      precisaSyncClaims: !jaTemAluno,
    };
  });

  type RetornoAceite = {
    idConvite: string;
    uid: string;
    emailVerificado: boolean;
    criouMatricula: boolean;
    idTurma: string | null;
  };

  if (txRes.tipo === "REPLAY") {
    return txRes.resultado as RetornoAceite;
  }

  if (txRes.tipo === "EXPIRADO_RECONCILIADO") {
    throw new HttpsError("failed-precondition", "O convite expirou e não pode ser mais aceito.");
  }

  if (txRes.precisaSyncClaims) {
    try {
      await reconciliarClaimsUsuario(authUser.uid);
    } catch {
      // Reconciliável em nova tentativa; não falha a mutação persistida
    }
  }

  return txRes.resultado as RetornoAceite;
}

/**
 * Callable pública para aceitar convite de aluno (ACAD-006).
 */
export const aceitarConviteAluno = onCall({ secrets: [conviteHmacSecret] }, async (request) => {
  const dados = validatePayload(AceitarConviteAlunoSchema, request.data);
  return await executarAceitarConviteAluno(dados, request);
});

/**
 * Execução lógica de rejeição de convite por aluno.
 * - Estado terminal definitivo: não gera vínculo, não altera contadores, libera o lock de pendência HMAC em Chaves_Unicas.
 * - Registra auditoria e receipt M7.
 * - Marca notificação interna própria como lida se existir.
 */
export async function executarRejeitarConviteAluno(
  dados: {
    idOperacao: string;
    idConvite: string;
  },
  request: CallableRequest,
  segredoInjetado?: string
): Promise<{
  idConvite: string;
  status: "rejeitado";
}> {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const secret = segredoInjetado ?? obterSegredoHmac();

  const authUser = await admin.auth().getUser(request.auth.uid);
  if (!authUser.emailVerified) {
    throw new HttpsError("failed-precondition", "E-mail da conta não verificado.");
  }
  if (!authUser.email) {
    throw new HttpsError("failed-precondition", "E-mail ausente na conta de autenticação.");
  }
  const emailAuthNormalizado = normalizarEmailConvite(authUser.email);

  const db = admin.firestore();
  const conviteRef = db.collection("Convite_Aluno").doc(dados.idConvite);

  const identidade = construirIdentidade(authUser.uid, "REJEITAR_CONVITE", {
    idConvite: dados.idConvite,
  });

  return await db.runTransaction(async (tx) => {
    // FASE 1: READS FIRST
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") {
      return decisao.resultado as { idConvite: string; status: "rejeitado" };
    }
    if (decisao.estado !== "NOVA") {
      throw new HttpsError("failed-precondition", "Operação de rejeição não concluída.");
    }

    const conviteSnap = await tx.get(conviteRef);
    if (!conviteSnap.exists) {
      throw new HttpsError("not-found", "Convite não encontrado.");
    }
    const convite = conviteSnap.data()!;

    const contexto: ContextoConvite = convite.id_turma ? "TURMA" : "GLOBAL";
    const chaveHmac = derivarChavePendenciaConvite(secret, contexto, convite.id_turma ?? null, convite.email);
    const pendenciaRef = db.collection("Chaves_Unicas").doc(chaveConvitePendente(chaveHmac));
    const pendSnap = await tx.get(pendenciaRef);

    const notifRef = db.collection("Usuarios").doc(authUser.uid).collection("Notificacoes").doc(dados.idConvite);
    const notifSnap = await tx.get(notifRef);

    // FASE 2: VALIDAÇÕES
    if (convite.email !== emailAuthNormalizado) {
      throw new HttpsError("permission-denied", "O e-mail da conta autenticada não corresponde ao convite.");
    }

    if (convite.status === "rejeitado") {
      throw new HttpsError("failed-precondition", "Este convite já foi rejeitado anteriormente.");
    }
    if (convite.status === "aceitado") {
      throw new HttpsError("failed-precondition", "Este convite já foi aceito e não pode ser rejeitado.");
    }
    if (convite.status === "expirado" || isConviteExpirado(convite.expira_em)) {
      tx.update(conviteRef, {
        status: "expirado",
        atualizado_em: FieldValue.serverTimestamp(),
      });
      if (pendSnap.exists && pendSnap.data()?.id_recurso === dados.idConvite) {
        tx.delete(pendenciaRef);
      }
      throw new HttpsError("failed-precondition", "O convite expirou e não pode ser rejeitado.");
    }

    // FASE 3: WRITES
    const agora = FieldValue.serverTimestamp();
    tx.update(conviteRef, {
      status: "rejeitado",
      rejeitado_por: authUser.uid,
      rejeitado_em: agora,
      atualizado_em: agora,
    });

    if (pendSnap.exists && pendSnap.data()?.id_recurso === dados.idConvite) {
      tx.delete(pendenciaRef);
    }

    if (notifSnap.exists) {
      tx.update(notifRef, {
        lida: true,
        atualizado_em: agora,
      });
    }

    const resultadoRejeicao = {
      idConvite: dados.idConvite,
      status: "rejeitado" as const,
    };

    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultadoRejeicao);

    tx.set(db.collection("Registro_de_Auditoria").doc(`rejeicao_${dados.idOperacao}`), {
      id_usuario: authUser.uid,
      acao: "REJEICAO_CONVITE",
      tipo_entidade_sofre_acao: "CONVITE_ALUNO",
      id_do_objeto_da_entidade: dados.idConvite,
      acao_feita_em: agora,
      metadata: {
        id_turma: convite.id_turma ?? null,
        email: emailAuthNormalizado,
      },
    });

    return resultadoRejeicao;
  });
}

/**
 * Callable pública para rejeitar convite de aluno.
 */
export const rejeitarConviteAluno = onCall({ secrets: [conviteHmacSecret] }, async (request) => {
  const dados = validatePayload(RejeitarConviteAlunoSchema, request.data);
  return await executarRejeitarConviteAluno(dados, request);
});

/**
 * Endpoint seguro para obtenção de detalhes do convite de aluno.
 * Não vaza token_hash nem dados sensíveis.
 * Projeta quem convidou, nome da turma e professor responsável.
 */
export async function executarObterDetalhesConviteAluno(
  dados: {
    idConvite: string;
    tokenConvite?: string;
  },
  request: CallableRequest
): Promise<{
  id: string;
  email: string;
  status: string;
  expira_em: unknown;
  id_turma: string | null;
  nome_turma: string | null;
  codigo_turma: string | null;
  nome_professor: string | null;
  convidado_por_nome: string | null;
  convidado_por_papel: string | null;
  exceder_capacidade: boolean;
}> {
  const db = admin.firestore();
  const conviteSnap = await db.collection("Convite_Aluno").doc(dados.idConvite).get();
  if (!conviteSnap.exists) {
    throw new HttpsError("not-found", "Convite não encontrado.");
  }
  const convite = conviteSnap.data()!;

  let autorizado = false;
  if (request.auth?.uid) {
    try {
      const claims = extrairClaimsAutoridade(request);
      if (
        claims.uid === convite.convidado_por ||
        claims.uid === convite.id_professor ||
        claims.papeis.includes("Chefe_Geral")
      ) {
        autorizado = true;
      }
    } catch {
      // Ignora erro de claims
    }

    if (!autorizado) {
      try {
        const authUser = await admin.auth().getUser(request.auth.uid);
        if (authUser.email && normalizarEmailConvite(authUser.email) === convite.email) {
          autorizado = true;
        }
      } catch {
        // Ignora erro de auth
      }
    }
  }
  if (!autorizado && dados.tokenConvite) {
    autorizado = compararTokenConstantTime(dados.tokenConvite, convite.token_hash);
  }

  if (!autorizado) {
    throw new HttpsError("permission-denied", "Não autorizado a visualizar os detalhes deste convite.");
  }

  const expirado = convite.status === "pendente" && isConviteExpirado(convite.expira_em);
  const statusFinal = expirado ? "expirado" : convite.status;

  let nomeTurma: string | null = null;
  let codigoTurma: string | null = null;
  let nomeProfessor: string | null = null;

  if (convite.id_turma) {
    const turmaSnap = await db.collection("Turma").doc(convite.id_turma).get();
    if (turmaSnap.exists) {
      const t = turmaSnap.data()!;
      nomeTurma = t.nome_turma ?? null;
      codigoTurma = t.codigo_turma ?? null;
      if (t.id_professor) {
        const profSnap = await db.collection("Usuarios").doc(t.id_professor).get();
        if (profSnap.exists) {
          nomeProfessor = profSnap.data()?.nome ?? null;
        }
      }
    }
  }

  let convidadoPorNome: string | null = null;
  let convidadoPorPapel: string | null = null;
  if (convite.convidado_por) {
    const quemSnap = await db.collection("Usuarios").doc(convite.convidado_por).get();
    if (quemSnap.exists) {
      convidadoPorNome = quemSnap.data()?.nome ?? null;
    }
    const chefeSnap = await db.collection("Chefe_Geral").doc(convite.convidado_por).get();
    if (chefeSnap.exists && chefeSnap.data()?.ativo) {
      convidadoPorPapel = "Chefe_Geral";
    } else {
      const profSnap = await db.collection("Professor").doc(convite.convidado_por).get();
      if (profSnap.exists && profSnap.data()?.ativo) {
        convidadoPorPapel = "Professor";
      }
    }
  }

  return {
    id: conviteSnap.id,
    email: convite.email,
    status: statusFinal,
    expira_em: convite.expira_em?.toDate ? convite.expira_em.toDate().toISOString() : convite.expira_em,
    id_turma: convite.id_turma ?? null,
    nome_turma: nomeTurma,
    codigo_turma: codigoTurma,
    nome_professor: nomeProfessor,
    convidado_por_nome: convidadoPorNome,
    convidado_por_papel: convidadoPorPapel,
    exceder_capacidade: Boolean(convite.exceder_capacidade),
  };
}

/**
 * Callable pública para obter detalhes de convite.
 */
export const obterDetalhesConviteAluno = onCall(async (request) => {
  const dados = validatePayload(ObterDetalhesConviteAlunoSchema, request.data);
  return await executarObterDetalhesConviteAluno(dados, request);
});
