package docs

import (
	"lcqui.local/spec/domain"
	"lcqui.local/spec/firestore"
)

#ParExemplo: domain.#ParCatalogo & {
	resumo: {
		id:                       1
		nome:                     "Etanol"
		tipo_substancia:          "PURA"
		natureza_quimica:         "ORGANICO"
		requer_pesagem_frequente: false
		frequencia_pesagem_dias:  null
		estado_fisico:            "LIQUIDO"
		eh_higroscopico:          false
	}
	especificacao: {
		id:                        2
		id_resumo_reagente:        1
		descricao:                 "Etanol PA"
		fabricante:                null
		codigo_produto_fabricante: null
		grau_pureza:               null
		densidade:                 0.7893
		classe_inflamabilidade:    "CLASSE_1"
		eh_controlado_pf:          false
		eh_controlado_eb:          false
		link_fds_fispq:            null
	}
}

// Projeção M2: metadados derivados de frascoCompletoCampos, sem segunda lista
// humana. Transporta tipo abstrato, tipo SQL, nulabilidade, enums, limites e
// padrão. `positivo` vira `minimo_exclusivo: 0`.
#CamposFrascoM2: [
	for c in domain.frascoCompletoCampos {
		{
			nome:        c.nome
			tipo:        c.tipo
			obrigatorio: c.obrigatorio
			nulo:        c.nulo
			valores:     c.valores
			observacao:  c.observacao
			sql:         c.sql
			if c.positivo {minimo_exclusivo: 0}
			if c.sql == "NUMERIC(10,3)" {
				if c.nao_negativo {minimo_numero: 0}
				if !c.positivo && !c.nao_negativo {minimo_numero: c.minimo}
				maximo_numero: c.maximo
				multiplo:      c.multiplo
			}
			if c.sql == "DATE" {padrao: c.padrao}
		}
	}
]

// Exemplo M2 unificado ao próprio #FrascoCompleto (drift torna o export inválido).
#FrascoM2Exemplo: domain.#FrascoCompleto & {
	id:                              1
	id_almoxarifado:                 1
	id_lote:                         1
	id_especificacao_reagente:       null
	detalhe_local_armazenamento:     null
	codigo_frasco:                   "LCQUI-1"
	data_ultima_pesagem:             null
	conteudo_nominal:                1000
	peso_no_cadastrado:              500
	peso_atual:                      500
	peso_frasco_vazio:               null
	origem_tara:                     null
	medida_usada:                    0
	data_abertura:                   null
	validade_fechado:                "2027-09-20"
	validade_efetiva:                null
	validade_desconhecida:           true
	validade_apos_aberto_dias:       30
	estado_fisico_frasco:            "FECHADO"
	situacao_localizacao:            "LOCALIZADO"
	disponibilidade:                 "DISPONIVEL"
	vencido:                         false
	em_quarentena:                   false
	uso_vencido_autorizado:          false
	detalhe_status:                  null
	cadastrado_em:                   "2026-09-20 10:00:00"
	cadastrado_por:                  1
	abertura_historica_desconhecida: false
	saldo_desconhecido:              false
	condicao_inicial_cadastro:       "FECHADO"
}

// Projeção M3: metadados derivados de emprestimoReagenteCampos, sem segunda
// lista humana. NUMERIC(10,3)/NUMERIC(10,5) expõem limites; VARCHAR(100) expõe
// o máximo; `positivo` vira `minimo_exclusivo: 0` e omite o mínimo negativo.
#CamposEmprestimoM3: [
	for c in domain.emprestimoReagenteCampos {
		{
			nome:        c.nome
			tipo:        c.tipo
			obrigatorio: c.obrigatorio
			nulo:        c.nulo
			valores:     c.valores
			observacao:  c.observacao
			sql:         c.sql
			if c.sql == "NUMERIC(10,3)" || c.sql == "NUMERIC(10,5)" {
				if c.nao_negativo {minimo_numero: 0}
				if !c.positivo && !c.nao_negativo {minimo_numero: c.minimo}
				maximo_numero: c.maximo
				multiplo:      c.multiplo
			}
			if c.positivo {minimo_exclusivo: 0}
			if c.max_caracteres > 0 {max_caracteres: c.max_caracteres}
			if c.sql == "DATE" {padrao: c.padrao}
		}
	}
]

// Exemplo M3 unificado ao próprio #EmprestimoReagente.
#EmprestimoM3Exemplo: domain.#EmprestimoReagente & {
	id:                              1
	id_frasco_reagente:              1
	id_usuario_retirou:              2
	id_gestor_retirada:              3
	status:                          "EM_USO"
	data_retirada:                   "2026-09-20 10:00:00"
	data_devolucao_prevista:         "2026-09-27"
	data_devolucao_efetuada:         null
	id_local_usado:                  1
	id_usuario_devolveu:             null
	id_gestor_devolucao:             null
	peso_saida:                      500
	peso_retorno:                    null
	medida_utilizada:                null
	consumo_validado:                false
	anomalia_metrologica:            null
	peso_retorno_efetivo:            null
	id_resolucao_metrologica:        null
	unidade_medida_utilizada:        "g"
	densidade_aplicada:              null
	peso_perda_evaporacao:           0
	uso_vencido_aceito:              false
	vencido_na_retirada:             false
	finalidade_uso:                  "AULA_PRATICA"
	auto_atendimento:                false
	justificativa_metodologica:      null
	tcr_versao:                      null
	tcr_aceito_em:                   null
	tcr_aceito_por:                  null
	tcr_auditoria_id:                null
	tipo_encerramento_excepcional:   null
	motivo_encerramento_excepcional: null
	id_gestor_encerramento:          null
	massa_perda_estimada_g:          null
}

