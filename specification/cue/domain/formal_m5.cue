package domain

#M5Operacao: {
	id_frasco:            int & >0
	tipo_operacao:        "EXTRAVIO" | "REENCONTRO" | "ENTROU_EM_QUARENTENA" | "LIBERADO_QUARENTENA" | "PENDENTE_DE_DESCARTE"
	estado_fisico:        "FECHADO" | "ABERTO" | "VAZIO" | "QUEBRADO" | "DESCARTADO"
	situacao_localizacao: "LOCALIZADO" | "EXTRAVIADO"
	disponibilidade:      "DISPONIVEL" | "EMPRESTADO" | "INDISPONIVEL"
	em_quarentena:        bool
	descarte_autorizado:  bool
	if tipo_operacao == "EXTRAVIO" {
		situacao_localizacao: "EXTRAVIADO"
		disponibilidade:      "INDISPONIVEL"
		descarte_autorizado:  false
	}
	if tipo_operacao == "REENCONTRO" {
		situacao_localizacao: "LOCALIZADO"
		em_quarentena:        true
		disponibilidade:      "INDISPONIVEL"
		descarte_autorizado:  false
		estado_fisico:        !="DESCARTADO"
	}
}

#CamposM5: [
	#CampoFrasco & {nome: "id_frasco", sql: "INTEGER", positivo: true},
	#CampoFrasco & {nome: "tipo_operacao", sql: "ENUM", valores: ["EXTRAVIO", "REENCONTRO", "ENTROU_EM_QUARENTENA", "LIBERADO_QUARENTENA", "PENDENTE_DE_DESCARTE"]},
	#CampoFrasco & {nome: "estado_fisico", sql: "ENUM", valores: ["FECHADO", "ABERTO", "VAZIO", "QUEBRADO", "DESCARTADO"]},
	#CampoFrasco & {nome: "situacao_localizacao", sql: "ENUM", valores: ["LOCALIZADO", "EXTRAVIADO"]},
	#CampoFrasco & {nome: "disponibilidade", sql: "ENUM", valores: ["DISPONIVEL", "EMPRESTADO", "INDISPONIVEL"]},
	#CampoFrasco & {nome: "em_quarentena", sql: "BOOLEAN"},
	#CampoFrasco & {nome: "descarte_autorizado", sql: "BOOLEAN"},
]
