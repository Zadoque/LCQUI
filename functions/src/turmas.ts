import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { validarPermissao, extrairClaimsAutoridade, resolverAutoridadePersistidaTx } from "./auth";
import { construirIdentidade, registrarOperacaoConcluidaTx, resolverOperacaoTx } from "./idempotencia";
import { adicionarNotificacaoTx } from "./notificacoes";
import { validatePayload } from "./utils/validation";
import { 
  IngressarTurmaPorCodigoSchema, 
  CriarTurmaSchema, 
  RemoverAlunoTurmaSchema, 
  AlterarStatusTurmaSchema,
  ConvidarAlunoSchema, 
  AdicionarAlunoExistenteTurmaSchema 
} from "./schemas/turmas.schema";

/**
 * RN-TUR-01: Controle de Capacidade da Turma
 * O ingresso exige que a quantidade de alunos seja estritamente menor que a capacidade.
 */
export const ingressarEmTurmaPorCodigo = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idOperacao, codigoTurma } = validatePayload(IngressarTurmaPorCodigoSchema, request.data);

  const db = admin.firestore();
  const consultaTurma = db.collection("Turma").where("codigo_turma", "==", codigoTurma).limit(1);

  return db.runTransaction(async (tx) => {
    // M9: autoridade persistida (Aluno ou Bolsista) relida na transação.
    await resolverAutoridadePersistidaTx(tx, claims, ["Aluno", "Bolsista"]);

    // M7: identidade canônica; replay devolve o receipt sem reaplicar efeito.
    const identidade = construirIdentidade(claims.uid, "INGRESSAR_TURMA", { codigoTurma });
    const decisao = await resolverOperacaoTx(tx, idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as { idTurma: string; nomeTurma: string };
    if (decisao.estado !== "NOVA") {
      throw new HttpsError("failed-precondition", "Operação de ingresso não concluída.");
    }

    const turmaSnap = await tx.get(consultaTurma);
    if (turmaSnap.empty) throw new HttpsError("not-found", "Turma não encontrada.");
    const turmaDoc = turmaSnap.docs[0];
    const turma = turmaDoc.data();

    const alunoTurmaRef = turmaDoc.ref.collection("Alunos").doc(claims.uid);
    const alunoTurmaDoc = await tx.get(alunoTurmaRef);

    // Membro já existente: recebe acesso à turma sem criar vínculo novo,
    // incrementar contagem ou gerar novo evento — inclusive em turma cheia ou
    // arquivada (UI-10: "aluno já matriculado recebe acesso à turma sem duplicar
    // contagem"). Só registra o receipt da nova intenção.
    if (alunoTurmaDoc.exists) {
      const resultado = { idTurma: turmaDoc.id, nomeTurma: turma.nome_turma };
      registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
      return resultado;
    }

    if (turma.status === "Arquivada") {
      throw new HttpsError("failed-precondition", "A turma está arquivada e não aceita novos alunos.");
    }
    if (turma.status !== "Ativo") {
      throw new HttpsError("failed-precondition", "Estado de turma persistido inválido (fail-closed).");
    }

    // Fail-closed do contador/capacidade (M11: inteiro >= 0 e capacidade >= 1).
    const qtdAtual = turma.qtd_alunos;
    const capacidade = turma.capacidade;
    if (typeof qtdAtual !== "number" || !Number.isInteger(qtdAtual) || qtdAtual < 0) {
      throw new HttpsError("failed-precondition", "Contador de alunos inválido (fail-closed).");
    }
    if (typeof capacidade !== "number" || !Number.isInteger(capacidade) || capacidade < 1) {
      throw new HttpsError("failed-precondition", "Capacidade da turma inválida (fail-closed).");
    }
    if (qtdAtual >= capacidade) {
      throw new HttpsError("failed-precondition", "A capacidade máxima da turma foi atingida.");
    }

    const historicoSnap = await tx.get(
      turmaDoc.ref.collection("HistoricoAlunos")
        .where("id_aluno", "==", claims.uid)
        .where("tipo", "==", "exclusao_aluno")
        .limit(1)
    );
    if (!historicoSnap.empty) {
      throw new HttpsError("permission-denied", "Você foi removido pelo professor e não pode retornar pelo código.");
    }

    // Projeção mínima: nome vem do cadastro de identidade (Usuarios), nunca do
    // documento de papel nem do e-mail/matrícula.
    const identidadeSnap = await tx.get(db.collection("Usuarios").doc(claims.uid));
    const nomeBruto = identidadeSnap.data()?.nome;
    const nome = typeof nomeBruto === "string" && nomeBruto.trim().length > 0 ? nomeBruto.trim() : "Sem nome";

    // Vínculo canônico (#M11VinculoCanonico + projeção mínima de nome).
    tx.set(alunoTurmaRef, {
      id_aluno: claims.uid,
      id_turma: turmaDoc.id,
      nome,
      ingressou_em: FieldValue.serverTimestamp()
    });

    // Espelho #M11EspelhoAlunoTurma.
    tx.set(db.collection("Usuarios").doc(claims.uid).collection("Turmas").doc(turmaDoc.id), {
      id_turma: turmaDoc.id,
      id_professor: turma.id_professor,
      id_materia: turma.id_materia,
      nome_turma: turma.nome_turma,
      nome_materia: turma.nome_materia,
      ano: turma.ano,
      semestre: turma.semestre,
      status: turma.status,
      ingressou_em: FieldValue.serverTimestamp()
    });

    // Evento histórico de inclusão (#M11EventoHistorico).
    tx.set(turmaDoc.ref.collection("HistoricoAlunos").doc(), {
      id_turma: turmaDoc.id,
      id_aluno: claims.uid,
      tipo: "inclusao_aluno",
      modo_ingresso: "CODIGO",
      justificativa: null,
      removido_por: null,
      timestamp: FieldValue.serverTimestamp()
    });

    tx.update(turmaDoc.ref, { qtd_alunos: qtdAtual + 1 });

    const resultado = { idTurma: turmaDoc.id, nomeTurma: turma.nome_turma };
    registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
    return resultado;
  });
});

