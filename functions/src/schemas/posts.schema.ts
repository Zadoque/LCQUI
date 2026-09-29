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

export const ListarComentariosPostSchema = z.object({
  idOperacao: idOperacaoField,
  idTurma: z.string().min(1, "O ID da turma é obrigatório."),
  idPost: z.string().min(1, "O ID do post é obrigatório.")
});
