module operations/patrimony_m10

open util/integer

// M10 — Patrimônio.
//
// Modelo abstrato de identidade, estado, versão, requisições, locks,
// Chaves_Unicas, histórico, baixa, fan-out derivado e composição abstrata com
// M7 (idempotência) e M9 (autorização). Não modela Firestore, Storage,
// assinatura real de PDF, índices, backfill de Chaves_Unicas nem concorrência
// sob carga; a canonicalização concreta da plaqueta pertence ao Rust.
//
// A plaqueta é representada já canônica (N = trim/uppercase) pela identidade
// abstrata Plaqueta. `reservas` representa Chaves_Unicas como reserva
// permanente, distinta de `locks`.

// ---- Identidades e domínios fechados ----------------------------------------
sig Plaqueta {}
sig Nome {}
sig Endereco {predio: one Int, andar: one Int, sala: one Int}
sig Resumo {}
sig Local {}
sig Usuario {}
sig Bem {}

abstract sig Status {}
one sig Ativo, Inservivel, JaDadoBaixa extends Status {}

abstract sig Conservacao {}
one sig BOM, REGULAR, RUIM extends Conservacao {}

abstract sig Papel {}
one sig ChefeGeral, GestorBensPatrimoniais, Professor extends Papel {}

abstract sig ReqStatus {}
one sig Pendente, Aprovada, Rejeitada extends ReqStatus {}

abstract sig TipoLock {}
one sig EDICAO, ADICAO extends TipoLock {}

abstract sig TipoEvento {}
one sig EvCadastro, EvEdicao, EvBaixa extends TipoEvento {}

// ---- Requisições, locks, eventos e comprovantes -----------------------------
abstract sig Requisicao {}
sig ReqAdicao extends Requisicao {
  reqPlaqueta:    one Plaqueta,
  reqResumo:      one Resumo,
  reqLocal:       one Local,
  reqConservacao: one Conservacao
}
sig ReqEdicao extends Requisicao {
  reqBem:             one Bem,
  reqVersaoOrigem:    one Int,
  reqNovoStatus:      lone Status,
  reqNovaConservacao: lone Conservacao,
  reqNovoResumo:      lone Resumo,
  reqNovoLocal:       lone Local
}

sig Lock {
  lockReq:      one Requisicao,
  lockTipo:     one TipoLock,
  lockBem:      lone Bem,
  lockPlaqueta: lone Plaqueta
}

sig Evento {evBem: one Bem, evTipo: one TipoEvento, evUsuario: one Usuario}
sig Comprovante {compBem: one Bem}

// ---- Estado ----------------------------------------------------------------
sig Estado {
  cadastrados:    set Bem,
  statusDo:       Bem -> lone Status,
  conservacaoDo:  Bem -> lone Conservacao,
  resumoDo:       Bem -> lone Resumo,
  localDo:        Bem -> lone Local,
  nomeProjetado:  Bem -> lone Nome,
  localProjetado: Bem -> lone Endereco,
  plaquetaDo:     Bem -> lone Plaqueta,
  versaoDo:       Bem -> lone Int,
  comprovanteDo:  Bem -> lone Comprovante,
  resumoNome:     Resumo -> lone Nome,
  localEndereco:  Local -> lone Endereco,
  reservas:       Plaqueta -> lone Bem,
  eventos:        set Evento,
  requisicoes:    set Requisicao,
  reqStatus:      Requisicao -> lone ReqStatus,
  locks:          set Lock,
  ativos:         set Usuario,
  papeis:         Usuario -> set Papel,
  versaoPerm:     Usuario -> one Int,
  claimVersao:    Usuario -> lone Int
}

// ---- Autorização M9 (interface abstrata) ------------------------------------
pred versaoCorrente[s: Estado, u: Usuario] {
  one s.claimVersao[u] and s.claimVersao[u] = s.versaoPerm[u]
}
pred podeAprovarPatrimonio[s: Estado, u: Usuario] {
  u in s.ativos and versaoCorrente[s, u]
  and (ChefeGeral in s.papeis[u] or GestorBensPatrimoniais in s.papeis[u])
}
pred podeSolicitar[s: Estado, u: Usuario] {
  u in s.ativos and versaoCorrente[s, u] and Professor in s.papeis[u]
}
pred podeBaixar[s: Estado, u: Usuario] {podeAprovarPatrimonio[s, u]}

