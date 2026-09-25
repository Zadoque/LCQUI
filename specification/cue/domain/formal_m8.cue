package domain

// M8 — Estoque / Escassez / Notificações.
//
// Contrato estrutural local (CUE). Relações, transições, aptidão, escassez,
// invalidação/publicação do cache e idempotência de alerta pertencem ao Alloy;
// cálculos determinísticos/limites pertencem ao Rust. CUE não prova tempo real.

#M8Configuracao: {
	id_almoxarifado:           int & >0
	id_resumo_reagente:        int & >0
	id_especificacao_reagente: int & >0
	qtd_limiar_escassez:       int & >=0
	ativo:                     bool
	notificacao_ativa:         bool
}

#M8Estoque: {
	qtd_aptos:              int & >=0
	qtd_total:              int & >=0
	qtd_emprestados:        int & >=0
	qtd_saldo_desconhecido: int & >=0
	massa_aferida_g:        null | (number & >=0)
	volume_aferido_ml:      null | (number & >=0)
}

#M8Cache: {
	escopo:         "ESTOQUE__ALMOX" | "ESTOQUE__ALMOX__RESUMO"
	resultado:      null | #M8Estoque
	calculado_em:   string & !=""
	versao_calculo: string & !=""
	geracao:        int & >=0
	valido:         bool
	// Resultado é nulo durante a invalidação; cache válido publicado tem resultado.
	if !valido {resultado: null}
}

#M8Notificacao: {
	id_destinatario:    string & !=""
	papel_destinatario: "Gestor_Almoxarifado"
	tipo:               "ESCASSEZ_ESTOQUE"
	entidade_alvo:      "Almoxarifado"
	id_alvo:            string & !=""
	quantidade:         int & >=0
	lida:               bool
	emitida_em:         string & !=""
	expira_em:          null
}

// Uma fixture M8 é exatamente um dos quatro shapes estruturais.
#M8Contrato: #M8Configuracao | #M8Estoque | #M8Cache | #M8Notificacao

#CamposM8: [
	#CampoFrasco & {nome: "id_almoxarifado", sql: "INTEGER", positivo: true},
	#CampoFrasco & {nome: "id_resumo_reagente", sql: "INTEGER", positivo: true},
	#CampoFrasco & {nome: "id_especificacao_reagente", sql: "INTEGER", positivo: true},
	#CampoFrasco & {nome: "qtd_limiar_escassez", sql: "INTEGER", nao_negativo: true},
	#CampoFrasco & {nome: "ativo", sql: "BOOLEAN"},
	#CampoFrasco & {nome: "notificacao_ativa", sql: "BOOLEAN"},
	#CampoFrasco & {nome: "qtd_aptos", sql: "INTEGER", nao_negativo: true},
	#CampoFrasco & {nome: "qtd_total", sql: "INTEGER", nao_negativo: true},
	#CampoFrasco & {nome: "qtd_emprestados", sql: "INTEGER", nao_negativo: true},
	#CampoFrasco & {nome: "qtd_saldo_desconhecido", sql: "INTEGER", nao_negativo: true},
	#CampoFrasco & {nome: "massa_aferida_g", sql: "NUMERIC(10,3)", nulo: true, nao_negativo: true},
	#CampoFrasco & {nome: "volume_aferido_ml", sql: "NUMERIC(10,3)", nulo: true, nao_negativo: true},
	#CampoFrasco & {nome: "escopo", sql: "ENUM", valores: ["ESTOQUE__ALMOX", "ESTOQUE__ALMOX__RESUMO"]},
	#CampoFrasco & {nome: "calculado_em", sql: "TIMESTAMP"},
	#CampoFrasco & {nome: "versao_calculo", sql: "TEXT"},
	#CampoFrasco & {nome: "geracao", sql: "INTEGER", nao_negativo: true},
	#CampoFrasco & {nome: "valido", sql: "BOOLEAN"},
	#CampoFrasco & {nome: "id_destinatario", sql: "TEXT"},
	#CampoFrasco & {nome: "papel_destinatario", sql: "ENUM", valores: ["Gestor_Almoxarifado"]},
	#CampoFrasco & {nome: "tipo", sql: "ENUM", valores: ["ESCASSEZ_ESTOQUE"]},
	#CampoFrasco & {nome: "entidade_alvo", sql: "ENUM", valores: ["Almoxarifado"]},
	#CampoFrasco & {nome: "id_alvo", sql: "TEXT"},
	#CampoFrasco & {nome: "quantidade", sql: "INTEGER", nao_negativo: true},
	#CampoFrasco & {nome: "lida", sql: "BOOLEAN"},
	#CampoFrasco & {nome: "emitida_em", sql: "TIMESTAMP"},
	#CampoFrasco & {nome: "expira_em", sql: "TIMESTAMP", nulo: true},
]
