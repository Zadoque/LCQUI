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
  DevolucaoFrascoSchema,
  RepetirPesagemDevolucaoAnomalaSchema,
  ConfirmarEsgotamentoAposInspecaoSchema,
  RecalibrarTaraFrascoEsgotadoSchema,
  RegistrarPesagemRotinaSchema,
  DescartarFrascoSchema,
  RegistrarExtravioOuReencontroSchema,
  ColocarFrascoEmQuarentenaSchema,
  ResolverQuarentenaFrascoSchema
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
    const estadoFisico = resumoSnap.data()?.estado_fisico;
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
    const densidadeRetirada = await resolverDensidadeDoFrasco(frasco);

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
      densidade_aplicada: densidadeRetirada ?? null,
      unidade_medida_utilizada: densidadeRetirada ? "ml" : "g",
      vencido_na_retirada: Boolean(frascoVencido),
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

  const identidade = construirIdentidade(claims.uid, "REGISTRAR_DEVOLUCAO", {
    idEmprestimo: dados.idEmprestimo,
    pesoRetorno: dados.pesoRetorno,
    pesoPerdaEvaporacao: dados.pesoPerdaEvaporacao ?? 0,
    confirmarEsgotamento: dados.confirmarEsgotamento ?? false,
    idUsuarioDevolveu: dados.idUsuarioDevolveu ?? claims.uid,
    destinoPosDevolucao: dados.destinoPosDevolucao ?? null,
  });

  return admin.firestore().runTransaction(async (tx) => {
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as any;
    if (decisao.estado !== "NOVA") {
      throw new HttpsError("failed-precondition", "Operação de devolução não concluída.");
    }

    const emprestimoSnap = await tx.get(emprestimoRef);
    if (!emprestimoSnap.exists) throw new HttpsError("not-found", "Empréstimo não encontrado.");
    const emprestimo = emprestimoSnap.data()!;
    if (emprestimo.status !== "EM_USO" && emprestimo.status !== "ATRASADO") {
      throw new HttpsError("failed-precondition", "Empréstimo já foi devolvido ou encerrado.");
    }

    const frascoRef = admin.firestore().collection("Frasco_Reagente").doc(emprestimo.id_frasco_reagente);
    const frascoSnap = await tx.get(frascoRef);
    if (!frascoSnap.exists) throw new HttpsError("not-found", "Frasco não encontrado.");
    const frasco = frascoSnap.data()!;
    await validarGestorDoAlmoxarifadoTx(tx, claims, frasco.id_almoxarifado);

    const densidade = emprestimo.densidade_aplicada ?? (await resolverDensidadeDoFrasco(frasco));
    const liquido = (emprestimo.unidade_medida_utilizada === "ml") || (densidade != null && densidade > 0);

    const perdaEvaporacao = Number.isFinite(dados.pesoPerdaEvaporacao) ? dados.pesoPerdaEvaporacao! : 0;
    const perdaBrutaObservada = Math.max(0, emprestimo.peso_saida - dados.pesoRetorno);

    // Constraint M6: 0 <= evaporação <= perda bruta observada
    if (perdaEvaporacao < 0 || perdaEvaporacao > perdaBrutaObservada) {
      throw new HttpsError("invalid-argument", "Perda por evaporação excede a perda bruta observada.");
    }
    const pesoConsumido = perdaBrutaObservada - perdaEvaporacao;

    const ehHigroscopico = Boolean(frasco.eh_higroscopico);
    // PDF-025: FORMULA CANONICA Q06
    // normal: max(1.0, 0.005 * peso_saida)
    // higroscopico: max(2.0, 0.02 * peso_saida)
    const deltaMax = ehHigroscopico
      ? Math.max(2.0, 0.02 * emprestimo.peso_saida)
      : Math.max(1.0, 0.005 * emprestimo.peso_saida);
    const limiteMaxRetorno = emprestimo.peso_saida + deltaMax;

    const ficouVazio = dados.confirmarEsgotamento === true;
    const pesoVazioReferencia = frasco.peso_frasco_vazio ?? null;
    const taraReal = frasco.origem_tara === "MEDIDA_REAL";
    const abaixoReferencia = pesoVazioReferencia != null && dados.pesoRetorno < pesoVazioReferencia;
    const discrepanciaTara = ficouVazio && taraReal && dados.pesoRetorno !== pesoVazioReferencia;

    const anomalia = discrepanciaTara
      ? "DISCREPANCIA_TARA_REAL"
      : (!ficouVazio && abaixoReferencia && taraReal)
      ? "RETORNO_ABAIXO_TARA_REAL"
      : (!ficouVazio && abaixoReferencia)
      ? "REFERENCIA_TEORICA_INCONSISTENTE"
      : dados.pesoRetorno > limiteMaxRetorno
      ? "GANHO_ACIMA_Q06"
      : null;

    const reterPorAnomalia = anomalia !== null;
    const ganhoMassa = dados.pesoRetorno > emprestimo.peso_saida;
    const avisoHigroscopico = ganhoMassa && ehHigroscopico && !reterPorAnomalia;
    const volumeUtilizado = densidade ? pesoConsumido / densidade : pesoConsumido;

    const agora = new Date();
    const dataPrevistaObj = typeof emprestimo.data_devolucao_prevista?.toDate === "function"
      ? emprestimo.data_devolucao_prevista.toDate()
      : new Date(emprestimo.data_devolucao_prevista);
    const prazoLimite = new Date(dataPrevistaObj);
    prazoLimite.setHours(23, 59, 59, 999);
    const atrasado = agora > prazoLimite;

    const frascoVencido = Boolean(frasco.vencido);
    const validadeDesconhecida = Boolean(frasco.validade_desconhecida);
    const precisaDestino = frascoVencido || validadeDesconhecida;

    const atualizacaoFrasco: Record<string, unknown> = {
      disponibilidade: ficouVazio || reterPorAnomalia ? "INDISPONIVEL" : "DISPONIVEL",
      data_ultima_pesagem: FieldValue.serverTimestamp(),
      peso_atual: dados.pesoRetorno,
      medida_usada: FieldValue.increment(reterPorAnomalia ? 0 : volumeUtilizado),
      vencido: frascoVencido,
    };

    if (ficouVazio) {
      atualizacaoFrasco.estado_fisico_frasco = "VAZIO";
      atualizacaoFrasco.saldo_desconhecido = false;
      atualizacaoFrasco.saldo_aferido_g = 0;
      if (liquido) atualizacaoFrasco.saldo_aferido_ml = 0;
      if (!taraReal) {
        atualizacaoFrasco.peso_frasco_vazio = dados.pesoRetorno;
        atualizacaoFrasco.origem_tara = "MEDIDA_REAL";
      }
    }

    if (reterPorAnomalia) {
      atualizacaoFrasco.em_quarentena = true;
      atualizacaoFrasco.uso_vencido_autorizado = false;
      atualizacaoFrasco.detalhe_status = "Frasco retido por anomalia de pesagem na devolução: " + anomalia;
      if (!ficouVazio) atualizacaoFrasco.saldo_desconhecido = true;
    } else if (precisaDestino && dados.destinoPosDevolucao === "QUARENTENA") {
      atualizacaoFrasco.em_quarentena = true;
      atualizacaoFrasco.uso_vencido_autorizado = false;
      atualizacaoFrasco.disponibilidade = "INDISPONIVEL";
      atualizacaoFrasco.detalhe_status = "Frasco vencido retido em quarentena após devolução.";
    } else if (precisaDestino && dados.destinoPosDevolucao === "DISPONIVEL") {
      atualizacaoFrasco.em_quarentena = false;
      atualizacaoFrasco.uso_vencido_autorizado = true;
    } else if (precisaDestino && dados.destinoPosDevolucao === "PENDENTE_DE_DESCARTE") {
      atualizacaoFrasco.em_quarentena = false;
      atualizacaoFrasco.uso_vencido_autorizado = false;
      atualizacaoFrasco.disponibilidade = "INDISPONIVEL";
      atualizacaoFrasco.detalhe_status = "Frasco vencido aguardando processo institucional de descarte.";
    }

    tx.update(frascoRef, atualizacaoFrasco);

    tx.update(emprestimoRef, {
      status: reterPorAnomalia ? "DEVOLVIDO_COM_ANOMALIA" : (atrasado ? "DEVOLVIDO_COM_ATRASO" : "DEVOLVIDO"),
      data_devolucao_efetuada: FieldValue.serverTimestamp(),
      id_usuario_devolveu: dados.idUsuarioDevolveu ?? claims.uid,
      id_gestor_devolucao: claims.uid,
      peso_retorno: dados.pesoRetorno,
      peso_perda_evaporacao: perdaEvaporacao,
      medida_utilizada: reterPorAnomalia ? null : volumeUtilizado,
      consumo_validado: !reterPorAnomalia,
      anomalia_metrologica: anomalia,
      peso_retorno_efetivo: reterPorAnomalia ? null : dados.pesoRetorno,
      unidade_medida_utilizada: liquido ? "ml" : "g",
      ...(avisoHigroscopico && { aviso: "higroscopico_suspeito" }),
    });

    if (reterPorAnomalia) {
      tx.set(admin.firestore().collection("Historico_Frasco_Reagente").doc(), {
        id_frasco_reagente: frascoRef.id,
        id_almoxarifado: frasco.id_almoxarifado,
        id_gestor: claims.uid,
        id_emprestimo_reagente: emprestimoRef.id,
        tipo: "ENTROU_EM_QUARENTENA",
        motivo: "Inconsistência metrológica: " + anomalia,
        peso_medido: dados.pesoRetorno,
        tara_aplicada: pesoVazioReferencia,
        origem_tara: frasco.origem_tara ?? null,
        timestamp: FieldValue.serverTimestamp(),
      });
    }

    if (ficouVazio) {
      tx.set(admin.firestore().collection("Historico_Frasco_Reagente").doc(), {
        id_frasco_reagente: frascoRef.id,
        id_almoxarifado: frasco.id_almoxarifado,
        id_gestor: claims.uid,
        id_emprestimo_reagente: emprestimoRef.id,
        tipo: "FICOU_VAZIO",
        campo_ajustado: "tara_real_homologada",
        peso_medido: dados.pesoRetorno,
        tara_aplicada: taraReal ? pesoVazioReferencia : dados.pesoRetorno,
        peso_anterior: frasco.peso_frasco_vazio ?? null,
        confirmado_esgotamento: true,
        timestamp: FieldValue.serverTimestamp(),
      });
    }

    if (avisoHigroscopico) {
      tx.set(admin.firestore().collection("Historico_Frasco_Reagente").doc(), {
        id_frasco_reagente: frascoRef.id,
        id_almoxarifado: frasco.id_almoxarifado,
        id_gestor: claims.uid,
        id_emprestimo_reagente: emprestimoRef.id,
        tipo: "AJUSTE",
        campo_ajustado: "ganho_massa_higroscopia",
        peso_anterior: emprestimo.peso_saida,
        peso_novo: dados.pesoRetorno,
        medida_ajustada: dados.pesoRetorno - emprestimo.peso_saida,
        unidade_medida_ajustada: "g",
        timestamp: FieldValue.serverTimestamp(),
      });
    }

    if (perdaEvaporacao > 0 && !reterPorAnomalia) {
      tx.set(admin.firestore().collection("Historico_Frasco_Reagente").doc(), {
        id_frasco_reagente: frascoRef.id,
        id_almoxarifado: frasco.id_almoxarifado,
        id_gestor: claims.uid,
        id_emprestimo_reagente: emprestimoRef.id,
        tipo: "EVAPORACAO",
        medida_ajustada: perdaEvaporacao,
        unidade_medida_ajustada: "g",
        timestamp: FieldValue.serverTimestamp(),
      });
    }

    const histRef = admin.firestore().collection("Historico_Frasco_Reagente").doc();
    tx.set(histRef, {
      id_frasco_reagente: frascoRef.id,
      id_almoxarifado: frasco.id_almoxarifado,
      id_gestor: claims.uid,
      tipo: "ENTROU",
      id_emprestimo_reagente: emprestimoRef.id,
      peso_anterior: emprestimo.peso_saida,
      peso_novo: dados.pesoRetorno,
      medida_ajustada: reterPorAnomalia ? null : volumeUtilizado,
      unidade_medida_ajustada: liquido ? "ml" : "g",
      timestamp: FieldValue.serverTimestamp(),
    });

    const resultado = {
      pesoConsumido: reterPorAnomalia ? null : pesoConsumido,
      volumeUtilizado: reterPorAnomalia ? null : volumeUtilizado,
      consumoPendente: reterPorAnomalia,
      atrasado,
      frascoVencido,
      anomalia,
      avisoHigroscopico: Boolean(avisoHigroscopico),
    };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
  });
});

