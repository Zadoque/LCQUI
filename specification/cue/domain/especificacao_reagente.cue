package domain

especificacaoCampos: [
	#InteiroCatalogo & {nome: "id", minimo: 1, observacao: "Identidade relacional SERIAL; Firestore usa docId string."},
	#InteiroCatalogo & {nome: "id_resumo_reagente", minimo: 1, observacao: "FK para Resumo_Reagente; existência validada pelo servidor. Firestore usa string."},
	#TextoCatalogo & {nome: "descricao", max_caracteres: 150},
	#TextoCatalogo & {nome: "fabricante", max_caracteres: 150, nulo: true},
	#TextoCatalogo & {nome: "codigo_produto_fabricante", max_caracteres: 100, nulo: true},
	#TextoCatalogo & {nome: "grau_pureza", max_caracteres: 30, nulo: true},
	#DensidadeCatalogo & {nome: "densidade", observacao: "NUMERIC(8,4), g/mL; positiva quando informada; obrigatória para líquido no par com resumo. Imutabilidade depende de transição, fora de M1."},
	#EnumCatalogo & {nome: "classe_inflamabilidade", valores: ["NAO_INFLAMAVEL", "CLASSE_1", "CLASSE_2", "CLASSE_3"]},
	#BooleanCatalogo & {nome: "eh_controlado_pf"},
	#BooleanCatalogo & {nome: "eh_controlado_eb"},
	#TextoCatalogo & {nome: "link_fds_fispq", max_caracteres: 255, nulo: true, padrao: "^https://[^/?#[:space:]]+[^[:space:]]*$", observacao: "HTTPS com host não vazio; acessibilidade e autorização do recurso não verificadas por CUE."},
]

#EspecificacaoReagente: {
	for c in especificacaoCampos {"\(c.nome)"!: c.#Valor}
}

// Par de registros existentes; não é payload de criação nem documento Firestore.
#ParCatalogo: {
	resumo:        #ResumoReagente
	especificacao: #EspecificacaoReagente
	especificacao: id_resumo_reagente!: resumo.id
	if resumo.estado_fisico == "LIQUIDO" {especificacao: densidade!: !=null}
}
