import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { validarPermissao } from "./auth";
import { validatePayload } from "./utils/validation";
import {
  CadastroSubstanciaQuimicaSchema,
  CadastroResumoReagenteSchema,
  CadastroEspecificacaoSchema,
  CadastroLoteSchema,
} from "./schemas/reagentes_base.schema";

export const cadastrarSubstanciaQuimica = onCall(async (request) => {
  const dados = validatePayload(CadastroSubstanciaQuimicaSchema, request.data);
  validarPermissao(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);

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
  validarPermissao(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);

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
  validarPermissao(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);

  return admin.firestore().runTransaction(async (tx) => {
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
  validarPermissao(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);

  return admin.firestore().runTransaction(async (tx) => {
    // 1. Verifica duplicidade
    const lotesRef = admin.firestore().collection("Lote");
    const snapshot = await tx.get(
      lotesRef
        .where("id_especificacao_reagente", "==", dados.idEspecificacaoReagente)
        .where("nome_fornecedor", "==", dados.nomeFornecedor)
        .where("numero_lote", "==", dados.numeroLote)
        .limit(1)
    );

    if (!snapshot.empty) {
      throw new HttpsError("already-exists", "Já existe um lote com este número e fornecedor para esta especificação.");
    }

    // 2. Busca o nome do reagente para denormalização (Section 5)
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

    const nomeReagente = resumoSnap.data()!.nome;

    const loteRef = admin.firestore().collection("Lote").doc();
    tx.set(loteRef, {
      id_especificacao_reagente: dados.idEspecificacaoReagente,
      nome_reagente: nomeReagente, // Denormalizado para buscas eficientes
      data_aquisicao: new Date(dados.dataAquisicao),
      qtd_frascos_comprados: dados.qtdFrascosComprados,
      nome_fornecedor: dados.nomeFornecedor,
      numero_lote: dados.numeroLote,
      nota_fiscal: dados.notaFiscal,
      data_fabricacao: new Date(dados.dataFabricacao),
      data_validade: new Date(dados.dataValidade),
      cadastrado_em: admin.firestore.FieldValue.serverTimestamp(),
      cadastrado_por: request.auth!.uid,
    });

    return { idLote: loteRef.id };
  });
});