export async function existePendenciaMetrologicaTx(tx: FirebaseFirestore.Transaction, idFrasco: string): Promise<boolean> {
  const pend = await tx.get(
    admin.firestore().collection("Emprestimo_Reagente")
      .where("id_frasco_reagente", "==", idFrasco)
      .where("status", "==", "DEVOLVIDO_COM_ANOMALIA")
      .where("consumo_validado", "==", false)
      .limit(1)
  );
  return !pend.empty;
}

async function houveMovimentacaoFisicaPosteriorTx(
  tx: FirebaseFirestore.Transaction,
  idFrasco: string,
  desde: any
): Promise<boolean> {
  const desdeDate = typeof desde?.toDate === "function" ? desde.toDate() : (desde instanceof Date ? desde : null);
  let query = admin.firestore().collection("Historico_Frasco_Reagente")
    .where("id_frasco_reagente", "==", idFrasco)
    .where("tipo", "in", ["SAIU", "ENTROU", "EVAPORACAO", "INVENTARIO_ROTINA", "RECALIBRACAO_TARA"]);
  if (desdeDate) {
    query = query.where("timestamp", ">", desdeDate);
  }
  const eventos = await tx.get(query.limit(1));
  return !eventos.empty;
}

function finalizarPendenciaMetrologicaTx(
  tx: FirebaseFirestore.Transaction,
  emprestimoRef: FirebaseFirestore.DocumentReference,
  emprestimo: any,
  dados: { pesoRetornoEfetivo: number; medidaUtilizada: number; motivo: string; idGestor: string }
) {
  const historicoRef = admin.firestore().collection("Historico_Frasco_Reagente").doc();
  tx.set(historicoRef, {
    id_frasco_reagente: emprestimo.id_frasco_reagente,
    id_almoxarifado: emprestimo.id_almoxarifado,
    id_gestor: dados.idGestor,
    id_emprestimo_reagente: emprestimoRef.id,
    tipo: "AJUSTE",
    campo_ajustado: "medicao_devolucao_efetiva",
    peso_anterior: emprestimo.peso_retorno,
    peso_novo: dados.pesoRetornoEfetivo,
    motivo: dados.motivo,
    timestamp: FieldValue.serverTimestamp(),
  });
  tx.update(emprestimoRef, {
    consumo_validado: true,
    peso_retorno_efetivo: dados.pesoRetornoEfetivo,
    medida_utilizada: dados.medidaUtilizada,
    id_resolucao_metrologica: historicoRef.id,
  });
}

