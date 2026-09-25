module operations/turmas_m11

open util/integer

// M11 — Turma, matrícula e convite de ingresso.
//
// Modelo abstrato de identidade de turma, matrícula canônica, espelho de
// consulta, contador, exceção nominal de capacidade, arquivamento, remoção,
// reingresso, convite com chave determinística de pendência e composição
// abstrata com M7 (idempotência) e M9 (autorização). Não modela Firestore,
// Auth, envio de e-mail, HMAC concreto, índices nem concorrência sob carga; a
// canonicalização concreta da pendência pertence ao Rust. O espelho é
// modelado como projeção exata do vínculo canônico, portanto nunca é autoridade
// de acesso.

// ---- Identidades e domínios fechados ----------------------------------------
sig Usuario {}
sig Materia {}
sig Codigo {}
sig Email {}
sig Just {}
sig Turma {}

abstract sig StatusTurma {}
one sig Ativo, Arquivada extends StatusTurma {}

abstract sig TipoEvento {}
one sig Inclusao, Exclusao extends TipoEvento {}

abstract sig ModoIngresso {}
one sig PorCodigo, PorConvite extends ModoIngresso {}

abstract sig StatusConvite {}
one sig Pendente, Aceitado, Expirado extends StatusConvite {}

abstract sig SimNao {}
one sig Sim, Nao extends SimNao {}

sig Vinculo {
	vAluno: one Usuario,
	vTurma: one Turma
}

sig Espelho {
	eAluno: one Usuario,
	eTurma: one Turma
}

sig Evento {
	evAluno: one Usuario,
	evTurma: one Turma,
	evTipo: one TipoEvento,
	evModo: lone ModoIngresso
}

sig Convite {
	cAluno: one Usuario,
	cTurma: lone Turma,
	cEmail: one Email,
	cExcede: one SimNao,
	cJust: lone Just
}

// Chave determinística de pendência (HMAC). Distinta do ID imutável do convite.
sig Pendencia {
	pEmail: one Email,
	pTurma: lone Turma,
	pConvite: one Convite
}

// ---- M7 mínimo (identidade de comando) --------------------------------------
sig OpId {}
sig Payload {}
abstract sig TipoCmd {}
one sig TAceitar, TRemover, TIngressar extends TipoCmd {}
sig Comando {
	cmdUid:     one Usuario,
	cmdTipo:    one TipoCmd,
	cmdPayload: one Payload,
	cmdId:      one OpId
}

