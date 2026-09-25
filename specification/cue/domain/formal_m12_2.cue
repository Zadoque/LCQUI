package domain

import (
	"list"
	"strings"
)

// M12.2 — Roteiros de Experimento, compartilhamento, Storage/download e
// associação a Post.
//
// CUE transporta somente shapes locais: referência canônica do objeto no
// Storage, Roteiro publicável/provisório, snapshot do anexo com geração,
// compartilhamento único por (roteiro, professor), contexto de usuário/turma/
// Post, projeção mínima de download, URL já emitida, operação idempotente e
// efeito mínimo de notificação. Autoridade de posse, transições, idempotência
// M7, autorização M9, ACL de UID único, validade temporal da URL já emitida,
// preservação de Posts históricos (Q09) e composição M12.1 pertencem ao Alloy;
// limites determinísticos e a ligação à referência canônica são validados por
// Rust. CUE não prova autorização, concorrência nem transação Firestore/Storage.
//
// Extensão aditiva: #M12_2RoteiroAnexo embute #M12_1RoteiroAnexo (M12.1) e
// acrescenta `geracao`. O contrato M12.1 antigo NÃO prova a geração; a prova da
// geração no anexo e de sua ligação à referência canônica é dada por M12.2
// (#M12_2AnexoVinculado). M12.1 permanece byte a byte inalterado.

#M12_2StatusRoteiro:          "PROVISORIO" | "VALIDADO" | "PUBLICAVEL"
#M12_2StatusTurma:            "Ativo" | "Arquivada"
#M12_2TipoOperacao:           "CADASTRAR_ROTEIRO" | "VALIDAR_OBJETO" | "PUBLICAR_ROTEIRO" | "COMPARTILHAR_ROTEIRO" | "REVOGAR_COMPARTILHAMENTO" | "ANEXAR_ROTEIRO_POST" | "MANTER_ROTEIRO_POST" | "DESVINCULAR_ROTEIRO_POST" | "EMITIR_URL"
#M12_2StatusOperacao:         "CONCLUIDA"
#M12_2Via:                    "PROPRIETARIO" | "COMPARTILHADO" | "ALUNO_POST" | "CHEFE_Q13"
#M12_2ValidadeUrl:            "ATIVA" | "EXPIRADA"
#M12_2StatusCompartilhamento: "VIGENTE" | "REVOGADO"

// 15 MiB em bytes; a regra normativa exige PDF estritamente menor.
#M12_2LimiteBytesRoteiro: 15728640

// Referência canônica ao objeto no Storage. `geracao` é a versão validada e
// imutável do objeto, fixada antes do vínculo; a inspeção do objeto é externa à
// transação do Firestore.
#M12_2ReferenciaCanonica: {
	storage_path:  string & strings.MinRunes(1)
	content_type:  "application/pdf"
	tamanho_bytes: int & >0 & <#M12_2LimiteBytesRoteiro
	owner_uid:     string & strings.MinRunes(1)
	geracao:       string & strings.MinRunes(1) & strings.MaxRunes(120)
	criado_em:     string & strings.MinRunes(1)
}

// Roteiro persistido no Firestore. `owner_uid` coincide com
// `id_professor_upload` (titularidade). O array de UIDs compartilhados é
// server-owned e não tem duplicatas; a unicidade por (roteiro, professor) é
// verificada em Alloy.
#M12_2Roteiro: {
	id:                  string & strings.MinRunes(1)
	id_professor_upload: string & strings.MinRunes(1)
	nome:                string & strings.MinRunes(1) & strings.MaxRunes(150)
	descricao:           string & strings.MinRunes(1)
	referencia:          #M12_2ReferenciaCanonica
	referencia: owner_uid: id_professor_upload
	status: #M12_2StatusRoteiro
	professores_compartilhados: list.UniqueItems & [...(string & strings.MinRunes(1))]
	file_url: null | (string & strings.MinRunes(1))
}

// Snapshot imutável do anexo a Post: refinamento aditivo de M12.1. Todo anexo
// M12.2 é também um anexo M12.1 válido e acrescenta a geração. `#M12_1RoteiroAnexo`
// é fechado; a projeção oculta `_refina_m12_1` reconstrói os campos M12.1 a
// partir do anexo M12.2 e os verifica contra a definição M12.1, provando
// executavelmente a compatibilidade sem reabrir a prova de M12.1.
#M12_2RoteiroAnexo: {
	id_roteiro:    string & strings.MinRunes(1)
	nome_arquivo:  string & strings.MinRunes(1) & strings.MaxRunes(150)
	tamanho_bytes: int & >0
	storage_path:  string & strings.MinRunes(1)
	geracao:       string & strings.MinRunes(1) & strings.MaxRunes(120)
	_refina_m12_1: #M12_1RoteiroAnexo & {
		id_roteiro:    id_roteiro
		nome_arquivo:  nome_arquivo
		tamanho_bytes: tamanho_bytes
		storage_path:  storage_path
	}
}

