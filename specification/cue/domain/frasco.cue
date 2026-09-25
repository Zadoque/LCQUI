package domain

// Fatia estrutural M0; não é o documento Firestore completo.
// Baseline: Seção 4, Frasco_Reagente; fluxo físico: Seção 10.5.
#Campo: {
	nome:        string
	obrigatorio: true
	nulo:        false
}
#Enum: {
	#Campo
	tipo: "enum"
	valores: [...string]
	#Valor: or(valores)
}
#Boolean: {
	#Campo
	tipo: "bool"
	valores: []
	#Valor: bool
}

// Descritores normativos únicos: schema e documentação derivam deles.
// Todos os campos desta fatia são obrigatórios e não nulos.
campos: [
	#Enum & {nome: "estado_fisico_frasco", valores: ["FECHADO", "ABERTO", "VAZIO", "QUEBRADO", "DESCARTADO"]},
	#Enum & {nome: "disponibilidade", valores: ["DISPONIVEL", "EMPRESTADO", "INDISPONIVEL"]},
	#Boolean & {nome: "em_quarentena"},
	#Enum & {nome: "situacao_localizacao", valores: ["LOCALIZADO", "EXTRAVIADO"]},
]

#Frasco: {
	for campo in campos {
		"\(campo.nome)": campo.#Valor
	}
}
