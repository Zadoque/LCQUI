package domain

// Baseline M3: Seção 4 (Emprestimo_Reagente, 34 colunas após o erratum pré-M5) e
// Seção 5 reconciliada.
// DATE/TIMESTAMP são strings de intercâmbio/teste; não há calendário nem fuso
// nesta fatia. `data_devolucao_prevista` é a data civil YYYY-MM-DD cuja
// autoridade operacional é America/Sao_Paulo, tratada fora do registro local.
// A FK de frasco e a unicidade de empréstimo ativo por frasco são relacionais
// (Alloy/transação), não verificáveis no registro isolado.
emprestimoReagenteCampos: [
	#CampoEmprestimo & {nome: "id", sql: "SERIAL", observacao: "PK; geração e unicidade globais fora do registro local."},
	#CampoEmprestimo & {nome: "id_frasco_reagente", sql: "INTEGER", observacao: "FK para Frasco_Reagente; existência e unicidade ativa validadas fora do registro."},
	#CampoEmprestimo & {nome: "id_usuario_retirou", sql: "INTEGER", observacao: "Portador físico (Professor/Bolsista) que recebe e usa o reagente; FK verificada pelo servidor."},
	#CampoEmprestimo & {nome: "id_gestor_retirada", sql: "INTEGER", observacao: "Operador do almoxarifado que registrou a retirada; no autoatendimento coincide com o retirante."},
	#CampoEmprestimo & {nome: "status", sql: "ENUM", valores: ["EM_USO", "ATRASADO", "DEVOLVIDO", "DEVOLVIDO_COM_ATRASO", "DEVOLVIDO_COM_ANOMALIA", "ENCERRADO_EXTRAORDINARIO"], observacao: "Estado controlado pelo servidor; EM_USO/ATRASADO são custódia ativa."},
	#CampoEmprestimo & {nome: "data_retirada", sql: "TIMESTAMP"},
	#CampoEmprestimo & {nome: "data_devolucao_prevista", sql: "DATE", observacao: "Data civil YYYY-MM-DD; vencimento legal às 23:59:59.999 em America/Sao_Paulo."},
	#CampoEmprestimo & {nome: "data_devolucao_efetuada", sql: "TIMESTAMP", nulo: true},
	#CampoEmprestimo & {nome: "id_local_usado", sql: "INTEGER"},
	#CampoEmprestimo & {nome: "id_usuario_devolveu", sql: "INTEGER", nulo: true},
	#CampoEmprestimo & {nome: "id_gestor_devolucao", sql: "INTEGER", nulo: true},
	#CampoEmprestimo & {nome: "peso_saida", sql: "NUMERIC(10,3)", nao_negativo: true, observacao: "Peso bruto em g medido na retirada; referência imutável do consumo."},
	#CampoEmprestimo & {nome: "peso_retorno", sql: "NUMERIC(10,3)", nulo: true, nao_negativo: true, observacao: "Peso bruto em g medido na devolução; preservado mesmo quando contradiz tara/saída."},
	#CampoEmprestimo & {nome: "medida_utilizada", sql: "NUMERIC(10,3)", nulo: true, nao_negativo: true, observacao: "Consumo validado não negativo na unidade do empréstimo; null até a validação quantitativa. Zero é consumo válido."},
	#CampoEmprestimo & {nome: "consumo_validado", sql: "BOOLEAN", observacao: "Falso na retirada e enquanto a pendência quantitativa permanece aberta; server-owned."},
	#CampoEmprestimo & {nome: "anomalia_metrologica", sql: "TEXT", nulo: true, observacao: "Classificação server-owned da anomalia quantitativa; null quando não há anomalia."},
	#CampoEmprestimo & {nome: "peso_retorno_efetivo", sql: "NUMERIC(10,3)", nulo: true, nao_negativo: true, observacao: "Peso de retorno efetivo em g; null enquanto o consumo não for validado."},
	#CampoEmprestimo & {nome: "id_resolucao_metrologica", sql: "INTEGER", nulo: true, observacao: "Referência ao evento AJUSTE que encerrou a pendência; resolver não apaga o status anômalo."},
	#CampoEmprestimo & {nome: "unidade_medida_utilizada", sql: "ENUM", valores: ["ml", "g"], observacao: "Qualifica exclusivamente medida_utilizada: ml para líquido, g para sólido."},
	#CampoEmprestimo & {nome: "densidade_aplicada", sql: "NUMERIC(10,5)", nulo: true, positivo: true, observacao: "Snapshot histórico da densidade na retirada; obrigatório e positivo para líquido, null para sólido."},
	#CampoEmprestimo & {nome: "peso_perda_evaporacao", sql: "NUMERIC(10,3)", nao_negativo: true, observacao: "Perda em g registrada separadamente do consumo; não inferir arbitrariamente."},
	#CampoEmprestimo & {nome: "uso_vencido_aceito", sql: "BOOLEAN", observacao: "Ciência explícita do empréstimo específico; não substitui autorização do gestor."},
	#CampoEmprestimo & {nome: "vencido_na_retirada", sql: "BOOLEAN", observacao: "Snapshot server-owned e imutável do vencimento conhecido no instante em que a retirada cria o empréstimo, após eventual primeira abertura. Não é autorização nem é recalculado na devolução."},
	#CampoEmprestimo & {nome: "finalidade_uso", sql: "ENUM", valores: ["AULA_PRATICA", "DEMONSTRACAO", "PESQUISA_TCC_POS", "ESTUDO_DEGRADACAO_RESIDUOS"], observacao: "Finalidade declarada na retirada; pesquisa excepcional exige TCR de Q04."},
	#CampoEmprestimo & {nome: "auto_atendimento", sql: "BOOLEAN", observacao: "Calculado pelo backend conforme Q14; justificativa e notificação à chefia quando true."},
	#CampoEmprestimo & {nome: "justificativa_metodologica", sql: "TEXT", nulo: true, observacao: "Condicional ao uso excepcional de pesquisa Q04 (mínimo verificado após trim)."},
	#CampoEmprestimo & {nome: "tcr_versao", sql: "VARCHAR(100)", nulo: true},
	#CampoEmprestimo & {nome: "tcr_aceito_em", sql: "TIMESTAMP", nulo: true},
	#CampoEmprestimo & {nome: "tcr_aceito_por", sql: "INTEGER", nulo: true},
	#CampoEmprestimo & {nome: "tcr_auditoria_id", sql: "INTEGER", nulo: true},
	#CampoEmprestimo & {nome: "tipo_encerramento_excepcional", sql: "ENUM", nulo: true, valores: ["QUEBRA_ACIDENTAL", "EXTRAVIO_SINISTRO"], observacao: "Tipo do sinistro; null fora do encerramento extraordinário."},
	#CampoEmprestimo & {nome: "motivo_encerramento_excepcional", sql: "TEXT", nulo: true},
	#CampoEmprestimo & {nome: "id_gestor_encerramento", sql: "INTEGER", nulo: true},
	#CampoEmprestimo & {nome: "massa_perda_estimada_g", sql: "NUMERIC(10,3)", nulo: true, nao_negativo: true},
]

