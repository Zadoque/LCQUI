import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  extrairClaimsAutoridade,
  validarGestorDoAlmoxarifadoTx,
} from "./auth";
import { validatePayload } from "./utils/validation";
import { construirIdentidade, registrarOperacaoConcluidaTx, resolverOperacaoTx } from "./idempotencia";
import { 
  CadastroFrascoFechadoSchema, 
  CadastroFrascoAbertoSchema, 
  AberturaFrascoSchema, 
  RetiradaFrascoSchema, 
  DevolucaoFrascoSchema 
} from "./schemas/reagentes.schema";

export const cadastrarFrascoFechado = onCall(async (request) => {
  const dados = validatePayload(CadastroFrascoFechadoSchema, request.data);
  const claims = extrairClaimsAutoridade(request);
  const contadorRef = admin.firestore().collection("Contador_Codigo_Frasco").doc("singleton");
  const frascoRef = admin.firestore().collection("Frasco_Reagente").doc();

  return admin.firestore().runTransaction(async (tx) => {
    await validarGestorDoAlmoxarifadoTx(tx, claims, dados.idAlmoxarifado);
    const identidade = construirIdentidade(claims.uid, "CADASTRAR_FRASCO_FECHADO", {
      idResumoReagente: dados.idResumoReagente,
      idEspecificacaoReagente: dados.idEspecificacaoReagente,
      idAlmoxarifado: dados.idAlmoxarifado,
      idLote: dados.idLote,
      pesoTotal: dados.pesoTotal,
      volumeNominal: dados.volumeNominal,
      validadeFechado: dados.validadeFechado,
      validadeDesconhecida: dados.validadeDesconhecida,
      decisaoSeJaVencido: dados.decisaoSeJaVencido,
      detalheStatus: dados.detalheStatus,
    });
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as {
      idFrasco: string;
      codigoFrasco: string;
      pesoVazioCalculado: number | null;
      venceuNoCadastro: boolean;
    };
    if (decisao.estado !== "NOVA") throw new HttpsError("failed-precondition", "Operação de cadastro não concluída.");

    const resumoRef = admin.firestore().collection("Resumo_Reagente").doc(dados.idResumoReagente);
    const especRef = resumoRef.collection("Especificacoes").doc(dados.idEspecificacaoReagente);
    const almoxSnap = await tx.get(admin.firestore().collection("Almoxarifado").doc(dados.idAlmoxarifado));
    const [resumoSnap, especSnap] = await Promise.all([tx.get(resumoRef), tx.get(especRef)]);
    if (!almoxSnap.exists || almoxSnap.data()?.ativo !== true) throw new HttpsError("failed-precondition", "Almoxarifado inexistente ou inativo.");
    if (!resumoSnap.exists || !especSnap.exists) throw new HttpsError("not-found", "Resumo ou especificação de reagente não encontrada.");
    const especData = especSnap.data()!;
    const densidade = especData.densidade;
    const estadoFisico = especData.estado_fisico;
    if (estadoFisico !== "LIQUIDO" && estadoFisico !== "SOLIDO") throw new HttpsError("failed-precondition", "Estado físico da especificação inválido.");

    if (dados.idLote) {
      const loteSnap = await tx.get(admin.firestore().collection("Lote").doc(dados.idLote));
      if (!loteSnap.exists || loteSnap.data()?.id_especificacao_reagente !== dados.idEspecificacaoReagente || loteSnap.data()?.id_resumo_reagente !== dados.idResumoReagente) {
        throw new HttpsError("failed-precondition", "Lote inexistente ou incompatível com a especificação e o resumo.");
      }
    }

    let pesoVazio: number | null = null;
    let saldoDesconhecido = true;
    let saldoG: number | null = null;
    let saldoMl: number | null = null;
    let origemTara: "REFERENCIA_TEORICA" | null = null;
    if (dados.volumeNominal != null) {
      if (estadoFisico === "LIQUIDO") {
        if (typeof densidade !== "number" || densidade <= 0) throw new HttpsError("failed-precondition", "Líquido exige densidade positiva.");
        pesoVazio = dados.pesoTotal - (dados.volumeNominal * densidade);
        saldoMl = dados.volumeNominal;
      } else {
        pesoVazio = dados.pesoTotal - dados.volumeNominal;
        saldoG = dados.volumeNominal;
      }
      if (pesoVazio <= 0) throw new HttpsError("invalid-argument", "Peso total incompatível com o conteúdo nominal.");
      origemTara = "REFERENCIA_TEORICA";
      saldoDesconhecido = false;
    }

    const validadeFechado = dados.validadeFechado ?? null;
    const validadeEfetiva = dados.validadeDesconhecida ? null : validadeFechado;
    const venceuNoCadastro = Boolean(validadeEfetiva && new Date(validadeEfetiva) <= new Date());
    if (venceuNoCadastro && !dados.decisaoSeJaVencido) throw new HttpsError("failed-precondition", "O frasco está vencido no cadastro e exige uma decisão do gestor.");
    if (dados.decisaoSeJaVencido === "QUARENTENA" && (!dados.detalheStatus || dados.detalheStatus.trim().length < 20)) {
      throw new HttpsError("invalid-argument", "A entrada em quarentena exige detalhe_status humano com no mínimo 20 caracteres.");
    }

    const contadorSnap = await tx.get(contadorRef);
    const ultimo = contadorSnap.data()?.ultimo_codigo_gerado;
    if (!Number.isInteger(ultimo) || ultimo < 0) throw new HttpsError("failed-precondition", "Contador de código de frasco inválido.");
    const proximoNumero = ultimo + 1;
    const codigoFrasco = `LCQUI-${proximoNumero}`;
    const chaveRef = admin.firestore().collection("Chaves_Unicas").doc(`Frasco_Reagente__${codigoFrasco}`);
    const chaveSnap = await tx.get(chaveRef);
    if (chaveSnap.exists) throw new HttpsError("already-exists", "Código de frasco já reservado.");

    tx.update(contadorRef, { ultimo_codigo_gerado: proximoNumero });
    tx.create(chaveRef, {
      tipo: "Frasco_Reagente",
      id_recurso: frascoRef.id,
      chave_recurso: codigoFrasco,
      criado_em: FieldValue.serverTimestamp(),
    });
    tx.set(frascoRef, {
      id: frascoRef.id,
      id_almoxarifado: dados.idAlmoxarifado,
      id_lote: dados.idLote ?? null,
      id_resumo_reagente: dados.idResumoReagente,
      id_especificacao_reagente: dados.idEspecificacaoReagente,
      conteudo_nominal: dados.volumeNominal ?? null,
      peso_no_cadastrado: dados.pesoTotal,
      peso_atual: dados.pesoTotal,
      peso_frasco_vazio: pesoVazio,
      origem_tara: origemTara,
      saldo_aferido_g: saldoG,
      saldo_aferido_ml: saldoMl,
      saldo_desconhecido: saldoDesconhecido,
      medida_usada: 0,
      estado_fisico_frasco: "FECHADO",
      disponibilidade: "DISPONIVEL",
      validade_fechado: validadeFechado,
      validade_efetiva: validadeEfetiva,
      validade_desconhecida: dados.validadeDesconhecida ?? false,
      vencido: venceuNoCadastro,
      situacao_localizacao: "LOCALIZADO",
      condicao_inicial_cadastro: "FECHADO",
      abertura_historica_desconhecida: false,
      eh_higroscopico: resumoSnap.data()?.eh_higroscopico === true,
      em_quarentena: venceuNoCadastro && dados.decisaoSeJaVencido === "QUARENTENA",
      uso_vencido_autorizado: venceuNoCadastro && dados.decisaoSeJaVencido === "DISPONIVEL",
      detalhe_status: venceuNoCadastro ? (dados.detalheStatus ?? (dados.decisaoSeJaVencido === "PENDENTE_DE_DESCARTE" ? "Frasco vencido aguardando processo institucional de descarte." : null)) : null,
      cadastrado_em: FieldValue.serverTimestamp(),
      cadastrado_por: request.auth!.uid,
    });

    if (dados.decisaoSeJaVencido === "PENDENTE_DE_DESCARTE") {
      tx.create(admin.firestore().collection("Pendencias_Descarte_Frasco").doc(frascoRef.id), {
        id_frasco: frascoRef.id,
        origem: "QUARENTENA",
        id_operacao_decisao: dados.idOperacao,
        id_gestor_decisao: claims.uid,
        motivo: dados.detalheStatus ?? "Frasco vencido aguardando processo institucional de descarte.",
        criada_em: FieldValue.serverTimestamp(),
      });
    }

    const historicoRef = admin.firestore().collection("Historico_Frasco_Reagente").doc();
    tx.create(historicoRef, {
      id_frasco_reagente: frascoRef.id,
      id_almoxarifado: dados.idAlmoxarifado,
      id_gestor: claims.uid,
      tipo: "CADASTRO",
      timestamp: FieldValue.serverTimestamp(),
    });
    const resultado = { idFrasco: frascoRef.id, codigoFrasco, pesoVazioCalculado: pesoVazio, venceuNoCadastro };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
  });
});