ir: {
	versao: 3
	// Proveniência explícita: M0/M1 foram validados historicamente contra o
	// baseline 3B; a documentação normativa de entrada de M2 é distinta e o CUE
	// M2 foi realinhado em M2.1b..d. Não reduzir a um único SHA.
	proveniencia: {
		baseline_historico_m0_m1: "db29ea2f17dc785fb0b44ffb3aec16db29c45e94"
		baseline_documental_m2:   "9df335bc977bfcf16668bca4baf5f9ed50c2da1a"
		// M3: checkpoint versionado de entrada com M2 fechado (HEAD de M3).
		baseline_documental_m3: "158cb91f77b8301274c63e4ee8e384249721a5ba"
	}
	entidades: [
		{
			arquivo:  "frasco_reagente"
			entidade: "Frasco_Reagente"
			etapa:    "fatia M0"
			escopo:   "M0 parcial: filtro físico; não equivale à autorização completa de retirada."
			campos:   domain.campos
			exemplo: domain.#Frasco & {estado_fisico_frasco: "FECHADO", disponibilidade: "DISPONIVEL", em_quarentena: false, situacao_localizacao: "LOCALIZADO"}
		},
		{
			arquivo:    "resumo_reagente"
			entidade:   "Resumo_Reagente"
			etapa:      "modelo normalizado M1"
			escopo:     "Registro normalizado: todos os campos presentes, incluindo null explícito quando permitido. Não é payload de criação nem corpo Firestore."
			campos:     domain.resumoCampos
			exemplo:    #ParExemplo.resumo
			mapeamento: firestore.resumo
		},
		{
			arquivo:    "especificacao_reagente"
			entidade:   "Especificacao_Reagente"
			etapa:      "modelo normalizado M1"
			escopo:     "A densidade depende do estado do resumo no par validado. Composição, imutabilidade e existência global de FKs não estão modeladas nesta fatia."
			campos:     domain.especificacaoCampos
			exemplo:    #ParExemplo.especificacao
			mapeamento: firestore.especificacao
		},
		{
			arquivo:  "frasco_reagente_m2"
			entidade: "Frasco_Reagente"
			etapa:    "projeção M2 completa (29 colunas)"
			escopo:   "Registro relacional completo M2 (29 colunas, inclui origem_tara). Não é payload de criação nem documento Firestore completo. Projeção distinta da fatia M0 histórica, que permanece inalterada."
			campos:   #CamposFrascoM2
			exemplo:  #FrascoM2Exemplo
		},
		{
			arquivo:  "emprestimo_reagente"
			entidade: "Emprestimo_Reagente"
			etapa:    "projeção M3 completa (34 colunas)"
			escopo:   "Registro relacional completo do empréstimo (34 colunas), incluindo o snapshot imutável vencido_na_retirada. Não é payload de criação nem documento Firestore completo. A existência global das FKs, a unicidade de empréstimo ativo por frasco e as transições de status são verificadas fora do registro (loan_state.als)."
			campos:   #CamposEmprestimoM3
			exemplo:  #EmprestimoM3Exemplo
		},
		{
			arquivo:  "formal_m5_operacao"
			entidade: "M5_Operacao"
			etapa:    "formalização executável M5"
			escopo:   "Contratos estruturais de extravio, reencontro e quarentena; relações e transições são verificadas em Alloy."
			campos:   domain.#CamposM5
			exemplo: {id_frasco: 1, tipo_operacao: "EXTRAVIO", estado_fisico: "QUEBRADO", situacao_localizacao: "EXTRAVIADO", disponibilidade: "INDISPONIVEL", em_quarentena: false, descarte_autorizado: false}
		},
		{
			arquivo:  "formal_m6_metrologia"
			entidade: "M6_Metrologia"
			etapa:    "formalização executável M6"
			escopo:   "Contratos quantitativos locais; rotas e preservação histórica são verificadas em Alloy."
			campos: [for c in domain.#CamposM6 {
				{
					nome:        c.nome
					tipo:        c.tipo
					obrigatorio: c.obrigatorio
					nulo:        c.nulo
					valores:     c.valores
					observacao:  c.observacao
					sql:         c.sql
					if c.positivo {minimo_exclusivo: 0}
					if c.sql == "NUMERIC(10,3)" {
						if c.nao_negativo {minimo_numero: 0}
						if !c.positivo && !c.nao_negativo {minimo_numero: c.minimo}
						maximo_numero: c.maximo
						multiplo:      c.multiplo
					}
					if c.sql == "NUMERIC(10,5)" {
						if c.nao_negativo {minimo_numero: 0}
						if !c.positivo && !c.nao_negativo {minimo_numero: c.minimo}
						maximo_numero: c.maximo
						multiplo:      c.multiplo
					}
				}
			}]
			exemplo: {eh_higroscopico: false, peso_saida: 100, peso_retorno: 102, peso_retorno_efetivo: null, peso_perda_evaporacao: 0, densidade_aplicada: 0.7893, anomalia_q06: true, origem_tara: "REFERENCIA_TEORICA", rota: "REPETIR_PESAGEM", consumo_validado: false}
		},
		{
			arquivo:  "formal_m7_operacao"
			entidade: "M7_Operacao_Idempotente"
			etapa:    "formalização executável M7"
			escopo:   "Identidade, estados e deduplicação estrutural; SHA-256/canonicalização são validados por Rust."
			campos:   domain.#CamposM7
			exemplo: {id_operacao: "op-1", uid: "uid-1", tipo_operacao: "EXTRAVIO", payload_hash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", status: "CONCLUIDA"}
		},
	]
}
