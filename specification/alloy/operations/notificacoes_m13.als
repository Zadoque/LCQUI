module operations/notificacoes_m13

open util/integer

// M13 — Notificação unificada (entidade `Notificacao` e caixa UI-12).
//
// Modelo abstrato composto. Reproduz a autorização de M12 (posts, comentários,
// roteiros, compartilhamento e escopo Q13), de M9 (papel/versão/claim) e de M11
// (vínculo canônico), e adiciona caixa única por UID, leitura, marcação,
// "Limpar tudo" paginado/reentrante com corte estável, expiração, alvo/deep
// link com revalidação, privacidade e emissão/deduplicação (identidade M7 ou
// chave determinística M8).
//
// As rotas de autorização acadêmica/comentário/roteiro são as mesmas de
// `composition_m12.als` (guard de drift tools/formal/m13_composition.mjs). A
// rota acadêmica exige o PAPEL acadêmico autorizado (`alunos`) E o vínculo
// canônico atual; um Chefe com vínculo legado não a usa. O Chefe atua em Q13
// conforme o recurso: leitura/moderação de Post/Comentário pela rota
// administrativa; emissão de URL de Roteiro só sob escopo de auditoria M12.2.
//
// Limite: escopos `for 4`/`for 5` (bounded). Não modela Firebase, Firestore,
// Rules, relógio real, paginação real, concorrência, entrega externa nem a
// aplicação.

// ---- Identidades e domínios fechados (vocabulário de composition_m12) --------

sig Usuario {}
sig Turma {}
sig Post {}
sig Roteiro {}
sig Objeto {}
sig Geracao {}
sig Comentario {}
sig Almoxarifado {}
sig Emprestimo {}

sig Vinculo {
	vAluno: one Usuario,
	vTurma: one Turma
}
sig Compartilhamento {
	cRoteiro:   one Roteiro,
	cProfessor: one Usuario
}
sig AnexoPost {
	aPost:    one Post,
	aRoteiro: one Roteiro,
	aGeracao: one Geracao
}
sig AuditoriaQ13 {
	aqChefe:   one Usuario,
	aqRoteiro: one Roteiro,
	aqPost:    one Post
}
sig UrlEmitida {
	uRoteiro: one Roteiro,
	uUid:     one Usuario,
	uGeracao: one Geracao
}

abstract sig StatusTurma {}
one sig Ativo, Arquivada extends StatusTurma {}

abstract sig StatusRoteiro {}
one sig Provisorio, Validado, Publicavel extends StatusRoteiro {}

abstract sig Papel {}
one sig PAluno, PProfessor, PBolsista, PGestorBens, PGestorAlmox, PChefe extends Papel {}

abstract sig Exp {}
one sig ENulo, EAtivo, EVencido extends Exp {}

abstract sig Bool {}
one sig True, False extends Bool {}

abstract sig Visao {}
one sig VOriginal, VAviso, VNenhuma extends Visao {}

// Os 20 valores do enum da Seção 4/5, como singleton sigs (mapeamento explícito
// entre camadas; o guard m13_composition.mjs detecta omissão de tipo acadêmico).
abstract sig Tipo {}
one sig TAdicionado, TPost, TComentario, TRemovido, TArquivada, TDesarquivada,
	TRequisicaoBem, TDataDevolucao, TRoteiroCompartilhado, TRequisicaoEdicaoBem,
	TRequisicaoAdicaoBem, TBemInservivel, TEntregaAtrasada, TVazios, TQuebrados,
	TVencidos, TASeremPesados, TEmQuarentena, TEscassez, TAutoAtendimento
	extends Tipo {}

// Operação idempotente M7: identidade `(opUid, opTipo, opChave)`.
sig Chave {}
sig Operacao {
	opUid:   one Usuario,
	opTipo:  one Tipo,
	opChave: one Chave
}

sig Notificacao {
	notDono:      one Usuario,
	notTipo:      one Tipo,
	notPapel:     one Papel,
	notTurma:     lone Turma,
	notPost:      lone Post,
	notComentario: lone Comentario,
	notRoteiro:   lone Roteiro,
	notAlmox:     lone Almoxarifado,
	notEmprestimo: lone Emprestimo,
	notOperacao:  lone Operacao
}

sig EstadoM13 {
	// autorização (espelha composition_m12.als)
	ativos:         set Usuario,
	versaoPerm:     Usuario -> one Int,
	claimVersao:    Usuario -> lone Int,
	professores:    set Usuario,
	chefes:         set Usuario,
	alunos:         set Usuario,
	bolsistas:      set Usuario,
	turmas:         set Turma,
	statusT:        Turma -> lone StatusTurma,
	donoT:          Turma -> lone Usuario,
	vinculos:       set Vinculo,
	posts:          set Post,
	postTurma:      Post -> lone Turma,
	postAutor:      Post -> lone Usuario,
	postRemovido:   set Post,
	comentarios:    set Comentario,
	comentPost:     Comentario -> lone Post,
	comentAutor:    Comentario -> lone Usuario,
	comentModerado: set Comentario,
	roteiros:       set Roteiro,
	roteiroDono:    Roteiro -> lone Usuario,
	roteiroStatus:  Roteiro -> lone StatusRoteiro,
	roteiroObj:     Roteiro -> lone Objeto,
	geracaoValida:  Roteiro -> lone Geracao,
	objetoGeracao:  Objeto -> one Geracao,
	compartilhados: set Compartilhamento,
	anexos:         set AnexoPost,
	auditorias:     set AuditoriaQ13,
	urls:           set UrlEmitida,
	urlsAtivas:     set UrlEmitida,
	vinculosAlmox:  Usuario -> set Almoxarifado,
	retirantes:     Emprestimo -> lone Usuario,
	// M13
	emitidas:       set Notificacao,
	alvoInvalido:   set Notificacao,
	notLida:        Notificacao -> one Bool,
	notLidaEm:      Notificacao -> one Bool,
	notExpira:      Notificacao -> one Exp,
	notConteudo:    set Notificacao,
	operacoes:      set Operacao
}

// ---- Autorização reproduzida de composition_m12.als (M12/M9/M11) ------------