// Registro relacional completo, não payload de criação nem documento Firestore.
#EmprestimoReagente: {
	status!:                          _
	unidade_medida_utilizada!:        _
	densidade_aplicada!:              _
	consumo_validado!:                _
	peso_retorno_efetivo!:            _
	id_resolucao_metrologica!:        _
	tipo_encerramento_excepcional!:   _
	motivo_encerramento_excepcional!: _
	id_gestor_encerramento!:          _
	for c in emprestimoReagenteCampos {"\(c.nome)"!: c.#Valor}

	// INV-M3-DENSIDADE-001/002 (Seção 4, 494; Seção 5, 438): o snapshot integra a
	// conversão só para líquido e nunca existe para sólido.
	if unidade_medida_utilizada == "ml" {densidade_aplicada!: !=null}
	if unidade_medida_utilizada == "g" {densidade_aplicada!: null}

	// INV-M3-ANOMALIA-001 (Seção 4, 498; Seção 10.5, 1402-1414): a pendência
	// quantitativa é um estado próprio (consumo_validado == false), não o status.
	// Com pendência aberta, os valores quantitativos permanecem null.
	if status == "DEVOLVIDO_COM_ANOMALIA" && consumo_validado == false {
		medida_utilizada!:         null
		peso_retorno_efetivo!:     null
		id_resolucao_metrologica!: null
	}

	// INV-M3-ANOMALIA-RESOLVIDA-001 (Seção 10.5, 1458-1474): o contrato tipado de
	// resolução mantém o status histórico e grava os três valores quantitativos.
	if status == "DEVOLVIDO_COM_ANOMALIA" && consumo_validado == true {
		medida_utilizada!:         !=null
		peso_retorno_efetivo!:     !=null
		id_resolucao_metrologica!: !=null
	}

	// INV-M3-EXTRAORDINARIO-001 (Seção 5, 449; Seção 10.5, 871-875): o
	// encerramento extraordinário grava, na mesma transação, tipo, motivo e gestor.
	if status == "ENCERRADO_EXTRAORDINARIO" {
		tipo_encerramento_excepcional!:   !=null
		motivo_encerramento_excepcional!: !=null
		id_gestor_encerramento!:          !=null
	}
}
