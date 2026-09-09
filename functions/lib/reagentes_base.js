"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cadastrarLote = exports.cadastrarEspecificacao = exports.cadastrarResumoReagente = exports.cadastrarSubstanciaQuimica = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("./auth");
const validation_1 = require("./utils/validation");
const reagentes_base_schema_1 = require("./schemas/reagentes_base.schema");
exports.cadastrarSubstanciaQuimica = (0, https_1.onCall)(async (request) => {
    const dados = (0, validation_1.validatePayload)(reagentes_base_schema_1.CadastroSubstanciaQuimicaSchema, request.data);
    (0, auth_1.validarPermissao)(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
    const substanciaRef = admin.firestore().collection("Substancia_Quimica").doc();
    await substanciaRef.set({
        nome: dados.nome.trim(),
        cas_number: dados.casNumber ?? null,
        formula_quimica: dados.formulaQuimica ?? null,
        ativo: dados.ativo,
    });
    return { idSubstanciaQuimica: substanciaRef.id };
});
exports.cadastrarResumoReagente = (0, https_1.onCall)(async (request) => {
    const dados = (0, validation_1.validatePayload)(reagentes_base_schema_1.CadastroResumoReagenteSchema, request.data);
    (0, auth_1.validarPermissao)(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
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
exports.cadastrarEspecificacao = (0, https_1.onCall)(async (request) => {
    const dados = (0, validation_1.validatePayload)(reagentes_base_schema_1.CadastroEspecificacaoSchema, request.data);
    (0, auth_1.validarPermissao)(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
    return admin.firestore().runTransaction(async (tx) => {
        const resumoRef = admin.firestore().collection("Resumo_Reagente").doc(dados.idResumoReagente);
        const resumoSnap = await tx.get(resumoRef);
        if (!resumoSnap.exists) {
            throw new https_1.HttpsError("not-found", "Resumo do reagente não encontrado.");
        }
        const resumoData = resumoSnap.data();
        if (resumoData.tipo_substancia === "MISTURA" && (!dados.composicao || dados.composicao.length === 0)) {
            throw new https_1.HttpsError("invalid-argument", "Para reagentes do tipo MISTURA a composição é obrigatória.");
        }
        if (resumoData.tipo_substancia === "PURA" && !dados.idSubstanciaQuimica) {
            throw new https_1.HttpsError("invalid-argument", "Para reagentes do tipo PURA a substância química base é obrigatória.");
        }
        if (resumoData.estado_fisico === "LIQUIDO" && !dados.densidade) {
            throw new https_1.HttpsError("invalid-argument", "Densidade é obrigatória para reagentes líquidos.");
        }
        // Valida duplicidade de composição
        if (dados.composicao && dados.composicao.length > 0) {
            const substanciasUnicas = new Set(dados.composicao.map((c) => c.idSubstanciaQuimica));
            if (substanciasUnicas.size !== dados.composicao.length) {
                throw new https_1.HttpsError("invalid-argument", "A composição possui substâncias duplicadas.");
            }
        }
        const especRef = resumoRef.collection("Especificacoes").doc();
        let composicao = [];
        if (resumoData.tipo_substancia === "PURA") {
            composicao.push({
                id_substancia_quimica: dados.idSubstanciaQuimica,
                valor_composicao: null,
                tipo_concentracao: null,
                unidade: null,
            });
        }
        else {
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
exports.cadastrarLote = (0, https_1.onCall)(async (request) => {
    const dados = (0, validation_1.validatePayload)(reagentes_base_schema_1.CadastroLoteSchema, request.data);
    (0, auth_1.validarPermissao)(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
    return admin.firestore().runTransaction(async (tx) => {
        // 1. Verifica duplicidade
        const lotesRef = admin.firestore().collection("Lote");
        const snapshot = await tx.get(lotesRef
            .where("id_especificacao_reagente", "==", dados.idEspecificacaoReagente)
            .where("nome_fornecedor", "==", dados.nomeFornecedor)
            .where("numero_lote", "==", dados.numeroLote)
            .limit(1));
        if (!snapshot.empty) {
            throw new https_1.HttpsError("already-exists", "Já existe um lote com este número e fornecedor para esta especificação.");
        }
        // 2. Busca o nome do reagente para denormalização (Section 5)
        const resumoRef = admin.firestore().collection("Resumo_Reagente").doc(dados.idResumoReagente);
        const resumoSnap = await tx.get(resumoRef);
        if (!resumoSnap.exists) {
            throw new https_1.HttpsError("not-found", "Resumo do reagente não encontrado.");
        }
        const especRef = resumoRef.collection("Especificacoes").doc(dados.idEspecificacaoReagente);
        const especSnap = await tx.get(especRef);
        if (!especSnap.exists) {
            throw new https_1.HttpsError("not-found", "Especificação de reagente não encontrada.");
        }
        const nomeReagente = resumoSnap.data().nome;
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
            cadastrado_por: request.auth.uid,
        });
        return { idLote: loteRef.id };
    });
});
//# sourceMappingURL=reagentes_base.js.map