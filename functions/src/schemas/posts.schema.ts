import { z } from "zod";

export const CriarPostSchema = z.object({
  idTurma: z.string().min(1, "O ID da turma é obrigatório."),
  titulo: z.string().min(1, "O título é obrigatório."),
  descricao: z.string().min(1, "A descrição é obrigatória."),
  idRoteiroExperimento: z.string().optional()
});

export const AdicionarComentarioSchema = z.object({
  idTurma: z.string().min(1, "O ID da turma é obrigatório."),
  idPost: z.string().min(1, "O ID do post é obrigatório."),
  texto: z.string().min(1, "O texto do comentário é obrigatório.")
});

export const ExcluirPostSchema = z.object({
  idTurma: z.string().min(1, "O ID da turma é obrigatório."),
  idPost: z.string().min(1, "O ID do post é obrigatório.")
});

export const ExcluirComentarioSchema = z.object({
  idTurma: z.string().min(1, "O ID da turma é obrigatório."),
  idPost: z.string().min(1, "O ID do post é obrigatório."),
  idComentario: z.string().min(1, "O ID do comentário é obrigatório.")
});
