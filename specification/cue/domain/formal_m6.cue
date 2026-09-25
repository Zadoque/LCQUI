package domain

#M6Metrologia: {
	eh_higroscopico:       bool
	peso_saida:            number & >=0
	peso_retorno:          number & >=0
	peso_retorno_efetivo:  null | (number & >=0)
	peso_perda_evaporacao: number & >=0
	densidade_aplicada:    number & >0
	anomalia_q06:          bool
	origem_tara:           "NULL" | "REFERENCIA_TEORICA" | "MEDIDA_REAL"
	rota:                  "REPETIR_PESAGEM" | "CONFIRMAR_ESGOTAMENTO" | "RECALIBRAR_TARA"
	consumo_validado:      bool
	if anomalia_q06 {consumo_validado: false}
	if consumo_validado {peso_retorno_efetivo: !=null}
	if rota == "REPETIR_PESAGEM" {anomalia_q06: true}

	if rota == "RECALIBRAR_TARA"
	// As relações entre campos e a aritmética decimal são validadas por Rust e
	// pela abstração inteira escalada em Alloy; CUE mantém a estrutura local.
	{origem_tara: "MEDIDA_REAL"}
}

#CamposM6: [
	#CampoEmprestimo & {nome: "eh_higroscopico", sql: "BOOLEAN"},
	#CampoEmprestimo & {nome: "peso_saida", sql: "NUMERIC(10,3)", nao_negativo: true},
	#CampoEmprestimo & {nome: "peso_retorno", sql: "NUMERIC(10,3)", nao_negativo: true},
	#CampoEmprestimo & {nome: "peso_retorno_efetivo", sql: "NUMERIC(10,3)", nulo: true, nao_negativo: true},
	#CampoEmprestimo & {nome: "peso_perda_evaporacao", sql: "NUMERIC(10,3)", nao_negativo: true},
	#CampoEmprestimo & {nome: "densidade_aplicada", sql: "NUMERIC(10,5)", positivo: true},
	#CampoEmprestimo & {nome: "anomalia_q06", sql: "BOOLEAN"},
	#CampoEmprestimo & {nome: "origem_tara", sql: "ENUM", valores: ["NULL", "REFERENCIA_TEORICA", "MEDIDA_REAL"]},
	#CampoEmprestimo & {nome: "rota", sql: "ENUM", valores: ["REPETIR_PESAGEM", "CONFIRMAR_ESGOTAMENTO", "RECALIBRAR_TARA"]},
	#CampoEmprestimo & {nome: "consumo_validado", sql: "BOOLEAN"},
]
