module reagents/stock_cache_scarcity_m8

// M8 — Estoque / Escassez / Notificações.
//
// Modelo abstrato composto. Não prova ponto flutuante decimal de Firestore,
// tempo real de TTL nem concorrência do motor Firestore; verifica relações,
// fronteiras de aptidão/escassez, invalidação/publicação do cache e
// idempotência abstrata do alerta. Limites numéricos exatos são validados por Rust.

abstract sig Fisico {}
one sig FECHADO, ABERTO, VAZIO, QUEBRADO, DESCARTADO extends Fisico {}
abstract sig Localizacao {}
one sig LOCALIZADO, EXTRAVIADO extends Localizacao {}
abstract sig Disp {}
one sig DISPONIVEL, EMPRESTADO, INDISPONIVEL extends Disp {}
// As dimensões Fisico/Localizacao/Disp são a interface com M5
// (loss_found_quarantine_m5.als). A cópia é inevitável na arquitetura atual;
// tools/formal/m8_origins.test.mjs compara mecanicamente os dois modelos.
abstract sig Bool {}
one sig True, False extends Bool {}

sig Frasco {}
sig Config { limiar: one Int }
sig Gestor {}
sig Resultado {}
sig Notificacao { gestor: one Gestor, config: one Config, dia: one Int }
sig Cache { geracao: one Int, valido: one Bool, resultado: lone Resultado }

sig Store {
  fisico: Frasco -> one Fisico,
  localizacao: Frasco -> one Localizacao,
  disponibilidade: Frasco -> one Disp,
  quarentena: set Frasco,
  saldoDesconhecido: set Frasco,
  pendencia: set Frasco,
  vencido: set Frasco,
  usoVencidoAutorizado: set Frasco,
  configDo: Frasco -> one Config,
  configAtiva: set Config,
  notifAtiva: set Config,
  vinculados: set Gestor,
  almoxAtivo: one Bool,
  cache: lone Cache,
  notificacoes: set Notificacao
}

// ---- Estado de frasco e aptidão ---------------------------------------------

pred coerente[s: Store] {
  all f: Frasco |
    (s.localizacao[f] = EXTRAVIADO or f in s.quarentena or
     s.fisico[f] in VAZIO + QUEBRADO + DESCARTADO) implies
       s.disponibilidade[f] = INDISPONIVEL
  all f: Frasco | f in s.pendencia implies
    (f in s.quarentena or s.disponibilidade[f] = INDISPONIVEL)
  all f: Frasco | s.fisico[f] = DESCARTADO implies
    (s.localizacao[f] = LOCALIZADO and f not in s.quarentena and f not in s.pendencia)
  all f: Frasco |
    (f in s.vencido and f in s.usoVencidoAutorizado) implies s.localizacao[f] = LOCALIZADO
  all disj n1,n2: s.notificacoes |
    n1.gestor = n2.gestor and n1.config = n2.config and n1.dia = n2.dia implies n1 = n2
}

// Predicado único de aptidão compartilhado por estoque/escassez/retirada.
pred frascoApto[s: Store, f: Frasco] {
  s.localizacao[f] = LOCALIZADO
  s.disponibilidade[f] = DISPONIVEL
  s.fisico[f] in FECHADO + ABERTO
  f not in s.quarentena
  (f not in s.vencido or f in s.usoVencidoAutorizado)
  f not in s.pendencia
}

fun aptos[s: Store, c: Config]: set Frasco {
  { f: Frasco | s.configDo[f] = c and frascoApto[s, f] }
}

// ---- Escassez ---------------------------------------------------------------

