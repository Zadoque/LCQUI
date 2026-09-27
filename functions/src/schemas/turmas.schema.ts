import { z } from "zod";

// M7: `idOperacao` é obrigatório, opaco e criado pelo cliente antes da primeira
// tentativa; nunca é gerado no servidor nem substituído em retry.
export const IdOperacaoTurmaSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,128}$/, "idOperacao inválido (use [A-Za-z0-9_-]{1,128}).");

export const IngressarTurmaPorCodigoSchema = z.object({
  idOperacao: IdOperacaoTurmaSchema,
  codigoTurma: z.string().min(1, "O código da turma é obrigatório.").max(20, "Código de turma inválido.")
});

export const CriarTurmaSchema = z.object({
  idOperacao: IdOperacaoTurmaSchema,
  idMateria: z.string().min(1, "ID da matéria é obrigatório."),
  nomeTurma: z.string().min(1, "Nome da turma é obrigatório.").max(100, "Nome da turma excede 100 caracteres."),
  ano: z.coerce.number().int("O ano deve ser um inteiro.").min(1, "O ano deve ser um inteiro positivo."),
  semestre: z.coerce.number().refine(val => val === 1 || val === 2, "O semestre deve ser 1 ou 2."),
  capacidade: z.coerce.number().int().positive("A capacidade deve ser um número inteiro positivo."),
  idProfessor: z.string().optional()
});

export const RemoverAlunoTurmaSchema = z.object({
  idOperacao: IdOperacaoTurmaSchema,
  idTurma: z.string().min(1, "ID da turma é obrigatório."),
  idAluno: z.string().min(1, "ID do aluno é obrigatório.")
});

// Q08/PRO-02: arquivar e desarquivar preservam dados e alteram o status.
export const AlterarStatusTurmaSchema = z.object({
  idOperacao: IdOperacaoTurmaSchema,
  idTurma: z.string().min(1, "ID da turma é obrigatório."),
  status: z.enum(["Ativo", "Arquivada"])
});

export const ConvidarAlunoSchema = z.object({
  email: z.string().email("Formato de e-mail inválido."),
  idTurma: z.string().optional(),
  matricula: z.string().optional()
});

export const AdicionarAlunoExistenteTurmaSchema = z.object({
  idOperacao: IdOperacaoTurmaSchema,
  idTurma: z.string().min(1, "ID da turma é obrigatório."),
  idAluno: z.string().min(1, "ID do aluno é obrigatório.")
});
