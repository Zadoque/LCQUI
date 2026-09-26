import { z } from "zod";

// UI-03: nome (100) e código (10), ambos não vazios.
const NomeMateriaSchema = z.string().trim().min(1, "O nome da matéria é obrigatório.").max(100);
const CodigoMateriaSchema = z.string().trim().min(1, "O código da matéria é obrigatório.").max(10);

export const GerenciarMateriaSchema = z.discriminatedUnion("acao", [
  z.object({
    acao: z.literal("CRIAR"),
    nome: NomeMateriaSchema,
    codigoMateria: CodigoMateriaSchema,
  }),
  z.object({
    acao: z.literal("EDITAR"),
    idMateria: z.string().min(1, "ID da matéria é obrigatório."),
    nome: NomeMateriaSchema,
    codigoMateria: CodigoMateriaSchema,
  }),
]);

export type GerenciarMateria = z.infer<typeof GerenciarMateriaSchema>;
