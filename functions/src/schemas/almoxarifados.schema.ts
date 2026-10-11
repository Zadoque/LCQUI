import { z } from "zod";

export const IdOperacaoAlmoxarifadoSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,128}$/, "idOperacao inválido (use [A-Za-z0-9_-]{1,128}).");

const CamposComunsSchema = {
  idOperacao: IdOperacaoAlmoxarifadoSchema,
};
const NomeSchema = z.string().trim().min(1, "Nome é obrigatório.").max(100, "Nome excede 100 caracteres.");
const DescricaoSchema = z.string().trim().min(1, "Descrição é obrigatória.").max(500, "Descrição excede 500 caracteres.");
const GestoresSchema = z.array(z.string().trim().min(1)).optional();

// UI-03: cada ação aceita somente os campos semânticos que participa da sua
// identidade M7. Isso impede payloads ambíguos e campos ignorados silenciosamente.
export const GerenciarAlmoxarifadoSchema = z.discriminatedUnion("acao", [
  z.object({ ...CamposComunsSchema, acao: z.literal("CRIAR"), idLocal: z.string().trim().min(1, "Local é obrigatório."), nome: NomeSchema, descricao: DescricaoSchema, gestores: GestoresSchema, ativo: z.boolean().optional() }).strict(),
  z.object({ ...CamposComunsSchema, acao: z.literal("EDITAR"), idAlmoxarifado: z.string().trim().min(1), idLocal: z.string().trim().min(1, "Local é obrigatório."), nome: NomeSchema, descricao: DescricaoSchema, gestores: GestoresSchema }).strict(),
  z.object({ ...CamposComunsSchema, acao: z.literal("ATIVAR"), idAlmoxarifado: z.string().trim().min(1) }).strict(),
  z.object({ ...CamposComunsSchema, acao: z.literal("DESATIVAR"), idAlmoxarifado: z.string().trim().min(1) }).strict(),
]);

export type GerenciarAlmoxarifado = z.infer<typeof GerenciarAlmoxarifadoSchema>;