export const criarTurma = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const payload = validatePayload(CriarTurmaSchema, request.data);
  const { idOperacao, idMateria, nomeTurma, ano, semestre, capacidade, idProfessor } = payload;

  const db = admin.firestore();

  return db.runTransaction(async (tx) => {
    // M9: autoridade persistida relida na mesma transação do efeito.
    const autoridade = await resolverAutoridadePersistidaTx(tx, claims, ["Professor", "Chefe_Geral"]);
    const ehProfessor = autoridade.papeis.includes("Professor");
    const ehChefe = autoridade.papelAutorizado === "Chefe_Geral";

    // RN-M11: a criação ordinária é do professor autenticado para si
    // (`id_professor = UID`). Criar em nome de outro professor é intervenção
    // excepcional Q13 do Chefe. Um Chefe sem papel Professor não cria turma
    // para si: só em nome de um Professor válido e ativo.
    let idProfessorEfetivo: string;
    if (idProfessor !== undefined && idProfessor !== claims.uid) {
      if (!ehChefe) {
        throw new HttpsError("permission-denied", "Somente Chefe_Geral pode criar turma em nome de outro professor.");
      }
      idProfessorEfetivo = idProfessor;
    } else {
      if (!ehProfessor) {
        throw new HttpsError("permission-denied", "Criar turma para si exige papel Professor.");
      }
      idProfessorEfetivo = claims.uid;
    }

    // M7: identidade canônica (uid, tipo_operacao, payload_hash); replay devolve o
    // resultado persistido e reuso incompatível falha fechado.
    const identidade = construirIdentidade(claims.uid, "CRIAR_TURMA", {
      idMateria,
      nomeTurma,
      ano,
      semestre,
      capacidade,
      idProfessor: idProfessorEfetivo,
    });
    const decisao = await resolverOperacaoTx(tx, idOperacao, identidade);
    if (decisao.estado === "REPLAY") {
      return decisao.resultado as { id: string; codigoTurma: string };
    }
    if (decisao.estado !== "NOVA") {
      throw new HttpsError("failed-precondition", "Operação de criação de turma não concluída.");
    }

    // `id_materia` refere matéria existente, verificada no servidor; o nome é
    // projeção do documento persistido e nunca vem do payload.
    const materiaSnap = await tx.get(db.collection("Materia").doc(idMateria));
    if (!materiaSnap.exists) {
      throw new HttpsError("not-found", "Matéria não encontrada.");
    }
    const nomeMateria = materiaSnap.data()!.nome;
    if (typeof nomeMateria !== "string" || nomeMateria.length === 0) {
      throw new HttpsError("failed-precondition", "Matéria persistida sem nome (fail-closed).");
    }

    if (idProfessorEfetivo !== claims.uid) {
      const [usuarioAlvo, papelAlvo] = await tx.getAll(
        db.collection("Usuarios").doc(idProfessorEfetivo),
        db.collection("Professor").doc(idProfessorEfetivo)
      );
      // M9: o documento de papel precisa representar o próprio UID
      // (`id_usuario == alvo`), como exigido em `resolverAutoridadePersistidaTx`.
      if (
        !usuarioAlvo.exists ||
        usuarioAlvo.data()?.ativo !== true ||
        !papelAlvo.exists ||
        papelAlvo.data()?.id_usuario !== idProfessorEfetivo
      ) {
        throw new HttpsError("failed-precondition", "Professor alvo inexistente, inativo ou inconsistente.");
      }
    }

    // Unicidade do código: reserva determinística em `Chaves_Unicas` na mesma
    // transação, sem depender de consulta a `Turma`. Colisão concorrente faz a
    // transação reiniciar e um novo candidato é sorteado.
    const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const sortear = () => {
      let candidato = "";
      for (let i = 0; i < 6; i++) candidato += alfabeto.charAt(Math.floor(Math.random() * alfabeto.length));
      return candidato;
    };
    let codigo = "";
    let chaveRef: admin.firestore.DocumentReference | null = null;
    for (let tentativa = 0; tentativa < 8 && chaveRef === null; tentativa++) {
      const ref = db.collection("Chaves_Unicas").doc(`Turma_codigo__${sortear()}`);
      const snap = await tx.get(ref);
      if (!snap.exists) {
        codigo = ref.id.slice("Turma_codigo__".length);
        chaveRef = ref;
      }
    }
    if (chaveRef === null) {
      throw new HttpsError("internal", "Não foi possível reservar um código único de turma.");
    }

    const turmaRef = db.collection("Turma").doc();
    tx.set(turmaRef, {
      id_materia: idMateria,
      nome_materia: nomeMateria,
      id_professor: idProfessorEfetivo,
      status: "Ativo",
      nome_turma: nomeTurma,
      ano,
      semestre,
      capacidade,
      qtd_alunos: 0,
      codigo_turma: codigo,
      versao: 1,
      data_criacao: FieldValue.serverTimestamp(),
    });
    tx.set(chaveRef, {
      tipo: "Turma",
      id_recurso: turmaRef.id,
      codigo,
      criado_em: FieldValue.serverTimestamp(),
    });
    if (idProfessorEfetivo !== claims.uid) {
      tx.set(db.collection("Registro_de_Auditoria").doc(`criar_turma_${idOperacao}`), {
        id_usuario: claims.uid,
        acao: "CRIAR_TURMA_EM_NOME_DE_PROFESSOR",
        tipo_entidade_sofre_acao: "TURMA",
        id_do_objeto_da_entidade: turmaRef.id,
        acao_feita_em: FieldValue.serverTimestamp(),
        metadata: { id_professor: idProfessorEfetivo, idMateria },
      });
    }

    const resultado = { id: turmaRef.id, codigoTurma: codigo };
    registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
    return resultado;
  });
});

