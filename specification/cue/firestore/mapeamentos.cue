package firestore

// Metadados documentais de mapeamento; não são um schema Firestore completo.
resumo: {
	caminho: "Resumo_Reagente/{id}"
	notas: [
		"id SERIAL torna-se docId string fora do corpo; FKs no Firestore são strings.",
		"letra_inicial é denormalização exclusiva do Firestore, recalculada pelo servidor junto de nome.",
		"estado_fisico e eh_higroscopico pertencem ao resumo; unidade é derivada e não editável.",
	]
}
especificacao: {
	caminho: "Resumo_Reagente/{resumoId}/Especificacoes/{id}"
	notas: [
		"id torna-se docId string; id_resumo_reagente string deve corresponder ao pai, validado pelo servidor.",
		"unidade_de_medida é projeção opcional derivada do estado do resumo: g ou ml; não é fonte canônica.",
		"composicao é array de mapas embutido; sua migração formal ainda não está incluída no M1.",
		"Precisão/escala e limites VARCHAR permanecem válidos; densidade é positiva e obrigatória para líquido.",
	]
}