// ---- Coerência --------------------------------------------------------------
pred coerente[s: Estado] {
  all b: Bem | (b in s.cadastrados) iff (one s.statusDo[b])
  all b: s.cadastrados |
    one s.conservacaoDo[b] and one s.resumoDo[b] and one s.localDo[b]
    and one s.nomeProjetado[b] and one s.localProjetado[b]
    and one s.plaquetaDo[b] and one s.versaoDo[b]
  all b: s.cadastrados | s.versaoDo[b] >= 1
  // plaqueta canônica identifica no máximo um bem
  all disj b1, b2: s.cadastrados | s.plaquetaDo[b1] != s.plaquetaDo[b2]
  // Chaves_Unicas: reserva permanente e bijetiva com os bens cadastrados
  all b: s.cadastrados | s.reservas[s.plaquetaDo[b]] = b
  all p: Plaqueta | some s.reservas[p] implies
    (s.reservas[p] in s.cadastrados and s.plaquetaDo[s.reservas[p]] = p)
  // projeções derivadas de resumo e local
  all b: s.cadastrados | one s.resumoNome[s.resumoDo[b]]
  all b: s.cadastrados | s.nomeProjetado[b] = s.resumoNome[s.resumoDo[b]]
  all b: s.cadastrados | one s.localEndereco[s.localDo[b]]
  all b: s.cadastrados | s.localProjetado[b] = s.localEndereco[s.localDo[b]]
  // requisições, locks e histórico
  all r: s.requisicoes | one s.reqStatus[r]
  all l: s.locks | l.lockReq in s.requisicoes and s.reqStatus[l.lockReq] = Pendente
  all l: s.locks | l.lockReq in ReqEdicao implies l.lockBem = l.lockReq.reqBem
  all l: s.locks | l.lockReq in ReqAdicao implies l.lockPlaqueta = l.lockReq.reqPlaqueta
  all disj r1, r2: s.requisicoes |
    r1 in ReqEdicao and r2 in ReqEdicao
    and s.reqStatus[r1] = Pendente and s.reqStatus[r2] = Pendente
    and r1.reqBem = r2.reqBem implies r1 = r2
  all disj r1, r2: s.requisicoes |
    r1 in ReqAdicao and r2 in ReqAdicao
    and s.reqStatus[r1] = Pendente and s.reqStatus[r2] = Pendente
    and r1.reqPlaqueta = r2.reqPlaqueta implies r1 = r2
  all disj l1, l2: s.locks |
    not (l1.lockBem = l2.lockBem and l1.lockPlaqueta = l2.lockPlaqueta)
  all e: s.eventos | e.evBem in s.cadastrados
  // comprovante vinculado exatamente no estado terminal
  all b: s.cadastrados | (s.statusDo[b] = JaDadoBaixa) iff (one s.comprovanteDo[b])
}

// ---- Frames -----------------------------------------------------------------
pred frameImutavel[a, b: Estado] {
  b.cadastrados = a.cadastrados and b.statusDo = a.statusDo
  and b.conservacaoDo = a.conservacaoDo and b.resumoDo = a.resumoDo
  and b.localDo = a.localDo and b.nomeProjetado = a.nomeProjetado
  and b.localProjetado = a.localProjetado and b.plaquetaDo = a.plaquetaDo
  and b.versaoDo = a.versaoDo and b.comprovanteDo = a.comprovanteDo
  and b.resumoNome = a.resumoNome and b.localEndereco = a.localEndereco
  and b.reservas = a.reservas and b.eventos = a.eventos
}
pred frameAuth[a, b: Estado] {
  b.ativos = a.ativos and b.papeis = a.papeis
  and b.versaoPerm = a.versaoPerm and b.claimVersao = a.claimVersao
}
pred frameGestao[a, b: Estado] {
  b.requisicoes = a.requisicoes and b.reqStatus = a.reqStatus
  and b.locks = a.locks
}

