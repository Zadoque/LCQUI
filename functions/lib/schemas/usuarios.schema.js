"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConvidarUsuarioSchema = exports.PapeisUsuariosSchema = void 0;
const zod_1 = require("zod");
exports.PapeisUsuariosSchema = zod_1.z.enum([
    "Chefe_Geral",
    "Gestor_Almoxarifado",
    "Gestor_Bens_Patrimoniais",
    "Professor",
    "Aluno",
    "Bolsista"
]);
exports.ConvidarUsuarioSchema = zod_1.z.object({
    email: zod_1.z.string().email("O e-mail fornecido não é válido."),
    nome: zod_1.z.string().min(1, "O nome é obrigatório."),
    papel: exports.PapeisUsuariosSchema,
    centro: zod_1.z.string().optional(),
    laboratorio: zod_1.z.string().optional(),
    materias: zod_1.z.array(zod_1.z.string()).optional()
});
//# sourceMappingURL=usuarios.schema.js.map