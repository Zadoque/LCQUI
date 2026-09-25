package domain

#M6Metrologia: {
	peso_saida:            number & >=0
	peso_retorno:          number & >=0
	peso_retorno_efetivo:  number & >=0
	peso_perda_evaporacao: number & >=0
	densidade_aplicada:    number & >0
	origem_tara:           "NULL" | "REFERENCIA_TEORICA" | "MEDIDA_REAL"
	rota:                  "REPETIR_PESAGEM" | "CONFIRMAR_ESGOTAMENTO" | "RECALIBRAR_TARA"
	consumo_validado:      bool
	// A relação evaporação <= perda bruta é validada numericamente pelo Rust;
	// CUE mantém aqui os tipos, sinais e nulabilidade locais.
}

#CamposM6: [
	#CampoEmprestimo & {nome: "peso_saida", sql: "NUMERIC(10,3)", nao_negativo: true},
	#CampoEmprestimo & {nome: "peso_retorno", sql: "NUMERIC(10,3)", nao_negativo: true},
	#CampoEmprestimo & {nome: "peso_retorno_efetivo", sql: "NUMERIC(10,3)", nao_negativo: true},
	#CampoEmprestimo & {nome: "peso_perda_evaporacao", sql: "NUMERIC(10,3)", nao_negativo: true},
	#CampoEmprestimo & {nome: "densidade_aplicada", sql: "NUMERIC(10,5)", positivo: true},
	#CampoEmprestimo & {nome: "origem_tara", sql: "ENUM", valores: ["NULL", "REFERENCIA_TEORICA", "MEDIDA_REAL"]},
	#CampoEmprestimo & {nome: "rota", sql: "ENUM", valores: ["REPETIR_PESAGEM", "CONFIRMAR_ESGOTAMENTO", "RECALIBRAR_TARA"]},
	#CampoEmprestimo & {nome: "consumo_validado", sql: "BOOLEAN"},
]
