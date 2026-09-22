package domain

import (
	"strings"
	"math"
)

// Descritor M3 do registro relacional Emprestimo_Reagente. Espelha #CampoFrasco
// acrescentando NUMERIC(10,5) e VARCHAR(100). Metadados e #Valor derivam das
// mesmas constraints; defaults dos metadados não são defaults da linha.
// DATE/TIMESTAMP permanecem strings de intercâmbio, sem calendário nem fuso.
#CampoEmprestimo: {
	#Base:       _
	nome:        string
	obrigatorio: true
	nulo:        *false | bool
	sql:         "SERIAL" | "INTEGER" | "TEXT" | "DATE" | "TIMESTAMP" | "NUMERIC(10,3)" | "NUMERIC(10,5)" | "BOOLEAN" | "ENUM" | "VARCHAR(100)"
	valores: *[] | [...string]
	observacao:     *"" | string
	positivo:       *false | bool
	nao_negativo:   *false | bool
	max_caracteres: *0 | int

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
		if positivo {#Base: >0}
		if nao_negativo {#Base: >=0}
	}
	if sql == "NUMERIC(10,5)" {
		tipo:     "number"
		minimo:   -99999.99999
		maximo:   99999.99999
		multiplo: 0.00001
		#Base:    number & >=minimo & <=maximo & math.MultipleOf(multiplo)
		if positivo {#Base: >0}
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
	if sql == "VARCHAR(100)" {
		tipo:           "string"
		max_caracteres: 100
		#Base:          string & strings.MaxRunes(max_caracteres)
	}
	if nulo {#Valor: null | #Base}
	if !nulo {#Valor: #Base}
}
