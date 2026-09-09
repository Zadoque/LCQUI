"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriarRequisicaoAdicaoBemSchema = exports.ResponderRequisicaoBemSchema = exports.CriarRequisicaoEdicaoBemSchema = void 0;
const zod_1 = require("zod");
exports.CriarRequisicaoEdicaoBemSchema = zod_1.z.object({
    idBemPatrimonial: zod_1.z.string().min(1, "ID do bem patrimonial é obrigatório."),
    novoNome: zod_1.z.string().optional(),
    novoStatus: zod_1.z.string().optional(),
    novoEstadoConservacao: zod_1.z.string().optional(),
    novoIdLocal: zod_1.z.string().optional(),
    motivo: zod_1.z.string().min(1, "Motivo é obrigatório.")
});
exports.ResponderRequisicaoBemSchema = zod_1.z.object({
    idRequisicao: zod_1.z.string().min(1, "ID da requisição é obrigatório."),
    aprovar: zod_1.z.boolean(),
    justificativa: zod_1.z.string().optional().default("")
});
exports.CriarRequisicaoAdicaoBemSchema = zod_1.z.object({
    numeroPatrimonioProposto: zod_1.z.string().min(1, "O número de patrimônio proposto é obrigatório."),
    estadoConservacaoProposto: zod_1.z.string().min(1, "O estado de conservação é obrigatório."),
    idLocal: zod_1.z.string().min(1, "O ID do local é obrigatório."),
    nomeResponsavelProposto: zod_1.z.string().min(1, "O nome do responsável é obrigatório."),
    idResumoBemPatrimonial: zod_1.z.string().optional(),
    nomeResumoProposto: zod_1.z.string().optional(),
    descricaoResumoProposta: zod_1.z.string().optional(),
    motivo: zod_1.z.string().min(1, "Motivo é obrigatório.")
});
//# sourceMappingURL=patrimonio.schema.js.map