export const cadastrarFrascoAberto = onCall(async (request) => {
  const dados = validatePayload(CadastroFrascoAbertoSchema, request.data);
  const claims = extrairClaimsAutoridade(request);
  const identidade = construirIdentidade(claims.uid, "CADASTRAR_FRASCO_ABERTO", {
    idResumoReagente: dados.idResumoReagente, idEspecificacaoReagente: dados.idEspecificacaoReagente,
    idAlmoxarifado: dados.idAlmoxarifado, idLote: dados.idLote,
    pesoTotalBalanca: dados.pesoTotalBalanca, volumeNominal: dados.volumeNominal,
    validadeAberto: dados.validadeAberto, validadeDesconhecida: dados.validadeDesconhecida,
    decisaoSeJaVencido: dados.decisaoSeJaVencido, detalheStatus: dados.detalheStatus,
  });
  const contadorRef = admin.firestore().collection("Contador_Codigo_Frasco").doc("singleton");
  const frascoRef = admin.firestore().collection("Frasco_Reagente").doc();

  return admin.firestore().runTransaction(async (tx) => {
    await validarGestorDoAlmoxarifadoTx(tx, claims, dados.idAlmoxarifado);
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as { idFrasco: string; codigoFrasco: string; conteudoNominal: number | null; pesoVazio: null; venceuNoCadastro: boolean };
    if (decisao.estado !== "NOVA") throw new HttpsError("failed-precondition", "Operação de cadastro de frasco aberto não concluída.");
    const resumoRef = admin.firestore().collection("Resumo_Reagente").doc(dados.idResumoReagente);
    const especRef = resumoRef.collection("Especificacoes").doc(dados.idEspecificacaoReagente);
    const [almoxSnap, resumoSnap, especSnap] = await Promise.all([
      tx.get(admin.firestore().collection("Almoxarifado").doc(dados.idAlmoxarifado)), tx.get(resumoRef), tx.get(especRef),
    ]);
    if (!almoxSnap.exists || almoxSnap.data()?.ativo !== true) throw new HttpsError("failed-precondition", "Almoxarifado inexistente ou inativo.");
    if (!resumoSnap.exists || !especSnap.exists) throw new HttpsError("not-found", "Resumo ou especificação de reagente não encontrada.");
    if (especSnap.data()?.id_resumo_reagente && especSnap.data()?.id_resumo_reagente !== dados.idResumoReagente) throw new HttpsError("failed-precondition", "Especificação não pertence ao resumo informado.");
    if (dados.idLote) {
      const loteSnap = await tx.get(admin.firestore().collection("Lote").doc(dados.idLote));
      if (!loteSnap.exists || loteSnap.data()?.id_especificacao_reagente !== dados.idEspecificacaoReagente || loteSnap.data()?.id_resumo_reagente !== dados.idResumoReagente) throw new HttpsError("failed-precondition", "Lote inexistente ou incompatível com a especificação e o resumo.");
    }
    const agora = new Date();
    const validade = dados.validadeAberto ? new Date(dados.validadeAberto) : null;
    const validadeEfetiva = dados.validadeDesconhecida ? null : validade;
    const jaVencido = Boolean(validadeEfetiva && validadeEfetiva <= agora);
    if (jaVencido && !dados.decisaoSeJaVencido) throw new HttpsError("failed-precondition", "O frasco está vencido no cadastro e exige uma decisão do gestor.");
    if (dados.decisaoSeJaVencido === "QUARENTENA" && (!dados.detalheStatus || dados.detalheStatus.trim().length < 20)) throw new HttpsError("invalid-argument", "A entrada em quarentena exige detalhe_status humano com no mínimo 20 caracteres.");
    const contadorSnap = await tx.get(contadorRef);
    const ultimo = contadorSnap.data()?.ultimo_codigo_gerado;
    if (!Number.isInteger(ultimo) || ultimo < 0) throw new HttpsError("failed-precondition", "Contador de código de frasco inválido.");
    const proximoNumero = ultimo + 1;
    const codigoFrasco = `LCQUI-${proximoNumero}`;
    const chaveRef = admin.firestore().collection("Chaves_Unicas").doc(`Frasco_Reagente__${codigoFrasco}`);
    if ((await tx.get(chaveRef)).exists) throw new HttpsError("already-exists", "Código de frasco já reservado.");
    tx.update(contadorRef, { ultimo_codigo_gerado: proximoNumero });
    tx.create(chaveRef, { tipo: "Frasco_Reagente", id_recurso: frascoRef.id, chave_recurso: codigoFrasco, criado_em: FieldValue.serverTimestamp() });
    tx.set(frascoRef, {
      id: frascoRef.id,
      id_almoxarifado: dados.idAlmoxarifado,
      id_lote: dados.idLote ?? null,
      id_resumo_reagente: dados.idResumoReagente,
      id_especificacao_reagente: dados.idEspecificacaoReagente,
      codigo_frasco: codigoFrasco,
      condicao_inicial_cadastro: "JA_ABERTO",
      conteudo_nominal: dados.volumeNominal ?? null,
      peso_no_cadastrado: dados.pesoTotalBalanca,
      peso_atual: dados.pesoTotalBalanca,
      peso_frasco_vazio: null,
      origem_tara: null,
      saldo_aferido_g: null,
      saldo_aferido_ml: null,
      saldo_desconhecido: true,
      medida_usada: 0,
      data_abertura: null,
      estado_fisico_frasco: "ABERTO",
      disponibilidade: "INDISPONIVEL",
      situacao_localizacao: "LOCALIZADO",
      validade_efetiva: validadeEfetiva,
      validade_desconhecida: dados.validadeDesconhecida ?? false,
      vencido: jaVencido,
      em_quarentena: jaVencido && dados.decisaoSeJaVencido === "QUARENTENA",
      uso_vencido_autorizado: jaVencido && dados.decisaoSeJaVencido === "DISPONIVEL",
      detalhe_status: jaVencido
        ? (dados.detalheStatus ?? (dados.decisaoSeJaVencido === "PENDENTE_DE_DESCARTE"
            ? "Frasco vencido aguardando processo institucional de descarte." : null))
        : null,
      cadastrado_em: FieldValue.serverTimestamp(),
      cadastrado_por: request.auth!.uid,
    });
    tx.create(admin.firestore().collection("Historico_Frasco_Reagente").doc(), { id_frasco_reagente: frascoRef.id, id_almoxarifado: dados.idAlmoxarifado, id_gestor: claims.uid, tipo: "CADASTRO", timestamp: FieldValue.serverTimestamp() });
    const resultado = { idFrasco: frascoRef.id, codigoFrasco, conteudoNominal: dados.volumeNominal ?? null, pesoVazio: null, venceuNoCadastro: jaVencido };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
  });
});

