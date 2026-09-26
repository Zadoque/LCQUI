package domain

import "strings"

// M13 — Notificação unificada.
//
// CUE transporta somente shapes locais da entidade única `Notificacao` e da
// fatia de operações: campos, enums fechados, nulabilidade, condicionais
// (lida/lida_em, id_turma acadêmico vs operacional, payload mínimo, expiração),
// limites e a ligação entre emissão e identidade de comando. Pertencem ao
// Alloy: caixa única por UID, leitura e papel visual, marcação e "Limpar tudo"
// paginado/reentrante com corte estável, expiração, alvo/deep link com
// revalidação corrente, privacidade e deduplicação. Pertencem ao Rust: a
// canonicalização determinística da identidade de emissão e os limites.
// CUE não prova concorrência, autorização nem a implementação Firebase.

#M13Tipo:
	"ADICIONADO" | "POST" | "COMENTARIO" | "REMOVIDO" |
	"TURMA_ARQUIVADA" | "TURMA_DESARQUIVADA" |
	"REQUISICAO_BEM" | "DATA_DEVOLUCAO_REAGENTE" |
	"ROTEIRO_COMPARTILHADO" | "REQUISICAO_EDICAO_BEM" |
	"REQUISICAO_ADICAO_BEM" | "BEM_INSERVIVEL" |
	"ENTREGA_ATRASADA" | "FRASCOS_VAZIOS" | "FRASCOS_QUEBRADOS" |
	"FRASCOS_VENCIDOS" | "FRASCOS_A_SEREM_PESADOS" |
	"FRASCOS_EM_QUARENTENA" | "ESCASSEZ_ESTOQUE" |
	"AUTO_ATENDIMENTO_RETIRADA"

// Tipos acadêmicos exigem `id_turma` (RN-M13-07); os demais o mantêm nulo.
#M13TipoAcademico:
	"COMENTARIO" | "POST" | "ADICIONADO" | "REMOVIDO" |
	"TURMA_ARQUIVADA" | "TURMA_DESARQUIVADA"

#M13PapelDestinatario:
	"Aluno" | "Professor" | "Bolsista" | "Gestor_Bens_Patrimoniais" |
	"Gestor_Almoxarifado" | "Chefe_Geral"

// Rotas conhecidas de `entidade_alvo`; URL arbitrária não pertence ao enum.
#M13EntidadeAlvo:
	"Turma" | "Post" | "Comentario" | "Roteiro" | "Almoxarifado" |
	"Emprestimo" | "Usuario" | "Requisicao_Bem" | "Bem_Patrimonial"

#M13StatusEmissao:  "CONCLUIDA" | "DUPLICADA" | "FALHOU"
#M13StatusOperacao: "CONCLUIDA"
#M13Via:            "PROPRIA" | "ALHEIA"

// Entidade unificada: um documento em Usuarios/{uid}/Notificacoes/{id}.
#M13Notificacao: {
	uid:                string & strings.MinRunes(1)
	id:                 string & strings.MinRunes(1)
	id_destinatario:    string & strings.MinRunes(1)
	id_destinatario:    uid
	papel_destinatario: #M13PapelDestinatario
	tipo:               #M13Tipo
	id_quem_fez_acao:   null | (string & strings.MinRunes(1))
	id_turma:           null | (string & strings.MinRunes(1))
	quantidade:         null | (int & >=0)
	entidade_alvo:      #M13EntidadeAlvo
	id_alvo:            string & strings.MinRunes(1) & strings.MaxRunes(200)
	lida:               bool
	lida_em:            null | (string & strings.MinRunes(1))
	emitida_em:         string & strings.MinRunes(1)
	expira_em:          null | (string & strings.MinRunes(1))
	// Payload mínimo: nunca transporta conteúdo protegido (RN-M13-05).
	contem_conteudo_protegido: false
	if !lida {lida_em: null}
	if lida {lida_em: string & strings.MinRunes(1)}
	if tipo == "COMENTARIO" || tipo == "POST" || tipo == "ADICIONADO" ||
		tipo == "REMOVIDO" || tipo == "TURMA_ARQUIVADA" ||
		tipo == "TURMA_DESARQUIVADA" {
		id_turma: string & strings.MinRunes(1)
	}
	if tipo != "COMENTARIO" && tipo != "POST" && tipo != "ADICIONADO" &&
		tipo != "REMOVIDO" && tipo != "TURMA_ARQUIVADA" &&
		tipo != "TURMA_DESARQUIVADA" {
		id_turma: null
	}
	if tipo == "ESCASSEZ_ESTOQUE" {expira_em: null}
}

