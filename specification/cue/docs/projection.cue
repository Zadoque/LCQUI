package docs

import "lcqui.local/spec/domain"

ir: {
	versao:   1
	baseline: "db29ea2f17dc785fb0b44ffb3aec16db29c45e94"
	entidade: "Frasco_Reagente"
	escopo:   "M0 parcial: filtro físico; não equivale à autorização completa de retirada."
	campos:   domain.campos
	exemplo: domain.#Frasco & {
		estado_fisico_frasco: "FECHADO"
		disponibilidade:      "DISPONIVEL"
		em_quarentena:        false
	}
}
