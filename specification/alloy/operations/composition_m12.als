module operations/composition_m12

open util/integer

// M12 — composição executável de M12.1 (Posts) e M12.2 (Roteiros, Storage,
// compartilhamento e anexo a Post).
//
// Este modelo NÃO reabre nem repete as provas isoladas de M12.1/M12.2: ele
// verifica a propriedade composta em um único EstadoIntegrado, com os mesmos
// fatos de Post, vínculo canônico, professor, Roteiro, anexo e comando. Os
// predicados de autorização/coerência de fronteira são reproduzidos das fontes
// M12.1/M12.2 e um guard de drift (m12_composition.mjs) prova a reprodução.
//
// A ponte `ponteAcessoRoteiro` torna explícito o refinamento aditivo: o acesso
// abstrato de M12.1 (`acessoRoteiroValidado`) implica o acesso concreto de M12.2
// (`acessoProfessorRoteiro`), que exige objeto, geração canônica e posse ou
// compartilhamento atual. A publicação composta exige ambos e prova a geração
// canônica (M12.1, isolado, não provava `geracao`).
//
// A rota acadêmica exige o papel acadêmico autorizado (`alunos`) E o vínculo
// canônico atual. M9/M11 não definem eliminação atômica de vínculos ao mudar de
// papel; `promoverChefeComposto` modela essa lacuna e prova que um Chefe com
// vínculo legado não contorna Q13.
//
// Limite de custo: as buscas usam escopos `for 4`/`for 5` (limitadas), conforme
// registrado no worklog. Não modela Firebase, Storage real, bytes, Rules, HMAC,
// concorrência, exactly-once transacional nem revogação instantânea de URL.