// ---- Criação de requisições -------------------------------------------------
pred criarReqEdicao[a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario] {
  coerente[a]
  podeSolicitar[a, u]
  r not in a.requisicoes
  r.reqBem in a.cadastrados
  r.reqVersaoOrigem = a.versaoDo[r.reqBem]
  no l: a.locks | l.lockBem = r.reqBem
  lk not in a.locks
  lk.lockReq = r and lk.lockTipo = EDICAO and lk.lockBem = r.reqBem and no lk.lockPlaqueta
  frameImutavel[a, b]
  frameAuth[a, b]
  b.requisicoes = a.requisicoes + r
  b.reqStatus = a.reqStatus ++ (r -> Pendente)
  b.locks = a.locks + lk
  coerente[b]
}
pred criarReqAdicao[a, b: Estado, r: ReqAdicao, lk: Lock, u: Usuario] {
  coerente[a]
  podeSolicitar[a, u]
  r not in a.requisicoes
  no a.reservas[r.reqPlaqueta]
  one a.resumoNome[r.reqResumo]
  one a.localEndereco[r.reqLocal]
  no l: a.locks | l.lockPlaqueta = r.reqPlaqueta
  lk not in a.locks
  lk.lockReq = r and lk.lockTipo = ADICAO and lk.lockPlaqueta = r.reqPlaqueta and no lk.lockBem
  frameImutavel[a, b]
  frameAuth[a, b]
  b.requisicoes = a.requisicoes + r
  b.reqStatus = a.reqStatus ++ (r -> Pendente)
  b.locks = a.locks + lk
  coerente[b]
}

// ---- Respostas terminais sem mutação de bem ----------------------------------
pred rejeitarEdicao[a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario] {
  coerente[a]
  podeAprovarPatrimonio[a, u]
  r in a.requisicoes and a.reqStatus[r] = Pendente
  lk in a.locks and lk.lockReq = r
  frameImutavel[a, b]
  frameAuth[a, b]
  b.requisicoes = a.requisicoes
  b.reqStatus = a.reqStatus ++ (r -> Rejeitada)
  b.locks = a.locks - lk
  coerente[b]
}
pred conflitoVersaoEdicao[a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario] {
  coerente[a]
  podeAprovarPatrimonio[a, u]
  r in a.requisicoes and a.reqStatus[r] = Pendente
  lk in a.locks and lk.lockReq = r
  r.reqBem in a.cadastrados
  a.versaoDo[r.reqBem] != r.reqVersaoOrigem
  frameImutavel[a, b]
  frameAuth[a, b]
  b.requisicoes = a.requisicoes
  b.reqStatus = a.reqStatus ++ (r -> Rejeitada)
  b.locks = a.locks - lk
  coerente[b]
}
pred conflitoUnicidadeAdicao[a, b: Estado, r: ReqAdicao, lk: Lock, u: Usuario] {
  coerente[a]
  podeAprovarPatrimonio[a, u]
  r in a.requisicoes and a.reqStatus[r] = Pendente
  lk in a.locks and lk.lockReq = r
  some a.reservas[r.reqPlaqueta]
  frameImutavel[a, b]
  frameAuth[a, b]
  b.requisicoes = a.requisicoes
  b.reqStatus = a.reqStatus ++ (r -> Rejeitada)
  b.locks = a.locks - lk
  coerente[b]
}
pred rejeitarAdicao[a, b: Estado, r: ReqAdicao, lk: Lock, u: Usuario] {
  coerente[a]
  podeAprovarPatrimonio[a, u]
  r in a.requisicoes and a.reqStatus[r] = Pendente
  lk in a.locks and lk.lockReq = r
  frameImutavel[a, b]
  frameAuth[a, b]
  b.requisicoes = a.requisicoes
  b.reqStatus = a.reqStatus ++ (r -> Rejeitada)
  b.locks = a.locks - lk
  coerente[b]
}

