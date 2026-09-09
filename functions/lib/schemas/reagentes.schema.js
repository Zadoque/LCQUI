"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevolucaoFrascoSchema = exports.RetiradaFrascoSchema = exports.AberturaFrascoSchema = exports.CadastroFrascoAbertoSchema = exports.CadastroFrascoFechadoSchema = exports.DecisaoFrascoVencidoSchema = void 0;
const zod_1 = require("zod");
exports.DecisaoFrascoVencidoSchema = zod_1.z.enum(["QUARENTENA", "PENDENTE_DE_DESCARTE", "DISPONIVEL"]);
exports.CadastroFrascoFechadoSchema = zod_1.z.object({
    idEspecificacaoReagente: zod_1.z.string().min(1, "A especificação do reagente é obrigatória."),
    idAlmoxarifado: zod_1.z.string().min(1, "O almoxarifado é obrigatório."),
    idLote: zod_1.z.string().optional(),
    pesoTotal: zod_1.z.number().positive("O peso total deve ser positivo."),
    volumeNominal: zod_1.z.number().positive("O volume nominal deve ser positivo."),
    validadeFechado: zod_1.z.string().optional(),
    validadeDesconhecida: zod_1.z.boolean().optional(),
    decisaoSeJaVencido: exports.DecisaoFrascoVencidoSchema.optional(),
    detalheStatus: zod_1.z.string().optional(),
});
exports.CadastroFrascoAbertoSchema = zod_1.z.object({
    idEspecificacaoReagente: zod_1.z.string().min(1, "A especificação do reagente é obrigatória."),
    idAlmoxarifado: zod_1.z.string().min(1, "O almoxarifado é obrigatório."),
    idLote: zod_1.z.string().optional(),
    modalidade: zod_1.z.enum(["CONHECE_TARA", "ESTIMA_VOLUME", "ESTIMA_MASSA"]),
    pesoTotalBalanca: zod_1.z.number().positive("O peso total deve ser positivo."),
    pesoFrascoVazioInformado: zod_1.z.number().positive("O peso do frasco vazio deve ser positivo.").optional(),
    volumeAtualEstimado: zod_1.z.number().positive("O volume atual estimado deve ser positivo.").optional(),
    massaAtualEstimada: zod_1.z.number().positive("A massa atual estimada deve ser positiva.").optional(),
    validadeAberto: zod_1.z.string().optional(),
    validadeDesconhecida: zod_1.z.boolean().optional(),
    decisaoSeJaVencido: exports.DecisaoFrascoVencidoSchema.optional(),
    detalheStatus: zod_1.z.string().optional(),
});
exports.AberturaFrascoSchema = zod_1.z.object({
    idFrasco: zod_1.z.string().min(1, "O ID do frasco é obrigatório."),
    destinoSeVencerNaAbertura: exports.DecisaoFrascoVencidoSchema.optional(),
    detalheStatus: zod_1.z.string().optional(),
});
exports.RetiradaFrascoSchema = zod_1.z.object({
    idFrasco: zod_1.z.string().min(1, "O ID do frasco é obrigatório."),
    idUsuarioRetirou: zod_1.z.string().min(1, "O ID do usuário é obrigatório."),
    idLocalUsado: zod_1.z.string().min(1, "O ID do local é obrigatório."),
    pesoSaida: zod_1.z.number().positive("O peso de saída deve ser positivo."),
    dataDevolucaoPrevista: zod_1.z.string().min(1, "A data de devolução é obrigatória."),
    confirmarUsoVencido: zod_1.z.boolean().optional(),
    abrirNoEmprestimo: zod_1.z.boolean().optional(),
    finalidadeUso: zod_1.z.enum(["PESQUISA", "DIDATICO_DEMONSTRACAO", "OUTRO"]),
});
exports.DevolucaoFrascoSchema = zod_1.z.object({
    idEmprestimo: zod_1.z.string().min(1, "O ID do empréstimo é obrigatório."),
    pesoRetorno: zod_1.z.number().min(0, "O peso de retorno não pode ser negativo."),
    destinoPosDevolucao: exports.DecisaoFrascoVencidoSchema.optional(),
});
//# sourceMappingURL=reagentes.schema.js.map