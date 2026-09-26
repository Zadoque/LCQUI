import { z } from "zod";

export const PapeisUsuariosSchema = z.enum([
  "Chefe_Geral",
  "Gestor_Almoxarifado",
  "Gestor_Bens_Patrimoniais",
  "Professor",
  "Aluno",
  "Bolsista"
]);

// M7: `idOperacao` é obrigatório, opaco e criado pelo cliente antes da primeira
// tentativa; nunca é gerado no servidor nem substituído em retry.
export const IdOperacaoSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,128}$/, "idOperacao inválido (use [A-Za-z0-9_-]{1,128}).");

export const ConvidarUsuarioSchema = z.object({
  idOperacao: IdOperacaoSchema,
  motivo: z.string().trim().min(1).max(2000).optional(),
  email: z.string().email("O e-mail fornecido não é válido."),
  nome: z.string().min(1, "O nome é obrigatório."),
  papel: PapeisUsuariosSchema,
  centro: z.string().optional(),
  laboratorio: z.string().optional(),
  materias: z.array(z.string()).optional()
});

export const RevogarUsuarioPapelSchema = z.object({
  idOperacao: IdOperacaoSchema,
  email: z.string().email("O e-mail fornecido não é válido."),
  papel: PapeisUsuariosSchema,
  motivo: z.string().trim().min(1, "Justificativa obrigatória.").max(2000)
});