pred versaoCorrente[s: EstadoM13, u: Usuario] {
	one s.claimVersao[u] and s.claimVersao[u] = s.versaoPerm[u]
}
pred authOk[s: EstadoM13, u: Usuario] {
	u in s.ativos and versaoCorrente[s, u]
}
pred temVinculo[s: EstadoM13, u: Usuario, t: Turma] {
	some v: s.vinculos | v.vAluno = u and v.vTurma = t
}
pred proprietario[s: EstadoM13, u: Usuario, r: Roteiro] { s.roteiroDono[r] = u }
pred compartilhadoAtual[s: EstadoM13, u: Usuario, r: Roteiro] {
	some c: s.compartilhados | c.cRoteiro = r and c.cProfessor = u
}
pred roteiroPublicavel[s: EstadoM13, r: Roteiro] {
	s.roteiroStatus[r] = Publicavel and one s.geracaoValida[r] and one s.roteiroObj[r]
}
pred acessoProfessorRoteiro[s: EstadoM13, u: Usuario, r: Roteiro] {
	authOk[s, u] and u in s.professores and roteiroPublicavel[s, r]
	and (proprietario[s, u, r] or compartilhadoAtual[s, u, r])
}
pred alunoAcessoPost[s: EstadoM13, u: Usuario, p: Post] {
	u in s.alunos
	p in s.posts and p not in s.postRemovido
	and some v: s.vinculos | v.vAluno = u and v.vTurma = s.postTurma[p]
}
pred alunoPodeBaixar[s: EstadoM13, u: Usuario, r: Roteiro] {
	some p: s.posts | alunoAcessoPost[s, u, p]
		and (some x: s.anexos | x.aPost = p and x.aRoteiro = r)
}
pred escopoQ13[s: EstadoM13, u: Usuario, r: Roteiro] {
	some aq: s.auditorias | aq.aqChefe = u and aq.aqRoteiro = r
}
pred podeEmitirUrl[s: EstadoM13, u: Usuario, r: Roteiro] {
	authOk[s, u] and roteiroPublicavel[s, r] and (
		(u in s.professores and (proprietario[s, u, r] or compartilhadoAtual[s, u, r]))
		or alunoPodeBaixar[s, u, r]
		or (u in s.chefes and escopoQ13[s, u, r]))
}

// ---- Classificação de tipos e alvo ------------------------------------------

// Seis tipos acadêmicos (RN-M13-07); correspondência exata com CUE/IR/LaTeX.
pred academico[t: Tipo] {
	t in TComentario + TPost + TAdicionado + TRemovido + TArquivada + TDesarquivada
}

pred temAlvoValido[s: EstadoM13, n: Notificacao] {
	#(n.notTurma + n.notPost + n.notComentario + n.notRoteiro + n.notAlmox
		+ n.notEmprestimo) = 1
}

// ---- Caixa única, rotas e navegação -----------------------------------------

pred caixaDe[s: EstadoM13, u: Usuario, n: Notificacao] {
	n in s.emitidas and n.notDono = u
}

// Aviso ativo: emitido e não expirado (a expiração retira do conjunto ativo).
pred ativo[s: EstadoM13, n: Notificacao] {
	n in s.emitidas and s.notExpira[n] != EVencido
}

// Rota acadêmica de Post: exige papel `alunos` E vínculo canônico atual (M12).
pred rotaAcademicaPost[s: EstadoM13, u: Usuario, n: Notificacao] {
	some p: n.notPost | alunoAcessoPost[s, u, p]
}
// Professor dono do Post (autoria) — não depende de vínculo.
pred rotaProfessorPost[s: EstadoM13, u: Usuario, n: Notificacao] {
	authOk[s, u] and some p: n.notPost | s.postAutor[p] = u
}
// Chefe em Q13 administrativo de Post/Comentário (leitura/moderação/auditoria).
pred rotaChefeAdmin[s: EstadoM13, u: Usuario, n: Notificacao] {
	authOk[s, u] and u in s.chefes
	and ((some n.notPost) or (some n.notComentario))
}
// Comentário: autor vê o original; colega com vínculo; auditor (professor/Chefe).
pred rotaAutorComentario[s: EstadoM13, u: Usuario, n: Notificacao] {
	authOk[s, u] and some c: n.notComentario | s.comentAutor[c] = u
}
pred rotaColegaComentario[s: EstadoM13, u: Usuario, n: Notificacao] {
	some c: n.notComentario | some p: s.comentPost[c] | alunoAcessoPost[s, u, p]
}
pred rotaAuditorComentario[s: EstadoM13, u: Usuario, n: Notificacao] {
	authOk[s, u] and some c: n.notComentario |
		(some p: s.comentPost[c] | s.postAutor[p] = u) or u in s.chefes
}
// Roteiro: professor (posse/compartilhamento), aluno via Post com anexo,
// ou Chefe sob escopo Q13 registrado (M12.2).
pred rotaProfessorRoteiro[s: EstadoM13, u: Usuario, n: Notificacao] {
	some r: n.notRoteiro | acessoProfessorRoteiro[s, u, r]
}
pred rotaAlunoRoteiro[s: EstadoM13, u: Usuario, n: Notificacao] {
	some r: n.notRoteiro | alunoPodeBaixar[s, u, r]
}
pred rotaChefeRoteiro[s: EstadoM13, u: Usuario, n: Notificacao] {
	authOk[s, u] and u in s.chefes
	and some r: n.notRoteiro | roteiroPublicavel[s, r] and escopoQ13[s, u, r]
}
// Turma: vínculo canônico atual (M11).
pred rotaTurma[s: EstadoM13, u: Usuario, n: Notificacao] {
	authOk[s, u] and some t: n.notTurma | temVinculo[s, u, t]
}
// Operacionais.
pred rotaAlmox[s: EstadoM13, u: Usuario, n: Notificacao] {
	authOk[s, u] and some a: n.notAlmox | a in s.vinculosAlmox[u]
}
pred rotaEmprestimo[s: EstadoM13, u: Usuario, n: Notificacao] {
	authOk[s, u] and some e: n.notEmprestimo | s.retirantes[e] = u
}

