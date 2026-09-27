import { z } from "zod";

export const IdOperacaoAlmoxarifadoSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,128}$/, "idOperacao inválido (use [A-Za-z0-9_-]{1,128}).");

// UI-03: nome (100), descrição (500), Local existente e ao menos um gestor para
// ativação; pode ser salvo inativo sem gestor.
export const GerenciarAlmoxarifadoSchema = z.object({
  idOperacao: IdOperacaoAlmoxarifadoSchema,
  acao: z.enum(["CRIAR", "EDITAR", "ATIVAR", "DESATIVAR"]),
  idAlmoxarifado: z.string().min(1).optional(),
  idLocal: z.string().min(1, "Local é obrigatório."),
  nome: z.string().trim().min(1, "Nome é obrigatório.").max(100, "Nome excede 100 caracteres."),
  descricao: z.string().trim().max(500, "Descrição excede 500 caracteres.").default(""),
  gestores: z.array(z.string().min(1)).optional(),
  ativo: z.boolean().optional(),
});

export type GerenciarAlmoxarifado = z.infer<typeof GerenciarAlmoxarifadoSchema>;
