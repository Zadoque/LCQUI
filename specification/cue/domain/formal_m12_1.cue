package domain

import "strings"

// M12.1 — Posts, comentários, edição/moderação e históricos.
//
// CUE transporta shapes locais: campos, enums fechados, obrigatoriedade,
// nulabilidade, condicionais e limites de Post, Comentário, seus históricos de
// edição/moderação, a projeção de leitura com máscara e o efeito mínimo de
// notificação. Autoridade de participação, transições, idempotência,
// concorrência, composição M7/M9/M11 e a fronteira abstrata de acesso ao
// roteiro pertencem ao Alloy; a canonicalização determinística pertence ao
// Rust. CUE não prova concorrência temporal.

#M12_1StatusTurma:     "Ativo" | "Arquivada"
#M12_1TipoHistorico:   "edicao" | "moderacao"
#M12_1Visao:           "AUTOR" | "COLEGA" | "AUDITOR"
#M12_1TipoNotificacao: "POST" | "COMENTARIO"
#M12_1TipoOperacao:    "CRIAR_POST" | "EDITAR_POST" | "REMOVER_POST" | "CRIAR_COMENTARIO" | "EDITAR_COMENTARIO" | "MODERAR_COMENTARIO"
#M12_1StatusOperacao:  "CONCLUIDA"

#M12_1TurmaContexto: {
	id:           string & strings.MinRunes(1)
	id_professor: string & strings.MinRunes(1)
	status:       #M12_1StatusTurma
}

// Vínculo canônico atual (M11); o espelho nunca é autoridade.
#M12_1Vinculo: {
	id_aluno: string & strings.MinRunes(1)
	id_turma: string & strings.MinRunes(1)
}

// Snapshot imutável do roteiro anexo (fronteira M12.2). A validação de acesso
// é predicado abstrato no Alloy; ACL/upload/URL não pertencem a M12.1.
#M12_1RoteiroAnexo: {
	id_roteiro:    string & strings.MinRunes(1)
	nome_arquivo:  string & strings.MinRunes(1) & strings.MaxRunes(150)
	tamanho_bytes: int & >0
	storage_path:  string & strings.MinRunes(1)
}

#M12_1Post: {
	id:                       string & strings.MinRunes(1)
	id_turma:                 string & strings.MinRunes(1)
	id_professor:             string & strings.MinRunes(1)
	titulo:                   string & strings.MinRunes(1) & strings.MaxRunes(150)
	descricao:                string & strings.MinRunes(1) & strings.MaxRunes(10000)
	criado_em:                string & strings.MinRunes(1)
	editado:                  bool
	editado_em:               null | (string & strings.MinRunes(1))
	removido_da_apresentacao: bool
	motivo_remocao:           null | (string & strings.MinRunes(1))
	removido_por:             null | (string & strings.MinRunes(1))
	removido_em:              null | (string & strings.MinRunes(1))
	roteiro_anexo:            null | #M12_1RoteiroAnexo
	if editado {
		editado_em: string & strings.MinRunes(1)
	}
	if !editado {
		editado_em: null
	}
	if removido_da_apresentacao {
		motivo_remocao: string & strings.MinRunes(1)
		removido_por:   string & strings.MinRunes(1)
		removido_em:    string & strings.MinRunes(1)
	}
	if !removido_da_apresentacao {
		motivo_remocao: null
		removido_por:   null
		removido_em:    null
	}
}

#M12_1Comentario: {
	id:               string & strings.MinRunes(1)
	id_post:          string & strings.MinRunes(1)
	id_usuario:       string & strings.MinRunes(1)
	texto:            string & strings.MinRunes(1) & strings.MaxRunes(2000)
	criado_em:        string & strings.MinRunes(1)
	editado:          bool
	editado_em:       null | (string & strings.MinRunes(1))
	moderado:         bool
	motivo_moderacao: null | (string & strings.MinRunes(1))
	moderado_por:     null | (string & strings.MinRunes(1))
	moderado_em:      null | (string & strings.MinRunes(1))
	if editado {
		editado_em: string & strings.MinRunes(1)
	}
	if !editado {
		editado_em: null
	}
	if moderado {
		motivo_moderacao: string & strings.MinRunes(1)
		moderado_por:     string & strings.MinRunes(1)
		moderado_em:      string & strings.MinRunes(1)
	}
	if !moderado {
		motivo_moderacao: null
		moderado_por:     null
		moderado_em:      null
	}
}

#M12_1HistoricoPost: {
	id:                string & strings.MinRunes(1)
	id_post:           string & strings.MinRunes(1)
	tipo:              #M12_1TipoHistorico
	editado_por:       string & strings.MinRunes(1)
	motivo:            null | (string & strings.MinRunes(1))
	novo_titulo:       null | (string & strings.MinRunes(1) & strings.MaxRunes(150))
	novo_id_roteiro:   null | (string & strings.MinRunes(1))
	nova_descricao:    null | (string & strings.MinRunes(1))
	antigo_titulo:     null | (string & strings.MinRunes(1) & strings.MaxRunes(150))
	antigo_id_roteiro: null | (string & strings.MinRunes(1))
	antiga_descricao:  null | (string & strings.MinRunes(1))
	timestamp:         string & strings.MinRunes(1)
	if tipo == "moderacao" {
		motivo: string & strings.MinRunes(1)
	}
	if tipo == "edicao" {
		motivo: null
	}
}