export function calcularValidadeEfetivaNaAbertura(frasco: any, dataAbertura: Date): Date | null {
  if (frasco.validade_desconhecida) return null;

  const validadeFechado = frasco.validade_fechado
    ? (typeof frasco.validade_fechado.toDate === "function"
      ? frasco.validade_fechado.toDate()
      : new Date(frasco.validade_fechado))
    : null;
  const diasDepoisDeAberto = frasco.validade_apos_aberto_dias;
  const validadeDepoisDaAbertura = diasDepoisDeAberto != null
    ? new Date(dataAbertura.getTime() + diasDepoisDeAberto * 24 * 60 * 60 * 1000)
    : null;

  if (validadeFechado && validadeDepoisDaAbertura) {
    return validadeFechado <= validadeDepoisDaAbertura ? validadeFechado : validadeDepoisDaAbertura;
  }
  return validadeFechado ?? validadeDepoisDaAbertura;
}

export const registrarAberturaFrasco = onCall(async (request) => {
  const dados = validatePayload(AberturaFrascoSchema, request.data);
  const claims = extrairClaimsAutoridade(request);
  const identidade = construirIdentidade(claims.uid, "ABRIR_FRASCO", {
    idFrasco: dados.idFrasco,
    destinoSeVencerNaAbertura: dados.destinoSeVencerNaAbertura,
    detalheStatus: dados.detalheStatus,
  });

  const frascoRef = admin.firestore().collection("Frasco_Reagente").doc(dados.idFrasco);
  return admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(frascoRef);
    if (!snap.exists) throw new HttpsError("not-found", "Frasco não encontrado.");
    const frasco = snap.data()!;
    const decisaoOperacao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisaoOperacao.estado === "REPLAY") return decisaoOperacao.resultado as { validadeEfetiva: Date | null; venceu: boolean; destino: string | null };
    if (decisaoOperacao.estado !== "NOVA") throw new HttpsError("failed-precondition", "Operação de abertura não concluída.");
    await validarGestorDoAlmoxarifadoTx(tx, claims, frasco.id_almoxarifado);

    if (frasco.estado_fisico_frasco !== "FECHADO") {
      throw new HttpsError("failed-precondition", "Somente um frasco FECHADO pode ser aberto por esta operação.");
    }
    if (frasco.disponibilidade !== "DISPONIVEL") {
      throw new HttpsError("failed-precondition", "Somente frascos DISPONIVEL podem ser abertos.");
    }

    const agora = new Date();
    const validadeEfetiva = calcularValidadeEfetivaNaAbertura(frasco, agora);
    const venceu = Boolean(validadeEfetiva && validadeEfetiva <= agora);

    if (venceu && !dados.destinoSeVencerNaAbertura) {
      throw new HttpsError("failed-precondition", "A abertura tornou o frasco vencido. O gestor deve escolher o destino do frasco.");
    }
    if (venceu && dados.destinoSeVencerNaAbertura === "QUARENTENA" && (!dados.detalheStatus || dados.detalheStatus.trim().length < 20)) {
      throw new HttpsError("invalid-argument", "A entrada em quarentena exige detalhe_status humano com no mínimo 20 caracteres.");
    }

    tx.update(frascoRef, {
      estado_fisico_frasco: "ABERTO",
      data_abertura: agora,
      validade_efetiva: validadeEfetiva,
      vencido: venceu,
      em_quarentena: venceu && dados.destinoSeVencerNaAbertura === "QUARENTENA",
      uso_vencido_autorizado: venceu && dados.destinoSeVencerNaAbertura === "DISPONIVEL",
      detalhe_status: venceu
        ? (dados.detalheStatus ?? (dados.destinoSeVencerNaAbertura === "PENDENTE_DE_DESCARTE"
          ? "Frasco vencido aguardando processo institucional de descarte."
          : null))
        : null,
    });
    tx.create(admin.firestore().collection("Historico_Frasco_Reagente").doc(), {
      id_frasco_reagente: dados.idFrasco, id_almoxarifado: frasco.id_almoxarifado,
      id_gestor: claims.uid, tipo: "ABERTURA", timestamp: FieldValue.serverTimestamp(),
    });
    if (venceu && dados.destinoSeVencerNaAbertura === "PENDENTE_DE_DESCARTE") {
      tx.create(admin.firestore().collection("Pendencias_Descarte_Frasco").doc(dados.idFrasco), {
        id_frasco: dados.idFrasco, origem: "QUARENTENA", id_operacao_decisao: dados.idOperacao,
        id_gestor_decisao: claims.uid, motivo: dados.detalheStatus ?? "Frasco vencido aguardando processo institucional de descarte.", criada_em: FieldValue.serverTimestamp(),
      });
    }
    const resultado = { validadeEfetiva, venceu, destino: dados.destinoSeVencerNaAbertura ?? null };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
  });
});