export const removerAlunoTurma = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idOperacao, idTurma, idAluno } = validatePayload(RemoverAlunoTurmaSchema, request.data);

  const db = admin.firestore();
  const turmaRef = db.collection("Turma").doc(idTurma);

  return db.runTransaction(async (tx) => {
    // M9: autoridade persistida relida na transação.
    const autoridade = await resolverAutoridadePersistidaTx(tx, claims, ["Professor", "Chefe_Geral"]);
    const ehChefe = autoridade.papelAutorizado === "Chefe_Geral";

    const identidade = construirIdentidade(claims.uid, "REMOVER_ALUNO_TURMA", { idTurma, idAluno });
    const decisao = await resolverOperacaoTx(tx, idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as { success: boolean };
    if (decisao.estado !== "NOVA") {
      throw new HttpsError("failed-precondition", "Operação de remoção não concluída.");
    }

    const turmaDoc = await tx.get(turmaRef);
    if (!turmaDoc.exists) throw new HttpsError("not-found", "Turma não encontrada.");
    const turma = turmaDoc.data()!;

    if (turma.id_professor !== claims.uid && !ehChefe) {
      throw new HttpsError("permission-denied", "Você não é o dono desta turma.");
    }

    const alunoTurmaRef = turmaRef.collection("Alunos").doc(idAluno);
    const alunoDoc = await tx.get(alunoTurmaRef);
    if (!alunoDoc.exists) {
      throw new HttpsError("not-found", "O aluno não está matriculado na turma.");
    }

    tx.delete(alunoTurmaRef);
    tx.delete(db.collection("Usuarios").doc(idAluno).collection("Turmas").doc(idTurma));

    tx.set(turmaRef.collection("HistoricoAlunos").doc(), {
      id_turma: idTurma,
      id_aluno: idAluno,
      tipo: "exclusao_aluno",
      modo_ingresso: null,
      justificativa: null,
      removido_por: claims.uid,
      timestamp: FieldValue.serverTimestamp()
    });

    // Contador transacional, nunca abaixo de zero (não incrementa `versao`).
    const qtdAtual = typeof turma.qtd_alunos === "number" ? turma.qtd_alunos : 0;
    tx.update(turmaRef, { qtd_alunos: Math.max(0, qtdAtual - 1) });

    tx.set(db.collection("Registro_de_Auditoria").doc(`remover_aluno_${idOperacao}`), {
      id_usuario: claims.uid,
      acao: "Remover Aluno da Turma",
      tipo_entidade_sofre_acao: "ALUNO",
      id_do_objeto_da_entidade: idAluno,
      acao_feita_em: FieldValue.serverTimestamp(),
      metadata: { idTurma }
    });

    const resultado = { success: true };
    registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
    return resultado;
  });
});

