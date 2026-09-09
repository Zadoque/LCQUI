"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdicionarAlunoExistenteTurmaSchema = exports.ConvidarAlunoSchema = exports.ArquivarTurmaSchema = exports.RemoverAlunoTurmaSchema = exports.CriarTurmaSchema = exports.IngressarTurmaPorCodigoSchema = void 0;
const zod_1 = require("zod");
exports.IngressarTurmaPorCodigoSchema = zod_1.z.object({
    codigoTurma: zod_1.z.string().min(1, "O código da turma é obrigatório.").max(10, "Código de turma inválido.")
});
exports.CriarTurmaSchema = zod_1.z.object({
    idMateria: zod_1.z.string().min(1, "ID da matéria é obrigatório."),
    nomeMateria: zod_1.z.string().min(1, "Nome da matéria é obrigatório."),
    nomeTurma: zod_1.z.string().min(1, "Nome da turma é obrigatório."),
    ano: zod_1.z.coerce.number().min(2000, "O ano deve ser válido e maior ou igual a 2000."),
    semestre: zod_1.z.coerce.number().refine(val => val === 1 || val === 2, "O semestre deve ser 1 ou 2."),
    capacidade: zod_1.z.coerce.number().int().positive("A capacidade deve ser um número inteiro positivo."),
    idProfessor: zod_1.z.string().optional()
});
exports.RemoverAlunoTurmaSchema = zod_1.z.object({
    idTurma: zod_1.z.string().min(1, "ID da turma é obrigatório."),
    idAluno: zod_1.z.string().min(1, "ID do aluno é obrigatório.")
});
exports.ArquivarTurmaSchema = zod_1.z.object({
    idTurma: zod_1.z.string().min(1, "ID da turma é obrigatório.")
});
exports.ConvidarAlunoSchema = zod_1.z.object({
    email: zod_1.z.string().email("Formato de e-mail inválido."),
    idTurma: zod_1.z.string().optional(),
    matricula: zod_1.z.string().optional()
});
exports.AdicionarAlunoExistenteTurmaSchema = zod_1.z.object({
    idTurma: zod_1.z.string().min(1, "ID da turma é obrigatório."),
    idAluno: zod_1.z.string().min(1, "ID do aluno é obrigatório.")
});
//# sourceMappingURL=turmas.schema.js.map