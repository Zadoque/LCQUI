package domain

// Baseline M2: 9df335bc, Seção 4 (Frasco_Reagente) e Seção 5 (dicionário).
// DATE/TIMESTAMP são strings de intercâmbio/teste, não novos tipos SQL.
// DATE: apenas formato YYYY-MM-DD; sem validação de calendário neste recorte.
// TIMESTAMP: transporte textual sem impor formato/timezone não normatizado.
frascoCompletoCampos: [
	#CampoFrasco & {nome: "id", sql: "SERIAL", observacao: "PK; geração e unicidade globais fora do registro local."},
	#CampoFrasco & {nome: "id_almoxarifado", sql: "INTEGER"},
	#CampoFrasco & {nome: "id_lote", sql: "INTEGER", nulo: true, observacao: "XOR com referência direta, conforme M2-IDENTIDADE-001; existência da FK não verificada."},
	#CampoFrasco & {nome: "id_especificacao_reagente", sql: "INTEGER", nulo: true},
	#CampoFrasco & {nome: "detalhe_local_armazenamento", sql: "TEXT", nulo: true},
	#CampoFrasco & {nome: "codigo_frasco", sql: "TEXT", observacao: "Unicidade e geração do código fora do registro local."},
	#CampoFrasco & {nome: "data_ultima_pesagem", sql: "TIMESTAMP", nulo: true},
	#CampoFrasco & {nome: "conteudo_nominal", sql: "NUMERIC(10,3)", nulo: true, observacao: "null representa desconhecido; zero é um valor numérico distinto."},
	#CampoFrasco & {nome: "peso_no_cadastrado", sql: "NUMERIC(10,3)"},
	#CampoFrasco & {nome: "peso_atual", sql: "NUMERIC(10,3)"},
	#CampoFrasco & {nome: "peso_frasco_vazio", sql: "NUMERIC(10,3)", nulo: true},
	#CampoFrasco & {nome: "medida_usada", sql: "NUMERIC(10,3)"},
	#CampoFrasco & {nome: "data_abertura", sql: "DATE", nulo: true},
	#CampoFrasco & {nome: "validade_fechado", sql: "DATE", nulo: true},
	#CampoFrasco & {nome: "validade_efetiva", sql: "DATE", nulo: true},
	#CampoFrasco & {nome: "validade_desconhecida", sql: "BOOLEAN"},
	#CampoFrasco & {nome: "validade_apos_aberto_dias", sql: "INTEGER", nulo: true, positivo: true, observacao: "Seção 5: prazo inteiro positivo quando declarado."},
	#CampoFrasco & {nome: "estado_fisico_frasco", sql: "ENUM", valores: campos[0].valores},
	#CampoFrasco & {nome: "disponibilidade", sql: "ENUM", valores: campos[1].valores},
	#CampoFrasco & {nome: "vencido", sql: "BOOLEAN"},
	#CampoFrasco & {nome: "em_quarentena", sql: "BOOLEAN"},
	#CampoFrasco & {nome: "uso_vencido_autorizado", sql: "BOOLEAN"},
	#CampoFrasco & {nome: "detalhe_status", sql: "TEXT", nulo: true},
	#CampoFrasco & {nome: "cadastrado_em", sql: "TIMESTAMP"},
	#CampoFrasco & {nome: "cadastrado_por", sql: "INTEGER"},
	#CampoFrasco & {nome: "abertura_historica_desconhecida", sql: "BOOLEAN", observacao: "Seção 5: true implica data_abertura null; não restringe ao estado atual ABERTO."},
	#CampoFrasco & {nome: "saldo_desconhecido", sql: "BOOLEAN", observacao: "Sem inferir peso zero/null, estado atual ou regras de agregação."},
]

// Registro relacional completo, não payload de criação nem documento Firestore.
#FrascoCompleto: {
	id_lote!:                         _
	abertura_historica_desconhecida!: _
	for c in frascoCompletoCampos {"\(c.nome)"!: c.#Valor}

	// Decisão M2.0: texto normativo exclusivo, apesar do CHECK OR documental.
	if id_lote == null {id_especificacao_reagente!: !=null}
	if id_lote != null {id_especificacao_reagente!: null}
	if abertura_historica_desconhecida {data_abertura!: null}
}