// PRO-02/UI-10: arquivar e desarquivar alteram o status e incrementam `versao`,
// preservando id, membros, posts, histórico, qtd_alunos e codigo_turma. M9
// (autoridade persistida), M7 (receipt) e M13 (fan-out de notificação).
export const alterarStatusTurma = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idOperacao, idTurma, status } = validatePayload(AlterarStatusTurmaSchema, request.data);

  const db = admin.firestore();
  const turmaRef = db.collection("Turma").doc(idTurma);

  return db.runTransaction(async (tx) => {
    const tipoOperacao = status === "Arquivada" ? "ARQUIVAR_TURMA" : "DESARQUIVAR_TURMA";
    const identidade = construirIdentidade(claims.uid, tipoOperacao, { idTurma, status });
    const decisao = await resolverOperacaoTx(tx, idOperacao, identidade);
    if (decisao.estado === "REPLAY") {
      return decisao.resultado as { idTurma: string; status: string };
    }
    if (decisao.estado !== "NOVA") {
      throw new HttpsError("failed-precondition", "Operação de status de turma não concluída.");
    }

    const autoridade = await resolverAutoridadePersistidaTx(tx, claims, ["Professor", "Chefe_Geral"]);
    const ehChefe = autoridade.papelAutorizado === "Chefe_Geral";

    const turmaSnap = await tx.get(turmaRef);
    if (!turmaSnap.exists) throw new HttpsError("not-found", "Turma não encontrada.");
    const turma = turmaSnap.data()!;
    if (turma.id_professor !== claims.uid && !ehChefe) {
      throw new HttpsError("permission-denied", "Você não é o dono desta turma.");
    }
    if (turma.status === status) {
      throw new HttpsError("failed-precondition", `A turma já está ${status}.`);
    }

    // Leituras antes das escritas: membros e espelhos.
    const alunosSnap = await tx.get(turmaRef.collection("Alunos"));
    const membros = alunosSnap.docs.map((d) => d.id);
    const mirrorRefs = membros.map((id) =>
      db.collection("Usuarios").doc(id).collection("Turmas").doc(idTurma)
    );
    const mirrors = mirrorRefs.length ? await tx.getAll(...mirrorRefs) : [];

    // Escritas: status + versão, espelhos e fan-out.
    tx.update(turmaRef, { status, versao: FieldValue.increment(1) });
    mirrors.forEach((mirror, i) => {
      if (mirror.exists) tx.update(mirrorRefs[i], { status });
    });
    const tipoNotif = status === "Arquivada" ? "TURMA_ARQUIVADA" : "TURMA_DESARQUIVADA";
    for (const membro of membros) {
      adicionarNotificacaoTx(tx, db, {
        id_destinatario: membro,
        papel_destinatario: "Aluno",
        tipo: tipoNotif,
        id_quem_fez_acao: claims.uid,
        id_turma: idTurma,
        entidade_alvo: "Turma",
        id_alvo: idTurma,
      });
    }

    const resultado = { idTurma, status, membros_notificados: membros.length };
    tx.set(db.collection("Registro_de_Auditoria").doc(`status_turma_${idOperacao}`), {
      id_usuario: claims.uid,
      acao: status === "Arquivada" ? "Arquivar Turma" : "Desarquivar Turma",
      tipo_entidade_sofre_acao: "TURMA",
      id_do_objeto_da_entidade: idTurma,
      acao_feita_em: FieldValue.serverTimestamp(),
      metadata: { status },
    });
    registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
    return resultado;
  });
});

