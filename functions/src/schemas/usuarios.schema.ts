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
  email: z.string().email("O e-mail fornecido não é válido."),
  nome: z.string().min(1, "O nome é obrigatório."),
  papel: PapeisUsuariosSchema,
  centro: z.string().optional(),
  laboratorio: z.string().optional(),
  materias: z.array(z.string()).optional()
});

export const RevogarUsuarioPapelSchema = z.object({
  email: z.string().email("O e-mail fornecido não é válido."),
  papel: PapeisUsuariosSchema,
  motivo: z.string().optional()
});
