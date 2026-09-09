import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { validarPermissao } from "./auth";
import { validatePayload } from "./utils/validation";
import {
  CadastroResumoReagenteSchema,
  CadastroEspecificacaoSchema,
  CadastroLoteSchema,
} from "./schemas/reagentes_base.schema";

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
    estado_fisico: null, // Será atualizado na primeira especificação
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

    // Valida duplicidade de composição
    if (dados.composicao && dados.composicao.length > 0) {
      const substanciasUnicas = new Set(dados.composicao.map((c) => c.idSubstanciaQuimica));
      if (substanciasUnicas.size !== dados.composicao.length) {
        throw new HttpsError("invalid-argument", "A composição possui substâncias duplicadas.");
      }
    }

    const especRef = resumoRef.collection("Especificacoes").doc();

    const composicao = (dados.composicao ?? []).map(c => ({
      id_substancia_quimica: c.idSubstanciaQuimica,
      valor_composicao: c.valorComposicao ?? null,
      tipo_concentracao: c.tipoConcentracao ?? null,
      unidade: c.unidade ?? null,
    }));

    tx.set(especRef, {
      id_resumo_reagente: dados.idResumoReagente,
      descricao: dados.descricao,
      fabricante: dados.fabricante ?? null,
      codigo_produto_fabricante: dados.codigoProdutoFabricante ?? null,
      grau_pureza: dados.grauPureza ?? null,
      densidade: dados.densidade ?? null,
      estado_fisico: dados.estadoFisico,
      unidade_de_medida: dados.unidadeDeMedida,
      classe_inflamabilidade: dados.classeInflamabilidade,
      eh_controlado_pf: dados.ehControladoPf,
      eh_controlado_eb: dados.ehControladoEb,
      link_fds_fispq: dados.linkFdsFispq ?? null,
      composicao: composicao,
    });

    // Atualiza o estado físico desnormalizado no Resumo, caso não exista ou seja o primeiro
    // Se o Resumo pode ter múltiplas especificações, aqui escolhemos espelhar o estado da última/primeira (o negócio não especificou um array de estados_fisicos)
    // A documentação diz: "estado_fisico tem fonte única em Especificacao_Reagente... precisa ser espelhado no Firestore em Resumo_Reagente"
    if (!resumoData.estado_fisico) {
      tx.update(resumoRef, { estado_fisico: dados.estadoFisico });
    }

    return { idEspecificacao: especRef.id };
  });
});

export const cadastrarLote = onCall(async (request) => {
  const dados = validatePayload(CadastroLoteSchema, request.data);
  validarPermissao(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);

  return admin.firestore().runTransaction(async (tx) => {
    // 1. Busca a especificação
    // A especificação está dentro de Resumo_Reagente/{id}/Especificacoes/{id}
    // Como recebemos apenas idEspecificacao, poderíamos usar um collectionGroup
    // Mas o Firestore runTransaction não aceita query sem ser por referência direta.
    // O Lote no modelo 3FN possui "id_especificacao_reagente".
    // Precisamos do "id_resumo_reagente" para denormalizar o "nome_reagente" no Lote (conforme Seção 5).
    // Como a coleção é aninhada, precisamos da ref correta.
    // Portanto, é melhor a query de validação ser fora ou obtermos o idResumo.
    // Vamos fazer a query fora, ler o resumo_id, e usar transaction para o uniqueness do Lote.
    
    // Isso deve ser validado. Firestore não permite transaction read de queries.
    // Podemos mudar o frontend para mandar o idResumo ou podemos buscar antes.
  });
});