pred acessoAtual[s: EstadoM13, u: Usuario, n: Notificacao] {
	rotaAcademicaPost[s, u, n] or rotaProfessorPost[s, u, n] or rotaChefeAdmin[s, u, n]
	or rotaAutorComentario[s, u, n] or rotaColegaComentario[s, u, n]
	or rotaAuditorComentario[s, u, n]
	or rotaProfessorRoteiro[s, u, n] or rotaAlunoRoteiro[s, u, n] or rotaChefeRoteiro[s, u, n]
	or rotaTurma[s, u, n] or rotaAlmox[s, u, n] or rotaEmprestimo[s, u, n]
}

// Abrir o aviso: próprio, alvo válido e revalidação corrente.
pred navegar[s: EstadoM13, u: Usuario, n: Notificacao] {
	caixaDe[s, u, n]
	n not in s.alvoInvalido
	temAlvoValido[s, n]
	acessoAtual[s, u, n]
}

// Projeção de comentário moderado (M12.1): autor/original, auditor/original,
// colega/aviso; nunca o original por cache, aviso ou notificação.
pred visaoComentario[s: EstadoM13, u: Usuario, c: Comentario, v: Visao] {
	(
		(c in s.comentarios and (s.comentAutor[c] = u
			or (some p: s.comentPost[c] | s.postAutor[p] = u) or u in s.chefes))
			implies v = VOriginal
	)
	and (
		(c in s.comentarios and not (s.comentAutor[c] = u
			or (some p: s.comentPost[c] | s.postAutor[p] = u) or u in s.chefes)
			and (some p: s.comentPost[c] | alunoAcessoPost[s, u, p]))
			implies v = VAviso
	)
	and (
		(not (c in s.comentarios)
			or (c in s.comentarios and not (s.comentAutor[c] = u
				or (some p: s.comentPost[c] | s.postAutor[p] = u) or u in s.chefes)
				and not (some p: s.comentPost[c] | alunoAcessoPost[s, u, p])))
			implies v = VNenhuma
	)
}

// ---- Coerência --------------------------------------------------------------

pred coerente[s: EstadoM13] {
	all u: Usuario | s.versaoPerm[u] >= 0
	no s.notConteudo
	all n: Notificacao | s.notLida[n] = True iff s.notLidaEm[n] = True
	all n: s.emitidas | academico[n.notTipo] implies one n.notTurma
	all n: s.emitidas | not academico[n.notTipo] implies no n.notTurma
	all n: s.emitidas | n.notTipo = TEscassez implies
		(s.notExpira[n] = ENulo and no n.notTurma and no n.notPost and no n.notComentario
			and no n.notRoteiro)
	all n: s.emitidas | n in s.alvoInvalido or temAlvoValido[s, n]
	all n: s.emitidas |
		#(n.notTurma + n.notPost + n.notComentario + n.notRoteiro + n.notAlmox
			+ n.notEmprestimo) = 1 or n in s.alvoInvalido
	all n: s.emitidas | one n.notOperacao and n.notOperacao in s.operacoes
	// Deduplicação por destinatário: a mesma operação (ou a mesma chave
	// determinística M8) não notifica o mesmo UID duas vezes, mas pode ter
	// fan-out para destinatários distintos.
	all disj n1, n2: s.emitidas |
		(n1.notDono = n2.notDono and n1.notOperacao = n2.notOperacao) implies n1 = n2
	all disj n1, n2: s.emitidas |
		(n1.notDono = n2.notDono and n1.notOperacao.opChave = n2.notOperacao.opChave)
			implies n1 = n2
	all disj o1, o2: s.operacoes |
		(o1.opUid = o2.opUid and o1.opTipo = o2.opTipo and o1.opChave = o2.opChave)
			implies o1 = o2
	all v: s.vinculos | v.vTurma in s.turmas
	all u: Usuario | u in s.bolsistas implies u in s.alunos
	all p: s.posts | s.postTurma[p] in s.turmas
	all c: s.comentarios | (some p: s.comentPost[c] | p in s.posts)
	all x: s.anexos | x.aPost in s.posts and x.aRoteiro in s.roteiros
	all aq: s.auditorias | aq.aqChefe in s.chefes and aq.aqRoteiro in s.roteiros
		and aq.aqPost in s.posts
	all url: s.urlsAtivas | url in s.urls
}

fun caixa[s: EstadoM13, u: Usuario]: set Notificacao {
	{ n: s.emitidas | n.notDono = u }
}
fun removidas[a, b: EstadoM13]: set Notificacao {
	{ n: a.emitidas | n not in b.emitidas }
}

// ---- Frames parciais --------------------------------------------------------

pred fixo[a, b: EstadoM13] {
	b.ativos = a.ativos and b.versaoPerm = a.versaoPerm
	and b.professores = a.professores and b.chefes = a.chefes and b.alunos = a.alunos
	and b.bolsistas = a.bolsistas
	and b.turmas = a.turmas and b.statusT = a.statusT and b.donoT = a.donoT
	and b.posts = a.posts and b.postTurma = a.postTurma
	and b.postAutor = a.postAutor and b.postRemovido = a.postRemovido
	and b.comentarios = a.comentarios and b.comentPost = a.comentPost
	and b.comentAutor = a.comentAutor and b.comentModerado = a.comentModerado
	and b.roteiros = a.roteiros and b.roteiroDono = a.roteiroDono
	and b.roteiroStatus = a.roteiroStatus and b.roteiroObj = a.roteiroObj
	and b.geracaoValida = a.geracaoValida and b.objetoGeracao = a.objetoGeracao
	and b.anexos = a.anexos
	and b.urls = a.urls and b.urlsAtivas = a.urlsAtivas
	and b.vinculosAlmox = a.vinculosAlmox and b.retirantes = a.retirantes
}
pred preservaEmitidas[a, b: EstadoM13] { b.emitidas = a.emitidas and b.alvoInvalido = a.alvoInvalido }
pred preservaClaim[a, b: EstadoM13] { b.claimVersao = a.claimVersao }
pred preservaVinculos[a, b: EstadoM13] { b.vinculos = a.vinculos }
pred preservaCompartilhados[a, b: EstadoM13] { b.compartilhados = a.compartilhados }
pred preservaAuditorias[a, b: EstadoM13] { b.auditorias = a.auditorias }
pred preservaLeitura[a, b: EstadoM13] { b.notLida = a.notLida and b.notLidaEm = a.notLidaEm }
pred preservaExpira[a, b: EstadoM13] { b.notExpira = a.notExpira }
pred preservaConteudo[a, b: EstadoM13] { b.notConteudo = a.notConteudo }
pred preservaOperacoes[a, b: EstadoM13] { b.operacoes = a.operacoes }