// ---- Aprovação de edição (mutação canônica) ---------------------------------
pred aprovarEdicao[a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario, ev: Evento] {
  coerente[a]
  podeAprovarPatrimonio[a, u]
  r in a.requisicoes and a.reqStatus[r] = Pendente
  lk in a.locks and lk.lockReq = r
  r.reqBem in a.cadastrados
  a.versaoDo[r.reqBem] = r.reqVersaoOrigem
  a.statusDo[r.reqBem] != JaDadoBaixa
  (one r.reqNovoResumo implies one a.resumoNome[r.reqNovoResumo])
  (one r.reqNovoLocal implies one a.localEndereco[r.reqNovoLocal])
  ev not in a.eventos
  ev.evBem = r.reqBem and ev.evTipo = EvEdicao and ev.evUsuario = u
  b.cadastrados = a.cadastrados
  b.reservas = a.reservas
  b.resumoNome = a.resumoNome
  b.localEndereco = a.localEndereco
  b.comprovanteDo = a.comprovanteDo
  b.plaquetaDo = a.plaquetaDo
  ((one r.reqNovaConservacao and b.conservacaoDo =
      a.conservacaoDo ++ (r.reqBem -> r.reqNovaConservacao))
   or (no r.reqNovaConservacao and b.conservacaoDo = a.conservacaoDo))
  ((one r.reqNovoResumo and b.resumoDo = a.resumoDo ++ (r.reqBem -> r.reqNovoResumo))
   or (no r.reqNovoResumo and b.resumoDo = a.resumoDo))
  ((one r.reqNovoLocal and b.localDo = a.localDo ++ (r.reqBem -> r.reqNovoLocal))
   or (no r.reqNovoLocal and b.localDo = a.localDo))
  ((one r.reqNovoStatus and b.statusDo = a.statusDo ++ (r.reqBem -> r.reqNovoStatus))
   or (no r.reqNovoStatus and b.statusDo = a.statusDo))
  ((one r.reqNovoResumo and b.nomeProjetado =
      a.nomeProjetado ++ (r.reqBem -> a.resumoNome[r.reqNovoResumo]))
   or (no r.reqNovoResumo and b.nomeProjetado = a.nomeProjetado))
  ((one r.reqNovoLocal and b.localProjetado =
      a.localProjetado ++ (r.reqBem -> a.localEndereco[r.reqNovoLocal]))
   or (no r.reqNovoLocal and b.localProjetado = a.localProjetado))
  b.versaoDo = a.versaoDo ++ (r.reqBem -> plus[a.versaoDo[r.reqBem], 1])
  b.eventos = a.eventos + ev
  frameAuth[a, b]
  b.requisicoes = a.requisicoes
  b.reqStatus = a.reqStatus ++ (r -> Aprovada)
  b.locks = a.locks - lk
  coerente[b]
}

// ---- Aprovação de adição (cadastro atômico) ---------------------------------
pred aprovarAdicao[a, b: Estado, r: ReqAdicao, lk: Lock, u: Usuario, nb: Bem, ev: Evento] {
  coerente[a]
  podeAprovarPatrimonio[a, u]
  r in a.requisicoes and a.reqStatus[r] = Pendente
  lk in a.locks and lk.lockReq = r
  no a.reservas[r.reqPlaqueta]
  one a.resumoNome[r.reqResumo]
  one a.localEndereco[r.reqLocal]
  nb not in a.cadastrados
  ev not in a.eventos
  ev.evBem = nb and ev.evTipo = EvCadastro and ev.evUsuario = u
  b.cadastrados = a.cadastrados + nb
  b.statusDo = a.statusDo ++ (nb -> Ativo)
  b.conservacaoDo = a.conservacaoDo ++ (nb -> r.reqConservacao)
  b.resumoDo = a.resumoDo ++ (nb -> r.reqResumo)
  b.localDo = a.localDo ++ (nb -> r.reqLocal)
  b.nomeProjetado = a.nomeProjetado ++ (nb -> a.resumoNome[r.reqResumo])
  b.localProjetado = a.localProjetado ++ (nb -> a.localEndereco[r.reqLocal])
  b.plaquetaDo = a.plaquetaDo ++ (nb -> r.reqPlaqueta)
  b.versaoDo = a.versaoDo ++ (nb -> 1)
  b.reservas = a.reservas ++ (r.reqPlaqueta -> nb)
  b.eventos = a.eventos + ev
  b.comprovanteDo = a.comprovanteDo
  b.resumoNome = a.resumoNome
  b.localEndereco = a.localEndereco
  frameAuth[a, b]
  b.requisicoes = a.requisicoes
  b.reqStatus = a.reqStatus ++ (r -> Aprovada)
  b.locks = a.locks - lk
  coerente[b]
}

// ---- Baixa (rito próprio) ---------------------------------------------------
pred baixar[a, b: Estado, bm: Bem, u: Usuario, c: Comprovante, ev: Evento] {
  coerente[a]
  podeBaixar[a, u]
  bm in a.cadastrados
  a.statusDo[bm] = Inservivel
  no a.comprovanteDo[bm]
  c.compBem = bm
  ev not in a.eventos
  ev.evBem = bm and ev.evTipo = EvBaixa and ev.evUsuario = u
  b.cadastrados = a.cadastrados
  b.statusDo = a.statusDo ++ (bm -> JaDadoBaixa)
  b.versaoDo = a.versaoDo ++ (bm -> plus[a.versaoDo[bm], 1])
  b.comprovanteDo = a.comprovanteDo ++ (bm -> c)
  b.eventos = a.eventos + ev
  b.reservas = a.reservas
  b.plaquetaDo = a.plaquetaDo
  b.conservacaoDo = a.conservacaoDo
  b.resumoDo = a.resumoDo
  b.localDo = a.localDo
  b.nomeProjetado = a.nomeProjetado
  b.localProjetado = a.localProjetado
  b.resumoNome = a.resumoNome
  b.localEndereco = a.localEndereco
  frameAuth[a, b]
  b.requisicoes = a.requisicoes
  b.reqStatus = a.reqStatus
  b.locks = a.locks
  coerente[b]
}

