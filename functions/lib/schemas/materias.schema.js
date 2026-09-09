"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriarMateriaSchema = void 0;
const zod_1 = require("zod");
exports.CriarMateriaSchema = zod_1.z.object({
    nome: zod_1.z.string().min(1, "O nome da matéria é obrigatório."),
    codigoMateria: zod_1.z.string().min(1, "O código da matéria é obrigatório.")
});
//# sourceMappingURL=materias.schema.js.map