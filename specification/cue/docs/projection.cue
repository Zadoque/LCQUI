package docs

import (
	"lcqui.local/spec/domain"
	"lcqui.local/spec/firestore"
)

#ParExemplo: domain.#ParCatalogo & {
	resumo: {
		id:                       1
		nome:                     "Etanol"
		tipo_substancia:          "PURA"
		natureza_quimica:         "ORGANICO"
		requer_pesagem_frequente: false
		frequencia_pesagem_dias:  null
		estado_fisico:            "LIQUIDO"
		eh_higroscopico:          false
	}
	especificacao: {
		id:                        2
		id_resumo_reagente:        1
		descricao:                 "Etanol PA"
		fabricante:                null
		codigo_produto_fabricante: null
		grau_pureza:               null
		densidade:                 0.7893
		classe_inflamabilidade:    "CLASSE_1"
		eh_controlado_pf:          false
		eh_controlado_eb:          false
		link_fds_fispq:            null
	}
}

// Projeção M2: metadados derivados de frascoCompletoCampos, sem segunda lista
// humana. Transporta tipo abstrato, tipo SQL, nulabilidade, enums, limites e
// padrão. `positivo` vira `minimo_exclusivo: 0`.
#CamposFrascoM2: [
	for c in domain.frascoCompletoCampos {
		{
			nome:        c.nome
			tipo:        c.tipo
			obrigatorio: c.obrigatorio
			nulo:        c.nulo
			valores:     c.valores
			observacao:  c.observacao
			sql:         c.sql
			if c.positivo {minimo_exclusivo: 0}
			if c.sql == "NUMERIC(10,3)" {
				minimo_numero: c.minimo
				maximo_numero: c.maximo
				multiplo:      c.multiplo
			}
			if c.sql == "DATE" {padrao: c.padrao}
		}
	}
]

// Exemplo M2 unificado ao próprio #FrascoCompleto (drift torna o export inválido).
#FrascoM2Exemplo: domain.#FrascoCompleto & {
	id:                              1
	id_almoxarifado:                 1
	id_lote:                         1
	id_especificacao_reagente:       null
	detalhe_local_armazenamento:     null
	codigo_frasco:                   "LCQUI-1"
	data_ultima_pesagem:             null
	conteudo_nominal:                1000
	peso_no_cadastrado:              500
	peso_atual:                      500
	peso_frasco_vazio:               null
	origem_tara:                     null
	medida_usada:                    0
	data_abertura:                   null
	validade_fechado:                "2027-09-20"
	validade_efetiva:                null
	validade_desconhecida:           true
	validade_apos_aberto_dias:       30
	estado_fisico_frasco:            "FECHADO"
	disponibilidade:                 "DISPONIVEL"
	vencido:                         false
	em_quarentena:                   false
	uso_vencido_autorizado:          false
	detalhe_status:                  null
	cadastrado_em:                   "2026-09-20 10:00:00"
	cadastrado_por:                  1
	abertura_historica_desconhecida: false
	saldo_desconhecido:              false
	condicao_inicial_cadastro:       "FECHADO"
}

ir: {
	versao: 3
	// Proveniência explícita: M0/M1 foram validados historicamente contra o
	// baseline 3B; a documentação normativa de entrada de M2 é distinta e o CUE
	// M2 foi realinhado em M2.1b..d. Não reduzir a um único SHA.
	proveniencia: {
		baseline_historico_m0_m1: "db29ea2f17dc785fb0b44ffb3aec16db29c45e94"
		baseline_documental_m2:   "9df335bc977bfcf16668bca4baf5f9ed50c2da1a"
	}
	entidades: [
		{
			arquivo:  "frasco_reagente"
			entidade: "Frasco_Reagente"
			etapa:    "fatia M0"
			escopo:   "M0 parcial: filtro físico; não equivale à autorização completa de retirada."
			campos:   domain.campos
			exemplo: domain.#Frasco & {estado_fisico_frasco: "FECHADO", disponibilidade: "DISPONIVEL", em_quarentena: false}
		},
		{
			arquivo:    "resumo_reagente"
			entidade:   "Resumo_Reagente"
			etapa:      "modelo normalizado M1"
			escopo:     "Registro normalizado: todos os campos presentes, incluindo null explícito quando permitido. Não é payload de criação nem corpo Firestore."
			campos:     domain.resumoCampos
			exemplo:    #ParExemplo.resumo
			mapeamento: firestore.resumo
		},
		{
			arquivo:    "especificacao_reagente"
			entidade:   "Especificacao_Reagente"
			etapa:      "modelo normalizado M1"
			escopo:     "A densidade depende do estado do resumo no par validado. Composição, imutabilidade e existência global de FKs não estão modeladas nesta fatia."
			campos:     domain.especificacaoCampos
			exemplo:    #ParExemplo.especificacao
			mapeamento: firestore.especificacao
		},
		{
			arquivo:  "frasco_reagente_m2"
			entidade: "Frasco_Reagente"
			etapa:    "projeção M2 completa (29 colunas)"
			escopo:   "Registro relacional completo M2 (29 colunas, inclui origem_tara). Não é payload de criação nem documento Firestore completo. Projeção distinta da fatia M0 histórica, que permanece inalterada."
			campos:   #CamposFrascoM2
			exemplo:  #FrascoM2Exemplo
		},
	]
}