// ---- Estado ----------------------------------------------------------------
sig Estado {
	turmas:         set Turma,
	statusT:        Turma -> lone StatusTurma,
	donoT:          Turma -> lone Usuario,
	materiaT:       Turma -> lone Materia,
	capacidadeT:    Turma -> lone Int,
	qtdT:           Turma -> lone Int,
	codigoT:        Turma -> lone Codigo,
	versaoT:        Turma -> lone Int,
	reservasCodigo: Codigo -> lone Turma,
	vinculos:       set Vinculo,
	espelhos:       set Espelho,
	eventos:        set Evento,
	convites:       set Convite,
	statusC:        Convite -> lone StatusConvite,
	pendencias:     set Pendencia,
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

fun vinculosDaTurma[s: Estado, t: Turma]: set Vinculo {
	{v: s.vinculos | v.vTurma = t}
}

// ---- Coerência -------------------------------------------------------------
pred coerente[s: Estado] {
	all t: s.turmas |
		one s.statusT[t] and one s.donoT[t] and one s.materiaT[t]
		and one s.capacidadeT[t] and one s.qtdT[t] and one s.codigoT[t]
		and one s.versaoT[t]
	all t: s.turmas | s.capacidadeT[t] >= 1 and s.qtdT[t] >= 0 and s.versaoT[t] >= 1
	// Chaves_Unicas/Turma__{codigo}: reserva permanente e bijetiva
	all t: s.turmas | s.reservasCodigo[s.codigoT[t]] = t
	all c: Codigo | some s.reservasCodigo[c] implies
		(s.reservasCodigo[c] in s.turmas and s.codigoT[s.reservasCodigo[c]] = c)
	// vínculo canônico: turma existente e par (aluno, turma) único
	all v: s.vinculos | v.vTurma in s.turmas
	all disj v1, v2: s.vinculos |
		v1.vAluno != v2.vAluno or v1.vTurma != v2.vTurma
	// contador transacional = cardinalidade dos vínculos canônicos
	all t: s.turmas | s.qtdT[t] = #(vinculosDaTurma[s, t])
	// espelho é projeção exata do vínculo canônico
	all v: s.vinculos | one e: s.espelhos | e.eAluno = v.vAluno and e.eTurma = v.vTurma
	all e: s.espelhos | one v: s.vinculos | v.vAluno = e.eAluno and v.vTurma = e.eTurma
	// convites: status único; exceção exige justificativa
	all c: s.convites | one s.statusC[c]
	all c: s.convites | (c.cExcede = Sim) iff (one c.cJust)
	// pendência ativa aponta para convite pendente; contexto coerente
	all p: s.pendencias | p.pConvite in s.convites and s.statusC[p.pConvite] = Pendente
	all p: s.pendencias | p.pEmail = p.pConvite.cEmail
	all p: s.pendencias | p.pTurma = p.pConvite.cTurma
	all disj p1, p2: s.pendencias |
		not (p1.pEmail = p2.pEmail and p1.pTurma = p2.pTurma)
	all c: s.convites | s.statusC[c] = Pendente implies
		one p: s.pendencias | p.pConvite = c
	// M7: recibo por id e identidade de comando
	all o: s.comandos | s.recibos[o.cmdId] = o
	all disj c1, c2: s.comandos |
		(c1.cmdUid = c2.cmdUid and c1.cmdTipo = c2.cmdTipo
			and c1.cmdPayload = c2.cmdPayload) implies c1.cmdId = c2.cmdId
}

// ---- Autorização M9 (interface abstrata) ------------------------------------
pred versaoCorrente[s: Estado, u: Usuario] {
	one s.claimVersao[u] and s.claimVersao[u] = s.versaoPerm[u]
}
pred authOk[s: Estado, u: Usuario] {
	u in s.ativos and versaoCorrente[s, u]
}
pred podeGerirTurma[s: Estado, u: Usuario, t: Turma] {
	authOk[s, u] and t in s.turmas and (s.donoT[t] = u or u in s.chefes)
}
pred temVinculo[s: Estado, u: Usuario, t: Turma] {
	some v: s.vinculos | v.vAluno = u and v.vTurma = t
}
pred podeLerTurma[s: Estado, u: Usuario, t: Turma] {
	podeGerirTurma[s, u, t] or (authOk[s, u] and temVinculo[s, u, t])
}

// ---- Frames -----------------------------------------------------------------
pred frameAuth[a, b: Estado] {
	b.ativos = a.ativos and b.professores = a.professores and b.chefes = a.chefes
	and b.versaoPerm = a.versaoPerm and b.claimVersao = a.claimVersao
}
pred frameM7[a, b: Estado] {
	b.comandos = a.comandos and b.recibos = a.recibos
}
pred frameCampo[a, b: Estado] {
	b.turmas = a.turmas and b.donoT = a.donoT and b.materiaT = a.materiaT
	and b.codigoT = a.codigoT and b.reservasCodigo = a.reservasCodigo
}
pred frameConvites[a, b: Estado] {
	b.convites = a.convites and b.statusC = a.statusC and b.pendencias = a.pendencias
}

// ---- Criação e ciclo de vida da turma ---------------------------------------
pred criarTurma[a, b: Estado, t: Turma, u: Usuario, m: Materia, cod: Codigo, cap: Int] {
	coerente[a]
	authOk[a, u]
	u in a.professores
	t not in a.turmas
	cap >= 1
	no a.reservasCodigo[cod]
	b.turmas = a.turmas + t
	b.statusT = a.statusT ++ (t -> Ativo)
	b.donoT = a.donoT ++ (t -> u)
	b.materiaT = a.materiaT ++ (t -> m)
	b.capacidadeT = a.capacidadeT ++ (t -> cap)
	b.qtdT = a.qtdT ++ (t -> 0)
	b.codigoT = a.codigoT ++ (t -> cod)
	b.versaoT = a.versaoT ++ (t -> 1)
	b.reservasCodigo = a.reservasCodigo ++ (cod -> t)
	b.vinculos = a.vinculos and b.espelhos = a.espelhos and b.eventos = a.eventos
	frameConvites[a, b]
	frameAuth[a, b]
	frameM7[a, b]
	coerente[b]
}
pred arquivar[a, b: Estado, t: Turma, u: Usuario] {
	coerente[a]
	podeGerirTurma[a, u, t]
	a.statusT[t] = Ativo
	b.statusT = a.statusT ++ (t -> Arquivada)
	b.versaoT = a.versaoT ++ (t -> plus[a.versaoT[t], 1])
	b.turmas = a.turmas and b.donoT = a.donoT and b.materiaT = a.materiaT
	b.capacidadeT = a.capacidadeT and b.qtdT = a.qtdT and b.codigoT = a.codigoT
	b.reservasCodigo = a.reservasCodigo
	b.vinculos = a.vinculos and b.espelhos = a.espelhos and b.eventos = a.eventos
	frameConvites[a, b]
	frameAuth[a, b]
	frameM7[a, b]
	coerente[b]
}
pred desarquivar[a, b: Estado, t: Turma, u: Usuario] {
	coerente[a]
	podeGerirTurma[a, u, t]
	a.statusT[t] = Arquivada
	b.statusT = a.statusT ++ (t -> Ativo)
	b.versaoT = a.versaoT ++ (t -> plus[a.versaoT[t], 1])
	b.turmas = a.turmas and b.donoT = a.donoT and b.materiaT = a.materiaT
	b.capacidadeT = a.capacidadeT and b.qtdT = a.qtdT and b.codigoT = a.codigoT
	b.reservasCodigo = a.reservasCodigo
	b.vinculos = a.vinculos and b.espelhos = a.espelhos and b.eventos = a.eventos
	frameConvites[a, b]
	frameAuth[a, b]
	frameM7[a, b]
	coerente[b]
}
pred editarCapacidade[a, b: Estado, t: Turma, u: Usuario, cap: Int] {
	coerente[a]
	podeGerirTurma[a, u, t]
	cap >= a.qtdT[t]
	cap >= 1
	b.capacidadeT = a.capacidadeT ++ (t -> cap)
	b.versaoT = a.versaoT ++ (t -> plus[a.versaoT[t], 1])
	b.turmas = a.turmas and b.statusT = a.statusT and b.donoT = a.donoT
	b.materiaT = a.materiaT and b.qtdT = a.qtdT and b.codigoT = a.codigoT
	b.reservasCodigo = a.reservasCodigo
	b.vinculos = a.vinculos and b.espelhos = a.espelhos and b.eventos = a.eventos
	frameConvites[a, b]
	frameAuth[a, b]
	frameM7[a, b]
	coerente[b]
}

// ---- Ingresso, remoção e reingresso -----------------------------------------
pred semRemocaoPrevia[s: Estado, u: Usuario, t: Turma] {
	no e: s.eventos | e.evTipo = Exclusao and e.evAluno = u and e.evTurma = t
}
pred ingressarOrdinario[a, b: Estado, t: Turma, u: Usuario, v: Vinculo,
		e: Espelho, ev: Evento] {
	coerente[a]
	authOk[a, u]
	a.statusT[t] = Ativo
	a.qtdT[t] < a.capacidadeT[t]
	semRemocaoPrevia[a, u, t]
	not temVinculo[a, u, t]
	v not in a.vinculos and v.vAluno = u and v.vTurma = t
	e not in a.espelhos and e.eAluno = u and e.eTurma = t
	ev not in a.eventos and ev.evAluno = u and ev.evTurma = t
	and ev.evTipo = Inclusao and ev.evModo = PorCodigo
	b.turmas = a.turmas and b.statusT = a.statusT and b.donoT = a.donoT
	b.materiaT = a.materiaT and b.capacidadeT = a.capacidadeT
	b.codigoT = a.codigoT and b.reservasCodigo = a.reservasCodigo
	b.versaoT = a.versaoT
	b.vinculos = a.vinculos + v
	b.espelhos = a.espelhos + e
	b.eventos = a.eventos + ev
	b.qtdT = a.qtdT ++ (t -> plus[a.qtdT[t], 1])
	frameConvites[a, b]
	frameAuth[a, b]
	frameM7[a, b]
	coerente[b]
}
pred removerAluno[a, b: Estado, t: Turma, w: Usuario, al: Usuario,
		v: Vinculo, e: Espelho, ev: Evento] {
	coerente[a]
	podeGerirTurma[a, w, t]
	v in a.vinculos and v.vTurma = t and v.vAluno = al
	e in a.espelhos and e.eAluno = al and e.eTurma = t
	ev not in a.eventos and ev.evAluno = al and ev.evTurma = t
	and ev.evTipo = Exclusao
	b.turmas = a.turmas and b.statusT = a.statusT and b.donoT = a.donoT
	b.materiaT = a.materiaT and b.capacidadeT = a.capacidadeT
	b.codigoT = a.codigoT and b.reservasCodigo = a.reservasCodigo
	b.versaoT = a.versaoT
	b.vinculos = a.vinculos - v
	b.espelhos = a.espelhos - e
	b.eventos = a.eventos + ev
	b.qtdT = a.qtdT ++ (t -> minus[a.qtdT[t], 1])
	frameConvites[a, b]
	frameAuth[a, b]
	frameM7[a, b]
	coerente[b]
}

// ---- Convites ---------------------------------------------------------------
pred aceitarConviteTurma[a, b: Estado, c: Convite, u: Usuario, t: Turma,
		v: Vinculo, e: Espelho, ev: Evento] {
	coerente[a]
	authOk[a, u]
	c in a.convites and a.statusC[c] = Pendente
	c.cTurma = t and c.cAluno = u
	a.statusT[t] = Ativo
	a.qtdT[t] < a.capacidadeT[t] or (c.cExcede = Sim and one c.cJust)
	v not in a.vinculos and v.vAluno = u and v.vTurma = t
	e not in a.espelhos and e.eAluno = u and e.eTurma = t
	ev not in a.eventos and ev.evAluno = u and ev.evTurma = t
	and ev.evTipo = Inclusao and ev.evModo = PorConvite
	b.turmas = a.turmas and b.statusT = a.statusT and b.donoT = a.donoT
	b.materiaT = a.materiaT and b.capacidadeT = a.capacidadeT
	b.codigoT = a.codigoT and b.reservasCodigo = a.reservasCodigo
	b.versaoT = a.versaoT
	b.vinculos = a.vinculos + v
	b.espelhos = a.espelhos + e
	b.eventos = a.eventos + ev
	b.qtdT = a.qtdT ++ (t -> plus[a.qtdT[t], 1])
	b.convites = a.convites
	b.statusC = a.statusC ++ (c -> Aceitado)
	b.pendencias = a.pendencias - {p: a.pendencias | p.pConvite = c}
	frameAuth[a, b]
	frameM7[a, b]
	coerente[b]
}
pred aceitarConviteGlobal[a, b: Estado, c: Convite, u: Usuario] {
	coerente[a]
	authOk[a, u]
	c in a.convites and a.statusC[c] = Pendente
	no c.cTurma and c.cAluno = u
	b.turmas = a.turmas and b.statusT = a.statusT and b.donoT = a.donoT
	b.materiaT = a.materiaT and b.capacidadeT = a.capacidadeT and b.qtdT = a.qtdT
	b.codigoT = a.codigoT and b.reservasCodigo = a.reservasCodigo and b.versaoT = a.versaoT
	b.vinculos = a.vinculos and b.espelhos = a.espelhos and b.eventos = a.eventos
	b.convites = a.convites
	b.statusC = a.statusC ++ (c -> Aceitado)
	b.pendencias = a.pendencias - {p: a.pendencias | p.pConvite = c}
	frameAuth[a, b]
	frameM7[a, b]
	coerente[b]
}
pred expirarConvite[a, b: Estado, c: Convite] {
	coerente[a]
	c in a.convites and a.statusC[c] = Pendente
	b.convites = a.convites
	b.statusC = a.statusC ++ (c -> Expirado)
	b.pendencias = a.pendencias - {p: a.pendencias | p.pConvite = c}
	b.turmas = a.turmas and b.statusT = a.statusT and b.donoT = a.donoT
	b.materiaT = a.materiaT and b.capacidadeT = a.capacidadeT and b.qtdT = a.qtdT
	b.codigoT = a.codigoT and b.reservasCodigo = a.reservasCodigo and b.versaoT = a.versaoT
	b.vinculos = a.vinculos and b.espelhos = a.espelhos and b.eventos = a.eventos
	frameAuth[a, b]
	frameM7[a, b]
	coerente[b]
}
pred reenviarConvite[a, b: Estado, c: Convite] {
	coerente[a]
	c in a.convites and a.statusC[c] = Pendente
	b = a
}
pred criarNovoConviteAposTerminalidade[a, b: Estado, antigo: Convite,
		novo: Convite, p: Pendencia] {
	coerente[a]
	antigo in a.convites and a.statusC[antigo] in Aceitado + Expirado
	novo not in a.convites
	novo.cEmail = antigo.cEmail and novo.cTurma = antigo.cTurma
	novo.cExcede = Nao
	p not in a.pendencias and p.pConvite = novo
	p.pEmail = novo.cEmail and p.pTurma = novo.cTurma
	b.turmas = a.turmas and b.statusT = a.statusT and b.donoT = a.donoT
	b.materiaT = a.materiaT and b.capacidadeT = a.capacidadeT and b.qtdT = a.qtdT
	b.codigoT = a.codigoT and b.reservasCodigo = a.reservasCodigo and b.versaoT = a.versaoT
	b.vinculos = a.vinculos and b.espelhos = a.espelhos and b.eventos = a.eventos
	b.convites = a.convites + novo
	b.statusC = a.statusC ++ (novo -> Pendente)
	b.pendencias = a.pendencias + p
	frameAuth[a, b]
	frameM7[a, b]
	coerente[b]
}

// ---- M9: revogação ----------------------------------------------------------
pred revogarAcesso[a, b: Estado, u: Usuario] {
	coerente[a]
	u in a.ativos
	b.ativos = a.ativos - u
	b.versaoPerm = a.versaoPerm ++ (u -> plus[a.versaoPerm[u], 1])
	b.professores = a.professores and b.chefes = a.chefes
	b.claimVersao = a.claimVersao
	b.turmas = a.turmas and b.statusT = a.statusT and b.donoT = a.donoT
	b.materiaT = a.materiaT and b.capacidadeT = a.capacidadeT and b.qtdT = a.qtdT
	b.codigoT = a.codigoT and b.reservasCodigo = a.reservasCodigo and b.versaoT = a.versaoT
	b.vinculos = a.vinculos and b.espelhos = a.espelhos and b.eventos = a.eventos
	frameConvites[a, b]
	frameM7[a, b]
	coerente[b]
}
pred retryM7[a, b: Estado] {
	coerente[a]
	b = a
}

// ---- Assertions: turma e código --------------------------------------------
assert CodigoUnicoPorTurma {
	all s: Estado | coerente[s] implies
		(all disj t1, t2: s.turmas | s.codigoT[t1] != s.codigoT[t2])
}
assert CriarTurmaReservaCodigo {
	all a, b: Estado, t: Turma, u: Usuario, m: Materia, cod: Codigo, cap: Int |
		criarTurma[a, b, t, u, m, cod, cap] implies
			(b.reservasCodigo[cod] = t and b.statusT[t] = Ativo and b.versaoT[t] = 1)
}
assert ArquivarPreservaMembros {
	all a, b: Estado, t: Turma, u: Usuario |
		arquivar[a, b, t, u] implies
			(b.vinculos = a.vinculos and b.eventos = a.eventos
				and b.codigoT[t] = a.codigoT[t] and b.reservasCodigo = a.reservasCodigo)
}
assert ArquivarNaoLiberaCodigo {
	all a, b: Estado, t: Turma, u: Usuario |
		arquivar[a, b, t, u] implies b.reservasCodigo = a.reservasCodigo
}
assert ArquivadaBloqueiaIngresso {
	all a, b: Estado, t: Turma, u: Usuario, v: Vinculo, e: Espelho, ev: Evento |
		ingressarOrdinario[a, b, t, u, v, e, ev] implies a.statusT[t] = Ativo
}
assert ArquivadaBloqueiaAceite {
	all a, b: Estado, c: Convite, u: Usuario, t: Turma, v: Vinculo, e: Espelho, ev: Evento |
		aceitarConviteTurma[a, b, c, u, t, v, e, ev] implies a.statusT[t] = Ativo
}
assert DesarquivarRestauraAtivo {
	all a, b: Estado, t: Turma, u: Usuario |
		desarquivar[a, b, t, u] implies (b.statusT[t] = Ativo and t in b.turmas)
}

// ---- Assertions: capacidade e exceção --------------------------------------
assert IngressoOrdinarioExigeVaga {
	all a, b: Estado, t: Turma, u: Usuario, v: Vinculo, e: Espelho, ev: Evento |
		ingressarOrdinario[a, b, t, u, v, e, ev] implies a.qtdT[t] < a.capacidadeT[t]
}
assert SemVagaNaoHaIngressoOrdinario {
	all a: Estado, t: Turma |
		(coerente[a] and a.qtdT[t] = a.capacidadeT[t]) implies
			(no b: Estado, u: Usuario, v: Vinculo, e: Espelho, ev: Evento |
				ingressarOrdinario[a, b, t, u, v, e, ev])
}
assert ExcecaoExigeConviteJustificado {
	all a, b: Estado, c: Convite, u: Usuario, t: Turma, v: Vinculo, e: Espelho, ev: Evento |
		aceitarConviteTurma[a, b, c, u, t, v, e, ev] implies
			(a.statusT[t] = Ativo
				and (a.qtdT[t] < a.capacidadeT[t] or (c.cExcede = Sim and one c.cJust)))
}
assert ExcecaoNaoEhBypassGenerico {
	all a, b: Estado, c: Convite, u: Usuario, t: Turma, v: Vinculo, e: Espelho, ev: Evento |
		aceitarConviteTurma[a, b, c, u, t, v, e, ev] and a.qtdT[t] >= a.capacidadeT[t]
			implies (c.cExcede = Sim and one c.cJust)
}
assert EdicaoCapacidadeNaoAbaixoOcupacao {
	all a, b: Estado, t: Turma, u: Usuario, cap: Int |
		editarCapacidade[a, b, t, u, cap] implies cap >= a.qtdT[t]
}

// ---- Assertions: contador, espelho e histórico ------------------------------
assert TransicoesPreservamContador {
	all a, b: Estado, t: Turma, u: Usuario, v: Vinculo, e: Espelho, ev: Evento,
		c: Convite, w: Usuario, m: Materia, cod: Codigo, cap: Int, antigo, novo: Convite,
		p: Pendencia, al: Usuario |
		(criarTurma[a, b, t, u, m, cod, cap] or arquivar[a, b, t, u]
			or desarquivar[a, b, t, u] or editarCapacidade[a, b, t, u, cap]
			or ingressarOrdinario[a, b, t, u, v, e, ev]
			or removerAluno[a, b, t, w, al, v, e, ev]
			or aceitarConviteTurma[a, b, c, u, t, v, e, ev]
			or aceitarConviteGlobal[a, b, c, u] or expirarConvite[a, b, c]
			or reenviarConvite[a, b, c]
			or criarNovoConviteAposTerminalidade[a, b, antigo, novo, p]
			or revogarAcesso[a, b, u] or retryM7[a, b])
			implies all tt: b.turmas | b.qtdT[tt] = #(vinculosDaTurma[b, tt])
}
assert RemocaoPreservaHistorico {
	all a, b: Estado, t: Turma, w: Usuario, al: Usuario, v: Vinculo, e: Espelho, ev: Evento |
		removerAluno[a, b, t, w, al, v, e, ev] implies
			(all x: a.eventos | x in b.eventos)
}
assert RemocaoBloqueiaCodigo {
	all a, b: Estado, t: Turma, u: Usuario, v: Vinculo, e: Espelho, ev: Evento |
		ingressarOrdinario[a, b, t, u, v, e, ev] implies semRemocaoPrevia[a, u, t]
}
assert RemocaoAtualizaEspelho {
	all a, b: Estado, t: Turma, w: Usuario, al: Usuario, v: Vinculo, e: Espelho, ev: Evento |
		removerAluno[a, b, t, w, al, v, e, ev] implies
			(no x: b.espelhos | x.eAluno = al and x.eTurma = t)
}
assert EspelhoNaoSobreviveRemocao {
	all a, b: Estado, t: Turma, w: Usuario, al: Usuario, v: Vinculo, e: Espelho, ev: Evento |
		removerAluno[a, b, t, w, al, v, e, ev] implies not temVinculo[b, al, t]
}
assert EspelhoEhProjecao {
	all s: Estado | coerente[s] implies
		(all u: Usuario, t: Turma |
			(some e: s.espelhos | e.eAluno = u and e.eTurma = t) iff temVinculo[s, u, t])
}

// ---- Assertions: convites ---------------------------------------------------
assert PendenciaUnicaPorEmailContexto {
	all s: Estado | coerente[s] implies
		(all disj p1, p2: s.pendencias |
			not (p1.pEmail = p2.pEmail and p1.pTurma = p2.pTurma))
}
assert AceitarTurmaCriaVinculo {
	all a, b: Estado, c: Convite, u: Usuario, t: Turma, v: Vinculo, e: Espelho, ev: Evento |
		aceitarConviteTurma[a, b, c, u, t, v, e, ev] implies
			(temVinculo[b, u, t] and not temVinculo[a, u, t])
}
assert AceitarGlobalNaoMatricula {
	all a, b: Estado, c: Convite, u: Usuario |
		aceitarConviteGlobal[a, b, c, u] implies
			(b.vinculos = a.vinculos and b.qtdT = a.qtdT and b.eventos = a.eventos)
}
assert AceitarConsomeUmaVez {
	all a, b: Estado, c: Convite, u: Usuario, t: Turma, v: Vinculo, e: Espelho, ev: Evento |
		aceitarConviteTurma[a, b, c, u, t, v, e, ev] implies
			(b.statusC[c] = Aceitado and no p: b.pendencias | p.pConvite = c)
}
assert ExpiradoNaoOcupaPendencia {
	all a, b: Estado, c: Convite |
		expirarConvite[a, b, c] implies
			(b.statusC[c] = Expirado and no p: b.pendencias | p.pConvite = c)
}
assert NovoConvitePreservaHistorico {
	all a, b: Estado, antigo: Convite, novo: Convite, p: Pendencia |
		criarNovoConviteAposTerminalidade[a, b, antigo, novo, p] implies
			(antigo in b.convites and b.statusC[antigo] = a.statusC[antigo]
				and a.statusC[antigo] in Aceitado + Expirado)
}
assert ReenvioMantemDocumento {
	all a, b: Estado, c: Convite |
		reenviarConvite[a, b, c] implies (b.convites = a.convites and c in b.convites)
}
assert PendenciaGlobalDistinta {
	all s: Estado | coerente[s] implies
		(all p1, p2: s.pendencias |
			(no p1.pTurma and no p2.pTurma and p1.pEmail = p2.pEmail) implies p1 = p2)
}

// ---- Assertions: M9 e M7 ----------------------------------------------------
assert RevogacaoImpedeCommit {
	all a, b: Estado, u: Usuario |
		revogarAcesso[a, b, u] implies not authOk[b, u]
}
assert OwnershipErradoNaoGerencia {
	all s: Estado, u: Usuario, t: Turma |
		podeGerirTurma[s, u, t] implies (s.donoT[t] = u or u in s.chefes)
}
assert InativoNaoGerencia {
	all a, b: Estado, t: Turma, u: Usuario |
		(arquivar[a, b, t, u] or desarquivar[a, b, t, u])
			implies authOk[a, u]
}
assert UsuarioInativoNaoLeTurma {
	all s: Estado, u: Usuario, t: Turma |
		u not in s.ativos implies not podeLerTurma[s, u, t]
}
assert RetryNaoDuplicaFato {
	all a, b: Estado | retryM7[a, b] implies
		(b.eventos = a.eventos and b.vinculos = a.vinculos and b.qtdT = a.qtdT)
}
assert ReusoIncompativelNaoHerda {
	all s: Estado | coerente[s] implies
		(all disj c1, c2: s.comandos | c1.cmdId = c2.cmdId implies
			(c1.cmdUid = c2.cmdUid and c1.cmdTipo = c2.cmdTipo
				and c1.cmdPayload = c2.cmdPayload))
}
assert TransicoesPreservamCoerencia {
	all a, b: Estado, t: Turma, u: Usuario, v: Vinculo, e: Espelho, ev: Evento,
		c: Convite, w: Usuario, m: Materia, cod: Codigo, cap: Int, antigo, novo: Convite,
		p: Pendencia, al: Usuario |
		(criarTurma[a, b, t, u, m, cod, cap] or arquivar[a, b, t, u]
			or desarquivar[a, b, t, u] or editarCapacidade[a, b, t, u, cap]
			or ingressarOrdinario[a, b, t, u, v, e, ev]
			or removerAluno[a, b, t, w, al, v, e, ev]
			or aceitarConviteTurma[a, b, c, u, t, v, e, ev]
			or aceitarConviteGlobal[a, b, c, u] or expirarConvite[a, b, c]
			or reenviarConvite[a, b, c]
			or criarNovoConviteAposTerminalidade[a, b, antigo, novo, p]
			or revogarAcesso[a, b, u] or retryM7[a, b])
			implies coerente[b]
}

// ---- Witnesses --------------------------------------------------------------
pred WitnessTurmaAtiva {
	some s: Estado, t: Turma | coerente[s] and t in s.turmas and s.statusT[t] = Ativo
}
pred WitnessCriarTurma {
	some a, b: Estado, t: Turma, u: Usuario, m: Materia, cod: Codigo, cap: Int |
		criarTurma[a, b, t, u, m, cod, cap]
}
pred WitnessArquivarComMembros {
	some a, b: Estado, t: Turma, u: Usuario |
		arquivar[a, b, t, u] and some v: a.vinculos | v.vTurma = t
}
pred WitnessDesarquivar {
	some a, b: Estado, t: Turma, u: Usuario |
		desarquivar[a, b, t, u] and a.statusT[t] = Arquivada
}
pred WitnessIngressoOrdinario {
	some a, b: Estado, t: Turma, u: Usuario, v: Vinculo, e: Espelho, ev: Evento |
		ingressarOrdinario[a, b, t, u, v, e, ev]
}
pred WitnessExcecaoAcimaCapacidade {
	some a, b: Estado, c: Convite, u: Usuario, t: Turma, v: Vinculo, e: Espelho, ev: Evento |
		aceitarConviteTurma[a, b, c, u, t, v, e, ev]
		and a.qtdT[t] >= a.capacidadeT[t] and c.cExcede = Sim
}
pred WitnessCorridaUltimaVaga {
	some a, b: Estado, t: Turma, u: Usuario, v: Vinculo, e: Espelho, ev: Evento |
		ingressarOrdinario[a, b, t, u, v, e, ev]
		and a.qtdT[t] = minus[a.capacidadeT[t], 1]
		and b.qtdT[t] = b.capacidadeT[t]
}
pred WitnessRemocao {
	some a, b: Estado, t: Turma, w: Usuario, al: Usuario, v: Vinculo, e: Espelho, ev: Evento |
		removerAluno[a, b, t, w, al, v, e, ev]
}
pred WitnessReingressoPorConvite {
	some a, b, d: Estado, c: Convite, u: Usuario, t: Turma, v: Vinculo, e: Espelho, ev: Evento,
		evRem: Evento, vRem: Vinculo, eRem: Espelho, w: Usuario |
		removerAluno[a, b, t, w, u, vRem, eRem, evRem]
		and aceitarConviteTurma[b, d, c, u, t, v, e, ev]
		and c.cTurma = t
}
pred WitnessConviteGlobal {
	some a, b: Estado, c: Convite, u: Usuario |
		aceitarConviteGlobal[a, b, c, u]
}
pred WitnessAceitarConviteTurma {
	some a, b: Estado, c: Convite, u: Usuario, t: Turma, v: Vinculo, e: Espelho, ev: Evento |
		aceitarConviteTurma[a, b, c, u, t, v, e, ev]
}
pred WitnessReenvioPendente {
	some a, b: Estado, c: Convite | reenviarConvite[a, b, c]
}
pred WitnessNovoConviteAposTerminalidade {
	some a, b: Estado, antigo: Convite, novo: Convite, p: Pendencia |
		criarNovoConviteAposTerminalidade[a, b, antigo, novo, p]
}
pred WitnessExpiracao {
	some a, b: Estado, c: Convite | expirarConvite[a, b, c]
}
pred WitnessEspelhoProjecao {
	some s: Estado, v: Vinculo, e: Espelho, u: Usuario, t: Turma |
		coerente[s] and v in s.vinculos and e in s.espelhos
		and v.vAluno = u and v.vTurma = t and e.eAluno = u and e.eTurma = t
}
pred WitnessRevogacaoImpedeCommit {
	some a, b: Estado, u: Usuario |
		revogarAcesso[a, b, u] and authOk[a, u] and not authOk[b, u]
		and u in a.chefes
}
pred WitnessEdicaoCapacidadeValida {
	some a, b: Estado, t: Turma, u: Usuario, cap: Int |
		editarCapacidade[a, b, t, u, cap] and cap = a.qtdT[t]
}

// ---- Comandos ---------------------------------------------------------------
check CodigoUnicoPorTurma for 6
check CriarTurmaReservaCodigo for 6
check ArquivarPreservaMembros for 6
check ArquivarNaoLiberaCodigo for 6
check ArquivadaBloqueiaIngresso for 6
check ArquivadaBloqueiaAceite for 6
check DesarquivarRestauraAtivo for 6
check IngressoOrdinarioExigeVaga for 6
check SemVagaNaoHaIngressoOrdinario for 6
check ExcecaoExigeConviteJustificado for 6
check ExcecaoNaoEhBypassGenerico for 6
check EdicaoCapacidadeNaoAbaixoOcupacao for 6
check TransicoesPreservamContador for 6
check RemocaoPreservaHistorico for 6
check RemocaoBloqueiaCodigo for 6
check RemocaoAtualizaEspelho for 6
check EspelhoNaoSobreviveRemocao for 6
check EspelhoEhProjecao for 6
check PendenciaUnicaPorEmailContexto for 6
check AceitarTurmaCriaVinculo for 6
check AceitarGlobalNaoMatricula for 6
check AceitarConsomeUmaVez for 6
check ExpiradoNaoOcupaPendencia for 6
check NovoConvitePreservaHistorico for 6
check ReenvioMantemDocumento for 6
check PendenciaGlobalDistinta for 6
check RevogacaoImpedeCommit for 6
check OwnershipErradoNaoGerencia for 6
check InativoNaoGerencia for 6
check UsuarioInativoNaoLeTurma for 6
check RetryNaoDuplicaFato for 6
check ReusoIncompativelNaoHerda for 6
check TransicoesPreservamCoerencia for 6

run WitnessTurmaAtiva for 4
run WitnessCriarTurma for 4
run WitnessArquivarComMembros for 6
run WitnessDesarquivar for 6
run WitnessIngressoOrdinario for 6
run WitnessExcecaoAcimaCapacidade for 6
run WitnessCorridaUltimaVaga for 8
run WitnessRemocao for 6
run WitnessReingressoPorConvite for 8
run WitnessConviteGlobal for 4
run WitnessAceitarConviteTurma for 6
run WitnessReenvioPendente for 4
run WitnessNovoConviteAposTerminalidade for 6
run WitnessExpiracao for 4
run WitnessEspelhoProjecao for 6
run WitnessRevogacaoImpedeCommit for 6
run WitnessEdicaoCapacidadeValida for 6
