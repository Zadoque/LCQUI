package domain

import "list"

// M9 — Autorização / usuários.
//
// CUE transporta somente shapes locais: autoridade persistida, claim
// transportada, vínculo, ownership e decisão. Revogação, TOCTOU, relações
// entre estruturas e regras de domínio são verificados no Alloy.

#M9Papel: "Chefe_Geral" | "Gestor_Almoxarifado" | "Gestor_Bens_Patrimoniais" | "Professor" | "Aluno" | "Bolsista"

#M9Usuario: {
	uid:               string & !=""
	ativo:             bool
	versao_permissoes: int & >=0
	papeis_persistidos: [...#M9Papel] & list.MinItems(1)
	claim_papeis: [...#M9Papel]
	claim_versao:     int & >=0
	claims_pendentes: bool
}

#M9VinculoAlmoxarifado: {
	uid:             string & !=""
	id_almoxarifado: string & !=""
	ativo:           bool
}

#M9OwnershipAcademico: {
	uid_proprietario: string & !=""
	id_recurso:       string & !=""
	tipo_recurso:     "Turma" | "Post" | "Roteiro" | "Requisicao"
}

#M9Decisao: {
	uid:             string & !=""
	operacao:        "GERIR_USUARIOS" | "OPERAR_ALMOXARIFADO" | "OPERAR_PATRIMONIO" | "OPERAR_RECURSO_PROPRIO" | "LER_RECURSO_ACADEMICO" | "ESCREVER_SERVER_OWNED"
	recurso:         "Almoxarifado" | "Patrimonio" | "Academico" | "Interno"
	exige_vinculo:   bool
	exige_ownership: bool
	permitido:       bool
}

#M9Contrato: #M9Usuario | #M9VinculoAlmoxarifado | #M9OwnershipAcademico | #M9Decisao

#CamposM9: [
	#CampoFrasco & {nome: "uid", sql: "TEXT"},
	#CampoFrasco & {nome: "ativo", sql: "BOOLEAN"},
	#CampoFrasco & {nome: "versao_permissoes", sql: "INTEGER", nao_negativo: true},
	#CampoFrasco & {nome: "papeis_persistidos", sql: "ENUM", valores: ["Chefe_Geral", "Gestor_Almoxarifado", "Gestor_Bens_Patrimoniais", "Professor", "Aluno", "Bolsista"]},
	#CampoFrasco & {nome: "claim_papeis", sql: "ENUM", valores: ["Chefe_Geral", "Gestor_Almoxarifado", "Gestor_Bens_Patrimoniais", "Professor", "Aluno", "Bolsista"]},
	#CampoFrasco & {nome: "claim_versao", sql: "INTEGER", nao_negativo: true},
	#CampoFrasco & {nome: "claims_pendentes", sql: "BOOLEAN"},
	#CampoFrasco & {nome: "id_almoxarifado", sql: "TEXT"},
	#CampoFrasco & {nome: "id_recurso", sql: "TEXT"},
	#CampoFrasco & {nome: "tipo_recurso", sql: "ENUM", valores: ["Turma", "Post", "Roteiro", "Requisicao"]},
	#CampoFrasco & {nome: "operacao", sql: "ENUM", valores: ["GERIR_USUARIOS", "OPERAR_ALMOXARIFADO", "OPERAR_PATRIMONIO", "OPERAR_RECURSO_PROPRIO", "LER_RECURSO_ACADEMICO", "ESCREVER_SERVER_OWNED"]},
	#CampoFrasco & {nome: "recurso", sql: "ENUM", valores: ["Almoxarifado", "Patrimonio", "Academico", "Interno"]},
	#CampoFrasco & {nome: "exige_vinculo", sql: "BOOLEAN"},
	#CampoFrasco & {nome: "exige_ownership", sql: "BOOLEAN"},
	#CampoFrasco & {nome: "permitido", sql: "BOOLEAN"},
]
