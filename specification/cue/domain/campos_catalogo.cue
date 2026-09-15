package domain

import (
	"strings"
	"math"
)

// Descritores M1: #Valor e metadados são derivados das mesmas constraints.
#CampoCatalogo: {
	nome:        string
	obrigatorio: true // representação de linha: nullable é null explícito, não ausência
	nulo:        *false | bool
	valores: *[] | [...string]
	observacao: *"" | string
}
#TextoCatalogo: {
	#CampoCatalogo
	nulo:           _
	valores:        _
	tipo:           "string"
	max_caracteres: int & >0
	padrao:         *".*" | string
	#Base:          string & strings.MaxRunes(max_caracteres) & =~padrao
	if nulo {#Valor: null | #Base}
	if !nulo {#Valor: #Base}
}
#InteiroCatalogo: {
	#CampoCatalogo
	nulo:    _
	valores: _
	tipo:    "int"
	minimo:  int
	#Base:   int & >=minimo
	if nulo {#Valor: null | #Base}
	if !nulo {#Valor: #Base}
}
#EnumCatalogo: {
	#CampoCatalogo
	nulo:    _
	valores: _
	tipo:    "enum"
	#Valor:  or(valores)
	nulo:    false
}
#BooleanCatalogo: {
	#CampoCatalogo
	nulo:    _
	valores: _
	tipo:    "bool"
	#Valor:  bool
	nulo:    false
}
#DensidadeCatalogo: {
	#CampoCatalogo
	nulo:             _
	valores:          _
	tipo:             "number"
	nulo:             true
	minimo_exclusivo: 0
	maximo_exclusivo: 10000
	multiplo:         0.0001
	#Valor:           null | (number & >minimo_exclusivo & <maximo_exclusivo & math.MultipleOf(multiplo))
}