// Composição explícita: o snapshot do anexo está ligado à referência canônica
// do Roteiro. `geracao`, `storage_path` e `tamanho_bytes` do anexo coincidem
// com a referência; `id_roteiro` identifica o Roteiro. Prova executável em CUE
// de que o anexo M12.2 carrega a geração validada da fonte canônica.
#M12_2AnexoVinculado: {
	id_roteiro: string & strings.MinRunes(1)
	referencia: #M12_2ReferenciaCanonica
	anexo:      #M12_2RoteiroAnexo
	anexo: {
		id_roteiro:    id_roteiro
		tamanho_bytes: referencia.tamanho_bytes
		storage_path:  referencia.storage_path
		geracao:       referencia.geracao
	}
}

// Relação única por (id_roteiro, id_professor); revogação preserva os Posts
// históricos (Q09). O array Firestore é a projeção server-owned desta relação.
#M12_2Compartilhamento: {
	id_roteiro:   string & strings.MinRunes(1)
	id_professor: string & strings.MinRunes(1)
	id_operacao:  string & strings.MinRunes(1)
	concedido_em: string & strings.MinRunes(1)
	revogado_em:  null | (string & strings.MinRunes(1))
	status:       #M12_2StatusCompartilhamento
	if status == "REVOGADO" {
		revogado_em: string & strings.MinRunes(1)
	}
	if status == "VIGENTE" {
		revogado_em: null
	}
}

// Escopo Q13: intervenção administrativa de moderação/auditoria do Chefe sobre
// um Post que referencia o roteiro (registrada em Registro_de_Auditoria). É a
// condição de autorização para o Chefe emitir URL nova; sem registro ativo, o
// Chefe não emite (a URL já emitida permanece utilizável até expirar).
#M12_2EscopoAuditoriaQ13: {
	id_roteiro:    string & strings.MinRunes(1)
	id_chefe:      string & strings.MinRunes(1)
	id_post:       string & strings.MinRunes(1)
	registrado_em: string & strings.MinRunes(1)
	motivo:        string & strings.MinRunes(1) & strings.MaxRunes(2000)
}

// Contexto abstrato de autorização (M9): autoridade persistida mais claim. A
// claim atualizada não recria participação (ex-aluno).
#M12_2UsuarioContexto: {
	uid:               string & strings.MinRunes(1)
	ativo:             bool
	papel:             "PROFESSOR" | "ALUNO" | "CHEFE" | "EX_ALUNO"
	versao_permissoes: int & >=0
	claim_versao:      int & >=0
	claim_atualizada:  bool
}

// Vínculo canônico atual (M11); o espelho/cache nunca é autoridade.
#M12_2VinculoTurma: {
	id_aluno: string & strings.MinRunes(1)
	id_turma: string & strings.MinRunes(1)
}

// Contexto de Post com anexo opcional (fronteira M12.1). O snapshot não é
// autorização; a leitura revalida o acesso atual.
#M12_2PostContexto: {
	id_post:                  string & strings.MinRunes(1)
	id_turma:                 string & strings.MinRunes(1)
	id_professor:             string & strings.MinRunes(1)
	status_turma:             #M12_2StatusTurma
	removido_da_apresentacao: bool
	roteiro_anexo:            null | #M12_2RoteiroAnexo
}

// Projeção mínima de download: URL curta, identidade do objeto e geração.
#M12_2DownloadProjecao: {
	id_roteiro:   string & strings.MinRunes(1)
	storage_path: string & strings.MinRunes(1)
	geracao:      string & strings.MinRunes(1) & strings.MaxRunes(120)
	url:          string & strings.MinRunes(1)
	emitida_em:   string & strings.MinRunes(1)
	expira_em:    string & strings.MinRunes(1)
	via:          #M12_2Via
	validade:     #M12_2ValidadeUrl
}

// URL já emitida: fronteira temporal abstrata. A revogação/perda de acesso
// impede novas emissões, mas não invalida retroativamente o token entregue.
#M12_2UrlEmitida: {
	id_roteiro: string & strings.MinRunes(1)
	uid:        string & strings.MinRunes(1)
	geracao:    string & strings.MinRunes(1) & strings.MaxRunes(120)
	emitida_em: string & strings.MinRunes(1)
	expira_em:  string & strings.MinRunes(1)
	validade:   #M12_2ValidadeUrl
}

// Solicitação de download: distingue endpoint (nova emissão, revalida acesso) de
// uso de URL já emitida (não revalida acesso, sujeita ao prazo).
#M12_2SolicitacaoDownload: {
	id_roteiro:     string & strings.MinRunes(1)
	uid:            string & strings.MinRunes(1)
	via:            #M12_2Via
	url_ja_emitida: bool
}