export const repetirPesagemDevolucaoAnomala = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const dados = validatePayload(RepetirPesagemDevolucaoAnomalaSchema, request.data);
  const emprestimoRef = admin.firestore().collection("Emprestimo_Reagente").doc(dados.idEmprestimo);
  const identidade = construirIdentidade(claims.uid, "REPETIR_PESAGEM_ANOMALA", {
    idEmprestimo: dados.idEmprestimo,
    pesoNovaMedicao: dados.pesoNovaMedicao,
    motivo: dados.motivo,
  });

  return admin.firestore().runTransaction(async (tx) => {
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as any;
    if (decisao.estado !== "NOVA") throw new HttpsError("failed-precondition", "Operação não concluída.");

    const emprestimoSnap = await tx.get(emprestimoRef);
    if (!emprestimoSnap.exists) throw new HttpsError("not-found", "Empréstimo não encontrado.");
    const emprestimo = emprestimoSnap.data()!;
    await validarGestorDoAlmoxarifadoTx(tx, claims, emprestimo.id_almoxarifado);

    if (emprestimo.status !== "DEVOLVIDO_COM_ANOMALIA" || emprestimo.consumo_validado !== false) {
      throw new HttpsError("failed-precondition", "Empréstimo sem pendência metrológica aberta.");
    }

    if (await houveMovimentacaoFisicaPosteriorTx(tx, emprestimo.id_frasco_reagente, emprestimo.data_devolucao_efetuada)) {
      tx.set(admin.firestore().collection("Historico_Frasco_Reagente").doc(), {
        id_frasco_reagente: emprestimo.id_frasco_reagente,
        id_almoxarifado: emprestimo.id_almoxarifado,
        id_gestor: claims.uid,
        id_emprestimo_reagente: emprestimoRef.id,
        tipo: "AJUSTE",
        campo_ajustado: "observacao_sem_evidencia",
        peso_novo: dados.pesoNovaMedicao,
        motivo: dados.motivo,
        timestamp: FieldValue.serverTimestamp(),
      });
      const resultado = { status: "PENDENTE_SEM_EVIDENCIA_SUFICIENTE" };
      registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
      return resultado;
    }

    const efetiva = dados.pesoNovaMedicao;
    const densidade = emprestimo.densidade_aplicada;
    const perdaBruta = Math.max(0, emprestimo.peso_saida - efetiva);
    const evaporacao = emprestimo.peso_perda_evaporacao || 0;
    if (evaporacao > perdaBruta) {
      throw new HttpsError("failed-precondition", "Evaporação declarada excede a nova perda bruta; pendência mantida.");
    }
    const consumoG = perdaBruta - evaporacao;
    const medidaUtilizada = densidade ? consumoG / densidade : consumoG;

    finalizarPendenciaMetrologicaTx(tx, emprestimoRef, emprestimo, {
      pesoRetornoEfetivo: efetiva,
      medidaUtilizada,
      motivo: dados.motivo,
      idGestor: claims.uid,
    });

    const frascoRef = admin.firestore().collection("Frasco_Reagente").doc(emprestimo.id_frasco_reagente);
    tx.update(frascoRef, {
      peso_atual: efetiva,
      data_ultima_pesagem: FieldValue.serverTimestamp(),
    });

    const resultado = { status: "OK", pesoRetornoEfetivo: efetiva, medidaUtilizada };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
  });
});

