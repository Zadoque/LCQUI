import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { extrairClaimsAutoridade, resolverAutoridadePersistidaTx, validarAutoridadePersistida } from "./auth";
import { validatePayload } from "./utils/validation";
import { construirIdentidade, registrarOperacaoConcluidaTx, resolverOperacaoTx } from "./idempotencia";
import {
  CadastroSubstanciaQuimicaSchema,
  CadastroResumoReagenteSchema,
  CadastroEspecificacaoSchema,
  CadastroLoteSchema,
} from "./schemas/reagentes_base.schema";

export const cadastrarSubstanciaQuimica = onCall(async (request) => {
  const dados = validatePayload(CadastroSubstanciaQuimicaSchema, request.data);
  await validarAutoridadePersistida(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);

  const substanciaRef = admin.firestore().collection("Substancia_Quimica").doc();
  await substanciaRef.set({
    nome: dados.nome.trim(),
    cas_number: dados.casNumber ?? null,
    formula_quimica: dados.formulaQuimica ?? null,
    ativo: dados.ativo,
  });

  return { idSubstanciaQuimica: substanciaRef.id };
});

export const cadastrarResumoReagente = onCall(async (request) => {
  const dados = validatePayload(CadastroResumoReagenteSchema, request.data);
  await validarAutoridadePersistida(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);

  const nome = dados.nome.trim();
  const letraInicial = nome.charAt(0).toUpperCase();

  const resumoRef = admin.firestore().collection("Resumo_Reagente").doc();
  await resumoRef.set({
    nome: nome,
    tipo_substancia: dados.tipoSubstancia,
    natureza_quimica: dados.naturezaQuimica,
    requer_pesagem_frequente: dados.requerPesagemFrequente,
    qtd_em_que_e_considerado_escasso: dados.qtdEmQueEConsideradoEscasso,
    frequencia_pesagem_dias: dados.frequenciaPesagemDias ?? null,
    letra_inicial: letraInicial,
    estado_fisico: dados.estadoFisico, // Estado físico agora pertence ao Resumo
  });

  return { idResumoReagente: resumoRef.id };
});

export const cadastrarEspecificacao = onCall(async (request) => {
  const dados = validatePayload(CadastroEspecificacaoSchema, request.data);
  const claims = extrairClaimsAutoridade(request);

  return admin.firestore().runTransaction(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Chefe_Geral", "Gestor_Almoxarifado"]);
    const resumoRef = admin.firestore().collection("Resumo_Reagente").doc(dados.idResumoReagente);
    const resumoSnap = await tx.get(resumoRef);
    if (!resumoSnap.exists) {
      throw new HttpsError("not-found", "Resumo do reagente não encontrado.");
    }

    const resumoData = resumoSnap.data()!;
    if (resumoData.tipo_substancia === "MISTURA" && (!dados.composicao || dados.composicao.length === 0)) {
      throw new HttpsError("invalid-argument", "Para reagentes do tipo MISTURA a composição é obrigatória.");
    }

    if (resumoData.tipo_substancia === "PURA" && !dados.idSubstanciaQuimica) {
      throw new HttpsError("invalid-argument", "Para reagentes do tipo PURA a substância química base é obrigatória.");
    }

    if (resumoData.estado_fisico === "LIQUIDO" && !dados.densidade) {
      throw new HttpsError("invalid-argument", "Densidade é obrigatória para reagentes líquidos.");
    }

    // Valida duplicidade de composição
    if (dados.composicao && dados.composicao.length > 0) {
      const substanciasUnicas = new Set(dados.composicao.map((c) => c.idSubstanciaQuimica));
      if (substanciasUnicas.size !== dados.composicao.length) {
        throw new HttpsError("invalid-argument", "A composição possui substâncias duplicadas.");
      }
    }

    const especRef = resumoRef.collection("Especificacoes").doc();

    let composicao: any[] = [];
    if (resumoData.tipo_substancia === "PURA") {
      composicao.push({
        id_substancia_quimica: dados.idSubstanciaQuimica,
        valor_composicao: null,
        tipo_concentracao: null,
        unidade: null,
      });
    } else {
      composicao = (dados.composicao ?? []).map(c => ({
        id_substancia_quimica: c.idSubstanciaQuimica,
        valor_composicao: c.valorComposicao ?? null,
        tipo_concentracao: c.tipoConcentracao ?? null,
        unidade: c.unidade ?? null,
      }));
    }

    const unidadeDeMedida = (resumoData.estado_fisico === "LIQUIDO" || resumoData.estado_fisico === "GASOSO") ? "ml" : "g";

    tx.set(especRef, {
      id_resumo_reagente: dados.idResumoReagente,
      descricao: dados.descricao,
      fabricante: dados.fabricante ?? null,
      codigo_produto_fabricante: dados.codigoProdutoFabricante ?? null,
      grau_pureza: dados.grauPureza ?? null,
      densidade: dados.densidade ?? null,
      estado_fisico: resumoData.estado_fisico,
      unidade_de_medida: unidadeDeMedida,
      classe_inflamabilidade: dados.classeInflamabilidade,
      eh_controlado_pf: dados.ehControladoPf,
      eh_controlado_eb: dados.ehControladoEb,
      link_fds_fispq: dados.linkFdsFispq ?? null,
      composicao: composicao,
    });

    return { idEspecificacao: especRef.id };
  });
});

