import { z } from "zod";
import { ID_OPERACAO_PATTERN } from "../idempotencia";

export const idOperacaoField = z.string().regex(ID_OPERACAO_PATTERN, "idOperacao inválido.");

export const CriarPostSchema = z.object({
  idOperacao: idOperacaoField,
  idTurma: z.string().min(1, "O ID da turma é obrigatório."),
  titulo: z.string().min(1, "O título é obrigatório."),
  descricao: z.string().min(1, "A descrição é obrigatória."),
  idRoteiroExperimento: z.string().optional()
});

export const AdicionarComentarioSchema = z.object({
  idOperacao: idOperacaoField,
  idTurma: z.string().min(1, "O ID da turma é obrigatório."),
  idPost: z.string().min(1, "O ID do post é obrigatório."),
  texto: z.string().min(1, "O texto do comentário é obrigatório.")
});

export const RemoverPostSchema = z.object({
  idOperacao: idOperacaoField,
  idTurma: z.string().min(1, "O ID da turma é obrigatório."),
  idPost: z.string().min(1, "O ID do post é obrigatório."),
  motivo: z.string().min(1, "O motivo da remoção é obrigatório.")
});

export const ModerarComentarioSchema = z.object({
  idOperacao: idOperacaoField,
  idTurma: z.string().min(1, "O ID da turma é obrigatório."),
  idPost: z.string().min(1, "O ID do post é obrigatório."),
  idComentario: z.string().min(1, "O ID do comentário é obrigatório."),
  motivo: z.string().min(1, "O motivo da moderação é obrigatório.")
});

export const EditarPostSchema = z.object({
  idOperacao: idOperacaoField,
  idTurma: z.string().min(1),
  idPost: z.string().min(1),
  titulo: z.string().min(1).max(150).optional(),
  descricao: z.string().min(1).max(10000).optional(),
  idRoteiroExperimento: z.union([z.string().min(1), z.null()]).optional()
}).refine(d => d.titulo !== undefined || d.descricao !== undefined || d.idRoteiroExperimento !== undefined, {
  message: "Pelo menos um campo editável deve ser fornecido."
});

export const EditarComentarioSchema = z.object({
  idOperacao: idOperacaoField,
  idTurma: z.string().min(1),
  idPost: z.string().min(1),
  idComentario: z.string().min(1),
  texto: z.string().min(1).max(2000)
});

export const ListarComentariosPostSchema = z.object({
  idOperacao: idOperacaoField,
  idTurma: z.string().min(1, "O ID da turma é obrigatório."),
  idPost: z.string().min(1, "O ID do post é obrigatório.")
});
