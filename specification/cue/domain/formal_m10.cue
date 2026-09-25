package domain

import "strings"

// M10 — Patrimônio.
//
// CUE transporta somente shapes locais: campos, enums, obrigatoriedade,
// nulabilidade e limites de comprimento das entidades patrimoniais. Identidade
// Resumo x Bem, máquina de estados, locks, unicidade permanente, versionamento,
// terminalidade, fan-out e composição M7/M9 pertencem ao Alloy; a
// canonicalização determinística da plaqueta e a proveniência pertencem ao Rust.
// CUE não prova concorrência temporal.

#M10Status:           "Ativo" | "Inservivel" | "Ja_dado_baixa"
#M10Conservacao:      "BOM" | "REGULAR" | "RUIM"
#M10StatusRequisicao: "pendente" | "aprovada" | "rejeitada"
#M10TipoLock:         "EDICAO" | "ADICAO"
#M10TipoHistorico:    "cadastro" | "edicao" | "baixa"

#M10ResumoBemPatrimonial: {
	id:        string & strings.MinRunes(1)
	nome:      string & strings.MinRunes(1) & strings.MaxRunes(150)
	descricao: string & strings.MinRunes(1)
}

#M10BemPatrimonial: {
	id:                           string & strings.MinRunes(1)
	id_resumo_bem_patrimonial:    string & strings.MinRunes(1)
	numero_patrimonio:            string & strings.MinRunes(1) & strings.MaxRunes(30)
	estado_conservacao:           #M10Conservacao
	id_local:                     string & strings.MinRunes(1)
	photo_url:                    string & strings.MinRunes(1)
	nome_responsavel_sei:         string & strings.MinRunes(1) & strings.MaxRunes(150)
	status:                       #M10Status
	descricao_complementar:       null | (string & strings.MaxRunes(200))
	versao:                       int & >=1
	documento_dado_baixa_pdf_url: null | (string & strings.MinRunes(1))
	// O comprovante é nulo antes da baixa e obrigatório no estado terminal.
	if status == "Ja_dado_baixa" {
		documento_dado_baixa_pdf_url: string & strings.MinRunes(1)
	}
	if status != "Ja_dado_baixa" {
		documento_dado_baixa_pdf_url: null
	}
}

#M10RequisicaoAdicao: {
	id:                             string & strings.MinRunes(1)
	numero_patrimonio_proposto:     string & strings.MinRunes(1) & strings.MaxRunes(30)
	numero_patrimonio_normalizado:  string & strings.MinRunes(1) & strings.MaxRunes(30)
	status:                         #M10StatusRequisicao
	feita_em:                       string & strings.MinRunes(1)
	id_bem_patrimonial_se_aprovado: null | (string & strings.MinRunes(1))
	respondida_em:                  null | (string & strings.MinRunes(1))
	id_usuario_solicitante:         string & strings.MinRunes(1)
	id_usuario_respondente:         null | (string & strings.MinRunes(1))
	estado_conservacao_proposto:    #M10Conservacao
	photo_url_proposta:             string & strings.MinRunes(1)
	nome_responsavel_proposto:      string & strings.MinRunes(1) & strings.MaxRunes(150)
	id_local:                       string & strings.MinRunes(1)
	id_resumo_bem_patrimonial:      null | (string & strings.MinRunes(1))
	nome_resumo_proposto:           null | (string & strings.MinRunes(1))
	descricao_resumo_proposta:      null | (string & strings.MinRunes(1))
	motivo:                         string & strings.MinRunes(1)
	justificativa_resposta:         null | (string & strings.MinRunes(1))
}

#M10RequisicaoEdicao: {
	id:                             string & strings.MinRunes(1)
	id_bem_patrimonial:             string & strings.MinRunes(1)
	status:                         #M10StatusRequisicao
	feita_em:                       string & strings.MinRunes(1)
	respondida_em:                  null | (string & strings.MinRunes(1))
	id_usuario_solicitante:         string & strings.MinRunes(1)
	id_usuario_respondente:         null | (string & strings.MinRunes(1))
	novo_nome:                      null | (string & strings.MinRunes(1) & strings.MaxRunes(150))
	novo_status:                    null | ("Ativo" | "Inservivel")
	novo_estado_conservacao:        null | #M10Conservacao
	novo_id_local:                  null | (string & strings.MinRunes(1))
	nova_photo_url:                 null | (string & strings.MinRunes(1))
	motivo:                         string & strings.MinRunes(1)
	justificativa_resposta:         null | (string & strings.MinRunes(1))
	versao_bem_origem:              int & >=1
	novo_id_resumo_bem_patrimonial: null | (string & strings.MinRunes(1))
}

