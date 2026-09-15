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

ir: {
	versao:   2
	baseline: "db29ea2f17dc785fb0b44ffb3aec16db29c45e94"
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
	]
}