export const confirmarEsgotamentoAposInspecao = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const dados = validatePayload(ConfirmarEsgotamentoAposInspecaoSchema, request.data);
  const emprestimoRef = admin.firestore().collection("Emprestimo_Reagente").doc(dados.idEmprestimo);
  const identidade = construirIdentidade(claims.uid, "CONFIRMAR_ESGOTAMENTO_INSPECAO", {
    idEmprestimo: dados.idEmprestimo,
    pesoVazioRealMedido: dados.pesoVazioRealMedido,
    motivo: dados.motivo,
  });

  return admin.firestore().runTransaction(async (tx) => {
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as any;
    if (decisao.estado !== "NOVA") throw new HttpsError("failed-precondition", "Operação não concluída.");

    const emprestimoSnap = await tx.get(emprestimoRef);
    if (!emprestimoSnap.exists) throw new HttpsError("not-found", "Empréstimo não encontrado.");
    const emprestimo = emprestimoSnap.data()!;
    await validarGestorDoAlmoxarifadoTx(tx, claims, emprestimo.id_almoxarifado);

    if (emprestimo.status !== "DEVOLVIDO_COM_ANOMALIA" || emprestimo.consumo_validado !== false) {
      throw new HttpsError("failed-precondition", "Empréstimo sem pendência metrológica aberta.");
    }

    const frascoRef = admin.firestore().collection("Frasco_Reagente").doc(emprestimo.id_frasco_reagente);
    const frascoSnap = await tx.get(frascoRef);
    if (!frascoSnap.exists) throw new HttpsError("not-found", "Frasco não encontrado.");
    const frasco = frascoSnap.data()!;
    const taraRealAnterior = frasco.origem_tara === "MEDIDA_REAL";
    const divergente = taraRealAnterior && frasco.peso_frasco_vazio !== dados.pesoVazioRealMedido;

    const houveMovimentacao = await houveMovimentacaoFisicaPosteriorTx(
      tx,
      emprestimo.id_frasco_reagente,
      emprestimo.data_devolucao_efetuada
    );

    tx.update(frascoRef, {
      estado_fisico_frasco: "VAZIO",
      disponibilidade: "INDISPONIVEL",
      saldo_desconhecido: false,
      peso_atual: dados.pesoVazioRealMedido,
      saldo_aferido_g: 0,
      saldo_aferido_ml: frasco.saldo_aferido_ml === null ? null : 0,
      ...(!taraRealAnterior
        ? { peso_frasco_vazio: dados.pesoVazioRealMedido, origem_tara: "MEDIDA_REAL" }
        : {}),
    });

    if (divergente) {
      tx.set(admin.firestore().collection("Historico_Frasco_Reagente").doc(), {
        id_frasco_reagente: emprestimo.id_frasco_reagente,
        id_almoxarifado: emprestimo.id_almoxarifado,
        id_gestor: claims.uid,
        id_emprestimo_reagente: emprestimoRef.id,
        tipo: "AJUSTE",
        campo_ajustado: "DISCREPANCIA_TARA_REAL",
        peso_anterior: frasco.peso_frasco_vazio,
        peso_novo: dados.pesoVazioRealMedido,
        motivo: dados.motivo,
        timestamp: FieldValue.serverTimestamp(),
      });
      tx.update(emprestimoRef, { anomalia_metrologica: "DISCREPANCIA_TARA_REAL" });
    }

    if (houveMovimentacao) {
      const resultado = { status: "VAZIO_REGISTRADO_PENDENCIA_MANTIDA" };
      registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
      return resultado;
    }

    const perdaBruta = Math.max(0, emprestimo.peso_saida - dados.pesoVazioRealMedido);
    const evaporacao = emprestimo.peso_perda_evaporacao || 0;
    if (evaporacao > perdaBruta) {
      throw new HttpsError("failed-precondition", "Evaporação declarada excede a perda bruta; pendência não pode ser validada.");
    }
    const consumoG = perdaBruta - evaporacao;
    const densidade = emprestimo.densidade_aplicada;
    const medidaEfetiva = densidade ? consumoG / densidade : consumoG;

    finalizarPendenciaMetrologicaTx(tx, emprestimoRef, emprestimo, {
      pesoRetornoEfetivo: dados.pesoVazioRealMedido,
      medidaUtilizada: medidaEfetiva,
      motivo: dados.motivo,
      idGestor: claims.uid,
    });

    const resultado = { status: "OK", vazioConfirmado: true };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
  });
});