export const convidarAluno = onCall(async (request) => {
  validarPermissao(request, ["Professor", "Chefe_Geral"]);

  const { email, idTurma, matricula } = validatePayload(ConvidarAlunoSchema, request.data);
  const emailNormalizado = email.toLowerCase().trim();
  const db = admin.firestore();

  return db.runTransaction(async (tx) => {
    let queryRef = db.collection("Convite_Aluno")
      .where("email", "==", emailNormalizado)
      .where("status", "==", "pendente");
      
    if (idTurma) {
      queryRef = queryRef.where("id_turma", "==", idTurma);
    } else {
      queryRef = queryRef.where("id_turma", "==", null);
    }

    const snap = await tx.get(queryRef.limit(1));
    if (!snap.empty) {
      throw new HttpsError("already-exists", "Já existe um convite pendente para este email e turma.");
    }

    if (matricula) {
      const convitesMat = await tx.get(db.collection("Convite_Aluno").where("numero_matricula", "==", matricula).limit(1));
      if (!convitesMat.empty) {
        throw new HttpsError("already-exists", "Esta matrícula já possui um convite pendente.");
      }
      const usuariosMat = await tx.get(db.collection("Aluno").where("numero_matricula", "==", matricula).limit(1));
      if (!usuariosMat.empty) {
        throw new HttpsError("already-exists", "Esta matrícula já está cadastrada no sistema.");
      }
    }

    const docRef = db.collection("Convite_Aluno").doc();
    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + 7);

    tx.set(docRef, {
      id_turma: idTurma || null,
      email: emailNormalizado,
      convidado_em: FieldValue.serverTimestamp(),
      status: "pendente",
      expira_em: Timestamp.fromDate(expiraEm),
      convidado_por: request.auth!.uid,
      numero_matricula: matricula || null
    });

    return { id: docRef.id };
  });
});

