import { z } from "zod";

export const IngressarTurmaPorCodigoSchema = z.object({
  codigoTurma: z.string().min(1, "O código da turma é obrigatório.").max(10, "Código de turma inválido.")
});

export const CriarTurmaSchema = z.object({
  idMateria: z.string().min(1, "ID da matéria é obrigatório."),
  nomeMateria: z.string().min(1, "Nome da matéria é obrigatório."),
  nomeTurma: z.string().min(1, "Nome da turma é obrigatório."),
  ano: z.coerce.number().min(2000, "O ano deve ser válido e maior ou igual a 2000."),
  semestre: z.coerce.number().refine(val => val === 1 || val === 2, "O semestre deve ser 1 ou 2."),
  capacidade: z.coerce.number().int().positive("A capacidade deve ser um número inteiro positivo."),
  idProfessor: z.string().optional()
});

export const RemoverAlunoTurmaSchema = z.object({
  idTurma: z.string().min(1, "ID da turma é obrigatório."),
  idAluno: z.string().min(1, "ID do aluno é obrigatório.")
});

export const ArquivarTurmaSchema = z.object({
  idTurma: z.string().min(1, "ID da turma é obrigatório.")
});

export const ConvidarAlunoSchema = z.object({
  email: z.string().email("Formato de e-mail inválido."),
  idTurma: z.string().optional(),
  matricula: z.string().optional()
});

export const AdicionarAlunoExistenteTurmaSchema = z.object({
  idTurma: z.string().min(1, "ID da turma é obrigatório."),
  idAluno: z.string().min(1, "ID do aluno é obrigatório.")
});