export const recalibrarTaraFrascoEsgotado = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const dados = validatePayload(RecalibrarTaraFrascoEsgotadoSchema, request.data);
  const frascoRef = admin.firestore().collection("Frasco_Reagente").doc(dados.idFrasco);
  const identidade = construirIdentidade(claims.uid, "RECALIBRAR_TARA", {
    idFrasco: dados.idFrasco,
    pesoVazioReal: dados.pesoVazioReal,
    motivo: dados.motivo,
  });

  return admin.firestore().runTransaction(async (tx) => {
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as any;
    if (decisao.estado !== "NOVA") throw new HttpsError("failed-precondition", "Operação não concluída.");

    const frascoSnap = await tx.get(frascoRef);
    if (!frascoSnap.exists) throw new HttpsError("not-found", "Frasco não encontrado.");
    const frasco = frascoSnap.data()!;
    await validarGestorDoAlmoxarifadoTx(tx, claims, frasco.id_almoxarifado);

    if (frasco.estado_fisico_frasco !== "VAZIO") {
      throw new HttpsError("failed-precondition", "A tara real só pode ser homologada com o recipiente efetivamente vazio e pesado.");
    }

    tx.update(frascoRef, {
      peso_frasco_vazio: dados.pesoVazioReal,
      origem_tara: "MEDIDA_REAL",
      saldo_aferido_g: 0,
      saldo_aferido_ml: frasco.saldo_aferido_ml === null ? null : 0,
      peso_atual: dados.pesoVazioReal,
      saldo_desconhecido: false,
      data_ultima_pesagem: FieldValue.serverTimestamp(),
    });

    tx.set(admin.firestore().collection("Historico_Frasco_Reagente").doc(), {
      id_frasco_reagente: dados.idFrasco,
      id_almoxarifado: frasco.id_almoxarifado,
      id_gestor: claims.uid,
      tipo: "AJUSTE",
      campo_ajustado: "peso_frasco_vazio",
      peso_anterior: frasco.peso_frasco_vazio ?? null,
      peso_novo: dados.pesoVazioReal,
      motivo: dados.motivo,
      timestamp: FieldValue.serverTimestamp(),
    });

    const resultado = { status: "OK", novaTara: dados.pesoVazioReal };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
  });
});

export const registrarPesagemRotina = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const dados = validatePayload(RegistrarPesagemRotinaSchema, request.data);
  const frascoRef = admin.firestore().collection("Frasco_Reagente").doc(dados.idFrasco);
  const identidade = construirIdentidade(claims.uid, "REGISTRAR_PESAGEM_ROTINA", {
    idFrasco: dados.idFrasco,
    pesoAtual: dados.pesoAtual,
    motivo: dados.motivo ?? null,
  });

  return admin.firestore().runTransaction(async (tx) => {
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as any;
    if (decisao.estado !== "NOVA") throw new HttpsError("failed-precondition", "Operação não concluída.");

    const frascoSnap = await tx.get(frascoRef);
    if (!frascoSnap.exists) throw new HttpsError("not-found", "Frasco não encontrado.");
    const frasco = frascoSnap.data()!;
    await validarGestorDoAlmoxarifadoTx(tx, claims, frasco.id_almoxarifado);

    if (frasco.disponibilidade === "EMPRESTADO") {
      throw new HttpsError("failed-precondition", "Frasco em empréstimo ativo não pode sofrer pesagem de rotina no almoxarifado.");
    }

    const pesoAnterior = frasco.peso_atual ?? null;
    tx.update(frascoRef, {
      peso_atual: dados.pesoAtual,
      data_ultima_pesagem: FieldValue.serverTimestamp(),
    });

    tx.set(admin.firestore().collection("Historico_Frasco_Reagente").doc(), {
      id_frasco_reagente: dados.idFrasco,
      id_almoxarifado: frasco.id_almoxarifado,
      tipo: "INVENTARIO_ROTINA",
      peso_anterior: pesoAnterior,
      peso_novo: dados.pesoAtual,
      motivo: dados.motivo?.trim() || "Pesagem periódica de inventário de rotina",
      motivo_automatico: !dados.motivo?.trim(),
      id_gestor: claims.uid,
      timestamp: FieldValue.serverTimestamp(),
    });

    const resultado = { status: "OK", idFrasco: dados.idFrasco, pesoAtual: dados.pesoAtual };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
  });
});

