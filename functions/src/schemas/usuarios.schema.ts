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
  uidAlvo: z.string().trim().min(1).optional(),
  email: z.string().email("O e-mail fornecido não é válido.").optional(),
  nome: z.string().min(1, "O nome é obrigatório.").optional(),
  papel: PapeisUsuariosSchema,
  centro: z.string().optional(),
  laboratorio: z.string().optional(),
  materias: z.array(z.string()).optional()
}).superRefine((dados, contexto) => {
  if (!dados.uidAlvo && (!dados.email || !dados.nome)) {
    contexto.addIssue({ code: z.ZodIssueCode.custom, message: "Informe uidAlvo ou e-mail e nome para convidar." });
  }
});

export const RevogarUsuarioPapelSchema = z.object({
  idOperacao: IdOperacaoSchema,
  uidAlvo: z.string().trim().min(1).optional(),
  email: z.string().email("O e-mail fornecido não é válido.").optional(),
  papel: PapeisUsuariosSchema,
  motivo: z.string().trim().min(1, "Justificativa obrigatória.").max(2000)
}).superRefine((dados, contexto) => {
  if (!dados.uidAlvo && !dados.email) {
    contexto.addIssue({ code: z.ZodIssueCode.custom, message: "Informe uidAlvo ou e-mail para revogar o papel." });
  }
});

// S11: busca server-side de alunos por Professor/Chefe, retornando apenas
// projeção mínima { id, nome }. Nunca expõe e-mail, matrícula ou letra inicial.
export const BuscarAlunosSchema = z.object({
  letra: z.string().length(1).regex(/^[A-Z]$/, "Letra deve ser uma letra maiúscula de A a Z.").optional(),
  termo: z.string().max(100, "Termo de busca excede 100 caracteres.").optional(),
});

// S8 UI-02/UI-13: busca server-side de professores por Professor/Chefe,
// retornando projeção mínima { id, nome }. Nunca expõe e-mail, centro ou laboratório.
export const BuscarProfessoresSchema = z.object({
  termo: z.string().trim().max(150).optional(),
});

export const BuscarGestoresAlmoxarifadoSchema = z.object({
  termo: z.string().trim().max(150).optional(),
});

// UI-02: seleção autorizada de uma identidade já existente, sem expor e-mail,
// matrícula ou dados de contato na listagem.
export const BuscarUsuariosPapelSchema = z.object({
  termo: z.string().trim().max(150).optional(),
});

export const DetalhesUsuarioPapelSchema = z.object({
  uid: z.string().trim().min(1),
});

// S8 UI-01 L191: atualização do próprio perfil (self-service).
export const AtualizarPerfilSchema = z.object({
  nome: z.string().trim().min(1, "O nome é obrigatório.").max(150, "O nome não pode exceder 150 caracteres."),
});
