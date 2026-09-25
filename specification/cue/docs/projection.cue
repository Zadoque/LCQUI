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
		{
			arquivo:  "formal_m8_contrato"
			entidade: "M8_Estoque_Escassez_Notificacao"
			etapa:    "formalização executável M8"
			escopo:   "Contratos estruturais de estoque atual, cache, escassez e notificação. Aptidão, escassez, invalidação/publicação do cache e idempotência de alerta são verificadas em Alloy; limites numéricos e chaves por Rust. CUE não prova tempo real."
			campos:   domain.#CamposM8
			exemplo: {id_almoxarifado: 1, id_resumo_reagente: 10, id_especificacao_reagente: 20, qtd_limiar_escassez: 5, ativo: true, notificacao_ativa: true}
		},
		{
			arquivo:  "formal_m9_autorizacao"
			entidade: "M9_Autorizacao_Usuarios"
			etapa:    "formalização executável M9"
			escopo:   "Shapes estruturais de usuário, papel, versão de permissões, claim, vínculo, ownership e decisão. A autoridade é persistida; relações, revogação, fail closed, TOCTOU abstrato e separação de domínio são verificados em Alloy."
			campos:   domain.#CamposM9
			exemplo: {uid: "uid-gestor-a", ativo: true, versao_permissoes: 4, papeis_persistidos: ["Gestor_Almoxarifado"], claim_papeis: ["Gestor_Almoxarifado"], claim_versao: 4, claims_pendentes: false}
		},
		{
			arquivo:  "formal_m10_patrimonio"
			entidade: "M10_Patrimonio"
			etapa:    "formalização executável M10"
			escopo:   "Shapes estruturais de bem, resumo catalográfico, requisições de adição/edição, lock, baixa, evento histórico e alteração. CUE verifica campos, enums, nulabilidade e limites locais; identidade Resumo x Bem, máquina de estados, locks, unicidade permanente, versionamento, terminalidade e composição M7/M9 são verificados em Alloy; canonicalização de plaqueta e proveniência por Rust. CUE não prova concorrência temporal."
			campos:   domain.#CamposM10
			exemplo: {id_resumo_bem_patrimonial: "resumo-1", numero_patrimonio: "ABC-123", estado_conservacao: "BOM", id_local: "local-1", photo_url: "gs://lcqui/fotos/bem-1.jpg", documento_dado_baixa_pdf_url: null, nome_responsavel_sei: "Maria Silva", status: "Ativo", descricao_complementar: null, versao: 1}
		},
		{
			arquivo:  "formal_m11_turmas"
			entidade: "M11_Turma_Matricula_Convite"
			etapa:    "formalização executável M11"
			escopo:   "Shapes estruturais de turma, vínculo canônico Aluno--Turma, espelho mínimo de consulta, evento de inclusão/exclusão, convite de ingresso e chave determinística de pendência. CUE verifica campos, enums fechados, nulabilidade, condicionais (justificativa de exceção, autoria do aceite, modo de ingresso, contexto global) e limites locais; ingresso ordinário por vaga, exceção nominal acima da capacidade, proibição de editar capacidade abaixo da ocupação, unicidade concorrente de pendência, contador, remoção/reingresso, arquivamento somente leitura, idempotência M7 e composição M9 são verificados em Alloy; a canonicalização determinística da pendência (HMAC) e a proveniência por Rust. CUE não prova concorrência temporal."
			campos:   domain.#CamposM11
			exemplo: {id_professor: "prof-1", id_materia: "mat-1", nome_turma: "Química Orgânica I", ano: 2026, semestre: 2, capacidade: 30, codigo_turma: "ABC123", status: "Ativo", versao: 1, qtd_alunos: 0}
		},
		{
			arquivo:  "formal_m12_1_posts"
			entidade: "M12_1_Posts_Comentarios"
			etapa:    "formalização executável M12.1"
			escopo:   "Shapes estruturais de Post, Comentário, históricos de edição/moderação, projeção de leitura com máscara, efeito mínimo de notificação e identidade de comando. CUE verifica campos, enums fechados, nulabilidade, condicionais (remoção lógica, edição, moderação, tipo de histórico, visão de leitura) e limites (título 1..150, descrição 1..10000, texto 1..2000, nome de arquivo 1..150, tamanho positivo). Autoridade de participação (vínculo canônico M11), transições, turma arquivada somente leitura, edição concorrente, idempotência M7, autorização M9 e a fronteira abstrata de acesso ao roteiro são verificadas em Alloy; a canonicalização determinística por Rust. CUE não prova concorrência temporal nem ACL de Roteiros (M12.2)."
			campos:   domain.#CamposM12_1
			exemplo: {id_turma: "turma-1", id_professor: "prof-1", id_post: "post-1", id_usuario: "uid-aluno-1", titulo: "Aula de titulação", descricao: "Orientações da prática.", texto: "Professor, levaremos óculos?", editado: false, editado_em: null, removido_da_apresentacao: false, motivo_remocao: null, moderado: false, motivo_moderacao: null, tipo_historico: "edicao", visao: "COLEGA", contem_conteudo_protegido: false, id_operacao: "op-1", storage_path: "gs://lcqui/roteiros/rot-1.pdf"}
		},
		{
			arquivo:  "formal_m12_2_roteiros"
			entidade: "M12_2_Roteiros_Compartilhamento_Storage"
			etapa:    "formalização executável M12.2"
			escopo:   "Shapes estruturais de Roteiro (provisório/validado/publicável), referência canônica ao objeto no Storage com geração, snapshot imutável do anexo refinando aditivamente #M12_1RoteiroAnexo, ligação explícita do anexo à referência canônica, compartilhamento único por (roteiro, professor), contexto de autorização (M9), vínculo canônico (M11), contexto de Post, projeção mínima de download, URL já emitida com validade temporal abstrata, operação idempotente M7 e efeito mínimo de notificação. CUE verifica campos, enums fechados, nulabilidade, condicionais e limites (nome 1..150, tamanho 1..15728639, geração 1..120, PDF strictly < 15 MiB). Dono imutável, upload provisório->validado->publicável, objeto/geração fixos, compartilhamento único, revogação Q09, ACL de professor versus aluno via vínculo atual + Post acessível, Chefe Q13, turma arquivada somente leitura, ex-aluno negado mesmo com claim atualizada, Post removido, anexar/trocar/manter/desvincular, histórico imutável, distinção entre nova emissão de URL e uso da URL já emitida (sem revogação retroativa) e composição M7/M9 são verificados em Alloy; limites e canonicalização determinística por Rust. CUE não prova autorização, concorrência nem atomicidade Firestore/Storage."
			campos:   domain.#CamposM12_2
			exemplo: {id_roteiro: "rot-1", id_professor_upload: "prof-1", nome: "Prática de titulação", storage_path: "gs://lcqui/roteiros/rot-1.pdf", content_type: "application/pdf", tamanho_bytes: 1048576, owner_uid: "prof-1", geracao: "1700000000000000", status_roteiro: "PUBLICAVEL", nome_arquivo: "Pratica_Titulacao.pdf", id_operacao: "op-1", tipo_operacao: "COMPARTILHAR_ROTEIRO", via: "COMPARTILHADO", validade_url: "ATIVA", revogado_em: null, removido_da_apresentacao: false}
		},
	]
}