// ---- Fan-out derivado (não canônico) ---------------------------------------
pred fanOutResumo[a, b: Estado, res: Resumo, novo: Nome] {
  coerente[a]
  one a.resumoNome[res]
  b.resumoNome = a.resumoNome ++ (res -> novo)
  b.nomeProjetado = a.nomeProjetado
    ++ (({x: Bem | x in a.cadastrados and a.resumoDo[x] = res}) -> novo)
  b.cadastrados = a.cadastrados
  b.statusDo = a.statusDo and b.conservacaoDo = a.conservacaoDo
  b.resumoDo = a.resumoDo and b.localDo = a.localDo
  b.localProjetado = a.localProjetado and b.plaquetaDo = a.plaquetaDo
  b.versaoDo = a.versaoDo and b.comprovanteDo = a.comprovanteDo
  b.localEndereco = a.localEndereco and b.reservas = a.reservas
  b.eventos = a.eventos
  frameAuth[a, b]
  frameGestao[a, b]
  coerente[b]
}
pred fanOutLocal[a, b: Estado, loc: Local, novo: Endereco] {
  coerente[a]
  one a.localEndereco[loc]
  b.localEndereco = a.localEndereco ++ (loc -> novo)
  b.localProjetado = a.localProjetado
    ++ (({x: Bem | x in a.cadastrados and a.localDo[x] = loc}) -> novo)
  b.cadastrados = a.cadastrados
  b.statusDo = a.statusDo and b.conservacaoDo = a.conservacaoDo
  b.resumoDo = a.resumoDo and b.localDo = a.localDo
  b.nomeProjetado = a.nomeProjetado and b.plaquetaDo = a.plaquetaDo
  b.versaoDo = a.versaoDo and b.comprovanteDo = a.comprovanteDo
  b.resumoNome = a.resumoNome and b.reservas = a.reservas
  b.eventos = a.eventos
  frameAuth[a, b]
  frameGestao[a, b]
  coerente[b]
}

// ---- Retry M7 (idempotência abstrata) ---------------------------------------
pred retryM7[a, b: Estado] {coerente[a] and b = a}

// ---- Assertions: identidade -------------------------------------------------
assert PlaquetaUnicaPorBem {
  all s: Estado | coerente[s] implies
    (all disj b1, b2: s.cadastrados | s.plaquetaDo[b1] != s.plaquetaDo[b2])
}
assert ChaveUnicaImpedeNovoBem {
  all a, b: Estado, r: ReqAdicao, lk: Lock, u: Usuario, nb: Bem, ev: Evento |
    aprovarAdicao[a, b, r, lk, u, nb, ev] implies no a.reservas[r.reqPlaqueta]
}
assert BaixaNaoLiberaChave {
  all a, b: Estado, bm: Bem, u: Usuario, c: Comprovante, ev: Evento |
    baixar[a, b, bm, u, c, ev] implies
      (b.reservas = a.reservas and b.reservas[b.plaquetaDo[bm]] = bm)
}
assert PlaquetaNaoReutilizadaAposBaixa {
  all a, b, c2: Estado, bm: Bem, u: Usuario, cp: Comprovante, ev: Evento,
      r: ReqAdicao, lk: Lock, u2: Usuario, nb: Bem, ev2: Evento |
    baixar[a, b, bm, u, cp, ev] and aprovarAdicao[b, c2, r, lk, u2, nb, ev2]
      implies r.reqPlaqueta != a.plaquetaDo[bm]
}
assert ReclassificacaoNaoRenomeiaResumoCompartilhado {
  all a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario, ev: Evento, outro: Bem |
    aprovarEdicao[a, b, r, lk, u, ev] and one r.reqNovoResumo
      and outro in a.cadastrados and outro != r.reqBem
      implies b.resumoDo[outro] = a.resumoDo[outro]
}

