"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CadastroLoteSchema = exports.CadastroEspecificacaoSchema = exports.ComposicaoSchema = exports.CadastroResumoReagenteSchema = void 0;
const zod_1 = require("zod");
exports.CadastroResumoReagenteSchema = zod_1.z.object({
    nome: zod_1.z.string().min(1, "Nome é obrigatório."),
    tipoSubstancia: zod_1.z.enum(["PURA", "MISTURA"]),
    naturezaQuimica: zod_1.z.enum(["ORGANICO", "INORGANICO", "ELEMENTO", "HIBRIDO"]),
    requerPesagemFrequente: zod_1.z.boolean(),
    qtdEmQueEConsideradoEscasso: zod_1.z.number().int().positive("A quantidade de escassez deve ser positiva."),
    frequenciaPesagemDias: zod_1.z.number().int().positive().nullable().optional(),
}).refine(data => {
    if (data.requerPesagemFrequente && !data.frequenciaPesagemDias)
        return false;
    return true;
}, {
    message: "Frequência de pesagem é obrigatória se o reagente requerer pesagem frequente.",
    path: ["frequenciaPesagemDias"]
});
exports.ComposicaoSchema = zod_1.z.object({
    idSubstanciaQuimica: zod_1.z.string().min(1, "Substância é obrigatória."),
    valorComposicao: zod_1.z.number().optional(),
    tipoConcentracao: zod_1.z.enum(["M_M", "V_V", "M_V", "MOL_L", "MOL_KG", "PPM", "PPB"]).optional(),
    unidade: zod_1.z.string().optional(),
});
exports.CadastroEspecificacaoSchema = zod_1.z.object({
    idResumoReagente: zod_1.z.string().min(1, "O ID do resumo é obrigatório."),
    descricao: zod_1.z.string().min(1, "Descrição é obrigatória."),
    fabricante: zod_1.z.string().optional(),
    codigoProdutoFabricante: zod_1.z.string().optional(),
    grauPureza: zod_1.z.string().optional(),
    densidade: zod_1.z.number().positive().optional(),
    estadoFisico: zod_1.z.enum(["SOLIDO", "LIQUIDO"]),
    unidadeDeMedida: zod_1.z.enum(["ml", "g"]),
    classeInflamabilidade: zod_1.z.enum(["NAO_INFLAMAVEL", "CLASSE_1", "CLASSE_2", "CLASSE_3"]),
    ehControladoPf: zod_1.z.boolean(),
    ehControladoEb: zod_1.z.boolean(),
    linkFdsFispq: zod_1.z.string().optional(),
    composicao: zod_1.z.array(exports.ComposicaoSchema).optional(),
}).refine(data => {
    if (data.estadoFisico === "LIQUIDO" && !data.densidade)
        return false;
    return true;
}, {
    message: "Densidade é obrigatória para reagentes líquidos.",
    path: ["densidade"]
});
exports.CadastroLoteSchema = zod_1.z.object({
    idResumoReagente: zod_1.z.string().min(1, "O ID do resumo é obrigatório."),
    idEspecificacaoReagente: zod_1.z.string().min(1, "A especificação do reagente é obrigatória."),
    dataAquisicao: zod_1.z.string().min(1, "Data de aquisição é obrigatória."),
    qtdFrascosComprados: zod_1.z.number().int().nonnegative(),
    nomeFornecedor: zod_1.z.string().min(1, "Fornecedor é obrigatório."),
    numeroLote: zod_1.z.string().min(1, "Número do lote é obrigatório."),
    notaFiscal: zod_1.z.string().min(1, "Nota fiscal é obrigatória."),
    dataFabricacao: zod_1.z.string().min(1, "Data de fabricação é obrigatória."),
    dataValidade: zod_1.z.string().min(1, "Data de validade é obrigatória."),
});
//# sourceMappingURL=reagentes_base.schema.js.map