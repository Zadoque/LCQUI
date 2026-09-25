package domain

import "strings"

// M11 — Turma, matrícula e convite.
//
// CUE transporta somente shapes locais: campos, enums, obrigatoriedade,
// nulabilidade e limites das entidades de turma, vínculo canônico, espelho de
// consulta, evento de inclusão/exclusão, convite e sua chave de pendência.
// Unicidade concorrente, transições, contador, exceção de capacidade,
// idempotência, preservação de histórico e composição M7/M9 pertencem ao
// Alloy; a canonicalização determinística da pendência (HMAC) e a proveniência
// pertencem ao Rust. CUE não prova concorrência temporal.

#M11StatusTurma:     "Ativo" | "Arquivada"
#M11ModoIngresso:    "CODIGO" | "CONVITE"
#M11TipoEvento:      "inclusao_aluno" | "exclusao_aluno"
#M11StatusConvite:   "pendente" | "aceitado" | "expirado"
#M11ContextoConvite: "TURMA" | "GLOBAL"

#M11Turma: {
	id:           string & strings.MinRunes(1)
	id_professor: string & strings.MinRunes(1)
	id_materia:   string & strings.MinRunes(1)
	nome_turma:   string & strings.MinRunes(1) & strings.MaxRunes(100)
	ano:          int & >=1
	semestre:     1 | 2
	capacidade:   int & >=1
	codigo_turma: string & strings.MinRunes(1) & strings.MaxRunes(20)
	status:       #M11StatusTurma
	data_criacao: string & strings.MinRunes(1)
	versao:       int & >=1
	qtd_alunos:   int & >=0
}

#M11VinculoCanonico: {
	id_aluno:     string & strings.MinRunes(1)
	id_turma:     string & strings.MinRunes(1)
	ingressou_em: string & strings.MinRunes(1)
}

// Espelho de consulta do aluno: somente projeção de apresentação, sem
// matrícula nem e-mail. Nunca é autoridade de acesso.
#M11EspelhoAlunoTurma: {
	id_turma:     string & strings.MinRunes(1)
	id_professor: string & strings.MinRunes(1)
	id_materia:   string & strings.MinRunes(1)
	nome_turma:   string & strings.MinRunes(1) & strings.MaxRunes(100)
	nome_materia: string & strings.MinRunes(1)
	ano:          int & >=1
	semestre:     1 | 2
	status:       #M11StatusTurma
	ingressou_em: string & strings.MinRunes(1)
}

#M11EventoHistorico: {
	id:            string & strings.MinRunes(1)
	id_turma:      string & strings.MinRunes(1)
	id_aluno:      string & strings.MinRunes(1)
	tipo:          #M11TipoEvento
	modo_ingresso: null | #M11ModoIngresso
	justificativa: null | (string & strings.MinRunes(1))
	timestamp:     string & strings.MinRunes(1)
	removido_por:  null | (string & strings.MinRunes(1))
	if tipo == "inclusao_aluno" {
		modo_ingresso: #M11ModoIngresso
		removido_por:  null
	}
	if tipo == "exclusao_aluno" {
		modo_ingresso: null
		removido_por:  string & strings.MinRunes(1)
	}
}

#M11Convite: {
	id:                    string & strings.MinRunes(1)
	id_turma:              null | (string & strings.MinRunes(1))
	email:                 string & strings.MinRunes(1) & strings.MaxRunes(150)
	convidado_em:          string & strings.MinRunes(1)
	status:                #M11StatusConvite
	expira_em:             string & strings.MinRunes(1)
	convidado_por:         string & strings.MinRunes(1)
	numero_matricula:      null | (string & strings.MinRunes(1) & strings.MaxRunes(20))
	token_hash:            string & strings.MinRunes(1)
	ultimo_reenvio_por:    null | (string & strings.MinRunes(1))
	exceder_capacidade:    bool
	justificativa_excecao: null | (string & strings.MinRunes(1))
	aceitado_por:          null | (string & strings.MinRunes(1))
	aceitado_em:           null | (string & strings.MinRunes(1))
	// Justificativa obrigatória exatamente quando a exceção é declarada.
	if exceder_capacidade {
		justificativa_excecao: string & strings.MinRunes(1)
	}
	if !exceder_capacidade {
		justificativa_excecao: null
	}

	// Estado aceito exige autoria e instante; estados não aceitos não os têm.
	if status == "aceitado" {
		aceitado_por: string & strings.MinRunes(1)
		aceitado_em:  string & strings.MinRunes(1)
	}
	if status != "aceitado" {
		aceitado_por: null
		aceitado_em:  null
	}
}