// ---- Assertions: status -----------------------------------------------------
assert CadastroComecaAtivoVersao1 {
  all a, b: Estado, r: ReqAdicao, lk: Lock, u: Usuario, nb: Bem, ev: Evento |
    aprovarAdicao[a, b, r, lk, u, nb, ev] implies
      (b.statusDo[nb] = Ativo and b.versaoDo[nb] = 1)
}
assert SemSaltoAtivoParaBaixa {
  all a, b: Estado, bm: Bem, u: Usuario, c: Comprovante, ev: Evento |
    baixar[a, b, bm, u, c, ev] implies a.statusDo[bm] = Inservivel
}
assert BaixaExigeComprovante {
  all a, b: Estado, bm: Bem, u: Usuario, c: Comprovante, ev: Evento |
    baixar[a, b, bm, u, c, ev] implies (c.compBem = bm and no a.comprovanteDo[bm])
}
assert BaixaTerminal {
  all a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario, ev: Evento |
    aprovarEdicao[a, b, r, lk, u, ev] implies a.statusDo[r.reqBem] != JaDadoBaixa
}
assert BaixaPreservaBem {
  all a, b: Estado, bm: Bem, u: Usuario, c: Comprovante, ev: Evento |
    baixar[a, b, bm, u, c, ev] implies (bm in b.cadastrados and b.statusDo[bm] = JaDadoBaixa)
}

// ---- Assertions: versão -----------------------------------------------------
assert MutacaoCanonicaIncrementaUmaVez {
  all a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario, ev: Evento |
    aprovarEdicao[a, b, r, lk, u, ev] implies
      b.versaoDo[r.reqBem] = plus[a.versaoDo[r.reqBem], 1]
}
assert FanOutNaoIncrementaVersao {
  all a, b: Estado, res: Resumo, n: Nome |
    fanOutResumo[a, b, res, n] implies b.versaoDo = a.versaoDo
}
assert FanOutLocalNaoIncrementaVersao {
  all a, b: Estado, loc: Local, n: Endereco |
    fanOutLocal[a, b, loc, n] implies b.versaoDo = a.versaoDo
}
assert FanOutNaoCriaEvento {
  all a, b: Estado, res: Resumo, n: Nome |
    fanOutResumo[a, b, res, n] implies b.eventos = a.eventos
}
assert ConflitoVersaoNaoAlteraBem {
  all a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario |
    conflitoVersaoEdicao[a, b, r, lk, u] implies
      (b.versaoDo = a.versaoDo and b.statusDo = a.statusDo and b.eventos = a.eventos)
}
assert RetryNaoDuplicaFato {
  all a, b: Estado | retryM7[a, b] implies
    (b.eventos = a.eventos and b.cadastrados = a.cadastrados and b.versaoDo = a.versaoDo)
}

// ---- Assertions: locks ------------------------------------------------------
assert UmaEdicaoPendentePorBem {
  all s: Estado | coerente[s] implies
    (all disj r1, r2: s.requisicoes |
      r1 in ReqEdicao and r2 in ReqEdicao
      and s.reqStatus[r1] = Pendente and s.reqStatus[r2] = Pendente
      and r1.reqBem = r2.reqBem implies r1 = r2)
}
assert UmaAdicaoPendentePorPlaqueta {
  all s: Estado | coerente[s] implies
    (all disj r1, r2: s.requisicoes |
      r1 in ReqAdicao and r2 in ReqAdicao
      and s.reqStatus[r1] = Pendente and s.reqStatus[r2] = Pendente
      and r1.reqPlaqueta = r2.reqPlaqueta implies r1 = r2)
}
assert LockTemRequerente {
  all s: Estado | coerente[s] implies
    (all l: s.locks | l.lockReq in s.requisicoes and s.reqStatus[l.lockReq] = Pendente)
}
assert LockAlheioNaoRemovido {
  all a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario |
    (rejeitarEdicao[a, b, r, lk, u] or conflitoVersaoEdicao[a, b, r, lk, u])
      implies (all l: a.locks | (l.lockReq != r) iff (l in b.locks))
}
assert LockAusenteImpedeResposta {
  all a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario |
    (rejeitarEdicao[a, b, r, lk, u] or conflitoVersaoEdicao[a, b, r, lk, u]
     or (some ev: Evento | aprovarEdicao[a, b, r, lk, u, ev]))
      implies lk in a.locks
}

