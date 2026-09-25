module operations/idempotency_m7

abstract sig Status {}
one sig PENDENTE, CONCLUIDA, FALHOU extends Status {}
sig Uid {}
sig Tipo {}
sig PayloadHash {}
sig OpId {}
sig EventId {}
sig Efeito {}
sig Operacao {
  uid: one Uid,
  tipo: one Tipo,
  payload: one PayloadHash,
  id: one OpId,
  status: one Status,
  efeito: lone Efeito,
  evento: lone EventId
}
sig Store {
  operacoes: set Operacao,
  eventosProcessados: set EventId,
  materializacao: Efeito -> lone Int
}

fun identidade[s: Store, o: Operacao]: set Operacao {
  { x: s.operacoes | x.uid = o.uid and x.tipo = o.tipo and x.payload = o.payload }
}
pred coerente[s: Store] {
  all o: s.operacoes | o.status = CONCLUIDA implies one o.efeito
  all disj x,y: s.operacoes |
    x.uid = y.uid and x.tipo = y.tipo and x.payload = y.payload implies x = y
  all disj x,y: s.operacoes | x.id = y.id implies
    (x.uid = y.uid and x.tipo = y.tipo and x.payload = y.payload)
  all e: s.eventosProcessados | one { o: s.operacoes | o.evento = e }
}

pred primeiraExecucao[a,b: Store, o: Operacao, e: Efeito] {
  coerente[a]
  o not in a.operacoes
  no identidade[a,o]
  o.status = CONCLUIDA
  o.efeito = e
  b.operacoes = a.operacoes + o
  b.eventosProcessados = a.eventosProcessados
  b.materializacao = a.materializacao
  coerente[b]
}
pred retry[a,b: Store, o: Operacao] {
  coerente[a]
  o in a.operacoes
  o.status = CONCLUIDA
  b.operacoes = a.operacoes
  b.eventosProcessados = a.eventosProcessados
  b.materializacao = a.materializacao
  coerente[b]
}
pred evento[a,b: Store, o: Operacao, e: EventId, fx: Efeito] {
  coerente[a]
  o in a.operacoes
  o.efeito = fx
  (e in a.eventosProcessados implies b.eventosProcessados = a.eventosProcessados) and
  (e not in a.eventosProcessados implies b.eventosProcessados = a.eventosProcessados + e)
  b.operacoes = a.operacoes
  b.materializacao = a.materializacao
  o.evento = e
  coerente[b]
}
pred recomputarMaterializacao[a,b: Store, fx: Efeito, n: Int] {
  coerente[a]
  b.operacoes = a.operacoes
  b.eventosProcessados = a.eventosProcessados
  b.materializacao = a.materializacao ++ fx->n
  coerente[b]
}

assert IdentidadeUnicaNaoDuplicaEfeito { all s: Store, disj x,y: s.operacoes |
  coerente[s] and x.uid = y.uid and x.tipo = y.tipo and x.payload = y.payload implies x.efeito = y.efeito }
assert RetryNaoReexecuta { all a,b: Store, o: Operacao |
  retry[a,b,o] implies b.operacoes = a.operacoes }
assert ReusoIncompativelRejeitado { all s: Store, disj x,y: s.operacoes |
  coerente[s] and x.id = y.id implies x.uid = y.uid and x.tipo = y.tipo and x.payload = y.payload }
assert EventoDeduplicado { all a,b: Store, o: Operacao, e: EventId, fx: Efeito |
  evento[a,b,o,e,fx] and e in a.eventosProcessados implies b.eventosProcessados = a.eventosProcessados }
assert MaterializacaoSubstitutiva { all a,b: Store, fx: Efeito, n: Int |
  recomputarMaterializacao[a,b,fx,n] implies b.materializacao = a.materializacao ++ fx->n }
assert TransicoesPreservamCoerencia { all a,b: Store, o: Operacao, e: EventId, fx: Efeito, n: Int |
  (primeiraExecucao[a,b,o,fx] or retry[a,b,o] or evento[a,b,o,e,fx] or recomputarMaterializacao[a,b,fx,n]) implies coerente[b] }

pred WitnessPrimeiraExecucao { some disj a,b: Store, o: Operacao, e: Efeito |
  primeiraExecucao[a,b,o,e] }
pred WitnessRetry { some disj a,b,c: Store, o: Operacao, e: Efeito |
  primeiraExecucao[a,b,o,e] and retry[b,c,o] }
pred WitnessEventoDuplicado { some disj a,b: Store, o: Operacao, e: EventId, fx: Efeito |
  e in a.eventosProcessados and evento[a,b,o,e,fx] }
pred WitnessMaterializacao { some disj a,b: Store, fx: Efeito, n: Int |
  recomputarMaterializacao[a,b,fx,n] }

check IdentidadeUnicaNaoDuplicaEfeito for 4
check RetryNaoReexecuta for 6
check ReusoIncompativelRejeitado for 6
check EventoDeduplicado for 6
check MaterializacaoSubstitutiva for 6
check TransicoesPreservamCoerencia for 6
run WitnessPrimeiraExecucao for 4
run WitnessRetry for 6 but exactly 3 Store
run WitnessEventoDuplicado for 6
run WitnessMaterializacao for 6
