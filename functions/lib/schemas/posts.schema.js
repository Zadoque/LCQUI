"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcluirComentarioSchema = exports.ExcluirPostSchema = exports.AdicionarComentarioSchema = exports.CriarPostSchema = void 0;
const zod_1 = require("zod");
exports.CriarPostSchema = zod_1.z.object({
    idTurma: zod_1.z.string().min(1, "O ID da turma é obrigatório."),
    titulo: zod_1.z.string().min(1, "O título é obrigatório."),
    descricao: zod_1.z.string().min(1, "A descrição é obrigatória."),
    idRoteiroExperimento: zod_1.z.string().optional()
});
exports.AdicionarComentarioSchema = zod_1.z.object({
    idTurma: zod_1.z.string().min(1, "O ID da turma é obrigatório."),
    idPost: zod_1.z.string().min(1, "O ID do post é obrigatório."),
    texto: zod_1.z.string().min(1, "O texto do comentário é obrigatório.")
});
exports.ExcluirPostSchema = zod_1.z.object({
    idTurma: zod_1.z.string().min(1, "O ID da turma é obrigatório."),
    idPost: zod_1.z.string().min(1, "O ID do post é obrigatório.")
});
exports.ExcluirComentarioSchema = zod_1.z.object({
    idTurma: zod_1.z.string().min(1, "O ID da turma é obrigatório."),
    idPost: zod_1.z.string().min(1, "O ID do post é obrigatório."),
    idComentario: zod_1.z.string().min(1, "O ID do comentário é obrigatório.")
});
//# sourceMappingURL=posts.schema.js.map