// ---- Assertions: histórico --------------------------------------------------
assert CadastroGeraUmEvento {
  all a, b: Estado, r: ReqAdicao, lk: Lock, u: Usuario, nb: Bem, ev: Evento |
    aprovarAdicao[a, b, r, lk, u, nb, ev] implies
      (b.eventos = a.eventos + ev and ev.evTipo = EvCadastro)
}
assert EdicaoGeraUmEvento {
  all a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario, ev: Evento |
    aprovarEdicao[a, b, r, lk, u, ev] implies
      (b.eventos = a.eventos + ev and ev.evTipo = EvEdicao)
}
assert BaixaGeraUmEvento {
  all a, b: Estado, bm: Bem, u: Usuario, c: Comprovante, ev: Evento |
    baixar[a, b, bm, u, c, ev] implies
      (b.eventos = a.eventos + ev and ev.evTipo = EvBaixa)
}

// ---- Assertions: autorização M9 --------------------------------------------
assert M9InvalidoImpedeCommit {
  all a, b: Estado, r: ReqAdicao, lk: Lock, u: Usuario, nb: Bem, ev: Evento |
    aprovarAdicao[a, b, r, lk, u, nb, ev] implies
      (u in a.ativos and versaoCorrente[a, u])
}
assert ProfessorNaoAprova {
  all a, b: Estado, r: ReqAdicao, lk: Lock, u: Usuario, nb: Bem, ev: Evento |
    aprovarAdicao[a, b, r, lk, u, nb, ev] implies
      (ChefeGeral in a.papeis[u] or GestorBensPatrimoniais in a.papeis[u])
}
assert ProfessorNaoBaixa {
  all a, b: Estado, bm: Bem, u: Usuario, c: Comprovante, ev: Evento |
    baixar[a, b, bm, u, c, ev] implies
      (ChefeGeral in a.papeis[u] or GestorBensPatrimoniais in a.papeis[u])
}
assert AutorizacaoNaoDispensaDominio {
  all a, b: Estado, bm: Bem, u: Usuario, c: Comprovante, ev: Evento |
    baixar[a, b, bm, u, c, ev] implies a.statusDo[bm] = Inservivel
}

// ---- Assertion: coerência global -------------------------------------------
assert TransicoesPreservamCoerencia {
  all a, b: Estado, r1: ReqEdicao, r2: ReqAdicao, lk1, lk2: Lock, u: Usuario,
      nb: Bem, ev: Evento, bm: Bem, c: Comprovante, res: Resumo, n: Nome,
      loc: Local, e2: Endereco |
    (criarReqEdicao[a, b, r1, lk1, u] or criarReqAdicao[a, b, r2, lk2, u]
     or rejeitarEdicao[a, b, r1, lk1, u] or conflitoVersaoEdicao[a, b, r1, lk1, u]
     or conflitoUnicidadeAdicao[a, b, r2, lk2, u] or rejeitarAdicao[a, b, r2, lk2, u]
     or aprovarEdicao[a, b, r1, lk1, u, ev] or aprovarAdicao[a, b, r2, lk2, u, nb, ev]
     or baixar[a, b, bm, u, c, ev] or fanOutResumo[a, b, res, n]
     or fanOutLocal[a, b, loc, e2] or retryM7[a, b])
      implies coerente[b]
}

