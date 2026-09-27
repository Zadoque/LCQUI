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
import { ConvidarAlunoSchema, AceitarConviteAlunoSchema } from "./schemas/convites.schema";
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
 * Se o convite estiver pendente com prazo vencido:
 * - atualiza status para 'expirado';
 * - remove/libera a chave determinística em Chaves_Unicas se ainda apontar para ele;
 * Retorna true se uma expiração foi materializada, false caso contrário.
 */
export async function reconciliarConviteExpiradoTx(
  tx: admin.firestore.Transaction,
  conviteRef: admin.firestore.DocumentReference,
  secret: string
): Promise<boolean> {
  const conviteSnap = await tx.get(conviteRef);
  if (!conviteSnap.exists) return false;
  const convite = conviteSnap.data()!;

  if (convite.status !== "pendente") return false;
  if (!isConviteExpirado(convite.expira_em)) return false;

  const contexto: ContextoConvite = convite.id_turma ? "TURMA" : "GLOBAL";
  const chaveHmac = derivarChavePendenciaConvite(secret, contexto, convite.id_turma ?? null, convite.email);
  const pendenciaRef = admin.firestore().collection("Chaves_Unicas").doc(chaveConvitePendente(chaveHmac));

  tx.update(conviteRef, {
    status: "expirado",
    atualizado_em: FieldValue.serverTimestamp(),
  });

  const pendSnap = await tx.get(pendenciaRef);
  if (pendSnap.exists && pendSnap.data()?.id_recurso === conviteRef.id) {
    tx.delete(pendenciaRef);
  }

  return true;
}

/**
 * Execução lógica de emissão/reenvio de convite (ACAD-005).
 * Primitiva server-side que retorna também o token efêmero gerado em memória
 * para viabilizar testes sem persistir ou retornar token na callable pública.
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

  const db = admin.firestore();
  const identidade = construirIdentidade(claims.uid, "CONVIDAR_ALUNO", {
    email: emailNormalizado,
    idTurma: idTurmaFinal,
    matricula: matriculaNormalizada,
    excederCapacidade,
    justificativaExcecao,
  });

  return await db.runTransaction(async (tx) => {
    // M7: Resolução de idempotência antes de efeitos
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") {
      return decisao.resultado as { id: string; registrado: boolean; reenvio: boolean };
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

      // Professor só pode convidar para a própria turma; Chefe não simula ownership
      if (turma.id_professor !== claims.uid) {
        throw new HttpsError("permission-denied", "Apenas o professor dono da turma pode emitir convites para ela.");
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
        // Exceção nominal
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
        });

        tx.set(pendenciaRef, {
          tipo: TIPO_CHAVE_CONVITE_PENDENTE,
          id_recurso: novoDocRef.id,
          criado_em: agora,
        });

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
    });

    tx.set(pendenciaRef, {
      tipo: TIPO_CHAVE_CONVITE_PENDENTE,
      id_recurso: novoDocRef.id,
      criado_em: agora,
    });

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
      },
    });

    return { ...resultado, tokenEfemero: token };
  });
}

/**
 * Callable pública para convidar/reenviar aluno (ACAD-005).
 * Jamais retorna o token ao professor.
 */
export const convidarAluno = onCall({ secrets: [conviteHmacSecret] }, async (request) => {
  const dados = validatePayload(ConvidarAlunoSchema, request.data);
  const resultado = await executarConvidarAluno(dados, request);
  // O token efêmero de memória NUNCA é retornado na resposta da callable
  return {
    id: resultado.id,
    registrado: resultado.registrado,
    reenvio: resultado.reenvio,
  };
});

/**
 * Execução lógica de aceite de convite por aluno (ACAD-006).
 */
export async function executarAceitarConviteAluno(
  dados: {
    idOperacao: string;
    idConvite: string;
    tokenConvite: string;
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
    tokenHash: hashTokenConvite(dados.tokenConvite),
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

    // Se o convite está expirado, podemos materializar a expiração imediatamente (já lemos pendSnap!)
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

    // 4. Leitura do Usuário e Papéis M9
    const usuarioRef = db.collection("Usuarios").doc(authUser.uid);
    const usuarioSnap = await tx.get(usuarioRef);
    const perfisSnaps = await tx.getAll(...PAPEIS_CONHECIDOS.map((p) => db.collection(p).doc(authUser.uid)));
    const papeisAtuais = PAPEIS_CONHECIDOS.filter((_, i) => perfisSnaps[i].exists);
    const jaTemAluno = papeisAtuais.includes("Aluno");

    // 5. Leitura da chave de matrícula em Chaves_Unicas (se for cadastrar perfil Aluno novo)
    const matDesejada = normalizarMatriculaConvite(dados.matriculaInformada || convite.numero_matricula);
    let chaveMatriculaRef: FirebaseFirestore.DocumentReference | null = null;
    let chaveMatriculaSnap: FirebaseFirestore.DocumentSnapshot | null = null;
    if (!jaTemAluno && matDesejada) {
      chaveMatriculaRef = db.collection("Chaves_Unicas").doc(chaveAlunoMatricula(matDesejada));
      chaveMatriculaSnap = await tx.get(chaveMatriculaRef);
    }

    // 6. Leitura da Turma e Vínculo de Aluno (se for contexto TURMA)
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

    // Comparação do token em tempo constante
    const tokenValido = compararTokenConstantTime(dados.tokenConvite, convite.token_hash);
    if (!tokenValido) {
      throw new HttpsError("permission-denied", "Token de convite inválido.");
    }

    // Validação de e-mail verificado correspondente
    if (convite.email !== emailAuthNormalizado) {
      throw new HttpsError("permission-denied", "O e-mail da conta autenticada não corresponde ao convite.");
    }

    if (convite.status === "aceitado") {
      throw new HttpsError("failed-precondition", "Este convite já foi aceito anteriormente.");
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
      // Validar matriz de papéis antes e depois de adicionar Aluno
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

      // Vínculo canônico sanitizado (sem e-mail nem matrícula)
      tx.set(vinculoRef!, {
        id_aluno: authUser.uid,
        id_turma: idTurma,
        nome: nomeUsuario,
        ingressou_em: agora,
      });

      // Espelho de consulta M11
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

      // Evento histórico de inclusão
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

    // Finalizar convite, excluir pendência e registrar receipt M7
    tx.update(conviteRef, {
      status: "aceitado",
      aceitado_por: authUser.uid,
      aceitado_em: agora,
      atualizado_em: agora,
    });

    tx.delete(pendenciaRef);

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

  // Pós-commit: sincronização recuperável de Custom Claims se papel Aluno foi criado
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
