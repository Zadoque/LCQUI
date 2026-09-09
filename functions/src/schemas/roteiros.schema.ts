import { z } from "zod";

export const RegistrarRoteiroSchema = z.object({
  titulo: z.string().min(1, "O título do roteiro é obrigatório."),
  descricao: z.string().optional(),
  pdf_url: z.string().url("A URL do PDF deve ser válida.")
});

export const CompartilharRoteiroSchema = z.object({
  idRoteiro: z.string().min(1, "O ID do roteiro é obrigatório."),
  emailCompartilhar: z.string().email("E-mail inválido.")
});

export const DescompartilharRoteiroSchema = z.object({
  idRoteiro: z.string().min(1, "O ID do roteiro é obrigatório."),
  emailDescompartilhar: z.string().email("E-mail inválido.")
});