// Caixa única por conta (UID): o papel visual é só apresentação.
#M13Caixa: {
	uid:                       string & strings.MinRunes(1)
	papel_visual:              #M13PapelDestinatario
	papel_visual_filtra_caixa: false
	notificacoes: [...(#M13Notificacao & {id_destinatario: uid})]
}

// Leitura: própria caixa apenas; a notificação não autoriza o alvo.
#M13Leitura: {
	uid:                    string & strings.MinRunes(1)
	id_notificacao:         string & strings.MinRunes(1)
	id_destinatario:        string & strings.MinRunes(1)
	via:                    #M13Via
	autorizado:             bool
	concede_acesso_ao_alvo: false
	if id_destinatario == uid {via: "PROPRIA"}
	if id_destinatario != uid {via: "ALHEIA", autorizado: false}
}

// Marcação individual idempotente: `lida=false => lida_em=null`.
#M13Marcacao: {
	id_notificacao:  string & strings.MinRunes(1)
	uid:             string & strings.MinRunes(1)
	id_destinatario: string & strings.MinRunes(1)
	lida_antes:      bool
	lida_em_antes:   null | (string & strings.MinRunes(1))
	lida_depois:     bool
	lida_em_depois:  null | (string & strings.MinRunes(1))
	usa_delete:      false
	if id_destinatario != uid {usa_delete: false, lida_depois: lida_antes, lida_em_depois: lida_em_antes}
	if !lida_antes {lida_em_antes: null}
	if lida_antes {lida_em_antes: string & strings.MinRunes(1)}
	if !lida_depois {lida_em_depois: null}
	if lida_depois {lida_em_depois: string & strings.MinRunes(1)}

	// Repetir a marcação não altera o instante já gravado.
	if lida_antes {lida_depois: true, lida_em_depois: lida_em_antes}
}

// "Limpar tudo": lote paginado/reentrante, sem DELETE e com corte estável.
#M13LimparTudo: {
	uid:               string & strings.MinRunes(1)
	qtd_no_corte:      int & >=0
	qtd_marcados:      int & >=0
	qtd_posteriores:   int & >=0
	qtd_marcados:      <=qtd_no_corte
	usa_delete:        false
	corte_estavel:     true
	marca_posteriores: false
}

// Alvo/deep link: rota conhecida e revalidação; nunca URL/credencial.
#M13Alvo: {
	entidade_alvo:     #M13EntidadeAlvo
	id_alvo:           string & strings.MinRunes(1) & strings.MaxRunes(200)
	acesso_revalidado: bool
	navegavel:         bool
	if !acesso_revalidado {navegavel: false}
}

// Expiração: NULL não expira automaticamente; vencido sai do ativo.
#M13Expiracao: {
	tipo:              #M13Tipo
	expira_em:         null | (string & strings.MinRunes(1))
	no_conjunto_ativo: bool
	apagado:           false
	if expira_em == null {no_conjunto_ativo: true}
	if expira_em != null {no_conjunto_ativo: false}
	if tipo == "ESCASSEZ_ESTOQUE" {expira_em: null}
}

// Emissão/deduplicação: identidade de comando (M7) ou chave determinística (M8).
#M13Emissao: {
	id_operacao:       string & strings.MinRunes(1)
	uid:               string & strings.MinRunes(1)
	tipo:              #M13Tipo
	entidade_alvo:     #M13EntidadeAlvo
	id_alvo:           string & strings.MinRunes(1)
	chave_dedup:       string & strings.MinRunes(1)
	destinatario:      string & strings.MinRunes(1)
	status:            #M13StatusEmissao
	criou_notificacao: bool
	erro_propagado:    bool
	if status == "CONCLUIDA" {criou_notificacao: true, erro_propagado: false}
	if status == "DUPLICADA" {criou_notificacao: false, erro_propagado: false}
	if status == "FALHOU" {criou_notificacao: false, erro_propagado: true}
}