// ---- Transições -------------------------------------------------------------

pred emitir[a, b: EstadoM13, n: Notificacao, o: Operacao] {
	coerente[a]
	n not in a.emitidas
	o not in a.operacoes
	no x: a.operacoes | x.opUid = o.opUid and x.opTipo = o.opTipo and x.opChave = o.opChave
	n.notOperacao = o
	n in a.alvoInvalido or temAlvoValido[a, n]
	no x: a.emitidas | x.notDono = n.notDono and x.notOperacao.opChave = o.opChave
	academico[n.notTipo] implies one n.notTurma
	not academico[n.notTipo] implies no n.notTurma
	n.notTipo = TEscassez implies
		(a.notExpira[n] = ENulo and no n.notPost and no n.notComentario and no n.notRoteiro)
	b.emitidas = a.emitidas + n
	b.alvoInvalido = a.alvoInvalido
	b.operacoes = a.operacoes + o
	b.notLida = a.notLida ++ n -> False
	b.notLidaEm = a.notLidaEm ++ n -> False
	fixo[a, b]
	preservaClaim[a, b]
	preservaVinculos[a, b]
	preservaCompartilhados[a, b]
	preservaAuditorias[a, b]
	preservaExpira[a, b]
	preservaConteudo[a, b]
}

// Fan-out M7/M8: a mesma operação (mesma identidade/chave) emite para outro
// destinatário, sem criar nova operação e sem duplicar destinatário.
pred fanOut[a, b: EstadoM13, n: Notificacao, o: Operacao] {
	coerente[a]
	o in a.operacoes
	n not in a.emitidas
	n.notOperacao = o
	no x: a.emitidas | x.notDono = n.notDono and x.notOperacao = o
	n in a.alvoInvalido or temAlvoValido[a, n]
	no x: a.emitidas | x.notDono = n.notDono and x.notOperacao.opChave = o.opChave
	academico[n.notTipo] implies one n.notTurma
	not academico[n.notTipo] implies no n.notTurma
	n.notTipo = TEscassez implies
		(a.notExpira[n] = ENulo and no n.notPost and no n.notComentario and no n.notRoteiro)
	b.emitidas = a.emitidas + n
	b.alvoInvalido = a.alvoInvalido
	b.operacoes = a.operacoes
	b.notLida = a.notLida ++ n -> False
	b.notLidaEm = a.notLidaEm ++ n -> False
	fixo[a, b]
	preservaClaim[a, b]
	preservaVinculos[a, b]
	preservaCompartilhados[a, b]
	preservaAuditorias[a, b]
	preservaExpira[a, b]
	preservaConteudo[a, b]
}

pred retryEmissao[a, b: EstadoM13, o: Operacao] {
	coerente[a]
	o in a.operacoes
	fixo[a, b]
	preservaClaim[a, b]
	preservaVinculos[a, b]
	preservaCompartilhados[a, b]
	preservaAuditorias[a, b]
	preservaEmitidas[a, b]
	preservaLeitura[a, b]
	preservaExpira[a, b]
	preservaConteudo[a, b]
	preservaOperacoes[a, b]
}

pred falhaEmissao[a, b: EstadoM13, o: Operacao] {
	coerente[a]
	o not in a.operacoes
	fixo[a, b]
	preservaClaim[a, b]
	preservaVinculos[a, b]
	preservaCompartilhados[a, b]
	preservaAuditorias[a, b]
	preservaEmitidas[a, b]
	preservaLeitura[a, b]
	preservaExpira[a, b]
	preservaConteudo[a, b]
	preservaOperacoes[a, b]
}

pred marcarLida[a, b: EstadoM13, u: Usuario, n: Notificacao] {
	coerente[a]
	n in a.emitidas
	n.notDono = u
	b.notLida = a.notLida ++ n -> True
	b.notLidaEm = a.notLidaEm ++ n -> True
	fixo[a, b]
	preservaClaim[a, b]
	preservaVinculos[a, b]
	preservaCompartilhados[a, b]
	preservaAuditorias[a, b]
	preservaEmitidas[a, b]
	preservaExpira[a, b]
	preservaConteudo[a, b]
	preservaOperacoes[a, b]
}

pred limparTudo[a, b: EstadoM13, u: Usuario, corte: set Notificacao] {
	coerente[a]
	corte in a.emitidas
	all n: corte | n.notDono = u
	all n: corte | b.notLida[n] = True
	all n: a.emitidas - corte | b.notLida[n] = a.notLida[n]
	all n: a.emitidas - corte | b.notLidaEm[n] = a.notLidaEm[n]
	all n: corte | a.notLida[n] = False implies b.notLidaEm[n] = True
	all n: corte | a.notLida[n] = True implies b.notLidaEm[n] = a.notLidaEm[n]
	all n: Notificacao - a.emitidas |
		b.notLida[n] = a.notLida[n] and b.notLidaEm[n] = a.notLidaEm[n]
	fixo[a, b]
	preservaClaim[a, b]
	preservaVinculos[a, b]
	preservaCompartilhados[a, b]
	preservaAuditorias[a, b]
	preservaEmitidas[a, b]
	preservaExpira[a, b]
	preservaConteudo[a, b]
	preservaOperacoes[a, b]
}

pred limparTudoDepoisEmite[a, b, c: EstadoM13, u: Usuario, corte: set Notificacao,
		n: Notificacao, o: Operacao] {
	limparTudo[a, b, u, corte]
	n not in b.emitidas
	emitir[b, c, n, o]
}

