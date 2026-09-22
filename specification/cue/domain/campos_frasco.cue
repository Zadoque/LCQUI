package domain

import "math"

// M2.1: descritor único para valor e metadados da linha normalizada.
// Defaults destes metadados não são defaults dos valores da linha.
#CampoFrasco: {
	#Base:       _
	nome:        string
	obrigatorio: true
	nulo:        *false | bool
	sql:         "SERIAL" | "INTEGER" | "TEXT" | "DATE" | "TIMESTAMP" | "NUMERIC(10,3)" | "BOOLEAN" | "ENUM"
	valores: *[] | [...string]
	observacao:   *"" | string
	positivo:     *false | bool
	nao_negativo: *false | bool
	if sql == "SERIAL" || sql == "INTEGER" {
		tipo:  "int"
		#Base: int
		if positivo {#Base: >0}
		if nao_negativo {#Base: >=0}
	}
	if sql == "TEXT" || sql == "TIMESTAMP" {
		tipo:  "string"
		#Base: string
	}
	if sql == "DATE" {
		tipo:   "string"
		padrao: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"
		#Base:  string & =~padrao
	}
	if sql == "NUMERIC(10,3)" {
		tipo:     "number"
		minimo:   -9999999.999
		maximo:   9999999.999
		multiplo: 0.001
		#Base:    number & >=minimo & <=maximo & math.MultipleOf(multiplo)
		if nao_negativo {#Base: >=0}
	}
	if sql == "BOOLEAN" {
		tipo:  "bool"
		#Base: bool
	}
	if sql == "ENUM" {
		tipo:  "enum"
		#Base: or(valores)
	}
	if nulo {#Valor: null | #Base}
	if !nulo {#Valor: #Base}
}