export const registrarRetirada = onCall(async (request) => {
  const dados = validatePayload(RetiradaFrascoSchema, request.data);
  const claims = extrairClaimsAutoridade(request);
  const identidade = construirIdentidade(claims.uid, "REGISTRAR_RETIRADA", {
    idFrasco: dados.idFrasco, idUsuarioRetirou: dados.idUsuarioRetirou, idLocalUsado: dados.idLocalUsado,
    pesoSaida: dados.pesoSaida, dataDevolucaoPrevista: dados.dataDevolucaoPrevista,
    confirmarUsoVencido: dados.confirmarUsoVencido, abrirNoEmprestimo: dados.abrirNoEmprestimo,
    finalidadeUso: dados.finalidadeUso, justificativaAutoAtendimento: dados.justificativaAutoAtendimento,
  });
  const autoAtendimento = dados.idUsuarioRetirou === request.auth!.uid;
  if (autoAtendimento && (!dados.justificativaAutoAtendimento || dados.justificativaAutoAtendimento.length < 20)) {
    throw new HttpsError("invalid-argument", "Autoatendimento exige justificativa de pelo menos 20 caracteres.");
  }

  const frascoRef = admin.firestore().collection("Frasco_Reagente").doc(dados.idFrasco);

  const resultado = await admin.firestore().runTransaction(async (tx) => {
    const frascoSnap = await tx.get(frascoRef);
    if (!frascoSnap.exists) throw new HttpsError("not-found", "Frasco não encontrado.");
    const frasco = frascoSnap.data()!;
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as { idEmprestimo: string; autoAtendimento: boolean };
    if (decisao.estado !== "NOVA") throw new HttpsError("failed-precondition", "Operação de retirada não concluída.");

    const autoridade = await validarGestorDoAlmoxarifadoTx(tx, claims, frasco.id_almoxarifado);
    const [profSnap, bolsSnap, usuarioSnap] = await Promise.all([
      tx.get(admin.firestore().collection("Professor").doc(dados.idUsuarioRetirou)),
      tx.get(admin.firestore().collection("Bolsista").doc(dados.idUsuarioRetirou)),
      tx.get(admin.firestore().collection("Usuarios").doc(dados.idUsuarioRetirou)),
    ]);
    if ((!profSnap.exists && !bolsSnap.exists) || usuarioSnap.data()?.ativo !== true) {
      throw new HttpsError("failed-precondition", "Usuário selecionado não é um Professor/Bolsista ativo.");
    }
    if (autoAtendimento) {
      if (!autoridade.papeis.includes("Professor") || !autoridade.papeis.includes("Gestor_Almoxarifado")) {
        throw new HttpsError("permission-denied", "Autoatendimento exige Professor e Gestor de Almoxarifado.");
      }
      const vinculos = await tx.get(admin.firestore().collection("Gestor_Almoxarifado_x_Almoxarifado")
        .where("id_almoxarifado", "==", frasco.id_almoxarifado));
      let gestoresAtivos = 0;
      for (const vinculo of vinculos.docs) {
        const uid = vinculo.data().id_gestor_almoxarifado;
        if (typeof uid !== "string") continue;
        const [usuario, papel] = await Promise.all([
          tx.get(admin.firestore().collection("Usuarios").doc(uid)),
          tx.get(admin.firestore().collection("Gestor_Almoxarifado").doc(uid)),
        ]);
        if (usuario.data()?.ativo === true && papel.exists) gestoresAtivos += 1;
      }
      if (gestoresAtivos > 1) {
        throw new HttpsError("failed-precondition", "Autoatendimento só é permitido quando não há outro gestor ativo.");
      }
    }
    if (frasco.disponibilidade !== "DISPONIVEL") {
      throw new HttpsError("failed-precondition", "Frasco não está disponível para retirada.");
    }
    if (frasco.em_quarentena) {
      throw new HttpsError("failed-precondition", "Frasco em quarentena não pode ser retirado.");
    }

    const agora = new Date();
    let frascoVencido = frasco.vencido;
    let validadeEfetiva = frasco.validade_efetiva ? (typeof frasco.validade_efetiva.toDate === "function" ? frasco.validade_efetiva.toDate() : new Date(frasco.validade_efetiva)) : null;

    if (dados.abrirNoEmprestimo && frasco.estado_fisico_frasco === "FECHADO") {
      validadeEfetiva = calcularValidadeEfetivaNaAbertura(frasco, agora);
      frascoVencido = Boolean(validadeEfetiva && validadeEfetiva <= agora);
      tx.update(frascoRef, {
        estado_fisico_frasco: "ABERTO",
        data_abertura: agora,
        validade_efetiva: validadeEfetiva,
        vencido: frascoVencido,
      });
    }

    if (frascoVencido && !frasco.uso_vencido_autorizado && !dados.confirmarUsoVencido) {
      throw new HttpsError("failed-precondition", "Frasco vencido requer confirmação explícita de uso didático.");
    }
    const finalidade = frascoVencido ? "DIDATICO_DEMONSTRACAO" : dados.finalidadeUso;

    const emprestimoRef = admin.firestore().collection("Emprestimo_Reagente").doc();
    tx.set(emprestimoRef, {
      id_frasco_reagente: dados.idFrasco,
      id_usuario_retirou: dados.idUsuarioRetirou,
      id_gestor_retirada: request.auth!.uid,
      id_almoxarifado: frasco.id_almoxarifado,
      status: "EM_USO",
      data_retirada: FieldValue.serverTimestamp(),
      data_devolucao_prevista: new Date(dados.dataDevolucaoPrevista),
      id_local_usado: dados.idLocalUsado,
      peso_saida: dados.pesoSaida,
      uso_vencido_aceito: Boolean(frascoVencido),
      finalidade_uso: finalidade,
      auto_atendimento: autoAtendimento,
      justificativa_auto_atendimento: autoAtendimento ? dados.justificativaAutoAtendimento : null,
    });

    tx.update(frascoRef, { disponibilidade: "EMPRESTADO" });

    const historicoRef = admin.firestore().collection("Historico_Frasco_Reagente").doc();
    tx.set(historicoRef, {
      id_frasco_reagente: dados.idFrasco,
      id_almoxarifado: frasco.id_almoxarifado,
      id_gestor: request.auth!.uid,
      tipo: "SAIU",
      id_emprestimo_reagente: emprestimoRef.id,
      timestamp: FieldValue.serverTimestamp(),
    });

    const resultado = { idEmprestimo: emprestimoRef.id, autoAtendimento };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
  });

  if (autoAtendimento) {
    const chefes = await admin.firestore().collection("Chefe_Geral").get();
    for (const chefe of chefes.docs) {
      const usuario = await admin.firestore().collection("Usuarios").doc(chefe.id).get();
      if (usuario.data()?.ativo !== true) continue;
      const ref = admin.firestore().collection("Usuarios").doc(chefe.id)
        .collection("Notificacoes").doc(`autoatendimento_${resultado.idEmprestimo}`);
      await admin.firestore().runTransaction(async (tx) => {
        if ((await tx.get(ref)).exists) return;
        tx.create(ref, {
          id_destinatario: chefe.id,
          papel_destinatario: "Chefe_Geral",
          tipo: "AUTO_ATENDIMENTO_RETIRADA",
          id_quem_fez_acao: request.auth!.uid,
          id_turma: null,
          quantidade: null,
          entidade_alvo: "Emprestimo",
          id_alvo: resultado.idEmprestimo,
          mensagem_customizada: "Retirada registrada em autoatendimento; revisão da chefia necessária.",
          lida: false,
          lida_em: null,
          emitida_em: FieldValue.serverTimestamp(),
          expira_em: null,
          contem_conteudo_protegido: false,
        });
      });
    }
  }
  return resultado;
});