pred expirar[a, b: EstadoM13, n: Notificacao] {
	coerente[a]
	n in a.emitidas
	a.notExpira[n] = EAtivo
	b.notExpira = a.notExpira ++ n -> EVencido
	fixo[a, b]
	preservaClaim[a, b]
	preservaVinculos[a, b]
	preservaCompartilhados[a, b]
	preservaAuditorias[a, b]
	preservaEmitidas[a, b]
	preservaLeitura[a, b]
	preservaConteudo[a, b]
	preservaOperacoes[a, b]
}

pred revogarCompartilhamento[a, b: EstadoM13, u: Usuario, r: Roteiro] {
	coerente[a]
	r in a.compartilhados.cRoteiro
	b.compartilhados = a.compartilhados - { c: a.compartilhados | c.cRoteiro = r and c.cProfessor = u }
	fixo[a, b]
	preservaClaim[a, b]
	preservaVinculos[a, b]
	preservaAuditorias[a, b]
	preservaEmitidas[a, b]
	preservaLeitura[a, b]
	preservaExpira[a, b]
	preservaConteudo[a, b]
	preservaOperacoes[a, b]
}

pred removerVinculo[a, b: EstadoM13, u: Usuario, t: Turma] {
	coerente[a]
	some v: a.vinculos | v.vAluno = u and v.vTurma = t
	b.vinculos = a.vinculos - { v: a.vinculos | v.vAluno = u and v.vTurma = t }
	fixo[a, b]
	preservaClaim[a, b]
	preservaCompartilhados[a, b]
	preservaAuditorias[a, b]
	preservaEmitidas[a, b]
	preservaLeitura[a, b]
	preservaExpira[a, b]
	preservaConteudo[a, b]
	preservaOperacoes[a, b]
}

pred atualizarClaim[a, b: EstadoM13, u: Usuario] {
	coerente[a]
	b.claimVersao = a.claimVersao ++ u -> a.versaoPerm[u]
	fixo[a, b]
	preservaVinculos[a, b]
	preservaCompartilhados[a, b]
	preservaAuditorias[a, b]
	preservaEmitidas[a, b]
	preservaLeitura[a, b]
	preservaExpira[a, b]
	preservaConteudo[a, b]
	preservaOperacoes[a, b]
}

pred encerrarEscopoQ13[a, b: EstadoM13, aq: AuditoriaQ13] {
	coerente[a]
	aq in a.auditorias
	b.auditorias = a.auditorias - aq
	fixo[a, b]
	preservaClaim[a, b]
	preservaVinculos[a, b]
	preservaCompartilhados[a, b]
	preservaEmitidas[a, b]
	preservaLeitura[a, b]
	preservaExpira[a, b]
	preservaConteudo[a, b]
	preservaOperacoes[a, b]
}

// ---- Preservação de coerência -----------------------------------------------

assert TransicoesPreservamCoerencia {
	all a, b: EstadoM13, n: Notificacao, o: Operacao, u: Usuario, t: Turma,
			r: Roteiro, aq: AuditoriaQ13, corte: set Notificacao |
		coerente[a] and
		(emitir[a, b, n, o] or fanOut[a, b, n, o] or retryEmissao[a, b, o] or falhaEmissao[a, b, o] or
		 marcarLida[a, b, u, n] or limparTudo[a, b, u, corte] or
		 expirar[a, b, n] or revogarCompartilhamento[a, b, u, r] or
		 removerVinculo[a, b, u, t] or atualizarClaim[a, b, u] or
		 encerrarEscopoQ13[a, b, aq])
			implies coerente[b]
}

// ---- RN-M13-01: caixa única, papel visual, Bolsista/Q12 ---------------------

assert NaoLeCaixaAlheia {
	all s: EstadoM13, u, v: Usuario, n: Notificacao |
		coerente[s] and u != v and n in caixa[s, v] implies not caixaDe[s, u, n]
}
assert PapelVisualNaoFiltraCaixa {
	all s: EstadoM13, u: Usuario, n: Notificacao |
		coerente[s] and n in s.emitidas and n.notDono = u implies caixaDe[s, u, n]
}
assert BolsistaVeCaixa {
	all s: EstadoM13, u: Usuario, n: Notificacao |
		coerente[s] and u in s.bolsistas and n in s.emitidas and n.notDono = u
			implies caixaDe[s, u, n]
}

// ---- RN-M13-02: marcação e "Limpar tudo" ------------------------------------

assert MarcarSoProprias {
	all a, b: EstadoM13, u: Usuario, n: Notificacao |
		marcarLida[a, b, u, n] implies n.notDono = u
}
assert MarcaIdempotente {
	all a, b: EstadoM13, u: Usuario, n: Notificacao |
		marcarLida[a, b, u, n] and a.notLida[n] = True
			implies b.notLidaEm[n] = a.notLidaEm[n]
}
assert MarcaNaoReverte {
	all a, b: EstadoM13, u: Usuario, n: Notificacao |
		marcarLida[a, b, u, n] and a.notLida[n] = True implies b.notLida[n] = True
}
assert LoteSoProprias {
	all a, b: EstadoM13, u: Usuario, corte: set Notificacao, n: Notificacao |
		limparTudo[a, b, u, corte] and n in corte implies n.notDono = u
}
assert SemDelete {
	all a, b: EstadoM13, u: Usuario, corte: set Notificacao |
		limparTudo[a, b, u, corte] implies no removidas[a, b]
}
assert LimparTudoCorteEstavel {
	all a, b, c: EstadoM13, u: Usuario, corte: set Notificacao,
			n: Notificacao, o: Operacao |
		limparTudoDepoisEmite[a, b, c, u, corte, n, o] implies c.notLida[n] = False
}

// ---- RN-M13-03: expiração ---------------------------------------------------

assert ExpiracaoDistingueNull {
	all a, b: EstadoM13, n: Notificacao |
		a.notExpira[n] = ENulo implies not expirar[a, b, n]
}
assert ExpiradoForaDoAtivo {
	all a, b: EstadoM13, n: Notificacao |
		expirar[a, b, n] implies (not ativo[b, n] and n in b.emitidas and no removidas[a, b])
}

// ---- RN-M13-04: alvo, deep link e autorização corrente ----------------------

