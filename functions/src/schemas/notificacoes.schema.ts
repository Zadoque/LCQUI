import { z } from "zod";

export const PapelDestinatarioSchema = z.enum([
  "Aluno",
  "Professor",
  "Bolsista",
  "Gestor_Bens_Patrimoniais",
  "Gestor_Almoxarifado",
  "Chefe_Geral"
]);

export const TipoNotificacaoSchema = z.enum([
  "ADICIONADO", "POST", "COMENTARIO", "REMOVIDO",
  "TURMA_ARQUIVADA", "TURMA_DESARQUIVADA",
  "REQUISICAO_BEM", "DATA_DEVOLUCAO_REAGENTE",
  "ROTEIRO_COMPARTILHADO",
  "REQUISICAO_EDICAO_BEM", "REQUISICAO_ADICAO_BEM",
  "BEM_INSERVIVEL",
  "ENTREGA_ATRASADA", "FRASCOS_VAZIOS", "FRASCOS_QUEBRADOS",
  "FRASCOS_VENCIDOS", "FRASCOS_A_SEREM_PESADOS",
  "FRASCOS_EM_QUARENTENA", "ESCASSEZ_ESTOQUE",
  "CONVITE_PARA_TURMA"
]);

// Rotas conhecidas de `entidade_alvo`; URL arbitrária não pertence ao enum.
export const EntidadeAlvoSchema = z.enum([
  "Turma",
  "Post",
  "Comentario",
  "Roteiro",
  "Almoxarifado",
  "Emprestimo",
  "Usuario",
  "Requisicao_Bem",
  "Bem_Patrimonial",
  "Convite_Aluno"
]);

export const CriarNotificacaoSchema = z.object({
  id_destinatario: z.string().min(1),
  papel_destinatario: PapelDestinatarioSchema,
  tipo: TipoNotificacaoSchema,
  id_quem_fez_acao: z.string().optional().nullable(),
  id_turma: z.string().optional().nullable(),
  quantidade: z.number().optional().nullable(),
  entidade_alvo: EntidadeAlvoSchema,
  id_alvo: z.string().min(1),
  // RN-M13-03: só prazos determinados na fonte; sem prazo, `expira_em = null`.
  expira_em: z.date().nullable().optional(),
  mensagem_customizada: z.string().optional().nullable() // Useful for justificativa
});

export type CriarNotificacao = z.infer<typeof CriarNotificacaoSchema>;