export const descartarFrasco = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const dados = validatePayload(DescartarFrascoSchema, request.data);
  const frascoRef = admin.firestore().collection("Frasco_Reagente").doc(dados.idFrasco);
  const identidade = construirIdentidade(claims.uid, "DESCARTAR_FRASCO", {
    idFrasco: dados.idFrasco,
    motivo: dados.motivo,
  });

  return admin.firestore().runTransaction(async (tx) => {
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as any;
    if (decisao.estado !== "NOVA") throw new HttpsError("failed-precondition", "Operação não concluída.");

    const frascoSnap = await tx.get(frascoRef);
    if (!frascoSnap.exists) throw new HttpsError("not-found", "Frasco não encontrado.");
    const frasco = frascoSnap.data()!;
    await validarGestorDoAlmoxarifadoTx(tx, claims, frasco.id_almoxarifado);

    const authRef = admin.firestore().collection("Pendencias_Descarte_Frasco").doc(dados.idFrasco);
    const authSnap = await tx.get(authRef);

    if (frasco.em_quarentena === true) {
      throw new HttpsError("failed-precondition", "Resolva a quarentena antes do descarte.");
    }
    if (frasco.disponibilidade === "EMPRESTADO") {
      throw new HttpsError("failed-precondition", "Frasco com empréstimo ativo não pode ser descartado.");
    }

    const autorizadoPorLaudo = authSnap.exists && authSnap.data()?.origem === "QUARENTENA";
    const aptoParaDescarte =
      frasco.estado_fisico_frasco === "VAZIO" ||
      frasco.estado_fisico_frasco === "QUEBRADO" ||
      (frasco.vencido === true && frasco.uso_vencido_autorizado === false) ||
      autorizadoPorLaudo;

    if (!aptoParaDescarte) {
      throw new HttpsError("failed-precondition", "Apenas frascos vazios, quebrados ou vencidos aguardando descarte, ou com autorização técnica de descarte, podem ser descartados institucionalmente.");
    }

    tx.update(frascoRef, {
      estado_fisico_frasco: "DESCARTADO",
      disponibilidade: "INDISPONIVEL",
      em_quarentena: false,
      detalhe_status: "Frasco descartado institucionalmente: " + dados.motivo,
    });

    if (autorizadoPorLaudo) tx.delete(authRef);

    tx.set(admin.firestore().collection("Historico_Frasco_Reagente").doc(), {
      id_frasco_reagente: dados.idFrasco,
      id_almoxarifado: frasco.id_almoxarifado,
      id_gestor: claims.uid,
      tipo: "FOI_DESCARTADO",
      motivo: dados.motivo,
      origem_autorizacao: autorizadoPorLaudo ? "QUARENTENA" : null,
      timestamp: FieldValue.serverTimestamp(),
    });

    const resultado = { status: "OK", idFrasco: dados.idFrasco };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
  });
});