assert AlvoInvalidoNaoNavega {
	all s: EstadoM13, u: Usuario, n: Notificacao |
		coerente[s] and (n in s.alvoInvalido or not temAlvoValido[s, n])
			implies not navegar[s, u, n]
}
assert AlertaNaoContornaAcl {
	all s: EstadoM13, u: Usuario, n: Notificacao |
		coerente[s] and navegar[s, u, n] implies acessoAtual[s, u, n]
}
assert RotaAcademicaExigePapel {
	all s: EstadoM13, u: Usuario, n: Notificacao |
		coerente[s] and rotaAcademicaPost[s, u, n] implies u in s.alunos
}
assert ChefeLegadoNaoUsaAcademico {
	all s: EstadoM13, u: Usuario, n: Notificacao |
		coerente[s] and u in s.chefes and u not in s.alunos
			implies not rotaAcademicaPost[s, u, n]
}
assert SemVinculoNaoRestaura {
	all s: EstadoM13, u: Usuario, n: Notificacao |
		coerente[s] and (no v: s.vinculos | v.vAluno = u)
			implies not rotaAcademicaPost[s, u, n]
}
assert ProfessorDonoMantemAcesso {
	all s: EstadoM13, u: Usuario, n: Notificacao |
		coerente[s] and authOk[s, u] and (some p: n.notPost | s.postAutor[p] = u)
			implies rotaProfessorPost[s, u, n]
}
assert CompartilhamentoSoProfessor {
	all s: EstadoM13, u: Usuario, n: Notificacao |
		coerente[s] and (some r: n.notRoteiro | compartilhadoAtual[s, u, r])
			and u not in s.professores
			implies not rotaProfessorRoteiro[s, u, n]
}
assert ChefeAdminNaoHerdaAcademico {
	all s: EstadoM13, u: Usuario, n: Notificacao |
		coerente[s] and u in s.chefes and u not in s.alunos and (some n.notPost)
			implies not rotaAcademicaPost[s, u, n]
}
assert ChefeSemEscopoNaoEmiteUrl {
	all s: EstadoM13, u: Usuario, n: Notificacao |
		coerente[s] and u in s.chefes and (some r: n.notRoteiro | not escopoQ13[s, u, r])
			implies not rotaChefeRoteiro[s, u, n]
}
assert EscopoEncerradoImpedeNovaEmissao {
	all a, b: EstadoM13, aq: AuditoriaQ13, u: Usuario, r: Roteiro, n: Notificacao |
		encerrarEscopoQ13[a, b, aq] and aq.aqChefe = u and aq.aqRoteiro = r
		and (all aq2: a.auditorias |
			aq2.aqChefe = u and aq2.aqRoteiro = r implies aq2 = aq)
		and n.notRoteiro = r
			implies not rotaChefeRoteiro[b, u, n]
}
assert EncerramentoEscopoPreservaRoteiro {
	all a, b: EstadoM13, aq: AuditoriaQ13 |
		encerrarEscopoQ13[a, b, aq]
			implies (b.roteiros = a.roteiros and b.anexos = a.anexos and b.urlsAtivas = a.urlsAtivas)
}
assert RoteiroAlunoExigePostEAnexo {
	all s: EstadoM13, u: Usuario, n: Notificacao |
		coerente[s] and rotaAlunoRoteiro[s, u, n]
			implies (some r: n.notRoteiro | alunoPodeBaixar[s, u, r])
}
assert PonteRotaChefeRoteiroRefinaUrl {
	all s: EstadoM13, u: Usuario, n: Notificacao |
		coerente[s] and rotaChefeRoteiro[s, u, n]
			implies (some r: n.notRoteiro | podeEmitirUrl[s, u, r])
}
assert NotificacaoNaoExpoeOriginal {
	all s: EstadoM13 | coerente[s] implies no s.notConteudo
}

// ---- Projeção de comentário moderado ----------------------------------------

assert ColegaVeAviso {
	all s: EstadoM13, u: Usuario, c: Comentario |
		coerente[s] and c in s.comentarios and c in s.comentModerado
			and s.comentAutor[c] != u
			and (some p: s.comentPost[c] | s.postAutor[p] != u) and u not in s.chefes
			and (some p: s.comentPost[c] | alunoAcessoPost[s, u, p])
			implies visaoComentario[s, u, c, VAviso]
}
assert AutorVeOriginal {
	all s: EstadoM13, u: Usuario, c: Comentario |
		coerente[s] and c in s.comentarios and s.comentAutor[c] = u
			implies visaoComentario[s, u, c, VOriginal]
}
assert AuditorVeOriginal {
	all s: EstadoM13, u: Usuario, c: Comentario |
		coerente[s] and c in s.comentarios
			and ((some p: s.comentPost[c] | s.postAutor[p] = u) or u in s.chefes)
			implies visaoComentario[s, u, c, VOriginal]
}

// ---- RN-M13-06: emissão e deduplicação --------------------------------------

assert EmissaoMesmaIdentidadeNaoDuplica {
	all a, b: EstadoM13, o: Operacao |
		retryEmissao[a, b, o]
			implies no n: Notificacao | n in b.emitidas and n not in a.emitidas
}
assert FanOutNaoDuplicaDestinatario {
	all a, b: EstadoM13, n: Notificacao, o: Operacao |
		fanOut[a, b, n, o]
			implies no x: a.emitidas | x.notDono = n.notDono and x.notOperacao = o
}
assert ErroEmissaoNaoViraSucesso {
	all a, b: EstadoM13, o: Operacao |
		falhaEmissao[a, b, o] implies b.emitidas = a.emitidas and o not in b.operacoes
}
assert ComposicaoM7RetryNaoDuplica {
	all a, b: EstadoM13, o: Operacao, n: Notificacao |
		retryEmissao[a, b, o] and n in a.emitidas implies n in b.emitidas
}

// ---- RN-M13-07: id_turma ----------------------------------------------------

assert IdTurmaAcademicoObrigatorio {
	all s: EstadoM13, n: Notificacao |
		coerente[s] and n in s.emitidas and academico[n.notTipo]
			implies one n.notTurma
}
assert IdTurmaOperacionalNulo {
	all s: EstadoM13, n: Notificacao |
		coerente[s] and n in s.emitidas and not academico[n.notTipo]
			implies no n.notTurma
}

