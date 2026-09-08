import { z } from "zod";

export const CriarMateriaSchema = z.object({
  nome: z.string().min(1, "O nome da matéria é obrigatório."),
  codigoMateria: z.string().min(1, "O código da matéria é obrigatório.")
});
