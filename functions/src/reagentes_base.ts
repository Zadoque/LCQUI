import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { extrairClaimsAutoridade, resolverAutoridadePersistidaTx } from "./auth";
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
  const claims = extrairClaimsAutoridade(request);
  const casNorm = dados.casNumber ? dados.casNumber.trim() : null;
  const identidade = construirIdentidade(claims.uid, "CADASTRAR_SUBSTANCIA_QUIMICA", {
    nome: dados.nome.trim(),
    casNumber: casNorm,
    formulaQuimica: dados.formulaQuimica ? dados.formulaQuimica.trim() : null,
    ativo: dados.ativo,
  });

  return admin.firestore().runTransaction(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Chefe_Geral", "Gestor_Almoxarifado"]);
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as { idSubstanciaQuimica: string };
    if (decisao.estado !== "NOVA") throw new HttpsError("failed-precondition", "Operação de cadastro de substância química não concluída.");

    const substanciaRef = admin.firestore().collection("Substancia_Quimica").doc();

    if (casNorm) {
      const chaveCasRef = admin.firestore().collection("Chaves_Unicas").doc(`Substancia_Quimica__CAS__${casNorm}`);
      const chaveCasSnap = await tx.get(chaveCasRef);
      if (chaveCasSnap.exists) {
        throw new HttpsError("already-exists", `Já existe uma substância química cadastrada com o número CAS ${casNorm}.`);
      }
      tx.set(chaveCasRef, {
        tipo: "Substancia_Quimica_CAS",
        id_recurso: substanciaRef.id,
        chave_recurso: casNorm,
        criado_em: FieldValue.serverTimestamp(),
      });
    }

    tx.set(substanciaRef, {
      id: substanciaRef.id,
      nome: dados.nome.trim(),
      cas_number: casNorm,
      formula_quimica: dados.formulaQuimica ? dados.formulaQuimica.trim() : null,
      ativo: dados.ativo,
      criado_em: FieldValue.serverTimestamp(),
      criado_por: claims.uid,
    });

    const resultado = { idSubstanciaQuimica: substanciaRef.id };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
  });
});

export const cadastrarResumoReagente = onCall(async (request) => {
  const dados = validatePayload(CadastroResumoReagenteSchema, request.data);
  const claims = extrairClaimsAutoridade(request);
  const nome = dados.nome.trim();
  const letraInicial = nome.charAt(0).toUpperCase();
  const frequenciaPesagem = dados.requerPesagemFrequente ? (dados.frequenciaPesagemDias ?? null) : null;
  const identidade = construirIdentidade(claims.uid, "CADASTRAR_RESUMO_REAGENTE", {
    nome,
    tipoSubstancia: dados.tipoSubstancia,
    naturezaQuimica: dados.naturezaQuimica,
    estadoFisico: dados.estadoFisico,
    requerPesagemFrequente: dados.requerPesagemFrequente,
    frequenciaPesagemDias: frequenciaPesagem,
    ehHigroscopico: dados.ehHigroscopico,
    qtdEmQueEConsideradoEscasso: dados.qtdEmQueEConsideradoEscasso,
  });

  return admin.firestore().runTransaction(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Chefe_Geral", "Gestor_Almoxarifado"]);
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as { idResumoReagente: string };
    if (decisao.estado !== "NOVA") throw new HttpsError("failed-precondition", "Operação de cadastro de resumo de reagente não concluída.");

    const resumoRef = admin.firestore().collection("Resumo_Reagente").doc();
    tx.set(resumoRef, {
      id: resumoRef.id,
      nome,
      tipo_substancia: dados.tipoSubstancia,
      natureza_quimica: dados.naturezaQuimica,
      requer_pesagem_frequente: dados.requerPesagemFrequente,
      qtd_em_que_e_considerado_escasso: dados.qtdEmQueEConsideradoEscasso,
      frequencia_pesagem_dias: frequenciaPesagem,
      letra_inicial: letraInicial,
      estado_fisico: dados.estadoFisico,
      eh_higroscopico: dados.ehHigroscopico,
      criado_em: FieldValue.serverTimestamp(),
      criado_por: claims.uid,
    });

    const resultado = { idResumoReagente: resumoRef.id };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
  });
});