// ---- Witnesses --------------------------------------------------------------
pred WitnessDoisBensMesmoResumo {
  some s: Estado, disj b1, b2: s.cadastrados |
    coerente[s] and s.resumoDo[b1] = s.resumoDo[b2]
}
pred WitnessReclassificacaoIndividual {
  some a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario, ev: Evento, outro: Bem |
    aprovarEdicao[a, b, r, lk, u, ev] and one r.reqNovoResumo
    and outro in a.cadastrados and outro != r.reqBem
    and b.resumoDo[outro] = a.resumoDo[outro]
}
pred WitnessBemAtivo {
  some s: Estado, bm: Bem | coerente[s] and bm in s.cadastrados and s.statusDo[bm] = Ativo
}
pred WitnessTransicaoInservivel {
  some a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario, ev: Evento |
    aprovarEdicao[a, b, r, lk, u, ev] and r.reqNovoStatus = Inservivel
}
pred WitnessTransicaoBaixa {
  some a, b: Estado, bm: Bem, u: Usuario, c: Comprovante, ev: Evento |
    baixar[a, b, bm, u, c, ev]
}
pred WitnessCadastroAprovado {
  some a, b: Estado, r: ReqAdicao, lk: Lock, u: Usuario, nb: Bem, ev: Evento |
    aprovarAdicao[a, b, r, lk, u, nb, ev]
}
pred WitnessEdicaoAprovada {
  some a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario, ev: Evento |
    aprovarEdicao[a, b, r, lk, u, ev]
}
pred WitnessEdicaoRejeitada {
  some a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario |
    rejeitarEdicao[a, b, r, lk, u]
}
pred WitnessConflitoVersao {
  some a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario |
    conflitoVersaoEdicao[a, b, r, lk, u]
}
pred WitnessConflitoUnicidade {
  some a, b: Estado, r: ReqAdicao, lk: Lock, u: Usuario |
    conflitoUnicidadeAdicao[a, b, r, lk, u]
}
pred WitnessDuasPlaquetasDistintas {
  some s: Estado, disj b1, b2: s.cadastrados |
    coerente[s] and s.plaquetaDo[b1] != s.plaquetaDo[b2]
}
pred WitnessLockIntegro {
  some a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario |
    criarReqEdicao[a, b, r, lk, u] and lk in b.locks
}
pred WitnessFanOutSemVersao {
  some a, b: Estado, res: Resumo, n: Nome |
    fanOutResumo[a, b, res, n] and b.versaoDo = a.versaoDo
}
pred WitnessRetrySemDuplicacao {
  some a, b: Estado | retryM7[a, b] and b.eventos = a.eventos
}
pred WitnessBaixaComHistorico {
  some a, b: Estado, bm: Bem, u: Usuario, c: Comprovante, ev: Evento |
    baixar[a, b, bm, u, c, ev] and ev in b.eventos and ev.evTipo = EvBaixa
}
pred WitnessBemBaixadoExiste {
  some s: Estado, bm: Bem, c: Comprovante |
    coerente[s] and bm in s.cadastrados and s.statusDo[bm] = JaDadoBaixa
    and s.comprovanteDo[bm] = c and s.reservas[s.plaquetaDo[bm]] = bm
}
pred WitnessConservacaoOrtogonal {
  some s: Estado, bm: Bem |
    coerente[s] and bm in s.cadastrados and s.statusDo[bm] = Inservivel
    and s.conservacaoDo[bm] = BOM
}

// ---- Comandos ---------------------------------------------------------------
check PlaquetaUnicaPorBem for 6
check ChaveUnicaImpedeNovoBem for 6
check BaixaNaoLiberaChave for 6
check PlaquetaNaoReutilizadaAposBaixa for 8
check ReclassificacaoNaoRenomeiaResumoCompartilhado for 8
check CadastroComecaAtivoVersao1 for 8
check SemSaltoAtivoParaBaixa for 6
check BaixaExigeComprovante for 6
check BaixaTerminal for 6
check BaixaPreservaBem for 6
check MutacaoCanonicaIncrementaUmaVez for 6
check FanOutNaoIncrementaVersao for 6
check FanOutLocalNaoIncrementaVersao for 6
check FanOutNaoCriaEvento for 6
check ConflitoVersaoNaoAlteraBem for 6
check RetryNaoDuplicaFato for 6
check UmaEdicaoPendentePorBem for 6
check UmaAdicaoPendentePorPlaqueta for 6
check LockTemRequerente for 6
check LockAlheioNaoRemovido for 6
check LockAusenteImpedeResposta for 6
check CadastroGeraUmEvento for 8
check EdicaoGeraUmEvento for 6
check BaixaGeraUmEvento for 6
check M9InvalidoImpedeCommit for 8
check ProfessorNaoAprova for 8
check ProfessorNaoBaixa for 6
check AutorizacaoNaoDispensaDominio for 6
check TransicoesPreservamCoerencia for 6

run WitnessDoisBensMesmoResumo for 6
run WitnessReclassificacaoIndividual for 8
run WitnessBemAtivo for 4
run WitnessTransicaoInservivel for 6
run WitnessTransicaoBaixa for 6
run WitnessCadastroAprovado for 6
run WitnessEdicaoAprovada for 6
run WitnessEdicaoRejeitada for 6
run WitnessConflitoVersao for 6
run WitnessConflitoUnicidade for 6
run WitnessDuasPlaquetasDistintas for 6
run WitnessLockIntegro for 6
run WitnessFanOutSemVersao for 6
run WitnessRetrySemDuplicacao for 6
run WitnessBaixaComHistorico for 6
run WitnessBemBaixadoExiste for 6
run WitnessConservacaoOrtogonal for 4
