module operations/posts_m12_1

open util/integer

// M12.1 — Posts, comentários, edição/moderação e históricos.
//
// Modelo abstrato de autoria, participação canônica (M11), turma arquivada
// somente leitura (Q08), edição com histórico, remoção lógica de Post,
// moderação de Comentário com máscara, leitura autorizada, efeito mínimo de
// notificação, fronteira abstrata de acesso ao roteiro e composição M7/M9.
// Conteúdo textual é opaco (validado em CUE/Rust); não modela Firestore,
// Rules, Storage, ACL de Roteiros (M12.2), caixa de notificações (M13) nem
// concorrência real.
//
// Participação acadêmica é o vínculo canônico atual OU o professor dono da
// turma; autoria isolada nunca recria participação. Assim, um ex-aluno com
// claim atualizada não edita nem lê conteúdo protegido após a remoção.

// ---- Identidades e domínios fechados ----------------------------------------
sig Usuario {}
sig Turma {}
sig Post {}
sig Comentario {}
sig Roteiro {}

sig Vinculo {
	vAluno: one Usuario,
	vTurma: one Turma
}

sig HistPost {
	hpAlvo: one Post,
	hpTipo: one TipoHist
}
sig HistComent {
	hcAlvo: one Comentario,
	hcTipo: one TipoHist
}
sig Leitura {
	leitor:         one Usuario,
	alvo:           one Comentario,
	mostraOriginal: one SimNao
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

abstract sig TipoHist {}
one sig HEdicao, HModeracao extends TipoHist {}

abstract sig TipoCmd {}
one sig TCriarPost, TEditarPost, TRemoverPost, TCriarComent,
	TEditarComent, TModerarComent extends TipoCmd {}

abstract sig SimNao {}
one sig Sim, Nao extends SimNao {}

// ---- Estado ----------------------------------------------------------------
sig Estado {
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
	histsPost:      set HistPost,
	histsComent:    set HistComent,
	leituras:       set Leitura,
	notifs:         set Notif,
	acessoRoteiro:  Usuario -> set Roteiro,
	// M9 abstrato
	ativos:         set Usuario,
	professores:    set Usuario,
	chefes:         set Usuario,
	versaoPerm:     Usuario -> one Int,
	claimVersao:    Usuario -> lone Int,
	// M7 abstrato
	comandos:       set Comando,
	recibos:        OpId -> lone Comando
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
pred ehDono[s: Estado, u: Usuario, t: Turma] { s.donoT[t] = u }
// Participação acadêmica: vínculo canônico atual ou professor dono.
pred participa[s: Estado, u: Usuario, t: Turma] {
	temVinculo[s, u, t] or ehDono[s, u, t]
}
fun turmaDoPost[s: Estado, p: Post]: lone Turma { s.postTurma[p] }
fun turmaDoComent[s: Estado, c: Comentario]: lone Turma {
	s.postTurma[s.comentPost[c]]
}

pred coerente[s: Estado] {
	all t: s.turmas | one s.statusT[t] and one s.donoT[t]
	all p: s.posts | one s.postTurma[p] and one s.postAutor[p]
		and s.postTurma[p] in s.turmas
		and s.postAutor[p] = s.donoT[s.postTurma[p]]
		and s.postAutor[p] in s.professores
	all c: s.comentarios | one s.comentPost[c] and one s.comentAutor[c]
		and s.comentPost[c] in s.posts
	all v: s.vinculos | v.vTurma in s.turmas
	all disj v1, v2: s.vinculos |
		v1.vAluno != v2.vAluno or v1.vTurma != v2.vTurma
	all h: s.histsPost | h.hpAlvo in s.posts
	all h: s.histsComent | h.hcAlvo in s.comentarios
	all l: s.leituras | l.alvo in s.comentarios
	all n: s.notifs | n.nAlvo in s.posts
	// papéis disjuntos (Chefe exclusivo)
	no u: Usuario | u in s.chefes and u in s.professores
	all u: Usuario | s.versaoPerm[u] >= 0
	// M7: recibo por id e identidade de comando
	all o: s.comandos | s.recibos[o.cmdId] = o
	all disj c1, c2: s.comandos |
		(c1.cmdUid = c2.cmdUid and c1.cmdTipo = c2.cmdTipo
			and c1.cmdPayload = c2.cmdPayload) implies c1.cmdId = c2.cmdId
	all disj c1, c2: s.comandos | c1.cmdId != c2.cmdId
}

// ---- Pré-condições por operação --------------------------------------------
pred podeCriarPost[s: Estado, u: Usuario, t: Turma] {
	authOk[s, u] and u in s.professores and s.donoT[t] = u
	and s.statusT[t] = Ativo
}
pred podeEditarPost[s: Estado, u: Usuario, p: Post] {
	authOk[s, u] and s.postAutor[p] = u and s.statusT[s.postTurma[p]] = Ativo
}
pred podeRemoverPost[s: Estado, u: Usuario, p: Post] {
	authOk[s, u] and s.statusT[s.postTurma[p]] = Ativo
	and (s.postAutor[p] = u or u in s.chefes)
}
pred podeCriarComent[s: Estado, u: Usuario, p: Post] {
	authOk[s, u] and s.statusT[s.postTurma[p]] = Ativo
	and participa[s, u, s.postTurma[p]]
}
pred podeEditarComent[s: Estado, u: Usuario, c: Comentario] {
	authOk[s, u] and s.comentAutor[c] = u
	and s.statusT[s.postTurma[s.comentPost[c]]] = Ativo
	and participa[s, u, s.postTurma[s.comentPost[c]]]
}
pred podeModerarComent[s: Estado, u: Usuario, c: Comentario] {
	authOk[s, u]
	and s.statusT[s.postTurma[s.comentPost[c]]] = Ativo
	and (ehDono[s, u, s.postTurma[s.comentPost[c]]] or u in s.chefes)
}
pred podeLerComent[s: Estado, u: Usuario, c: Comentario] {
	authOk[s, u]
	and (participa[s, u, s.postTurma[s.comentPost[c]]] or u in s.chefes)
}
pred acessoRoteiroValidado[s: Estado, u: Usuario, rot: Roteiro] {
	rot in s.acessoRoteiro[u]
}

// ---- Frames -----------------------------------------------------------------
pred frameAuth[a, b: Estado] {
	b.ativos = a.ativos and b.professores = a.professores and b.chefes = a.chefes
	and b.versaoPerm = a.versaoPerm and b.claimVersao = a.claimVersao
}
// Frames granulares: cada transição chama apenas os frames dos campos que NÃO
// altera. Um frame não pode fixar campo que a própria transição grava.
pred frameTurma[a, b: Estado] {
	b.turmas = a.turmas and b.statusT = a.statusT and b.donoT = a.donoT
}
pred frameVinc[a, b: Estado] { b.vinculos = a.vinculos }
pred framePosts[a, b: Estado] {
	b.posts = a.posts and b.postTurma = a.postTurma and b.postAutor = a.postAutor
	and b.postRemovido = a.postRemovido
}
pred frameComents[a, b: Estado] {
	b.comentarios = a.comentarios and b.comentPost = a.comentPost
	and b.comentAutor = a.comentAutor and b.comentModerado = a.comentModerado
}
pred frameHist[a, b: Estado] { b.histsPost = a.histsPost and b.histsComent = a.histsComent }
pred frameMisc[a, b: Estado] {
	b.leituras = a.leituras and b.notifs = a.notifs and b.acessoRoteiro = a.acessoRoteiro
}
// Primeira execução de um comando: exige identidade nova e grava o recibo.
pred registraComando[a, b: Estado, o: Comando] {
	o not in a.comandos and no a.recibos[o.cmdId]
	b.comandos = a.comandos + o
	b.recibos = a.recibos ++ (o.cmdId -> o)
}

// ---- Transições -------------------------------------------------------------
pred criarPost[a, b: Estado, t: Turma, u: Usuario, p: Post, n: Notif, o: Comando] {
	coerente[a]
	podeCriarPost[a, u, t]
	o.cmdUid = u and o.cmdTipo = TCriarPost
	p not in a.posts
	n not in a.notifs
	n.nAlvo = p and n.nOperacao = o.cmdId
	frameTurma[a, b] and frameVinc[a, b] and frameComents[a, b] and frameHist[a, b]
	frameAuth[a, b]
	b.leituras = a.leituras and b.acessoRoteiro = a.acessoRoteiro
	registraComando[a, b, o]
	b.posts = a.posts + p
	b.postTurma = a.postTurma ++ (p -> t)
	b.postAutor = a.postAutor ++ (p -> u)
	b.notifs = a.notifs + n
	coerente[b]
}
pred criarPostComRoteiro[a, b: Estado, t: Turma, u: Usuario, p: Post, n: Notif,
		o: Comando, rot: Roteiro] {
	coerente[a]
	podeCriarPost[a, u, t]
	acessoRoteiroValidado[a, u, rot]
	o.cmdUid = u and o.cmdTipo = TCriarPost
	p not in a.posts
	n not in a.notifs
	n.nAlvo = p and n.nOperacao = o.cmdId
	frameTurma[a, b] and frameVinc[a, b] and frameComents[a, b] and frameHist[a, b]
	frameAuth[a, b]
	b.leituras = a.leituras and b.acessoRoteiro = a.acessoRoteiro
	registraComando[a, b, o]
	b.posts = a.posts + p
	b.postTurma = a.postTurma ++ (p -> t)
	b.postAutor = a.postAutor ++ (p -> u)
	b.notifs = a.notifs + n
	coerente[b]
}
pred editarPost[a, b: Estado, p: Post, u: Usuario, h: HistPost, o: Comando] {
	coerente[a]
	podeEditarPost[a, u, p]
	o.cmdUid = u and o.cmdTipo = TEditarPost
	h not in a.histsPost
	h.hpAlvo = p and h.hpTipo = HEdicao
	frameTurma[a, b] and frameVinc[a, b] and framePosts[a, b]
	frameComents[a, b] and frameMisc[a, b]
	frameAuth[a, b]
	registraComando[a, b, o]
	b.histsComent = a.histsComent
	b.histsPost = a.histsPost + h
	coerente[b]
}
pred removerPost[a, b: Estado, p: Post, u: Usuario, h: HistPost, o: Comando] {
	coerente[a]
	podeRemoverPost[a, u, p]
	o.cmdUid = u and o.cmdTipo = TRemoverPost
	p not in a.postRemovido
	h not in a.histsPost
	h.hpAlvo = p and h.hpTipo = HModeracao
	frameTurma[a, b] and frameVinc[a, b] and frameComents[a, b] and frameMisc[a, b]
	frameAuth[a, b]
	registraComando[a, b, o]
	b.posts = a.posts and b.postTurma = a.postTurma and b.postAutor = a.postAutor
	b.histsComent = a.histsComent
	b.postRemovido = a.postRemovido + p
	b.histsPost = a.histsPost + h
	coerente[b]
}
pred criarComent[a, b: Estado, p: Post, u: Usuario, c: Comentario, o: Comando] {
	coerente[a]
	podeCriarComent[a, u, p]
	o.cmdUid = u and o.cmdTipo = TCriarComent
	c not in a.comentarios
	frameTurma[a, b] and frameVinc[a, b] and framePosts[a, b] and frameHist[a, b]
	frameMisc[a, b] and frameAuth[a, b]
	registraComando[a, b, o]
	b.comentModerado = a.comentModerado
	b.comentarios = a.comentarios + c
	b.comentPost = a.comentPost ++ (c -> p)
	b.comentAutor = a.comentAutor ++ (c -> u)
	coerente[b]
}
pred editarComent[a, b: Estado, c: Comentario, u: Usuario, h: HistComent, o: Comando] {
	coerente[a]
	podeEditarComent[a, u, c]
	o.cmdUid = u and o.cmdTipo = TEditarComent
	h not in a.histsComent
	h.hcAlvo = c and h.hcTipo = HEdicao
	frameTurma[a, b] and frameVinc[a, b] and framePosts[a, b]
	frameComents[a, b] and frameMisc[a, b]
	frameAuth[a, b]
	registraComando[a, b, o]
	b.histsPost = a.histsPost
	b.histsComent = a.histsComent + h
	coerente[b]
}
pred moderarComent[a, b: Estado, c: Comentario, u: Usuario, h: HistComent, o: Comando] {
	coerente[a]
	podeModerarComent[a, u, c]
	o.cmdUid = u and o.cmdTipo = TModerarComent
	c not in a.comentModerado
	h not in a.histsComent
	h.hcAlvo = c and h.hcTipo = HModeracao
	frameTurma[a, b] and frameVinc[a, b] and framePosts[a, b] and frameMisc[a, b]
	frameAuth[a, b]
	registraComando[a, b, o]
	b.comentarios = a.comentarios and b.comentPost = a.comentPost
	b.comentAutor = a.comentAutor and b.histsPost = a.histsPost
	b.comentModerado = a.comentModerado + c
	b.histsComent = a.histsComent + h
	coerente[b]
}
pred arquivarTurma[a, b: Estado, t: Turma, u: Usuario] {
	coerente[a]
	authOk[a, u]
	a.statusT[t] = Ativo
	(ehDono[a, u, t] or u in a.chefes)
	frameVinc[a, b] and framePosts[a, b] and frameComents[a, b] and frameHist[a, b]
	frameMisc[a, b] and frameAuth[a, b]
	b.comandos = a.comandos and b.recibos = a.recibos
	b.turmas = a.turmas and b.donoT = a.donoT
	b.statusT = a.statusT ++ (t -> Arquivada)
	coerente[b]
}
pred listar[a, b: Estado, c: Comentario, u: Usuario, l: Leitura] {
	coerente[a]
	podeLerComent[a, u, c]
	l not in a.leituras
	l.leitor = u and l.alvo = c
	((c in a.comentModerado and (a.comentAutor[c] = u or ehDono[a, u, turmaDoComent[a, c]]
		or u in a.chefes)) implies l.mostraOriginal = Sim)
	((c in a.comentModerado and not (a.comentAutor[c] = u or ehDono[a, u, turmaDoComent[a, c]]
		or u in a.chefes)) implies l.mostraOriginal = Nao)
	(c not in a.comentModerado implies l.mostraOriginal = Sim)
	frameTurma[a, b] and frameVinc[a, b] and framePosts[a, b]
	frameComents[a, b] and frameHist[a, b]
	frameAuth[a, b]
	b.comandos = a.comandos and b.recibos = a.recibos
	b.notifs = a.notifs and b.acessoRoteiro = a.acessoRoteiro
	b.leituras = a.leituras + l
	coerente[b]
}
pred revogarVinculo[a, b: Estado, u: Usuario, t: Turma] {
	coerente[a]
	temVinculo[a, u, t]
	authOk[a, u]
	a.versaoPerm[u] < 7
	frameTurma[a, b] and framePosts[a, b] and frameComents[a, b] and frameHist[a, b]
	frameMisc[a, b]
	b.comandos = a.comandos and b.recibos = a.recibos
	b.ativos = a.ativos and b.professores = a.professores and b.chefes = a.chefes
	b.claimVersao = a.claimVersao
	b.vinculos = a.vinculos - {v: a.vinculos | v.vAluno = u and v.vTurma = t}
	b.versaoPerm = a.versaoPerm ++ (u -> plus[a.versaoPerm[u], 1])
	coerente[b]
}
// Refresh abstrato de token/claim: projeta versaoPerm corrente na claim. Serve
// para mostrar que a atualização da claim, por si só, não recria participação.
pred atualizarClaim[a, b: Estado, u: Usuario] {
	coerente[a]
	frameTurma[a, b] and frameVinc[a, b] and framePosts[a, b] and frameComents[a, b]
	frameHist[a, b] and frameMisc[a, b]
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

// ---- Assertions: turma e autorização ---------------------------------------
assert CriarPostSoEmAtivo {
	all a, b: Estado, t: Turma, u: Usuario, p: Post, n: Notif, o: Comando |
		criarPost[a, b, t, u, p, n, o] implies a.statusT[t] = Ativo
}
assert EditarPostSoEmAtivo {
	all a, b: Estado, p: Post, u: Usuario, h: HistPost, o: Comando |
		editarPost[a, b, p, u, h, o] implies a.statusT[a.postTurma[p]] = Ativo
}
assert RemoverPostSoEmAtivo {
	all a, b: Estado, p: Post, u: Usuario, h: HistPost, o: Comando |
		removerPost[a, b, p, u, h, o] implies a.statusT[a.postTurma[p]] = Ativo
}
assert CriarComentSoEmAtivo {
	all a, b: Estado, p: Post, u: Usuario, c: Comentario, o: Comando |
		criarComent[a, b, p, u, c, o] implies a.statusT[a.postTurma[p]] = Ativo
}
assert EditarComentSoEmAtivo {
	all a, b: Estado, c: Comentario, u: Usuario, h: HistComent, o: Comando |
		editarComent[a, b, c, u, h, o] implies a.statusT[a.postTurma[a.comentPost[c]]] = Ativo
}
assert ModerarComentSoEmAtivo {
	all a, b: Estado, c: Comentario, u: Usuario, h: HistComent, o: Comando |
		moderarComent[a, b, c, u, h, o] implies a.statusT[a.postTurma[a.comentPost[c]]] = Ativo
}
// Propriedade transversal: turma arquivada não aceita nenhuma escrita acadêmica.
assert TurmaArquivadaNegaEscrita {
	all a: Estado, t: Turma |
		(coerente[a] and a.statusT[t] = Arquivada) implies not (
			(some b: Estado, u: Usuario, p: Post, n: Notif, o: Comando |
				criarPost[a, b, t, u, p, n, o])
			or (some b: Estado, u: Usuario, p: Post, n: Notif, o: Comando, rot: Roteiro |
				criarPostComRoteiro[a, b, t, u, p, n, o, rot])
			or (some b: Estado, u: Usuario, p: Post, h: HistPost, o: Comando |
				p in a.posts and a.postTurma[p] = t and editarPost[a, b, p, u, h, o])
			or (some b: Estado, u: Usuario, p: Post, h: HistPost, o: Comando |
				p in a.posts and a.postTurma[p] = t and removerPost[a, b, p, u, h, o])
			or (some b: Estado, u: Usuario, p: Post, c: Comentario, o: Comando |
				p in a.posts and a.postTurma[p] = t and criarComent[a, b, p, u, c, o])
			or (some b: Estado, u: Usuario, c: Comentario, h: HistComent, o: Comando |
				c in a.comentarios and a.postTurma[a.comentPost[c]] = t
					and editarComent[a, b, c, u, h, o])
			or (some b: Estado, u: Usuario, c: Comentario, h: HistComent, o: Comando |
				c in a.comentarios and a.postTurma[a.comentPost[c]] = t
					and moderarComent[a, b, c, u, h, o])
		)
}
assert ChefeNaoCriaPost {
	all a, b: Estado, t: Turma, u: Usuario, p: Post, n: Notif, o: Comando |
		criarPost[a, b, t, u, p, n, o] implies u not in a.chefes
}
assert ChefeNaoEditaConteudo {
	all a, b: Estado, p: Post, u: Usuario, h: HistPost, o: Comando |
		editarPost[a, b, p, u, h, o] implies u not in a.chefes
}
assert AutorImutavelPost {
	all a, b: Estado, p: Post, u: Usuario, h: HistPost, o: Comando |
		(editarPost[a, b, p, u, h, o] or removerPost[a, b, p, u, h, o])
			implies b.postAutor[p] = a.postAutor[p]
}
assert AutorImutavelComent {
	all a, b: Estado, c: Comentario, u: Usuario, h: HistComent, o: Comando |
		(editarComent[a, b, c, u, h, o] or moderarComent[a, b, c, u, h, o])
			implies b.comentAutor[c] = a.comentAutor[c]
}
assert TerceiroNaoEditaPost {
	all a, b: Estado, p: Post, u: Usuario, h: HistPost, o: Comando |
		editarPost[a, b, p, u, h, o] implies a.postAutor[p] = u
}
assert TerceiroNaoEditaComent {
	all a, b: Estado, c: Comentario, u: Usuario, h: HistComent, o: Comando |
		editarComent[a, b, c, u, h, o] implies a.comentAutor[c] = u
}
assert ComentarExigeParticipacaoAtual {
	all a, b: Estado, p: Post, u: Usuario, c: Comentario, o: Comando |
		criarComent[a, b, p, u, c, o] implies participa[a, u, a.postTurma[p]]
}
assert EditarComentExigeParticipacaoAtual {
	all a, b: Estado, c: Comentario, u: Usuario, h: HistComent, o: Comando |
		editarComent[a, b, c, u, h, o]
			implies participa[a, u, a.postTurma[a.comentPost[c]]]
}
assert RemovidoNaoEditaComent {
	all s: Estado, u: Usuario, c: Comentario |
		not participa[s, u, turmaDoComent[s, c]] implies not podeEditarComent[s, u, c]
}
assert RemovidoNaoLe {
	all s: Estado, u: Usuario, c: Comentario |
		not participa[s, u, turmaDoComent[s, c]] and u not in s.chefes
			implies not podeLerComent[s, u, c]
}
assert LerExigeParticipacaoOuPapel {
	all a, b: Estado, c: Comentario, u: Usuario, l: Leitura |
		listar[a, b, c, u, l] implies
			(authOk[a, u]
				and (participa[a, u, a.postTurma[a.comentPost[c]]] or u in a.chefes))
}
assert InativoNaoLe {
	all s: Estado, u: Usuario, c: Comentario |
		u not in s.ativos implies not podeLerComent[s, u, c]
}

// ---- Assertions: edição, remoção e histórico --------------------------------
assert EdicaoPostCriaHistorico {
	all a, b: Estado, p: Post, u: Usuario, h: HistPost, o: Comando |
		editarPost[a, b, p, u, h, o] implies
			(h in b.histsPost and h not in a.histsPost and h.hpAlvo = p and h.hpTipo = HEdicao)
}
assert RemocaoPostCriaHistorico {
	all a, b: Estado, p: Post, u: Usuario, h: HistPost, o: Comando |
		removerPost[a, b, p, u, h, o] implies (p in b.posts and h in b.histsPost and h.hpTipo = HModeracao)
}
assert RemocaoPreservaDocumento {
	all a, b: Estado, p: Post, u: Usuario, h: HistPost, o: Comando |
		removerPost[a, b, p, u, h, o] implies (p in b.posts and b.histsPost = a.histsPost + h)
}
assert HistoricoNuncaRemovido {
	all a, b: Estado, p: Post, u: Usuario, h: HistPost, o: Comando |
		(editarPost[a, b, p, u, h, o] or removerPost[a, b, p, u, h, o])
			implies (a.histsPost in b.histsPost)
}
assert EdicaoComentCriaHistorico {
	all a, b: Estado, c: Comentario, u: Usuario, h: HistComent, o: Comando |
		editarComent[a, b, c, u, h, o] implies
			(h in b.histsComent and h not in a.histsComent and h.hcAlvo = c and h.hcTipo = HEdicao)
}
assert ModeracaoComentCriaHistorico {
	all a, b: Estado, c: Comentario, u: Usuario, h: HistComent, o: Comando |
		moderarComent[a, b, c, u, h, o] implies
			(c in b.comentarios and h in b.histsComent and h.hcTipo = HModeracao)
}
assert EdicaoNaoDesfazModeracao {
	all a, b: Estado, c: Comentario, u: Usuario, h: HistComent, o: Comando |
		editarComent[a, b, c, u, h, o] implies
			((c in b.comentModerado) iff (c in a.comentModerado))
}
assert ComentModeradoPreservado {
	all a, b: Estado, c: Comentario, u: Usuario, h: HistComent, o: Comando |
		moderarComent[a, b, c, u, h, o] implies (c in b.comentModerado and c in b.comentarios)
}

// ---- Assertions: máscara e leitura -----------------------------------------
assert ColegaNaoVeOriginalModerado {
	all a, b: Estado, c: Comentario, u: Usuario, l: Leitura |
		listar[a, b, c, u, l] and c in a.comentModerado
			and a.comentAutor[c] != u
			and a.donoT[a.postTurma[a.comentPost[c]]] != u
			and u not in a.chefes
			implies l.mostraOriginal = Nao
}
assert AutorVeOriginalMarcado {
	all a, b: Estado, c: Comentario, u: Usuario, l: Leitura |
		listar[a, b, c, u, l] and c in a.comentModerado and a.comentAutor[c] = u
			implies l.mostraOriginal = Sim
}
assert AuditorVeOriginal {
	all a, b: Estado, c: Comentario, u: Usuario, l: Leitura |
		listar[a, b, c, u, l] and c in a.comentModerado
			and (u in a.chefes or a.donoT[a.postTurma[a.comentPost[c]]] = u)
			implies l.mostraOriginal = Sim
}

// ---- Assertions: notificação, roteiro e M7/M9 -------------------------------
assert NotificacaoSoDoAlvo {
	all a, b: Estado, t: Turma, u: Usuario, p: Post, n: Notif, o: Comando |
		criarPost[a, b, t, u, p, n, o]
			implies (n.nAlvo = p and n in b.notifs and n.nOperacao = o.cmdId)
}
assert SemAcessoNaoPublicaComRoteiro {
	all a: Estado, u: Usuario, t: Turma, p: Post, n: Notif, o: Comando, rot: Roteiro |
		(coerente[a] and not acessoRoteiroValidado[a, u, rot]) implies
			(no b: Estado | criarPostComRoteiro[a, b, t, u, p, n, o, rot])
}
assert PublicacaoComRoteiroExigeAcesso {
	all a, b: Estado, t: Turma, u: Usuario, p: Post, n: Notif, o: Comando, rot: Roteiro |
		criarPostComRoteiro[a, b, t, u, p, n, o, rot]
			implies acessoRoteiroValidado[a, u, rot]
}
assert PrimeiraExecucaoProduzReceipt {
	all a, b: Estado, t: Turma, u: Usuario, p: Post, n: Notif, o: Comando,
		h: HistPost, hp: HistPost, c: Comentario, hc: HistComent, rot: Roteiro |
		(criarPost[a, b, t, u, p, n, o] or criarPostComRoteiro[a, b, t, u, p, n, o, rot]
			or editarPost[a, b, p, u, h, o] or removerPost[a, b, p, u, hp, o]
			or criarComent[a, b, p, u, c, o] or editarComent[a, b, c, u, hc, o]
			or moderarComent[a, b, c, u, hc, o])
			implies (o in b.comandos and b.recibos[o.cmdId] = o
				and o not in a.comandos)
}
assert IdentidadeComandoUnica {
	all s: Estado | coerente[s] implies
		(all disj c1, c2: s.comandos |
			(c1.cmdUid = c2.cmdUid and c1.cmdTipo = c2.cmdTipo
				and c1.cmdPayload = c2.cmdPayload) implies c1.cmdId = c2.cmdId)
}
// Reuso incompatível: um comando cujo id já foi consumido por outra identidade
// não é aceito por nenhuma transição.
assert ReusoIncompativelRejeitado {
	all a: Estado, o2: Comando |
		(coerente[a] and (some o1: a.comandos | o1.cmdId = o2.cmdId and o1 != o2)) implies not (
			(some b: Estado, t: Turma, u: Usuario, p: Post, n: Notif |
				criarPost[a, b, t, u, p, n, o2])
			or (some b: Estado, p: Post, u: Usuario, h: HistPost |
				editarPost[a, b, p, u, h, o2])
			or (some b: Estado, p: Post, u: Usuario, h: HistPost |
				removerPost[a, b, p, u, h, o2])
			or (some b: Estado, p: Post, u: Usuario, c: Comentario |
				criarComent[a, b, p, u, c, o2])
			or (some b: Estado, c: Comentario, u: Usuario, h: HistComent |
				editarComent[a, b, c, u, h, o2])
			or (some b: Estado, c: Comentario, u: Usuario, h: HistComent |
				moderarComent[a, b, c, u, h, o2])
		)
}
assert RetryNaoReexecuta {
	all a, b: Estado, o: Comando | retryM7[a, b, o] implies b = a
}
assert RetryNaoDuplicaFato {
	all a, b: Estado, o: Comando | retryM7[a, b, o] implies
		(b.histsPost = a.histsPost and b.histsComent = a.histsComent
			and b.comentarios = a.comentarios and b.posts = a.posts
			and b.notifs = a.notifs)
}
assert RevogacaoImpedeCommit {
	all a, b: Estado, u: Usuario, t: Turma |
		revogarVinculo[a, b, u, t] implies not authOk[b, u]
}
assert TransicoesPreservamCoerencia {
	all a, b: Estado, t: Turma, u: Usuario, p: Post, n: Notif, c: Comentario,
		hp: HistPost, hc: HistComent, l: Leitura, rot: Roteiro, o: Comando |
		(criarPost[a, b, t, u, p, n, o] or criarPostComRoteiro[a, b, t, u, p, n, o, rot]
			or editarPost[a, b, p, u, hp, o] or removerPost[a, b, p, u, hp, o]
			or criarComent[a, b, p, u, c, o] or editarComent[a, b, c, u, hc, o]
			or moderarComent[a, b, c, u, hc, o] or arquivarTurma[a, b, t, u]
			or listar[a, b, c, u, l] or revogarVinculo[a, b, u, t]
			or atualizarClaim[a, b, u] or retryM7[a, b, o])
			implies coerente[b]
}

// ---- Witnesses --------------------------------------------------------------
pred WitnessTurmaAtiva {
	some s: Estado, t: Turma | coerente[s] and t in s.turmas and s.statusT[t] = Ativo
}
pred WitnessCriarPost {
	some a, b: Estado, t: Turma, u: Usuario, p: Post, n: Notif, o: Comando |
		criarPost[a, b, t, u, p, n, o]
}
pred WitnessPublicaComRoteiro {
	some a, b: Estado, t: Turma, u: Usuario, p: Post, n: Notif, o: Comando, rot: Roteiro |
		criarPostComRoteiro[a, b, t, u, p, n, o, rot]
}
pred WitnessEditarPost {
	some a, b: Estado, p: Post, u: Usuario, h: HistPost, o: Comando | editarPost[a, b, p, u, h, o]
}
pred WitnessRemoverPost {
	some a, b: Estado, p: Post, u: Usuario, h: HistPost, o: Comando | removerPost[a, b, p, u, h, o]
}
pred WitnessCriarComent {
	some a, b: Estado, p: Post, u: Usuario, c: Comentario, o: Comando | criarComent[a, b, p, u, c, o]
}
pred WitnessEditarComent {
	some a, b: Estado, c: Comentario, u: Usuario, h: HistComent, o: Comando |
		editarComent[a, b, c, u, h, o]
}
pred WitnessModerarComent {
	some a, b: Estado, c: Comentario, u: Usuario, h: HistComent, o: Comando |
		moderarComent[a, b, c, u, h, o]
}
pred WitnessEdicaoNaoDesfazModeracao {
	some a, b: Estado, c: Comentario, u: Usuario, h: HistComent, o: Comando |
		editarComent[a, b, c, u, h, o] and c in a.comentModerado
}
pred WitnessLeituraMascarada {
	some a, b: Estado, c: Comentario, u: Usuario, l: Leitura |
		listar[a, b, c, u, l] and c in a.comentModerado and a.comentAutor[c] != u
		and a.donoT[a.postTurma[a.comentPost[c]]] != u and u not in a.chefes
		and l.mostraOriginal = Nao
}
pred WitnessChefeModera {
	some a, b: Estado, c: Comentario, u: Usuario, h: HistComent, o: Comando |
		moderarComent[a, b, c, u, h, o] and u in a.chefes
}
pred WitnessRemocaoAlunoBloqueia {
	some a, b: Estado, u: Usuario, t: Turma |
		revogarVinculo[a, b, u, t] and a.vinculos != b.vinculos
		and not temVinculo[b, u, t]
}
// Primeira execução seguida de retry: o replay não reaplica a mutação.
pred WitnessRetryAposExecucao {
	some a, b, c: Estado, t: Turma, u: Usuario, p: Post, n: Notif, o: Comando |
		criarPost[a, b, t, u, p, n, o] and retryM7[b, c, o]
}
// Ex-aluno com claim atualizada (authOk) e autoria de comentário, mas sem
// vínculo nem ownership: não edita nem lê — a claim não recria participação.
pred WitnessClaimAtualSemVinculo {
	some a, b, c: Estado, u: Usuario, t: Turma, cm: Comentario |
		coerente[a] and temVinculo[a, u, t] and authOk[a, u]
		and cm in a.comentarios and a.comentAutor[cm] = u
		and a.postTurma[a.comentPost[cm]] = t
		and revogarVinculo[a, b, u, t] and atualizarClaim[b, c, u]
		and authOk[c, u] and not temVinculo[c, u, t] and not ehDono[c, u, t]
		and u not in c.chefes
		and not podeEditarComent[c, u, cm] and not podeLerComent[c, u, cm]
}
pred WitnessReusoIncompativel {
	some a: Estado, o1: Comando, o2: Comando |
		coerente[a] and o1 in a.comandos and o1.cmdId = o2.cmdId and o1 != o2
}
pred WitnessRoteiroAceito {
	some a, b: Estado, t: Turma, u: Usuario, p: Post, n: Notif, o: Comando, rot: Roteiro |
		criarPostComRoteiro[a, b, t, u, p, n, o, rot] and acessoRoteiroValidado[a, u, rot]
}
pred WitnessRetry {
	some a, b: Estado, o: Comando | retryM7[a, b, o] and b = a
}

// ---- Comandos ---------------------------------------------------------------
check CriarPostSoEmAtivo for 6
check EditarPostSoEmAtivo for 6
check RemoverPostSoEmAtivo for 6
check CriarComentSoEmAtivo for 6
check EditarComentSoEmAtivo for 6
check ModerarComentSoEmAtivo for 6
check TurmaArquivadaNegaEscrita for 6
check ChefeNaoCriaPost for 6
check ChefeNaoEditaConteudo for 6
check AutorImutavelPost for 6
check AutorImutavelComent for 6
check TerceiroNaoEditaPost for 6
check TerceiroNaoEditaComent for 6
check ComentarExigeParticipacaoAtual for 6
check EditarComentExigeParticipacaoAtual for 6
check RemovidoNaoEditaComent for 6
check RemovidoNaoLe for 6
check LerExigeParticipacaoOuPapel for 6
check InativoNaoLe for 6
check EdicaoPostCriaHistorico for 6
check RemocaoPostCriaHistorico for 6
check RemocaoPreservaDocumento for 6
check HistoricoNuncaRemovido for 6
check EdicaoComentCriaHistorico for 6
check ModeracaoComentCriaHistorico for 6
check EdicaoNaoDesfazModeracao for 6
check ComentModeradoPreservado for 6
check ColegaNaoVeOriginalModerado for 6
check AutorVeOriginalMarcado for 6
check AuditorVeOriginal for 6
check NotificacaoSoDoAlvo for 6
check SemAcessoNaoPublicaComRoteiro for 6
check PublicacaoComRoteiroExigeAcesso for 6
check PrimeiraExecucaoProduzReceipt for 6
check IdentidadeComandoUnica for 6
check ReusoIncompativelRejeitado for 6
check RetryNaoReexecuta for 6
check RetryNaoDuplicaFato for 6
check RevogacaoImpedeCommit for 6
check TransicoesPreservamCoerencia for 6

run WitnessTurmaAtiva for 4
run WitnessCriarPost for 6
run WitnessPublicaComRoteiro for 6
run WitnessEditarPost for 6
run WitnessRemoverPost for 6
run WitnessCriarComent for 6
run WitnessEditarComent for 6
run WitnessModerarComent for 6
run WitnessEdicaoNaoDesfazModeracao for 6
run WitnessLeituraMascarada for 6
run WitnessChefeModera for 6
run WitnessRemocaoAlunoBloqueia for 6
run WitnessRetryAposExecucao for 6
run WitnessClaimAtualSemVinculo for 6
run WitnessReusoIncompativel for 6
run WitnessRoteiroAceito for 6
run WitnessRetry for 4