// ---- Identidades e domínios fechados ----------------------------------------
sig Usuario {}
sig Turma {}
sig Post {}
sig Roteiro {}
sig Objeto {}
sig Geracao {}
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
sig HistAnexo {
	hPost:    one Post,
	hRoteiro: one Roteiro,
	hGeracao: one Geracao
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
sig Notif {
	nDest:     one Usuario,
	nAlvo:     one Post,
	nOperacao: one OpId
}
sig OpId {}
sig Payload {}
sig Comando {
	cmdUid:     one Usuario,
	cmdTipo:    one TipoCmd,
	cmdPayload: one Payload,
	cmdId:      one OpId
}

abstract sig StatusTurma {}
one sig Ativo, Arquivada extends StatusTurma {}

abstract sig StatusRoteiro {}
one sig Provisorio, Validado, Publicavel extends StatusRoteiro {}

abstract sig TipoCmd {}
one sig TCriarPost, TEditarPost, TRemoverPost, TCompartilhar, TRevogar,
	TAnexar, TManter, TDesanexar, TAuditar, TCadastrar, TValidar, TPublicar,
	TEmitirUrl extends TipoCmd {}

// ---- Estado integrado (união dos fatos de M12.1 e M12.2) --------------------
sig EstadoIntegrado {
	turmas:          set Turma,
	statusT:         Turma -> lone StatusTurma,
	donoT:           Turma -> lone Usuario,
	vinculos:        set Vinculo,
	posts:           set Post,
	postTurma:       Post -> lone Turma,
	postAutor:       Post -> lone Usuario,
	postRemovido:    set Post,
	roteiros:        set Roteiro,
	roteiroDono:     Roteiro -> lone Usuario,
	roteiroStatus:   Roteiro -> lone StatusRoteiro,
	roteiroObj:      Roteiro -> lone Objeto,
	geracaoValida:   Roteiro -> lone Geracao,
	objetoGeracao:   Objeto -> one Geracao,
	compartilhados:  set Compartilhamento,
	anexos:          set AnexoPost,
	histsAnexo:      set HistAnexo,
	auditorias:      set AuditoriaQ13,
	urls:            set UrlEmitida,
	urlsAtivas:      set UrlEmitida,
	acessoRoteiro:   Usuario -> set Roteiro,
	notifs:          set Notif,
	ativos:          set Usuario,
	professores:     set Usuario,
	chefes:          set Usuario,
	alunos:          set Usuario,
	versaoPerm:      Usuario -> one Int,
	claimVersao:     Usuario -> lone Int,
	comandos:        set Comando,
	recibos:         OpId -> lone Comando
}

// ---- Predicados reproduzidos de M12.1 (fronteira) ---------------------------

pred versaoCorrente[s: EstadoIntegrado, u: Usuario] {
	one s.claimVersao[u] and s.claimVersao[u] = s.versaoPerm[u]
}
pred authOk[s: EstadoIntegrado, u: Usuario] {
	u in s.ativos and versaoCorrente[s, u]
}
pred temVinculo[s: EstadoIntegrado, u: Usuario, t: Turma] {
	some v: s.vinculos | v.vAluno = u and v.vTurma = t
}
pred ehDono[s: EstadoIntegrado, u: Usuario, t: Turma] { s.donoT[t] = u }
pred participa[s: EstadoIntegrado, u: Usuario, t: Turma] {
	temVinculo[s, u, t] or ehDono[s, u, t]
}
pred podeCriarPost[s: EstadoIntegrado, u: Usuario, t: Turma] {
	authOk[s, u] and u in s.professores and s.donoT[t] = u
	and s.statusT[t] = Ativo
}
pred podeEditarPost[s: EstadoIntegrado, u: Usuario, p: Post] {
	authOk[s, u] and s.postAutor[p] = u and s.statusT[s.postTurma[p]] = Ativo
}
pred podeRemoverPost[s: EstadoIntegrado, u: Usuario, p: Post] {
	authOk[s, u] and s.statusT[s.postTurma[p]] = Ativo
	and (s.postAutor[p] = u or u in s.chefes)
}
pred acessoRoteiroValidado[s: EstadoIntegrado, u: Usuario, rot: Roteiro] {
	rot in s.acessoRoteiro[u]
}

// ---- Predicados reproduzidos de M12.2 ---------------------------------------

pred proprietario[s: EstadoIntegrado, u: Usuario, r: Roteiro] { s.roteiroDono[r] = u }
pred compartilhadoAtual[s: EstadoIntegrado, u: Usuario, r: Roteiro] {
	some c: s.compartilhados | c.cRoteiro = r and c.cProfessor = u
}
pred roteiroPublicavel[s: EstadoIntegrado, r: Roteiro] {
	s.roteiroStatus[r] = Publicavel and one s.geracaoValida[r] and one s.roteiroObj[r]
}
pred acessoProfessorRoteiro[s: EstadoIntegrado, u: Usuario, r: Roteiro] {
	authOk[s, u] and u in s.professores and roteiroPublicavel[s, r]
	and (proprietario[s, u, r] or compartilhadoAtual[s, u, r])
}
pred alunoAcessoPost[s: EstadoIntegrado, u: Usuario, p: Post] {
	u in s.alunos
	p in s.posts and p not in s.postRemovido
	and some v: s.vinculos | v.vAluno = u and v.vTurma = s.postTurma[p]
}
pred alunoPodeBaixar[s: EstadoIntegrado, u: Usuario, r: Roteiro] {
	some p: s.posts | alunoAcessoPost[s, u, p]
		and (some x: s.anexos | x.aPost = p and x.aRoteiro = r)
}
pred escopoQ13[s: EstadoIntegrado, u: Usuario, r: Roteiro] {
	some aq: s.auditorias | aq.aqChefe = u and aq.aqRoteiro = r
}
pred podeEmitirUrl[s: EstadoIntegrado, u: Usuario, r: Roteiro] {
	authOk[s, u] and roteiroPublicavel[s, r] and (
		(u in s.professores and (proprietario[s, u, r] or compartilhadoAtual[s, u, r]))
		or alunoPodeBaixar[s, u, r]
		or (u in s.chefes and escopoQ13[s, u, r]))
}
pred podeUsarUrl[s: EstadoIntegrado, url: UrlEmitida] {
	url in s.urlsAtivas
}

// ---- Ponte de composição ----------------------------------------------------
// Refinamento aditivo unidirecional: todo acesso abstrato de M12.1 é fundamentado
// no acesso concreto de M12.2 (objeto, geração canônica e posse/compartilhamento
// atual). M12.1 não prova `geracao`.
pred ponteAcessoRoteiro[s: EstadoIntegrado] {
	all u: Usuario, rot: Roteiro |
		acessoRoteiroValidado[s, u, rot] implies acessoProfessorRoteiro[s, u, rot]
}

// ---- Coerência integrada ----------------------------------------------------
pred coerenteComposta[s: EstadoIntegrado] {
	ponteAcessoRoteiro[s]
	all t: s.turmas | one s.statusT[t] and one s.donoT[t] and s.donoT[t] in s.professores
	all p: s.posts | one s.postTurma[p] and one s.postAutor[p]
		and s.postTurma[p] in s.turmas
		and s.postAutor[p] = s.donoT[s.postTurma[p]]
		and s.postAutor[p] in s.professores
	all v: s.vinculos | v.vTurma in s.turmas
	all disj v1, v2: s.vinculos |
		v1.vAluno != v2.vAluno or v1.vTurma != v2.vTurma
	// Vínculo é matrícula de aluno corrente ou de ex-aluno promovido a Chefe.
	all v: s.vinculos | v.vAluno in s.alunos or v.vAluno in s.chefes
	no u: Usuario | u in s.chefes and u in s.professores
	no u: Usuario | u in s.chefes and u in s.alunos
	all r: s.roteiros | one s.roteiroDono[r] and one s.roteiroStatus[r]
		and s.roteiroDono[r] in s.professores
		and (s.roteiroStatus[r] = Provisorio
			or (one s.roteiroObj[r] and one s.geracaoValida[r]
				and s.geracaoValida[r] = s.objetoGeracao[s.roteiroObj[r]]))
	all c: s.compartilhados | c.cRoteiro in s.roteiros
		and s.roteiroStatus[c.cRoteiro] = Publicavel
		and c.cProfessor in s.professores
		and c.cProfessor != s.roteiroDono[c.cRoteiro]
	all disj c1, c2: s.compartilhados |
		c1.cRoteiro != c2.cRoteiro or c1.cProfessor != c2.cProfessor
	all x: s.anexos | x.aPost in s.posts and x.aRoteiro in s.roteiros
		and one s.geracaoValida[x.aRoteiro]
		and x.aGeracao = s.geracaoValida[x.aRoteiro]
	all disj x1, x2: s.anexos | x1.aPost != x2.aPost
	all h: s.histsAnexo | h.hPost in s.posts and h.hRoteiro in s.roteiros
	all aq: s.auditorias | aq.aqChefe in s.chefes and aq.aqRoteiro in s.roteiros
		and aq.aqPost in s.posts and aq.aqPost in s.postRemovido
		and (some x: s.anexos | x.aPost = aq.aqPost and x.aRoteiro = aq.aqRoteiro)
	all url: s.urls | url.uRoteiro in s.roteiros
		and one s.geracaoValida[url.uRoteiro]
		and url.uGeracao = s.geracaoValida[url.uRoteiro]
	all url: s.urlsAtivas | url in s.urls
	all n: s.notifs | n.nAlvo in s.posts
	all u: Usuario | s.versaoPerm[u] >= 0
	all o: s.comandos | s.recibos[o.cmdId] = o
	all disj c1, c2: s.comandos |
		(c1.cmdUid = c2.cmdUid and c1.cmdTipo = c2.cmdTipo
			and c1.cmdPayload = c2.cmdPayload) implies c1.cmdId = c2.cmdId
	all disj c1, c2: s.comandos | c1.cmdId != c2.cmdId
}

// ---- Frames auxiliares ------------------------------------------------------
pred fTurmaS[a, b: EstadoIntegrado] {
	b.turmas = a.turmas and b.statusT = a.statusT and b.donoT = a.donoT
}
pred fVincS[a, b: EstadoIntegrado] { b.vinculos = a.vinculos }
pred fPostS[a, b: EstadoIntegrado] {
	b.posts = a.posts and b.postTurma = a.postTurma and b.postAutor = a.postAutor
	and b.postRemovido = a.postRemovido
}
pred fRotS[a, b: EstadoIntegrado] {
	b.roteiros = a.roteiros and b.roteiroDono = a.roteiroDono
	and b.roteiroStatus = a.roteiroStatus and b.roteiroObj = a.roteiroObj
}
pred fObjS[a, b: EstadoIntegrado] { b.objetoGeracao = a.objetoGeracao }
pred fGerS[a, b: EstadoIntegrado] { b.geracaoValida = a.geracaoValida }
pred fCompS[a, b: EstadoIntegrado] { b.compartilhados = a.compartilhados }
pred fAnexS[a, b: EstadoIntegrado] { b.anexos = a.anexos }
pred fHistS[a, b: EstadoIntegrado] { b.histsAnexo = a.histsAnexo }
pred fAudS[a, b: EstadoIntegrado] { b.auditorias = a.auditorias }
pred fUrlS[a, b: EstadoIntegrado] { b.urls = a.urls and b.urlsAtivas = a.urlsAtivas }
pred fAcessoS[a, b: EstadoIntegrado] { b.acessoRoteiro = a.acessoRoteiro }
pred fNotifS[a, b: EstadoIntegrado] { b.notifs = a.notifs }
pred fPessS[a, b: EstadoIntegrado] {
	b.ativos = a.ativos and b.professores = a.professores and b.chefes = a.chefes
	and b.alunos = a.alunos and b.versaoPerm = a.versaoPerm
	and b.claimVersao = a.claimVersao
}
pred fM7S[a, b: EstadoIntegrado] { b.comandos = a.comandos and b.recibos = a.recibos }
pred registraComandoS[a, b: EstadoIntegrado, o: Comando] {
	o not in a.comandos and no a.recibos[o.cmdId]
	b.comandos = a.comandos + o
	b.recibos = a.recibos ++ (o.cmdId -> o)
}

// ---- Transições compostas ---------------------------------------------------
// Publica Post com anexo: dono/professor com acesso abstrato M12.1 E concreto
// M12.2; snapshot com geração canônica. Efeito M7 mínimo (comando+recibo+notif).
pred publicarPostComAnexo[a, b: EstadoIntegrado, t: Turma, u: Usuario, p: Post,
		rot: Roteiro, x: AnexoPost, n: Notif, o: Comando] {
	coerenteComposta[a]
	podeCriarPost[a, u, t]
	acessoRoteiroValidado[a, u, rot]
	acessoProfessorRoteiro[a, u, rot]
	roteiroPublicavel[a, rot]
	p not in a.posts
	no y: a.anexos | y.aPost = p
	x not in a.anexos and x.aPost = p and x.aRoteiro = rot
	x.aGeracao = a.geracaoValida[rot]
	n not in a.notifs and n.nAlvo = p and n.nOperacao = o.cmdId
	o.cmdUid = u and o.cmdTipo = TCriarPost
	fTurmaS[a, b] and fVincS[a, b] and fRotS[a, b] and fObjS[a, b] and fGerS[a, b]
	fCompS[a, b] and fHistS[a, b] and fAudS[a, b] and fUrlS[a, b] and fAcessoS[a, b]
	fPessS[a, b]
	b.posts = a.posts + p
	b.postTurma = a.postTurma ++ (p -> t)
	b.postAutor = a.postAutor ++ (p -> u)
	b.postRemovido = a.postRemovido
	b.anexos = a.anexos + x
	b.notifs = a.notifs + n
	registraComandoS[a, b, o]
	coerenteComposta[b]
}
pred compartilharRoteiro[a, b: EstadoIntegrado, u: Usuario, r: Roteiro,
		dest: Usuario, cc: Compartilhamento, o: Comando] {
	coerenteComposta[a]
	authOk[a, u] and proprietario[a, u, r] and roteiroPublicavel[a, r]
	authOk[a, dest] and dest in a.professores and dest != u
	cc not in a.compartilhados and cc.cRoteiro = r and cc.cProfessor = dest
	o.cmdUid = u and o.cmdTipo = TCompartilhar
	fTurmaS[a, b] and fVincS[a, b] and fPostS[a, b] and fRotS[a, b] and fObjS[a, b]
	fGerS[a, b] and fAnexS[a, b] and fHistS[a, b] and fAudS[a, b] and fUrlS[a, b]
	fNotifS[a, b] and fPessS[a, b]
	b.compartilhados = a.compartilhados + cc
	b.acessoRoteiro = a.acessoRoteiro + (dest -> r) + (u -> r)
	registraComandoS[a, b, o]
	coerenteComposta[b]
}
pred revogarCompartilhamentoComposto[a, b: EstadoIntegrado, u: Usuario,
		r: Roteiro, dest: Usuario, o: Comando] {
	coerenteComposta[a]
	authOk[a, u] and proprietario[a, u, r]
	some c: a.compartilhados | c.cRoteiro = r and c.cProfessor = dest
	o.cmdUid = u and o.cmdTipo = TRevogar
	fTurmaS[a, b] and fVincS[a, b] and fPostS[a, b] and fRotS[a, b] and fObjS[a, b]
	fGerS[a, b] and fAnexS[a, b] and fHistS[a, b] and fAudS[a, b] and fUrlS[a, b]
	fNotifS[a, b] and fPessS[a, b]
	b.compartilhados = a.compartilhados
		- {c: a.compartilhados | c.cRoteiro = r and c.cProfessor = dest}
	b.acessoRoteiro = a.acessoRoteiro - (dest -> r)
	registraComandoS[a, b, o]
	coerenteComposta[b]
}
// Edição que mantém/troca o anexo exige acesso atual; a desvinculação não.
pred manterAnexoComposto[a, b: EstadoIntegrado, p: Post, r: Roteiro,
		u: Usuario, o: Comando] {
	coerenteComposta[a]
	authOk[a, u] and a.postAutor[p] = u
	p not in a.postRemovido and a.statusT[a.postTurma[p]] = Ativo
	acessoProfessorRoteiro[a, u, r]
	some y: a.anexos | y.aPost = p and y.aRoteiro = r
	o.cmdUid = u and o.cmdTipo = TManter
	fTurmaS[a, b] and fVincS[a, b] and fPostS[a, b] and fRotS[a, b] and fObjS[a, b]
	fGerS[a, b] and fCompS[a, b] and fAnexS[a, b] and fHistS[a, b] and fAudS[a, b]
	fUrlS[a, b] and fAcessoS[a, b] and fNotifS[a, b] and fPessS[a, b]
	registraComandoS[a, b, o]
	coerenteComposta[b]
}
pred desvincularPostComposto[a, b: EstadoIntegrado, p: Post, u: Usuario,
		hx: HistAnexo, o: Comando] {
	coerenteComposta[a]
	authOk[a, u] and a.postAutor[p] = u
	a.statusT[a.postTurma[p]] = Ativo
	some y: a.anexos | y.aPost = p
	hx not in a.histsAnexo
	(some y: a.anexos | y.aPost = p and hx.hPost = p
		and hx.hRoteiro = y.aRoteiro and hx.hGeracao = y.aGeracao)
	o.cmdUid = u and o.cmdTipo = TDesanexar
	fTurmaS[a, b] and fVincS[a, b] and fPostS[a, b] and fRotS[a, b] and fObjS[a, b]
	fGerS[a, b] and fCompS[a, b] and fAudS[a, b] and fUrlS[a, b] and fAcessoS[a, b]
	fNotifS[a, b] and fPessS[a, b]
	b.anexos = a.anexos - {y: a.anexos | y.aPost = p}
	b.histsAnexo = a.histsAnexo + hx
	registraComandoS[a, b, o]
	coerenteComposta[b]
}
// Remoção da apresentação preserva Post, anexo e histórico (Q09).
pred removerPostApresentacaoComposto[a, b: EstadoIntegrado, p: Post, u: Usuario,
		o: Comando] {
	coerenteComposta[a]
	authOk[a, u]
	(a.postAutor[p] = u or u in a.chefes)
	a.statusT[a.postTurma[p]] = Ativo
	p not in a.postRemovido
	o.cmdUid = u and o.cmdTipo = TRemoverPost
	fTurmaS[a, b] and fVincS[a, b] and fRotS[a, b] and fObjS[a, b] and fGerS[a, b]
	fCompS[a, b] and fAnexS[a, b] and fHistS[a, b] and fAudS[a, b] and fUrlS[a, b]
	fAcessoS[a, b] and fNotifS[a, b] and fPessS[a, b]
	b.postRemovido = a.postRemovido + p
	b.posts = a.posts and b.postTurma = a.postTurma and b.postAutor = a.postAutor
	registraComandoS[a, b, o]
	coerenteComposta[b]
}
pred emitirUrlComposto[a, b: EstadoIntegrado, r: Roteiro, u: Usuario,
		url: UrlEmitida, o: Comando] {
	coerenteComposta[a]
	podeEmitirUrl[a, u, r]
	url not in a.urls and url.uRoteiro = r and url.uUid = u
	url.uGeracao = a.geracaoValida[r]
	o.cmdUid = u and o.cmdTipo = TEmitirUrl
	fTurmaS[a, b] and fVincS[a, b] and fPostS[a, b] and fRotS[a, b] and fObjS[a, b]
	fGerS[a, b] and fCompS[a, b] and fAnexS[a, b] and fHistS[a, b] and fAudS[a, b]
	fAcessoS[a, b] and fNotifS[a, b] and fPessS[a, b]
	b.urls = a.urls + url
	b.urlsAtivas = a.urlsAtivas + url
	registraComandoS[a, b, o]
	coerenteComposta[b]
}
pred registrarAuditoriaQ13Composto[a, b: EstadoIntegrado, u: Usuario, p: Post,
		r: Roteiro, aq: AuditoriaQ13, o: Comando] {
	coerenteComposta[a]
	authOk[a, u] and u in a.chefes
	p in a.postRemovido
	some x: a.anexos | x.aPost = p and x.aRoteiro = r
	aq not in a.auditorias
	aq.aqChefe = u and aq.aqRoteiro = r and aq.aqPost = p
	o.cmdUid = u and o.cmdTipo = TAuditar
	fTurmaS[a, b] and fVincS[a, b] and fPostS[a, b] and fRotS[a, b] and fObjS[a, b]
	fGerS[a, b] and fCompS[a, b] and fAnexS[a, b] and fHistS[a, b] and fUrlS[a, b]
	fAcessoS[a, b] and fNotifS[a, b] and fPessS[a, b]
	b.auditorias = a.auditorias + aq
	registraComandoS[a, b, o]
	coerenteComposta[b]
}
pred expirarUrlComposto[a, b: EstadoIntegrado, url: UrlEmitida] {
	coerenteComposta[a]
	url in a.urlsAtivas
	fTurmaS[a, b] and fVincS[a, b] and fPostS[a, b] and fRotS[a, b] and fObjS[a, b]
	fGerS[a, b] and fCompS[a, b] and fAnexS[a, b] and fHistS[a, b] and fAudS[a, b]
	fAcessoS[a, b] and fNotifS[a, b] and fPessS[a, b] and fM7S[a, b]
	b.urls = a.urls
	b.urlsAtivas = a.urlsAtivas - url
	coerenteComposta[b]
}
// M9/M11: revogação de vínculo e refresh de claim.
pred revogarVinculoComposto[a, b: EstadoIntegrado, u: Usuario, t: Turma] {
	coerenteComposta[a]
	temVinculo[a, u, t]
	authOk[a, u]
	a.versaoPerm[u] < 7
	fTurmaS[a, b] and fPostS[a, b] and fRotS[a, b] and fObjS[a, b] and fGerS[a, b]
	fCompS[a, b] and fAnexS[a, b] and fHistS[a, b] and fAudS[a, b] and fUrlS[a, b]
	fAcessoS[a, b] and fNotifS[a, b] and fM7S[a, b]
	b.ativos = a.ativos and b.professores = a.professores and b.chefes = a.chefes
	b.alunos = a.alunos
	b.claimVersao = a.claimVersao
	b.vinculos = a.vinculos - {v: a.vinculos | v.vAluno = u and v.vTurma = t}
	b.versaoPerm = a.versaoPerm ++ (u -> plus[a.versaoPerm[u], 1])
	coerenteComposta[b]
}
pred atualizarClaimComposto[a, b: EstadoIntegrado, u: Usuario] {
	coerenteComposta[a]
	fTurmaS[a, b] and fVincS[a, b] and fPostS[a, b] and fRotS[a, b] and fObjS[a, b]
	fGerS[a, b] and fCompS[a, b] and fAnexS[a, b] and fHistS[a, b] and fAudS[a, b]
	fUrlS[a, b] and fAcessoS[a, b] and fNotifS[a, b] and fM7S[a, b]
	b.ativos = a.ativos and b.professores = a.professores and b.chefes = a.chefes
	b.alunos = a.alunos
	b.versaoPerm = a.versaoPerm
	b.claimVersao = a.claimVersao ++ (u -> a.versaoPerm[u])
	coerenteComposta[b]
}
// Lacuna M9/M11: mudança para Chefe não elimina vínculos acadêmicos.
pred promoverChefeComposto[a, b: EstadoIntegrado, u: Usuario] {
	coerenteComposta[a]
	authOk[a, u]
	u not in a.chefes and u in a.alunos
	fTurmaS[a, b] and fVincS[a, b] and fPostS[a, b] and fRotS[a, b] and fObjS[a, b]
	fGerS[a, b] and fCompS[a, b] and fAnexS[a, b] and fHistS[a, b] and fAudS[a, b]
	fUrlS[a, b] and fAcessoS[a, b] and fNotifS[a, b] and fM7S[a, b]
	b.ativos = a.ativos and b.professores = a.professores
	b.versaoPerm = a.versaoPerm and b.claimVersao = a.claimVersao
	b.chefes = a.chefes + u
	b.alunos = a.alunos - u
	coerenteComposta[b]
}
pred retryM7Composto[a, b: EstadoIntegrado, o: Comando] {
	coerenteComposta[a]
	o in a.comandos and a.recibos[o.cmdId] = o
	b = a
}

// Disjunção das transições compostas (sem promoverChefeComposto, usado nos
// cenários de papel). Cada transição já conjoin `coerenteComposta[b]`.
pred transicaoComposta[a, b: EstadoIntegrado] {
	some t: Turma, u, dest: Usuario, p: Post, r: Roteiro, x: AnexoPost,
		n: Notif, cc: Compartilhamento, hx: HistAnexo, aq: AuditoriaQ13,
		url: UrlEmitida, o: Comando |
		publicarPostComAnexo[a, b, t, u, p, r, x, n, o]
		or compartilharRoteiro[a, b, u, r, dest, cc, o]
		or revogarCompartilhamentoComposto[a, b, u, r, dest, o]
		or manterAnexoComposto[a, b, p, r, u, o]
		or desvincularPostComposto[a, b, p, u, hx, o]
		or removerPostApresentacaoComposto[a, b, p, u, o]
		or emitirUrlComposto[a, b, r, u, url, o]
		or registrarAuditoriaQ13Composto[a, b, u, p, r, aq, o]
		or expirarUrlComposto[a, b, url]
		or revogarVinculoComposto[a, b, u, t]
		or atualizarClaimComposto[a, b, u]
		or retryM7Composto[a, b, o]
}

// ---- Assertions: composição M12.1 x M12.2 -----------------------------------
// (a) Publicação: projeção M12.1 + acesso concreto + geração canônica.
assert PublicacaoCompostaExigeDono {
	all a, b: EstadoIntegrado, t: Turma, u: Usuario, p: Post, r: Roteiro,
			x: AnexoPost, n: Notif, o: Comando |
		publicarPostComAnexo[a, b, t, u, p, r, x, n, o]
			implies (u in a.professores and podeCriarPost[a, u, t]
				and b.postAutor[p] = u)
}
assert PublicacaoCompostaRefinaAcessoM12_1 {
	all a, b: EstadoIntegrado, t: Turma, u: Usuario, p: Post, r: Roteiro,
			x: AnexoPost, n: Notif, o: Comando |
		publicarPostComAnexo[a, b, t, u, p, r, x, n, o]
			implies acessoRoteiroValidado[a, u, r]
}
assert SemAcessoM12_1NaoPublicaComposto {
	all a: EstadoIntegrado, t: Turma, u: Usuario, p: Post, r: Roteiro,
			x: AnexoPost, n: Notif, o: Comando |
		(coerenteComposta[a] and not acessoRoteiroValidado[a, u, r])
			implies (no b: EstadoIntegrado | publicarPostComAnexo[a, b, t, u, p, r, x, n, o])
}
assert PublicacaoCompostaProvaGeracao {
	all a, b: EstadoIntegrado, t: Turma, u: Usuario, p: Post, r: Roteiro,
			x: AnexoPost, n: Notif, o: Comando |
		publicarPostComAnexo[a, b, t, u, p, r, x, n, o]
			implies (x.aGeracao = a.geracaoValida[r]
				and a.geracaoValida[r] = a.objetoGeracao[a.roteiroObj[r]])
}
assert AnexoCompostoUsaGeracaoCanonica {
	all s: EstadoIntegrado, x: AnexoPost |
		(coerenteComposta[s] and x in s.anexos) implies
			x.aGeracao = s.geracaoValida[x.aRoteiro]
}
assert TerceiroNaoPublicaComAnexo {
	all a, b: EstadoIntegrado, t: Turma, u: Usuario, p: Post, r: Roteiro,
			x: AnexoPost, n: Notif, o: Comando |
		publicarPostComAnexo[a, b, t, u, p, r, x, n, o]
			implies (u = a.donoT[t] and b.postAutor[p] = u)
}
assert ProvisorioNaoPublicaComAnexo {
	all a: EstadoIntegrado, t: Turma, u: Usuario, p: Post, r: Roteiro,
			x: AnexoPost, n: Notif, o: Comando |
		(coerenteComposta[a] and a.roteiroStatus[r] = Provisorio)
			implies (no b: EstadoIntegrado | publicarPostComAnexo[a, b, t, u, p, r, x, n, o])
}
assert ValidadoNaoPublicaComAnexo {
	all a: EstadoIntegrado, t: Turma, u: Usuario, p: Post, r: Roteiro,
			x: AnexoPost, n: Notif, o: Comando |
		(coerenteComposta[a] and a.roteiroStatus[r] = Validado)
			implies (no b: EstadoIntegrado | publicarPostComAnexo[a, b, t, u, p, r, x, n, o])
}
assert GeracaoDivergenteNaoPublicaComAnexo {
	all a, b: EstadoIntegrado, t: Turma, u: Usuario, p: Post, r: Roteiro,
			x: AnexoPost, n: Notif, o: Comando |
		(coerenteComposta[a] and x.aGeracao != a.geracaoValida[r])
			implies not publicarPostComAnexo[a, b, t, u, p, r, x, n, o]
}
assert CompartilhamentoCompostoSoPublicavel {
	all a, b: EstadoIntegrado, u: Usuario, r: Roteiro, dest: Usuario,
			cc: Compartilhamento, o: Comando |
		compartilharRoteiro[a, b, u, r, dest, cc, o] implies roteiroPublicavel[a, r]
}
assert AcessoCompartilhadoFundamentaM12_1 {
	all a, b: EstadoIntegrado, u: Usuario, r: Roteiro, dest: Usuario,
			cc: Compartilhamento, o: Comando |
		compartilharRoteiro[a, b, u, r, dest, cc, o]
			implies acessoRoteiroValidado[b, dest, r]
}

// (b) Revogação Q09.
assert RevogacaoCompostaPreservaPost {
	all a, b: EstadoIntegrado, u: Usuario, r: Roteiro, dest: Usuario, o: Comando |
		revogarCompartilhamentoComposto[a, b, u, r, dest, o]
			implies b.posts = a.posts and b.postRemovido = a.postRemovido
}
assert RevogacaoCompostaPreservaAnexo {
	all a, b: EstadoIntegrado, u: Usuario, r: Roteiro, dest: Usuario, o: Comando |
		revogarCompartilhamentoComposto[a, b, u, r, dest, o]
			implies b.anexos = a.anexos and b.histsAnexo = a.histsAnexo
}
assert RevogacaoCompostaPreservaObjeto {
	all a, b: EstadoIntegrado, u: Usuario, r: Roteiro, dest: Usuario, o: Comando |
		revogarCompartilhamentoComposto[a, b, u, r, dest, o]
			implies (b.roteiros = a.roteiros and b.roteiroDono = a.roteiroDono
				and b.roteiroObj = a.roteiroObj and b.objetoGeracao = a.objetoGeracao
				and b.geracaoValida = a.geracaoValida)
}
assert RevogacaoCompostaPreservaUrls {
	all a, b: EstadoIntegrado, u: Usuario, r: Roteiro, dest: Usuario, o: Comando |
		revogarCompartilhamentoComposto[a, b, u, r, dest, o] implies b.urls = a.urls
}
assert RevogadoNaoMantemAnexoSemAcesso {
	all a: EstadoIntegrado, p: Post, r: Roteiro, u: Usuario, o: Comando |
		(coerenteComposta[a] and not acessoProfessorRoteiro[a, u, r])
			implies (no b: EstadoIntegrado | manterAnexoComposto[a, b, p, r, u, o])
}
assert DesvinculacaoNaoExigeAcesso {
	all a, b: EstadoIntegrado, p: Post, u: Usuario, hx: HistAnexo, o: Comando |
		desvincularPostComposto[a, b, p, u, hx, o] implies a.postAutor[p] = u
}
assert HistoricoAnexoCompostoPreservado {
	all a, b: EstadoIntegrado, p: Post, u: Usuario, hx: HistAnexo, o: Comando |
		desvincularPostComposto[a, b, p, u, hx, o] implies a.histsAnexo in b.histsAnexo
}
assert DesvinculoConservaObjeto {
	all a, b: EstadoIntegrado, p: Post, u: Usuario, hx: HistAnexo, o: Comando |
		desvincularPostComposto[a, b, p, u, hx, o]
			implies (b.roteiros = a.roteiros and b.roteiroObj = a.roteiroObj
				and b.objetoGeracao = a.objetoGeracao)
}

// (c) Download do aluno: papel + vínculo atual; ex-aluno; Post removido; URL.
assert RotaAcademicaExigePapelEVinculo {
	all s: EstadoIntegrado, u: Usuario, r: Roteiro |
		alunoPodeBaixar[s, u, r] implies
			(u in s.alunos and (some v: s.vinculos | v.vAluno = u)
				and (some p: s.posts | alunoAcessoPost[s, u, p]))
}
assert PostRemovidoNaoBaixaComposto {
	all s: EstadoIntegrado, u: Usuario, p: Post |
		(coerenteComposta[s] and p in s.postRemovido) implies not alunoAcessoPost[s, u, p]
}
assert ChefeComVinculoLegadoNaoBaixaComposto {
	all s: EstadoIntegrado, u: Usuario, r: Roteiro |
		(coerenteComposta[s] and u in s.chefes and u not in s.alunos)
			implies not alunoPodeBaixar[s, u, r]
}
assert ClaimAntigaNaoAutorizaComposto {
	all s: EstadoIntegrado, u: Usuario, r: Roteiro |
		(coerenteComposta[s] and not versaoCorrente[s, u])
			implies (not authOk[s, u] and not podeEmitirUrl[s, u, r])
}
assert UrlEmitidaCompostaSobreviveRevogacao {
	all a, b: EstadoIntegrado, u: Usuario, r: Roteiro, dest: Usuario, o: Comando |
		revogarCompartilhamentoComposto[a, b, u, r, dest, o] implies b.urls = a.urls
}
assert UrlExpiradaNaoUsavelComposto {
	all s: EstadoIntegrado, url: UrlEmitida |
		(coerenteComposta[s] and url in s.urls and url not in s.urlsAtivas)
			implies not podeUsarUrl[s, url]
}
assert UrlAtivaUsavelComposto {
	all s: EstadoIntegrado, url: UrlEmitida |
		(coerenteComposta[s] and url in s.urlsAtivas) implies podeUsarUrl[s, url]
}

// (d) Chefe: só Q13; sem criar/compartilhar alheio; turma arquivada.
assert ChefeNaoPublicaPostComposto {
	all a, b: EstadoIntegrado, t: Turma, u: Usuario, p: Post, r: Roteiro,
			x: AnexoPost, n: Notif, o: Comando |
		publicarPostComAnexo[a, b, t, u, p, r, x, n, o] implies u not in a.chefes
}
assert ChefeNaoCompartilhaComposto {
	all a, b: EstadoIntegrado, u: Usuario, r: Roteiro, dest: Usuario,
			cc: Compartilhamento, o: Comando |
		compartilharRoteiro[a, b, u, r, dest, cc, o] implies u not in a.chefes
}
assert ChefeSemEscopoNaoEmiteComposto {
	all s: EstadoIntegrado, u: Usuario, r: Roteiro |
		(coerenteComposta[s] and u in s.chefes and not escopoQ13[s, u, r])
			implies not podeEmitirUrl[s, u, r]
}
assert EscopoQ13CompostoExigePostRemovido {
	all s: EstadoIntegrado, aq: AuditoriaQ13 |
		(coerenteComposta[s] and aq in s.auditorias) implies
			(aq.aqPost in s.postRemovido
				and (some x: s.anexos | x.aPost = aq.aqPost and x.aRoteiro = aq.aqRoteiro))
}
assert TurmaArquivadaNegaEscritaComposta {
	all a: EstadoIntegrado, t: Turma, p: Post |
		(coerenteComposta[a] and a.statusT[t] = Arquivada
			and p in a.posts and a.postTurma[p] = t) implies not (
			(some b: EstadoIntegrado, u: Usuario, r: Roteiro, x: AnexoPost,
					n: Notif, o: Comando |
				publicarPostComAnexo[a, b, t, u, p, r, x, n, o])
			or (some b: EstadoIntegrado, u: Usuario, r: Roteiro, o: Comando |
				manterAnexoComposto[a, b, p, r, u, o])
			or (some b: EstadoIntegrado, u: Usuario, hx: HistAnexo, o: Comando |
				desvincularPostComposto[a, b, p, u, hx, o])
			or (some b: EstadoIntegrado, u: Usuario, o: Comando |
				removerPostApresentacaoComposto[a, b, p, u, o])
		)
}
assert ChefeAnexoSoQ13 {
	all s: EstadoIntegrado, u: Usuario, r: Roteiro |
		(coerenteComposta[s] and u in s.chefes) implies
			(not acessoProfessorRoteiro[s, u, r] and not alunoPodeBaixar[s, u, r])
}

// (e) M7/M9: receipt, retry, reuso e revalidação no commit.
assert PrimeiraExecucaoCompostaProduzReceipt {
	all a, b: EstadoIntegrado, t: Turma, u, dest: Usuario, p: Post, r: Roteiro,
			x: AnexoPost, n: Notif, cc: Compartilhamento, hx: HistAnexo,
			aq: AuditoriaQ13, url: UrlEmitida, o: Comando |
		(publicarPostComAnexo[a, b, t, u, p, r, x, n, o]
			or compartilharRoteiro[a, b, u, r, dest, cc, o]
			or revogarCompartilhamentoComposto[a, b, u, r, dest, o]
			or manterAnexoComposto[a, b, p, r, u, o]
			or desvincularPostComposto[a, b, p, u, hx, o]
			or removerPostApresentacaoComposto[a, b, p, u, o]
			or registrarAuditoriaQ13Composto[a, b, u, p, r, aq, o]
			or emitirUrlComposto[a, b, r, u, url, o])
			implies (o in b.comandos and b.recibos[o.cmdId] = o and o not in a.comandos)
}
assert RetryCompostoNaoDuplicaFato {
	all a, b: EstadoIntegrado, o: Comando |
		retryM7Composto[a, b, o] implies
			(b = a and b.posts = a.posts and b.anexos = a.anexos
				and b.histsAnexo = a.histsAnexo and b.compartilhados = a.compartilhados
				and b.notifs = a.notifs and b.urls = a.urls)
}
assert ReusoIncompativelCompostoNaoHerda {
	all a: EstadoIntegrado, o2: Comando |
		(coerenteComposta[a] and (some o1: a.comandos | o1.cmdId = o2.cmdId and o1 != o2))
			implies not (
				(some b: EstadoIntegrado, t: Turma, u: Usuario, p: Post, r: Roteiro,
						x: AnexoPost, n: Notif |
					publicarPostComAnexo[a, b, t, u, p, r, x, n, o2])
				or (some b: EstadoIntegrado, u: Usuario, r: Roteiro, dest: Usuario,
						cc: Compartilhamento |
					compartilharRoteiro[a, b, u, r, dest, cc, o2])
				or (some b: EstadoIntegrado, u: Usuario, r: Roteiro, dest: Usuario |
					revogarCompartilhamentoComposto[a, b, u, r, dest, o2])
				or (some b: EstadoIntegrado, p: Post, r: Roteiro, u: Usuario |
					manterAnexoComposto[a, b, p, r, u, o2])
				or (some b: EstadoIntegrado, p: Post, u: Usuario, hx: HistAnexo |
					desvincularPostComposto[a, b, p, u, hx, o2])
				or (some b: EstadoIntegrado, p: Post, u: Usuario |
					removerPostApresentacaoComposto[a, b, p, u, o2])
				or (some b: EstadoIntegrado, r: Roteiro, u: Usuario, url: UrlEmitida |
					emitirUrlComposto[a, b, r, u, url, o2])
			)
}
assert RevogacaoVinculoCompostaImpedeCommit {
	all a, b: EstadoIntegrado, u: Usuario, t: Turma |
		revogarVinculoComposto[a, b, u, t] implies not authOk[b, u]
}
assert PromoverChefeCompostoPreservaVinculo {
	all a, b: EstadoIntegrado, u: Usuario |
		promoverChefeComposto[a, b, u] implies
			((some v: a.vinculos | v.vAluno = u)
				implies (some v: b.vinculos | v.vAluno = u))
}

// ---- Witnesses --------------------------------------------------------------
pred WitnessEstadoComposto {
	some s: EstadoIntegrado | coerenteComposta[s]
}
// Trajetória: compartilha roteiro publicável, publica Post com anexo, revoga e
// conserva Post/snapshot/histórico. (O ciclo provisório->publicável é provado em
// M12.2; aqui basta o estado publicável inicial.)
pred WitnessTrajetoriaCompartilhaRevoga {
	some a, b, c, d: EstadoIntegrado, u, dest: Usuario, t: Turma, r: Roteiro,
		cc: Compartilhamento, p: Post, x: AnexoPost, n: Notif,
		o1, o2, o3: Comando |
		coerenteComposta[a] and roteiroPublicavel[a, r] and authOk[a, u]
		and authOk[a, dest] and dest in a.professores
		and compartilharRoteiro[a, b, u, r, dest, cc, o1]
		and publicarPostComAnexo[b, c, t, u, p, r, x, n, o2]
		and revogarCompartilhamentoComposto[c, d, u, r, dest, o3]
		and c.posts = d.posts and c.anexos = d.anexos and c.histsAnexo = d.histsAnexo
		and not compartilhadoAtual[d, dest, r]
}
pred WitnessPublicaRoteiroCompartilhado {
	some a, b: EstadoIntegrado, dest: Usuario, r: Roteiro, t: Turma, p: Post,
		x: AnexoPost, n: Notif, o: Comando |
		coerenteComposta[a] and compartilhadoAtual[a, dest, r]
		and dest in a.professores and a.donoT[t] = dest and authOk[a, dest]
		and publicarPostComAnexo[a, b, t, dest, p, r, x, n, o]
		and not proprietario[a, dest, r]
}
pred WitnessProvisorioNaoPublica {
	some s: EstadoIntegrado, r: Roteiro |
		coerenteComposta[s] and r in s.roteiros and s.roteiroStatus[r] = Provisorio
		and (all t: Turma, u: Usuario, p: Post, x: AnexoPost, n: Notif, o: Comando |
			no b: EstadoIntegrado | publicarPostComAnexo[s, b, t, u, p, r, x, n, o])
}
pred WitnessValidadoNaoPublica {
	some s: EstadoIntegrado, r: Roteiro |
		coerenteComposta[s] and r in s.roteiros and s.roteiroStatus[r] = Validado
		and (all t: Turma, u: Usuario, p: Post, x: AnexoPost, n: Notif, o: Comando |
			no b: EstadoIntegrado | publicarPostComAnexo[s, b, t, u, p, r, x, n, o])
}
pred WitnessAlunoBaixaAtivo {
	some s: EstadoIntegrado, u: Usuario, r: Roteiro, p: Post |
		coerenteComposta[s] and alunoAcessoPost[s, u, p]
		and s.statusT[s.postTurma[p]] = Ativo
		and (some x: s.anexos | x.aPost = p and x.aRoteiro = r)
		and podeEmitirUrl[s, u, r]
}
pred WitnessAlunoBaixaArquivada {
	some s: EstadoIntegrado, u: Usuario, r: Roteiro, p: Post |
		coerenteComposta[s] and alunoAcessoPost[s, u, p]
		and s.statusT[s.postTurma[p]] = Arquivada
		and (some x: s.anexos | x.aPost = p and x.aRoteiro = r)
		and podeEmitirUrl[s, u, r]
}
pred WitnessExAlunoNaoBaixa {
	some a, b, c: EstadoIntegrado, u: Usuario, t: Turma, r: Roteiro, p: Post |
		coerenteComposta[a] and temVinculo[a, u, t] and authOk[a, u]
		and p in a.posts and a.postTurma[p] = t
		and (some x: a.anexos | x.aPost = p and x.aRoteiro = r)
		and revogarVinculoComposto[a, b, u, t]
		and atualizarClaimComposto[b, c, u]
		and authOk[c, u] and not temVinculo[c, u, t]
		and not alunoPodeBaixar[c, u, r] and not podeEmitirUrl[c, u, r]
}
pred WitnessPostRemovidoNaoBaixa {
	some a, b: EstadoIntegrado, u: Usuario, r: Roteiro, p: Post, o: Comando |
		coerenteComposta[a] and alunoAcessoPost[a, u, p]
		and (some x: a.anexos | x.aPost = p and x.aRoteiro = r)
		and removerPostApresentacaoComposto[a, b, p, a.postAutor[p], o]
		and not podeEmitirUrl[b, u, r]
}
pred WitnessRevogacaoPreservaHistorico {
	some a, b: EstadoIntegrado, u: Usuario, r: Roteiro, dest: Usuario, o: Comando |
		coerenteComposta[a] and compartilhadoAtual[a, dest, r]
		and revogarCompartilhamentoComposto[a, b, u, r, dest, o]
		and b.posts = a.posts and b.anexos = a.anexos and b.histsAnexo = a.histsAnexo
		and not compartilhadoAtual[b, dest, r]
}
pred WitnessDesvinculaSemAcesso {
	some a, b: EstadoIntegrado, p: Post, u: Usuario, hx: HistAnexo, o: Comando |
		desvincularPostComposto[a, b, p, u, hx, o]
		and (all r: Roteiro | not acessoProfessorRoteiro[a, u, r])
}
pred WitnessChefeComEscopoQ13 {
	some a, b, c: EstadoIntegrado, u: Usuario, r: Roteiro, p: Post,
		aq: AuditoriaQ13, url: UrlEmitida, o, o2: Comando |
		coerenteComposta[a] and u in a.chefes and authOk[a, u]
		and p in a.postRemovido
		and (some x: a.anexos | x.aPost = p and x.aRoteiro = r)
		and registrarAuditoriaQ13Composto[a, b, u, p, r, aq, o]
		and emitirUrlComposto[b, c, r, u, url, o2]
}
pred WitnessChefeSemEscopoNaoEmite {
	some s: EstadoIntegrado, u: Usuario, r: Roteiro |
		coerenteComposta[s] and u in s.chefes and authOk[s, u]
		and roteiroPublicavel[s, r]
		and (no aq: s.auditorias | aq.aqChefe = u and aq.aqRoteiro = r)
		and not podeEmitirUrl[s, u, r]
}
pred WitnessChefeComVinculoLegado {
	some a, b: EstadoIntegrado, u: Usuario, r: Roteiro, p: Post |
		coerenteComposta[a] and u in a.alunos and authOk[a, u]
		and p in a.posts and p not in a.postRemovido
		and (some v: a.vinculos | v.vAluno = u and v.vTurma = a.postTurma[p])
		and (some x: a.anexos | x.aPost = p and x.aRoteiro = r)
		and alunoPodeBaixar[a, u, r]
		and promoverChefeComposto[a, b, u]
		and (some v: b.vinculos | v.vAluno = u)
		and not alunoPodeBaixar[b, u, r] and not podeEmitirUrl[b, u, r]
}
pred WitnessUrlAtivaAposRevogacao {
	some a, b: EstadoIntegrado, u: Usuario, r: Roteiro, dest: Usuario,
		url: UrlEmitida, o: Comando |
		coerenteComposta[a] and url in a.urlsAtivas and url.uRoteiro = r
		and url.uUid = dest and compartilhadoAtual[a, dest, r]
		and revogarCompartilhamentoComposto[a, b, u, r, dest, o]
		and url in b.urls and url in b.urlsAtivas and podeUsarUrl[b, url]
}
pred WitnessTurmaArquivadaNegaEscrita {
	some a: EstadoIntegrado, t: Turma, p: Post |
		coerenteComposta[a] and a.statusT[t] = Arquivada
		and p in a.posts and a.postTurma[p] = t
		and (all u: Usuario, r: Roteiro, x: AnexoPost, n: Notif, hx: HistAnexo,
				o: Comando | no b: EstadoIntegrado |
			publicarPostComAnexo[a, b, t, u, p, r, x, n, o]
				or manterAnexoComposto[a, b, p, r, u, o]
				or desvincularPostComposto[a, b, p, u, hx, o]
				or removerPostApresentacaoComposto[a, b, p, u, o])
}
pred WitnessRetryComposto {
	some a, b: EstadoIntegrado, o: Comando |
		coerenteComposta[a] and o in a.comandos and a.recibos[o.cmdId] = o
		and retryM7Composto[a, b, o]
}
pred WitnessReusoIncompativelComposto {
	some a: EstadoIntegrado, o1, o2: Comando |
		coerenteComposta[a] and o1 in a.comandos and o1.cmdId = o2.cmdId and o1 != o2
}

// ---- Comandos ---------------------------------------------------------------
check PublicacaoCompostaExigeDono for 4
check PublicacaoCompostaRefinaAcessoM12_1 for 4
check SemAcessoM12_1NaoPublicaComposto for 4
check PublicacaoCompostaProvaGeracao for 4
check AnexoCompostoUsaGeracaoCanonica for 4
check TerceiroNaoPublicaComAnexo for 4
check ProvisorioNaoPublicaComAnexo for 4
check ValidadoNaoPublicaComAnexo for 4
check GeracaoDivergenteNaoPublicaComAnexo for 4
check CompartilhamentoCompostoSoPublicavel for 4
check AcessoCompartilhadoFundamentaM12_1 for 4
check RevogacaoCompostaPreservaPost for 4
check RevogacaoCompostaPreservaAnexo for 4
check RevogacaoCompostaPreservaObjeto for 4
check RevogacaoCompostaPreservaUrls for 4
check RevogadoNaoMantemAnexoSemAcesso for 4
check DesvinculacaoNaoExigeAcesso for 4
check HistoricoAnexoCompostoPreservado for 4
check DesvinculoConservaObjeto for 4
check RotaAcademicaExigePapelEVinculo for 4
check PostRemovidoNaoBaixaComposto for 4
check ChefeComVinculoLegadoNaoBaixaComposto for 4
check ClaimAntigaNaoAutorizaComposto for 4
check UrlEmitidaCompostaSobreviveRevogacao for 4
check UrlExpiradaNaoUsavelComposto for 4
check UrlAtivaUsavelComposto for 4
check ChefeNaoPublicaPostComposto for 4
check ChefeNaoCompartilhaComposto for 4
check ChefeSemEscopoNaoEmiteComposto for 4
check EscopoQ13CompostoExigePostRemovido for 4
check TurmaArquivadaNegaEscritaComposta for 4
check ChefeAnexoSoQ13 for 4
check PrimeiraExecucaoCompostaProduzReceipt for 4
check RetryCompostoNaoDuplicaFato for 4
check ReusoIncompativelCompostoNaoHerda for 4
check RevogacaoVinculoCompostaImpedeCommit for 4
check PromoverChefeCompostoPreservaVinculo for 4

run WitnessEstadoComposto for 4
run WitnessTrajetoriaCompartilhaRevoga for 5
run WitnessPublicaRoteiroCompartilhado for 4
run WitnessProvisorioNaoPublica for 4
run WitnessValidadoNaoPublica for 4
run WitnessAlunoBaixaAtivo for 4
run WitnessAlunoBaixaArquivada for 4
run WitnessExAlunoNaoBaixa for 5
run WitnessPostRemovidoNaoBaixa for 4
run WitnessRevogacaoPreservaHistorico for 4
run WitnessDesvinculaSemAcesso for 4
run WitnessChefeComEscopoQ13 for 5
run WitnessChefeSemEscopoNaoEmite for 4
run WitnessChefeComVinculoLegado for 4
run WitnessUrlAtivaAposRevogacao for 4
run WitnessTurmaArquivadaNegaEscrita for 4
run WitnessRetryComposto for 4
run WitnessReusoIncompativelComposto for 4
