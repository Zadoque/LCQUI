"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DadosReimpressaoSchema = exports.DadosEtiquetasVirgensSchema = exports.FiltrosGeralEPersonalizadoSchema = exports.FiltrosPredioSchema = exports.FiltrosAlmoxarifadoSchema = void 0;
const zod_1 = require("zod");
exports.FiltrosAlmoxarifadoSchema = zod_1.z.object({
    idAlmoxarifado: zod_1.z.string().min(1, "O ID do almoxarifado é obrigatório."),
    mes: zod_1.z.number().min(1).max(12),
    ano: zod_1.z.number().min(2000)
});
exports.FiltrosPredioSchema = zod_1.z.object({
    predio: zod_1.z.string().optional(),
    mes: zod_1.z.number().min(1).max(12).optional(),
    ano: zod_1.z.number().min(2000).optional(),
    andar: zod_1.z.string().optional(),
    sala: zod_1.z.string().optional(),
    estadoConservacao: zod_1.z.string().optional(),
    status: zod_1.z.string().optional()
});
exports.FiltrosGeralEPersonalizadoSchema = zod_1.z.object({
    dataInicio: zod_1.z.string().min(1, "Data de início é obrigatória."),
    dataFim: zod_1.z.string().min(1, "Data de fim é obrigatória."),
    entidade: zod_1.z.enum(["Bens_Patrimoniais", "Reagentes"])
});
exports.DadosEtiquetasVirgensSchema = zod_1.z.object({
    codigoInicial: zod_1.z.number().positive(),
    codigoFinal: zod_1.z.number().positive(),
    startRow: zod_1.z.number().min(1).max(10).optional(),
    startCol: zod_1.z.number().min(1).max(3).optional()
});
exports.DadosReimpressaoSchema = zod_1.z.object({
    frascoIds: zod_1.z.array(zod_1.z.string()).min(1).max(10)
});
//# sourceMappingURL=relatorios.schema.js.map