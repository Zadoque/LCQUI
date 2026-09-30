import { z } from "zod";

export const RegistrarRoteiroSchema = z.object({
  nome: z.string().min(1).max(150, "O nome deve ter no máximo 150 caracteres."),
  descricao: z.string().min(1, "A descrição é obrigatória."),
  storagePath: z.string().min(1, "O caminho no Storage é obrigatório."),
  nomeArquivo: z.string().min(1).max(150, "O nome do arquivo deve ter no máximo 150 caracteres."),
});

export const CompartilharRoteiroSchema = z.object({
  idRoteiro: z.string().min(1, "O ID do roteiro é obrigatório."),
  uidProfessor: z.string().min(1, "O UID do professor é obrigatório."),
});

export const DescompartilharRoteiroSchema = z.object({
  idRoteiro: z.string().min(1, "O ID do roteiro é obrigatório."),
  uidProfessor: z.string().min(1, "O UID do professor é obrigatório."),
});

export const EmitirUrlDownloadRoteiroSchema = z.object({
  idRoteiro: z.string().min(1, "O ID do roteiro é obrigatório."),
  idTurma: z.string().min(1).optional(),
  idPost: z.string().min(1).optional(),
});

export const ListarRoteirosProfessorSchema = z.object({}).default({});

export const RemoverRoteiroSchema = z.object({
  idRoteiro: z.string().min(1, "O ID do roteiro é obrigatório."),
});
