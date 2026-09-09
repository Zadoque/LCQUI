"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriarNotificacaoSchema = exports.TipoNotificacaoSchema = exports.PapelDestinatarioSchema = void 0;
const zod_1 = require("zod");
exports.PapelDestinatarioSchema = zod_1.z.enum([
    "Aluno",
    "Professor",
    "Gestor_Bens_Patrimoniais",
    "Gestor_Almoxarifado"
]);
exports.TipoNotificacaoSchema = zod_1.z.enum([
    "ADICIONADO", "POST", "COMENTARIO", "REMOVIDO",
    "TURMA_ARQUIVADA", "TURMA_DESARQUIVADA",
    "REQUISICAO_BEM", "DATA_DEVOLUCAO_REAGENTE",
    "ROTEIRO_COMPARTILHADO",
    "REQUISICAO_EDICAO_BEM", "REQUISICAO_ADICAO_BEM",
    "BEM_INSERVIVEL",
    "ENTREGA_ATRASADA", "FRASCOS_VAZIOS", "FRASCOS_QUEBRADOS",
    "FRASCOS_VENCIDOS", "FRASCOS_A_SEREM_PESADOS",
    "FRASCOS_EM_QUARENTENA", "REAGENTE_ESCASSO",
    "REQUISICAO_APROVADA", "REQUISICAO_REJEITADA" // Adding for Requisicao feedback
]);
exports.CriarNotificacaoSchema = zod_1.z.object({
    id_destinatario: zod_1.z.string().min(1),
    papel_destinatario: exports.PapelDestinatarioSchema,
    tipo: exports.TipoNotificacaoSchema,
    id_quem_fez_acao: zod_1.z.string().optional().nullable(),
    id_turma: zod_1.z.string().optional().nullable(),
    quantidade: zod_1.z.number().optional().nullable(),
    entidade_alvo: zod_1.z.string().min(1),
    id_alvo: zod_1.z.string().min(1),
    mensagem_customizada: zod_1.z.string().optional().nullable() // Useful for justificativa
});
//# sourceMappingURL=notificacoes.schema.js.map