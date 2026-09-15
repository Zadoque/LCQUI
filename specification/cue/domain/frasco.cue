package domain

// Fatia estrutural M0; não é o documento Firestore completo.
// Baseline: Seção 4, Frasco_Reagente; fluxo físico: Seção 10.5.
estadosFisicos: ["FECHADO", "ABERTO", "VAZIO", "QUEBRADO", "DESCARTADO", "EXTRAVIADO"]
disponibilidades: ["DISPONIVEL", "EMPRESTADO"]

#Frasco: {
	estado_fisico_frasco: or(estadosFisicos)
	disponibilidade:      or(disponibilidades)
	em_quarentena:        bool
}

// Metadados derivados dos mesmos domínios usados pelo schema.
campos: [
	{nome: "estado_fisico_frasco", tipo: "enum", obrigatorio: true, nulo: false, valores: estadosFisicos},
	{nome: "disponibilidade", tipo: "enum", obrigatorio: true, nulo: false, valores: disponibilidades},
	{nome: "em_quarentena", tipo: "bool", obrigatorio: true, nulo: false, valores: []},
]