export const adicionarAlunoExistenteTurma = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const { idOperacao, idTurma, idAluno } = validatePayload(AdicionarAlunoExistenteTurmaSchema, request.data);

  const db = admin.firestore();
  const turmaRef = db.collection("Turma").doc(idTurma);
  const alunoRef = db.collection("Aluno").doc(idAluno);

  return db.runTransaction(async (tx) => {
    // M9: autoridade persistida relida na transação.
    const autoridade = await resolverAutoridadePersistidaTx(tx, claims, ["Professor", "Chefe_Geral"]);
    const ehChefe = autoridade.papelAutorizado === "Chefe_Geral";

    const identidade = construirIdentidade(claims.uid, "ADICIONAR_ALUNO_TURMA", { idTurma, idAluno });
    const decisao = await resolverOperacaoTx(tx, idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as { sucesso: boolean; idAluno: string; idTurma: string };
    if (decisao.estado !== "NOVA") {
      throw new HttpsError("failed-precondition", "Operação de inclusão não concluída.");
    }

    const turmaSnap = await tx.get(turmaRef);
    if (!turmaSnap.exists) {
      throw new HttpsError("not-found", "Turma não encontrada.");
    }
    const turma = turmaSnap.data()!;

    if (turma.id_professor !== claims.uid && !ehChefe) {
      throw new HttpsError("permission-denied", "Você não é o professor responsável por esta disciplina.");
    }

    if (turma.status === "Arquivada") {
      throw new HttpsError("failed-precondition", "Não é possível adicionar alunos em turmas arquivadas.");
    }

    const alunoSnap = await tx.get(alunoRef);
    if (!alunoSnap.exists) {
      throw new HttpsError("not-found", "Aluno não encontrado no sistema.");
    }
    const identidadeAlunoSnap = await tx.get(db.collection("Usuarios").doc(idAluno));

    const matriculaRef = turmaRef.collection("Alunos").doc(idAluno);
    const matriculaSnap = await tx.get(matriculaRef);
    if (matriculaSnap.exists) {
      throw new HttpsError("already-exists", "Este aluno já faz parte desta turma.");
    }

    // Vagas: na V1 a autoridade é `qtd_alunos`, lida/escrita na mesma transação.
    const qtdAtual = turma.qtd_alunos;
    const capacidade = turma.capacidade;
    if (typeof qtdAtual !== "number" || !Number.isInteger(qtdAtual) || qtdAtual < 0) {
      throw new HttpsError("failed-precondition", "Contador de alunos inválido (fail-closed).");
    }
    if (typeof capacidade !== "number" || !Number.isInteger(capacidade) || capacidade < 1) {
      throw new HttpsError("failed-precondition", "Capacidade da turma inválida (fail-closed).");
    }
    if (qtdAtual >= capacidade) {
      throw new HttpsError("failed-precondition", `A turma atingiu a capacidade máxima de ${capacidade} alunos.`);
    }

    const agora = FieldValue.serverTimestamp();
    const nomeBruto = identidadeAlunoSnap.data()?.nome;
    const nome = typeof nomeBruto === "string" && nomeBruto.trim().length > 0 ? nomeBruto.trim() : "Sem nome";

    // Vínculo canônico: projeção mínima (sem e-mail/matrícula).
    tx.set(matriculaRef, {
      id_aluno: idAluno,
      id_turma: idTurma,
      nome,
      ingressou_em: agora,
    });

    // Espelho #M11EspelhoAlunoTurma.
    tx.set(db.collection("Usuarios").doc(idAluno).collection("Turmas").doc(idTurma), {
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

    // Evento histórico de inclusão pelo professor (sem código).
    tx.set(turmaRef.collection("HistoricoAlunos").doc(), {
      id_turma: idTurma,
      id_aluno: idAluno,
      tipo: "inclusao_aluno",
      modo_ingresso: "CONVITE",
      justificativa: null,
      removido_por: null,
      timestamp: agora,
    });

    adicionarNotificacaoTx(tx, db, {
      id_destinatario: idAluno,
      papel_destinatario: "Aluno",
      tipo: "ADICIONADO",
      id_quem_fez_acao: claims.uid,
      id_turma: idTurma,
      entidade_alvo: "Turma",
      id_alvo: idTurma,
    });

    tx.update(turmaRef, { qtd_alunos: qtdAtual + 1 });

    const resultado = { sucesso: true, idAluno, idTurma };
    registrarOperacaoConcluidaTx(tx, idOperacao, identidade, resultado);
    return resultado;
  });
});
