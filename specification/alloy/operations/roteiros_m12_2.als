module operations/roteiros_m12_2

open util/integer

// M12.2 — Roteiros, compartilhamento, Storage/download e associação a Post.
//
// Modelo abstrato de dono imutável, upload provisório -> validado -> publicável,
// objeto e geração fixos, compartilhamento único, destinatário ativo, revogação
// Q09, ACL de professor versus acesso do aluno via vínculo canônico (M11) e Post
// acessível, Chefe em Q13, turma arquivada somente leitura, ex-aluno negado
// mesmo com claim atualizada, Post removido, anexar/trocar/manter/desvincular,
// histórico imutável, composição M7/M9 e a distinção entre nova emissão de URL
// (endpoint, revalida acesso) e uso de URL já emitida (validade temporal
// abstrata, sem revogação retroativa).
//
// Conteúdo binário, canonicalização/HMAC, Storage real, Rules, transações
// Firestore sob carga e concorrência física são abstrações explícitas e não são
// provados aqui. O objeto no Storage é modelado como imutável após a validação;
// a janela residual entre validar no Storage e vincular no Firestore não é
// atômica entre serviços (ver Seção 7.7).

// ---- Identidades e domínios fechados ----------------------------------------
sig Usuario {}
sig Turma {}
sig Post {}
sig Roteiro {}
sig Objeto {}
sig Geracao {}
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
// Escopo Q13: intervenção administrativa de moderação/auditoria da Chefia
// registrada (Q13) sobre um Post que referencia o roteiro. É o único caminho
// pelo qual o Chefe emite URL de roteiro; sem registro ativo, não emite.
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
sig Vinculo {
	vAluno: one Usuario,
	vTurma: one Turma
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
one sig TCadastrar, TValidar, TPublicar, TCompartilhar, TRevogar,
	TAnexar, TTrocar, TManter, TDesanexar, TRemoverPost, TAuditar,
	TEmitirUrl extends TipoCmd {}

// ---- Estado ----------------------------------------------------------------
sig Estado {
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
	// M9 abstrato
	ativos:          set Usuario,
	professores:     set Usuario,
	chefes:          set Usuario,
	versaoPerm:      Usuario -> one Int,
	claimVersao:     Usuario -> lone Int,
	// M7 abstrato
	comandos:        set Comando,
	recibos:         OpId -> lone Comando
}

// ---- Autorização e coerência ------------------------------------------------
pred versaoCorrente[s: Estado, u: Usuario] {
	one s.claimVersao[u] and s.claimVersao[u] = s.versaoPerm[u]
}
pred authOk[s: Estado, u: Usuario] {
	u in s.ativos and versaoCorrente[s, u]
}
pred temVinculo[s: Estado, u: Usuario, t: Turma] {
	some v: s.vinculos | v.vAluno = u and v.vTurma = t
}
pred temAlgumVinculo[s: Estado, u: Usuario] {
	some v: s.vinculos | v.vAluno = u
}
pred proprietario[s: Estado, u: Usuario, r: Roteiro] { s.roteiroDono[r] = u }
pred compartilhadoAtual[s: Estado, u: Usuario, r: Roteiro] {
	some c: s.compartilhados | c.cRoteiro = r and c.cProfessor = u
}
pred roteiroPublicavel[s: Estado, r: Roteiro] {
	s.roteiroStatus[r] = Publicavel and one s.geracaoValida[r] and one s.roteiroObj[r]
}
pred acessoProfessorRoteiro[s: Estado, u: Usuario, r: Roteiro] {
	authOk[s, u] and u in s.professores and roteiroPublicavel[s, r]
	and (proprietario[s, u, r] or compartilhadoAtual[s, u, r])
}
pred alunoAcessoPost[s: Estado, u: Usuario, p: Post] {
	p in s.posts and p not in s.postRemovido
	and some v: s.vinculos | v.vAluno = u and v.vTurma = s.postTurma[p]
}
pred alunoPodeBaixar[s: Estado, u: Usuario, r: Roteiro] {
	some p: s.posts | alunoAcessoPost[s, u, p]
		and (some x: s.anexos | x.aPost = p and x.aRoteiro = r)
}
// Escopo Q13 concreto: existe intervenção registrada do Chefe sobre um Post que
// referencia o roteiro. Um booleano livre ou `u in chefes` isolado não autoriza.
pred escopoQ13[s: Estado, u: Usuario, r: Roteiro] {
	some aq: s.auditorias | aq.aqChefe = u and aq.aqRoteiro = r
}
pred podeEmitirUrl[s: Estado, u: Usuario, r: Roteiro] {
	authOk[s, u] and roteiroPublicavel[s, r] and (
		(u in s.professores and (proprietario[s, u, r] or compartilhadoAtual[s, u, r]))
		or alunoPodeBaixar[s, u, r]
		or (u in s.chefes and escopoQ13[s, u, r]))
}
pred podeUsarUrl[s: Estado, url: UrlEmitida] {
	url in s.urlsAtivas
}

pred coerente[s: Estado] {
	all t: s.turmas | one s.statusT[t] and one s.donoT[t] and s.donoT[t] in s.professores
	all p: s.posts | one s.postTurma[p] and one s.postAutor[p]
		and s.postTurma[p] in s.turmas
		and s.postAutor[p] = s.donoT[s.postTurma[p]]
		and s.postAutor[p] in s.professores
	all r: s.roteiros | one s.roteiroDono[r] and one s.roteiroStatus[r]
		and s.roteiroDono[r] in s.professores
		and (s.roteiroStatus[r] = Provisorio
			or (one s.roteiroObj[r] and one s.geracaoValida[r]
				and s.geracaoValida[r] = s.objetoGeracao[s.roteiroObj[r]]))
	// Sem metadados pendentes de Roteiro fora do conjunto do estado.
	all r: Roteiro | r in s.roteiros or (no s.roteiroDono[r] and no s.roteiroStatus[r]
		and no s.roteiroObj[r] and no s.geracaoValida[r])
	all v: s.vinculos | v.vTurma in s.turmas
	all disj v1, v2: s.vinculos |
		v1.vAluno != v2.vAluno or v1.vTurma != v2.vTurma
	// Chefe Geral é papel exclusivo (RN-ROLE-01): não acumula vínculo de aluno.
	all v: s.vinculos | v.vAluno not in s.chefes
	// Compartilhamento só existe para roteiro publicável (S7.7).
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
	// Escopo Q13 exige Chefe e um Post removido da apresentação que referencia o
	// roteiro; no máximo um escopo ativo por (chefe, roteiro).
	all aq: s.auditorias | aq.aqChefe in s.chefes and aq.aqRoteiro in s.roteiros
		and aq.aqPost in s.posts and aq.aqPost in s.postRemovido
		and (some x: s.anexos | x.aPost = aq.aqPost and x.aRoteiro = aq.aqRoteiro)
	all disj aq1, aq2: s.auditorias |
		aq1.aqChefe != aq2.aqChefe or aq1.aqRoteiro != aq2.aqRoteiro
	all url: s.urls | url.uRoteiro in s.roteiros
		and one s.geracaoValida[url.uRoteiro]
		and url.uGeracao = s.geracaoValida[url.uRoteiro]
	all url: s.urlsAtivas | url in s.urls
	no u: Usuario | u in s.chefes and u in s.professores
	all u: Usuario | s.versaoPerm[u] >= 0
	all o: s.comandos | s.recibos[o.cmdId] = o
	all disj c1, c2: s.comandos |
		(c1.cmdUid = c2.cmdUid and c1.cmdTipo = c2.cmdTipo
			and c1.cmdPayload = c2.cmdPayload) implies c1.cmdId = c2.cmdId
	all disj c1, c2: s.comandos | c1.cmdId != c2.cmdId
}

// ---- Frames granulares ------------------------------------------------------
// Cada transição chama apenas os frames dos campos que NÃO altera; um frame não
// pode fixar campo que a própria transição grava.
pred fTurma[a, b: Estado] {
	b.turmas = a.turmas and b.statusT = a.statusT and b.donoT = a.donoT
}
pred fVinculo[a, b: Estado] { b.vinculos = a.vinculos }
pred fPosts[a, b: Estado] {
	b.posts = a.posts and b.postTurma = a.postTurma and b.postAutor = a.postAutor
	and b.postRemovido = a.postRemovido
}
pred fPostsId[a, b: Estado] {
	b.posts = a.posts and b.postTurma = a.postTurma and b.postAutor = a.postAutor
}
pred fRoteiroId[a, b: Estado] {
	b.roteiros = a.roteiros and b.roteiroDono = a.roteiroDono and b.roteiroObj = a.roteiroObj
}
pred fRoteiroStatus[a, b: Estado] { b.roteiroStatus = a.roteiroStatus }
pred fRoteiros[a, b: Estado] { fRoteiroId[a, b] and fRoteiroStatus[a, b] }
pred fObjetos[a, b: Estado] { b.objetoGeracao = a.objetoGeracao }
pred fGeracao[a, b: Estado] { b.geracaoValida = a.geracaoValida }
pred fCompartilhados[a, b: Estado] { b.compartilhados = a.compartilhados }
pred fAnexos[a, b: Estado] { b.anexos = a.anexos }
pred fHistAnexo[a, b: Estado] { b.histsAnexo = a.histsAnexo }
pred fAuditorias[a, b: Estado] { b.auditorias = a.auditorias }
pred fUrls[a, b: Estado] { b.urls = a.urls and b.urlsAtivas = a.urlsAtivas }
pred fUrlsSet[a, b: Estado] { b.urls = a.urls }
pred fUrlsAtivas[a, b: Estado] { b.urlsAtivas = a.urlsAtivas }
pred fPessoas[a, b: Estado] {
	b.ativos = a.ativos and b.professores = a.professores and b.chefes = a.chefes
	and b.versaoPerm = a.versaoPerm and b.claimVersao = a.claimVersao
}
// Primeira execução de um comando: exige identidade nova e grava o recibo.
pred registraComando[a, b: Estado, o: Comando] {
	o not in a.comandos and no a.recibos[o.cmdId]
	b.comandos = a.comandos + o
	b.recibos = a.recibos ++ (o.cmdId -> o)
}

// ---- Transições -------------------------------------------------------------
pred cadastrarProvisorio[a, b: Estado, u: Usuario, r: Roteiro, obj: Objeto, o: Comando] {
	coerente[a]
	authOk[a, u] and u in a.professores
	o.cmdUid = u and o.cmdTipo = TCadastrar
	r not in a.roteiros
	obj not in a.roteiroObj[Roteiro]
	fTurma[a, b] and fVinculo[a, b] and fPosts[a, b]
	fObjetos[a, b] and fGeracao[a, b] and fCompartilhados[a, b] and fAnexos[a, b]
	fHistAnexo[a, b] and fAuditorias[a, b] and fUrls[a, b] and fPessoas[a, b]
	registraComando[a, b, o]
	b.roteiros = a.roteiros + r
	b.roteiroDono = a.roteiroDono ++ (r -> u)
	b.roteiroStatus = a.roteiroStatus ++ (r -> Provisorio)
	b.roteiroObj = a.roteiroObj ++ (r -> obj)
	coerente[b]
}
pred validarObjeto[a, b: Estado, u: Usuario, r: Roteiro, o: Comando] {
	coerente[a]
	authOk[a, u] and proprietario[a, u, r]
	a.roteiroStatus[r] = Provisorio
	one a.roteiroObj[r]
	o.cmdUid = u and o.cmdTipo = TValidar
	fTurma[a, b] and fVinculo[a, b] and fPosts[a, b] and fRoteiroId[a, b]
	fObjetos[a, b] and fCompartilhados[a, b] and fAnexos[a, b]
	fHistAnexo[a, b] and fAuditorias[a, b] and fUrls[a, b] and fPessoas[a, b]
	registraComando[a, b, o]
	b.roteiroStatus = a.roteiroStatus ++ (r -> Validado)
	b.geracaoValida = a.geracaoValida ++ (r -> a.objetoGeracao[a.roteiroObj[r]])
	coerente[b]
}
pred publicar[a, b: Estado, u: Usuario, r: Roteiro, o: Comando] {
	coerente[a]
	authOk[a, u] and proprietario[a, u, r]
	a.roteiroStatus[r] = Validado
	o.cmdUid = u and o.cmdTipo = TPublicar
	fTurma[a, b] and fVinculo[a, b] and fPosts[a, b] and fRoteiroId[a, b]
	fObjetos[a, b] and fGeracao[a, b] and fCompartilhados[a, b] and fAnexos[a, b]
	fHistAnexo[a, b] and fAuditorias[a, b] and fUrls[a, b] and fPessoas[a, b]
	registraComando[a, b, o]
	b.roteiroStatus = a.roteiroStatus ++ (r -> Publicavel)
	coerente[b]
}
pred compartilhar[a, b: Estado, u: Usuario, r: Roteiro, dest: Usuario,
		cc: Compartilhamento, o: Comando] {
	coerente[a]
	authOk[a, u] and proprietario[a, u, r]
	authOk[a, dest] and dest in a.professores and dest != u
	o.cmdUid = u and o.cmdTipo = TCompartilhar
	cc not in a.compartilhados and cc.cRoteiro = r and cc.cProfessor = dest
	fTurma[a, b] and fVinculo[a, b] and fPosts[a, b] and fRoteiros[a, b]
	fObjetos[a, b] and fGeracao[a, b] and fAnexos[a, b] and fHistAnexo[a, b] and fAuditorias[a, b]
	fUrls[a, b] and fPessoas[a, b]
	registraComando[a, b, o]
	b.compartilhados = a.compartilhados + cc
	coerente[b]
}
pred revogarCompartilhamento[a, b: Estado, u: Usuario, r: Roteiro, dest: Usuario, o: Comando] {
	coerente[a]
	authOk[a, u] and proprietario[a, u, r]
	some c: a.compartilhados | c.cRoteiro = r and c.cProfessor = dest
	o.cmdUid = u and o.cmdTipo = TRevogar
	fTurma[a, b] and fVinculo[a, b] and fPosts[a, b] and fRoteiros[a, b]
	fObjetos[a, b] and fGeracao[a, b] and fAnexos[a, b] and fHistAnexo[a, b] and fAuditorias[a, b]
	fUrls[a, b] and fPessoas[a, b]
	registraComando[a, b, o]
	b.compartilhados = a.compartilhados - {c: a.compartilhados | c.cRoteiro = r and c.cProfessor = dest}
	coerente[b]
}
pred anexarPost[a, b: Estado, p: Post, r: Roteiro, u: Usuario, x: AnexoPost, o: Comando] {
	coerente[a]
	authOk[a, u] and a.postAutor[p] = u
	p not in a.postRemovido
	a.statusT[a.postTurma[p]] = Ativo
	acessoProfessorRoteiro[a, u, r]
	o.cmdUid = u and o.cmdTipo = TAnexar
	no y: a.anexos | y.aPost = p
	x not in a.anexos
	x.aPost = p and x.aRoteiro = r and x.aGeracao = a.geracaoValida[r]
	fTurma[a, b] and fVinculo[a, b] and fPosts[a, b] and fRoteiros[a, b]
	fObjetos[a, b] and fGeracao[a, b] and fCompartilhados[a, b] and fHistAnexo[a, b] and fAuditorias[a, b]
	fUrls[a, b] and fPessoas[a, b]
	registraComando[a, b, o]
	b.anexos = a.anexos + x
	coerente[b]
}
pred trocarAnexo[a, b: Estado, p: Post, r: Roteiro, u: Usuario, x: AnexoPost,
		hx: HistAnexo, o: Comando] {
	coerente[a]
	authOk[a, u] and a.postAutor[p] = u
	p not in a.postRemovido
	a.statusT[a.postTurma[p]] = Ativo
	acessoProfessorRoteiro[a, u, r]
	o.cmdUid = u and o.cmdTipo = TTrocar
	some y: a.anexos | y.aPost = p
	x not in a.anexos and hx not in a.histsAnexo
	x.aPost = p and x.aRoteiro = r and x.aGeracao = a.geracaoValida[r]
	(some y: a.anexos | y.aPost = p and hx.hPost = p
		and hx.hRoteiro = y.aRoteiro and hx.hGeracao = y.aGeracao)
	fTurma[a, b] and fVinculo[a, b] and fPosts[a, b] and fRoteiros[a, b]
	fObjetos[a, b] and fGeracao[a, b] and fCompartilhados[a, b]
	fUrls[a, b] and fAuditorias[a, b] and fPessoas[a, b]
	registraComando[a, b, o]
	b.anexos = (a.anexos - {y: a.anexos | y.aPost = p}) + x
	b.histsAnexo = a.histsAnexo + hx
	coerente[b]
}
pred manterAnexo[a, b: Estado, p: Post, r: Roteiro, u: Usuario, o: Comando] {
	coerente[a]
	authOk[a, u] and a.postAutor[p] = u
	p not in a.postRemovido
	a.statusT[a.postTurma[p]] = Ativo
	acessoProfessorRoteiro[a, u, r]
	o.cmdUid = u and o.cmdTipo = TManter
	some y: a.anexos | y.aPost = p and y.aRoteiro = r
	fTurma[a, b] and fVinculo[a, b] and fPosts[a, b] and fRoteiros[a, b]
	fObjetos[a, b] and fGeracao[a, b] and fCompartilhados[a, b] and fAnexos[a, b]
	fHistAnexo[a, b] and fAuditorias[a, b] and fUrls[a, b] and fPessoas[a, b]
	registraComando[a, b, o]
	coerente[b]
}
pred desvincularPost[a, b: Estado, p: Post, u: Usuario, hx: HistAnexo, o: Comando] {
	coerente[a]
	authOk[a, u] and a.postAutor[p] = u
	a.statusT[a.postTurma[p]] = Ativo
	o.cmdUid = u and o.cmdTipo = TDesanexar
	some y: a.anexos | y.aPost = p
	hx not in a.histsAnexo
	(some y: a.anexos | y.aPost = p and hx.hPost = p
		and hx.hRoteiro = y.aRoteiro and hx.hGeracao = y.aGeracao)
	fTurma[a, b] and fVinculo[a, b] and fPosts[a, b] and fRoteiros[a, b]
	fObjetos[a, b] and fGeracao[a, b] and fCompartilhados[a, b]
	fUrls[a, b] and fAuditorias[a, b] and fPessoas[a, b]
	registraComando[a, b, o]
	b.anexos = a.anexos - {y: a.anexos | y.aPost = p}
	b.histsAnexo = a.histsAnexo + hx
	coerente[b]
}
pred removerPostApresentacao[a, b: Estado, p: Post, u: Usuario, o: Comando] {
	coerente[a]
	authOk[a, u]
	(a.postAutor[p] = u or u in a.chefes)
	a.statusT[a.postTurma[p]] = Ativo
	p not in a.postRemovido
	o.cmdUid = u and o.cmdTipo = TRemoverPost
	fTurma[a, b] and fVinculo[a, b] and fPostsId[a, b] and fRoteiros[a, b]
	fObjetos[a, b] and fGeracao[a, b] and fCompartilhados[a, b] and fAnexos[a, b]
	fHistAnexo[a, b] and fAuditorias[a, b] and fUrls[a, b] and fPessoas[a, b]
	registraComando[a, b, o]
	b.postRemovido = a.postRemovido + p
	coerente[b]
}
// Registra o escopo Q13 do Chefe sobre um Post removido da apresentação que
// referencia o roteiro. É uma intervenção administrativa auditada (Q13).
pred registrarAuditoriaQ13[a, b: Estado, u: Usuario, p: Post, r: Roteiro,
		aq: AuditoriaQ13, o: Comando] {
	coerente[a]
	authOk[a, u] and u in a.chefes
	p in a.postRemovido
	some x: a.anexos | x.aPost = p and x.aRoteiro = r
	aq not in a.auditorias
	aq.aqChefe = u and aq.aqRoteiro = r and aq.aqPost = p
	o.cmdUid = u and o.cmdTipo = TAuditar
	fTurma[a, b] and fVinculo[a, b] and fPosts[a, b] and fRoteiros[a, b]
	fObjetos[a, b] and fGeracao[a, b] and fCompartilhados[a, b] and fAnexos[a, b]
	fHistAnexo[a, b] and fUrls[a, b] and fPessoas[a, b]
	registraComando[a, b, o]
	b.auditorias = a.auditorias + aq
	coerente[b]
}
// Fim/revogação do escopo Q13: impede novas emissões; URLs já emitidas
// permanecem (b.urls e b.urlsAtivas preservados).
pred encerrarAuditoriaQ13[a, b: Estado, aq: AuditoriaQ13] {
	coerente[a]
	aq in a.auditorias
	fTurma[a, b] and fVinculo[a, b] and fPosts[a, b] and fRoteiros[a, b]
	fObjetos[a, b] and fGeracao[a, b] and fCompartilhados[a, b] and fAnexos[a, b]
	fHistAnexo[a, b] and fUrls[a, b] and fPessoas[a, b]
	b.comandos = a.comandos and b.recibos = a.recibos
	b.auditorias = a.auditorias - aq
	coerente[b]
}
pred emitirUrl[a, b: Estado, r: Roteiro, u: Usuario, url: UrlEmitida, o: Comando] {
	coerente[a]
	podeEmitirUrl[a, u, r]
	o.cmdUid = u and o.cmdTipo = TEmitirUrl
	url not in a.urls
	url.uRoteiro = r and url.uUid = u and url.uGeracao = a.geracaoValida[r]
	fTurma[a, b] and fVinculo[a, b] and fPosts[a, b] and fRoteiros[a, b]
	fObjetos[a, b] and fGeracao[a, b] and fCompartilhados[a, b] and fAnexos[a, b]
	fHistAnexo[a, b] and fAuditorias[a, b] and fPessoas[a, b]
	registraComando[a, b, o]
	b.urls = a.urls + url
	b.urlsAtivas = a.urlsAtivas + url
	coerente[b]
}
pred expirarUrl[a, b: Estado, url: UrlEmitida] {
	coerente[a]
	url in a.urlsAtivas
	fTurma[a, b] and fVinculo[a, b] and fPosts[a, b] and fRoteiros[a, b]
	fObjetos[a, b] and fGeracao[a, b] and fCompartilhados[a, b] and fAnexos[a, b]
	fHistAnexo[a, b] and fAuditorias[a, b] and fUrlsSet[a, b] and fPessoas[a, b]
	b.comandos = a.comandos and b.recibos = a.recibos
	b.urlsAtivas = a.urlsAtivas - url
	coerente[b]
}
pred usarUrlEmitida[a, b: Estado, url: UrlEmitida] {
	coerente[a]
	podeUsarUrl[a, url]
	b = a
}
pred arquivarTurma[a, b: Estado, t: Turma, u: Usuario] {
	coerente[a]
	authOk[a, u]
	a.statusT[t] = Ativo
	(ehDonoTurma[a, u, t] or u in a.chefes)
	fVinculo[a, b] and fPosts[a, b] and fRoteiros[a, b]
	fObjetos[a, b] and fGeracao[a, b] and fCompartilhados[a, b]
	fAnexos[a, b] and fHistAnexo[a, b] and fAuditorias[a, b] and fUrls[a, b] and fPessoas[a, b]
	b.comandos = a.comandos and b.recibos = a.recibos
	b.turmas = a.turmas and b.donoT = a.donoT
	b.statusT = a.statusT ++ (t -> Arquivada)
	coerente[b]
}
pred ehDonoTurma[s: Estado, u: Usuario, t: Turma] { s.donoT[t] = u }
pred revogarVinculo[a, b: Estado, u: Usuario, t: Turma] {
	coerente[a]
	temVinculo[a, u, t]
	authOk[a, u]
	a.versaoPerm[u] < 7
	fTurma[a, b] and fPosts[a, b] and fRoteiros[a, b]
	fObjetos[a, b] and fGeracao[a, b] and fCompartilhados[a, b]
	fAnexos[a, b] and fHistAnexo[a, b] and fAuditorias[a, b] and fUrls[a, b]
	b.comandos = a.comandos and b.recibos = a.recibos
	b.ativos = a.ativos and b.professores = a.professores and b.chefes = a.chefes
	b.claimVersao = a.claimVersao
	b.vinculos = a.vinculos - {v: a.vinculos | v.vAluno = u and v.vTurma = t}
	b.versaoPerm = a.versaoPerm ++ (u -> plus[a.versaoPerm[u], 1])
	coerente[b]
}
// Refresh abstrato de token/claim: projeta versaoPerm corrente na claim. Usado
// para mostrar que atualizar a claim não recria acesso.
pred atualizarClaim[a, b: Estado, u: Usuario] {
	coerente[a]
	fTurma[a, b] and fVinculo[a, b] and fPosts[a, b]
	fRoteiros[a, b] and fObjetos[a, b] and fGeracao[a, b]
	fCompartilhados[a, b] and fAnexos[a, b] and fHistAnexo[a, b] and fAuditorias[a, b] and fUrls[a, b]
	b.comandos = a.comandos and b.recibos = a.recibos
	b.ativos = a.ativos and b.professores = a.professores and b.chefes = a.chefes
	b.versaoPerm = a.versaoPerm
	b.claimVersao = a.claimVersao ++ (u -> a.versaoPerm[u])
	coerente[b]
}
pred retryM7[a, b: Estado, o: Comando] {
	coerente[a]
	o in a.comandos and a.recibos[o.cmdId] = o
	b = a
}

// Disjunção de todas as transições para quantificação universal.
pred transicao[a, b: Estado] {
	some u, dest: Usuario, r: Roteiro, obj: Objeto, x: AnexoPost, cc: Compartilhamento,
		hx: HistAnexo, aq: AuditoriaQ13, p: Post, t: Turma, c: Comando, url: UrlEmitida |
		cadastrarProvisorio[a, b, u, r, obj, c]
		or validarObjeto[a, b, u, r, c]
		or publicar[a, b, u, r, c]
		or compartilhar[a, b, u, r, dest, cc, c]
		or revogarCompartilhamento[a, b, u, r, dest, c]
		or anexarPost[a, b, p, r, u, x, c]
		or trocarAnexo[a, b, p, r, u, x, hx, c]
		or manterAnexo[a, b, p, r, u, c]
		or desvincularPost[a, b, p, u, hx, c]
		or removerPostApresentacao[a, b, p, u, c]
		or registrarAuditoriaQ13[a, b, u, p, r, aq, c]
		or encerrarAuditoriaQ13[a, b, aq]
		or emitirUrl[a, b, r, u, url, c]
		or expirarUrl[a, b, url]
		or usarUrlEmitida[a, b, url]
		or arquivarTurma[a, b, t, u]
		or revogarVinculo[a, b, u, t]
		or atualizarClaim[a, b, u]
		or retryM7[a, b, c]
}

// ---- Assertions: upload, objeto e geração ----------------------------------
assert CadastroComecaProvisorio {
	all a, b: Estado, u: Usuario, r: Roteiro, obj: Objeto, o: Comando |
		cadastrarProvisorio[a, b, u, r, obj, o] implies
			(b.roteiroStatus[r] = Provisorio and no b.geracaoValida[r])
}
assert PublicavelSoDeValidado {
	all a, b: Estado, u: Usuario, r: Roteiro, o: Comando |
		publicar[a, b, u, r, o] implies a.roteiroStatus[r] = Validado
}
assert ValidarFixaGeracao {
	all a, b: Estado, u: Usuario, r: Roteiro, o: Comando |
		validarObjeto[a, b, u, r, o] implies
			(b.geracaoValida[r] = a.objetoGeracao[a.roteiroObj[r]]
				and b.roteiroStatus[r] = Validado)
}
assert RoteiroValidadoTemGeracao {
	all s: Estado, r: Roteiro |
		(coerente[s] and r in s.roteiros and s.roteiroStatus[r] != Provisorio) implies
			(one s.geracaoValida[r] and one s.roteiroObj[r]
				and s.geracaoValida[r] = s.objetoGeracao[s.roteiroObj[r]])
}
assert DonoImutavel {
	all a, b: Estado |
		transicao[a, b] implies
			(all r: a.roteiros | b.roteiroDono[r] = a.roteiroDono[r])
}
assert ObjetoNuncaSobrescrito {
	all a, b: Estado | transicao[a, b] implies b.objetoGeracao = a.objetoGeracao
}
assert GeracaoNaoMudaSemValidar {
	all a, b: Estado |
		(transicao[a, b] and b.geracaoValida != a.geracaoValida) implies
			(some u: Usuario, r: Roteiro, o: Comando | validarObjeto[a, b, u, r, o])
}
assert SemObjetoNaoEmite {
	all s: Estado, u: Usuario, r: Roteiro |
		(coerente[s] and podeEmitirUrl[s, u, r]) implies one s.roteiroObj[r]
}

// ---- Assertions: compartilhamento e ACL ------------------------------------
assert AnexoUsaGeracaoCanonica {
	all s: Estado, x: AnexoPost |
		(coerente[s] and x in s.anexos) implies x.aGeracao = s.geracaoValida[x.aRoteiro]
}
assert AnexoUnicoPorPost {
	all s: Estado | coerente[s] implies
		(all disj x1, x2: s.anexos | x1.aPost != x2.aPost)
}
assert CompartilharSoProprietario {
	all a, b: Estado, u: Usuario, r: Roteiro, dest: Usuario,
			cc: Compartilhamento, o: Comando |
		compartilhar[a, b, u, r, dest, cc, o] implies proprietario[a, u, r]
}
assert CompartilharExigeDestinatarioAtivo {
	all a, b: Estado, u: Usuario, r: Roteiro, dest: Usuario,
			cc: Compartilhamento, o: Comando |
		compartilhar[a, b, u, r, dest, cc, o] implies
			(authOk[a, dest] and dest in a.professores and dest != u)
}
assert CompartilhamentoUnico {
	all s: Estado | coerente[s] implies
		(all disj c1, c2: s.compartilhados |
			c1.cRoteiro != c2.cRoteiro or c1.cProfessor != c2.cProfessor)
}
assert RevogarSoProprietario {
	all a, b: Estado, u: Usuario, r: Roteiro, dest: Usuario, o: Comando |
		revogarCompartilhamento[a, b, u, r, dest, o] implies proprietario[a, u, r]
}
assert NaoProprietarioNaoRevoga {
	all a, b: Estado, u: Usuario, r: Roteiro, dest: Usuario, o: Comando |
		revogarCompartilhamento[a, b, u, r, dest, o] implies
			(some c: a.compartilhados | c.cRoteiro = r and c.cProfessor = dest)
}
// Só roteiro publicável é compartilhado (S7.7): invariante de estado e
// inexistência de transição a partir de Provisorio/Validado.
assert CompartilhamentoSoDePublicavel {
	all s: Estado | coerente[s] implies
		(all c: s.compartilhados | s.roteiroStatus[c.cRoteiro] = Publicavel)
}
assert NaoCompartilhaNaoPublicavel {
	all a: Estado, u: Usuario, r: Roteiro, dest: Usuario, cc: Compartilhamento,
			o: Comando |
		(coerente[a] and a.roteiroStatus[r] != Publicavel)
			implies (no b: Estado | compartilhar[a, b, u, r, dest, cc, o])
}

// ---- Assertions: download, URLs e turma ------------------------------------
assert EmissaoExigeAcesso {
	all a, b: Estado, r: Roteiro, u: Usuario, url: UrlEmitida, o: Comando |
		emitirUrl[a, b, r, u, url, o] implies podeEmitirUrl[a, u, r]
}
assert ExAlunoNaoEmite {
	all s: Estado, u: Usuario, r: Roteiro |
		(coerente[s] and not temAlgumVinculo[s, u] and not proprietario[s, u, r]
			and not compartilhadoAtual[s, u, r] and u not in s.chefes)
			implies not podeEmitirUrl[s, u, r]
}
assert InativoNaoEmite {
	all s: Estado, u: Usuario, r: Roteiro |
		(coerente[s] and u not in s.ativos) implies not podeEmitirUrl[s, u, r]
}
assert AlunoDependeDeVinculo {
	all s: Estado, u: Usuario, r: Roteiro |
		(coerente[s] and podeEmitirUrl[s, u, r] and u not in s.professores
			and u not in s.chefes) implies alunoPodeBaixar[s, u, r]
}
assert PostRemovidoNegaAluno {
	all s: Estado, u: Usuario, p: Post |
		(coerente[s] and p in s.postRemovido) implies not alunoAcessoPost[s, u, p]
}
assert TurmaArquivadaNegaEscritaRoteiro {
	all a: Estado, t: Turma |
		(coerente[a] and a.statusT[t] = Arquivada) implies not (
			(some b: Estado, p: Post, r: Roteiro, u: Usuario, x: AnexoPost, o: Comando |
				p in a.posts and a.postTurma[p] = t and anexarPost[a, b, p, r, u, x, o])
			or (some b: Estado, p: Post, r: Roteiro, u: Usuario, x: AnexoPost,
					hx: HistAnexo, o: Comando |
				p in a.posts and a.postTurma[p] = t and trocarAnexo[a, b, p, r, u, x, hx, o])
			or (some b: Estado, p: Post, r: Roteiro, u: Usuario, o: Comando |
				p in a.posts and a.postTurma[p] = t and manterAnexo[a, b, p, r, u, o])
			or (some b: Estado, p: Post, u: Usuario, hx: HistAnexo, o: Comando |
				p in a.posts and a.postTurma[p] = t and desvincularPost[a, b, p, u, hx, o])
			or (some b: Estado, p: Post, u: Usuario, o: Comando |
				p in a.posts and a.postTurma[p] = t and removerPostApresentacao[a, b, p, u, o])
		)
}
assert UrlEmitidaSobreviveARevogacao {
	all a, b: Estado, u: Usuario, r: Roteiro, dest: Usuario, o: Comando |
		revogarCompartilhamento[a, b, u, r, dest, o] implies b.urls = a.urls
}
assert UrlExpiradaNaoUsavel {
	all s: Estado, url: UrlEmitida |
		(coerente[s] and url in s.urls and url not in s.urlsAtivas)
			implies not podeUsarUrl[s, url]
}
assert UrlAtivaUsavel {
	all s: Estado, url: UrlEmitida |
		(coerente[s] and url in s.urlsAtivas) implies podeUsarUrl[s, url]
}

// ---- Assertions: anexo, troca, desvínculo e histórico ----------------------
assert AnexarSoDonoDaTurma {
	all a, b: Estado, p: Post, r: Roteiro, u: Usuario, x: AnexoPost, o: Comando |
		anexarPost[a, b, p, r, u, x, o] implies a.postAutor[p] = u
}
assert AnexarExigeAcessoAtual {
	all a, b: Estado, p: Post, r: Roteiro, u: Usuario, x: AnexoPost, o: Comando |
		anexarPost[a, b, p, r, u, x, o] implies acessoProfessorRoteiro[a, u, r]
}
assert ManterExigeAcessoAtual {
	all a, b: Estado, p: Post, r: Roteiro, u: Usuario, o: Comando |
		manterAnexo[a, b, p, r, u, o] implies acessoProfessorRoteiro[a, u, r]
}
assert TrocarExigeAcessoAtual {
	all a, b: Estado, p: Post, r: Roteiro, u: Usuario, x: AnexoPost,
			hx: HistAnexo, o: Comando |
		trocarAnexo[a, b, p, r, u, x, hx, o] implies acessoProfessorRoteiro[a, u, r]
}
assert RemocaoPostPreservaSnapshot {
	all a, b: Estado, p: Post, u: Usuario, o: Comando |
		removerPostApresentacao[a, b, p, u, o] implies
			(b.anexos = a.anexos and b.histsAnexo = a.histsAnexo)
}
assert HistoricoAnexoNuncaRemovido {
	all a, b: Estado, p: Post, r: Roteiro, u: Usuario, x: AnexoPost,
			hx: HistAnexo, o: Comando |
		(trocarAnexo[a, b, p, r, u, x, hx, o] or desvincularPost[a, b, p, u, hx, o])
			implies a.histsAnexo in b.histsAnexo
}
assert HistoricoAnexoPreservaObjeto {
	all a, b: Estado, p: Post, r: Roteiro, u: Usuario, x: AnexoPost,
			hx: HistAnexo, o: Comando |
		trocarAnexo[a, b, p, r, u, x, hx, o] implies
			(some y: a.anexos | y.aPost = p and hx.hRoteiro = y.aRoteiro
				and hx.hGeracao = y.aGeracao)
}
assert AnexoEhGeracaoValidada {
	all a, b: Estado, p: Post, r: Roteiro, u: Usuario, x: AnexoPost, o: Comando |
		anexarPost[a, b, p, r, u, x, o] implies x.aGeracao = a.geracaoValida[r]
}

// ---- Assertions: Chefe Q13 e composição M7/M9 ------------------------------
assert ChefeNaoAnexa {
	all a, b: Estado, p: Post, r: Roteiro, u: Usuario, x: AnexoPost, o: Comando |
		anexarPost[a, b, p, r, u, x, o] implies u not in a.chefes
}
assert ChefeNaoCompartilha {
	all a, b: Estado, u: Usuario, r: Roteiro, dest: Usuario,
			cc: Compartilhamento, o: Comando |
		compartilhar[a, b, u, r, dest, cc, o] implies u not in a.chefes
}
// Chefe só emite URL sob escopo Q13 registrado (intervenção sobre Post que
// referencia o roteiro); sem escopo, nenhuma emissão nova.
assert ChefeSemEscopoNaoEmite {
	all s: Estado, u: Usuario, r: Roteiro |
		(coerente[s] and u in s.chefes and not escopoQ13[s, u, r])
			implies not podeEmitirUrl[s, u, r]
}
assert EscopoQ13SoDeChefeComPostReferenciado {
	all s: Estado, aq: AuditoriaQ13 |
		(coerente[s] and aq in s.auditorias) implies
			(aq.aqChefe in s.chefes and aq.aqPost in s.postRemovido
				and (some x: s.anexos |
					x.aPost = aq.aqPost and x.aRoteiro = aq.aqRoteiro))
}
assert EncerrarEscopoImpedeNovaEmissao {
	all a, b: Estado, u: Usuario, r: Roteiro, aq: AuditoriaQ13 |
		(coerente[a] and aq in a.auditorias and aq.aqChefe = u and aq.aqRoteiro = r
			and encerrarAuditoriaQ13[a, b, aq]
			and (no aq2: b.auditorias | aq2.aqChefe = u and aq2.aqRoteiro = r)
			and u not in b.professores and not alunoPodeBaixar[b, u, r])
			implies not podeEmitirUrl[b, u, r]
}
assert UrlEmitidaSobreviveAoEncerramentoEscopo {
	all a, b: Estado, aq: AuditoriaQ13 |
		encerrarAuditoriaQ13[a, b, aq] implies
			(b.urls = a.urls and b.urlsAtivas = a.urlsAtivas)
}
assert RevogacaoVinculoImpedeCommit {
	all a, b: Estado, u: Usuario, t: Turma |
		revogarVinculo[a, b, u, t] implies not authOk[b, u]
}
assert PrimeiraExecucaoProduzReceipt {
	all a, b: Estado, u, dest: Usuario, r: Roteiro, obj: Objeto, x: AnexoPost,
			cc: Compartilhamento, hx: HistAnexo, aq: AuditoriaQ13, p: Post,
			url: UrlEmitida, o: Comando |
		(cadastrarProvisorio[a, b, u, r, obj, o]
			or validarObjeto[a, b, u, r, o]
			or publicar[a, b, u, r, o]
			or compartilhar[a, b, u, r, dest, cc, o]
			or revogarCompartilhamento[a, b, u, r, dest, o]
			or anexarPost[a, b, p, r, u, x, o]
			or trocarAnexo[a, b, p, r, u, x, hx, o]
			or manterAnexo[a, b, p, r, u, o]
			or desvincularPost[a, b, p, u, hx, o]
			or removerPostApresentacao[a, b, p, u, o]
			or registrarAuditoriaQ13[a, b, u, p, r, aq, o]
			or emitirUrl[a, b, r, u, url, o])
			implies (o in b.comandos and b.recibos[o.cmdId] = o and o not in a.comandos)
}
assert IdentidadeComandoUnica {
	all s: Estado | coerente[s] implies
		(all disj c1, c2: s.comandos |
			(c1.cmdUid = c2.cmdUid and c1.cmdTipo = c2.cmdTipo
				and c1.cmdPayload = c2.cmdPayload) implies c1.cmdId = c2.cmdId)
}
assert ReusoIncompativelRejeitado {
	all a: Estado, o2: Comando |
		(coerente[a] and (some o1: a.comandos | o1.cmdId = o2.cmdId and o1 != o2))
			implies not (
				(some b: Estado, u: Usuario, r: Roteiro, obj: Objeto |
					cadastrarProvisorio[a, b, u, r, obj, o2])
				or (some b: Estado, u: Usuario, r: Roteiro | validarObjeto[a, b, u, r, o2])
				or (some b: Estado, u: Usuario, r: Roteiro | publicar[a, b, u, r, o2])
				or (some b: Estado, u: Usuario, r: Roteiro, dest: Usuario, cc: Compartilhamento |
					compartilhar[a, b, u, r, dest, cc, o2])
				or (some b: Estado, u: Usuario, r: Roteiro, dest: Usuario |
					revogarCompartilhamento[a, b, u, r, dest, o2])
				or (some b: Estado, p: Post, r: Roteiro, u: Usuario, x: AnexoPost |
					anexarPost[a, b, p, r, u, x, o2])
				or (some b: Estado, p: Post, r: Roteiro, u: Usuario, x: AnexoPost,
						hx: HistAnexo | trocarAnexo[a, b, p, r, u, x, hx, o2])
				or (some b: Estado, p: Post, r: Roteiro, u: Usuario |
					manterAnexo[a, b, p, r, u, o2])
				or (some b: Estado, p: Post, u: Usuario, hx: HistAnexo |
					desvincularPost[a, b, p, u, hx, o2])
				or (some b: Estado, p: Post, u: Usuario |
					removerPostApresentacao[a, b, p, u, o2])
				or (some b: Estado, p: Post, u: Usuario, r: Roteiro, aq: AuditoriaQ13 |
					registrarAuditoriaQ13[a, b, u, p, r, aq, o2])
				or (some b: Estado, r: Roteiro, u: Usuario, url: UrlEmitida |
					emitirUrl[a, b, r, u, url, o2])
			)
}
assert RetryNaoReexecuta {
	all a, b: Estado, o: Comando | retryM7[a, b, o] implies b = a
}
assert RetryNaoDuplicaFato {
	all a, b: Estado, o: Comando | retryM7[a, b, o] implies
		(b.roteiros = a.roteiros and b.compartilhados = a.compartilhados
			and b.anexos = a.anexos and b.histsAnexo = a.histsAnexo
			and b.urls = a.urls and b.vinculos = a.vinculos)
}
assert TransicoesPreservamCoerencia {
	all a, b: Estado | transicao[a, b] implies coerente[b]
}

// ---- Witnesses --------------------------------------------------------------
pred WitnessTurmaAtiva {
	some s: Estado, t: Turma | coerente[s] and t in s.turmas and s.statusT[t] = Ativo
}
pred WitnessCadastraProvisorio {
	some a, b: Estado, u: Usuario, r: Roteiro, obj: Objeto, o: Comando |
		cadastrarProvisorio[a, b, u, r, obj, o] and b.roteiroStatus[r] = Provisorio
}
pred WitnessValidaObjeto {
	some a, b, c: Estado, u: Usuario, r: Roteiro, obj: Objeto, o, o2: Comando |
		cadastrarProvisorio[a, b, u, r, obj, o] and validarObjeto[b, c, u, r, o2]
}
pred WitnessPublica {
	some a, b, c, d: Estado, u: Usuario, r: Roteiro, obj: Objeto, o, o2, o3: Comando |
		cadastrarProvisorio[a, b, u, r, obj, o]
		and validarObjeto[b, c, u, r, o2] and publicar[c, d, u, r, o3]
}
pred WitnessProprietarioEmite {
	some a, b, c, d, e: Estado, u: Usuario, r: Roteiro, obj: Objeto,
			url: UrlEmitida, o, o2, o3, o4: Comando |
		cadastrarProvisorio[a, b, u, r, obj, o]
		and validarObjeto[b, c, u, r, o2] and publicar[c, d, u, r, o3]
		and emitirUrl[d, e, r, u, url, o4]
}
pred WitnessCompartilhadoEmite {
	some s: Estado, dest: Usuario, r: Roteiro |
		coerente[s] and compartilhadoAtual[s, dest, r] and podeEmitirUrl[s, dest, r]
		and dest not in s.chefes
}
pred WitnessAlunoEmitePostAtivo {
	some s: Estado, u: Usuario, r: Roteiro, p: Post |
		coerente[s] and alunoAcessoPost[s, u, p] and s.statusT[s.postTurma[p]] = Ativo
		and (some x: s.anexos | x.aPost = p and x.aRoteiro = r) and podeEmitirUrl[s, u, r]
}
pred WitnessAlunoEmiteTurmaArquivada {
	some s: Estado, u: Usuario, r: Roteiro, p: Post |
		coerente[s] and alunoAcessoPost[s, u, p] and s.statusT[s.postTurma[p]] = Arquivada
		and (some x: s.anexos | x.aPost = p and x.aRoteiro = r) and podeEmitirUrl[s, u, r]
}
pred WitnessExAlunoNaoEmite {
	some a, b, c: Estado, u: Usuario, t: Turma, r: Roteiro, p: Post |
		coerente[a] and temVinculo[a, u, t] and authOk[a, u]
		and p in a.posts and a.postTurma[p] = t
		and (some x: a.anexos | x.aPost = p and x.aRoteiro = r)
		and revogarVinculo[a, b, u, t] and atualizarClaim[b, c, u]
		and authOk[c, u] and not temVinculo[c, u, t]
		and not proprietario[c, u, r] and not compartilhadoAtual[c, u, r]
		and u not in c.chefes and not podeEmitirUrl[c, u, r]
}
pred WitnessRevogadoNaoEmite {
	some a, b: Estado, u: Usuario, r: Roteiro, dest: Usuario, o: Comando |
		coerente[a] and compartilhadoAtual[a, dest, r]
		and revogarCompartilhamento[a, b, u, r, dest, o]
		and not compartilhadoAtual[b, dest, r] and not proprietario[b, dest, r]
		and dest not in b.chefes and not podeEmitirUrl[b, dest, r]
}
pred WitnessUrlAtivaAposRevogacao {
	some a, b: Estado, u: Usuario, r: Roteiro, dest: Usuario, url: UrlEmitida, o: Comando |
		coerente[a] and url in a.urlsAtivas and compartilhadoAtual[a, dest, r]
		and url.uRoteiro = r and url.uUid = dest
		and revogarCompartilhamento[a, b, u, r, dest, o]
		and url in b.urls and url in b.urlsAtivas and podeUsarUrl[b, url]
}
// Chefe emite URL somente com escopo Q13 registrado: registra a auditoria e
// emite na sequência; o escopo liga Chefe, roteiro e Post removido.
pred WitnessChefeComEscopoQ13 {
	some a, b, c: Estado, u: Usuario, r: Roteiro, p: Post, aq: AuditoriaQ13,
			url: UrlEmitida, o, o2: Comando |
		coerente[a] and u in a.chefes and authOk[a, u]
		and p in a.postRemovido
		and (some x: a.anexos | x.aPost = p and x.aRoteiro = r)
		and registrarAuditoriaQ13[a, b, u, p, r, aq, o]
		and emitirUrl[b, c, r, u, url, o2]
}
// Chefe ativo e roteiro publicável, mas sem escopo Q13: não emite.
pred WitnessChefeSemEscopoNaoEmite {
	some s: Estado, u: Usuario, r: Roteiro |
		coerente[s] and u in s.chefes and authOk[s, u] and roteiroPublicavel[s, r]
		and (no aq: s.auditorias | aq.aqChefe = u and aq.aqRoteiro = r)
		and u not in s.professores and not podeEmitirUrl[s, u, r]
}
// Encerrar o escopo impede nova emissão, mas preserva URLs já emitidas.
pred WitnessEncerrarEscopoImpedeEmissao {
	some a, b: Estado, u: Usuario, r: Roteiro, aq: AuditoriaQ13 |
		coerente[a] and aq in a.auditorias and aq.aqChefe = u and aq.aqRoteiro = r
		and u in a.chefes and not alunoPodeBaixar[a, u, r]
		and encerrarAuditoriaQ13[a, b, aq]
		and not podeEmitirUrl[b, u, r]
}
// Cenários alcançáveis de roteiro Provisorio/Validado com dono e destinatário
// aptos: compartilhar não é possível; só Publicavel é compartilhável.
pred WitnessProvisorioNaoCompartilha {
	some a, b: Estado, u: Usuario, r: Roteiro, obj: Objeto, dest: Usuario, o: Comando |
		cadastrarProvisorio[a, b, u, r, obj, o]
		and authOk[b, dest] and dest in b.professores and dest != u
		and (no b2: Estado, cc: Compartilhamento, o2: Comando |
			compartilhar[b, b2, u, r, dest, cc, o2])
}
pred WitnessValidadoNaoCompartilha {
	some a, b, c: Estado, u: Usuario, r: Roteiro, obj: Objeto, dest: Usuario,
			o, o2: Comando |
		cadastrarProvisorio[a, b, u, r, obj, o] and validarObjeto[b, c, u, r, o2]
		and authOk[c, dest] and dest in c.professores and dest != u
		and (no c2: Estado, cc: Compartilhamento, o3: Comando |
			compartilhar[c, c2, u, r, dest, cc, o3])
}
pred WitnessCompartilhaPublicavel {
	some a, b, c, d, e: Estado, u: Usuario, r: Roteiro, obj: Objeto, dest: Usuario,
			cc: Compartilhamento, o, o2, o3, o4: Comando |
		cadastrarProvisorio[a, b, u, r, obj, o]
		and validarObjeto[b, c, u, r, o2] and publicar[c, d, u, r, o3]
		and compartilhar[d, e, u, r, dest, cc, o4] and roteiroPublicavel[d, r]
}
pred WitnessPostRemovidoNaoEmiteAluno {
	some a, b: Estado, u: Usuario, r: Roteiro, p: Post, o: Comando |
		coerente[a] and alunoAcessoPost[a, u, p]
		and (some x: a.anexos | x.aPost = p and x.aRoteiro = r)
		and u not in a.professores and u not in a.chefes
		and removerPostApresentacao[a, b, p, a.postAutor[p], o]
		and not podeEmitirUrl[b, u, r]
}
pred WitnessAnexaComAcesso {
	some a, b: Estado, p: Post, r: Roteiro, u: Usuario, x: AnexoPost, o: Comando |
		anexarPost[a, b, p, r, u, x, o] and acessoProfessorRoteiro[a, u, r]
}
pred WitnessMantemComAcesso {
	some a, b: Estado, p: Post, r: Roteiro, u: Usuario, o: Comando |
		manterAnexo[a, b, p, r, u, o] and acessoProfessorRoteiro[a, u, r]
}
pred WitnessDesvinculaSemAcesso {
	some a, b: Estado, p: Post, u: Usuario, hx: HistAnexo, o: Comando |
		desvincularPost[a, b, p, u, hx, o]
		and (all r: Roteiro | not acessoProfessorRoteiro[a, u, r])
}
pred WitnessTrocaPreservaHistorico {
	some a, b: Estado, p: Post, r: Roteiro, u: Usuario, x: AnexoPost,
			hx: HistAnexo, o: Comando |
		trocarAnexo[a, b, p, r, u, x, hx, o] and hx in b.histsAnexo
}
pred WitnessRetryAposExecucao {
	some a, b, c: Estado, u: Usuario, r: Roteiro, obj: Objeto, o: Comando |
		cadastrarProvisorio[a, b, u, r, obj, o] and retryM7[b, c, o]
}
pred WitnessReusoIncompativel {
	some a: Estado, o1: Comando, o2: Comando |
		coerente[a] and o1 in a.comandos and o1.cmdId = o2.cmdId and o1 != o2
}
pred WitnessObjetoAusenteNaoEmite {
	some s: Estado, r: Roteiro |
		coerente[s] and r in s.roteiros and s.roteiroStatus[r] = Provisorio
		and no s.roteiroObj[r]
		and (all u: Usuario | not podeEmitirUrl[s, u, r])
}

// ---- Comandos ---------------------------------------------------------------
check CadastroComecaProvisorio for 6
check PublicavelSoDeValidado for 6
check ValidarFixaGeracao for 6
check RoteiroValidadoTemGeracao for 6
check DonoImutavel for 6
check ObjetoNuncaSobrescrito for 6
check GeracaoNaoMudaSemValidar for 6
check SemObjetoNaoEmite for 6
check AnexoUsaGeracaoCanonica for 6
check AnexoUnicoPorPost for 6
check CompartilharSoProprietario for 6
check CompartilharExigeDestinatarioAtivo for 6
check CompartilhamentoUnico for 6
check RevogarSoProprietario for 6
check NaoProprietarioNaoRevoga for 6
check CompartilhamentoSoDePublicavel for 6
check NaoCompartilhaNaoPublicavel for 6
check EmissaoExigeAcesso for 6
check ExAlunoNaoEmite for 6
check InativoNaoEmite for 6
check AlunoDependeDeVinculo for 6
check PostRemovidoNegaAluno for 6
check TurmaArquivadaNegaEscritaRoteiro for 6
check UrlEmitidaSobreviveARevogacao for 6
check UrlExpiradaNaoUsavel for 6
check UrlAtivaUsavel for 6
check EncerrarEscopoImpedeNovaEmissao for 6
check UrlEmitidaSobreviveAoEncerramentoEscopo for 6
check AnexarSoDonoDaTurma for 6
check AnexarExigeAcessoAtual for 6
check ManterExigeAcessoAtual for 6
check TrocarExigeAcessoAtual for 6
check RemocaoPostPreservaSnapshot for 6
check HistoricoAnexoNuncaRemovido for 6
check HistoricoAnexoPreservaObjeto for 6
check AnexoEhGeracaoValidada for 6
check ChefeNaoAnexa for 6
check ChefeNaoCompartilha for 6
check ChefeSemEscopoNaoEmite for 6
check EscopoQ13SoDeChefeComPostReferenciado for 6
check RevogacaoVinculoImpedeCommit for 6
check PrimeiraExecucaoProduzReceipt for 6
check IdentidadeComandoUnica for 6
check ReusoIncompativelRejeitado for 6
check RetryNaoReexecuta for 6
check RetryNaoDuplicaFato for 6
check TransicoesPreservamCoerencia for 6

run WitnessTurmaAtiva for 4
run WitnessCadastraProvisorio for 6
run WitnessValidaObjeto for 6
run WitnessPublica for 6
run WitnessProprietarioEmite for 6
run WitnessCompartilhadoEmite for 6
run WitnessAlunoEmitePostAtivo for 6
run WitnessAlunoEmiteTurmaArquivada for 6
run WitnessExAlunoNaoEmite for 6
run WitnessRevogadoNaoEmite for 6
run WitnessUrlAtivaAposRevogacao for 6
run WitnessProvisorioNaoCompartilha for 6
run WitnessValidadoNaoCompartilha for 6
run WitnessCompartilhaPublicavel for 6
run WitnessChefeComEscopoQ13 for 6
run WitnessChefeSemEscopoNaoEmite for 6
run WitnessEncerrarEscopoImpedeEmissao for 6
run WitnessPostRemovidoNaoEmiteAluno for 6
run WitnessAnexaComAcesso for 6
run WitnessMantemComAcesso for 6
run WitnessDesvinculaSemAcesso for 6
run WitnessTrocaPreservaHistorico for 6
run WitnessRetryAposExecucao for 6
run WitnessReusoIncompativel for 6
run WitnessObjetoAusenteNaoEmite for 6