export const registrarExtravioOuReencontro = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const dados = validatePayload(RegistrarExtravioOuReencontroSchema, request.data);
  const frascoRef = admin.firestore().collection("Frasco_Reagente").doc(dados.idFrasco);
  const authRef = admin.firestore().collection("Pendencias_Descarte_Frasco").doc(dados.idFrasco);

  const payloadIdentidade = dados.tipoAcao === "EXTRAVIAR"
    ? { tipoAcao: "EXTRAVIAR", idFrasco: dados.idFrasco, motivo: dados.motivo }
    : { tipoAcao: "REENCONTRAR", idFrasco: dados.idFrasco, estadoFisicoConstatado: dados.estadoFisicoConstatado, motivo: dados.motivo };
  const identidade = construirIdentidade(claims.uid, "EXTRAVIO_OU_REENCONTRO", payloadIdentidade);

  return admin.firestore().runTransaction(async (tx) => {
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as any;
    if (decisao.estado !== "NOVA") throw new HttpsError("failed-precondition", "Operação não concluída.");

    const frascoSnap = await tx.get(frascoRef);
    if (!frascoSnap.exists) throw new HttpsError("not-found", "Frasco não encontrado.");
    const frasco = frascoSnap.data()!;
    await validarGestorDoAlmoxarifadoTx(tx, claims, frasco.id_almoxarifado);

    if (frasco.estado_fisico_frasco === "DESCARTADO") {
      throw new HttpsError("failed-precondition", "Frasco descartado é terminal e não pode sofrer extravio ou reencontro.");
    }

    const emprestimoSnap = await tx.get(
      admin.firestore()
        .collection("Emprestimo_Frasco")
        .where("id_frasco_reagente", "==", dados.idFrasco)
        .where("status", "==", "EMPRESTADO")
        .limit(1)
    );

    const pendenciaDescarteSnap = await tx.get(authRef);

    if (dados.tipoAcao === "EXTRAVIAR") {
      if (frasco.situacao_localizacao === "EXTRAVIADO") {
        throw new HttpsError("failed-precondition", "Frasco já está registrado como extraviado.");
      }

      if (!emprestimoSnap.empty) {
        const empDoc = emprestimoSnap.docs[0];
        tx.update(empDoc.ref, {
          status: "ENCERRADO_EXTRAORDINARIO",
          tipo_encerramento_excepcional: "EXTRAVIO_SINISTRO",
          data_devolucao_efetuada: FieldValue.serverTimestamp(),
          id_gestor_devolucao: claims.uid,
          detalhe_encerramento: dados.motivo,
        });
      }

      if (pendenciaDescarteSnap.exists) {
        tx.delete(authRef);
      }

      tx.update(frascoRef, {
        situacao_localizacao: "EXTRAVIADO",
        disponibilidade: "INDISPONIVEL",
        descarte_autorizado: false,
        detalhe_status: "Frasco extraviado: " + dados.motivo,
      });

      tx.set(admin.firestore().collection("Historico_Frasco_Reagente").doc(), {
        id_frasco_reagente: dados.idFrasco,
        id_almoxarifado: frasco.id_almoxarifado,
        id_gestor: claims.uid,
        tipo: "EXTRAVIO",
        motivo: dados.motivo,
        teve_encerramento_emprestimo: !emprestimoSnap.empty,
        timestamp: FieldValue.serverTimestamp(),
      });

      const resultado = { status: "OK", idFrasco: dados.idFrasco, situacao_localizacao: "EXTRAVIADO" };
      registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
      return resultado;
    } else {
      if (frasco.situacao_localizacao !== "EXTRAVIADO") {
        throw new HttpsError("failed-precondition", "Apenas frascos previamente extraviados podem ser reencontrados.");
      }

      const anterior = frasco.estado_fisico_frasco;
      const constatado = dados.estadoFisicoConstatado;

      if (constatado === "FECHADO") {
        if (anterior !== "FECHADO" || frasco.data_abertura) {
          throw new HttpsError("failed-precondition", "Frasco aberto anteriormente não pode ser reencontrado como fechado.");
        }
      } else if (constatado === "ABERTO") {
        if (anterior !== "FECHADO" && anterior !== "ABERTO") {
          throw new HttpsError("failed-precondition", "Frasco vazio ou quebrado não pode ser reencontrado como aberto.");
        }
      } else if (constatado === "VAZIO") {
        if (anterior !== "VAZIO") {
          throw new HttpsError("failed-precondition", "Transição física impossível no reencontro: frasco não estava vazio antes do extravio.");
        }
      } else if (constatado === "QUEBRADO") {
        // Quebra constatada é permitida
      }

      const atualizacao: Record<string, unknown> = {
        situacao_localizacao: "LOCALIZADO",
        em_quarentena: true,
        disponibilidade: "INDISPONIVEL",
        descarte_autorizado: false,
        estado_fisico_frasco: constatado,
        detalhe_status: "Frasco reencontrado e retido em quarentena compulsória: " + dados.motivo,
      };

      if (anterior === "FECHADO" && constatado === "ABERTO") {
        atualizacao.abertura_historica_desconhecida = true;
      }

      tx.update(frascoRef, atualizacao);

      tx.set(admin.firestore().collection("Historico_Frasco_Reagente").doc(), {
        id_frasco_reagente: dados.idFrasco,
        id_almoxarifado: frasco.id_almoxarifado,
        id_gestor: claims.uid,
        tipo: "REENCONTRO",
        estado_fisico_anterior: anterior,
        estado_fisico_constatado: constatado,
        motivo: dados.motivo,
        timestamp: FieldValue.serverTimestamp(),
      });

      const resultado = {
        status: "OK",
        idFrasco: dados.idFrasco,
        situacao_localizacao: "LOCALIZADO",
        em_quarentena: true,
        estado_fisico: constatado,
      };
      registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
      return resultado;
    }
  });
});

export const colocarFrascoEmQuarentena = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const dados = validatePayload(ColocarFrascoEmQuarentenaSchema, request.data);
  const frascoRef = admin.firestore().collection("Frasco_Reagente").doc(dados.idFrasco);
  const identidade = construirIdentidade(claims.uid, "COLOCAR_QUARENTENA", {
    idFrasco: dados.idFrasco,
    motivo: dados.motivo,
  });

  return admin.firestore().runTransaction(async (tx) => {
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as any;
    if (decisao.estado !== "NOVA") throw new HttpsError("failed-precondition", "Operação não concluída.");

    const frascoSnap = await tx.get(frascoRef);
    if (!frascoSnap.exists) throw new HttpsError("not-found", "Frasco não encontrado.");
    const frasco = frascoSnap.data()!;
    await validarGestorDoAlmoxarifadoTx(tx, claims, frasco.id_almoxarifado);

    if (frasco.estado_fisico_frasco === "DESCARTADO") {
      throw new HttpsError("failed-precondition", "Frasco descartado não pode entrar em quarentena.");
    }
    if (frasco.situacao_localizacao === "EXTRAVIADO") {
      throw new HttpsError("failed-precondition", "Frasco extraviado não pode ser colocado em quarentena.");
    }
    if (frasco.em_quarentena === true) {
      throw new HttpsError("failed-precondition", "Frasco já se encontra em quarentena.");
    }
    if (frasco.disponibilidade === "EMPRESTADO") {
      throw new HttpsError("failed-precondition", "Frasco com empréstimo ativo não pode ser colocado em quarentena.");
    }

    tx.update(frascoRef, {
      em_quarentena: true,
      disponibilidade: "INDISPONIVEL",
      detalhe_status: "Frasco colocado em quarentena: " + dados.motivo,
    });

    tx.set(admin.firestore().collection("Historico_Frasco_Reagente").doc(), {
      id_frasco_reagente: dados.idFrasco,
      id_almoxarifado: frasco.id_almoxarifado,
      id_gestor: claims.uid,
      tipo: "ENTROU_EM_QUARENTENA",
      motivo: dados.motivo,
      timestamp: FieldValue.serverTimestamp(),
    });

    const resultado = { status: "OK", idFrasco: dados.idFrasco, em_quarentena: true };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
  });
});

