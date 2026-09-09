"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DescompartilharRoteiroSchema = exports.CompartilharRoteiroSchema = exports.RegistrarRoteiroSchema = void 0;
const zod_1 = require("zod");
exports.RegistrarRoteiroSchema = zod_1.z.object({
    titulo: zod_1.z.string().min(1, "O título do roteiro é obrigatório."),
    descricao: zod_1.z.string().optional(),
    pdf_url: zod_1.z.string().url("A URL do PDF deve ser válida.")
});
exports.CompartilharRoteiroSchema = zod_1.z.object({
    idRoteiro: zod_1.z.string().min(1, "O ID do roteiro é obrigatório."),
    emailCompartilhar: zod_1.z.string().email("E-mail inválido.")
});
exports.DescompartilharRoteiroSchema = zod_1.z.object({
    idRoteiro: zod_1.z.string().min(1, "O ID do roteiro é obrigatório."),
    emailDescompartilhar: zod_1.z.string().email("E-mail inválido.")
});
//# sourceMappingURL=roteiros.schema.js.map