// ---- Testemunhas (SAT, alcançáveis) -----------------------------------------

pred WitnessCaixaMultiRole {
	some s: EstadoM13, u: Usuario, disj n1, n2: Notificacao |
		coerente[s] and u in s.ativos and
		n1 in s.emitidas and n1.notDono = u and n1.notPapel = PAluno and
		n2 in s.emitidas and n2.notDono = u and n2.notPapel = PBolsista and
		n1 in s.alvoInvalido and n2 in s.alvoInvalido and
		caixaDe[s, u, n1] and caixaDe[s, u, n2]
}
pred WitnessBolsistaVeAlerta {
	some s: EstadoM13, u: Usuario, n: Notificacao |
		coerente[s] and u in s.bolsistas and n in s.emitidas and
		n.notDono = u and n.notPapel = PBolsista and n in s.alvoInvalido
		and caixaDe[s, u, n]
}
pred WitnessMarcarLidaPropria {
	some a, b: EstadoM13, u: Usuario, n: Notificacao |
		marcarLida[a, b, u, n] and a.notLida[n] = False and b.notLida[n] = True
}
pred WitnessMarcacaoIdempotente {
	some a, b: EstadoM13, u: Usuario, n: Notificacao |
		marcarLida[a, b, u, n] and a.notLida[n] = True and b.notLidaEm[n] = a.notLidaEm[n]
}
pred WitnessLimparTudoProprias {
	some a, b: EstadoM13, u: Usuario, n: Notificacao |
		n in a.emitidas and n.notDono = u and a.notLida[n] = False and
		limparTudo[a, b, u, caixa[a, u]] and b.notLida[n] = True
}
pred WitnessLimparTudoRetry {
	some a, b, c: EstadoM13, u: Usuario, n: Notificacao |
		n in a.emitidas and n.notDono = u and a.notLida[n] = False and
		limparTudo[a, b, u, caixa[a, u]] and n in b.emitidas and
		b.notLida[n] = True and limparTudo[b, c, u, caixa[b, u]]
}
pred WitnessLimparTudoCorteComNovaEmissao {
	some a, b, c: EstadoM13, u: Usuario, corte: set Notificacao,
			n: Notificacao, o: Operacao |
		limparTudoDepoisEmite[a, b, c, u, corte, n, o] and c.notLida[n] = False
}
pred WitnessExpiraAtivo {
	some a, b: EstadoM13, n: Notificacao |
		expirar[a, b, n] and a.notExpira[n] = EAtivo and b.notExpira[n] = EVencido
}
pred WitnessNullNaoExpira {
	some s: EstadoM13, n: Notificacao |
		coerente[s] and n in s.emitidas and s.notExpira[n] = ENulo
		and n.notTipo = TEscassez and some n.notAlmox
}
pred WitnessAlvoInvalidoNaoNavega {
	some s: EstadoM13, u: Usuario, n: Notificacao |
		coerente[s] and n in s.emitidas and n.notDono = u and n in s.alvoInvalido
		and not navegar[s, u, n]
}
pred WitnessRotaAcademicaValida {
	some s: EstadoM13, u: Usuario, p: Post, n: Notificacao, t: Turma |
		coerente[s] and u in s.alunos and u in s.ativos and
		s.claimVersao[u] = s.versaoPerm[u] and
		p in s.posts and s.postTurma[p] = t and
		(some v: s.vinculos | v.vAluno = u and v.vTurma = t) and
		n in s.emitidas and n.notDono = u and n.notPost = p and
		rotaAcademicaPost[s, u, n] and navegar[s, u, n]
}
pred WitnessArquivamentoTurma {
	some s: EstadoM13, u: Usuario, t: Turma, n: Notificacao |
		coerente[s] and u in s.ativos and s.claimVersao[u] = s.versaoPerm[u] and
		(some v: s.vinculos | v.vAluno = u and v.vTurma = t) and
		n in s.emitidas and n.notDono = u and n.notTipo = TArquivada and n.notTurma = t
		and rotaTurma[s, u, n] and navegar[s, u, n]
}
pred WitnessDesarquivamentoTurma {
	some s: EstadoM13, u: Usuario, t: Turma, n: Notificacao |
		coerente[s] and u in s.ativos and s.claimVersao[u] = s.versaoPerm[u] and
		(some v: s.vinculos | v.vAluno = u and v.vTurma = t) and
		n in s.emitidas and n.notDono = u and n.notTipo = TDesarquivada and n.notTurma = t
		and rotaTurma[s, u, n] and navegar[s, u, n]
}
pred WitnessChefeLegadoNaoUsaAcademico {
	some s: EstadoM13, u: Usuario, p: Post, n: Notificacao, t: Turma |
		coerente[s] and u in s.chefes and u not in s.alunos and u in s.ativos and
		s.claimVersao[u] = s.versaoPerm[u] and
		(some v: s.vinculos | v.vAluno = u and v.vTurma = t) and
		p in s.posts and n in s.emitidas and n.notDono = u and n.notPost = p and
		not rotaAcademicaPost[s, u, n] and rotaChefeAdmin[s, u, n]
}
pred WitnessSemVinculoClaimAtual {
	some a, b, c: EstadoM13, u: Usuario, t: Turma |
		(some v: a.vinculos | v.vAluno = u and v.vTurma = t)
		and removerVinculo[a, b, u, t] and atualizarClaim[b, c, u]
		and (no v: c.vinculos | v.vAluno = u)
		and (no v: c.vinculos | v.vAluno = u)
}
pred WitnessProfessorDonoPost {
	some s: EstadoM13, u: Usuario, p: Post, n: Notificacao |
		coerente[s] and u in s.ativos and s.claimVersao[u] = s.versaoPerm[u] and
		u in s.professores and p in s.posts and s.postAutor[p] = u and
		n in s.emitidas and n.notDono = u and n.notPost = p and
		rotaProfessorPost[s, u, n] and navegar[s, u, n]
}
pred WitnessCompartilhamentoRoteiro {
	some s: EstadoM13, u: Usuario, r: Roteiro, n: Notificacao |
		coerente[s] and u in s.ativos and s.claimVersao[u] = s.versaoPerm[u] and
		u in s.professores and roteiroPublicavel[s, r] and
		(some c: s.compartilhados | c.cRoteiro = r and c.cProfessor = u) and
		n in s.emitidas and n.notDono = u and n.notRoteiro = r and
		rotaProfessorRoteiro[s, u, n] and navegar[s, u, n]
}
pred WitnessChefeComEscopo {
	some s: EstadoM13, u: Usuario, r: Roteiro, n: Notificacao |
		coerente[s] and u in s.chefes and u in s.ativos and
		s.claimVersao[u] = s.versaoPerm[u] and roteiroPublicavel[s, r] and
		(some aq: s.auditorias | aq.aqChefe = u and aq.aqRoteiro = r) and
		n in s.emitidas and n.notDono = u and n.notRoteiro = r and
		rotaChefeRoteiro[s, u, n] and podeEmitirUrl[s, u, r]
}
pred WitnessEscopoEncerrado {
	some a, b: EstadoM13, aq: AuditoriaQ13 |
		encerrarEscopoQ13[a, b, aq] and aq not in b.auditorias and b.urlsAtivas = a.urlsAtivas
}
pred WitnessEmissaoUnica {
	some a, b: EstadoM13, n: Notificacao, o: Operacao |
		emitir[a, b, n, o] and n in b.emitidas and n not in a.emitidas
}
pred EmissaoChaveDistintaEmite {
	some a, b, c: EstadoM13, disj n1, n2: Notificacao, disj o1, o2: Operacao |
		o1.opUid = o2.opUid and o1.opTipo = o2.opTipo and o1.opChave != o2.opChave and
		emitir[a, b, n1, o1] and emitir[b, c, n2, o2]
}
pred WitnessFanOutMesmaOperacao {
	some a, b, c: EstadoM13, disj n1, n2: Notificacao, o: Operacao |
		emitir[a, b, n1, o] and fanOut[b, c, n2, o] and n1.notDono != n2.notDono
}
pred WitnessErroNaoEmite {
	some a, b: EstadoM13, o: Operacao |
		falhaEmissao[a, b, o] and no removidas[a, b] and b.emitidas = a.emitidas
}
pred WitnessColegaVeAviso {
	some s: EstadoM13, u: Usuario, c: Comentario, p: Post, t: Turma |
		coerente[s] and c in s.comentarios and c in s.comentModerado and
		s.comentPost[c] = p and s.postTurma[p] = t and u in s.alunos and
		(some v: s.vinculos | v.vAluno = u and v.vTurma = t) and s.comentAutor[c] != u and
		u not in s.chefes and visaoComentario[s, u, c, VAviso]
}
pred WitnessAutorVeOriginal {
	some s: EstadoM13, u: Usuario, c: Comentario |
		coerente[s] and c in s.comentarios and c in s.comentModerado and
		s.comentAutor[c] = u and visaoComentario[s, u, c, VOriginal]
}
pred WitnessAuditorVeOriginal {
	some s: EstadoM13, u: Usuario, c: Comentario |
		coerente[s] and c in s.comentarios and c in s.comentModerado and u in s.chefes and
		visaoComentario[s, u, c, VOriginal]
}