#M10Lock: {
	id:            string & strings.MinRunes(1)
	id_requisicao: string & strings.MinRunes(1)
	tipo:          #M10TipoLock
	chave_recurso: string & strings.MinRunes(1)
	criado_em:     string & strings.MinRunes(1)
}

// Baixa é operação própria: parte de Inservivel, exige rito/justificativa e
// comprovante PDF validado, e termina no estado terminal.
#M10Baixa: {
	id_bem_patrimonial:           string & strings.MinRunes(1)
	id_usuario_gestor:            string & strings.MinRunes(1)
	status_origem:                "Inservivel"
	status_destino:               "Ja_dado_baixa"
	justificativa:                string & strings.MinRunes(1)
	documento_dado_baixa_pdf_url: string & strings.MinRunes(1)
	versao_anterior:              int & >=1
}

#M10EventoHistorico: {
	id:                 string & strings.MinRunes(1)
	id_bem_patrimonial: string & strings.MinRunes(1)
	timestamp:          string & strings.MinRunes(1)
	tipo:               #M10TipoHistorico
	id_usuario:         string & strings.MinRunes(1)
}

#M10Alteracao: {
	campo:          string & strings.MinRunes(1) & strings.MaxRunes(60)
	valor_anterior: string
	valor_novo:     string
}

// Uma fixture M10 é exatamente um dos shapes estruturais acima.
#M10Contrato: #M10ResumoBemPatrimonial | #M10BemPatrimonial | #M10RequisicaoAdicao | #M10RequisicaoEdicao | #M10Lock | #M10Baixa | #M10EventoHistorico | #M10Alteracao

#CamposM10: [
	#CampoFrasco & {nome: "id_resumo_bem_patrimonial", sql: "TEXT", observacao: "FK do modelo catalográfico compartilhado."},
	#CampoFrasco & {nome: "numero_patrimonio", sql: "TEXT", observacao: "Plaqueta canônica trim().toUpperCase(), não vazia, no máximo 30 caracteres."},
	#CampoFrasco & {nome: "estado_conservacao", sql: "ENUM", valores: ["BOM", "REGULAR", "RUIM"]},
	#CampoFrasco & {nome: "id_local", sql: "TEXT", observacao: "Autoridade de localização; predio/andar/sala são projeções derivadas."},
	#CampoFrasco & {nome: "photo_url", sql: "TEXT", observacao: "Foto obrigatória da unidade física; validação binária pertence ao backend."},
	#CampoFrasco & {nome: "documento_dado_baixa_pdf_url", sql: "TEXT", nulo: true, observacao: "Nulo antes da baixa; vinculado e imutável no estado terminal."},
	#CampoFrasco & {nome: "nome_responsavel_sei", sql: "TEXT", observacao: "Responsável institucional; no máximo 150 caracteres."},
	#CampoFrasco & {nome: "status", sql: "ENUM", valores: ["Ativo", "Inservivel", "Ja_dado_baixa"]},
	#CampoFrasco & {nome: "descricao_complementar", sql: "TEXT", nulo: true, observacao: "Observação da unidade física; no máximo 200 caracteres."},
	#CampoFrasco & {nome: "versao", sql: "INTEGER", positivo: true, observacao: "Inicia em 1; incrementa somente em fato canônico, nunca em fan-out derivado."},
	#CampoFrasco & {nome: "numero_patrimonio_proposto", sql: "TEXT", observacao: "Plaqueta bruta informada na requisição de adição."},
	#CampoFrasco & {nome: "numero_patrimonio_normalizado", sql: "TEXT", observacao: "N(proposto) = trim().toUpperCase(); única chave de lock e Chaves_Unicas."},
	#CampoFrasco & {nome: "versao_bem_origem", sql: "INTEGER", positivo: true, observacao: "Versão observada para controle otimista de edição."},
	#CampoFrasco & {nome: "id_requisicao", sql: "TEXT", observacao: "Requisição proprietária do lock; precisa coincidir antes da liberação."},
	#CampoFrasco & {nome: "tipo_lock", sql: "ENUM", valores: ["EDICAO", "ADICAO"]},
	#CampoFrasco & {nome: "chave_recurso", sql: "TEXT", observacao: "ID do bem (edição) ou plaqueta normalizada (adição)."},
	#CampoFrasco & {nome: "tipo_historico", sql: "ENUM", valores: ["cadastro", "edicao", "baixa"]},
]
