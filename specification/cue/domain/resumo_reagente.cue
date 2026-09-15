package domain

resumoCampos: [
	#InteiroCatalogo & {nome: "id", minimo: 1, observacao: "Identidade relacional SERIAL; Firestore usa docId string, fora do corpo."},
	#TextoCatalogo & {nome: "nome", max_caracteres: 150},
	#EnumCatalogo & {nome: "tipo_substancia", valores: ["PURA", "MISTURA"]},
	#EnumCatalogo & {nome: "natureza_quimica", valores: ["ORGANICO", "INORGANICO", "ELEMENTO", "HIBRIDO"]},
	#BooleanCatalogo & {nome: "requer_pesagem_frequente"},
	#InteiroCatalogo & {nome: "frequencia_pesagem_dias", minimo: 1, nulo: true, observacao: "Positiva quando requer pesagem frequente; null caso contrário (Seção 5)."},
	#EnumCatalogo & {nome: "estado_fisico", valores: ["SOLIDO", "LIQUIDO"]},
	#BooleanCatalogo & {nome: "eh_higroscopico"},
]

#ResumoReagente: {
	requer_pesagem_frequente: _
	for c in resumoCampos {"\(c.nome)"!: c.#Valor}
	if requer_pesagem_frequente {frequencia_pesagem_dias!: !=null}
	if !requer_pesagem_frequente {frequencia_pesagem_dias!: null}
}