#M12_1HistoricoComentario: {
	id:            string & strings.MinRunes(1)
	id_comentario: string & strings.MinRunes(1)
	tipo:          #M12_1TipoHistorico
	novo_texto:    null | (string & strings.MinRunes(1))
	texto_antigo:  null | (string & strings.MinRunes(1))
	motivo:        null | (string & strings.MinRunes(1))
	editado_em:    string & strings.MinRunes(1)
	editado_por:   string & strings.MinRunes(1)
	if tipo == "edicao" {
		novo_texto:   string & strings.MinRunes(1)
		texto_antigo: string & strings.MinRunes(1)
		motivo:       null
	}
	if tipo == "moderacao" {
		motivo:       string & strings.MinRunes(1)
		novo_texto:   null
		texto_antigo: null
	}
}

// Projeção de leitura: COLEGA nunca recebe o original de comentário moderado.
#M12_1ComentarioLeitura: {
	id_comentario:       string & strings.MinRunes(1)
	visao:               #M12_1Visao
	moderado:            bool
	exibe_original:      bool
	texto:               null | (string & strings.MinRunes(1))
	aviso_institucional: null | (string & strings.MinRunes(1))
	if visao == "COLEGA" {
		if moderado {
			exibe_original:      false
			texto:               null
			aviso_institucional: string & strings.MinRunes(1)
		}
		if !moderado {
			texto:               string & strings.MinRunes(1)
			aviso_institucional: null
		}
	}
	if visao == "AUTOR" {
		texto: string & strings.MinRunes(1)
	}
	if visao == "AUDITOR" {
		exibe_original:      true
		texto:               string & strings.MinRunes(1)
		aviso_institucional: null
	}
}

#M12_1NotificacaoEfeito: {
	id_turma:                  string & strings.MinRunes(1)
	id_alvo:                   string & strings.MinRunes(1)
	destinatario:              string & strings.MinRunes(1)
	tipo:                      #M12_1TipoNotificacao
	contem_conteudo_protegido: false
	payload_hash:              string & strings.MinRunes(1)
}

#M12_1Operacao: {
	id_operacao:   string & strings.MinRunes(1)
	uid:           string & strings.MinRunes(1)
	tipo_operacao: #M12_1TipoOperacao
	id_turma:      string & strings.MinRunes(1)
	id_alvo:       string & strings.MinRunes(1)
	status:        #M12_1StatusOperacao
}

// Uma fixture M12.1 é exatamente um dos shapes estruturais acima.
#M12_1Contrato: #M12_1TurmaContexto | #M12_1Vinculo | #M12_1RoteiroAnexo | #M12_1Post | #M12_1Comentario | #M12_1HistoricoPost | #M12_1HistoricoComentario | #M12_1ComentarioLeitura | #M12_1NotificacaoEfeito | #M12_1Operacao

#CamposM12_1: [
	#CampoFrasco & {nome: "id_turma", sql: "TEXT", observacao: "Turma do Post/Comentário; vínculo canônico atual decide participação (M11)."},
	#CampoFrasco & {nome: "id_professor", sql: "TEXT", observacao: "Autor imutável do Post."},
	#CampoFrasco & {nome: "id_post", sql: "TEXT", observacao: "Post pai do Comentário/histórico."},
	#CampoFrasco & {nome: "id_usuario", sql: "TEXT", observacao: "Autor imutável do Comentário."},
	#CampoFrasco & {nome: "titulo", sql: "TEXT", observacao: "Título do Post; de 1 a 150 caracteres."},
	#CampoFrasco & {nome: "descricao", sql: "TEXT", observacao: "Descrição do Post; de 1 a 10000 caracteres (Q10)."},
	#CampoFrasco & {nome: "texto", sql: "TEXT", observacao: "Texto do Comentário; de 1 a 2000 caracteres (Q10), escapado na renderização."},
	#CampoFrasco & {nome: "editado", sql: "BOOLEAN", observacao: "Marcado na edição; a versão anterior fica no histórico."},
	#CampoFrasco & {nome: "editado_em", sql: "TIMESTAMP", nulo: true, observacao: "Instante do servidor da última edição; nulo quando não editado."},
	#CampoFrasco & {nome: "removido_da_apresentacao", sql: "BOOLEAN", observacao: "Remoção lógica de Post (RF25); não apaga documento nem histórico."},
	#CampoFrasco & {nome: "motivo_remocao", sql: "TEXT", nulo: true, observacao: "Obrigatório quando removido_da_apresentacao; até 2000 caracteres."},
	#CampoFrasco & {nome: "moderado", sql: "BOOLEAN", observacao: "Comentário moderado; a moderação não apaga o texto original."},
	#CampoFrasco & {nome: "motivo_moderacao", sql: "TEXT", nulo: true, observacao: "Obrigatório quando moderado; até 2000 caracteres."},
	#CampoFrasco & {nome: "tipo_historico", sql: "ENUM", valores: ["edicao", "moderacao"]},
	#CampoFrasco & {nome: "visao", sql: "ENUM", valores: ["AUTOR", "COLEGA", "AUDITOR"]},
	#CampoFrasco & {nome: "contem_conteudo_protegido", sql: "BOOLEAN", observacao: "Efeito de notificação nunca transporta conteúdo protegido."},
	#CampoFrasco & {nome: "id_operacao", sql: "TEXT", observacao: "Identidade de comando M7 (uid, tipo_operacao, payload_hash)."},
	#CampoFrasco & {nome: "storage_path", sql: "TEXT", observacao: "Localizador do snapshot do roteiro; download mediado por endpoint (fronteira M12.2)."},
]