async function resolverDensidadeDoFrasco(frasco: any): Promise<number | null> {
  let idEspec = frasco.id_especificacao_reagente;
  if (!idEspec && frasco.id_lote) {
    const loteSnap = await admin.firestore().collection("Lote").doc(frasco.id_lote).get();
    if (loteSnap.exists) idEspec = loteSnap.data()?.id_especificacao_reagente;
  }
  if (!idEspec) return null;
  const especSnap = await admin.firestore().collection("Especificacao_Reagente").doc(idEspec).get();
  return especSnap.exists ? especSnap.data()?.densidade ?? null : null;
}

export const registrarDevolucao = onCall(async (request) => {
  const dados = validatePayload(DevolucaoFrascoSchema, request.data);
  const claims = extrairClaimsAutoridade(request);

  const emprestimoRef = admin.firestore().collection("Emprestimo_Reagente").doc(dados.idEmprestimo);

  return admin.firestore().runTransaction(async (tx) => {
    const emprestimoSnap = await tx.get(emprestimoRef);
    if (!emprestimoSnap.exists) throw new HttpsError("not-found", "Empréstimo não encontrado.");
    const emprestimo = emprestimoSnap.data()!;
    if (emprestimo.status === "DEVOLVIDO" || emprestimo.status === "DEVOLVIDO_COM_ATRASO") {
      throw new HttpsError("failed-precondition", "Empréstimo já foi devolvido.");
    }

    const frascoRef = admin.firestore().collection("Frasco_Reagente").doc(emprestimo.id_frasco_reagente);
    const frascoSnap = await tx.get(frascoRef);
    const frasco = frascoSnap.data()!;
    await validarGestorDoAlmoxarifadoTx(tx, claims, frasco.id_almoxarifado);

    const densidade = await resolverDensidadeDoFrasco(frasco);
    const pesoConsumido = Math.max(0, emprestimo.peso_saida - dados.pesoRetorno);

    const MARGEM_HIGROSCOPICA = 0.02;
    const limiteMaxRetorno = emprestimo.peso_saida * (1 + MARGEM_HIGROSCOPICA);
    if (dados.pesoRetorno > limiteMaxRetorno) {
      throw new HttpsError("invalid-argument",
        `Peso de retorno (${dados.pesoRetorno}g) excede 102% da massa de saída (${emprestimo.peso_saida}g). Verifique se há contaminação ou erro na balança.`);
    }
    const avisoHigroscopico = dados.pesoRetorno > emprestimo.peso_saida;
    const volumeUtilizado = densidade ? pesoConsumido / densidade : pesoConsumido;

    const agora = new Date();
    const dataPrevistaObj = typeof emprestimo.data_devolucao_prevista.toDate === "function" ? emprestimo.data_devolucao_prevista.toDate() : new Date(emprestimo.data_devolucao_prevista);
    const prazoLimite = new Date(dataPrevistaObj);
    prazoLimite.setHours(23, 59, 59, 999);
    const atrasado = agora > prazoLimite;

    const validadeEfetiva = frasco.validade_efetiva?.toDate?.() ?? frasco.validade_efetiva ?? null;
    const venceuAgora = Boolean(validadeEfetiva && validadeEfetiva <= agora);
    const frascoVencido = Boolean(frasco.vencido || venceuAgora);

    const atualizacaoFrasco: Record<string, unknown> = {
      disponibilidade: "DISPONIVEL",
      data_ultima_pesagem: FieldValue.serverTimestamp(),
      peso_atual: dados.pesoRetorno,
      medida_usada: admin.firestore.FieldValue.increment(volumeUtilizado),
      vencido: frascoVencido,
    };

    if (frascoVencido && dados.destinoPosDevolucao === "QUARENTENA") {
      atualizacaoFrasco.em_quarentena = true;
      atualizacaoFrasco.uso_vencido_autorizado = false;
      atualizacaoFrasco.detalhe_status = "Frasco vencido retido em quarentena após devolução.";
    } else if (frascoVencido && dados.destinoPosDevolucao === "DISPONIVEL") {
      atualizacaoFrasco.em_quarentena = false;
      atualizacaoFrasco.uso_vencido_autorizado = true;
    }

    tx.update(emprestimoRef, {
      status: atrasado ? "DEVOLVIDO_COM_ATRASO" : "DEVOLVIDO",
      data_devolucao_efetuada: FieldValue.serverTimestamp(),
      id_usuario_devolveu: request.auth!.uid,
      peso_retorno: dados.pesoRetorno,
      medida_utilizada: volumeUtilizado,
      unidade_medida_utilizada: densidade ? "ml" : "g",
      ...(avisoHigroscopico && { aviso: "higroscopico_suspeito" }),
    });
    tx.update(frascoRef, atualizacaoFrasco);

    const histRef = admin.firestore().collection("Historico_Frasco_Reagente").doc();
    tx.set(histRef, {
      id_frasco_reagente: emprestimo.id_frasco_reagente,
      id_almoxarifado: frasco.id_almoxarifado,
      id_gestor: request.auth!.uid,
      tipo: "ENTROU",
      id_emprestimo_reagente: emprestimoRef.id,
      peso_anterior: emprestimo.peso_saida,
      peso_novo: dados.pesoRetorno,
      medida_ajustada: volumeUtilizado,
      unidade_medida_ajustada: densidade ? "ml" : "g",
      timestamp: FieldValue.serverTimestamp(),
    });

    return { pesoConsumido, volumeUtilizado, atrasado, frascoVencido,
           avisoHigroscopico: avisoHigroscopico || false };
  });
});