export const resolverQuarentenaFrasco = onCall(async (request) => {
  const claims = extrairClaimsAutoridade(request);
  const dados = validatePayload(ResolverQuarentenaFrascoSchema, request.data);
  const frascoRef = admin.firestore().collection("Frasco_Reagente").doc(dados.idFrasco);
  const authRef = admin.firestore().collection("Pendencias_Descarte_Frasco").doc(dados.idFrasco);
  const identidade = construirIdentidade(claims.uid, "RESOLVER_QUARENTENA", {
    idFrasco: dados.idFrasco,
    decisao: dados.decisao,
    motivo: dados.motivo,
  });

  return admin.firestore().runTransaction(async (tx) => {
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as any;
    if (decisao.estado !== "NOVA") throw new HttpsError("failed-precondition", "Operação não concluída.");

    const frascoSnap = await tx.get(frascoRef);
    if (!frascoSnap.exists) throw new HttpsError("not-found", "Frasco não encontrado.");
    const frasco = frascoSnap.data()!;
    await validarGestorDoAlmoxarifadoTx(tx, claims, frasco.id_almoxarifado);

    if (frasco.em_quarentena !== true) {
      throw new HttpsError("failed-precondition", "Frasco não está em quarentena.");
    }
    if (frasco.situacao_localizacao === "EXTRAVIADO") {
      throw new HttpsError("failed-precondition", "Frasco extraviado deve ser reencontrado antes de resolver quarentena.");
    }

    const pendenciaMetrologicaAtiva = await existePendenciaMetrologicaTx(tx, dados.idFrasco);
    if (pendenciaMetrologicaAtiva) {
      throw new HttpsError("failed-precondition", "Frasco com anomalia metrológica pendente deve ser resolvido pelas rotas metrológicas normativas (Rota 1, 2 ou 3).");
    }

    if (dados.decisao === "VOLTAR_A_DISPONIVEL") {
      if (frasco.estado_fisico_frasco === "VAZIO" || frasco.estado_fisico_frasco === "QUEBRADO") {
        throw new HttpsError("failed-precondition", "Frasco vazio ou quebrado não pode voltar a disponível.");
      }

      const estaVencido = Boolean(frasco.vencido);
      const usoVencidoAutorizado = Boolean(frasco.uso_vencido_autorizado);
      const podeFicarDisponivel = !estaVencido || usoVencidoAutorizado;

      tx.update(frascoRef, {
        em_quarentena: false,
        disponibilidade: podeFicarDisponivel ? "DISPONIVEL" : "INDISPONIVEL",
        detalhe_status: "Liberado da quarentena: " + dados.motivo,
      });

      tx.set(admin.firestore().collection("Historico_Frasco_Reagente").doc(), {
        id_frasco_reagente: dados.idFrasco,
        id_almoxarifado: frasco.id_almoxarifado,
        id_gestor: claims.uid,
        tipo: "LIBERADO_QUARENTENA",
        motivo: dados.motivo,
        timestamp: FieldValue.serverTimestamp(),
      });

      const resultado = { status: "OK", idFrasco: dados.idFrasco, decisao: "VOLTAR_A_DISPONIVEL" };
      registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
      return resultado;
    } else {
      tx.update(frascoRef, {
        em_quarentena: false,
        disponibilidade: "INDISPONIVEL",
        descarte_autorizado: true,
        detalhe_status: "Autorizado para descarte institucional: " + dados.motivo,
      });

      tx.set(authRef, {
        id_frasco: dados.idFrasco,
        id_almoxarifado: frasco.id_almoxarifado,
        origem: "QUARENTENA",
        motivo: dados.motivo,
        autorizado_por: claims.uid,
        data_autorizacao: FieldValue.serverTimestamp(),
      });

      tx.set(admin.firestore().collection("Historico_Frasco_Reagente").doc(), {
        id_frasco_reagente: dados.idFrasco,
        id_almoxarifado: frasco.id_almoxarifado,
        id_gestor: claims.uid,
        tipo: "PENDENTE_DE_DESCARTE",
        motivo: dados.motivo,
        timestamp: FieldValue.serverTimestamp(),
      });

      const resultado = { status: "OK", idFrasco: dados.idFrasco, decisao: "PENDENTE_DE_DESCARTE" };
      registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
      return resultado;
    }
  });
});
