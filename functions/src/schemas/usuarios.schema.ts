import { z } from "zod";

export const PapeisUsuariosSchema = z.enum([
  "Chefe_Geral",
  "Gestor_Almoxarifado",
  "Gestor_Bens_Patrimoniais",
  "Professor",
  "Aluno",
  "Bolsista"
]);

export const ConvidarUsuarioSchema = z.object({
  idOperacao: z.string().uuid().optional(),
  motivo: z.string().trim().min(1).max(2000).optional(),
  email: z.string().email("O e-mail fornecido não é válido."),
  nome: z.string().min(1, "O nome é obrigatório."),
  papel: PapeisUsuariosSchema,
  centro: z.string().optional(),
  laboratorio: z.string().optional(),
  materias: z.array(z.string()).optional()
});

export const RevogarUsuarioPapelSchema = z.object({
  idOperacao: z.string().uuid().optional(),
  email: z.string().email("O e-mail fornecido não é válido."),
  papel: PapeisUsuariosSchema,
  motivo: z.string().trim().min(1, "Justificativa obrigatória.").max(2000)
});