export const cadastrarLote = onCall(async (request) => {
  const dados = validatePayload(CadastroLoteSchema, request.data);
  const claims = extrairClaimsAutoridade(request);
  const dataCivil = (value: string, campo: string): Date => {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new HttpsError("invalid-argument", `${campo} inválida.`);
    }
    return date;
  };
  const dataAquisicao = dataCivil(dados.dataAquisicao, "Data de aquisição");
  const dataFabricacao = dataCivil(dados.dataFabricacao, "Data de fabricação");
  const dataValidade = dataCivil(dados.dataValidade, "Data de validade");
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  if (dataAquisicao > hoje) throw new HttpsError("invalid-argument", "Data de aquisição não pode estar no futuro.");
  if (dataFabricacao > dataValidade) throw new HttpsError("invalid-argument", "Data de fabricação não pode ser posterior à validade.");
  const fornecedor = dados.nomeFornecedor.trim();
  const numeroLote = dados.numeroLote.trim();
  const notaFiscal = dados.notaFiscal.trim();
  const identidade = construirIdentidade(claims.uid, "CADASTRAR_LOTE", {
    idResumoReagente: dados.idResumoReagente,
    idEspecificacaoReagente: dados.idEspecificacaoReagente,
    dataAquisicao: dados.dataAquisicao,
    qtdFrascosComprados: dados.qtdFrascosComprados,
    nomeFornecedor: fornecedor,
    numeroLote,
    notaFiscal,
    dataFabricacao: dados.dataFabricacao,
    dataValidade: dados.dataValidade,
  });
  const chave = createHash("sha256").update(JSON.stringify([
    dados.idEspecificacaoReagente, fornecedor, numeroLote,
  ])).digest("hex");

  return admin.firestore().runTransaction(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Chefe_Geral", "Gestor_Almoxarifado"]);
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as { idLote: string };
    if (decisao.estado !== "NOVA") throw new HttpsError("failed-precondition", "Operação de cadastro de lote não concluída.");

    const resumoRef = admin.firestore().collection("Resumo_Reagente").doc(dados.idResumoReagente);
    const resumoSnap = await tx.get(resumoRef);
    if (!resumoSnap.exists) {
      throw new HttpsError("not-found", "Resumo do reagente não encontrado.");
    }

    const especRef = resumoRef.collection("Especificacoes").doc(dados.idEspecificacaoReagente);
    const especSnap = await tx.get(especRef);
    if (!especSnap.exists) {
      throw new HttpsError("not-found", "Especificação de reagente não encontrada.");
    }
    if (especSnap.data()?.id_resumo_reagente && especSnap.data()?.id_resumo_reagente !== dados.idResumoReagente) {
      throw new HttpsError("failed-precondition", "Especificação não pertence ao resumo informado.");
    }

    const nomeReagente = resumoSnap.data()!.nome;

    const loteRef = admin.firestore().collection("Lote").doc();
    const chaveRef = admin.firestore().collection("Chaves_Unicas").doc(`Lote__${chave}`);
    const chaveSnap = await tx.get(chaveRef);
    if (chaveSnap.exists) throw new HttpsError("already-exists", "Já existe um lote com este número e fornecedor para esta especificação.");
    tx.create(chaveRef, {
      tipo: "Lote",
      id_recurso: loteRef.id,
      chave_recurso: `${dados.idEspecificacaoReagente}__${fornecedor}__${numeroLote}`,
      criado_em: FieldValue.serverTimestamp(),
    });
    tx.set(loteRef, {
      id: loteRef.id,
      id_resumo_reagente: dados.idResumoReagente,
      id_especificacao_reagente: dados.idEspecificacaoReagente,
      nome_reagente: nomeReagente, // Denormalizado para buscas eficientes
      data_aquisicao: dataAquisicao,
      qtd_frascos_comprados: dados.qtdFrascosComprados,
      nome_fornecedor: fornecedor,
      numero_lote: numeroLote,
      nota_fiscal: notaFiscal,
      data_fabricacao: dataFabricacao.toISOString().slice(0, 10),
      data_validade: dataValidade.toISOString().slice(0, 10),
      cadastrado_em: FieldValue.serverTimestamp(),
      cadastrado_por: request.auth!.uid,
    });
    const resultado = { idLote: loteRef.id };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
  });
});