export const cadastrarEspecificacao = onCall(async (request) => {
  const dados = validatePayload(CadastroEspecificacaoSchema, request.data);
  const claims = extrairClaimsAutoridade(request);
  const identidade = construirIdentidade(claims.uid, "CADASTRAR_ESPECIFICACAO_REAGENTE", {
    idResumoReagente: dados.idResumoReagente,
    descricao: dados.descricao.trim(),
    fabricante: dados.fabricante?.trim() ?? null,
    codigoProdutoFabricante: dados.codigoProdutoFabricante?.trim() ?? null,
    grauPureza: dados.grauPureza?.trim() ?? null,
    densidade: dados.densidade ?? null,
    classeInflamabilidade: dados.classeInflamabilidade,
    ehControladoPf: dados.ehControladoPf,
    ehControladoEb: dados.ehControladoEb,
    linkFdsFispq: dados.linkFdsFispq?.trim() ?? null,
    idSubstanciaQuimica: dados.idSubstanciaQuimica?.trim() ?? null,
    composicao: dados.composicao ?? null,
  });

  return admin.firestore().runTransaction(async (tx) => {
    await resolverAutoridadePersistidaTx(tx, claims, ["Chefe_Geral", "Gestor_Almoxarifado"]);
    const decisao = await resolverOperacaoTx(tx, dados.idOperacao, identidade);
    if (decisao.estado === "REPLAY") return decisao.resultado as { idEspecificacao: string; idEspecificacaoReagente: string };
    if (decisao.estado !== "NOVA") throw new HttpsError("failed-precondition", "Operação de cadastro de especificação não concluída.");

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

    let composicao: any[] = [];
    if (resumoData.tipo_substancia === "PURA") {
      const subRef = admin.firestore().collection("Substancia_Quimica").doc(dados.idSubstanciaQuimica!);
      const subSnap = await tx.get(subRef);
      if (!subSnap.exists || !subSnap.data()?.ativo) {
        throw new HttpsError("not-found", "Substância química base não encontrada ou inativa.");
      }
      composicao.push({
        id_substancia_quimica: dados.idSubstanciaQuimica,
        valor_min: null,
        valor_max: null,
        tipo_concentracao: "M_M",
        notacao_original_fabricante: null,
      });
    } else {
      const substanciasUnicas = new Set(dados.composicao!.map((c) => c.idSubstanciaQuimica));
      if (substanciasUnicas.size !== dados.composicao!.length) {
        throw new HttpsError("invalid-argument", "A composição possui substâncias duplicadas.");
      }
      for (const comp of dados.composicao!) {
        const subRef = admin.firestore().collection("Substancia_Quimica").doc(comp.idSubstanciaQuimica);
        const subSnap = await tx.get(subRef);
        if (!subSnap.exists || !subSnap.data()?.ativo) {
          throw new HttpsError("not-found", `Substância química ${comp.idSubstanciaQuimica} não encontrada ou inativa.`);
        }
      }
      composicao = dados.composicao!.map(c => ({
        id_substancia_quimica: c.idSubstanciaQuimica,
        valor_min: c.valorMin ?? null,
        valor_max: c.valorMax ?? null,
        tipo_concentracao: c.tipoConcentracao,
        notacao_original_fabricante: c.notacaoOriginalFabricante ?? null,
      }));
    }

    const especRef = resumoRef.collection("Especificacoes").doc();
    const unidadeDeMedida = resumoData.estado_fisico === "LIQUIDO" ? "ml" : "g";

    const especDoc = {
      id: especRef.id,
      id_resumo_reagente: dados.idResumoReagente,
      descricao: dados.descricao.trim(),
      fabricante: dados.fabricante?.trim() ?? null,
      codigo_produto_fabricante: dados.codigoProdutoFabricante?.trim() ?? null,
      grau_pureza: dados.grauPureza?.trim() ?? null,
      densidade: dados.densidade ?? null,
      estado_fisico: resumoData.estado_fisico,
      unidade_de_medida: unidadeDeMedida,
      classe_inflamabilidade: dados.classeInflamabilidade,
      eh_controlado_pf: dados.ehControladoPf,
      eh_controlado_eb: dados.ehControladoEb,
      link_fds_fispq: dados.linkFdsFispq?.trim() ?? null,
      composicao: composicao,
      criado_em: FieldValue.serverTimestamp(),
      criado_por: claims.uid,
    };

    tx.set(especRef, especDoc);
    tx.set(admin.firestore().collection("Especificacao_Reagente").doc(especRef.id), especDoc);

    const resultado = { idEspecificacao: especRef.id, idEspecificacaoReagente: especRef.id };
    registrarOperacaoConcluidaTx(tx, dados.idOperacao, identidade, resultado);
    return resultado;
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