pred escassez[s: Store, c: Config] { #aptos[s, c] < c.limiar }

// A avaliação automática exige configuração e almoxarifado ativos.
pred avaliavel[s: Store, c: Config] { c in s.configAtiva and s.almoxAtivo = True }

// ---- Cache: invalidação e publicação ----------------------------------------

pred mesmoEstado[a,b: Store] {
  b.fisico = a.fisico and b.localizacao = a.localizacao
  and b.disponibilidade = a.disponibilidade and b.quarentena = a.quarentena
  and b.saldoDesconhecido = a.saldoDesconhecido and b.pendencia = a.pendencia
  and b.vencido = a.vencido and b.usoVencidoAutorizado = a.usoVencidoAutorizado
  and b.configDo = a.configDo and b.configAtiva = a.configAtiva
  and b.notifAtiva = a.notifAtiva and b.vinculados = a.vinculados
  and b.almoxAtivo = a.almoxAtivo and b.notificacoes = a.notificacoes
}

pred invalidaCache[a,b: Store] {
  some a.cache
  some c: Cache |
    b.cache = c and c.geracao = plus[a.cache.geracao, 1] and
    c.valido = False and no c.resultado
  mesmoEstado[a,b]
}

pred publicaCache[a,b: Store, g: Int, r: Resultado] {
  some a.cache
  a.cache.geracao = g
  some c: Cache |
    b.cache = c and c.geracao = g and c.valido = True and c.resultado = r
  mesmoEstado[a,b]
}

pred cacheMiss[s: Store] { no s.cache or no s.cache.resultado }
pred cacheValido[s: Store] { some s.cache and s.cache.valido = True and some s.cache.resultado }
pred cacheHit[s: Store, r: Resultado] {
  some s.cache and s.cache.valido = True and s.cache.resultado = r
}

// ---- Notificações de escassez -----------------------------------------------

pred mesmosFatos[a,b: Store] {
  b.fisico = a.fisico and b.localizacao = a.localizacao
  and b.disponibilidade = a.disponibilidade and b.quarentena = a.quarentena
  and b.saldoDesconhecido = a.saldoDesconhecido and b.pendencia = a.pendencia
  and b.vencido = a.vencido and b.usoVencidoAutorizado = a.usoVencidoAutorizado
  and b.configDo = a.configDo and b.configAtiva = a.configAtiva
  and b.notifAtiva = a.notifAtiva and b.vinculados = a.vinculados
  and b.almoxAtivo = a.almoxAtivo and b.cache = a.cache
}

pred emitirEscassez[a,b: Store, c: Config, g: Gestor, d: Int] {
  coerente[a]
  avaliavel[a, c]
  c in a.notifAtiva
  g in a.vinculados
  escassez[a, c]
  some n: Notificacao |
    n.gestor = g and n.config = c and n.dia = d and n not in a.notificacoes and
    b.notificacoes = a.notificacoes + n
  mesmosFatos[a,b]
}

pred retryNotificacao[a,b: Store, c: Config, g: Gestor, d: Int] {
  coerente[a]
  some n: a.notificacoes | n.gestor = g and n.config = c and n.dia = d
  b.notificacoes = a.notificacoes
  mesmosFatos[a,b]
}

// ---- Assertions: aptidão ----------------------------------------------------

assert ExtraviadoNuncaApto { all s: Store, f: Frasco |
  coerente[s] and s.localizacao[f] = EXTRAVIADO implies not frascoApto[s, f] }
assert QuarentenaNuncaApta { all s: Store, f: Frasco |
  coerente[s] and f in s.quarentena implies not frascoApto[s, f] }
assert FisicoImpedidoNuncaApto { all s: Store, f: Frasco |
  coerente[s] and s.fisico[f] in VAZIO + QUEBRADO + DESCARTADO implies not frascoApto[s, f] }
assert EmprestadoNaoApto { all s: Store, f: Frasco |
  coerente[s] and s.disponibilidade[f] = EMPRESTADO implies not frascoApto[s, f] }
assert PendenciaNuncaApta { all s: Store, f: Frasco |
  coerente[s] and f in s.pendencia implies not frascoApto[s, f] }
assert VencidoSemAutorizacaoNaoApto { all s: Store, f: Frasco |
  coerente[s] and f in s.vencido and f not in s.usoVencidoAutorizado implies not frascoApto[s, f] }
assert AptoNuncaDescartado { all s: Store, f: Frasco |
  frascoApto[s, f] implies s.fisico[f] != DESCARTADO }

// ---- Assertions: escassez ---------------------------------------------------

assert AbaixoDoLimiarEhEscassez { all s: Store, c: Config |
  #aptos[s, c] < c.limiar implies escassez[s, c] }
assert IgualAoLimiarNaoEhEscassez { all s: Store, c: Config |
  #aptos[s, c] = c.limiar implies not escassez[s, c] }
assert AcimaDoLimiarNaoEhEscassez { all s: Store, c: Config |
  #aptos[s, c] > c.limiar implies not escassez[s, c] }
assert AlmoxInativoNaoAvalia { all s: Store, c: Config |
  s.almoxAtivo = False implies not avaliavel[s, c] }
assert ConfigInativaNaoAvalia { all s: Store, c: Config |
  c not in s.configAtiva implies not avaliavel[s, c] }

// ---- Assertions: cache ------------------------------------------------------

assert InvalidacaoMudaGeracaoEInvalida { all a,b: Store |
  invalidaCache[a,b] implies
    b.cache.geracao = plus[a.cache.geracao, 1] and b.cache.valido = False and no b.cache.resultado }
assert InvalidacaoNaoRecalcula { all a,b: Store |
  invalidaCache[a,b] implies mesmoEstado[a,b] }
assert InvalidacaoImpedeHitValido { all a,b: Store |
  invalidaCache[a,b] implies not cacheValido[b] }
assert PublicacaoExigeMesmaGeracao { all a,b: Store, g: Int, r: Resultado |
  publicaCache[a,b,g,r] implies
    a.cache.geracao = g and b.cache.geracao = g and b.cache.valido = True and b.cache.resultado = r }
assert CacheMudouGeracaoNaoPublica { all a,b,c: Store, g: Int, r: Resultado |
  invalidaCache[a,b] and a.cache.geracao = g implies not publicaCache[b,c,g,r] }
assert PublicacaoNaoAlteraFatos { all a,b: Store, g: Int, r: Resultado |
  publicaCache[a,b,g,r] implies mesmoEstado[a,b] }

// ---- Assertions: notificações -----------------------------------------------

assert SemEscassezNaoNotifica { all a,b: Store, c: Config, g: Gestor, d: Int |
  emitirEscassez[a,b,c,g,d] implies escassez[a,c] }
assert ConfigInativaNaoEmite { all a,b: Store, c: Config, g: Gestor, d: Int |
  emitirEscassez[a,b,c,g,d] implies c in a.configAtiva }
assert NotificacaoDesativadaNaoEmite { all a,b: Store, c: Config, g: Gestor, d: Int |
  emitirEscassez[a,b,c,g,d] implies c in a.notifAtiva }
assert GestorNaoVinculadoNaoRecebe { all a,b: Store, c: Config, g: Gestor, d: Int |
  emitirEscassez[a,b,c,g,d] implies g in a.vinculados }
assert AlmoxInativoNaoEmite { all a,b: Store, c: Config, g: Gestor, d: Int |
  emitirEscassez[a,b,c,g,d] implies a.almoxAtivo = True }
assert RetryNaoDuplicaNotificacao { all a,b: Store, c: Config, g: Gestor, d: Int |
  retryNotificacao[a,b,c,g,d] implies b.notificacoes = a.notificacoes }
assert NotificacaoUnicaPorDia { all s: Store, disj n1,n2: s.notificacoes |
  coerente[s] and n1.gestor = n2.gestor and n1.config = n2.config and n1.dia = n2.dia implies n1 = n2 }

// ---- Witnesses --------------------------------------------------------------

pred WitnessFechadoApto { some s: Store, f: Frasco |
  coerente[s] and s.fisico[f] = FECHADO and s.localizacao[f] = LOCALIZADO and
  s.disponibilidade[f] = DISPONIVEL and frascoApto[s, f] }
pred WitnessAbertoApto { some s: Store, f: Frasco |
  coerente[s] and s.fisico[f] = ABERTO and s.localizacao[f] = LOCALIZADO and
  s.disponibilidade[f] = DISPONIVEL and frascoApto[s, f] }
pred WitnessVencidoAutorizadoApto { some s: Store, f: Frasco |
  coerente[s] and f in s.vencido and f in s.usoVencidoAutorizado and frascoApto[s, f] }
pred WitnessSaldoDesconhecidoApto { some s: Store, f: Frasco |
  coerente[s] and f in s.saldoDesconhecido and frascoApto[s, f] }
pred WitnessEscassezAbaixo { some s: Store, c: Config |
  coerente[s] and avaliavel[s, c] and escassez[s, c] }
pred WitnessLimiteExato { some s: Store, c: Config |
  coerente[s] and #aptos[s, c] = c.limiar and not escassez[s, c] }
pred WitnessAcimaDoLimite { some s: Store, c: Config |
  coerente[s] and #aptos[s, c] > c.limiar and not escassez[s, c] }
pred WitnessCacheMissCalculaEPublica { some a,b: Store, g: Int, r: Resultado |
  cacheMiss[a] and publicaCache[a,b,g,r] }
pred WitnessCacheHit { some s: Store, r: Resultado | cacheHit[s, r] }
pred WitnessInvalidacao { some a,b: Store | invalidaCache[a,b] }
pred WitnessGeracaoMudou { some a,b: Store, g: Int |
  invalidaCache[a,b] and a.cache.geracao = g and b.cache.geracao = plus[g, 1] }
pred WitnessNovoCalculoAposInvalidacao { some a,b,c: Store, r: Resultado |
  invalidaCache[a,b] and publicaCache[b,c,b.cache.geracao,r] }
pred WitnessEscassezComNotificacao { some a,b: Store, c: Config, g: Gestor, d: Int |
  emitirEscassez[a,b,c,g,d] }
pred WitnessEscassezSilenciada { some a: Store, c: Config |
  coerente[a] and c in a.configAtiva and c not in a.notifAtiva and escassez[a, c] and
  no n: a.notificacoes | n.config = c }
pred WitnessNovaNotificacaoOutroDia { some a,b,c: Store, cf: Config, g: Gestor, disj d1,d2: Int |
  emitirEscassez[a,b,cf,g,d1] and emitirEscassez[b,c,cf,g,d2] }

// ---- Commands ---------------------------------------------------------------

check ExtraviadoNuncaApto for 6
check QuarentenaNuncaApta for 6
check FisicoImpedidoNuncaApto for 6
check EmprestadoNaoApto for 6
check PendenciaNuncaApta for 6
check VencidoSemAutorizacaoNaoApto for 6
check AptoNuncaDescartado for 6
check AbaixoDoLimiarEhEscassez for 6
check IgualAoLimiarNaoEhEscassez for 6
check AcimaDoLimiarNaoEhEscassez for 6
check AlmoxInativoNaoAvalia for 6
check ConfigInativaNaoAvalia for 6
check InvalidacaoMudaGeracaoEInvalida for 4
check InvalidacaoNaoRecalcula for 4
check InvalidacaoImpedeHitValido for 4
check PublicacaoExigeMesmaGeracao for 4
check CacheMudouGeracaoNaoPublica for 4
check PublicacaoNaoAlteraFatos for 4
check SemEscassezNaoNotifica for 6
check ConfigInativaNaoEmite for 6
check NotificacaoDesativadaNaoEmite for 6
check GestorNaoVinculadoNaoRecebe for 6
check AlmoxInativoNaoEmite for 6
check RetryNaoDuplicaNotificacao for 6
check NotificacaoUnicaPorDia for 6

run WitnessFechadoApto for 4
run WitnessAbertoApto for 4
run WitnessVencidoAutorizadoApto for 4
run WitnessSaldoDesconhecidoApto for 4
run WitnessEscassezAbaixo for 4
run WitnessLimiteExato for 4
run WitnessAcimaDoLimite for 4
run WitnessCacheMissCalculaEPublica for 4
run WitnessCacheHit for 4
run WitnessInvalidacao for 4
run WitnessGeracaoMudou for 4
run WitnessNovoCalculoAposInvalidacao for 4
run WitnessEscassezComNotificacao for 6
run WitnessEscassezSilenciada for 6
run WitnessNovaNotificacaoOutroDia for 6 but exactly 3 Store