// Operação idempotente M7 (mesma identidade de M12.1).
#M12_2Operacao: {
	id_operacao:   string & strings.MinRunes(1)
	uid:           string & strings.MinRunes(1)
	tipo_operacao: #M12_2TipoOperacao
	id_alvo:       string & strings.MinRunes(1)
	status:        #M12_2StatusOperacao
	payload_hash:  string & strings.MinRunes(1)
}

// Efeito mínimo delimitado: o ciclo completo e a caixa ficam em M13.
#M12_2NotificacaoCompartilhamento: {
	destinatario:              string & strings.MinRunes(1)
	id_roteiro:                string & strings.MinRunes(1)
	autor:                     string & strings.MinRunes(1)
	tipo:                      "ROTEIRO_COMPARTILHADO"
	contem_conteudo_protegido: false
	id_operacao:               string & strings.MinRunes(1)
}

// Uma fixture M12.2 é exatamente um dos shapes estruturais acima.
#M12_2Contrato: #M12_2ReferenciaCanonica | #M12_2Roteiro | #M12_2RoteiroAnexo | #M12_2AnexoVinculado | #M12_2Compartilhamento | #M12_2EscopoAuditoriaQ13 | #M12_2UsuarioContexto | #M12_2VinculoTurma | #M12_2PostContexto | #M12_2DownloadProjecao | #M12_2UrlEmitida | #M12_2SolicitacaoDownload | #M12_2Operacao | #M12_2NotificacaoCompartilhamento

#CamposM12_2: [
	#CampoFrasco & {nome: "id_roteiro", sql: "TEXT", observacao: "Identidade do Roteiro; dono imutável e referência canônica."},
	#CampoFrasco & {nome: "id_professor_upload", sql: "TEXT", observacao: "Dono imutável; coincide com owner_uid do objeto."},
	#CampoFrasco & {nome: "nome", sql: "TEXT", observacao: "Nome de apresentação do Roteiro; de 1 a 150 caracteres."},
	#CampoFrasco & {nome: "storage_path", sql: "TEXT", observacao: "Referência canônica ao objeto no Storage; nunca credencial."},
	#CampoFrasco & {nome: "content_type", sql: "TEXT", observacao: "Formato validado; PDF (application/pdf) na V1."},
	#CampoFrasco & {nome: "tamanho_bytes", sql: "INTEGER", positivo: true, observacao: "Tamanho validado; PDF estritamente menor que 15 MiB (15728640 bytes)."},
	#CampoFrasco & {nome: "owner_uid", sql: "TEXT", observacao: "Titular do objeto; coincide com id_professor_upload."},
	#CampoFrasco & {nome: "geracao", sql: "TEXT", observacao: "Geração/versão validada e imutável do objeto; persistida no Firestore."},
	#CampoFrasco & {nome: "status_roteiro", sql: "ENUM", valores: ["PROVISORIO", "VALIDADO", "PUBLICAVEL"], observacao: "Upload provisório não é publicável; publicável após objeto validado e geração fixada."},
	#CampoFrasco & {nome: "nome_arquivo", sql: "TEXT", observacao: "Nome do arquivo no snapshot imutável do anexo; até 150 caracteres."},
	#CampoFrasco & {nome: "id_operacao", sql: "TEXT", observacao: "Identidade de comando M7 (uid, tipo_operacao, payload_hash)."},
	#CampoFrasco & {nome: "tipo_operacao", sql: "ENUM", valores: ["CADASTRAR_ROTEIRO", "VALIDAR_OBJETO", "PUBLICAR_ROTEIRO", "COMPARTILHAR_ROTEIRO", "REVOGAR_COMPARTILHAMENTO", "ANEXAR_ROTEIRO_POST", "MANTER_ROTEIRO_POST", "DESVINCULAR_ROTEIRO_POST", "EMITIR_URL"], observacao: "Operação idempotente M7 sobre roteiro, compartilhamento ou anexo a Post."},
	#CampoFrasco & {nome: "via", sql: "ENUM", valores: ["PROPRIETARIO", "COMPARTILHADO", "ALUNO_POST", "CHEFE_Q13"], observacao: "Caminho de autorização do download; Chefe por Q13 apenas em moderação/auditoria."},
	#CampoFrasco & {nome: "validade_url", sql: "ENUM", valores: ["ATIVA", "EXPIRADA"], observacao: "Validade temporal abstrata da URL já emitida; não há revogação retroativa."},
	#CampoFrasco & {nome: "revogado_em", sql: "TIMESTAMP", nulo: true, observacao: "Instante da revogação do compartilhamento; nulo enquanto vigente."},
	#CampoFrasco & {nome: "removido_da_apresentacao", sql: "BOOLEAN", observacao: "Post removido da apresentação; snapshot e histórico preservados (Q09/RF25)."},
]