// ---- Comandos ---------------------------------------------------------------

check TransicoesPreservamCoerencia for 4
check NaoLeCaixaAlheia for 4
check PapelVisualNaoFiltraCaixa for 4
check BolsistaVeCaixa for 4
check MarcarSoProprias for 4
check MarcaIdempotente for 4
check MarcaNaoReverte for 4
check LoteSoProprias for 4
check SemDelete for 4
check LimparTudoCorteEstavel for 5
check ExpiracaoDistingueNull for 4
check ExpiradoForaDoAtivo for 4
check AlvoInvalidoNaoNavega for 4
check AlertaNaoContornaAcl for 4
check RotaAcademicaExigePapel for 4
check ChefeLegadoNaoUsaAcademico for 4
check SemVinculoNaoRestaura for 4
check ProfessorDonoMantemAcesso for 4
check CompartilhamentoSoProfessor for 4
check ChefeAdminNaoHerdaAcademico for 4
check ChefeSemEscopoNaoEmiteUrl for 4
check EscopoEncerradoImpedeNovaEmissao for 4
check EncerramentoEscopoPreservaRoteiro for 4
check RoteiroAlunoExigePostEAnexo for 4
check PonteRotaChefeRoteiroRefinaUrl for 4
check NotificacaoNaoExpoeOriginal for 4
check ColegaVeAviso for 4
check AutorVeOriginal for 4
check AuditorVeOriginal for 4
check EmissaoMesmaIdentidadeNaoDuplica for 4
check FanOutNaoDuplicaDestinatario for 4
check ErroEmissaoNaoViraSucesso for 4
check ComposicaoM7RetryNaoDuplica for 4
check IdTurmaAcademicoObrigatorio for 4
check IdTurmaOperacionalNulo for 4

run WitnessCaixaMultiRole for 4
run WitnessBolsistaVeAlerta for 4
run WitnessMarcarLidaPropria for 4
run WitnessMarcacaoIdempotente for 4
run WitnessLimparTudoProprias for 4
run WitnessLimparTudoRetry for 5
run WitnessLimparTudoCorteComNovaEmissao for 5
run WitnessExpiraAtivo for 4
run WitnessNullNaoExpira for 4
run WitnessAlvoInvalidoNaoNavega for 4
run WitnessRotaAcademicaValida for 4
run WitnessArquivamentoTurma for 4
run WitnessDesarquivamentoTurma for 4
run WitnessChefeLegadoNaoUsaAcademico for 4
run WitnessSemVinculoClaimAtual for 4
run WitnessProfessorDonoPost for 4
run WitnessCompartilhamentoRoteiro for 4
run WitnessChefeComEscopo for 4
run WitnessEscopoEncerrado for 4
run WitnessEmissaoUnica for 4
run EmissaoChaveDistintaEmite for 4
run WitnessFanOutMesmaOperacao for 4
run WitnessErroNaoEmite for 4
run WitnessColegaVeAviso for 4
run WitnessAutorVeOriginal for 4
run WitnessAuditorVeOriginal for 4