// Chave determinística de pendência (HMAC no servidor). O e-mail normalizado
// entra no contexto do HMAC, mas nunca em claro na chave; GLOBAL usa id_turma
// nulo. Distinta do ID imutável do convite: libera a pendência ao aceitar ou
// expirar, sem apagar o convite histórico.
#M11PendenciaConvite: {
	chave_hmac: string & strings.MinRunes(1)
	email:      string & strings.MinRunes(1) & strings.MaxRunes(150)
	id_turma:   null | (string & strings.MinRunes(1))
	contexto:   #M11ContextoConvite
	if id_turma == null {
		contexto: "GLOBAL"
	}
	if id_turma != null {
		contexto: "TURMA"
	}
}

// Resultado idempotente de aceitação (M7). `criou_matricula` distingue convite
// de turma (cria vínculo) de convite global (não cria matrícula).
#M11Aceitacao: {
	id_operacao:      string & strings.MinRunes(1)
	id_convite:       string & strings.MinRunes(1)
	uid:              string & strings.MinRunes(1)
	email_verificado: true
	criou_matricula:  bool
}

// Uma fixture M11 é exatamente um dos shapes estruturais acima.
#M11Contrato: #M11Turma | #M11VinculoCanonico | #M11EspelhoAlunoTurma | #M11EventoHistorico | #M11Convite | #M11PendenciaConvite | #M11Aceitacao

#CamposM11: [
	#CampoFrasco & {nome: "id_professor", sql: "TEXT", observacao: "Professor dono da turma; verificado no servidor."},
	#CampoFrasco & {nome: "id_materia", sql: "TEXT", observacao: "Matéria existente referenciada; não é recriada."},
	#CampoFrasco & {nome: "nome_turma", sql: "TEXT", observacao: "Nome de apresentação; no máximo 100 caracteres."},
	#CampoFrasco & {nome: "ano", sql: "INTEGER", positivo: true, observacao: "Ano letivo inteiro."},
	#CampoFrasco & {nome: "semestre", sql: "INTEGER", observacao: "Exclusivamente 1 ou 2."},
	#CampoFrasco & {nome: "capacidade", sql: "INTEGER", positivo: true, observacao: "Máximo ordinário; só edição abaixo da ocupação é proibida (HQ-M11-001 = A)."},
	#CampoFrasco & {nome: "codigo_turma", sql: "TEXT", observacao: "Código único gerado no servidor, até 20 caracteres; reservado em Chaves_Unicas e não liberado ao arquivar."},
	#CampoFrasco & {nome: "status_turma", sql: "ENUM", valores: ["Ativo", "Arquivada"]},
	#CampoFrasco & {nome: "versao", sql: "INTEGER", positivo: true, observacao: "Detecta edição concorrente de metadados; inclusão/remoção de membro não incrementa."},
	#CampoFrasco & {nome: "qtd_alunos", sql: "INTEGER", nao_negativo: true, observacao: "Contador transacional do vínculo ativo; pode exceder capacidade por exceção nominal válida."},
	#CampoFrasco & {nome: "id_aluno", sql: "TEXT", observacao: "UID do aluno no vínculo canônico."},
	#CampoFrasco & {nome: "id_turma", sql: "TEXT", nulo: true, observacao: "Turma do vínculo/convite; nulo identifica convite global."},
	#CampoFrasco & {nome: "email", sql: "TEXT", observacao: "E-mail normalizado do convite; no máximo 150 caracteres."},
	#CampoFrasco & {nome: "token_hash", sql: "TEXT", observacao: "SHA-256 do token aleatório de 32 bytes; nunca em claro."},
	#CampoFrasco & {nome: "status_convite", sql: "ENUM", valores: ["pendente", "aceitado", "expirado"]},
	#CampoFrasco & {nome: "exceder_capacidade", sql: "BOOLEAN", observacao: "Exceção nominal do professor dono; justificativa obrigatória."},
	#CampoFrasco & {nome: "modo_ingresso", sql: "ENUM", nulo: true, valores: ["CODIGO", "CONVITE"]},
	#CampoFrasco & {nome: "tipo_evento", sql: "ENUM", valores: ["inclusao_aluno", "exclusao_aluno"]},
	#CampoFrasco & {nome: "aceitado_por", sql: "TEXT", nulo: true, observacao: "UID do aluno que aceitou; preservado no histórico."},
]
