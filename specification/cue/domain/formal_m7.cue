package domain

import "strings"

#M7Operacao: {
	id_operacao:   string & strings.MinRunes(1)
	uid:           string & strings.MinRunes(1)
	tipo_operacao: string & strings.MinRunes(1)
	payload_hash:  string & =~"^[0-9a-f]{64}$"
	status:        "PENDENTE" | "CONCLUIDA" | "FALHOU"
}

#CamposM7: [
	#CampoEmprestimo & {nome: "id_operacao", sql: "VARCHAR(100)"},
	#CampoEmprestimo & {nome: "uid", sql: "VARCHAR(100)"},
	#CampoEmprestimo & {nome: "tipo_operacao", sql: "VARCHAR(100)"},
	#CampoEmprestimo & {nome: "payload_hash", sql: "TEXT"},
	#CampoEmprestimo & {nome: "status", sql: "ENUM", valores: ["PENDENTE", "CONCLUIDA", "FALHOU"]},
]