// Operação idempotente M7 (mesma identidade de M12.1/M12.2).
#M13Operacao: {
	id_operacao:   string & strings.MinRunes(1)
	uid:           string & strings.MinRunes(1)
	tipo_operacao: "EMITIR_NOTIFICACAO"
	payload_hash:  string & strings.MinRunes(1)
	status:        #M13StatusOperacao
}

// Uma fixture M13 é exatamente um dos shapes estruturais acima.
#M13Contrato:
	#M13Notificacao | #M13Caixa | #M13Leitura | #M13Marcacao |
	#M13LimparTudo | #M13Alvo | #M13Expiracao | #M13Emissao | #M13Operacao

#CamposM13: [
	#CampoFrasco & {nome: "uid", sql: "TEXT", observacao: "UID do caminho do documento; coincide com id_destinatario."},
	#CampoFrasco & {nome: "id", sql: "TEXT", observacao: "docId server-owned; não duplicar como contador relacional."},
	#CampoFrasco & {nome: "id_destinatario", sql: "TEXT", observacao: "Destinatário autenticado; igual ao uid do caminho."},
	#CampoFrasco & {nome: "papel_destinatario", sql: "ENUM", valores: ["Aluno", "Professor", "Bolsista", "Gestor_Bens_Patrimoniais", "Gestor_Almoxarifado", "Chefe_Geral"], observacao: "Contexto de apresentação; não concede papel."},
	#CampoFrasco & {nome: "tipo", sql: "ENUM", valores: ["ADICIONADO", "POST", "COMENTARIO", "REMOVIDO", "TURMA_ARQUIVADA", "TURMA_DESARQUIVADA", "REQUISICAO_BEM", "DATA_DEVOLUCAO_REAGENTE", "ROTEIRO_COMPARTILHADO", "REQUISICAO_EDICAO_BEM", "REQUISICAO_ADICAO_BEM", "BEM_INSERVIVEL", "ENTREGA_ATRASADA", "FRASCOS_VAZIOS", "FRASCOS_QUEBRADOS", "FRASCOS_VENCIDOS", "FRASCOS_A_SEREM_PESADOS", "FRASCOS_EM_QUARENTENA", "ESCASSEZ_ESTOQUE", "AUTO_ATENDIMENTO_RETIRADA"]},
	#CampoFrasco & {nome: "id_quem_fez_acao", sql: "TEXT", nulo: true},
	#CampoFrasco & {nome: "id_turma", sql: "TEXT", nulo: true, observacao: "Obrigatório nos tipos acadêmicos e nulo nos operacionais (RN-M13-07)."},
	#CampoFrasco & {nome: "quantidade", sql: "INTEGER", nulo: true, nao_negativo: true},
	#CampoFrasco & {nome: "entidade_alvo", sql: "ENUM", valores: ["Turma", "Post", "Comentario", "Roteiro", "Almoxarifado", "Emprestimo", "Usuario", "Requisicao_Bem", "Bem_Patrimonial"], observacao: "Rota conhecida; nunca URL arbitrária."},
	#CampoFrasco & {nome: "id_alvo", sql: "TEXT", observacao: "Identificador do recurso; acesso revalidado ao abrir."},
	#CampoFrasco & {nome: "lida", sql: "BOOLEAN"},
	#CampoFrasco & {nome: "lida_em", sql: "TIMESTAMP", nulo: true},
	#CampoFrasco & {nome: "emitida_em", sql: "TIMESTAMP"},
	#CampoFrasco & {nome: "expira_em", sql: "TIMESTAMP", nulo: true, observacao: "NULL em ESCASSEZ_ESTOQUE; sem expiração automática."},
	#CampoFrasco & {nome: "contem_conteudo_protegido", sql: "BOOLEAN", observacao: "Sempre false: payload mínimo."},
	#CampoFrasco & {nome: "chave_dedup", sql: "TEXT", observacao: "Identidade M7 ou chave determinística M8 da emissão."},
	#CampoFrasco & {nome: "id_operacao", sql: "TEXT"},
	#CampoFrasco & {nome: "tipo_operacao", sql: "ENUM", valores: ["EMITIR_NOTIFICACAO"]},
]
