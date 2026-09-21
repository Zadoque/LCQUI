// M2.4: estratégia B; matriz normativa no worklog M2_4_COMPOSITION_INTEGRATION.
// Os blocos de origem são conferidos por tools/formal/composition.mjs.
// Um único universo; sem fatos que imponham coerência ao pós-estado.
module reagents/bottle_composition

abstract sig EstadoFisico {}
one sig FECHADO, ABERTO, VAZIO, QUEBRADO, DESCARTADO, EXTRAVIADO extends EstadoFisico {}
abstract sig Disponibilidade {}
one sig DISPONIVEL, EMPRESTADO, INDISPONIVEL extends Disponibilidade {}
sig Especificacao {}
sig Lote {
  id_especificacao: one Especificacao
}
sig Frasco {
  id_lote: lone Lote,
  id_especificacao_reagente: lone Especificacao
}
sig Emprestimo {}
sig EstadoIntegrado {
  ativos: Frasco -> set Emprestimo,
  fisico: Frasco -> one EstadoFisico,
  disponibilidade: Frasco -> one Disponibilidade,
  saldoDesconhecido: set Frasco,
  aberturaHistorica: set Frasco,
  vencido: set Frasco,
  usoVencidoAutorizado: set Frasco,
  emQuarentena: set Frasco,
  descarteTecnicoAutorizado: set Frasco
}

pred coerenteM0[s: EstadoIntegrado] {
  all f: Frasco | (s.disponibilidade[f] = EMPRESTADO iff some s.ativos[f])
  all f: Frasco | lone s.ativos[f]
  all f: Frasco | (s.fisico[f] in VAZIO + QUEBRADO + DESCARTADO + EXTRAVIADO or f in s.emQuarentena) implies s.disponibilidade[f] = INDISPONIVEL
}

pred filtroFisico[s: EstadoIntegrado, f: Frasco] {
  s.fisico[f] in FECHADO + ABERTO
  s.disponibilidade[f] = DISPONIVEL
  f not in s.emQuarentena
}

pred retirarM0[a, b: EstadoIntegrado, f: Frasco, e: Emprestimo] {
  coerenteM0[a]
  filtroFisico[a, f]
  no a.ativos.e
  b.fisico = a.fisico
  b.emQuarentena = a.emQuarentena
  b.ativos = a.ativos + f->e
  b.disponibilidade = a.disponibilidade ++ f->EMPRESTADO
}

pred coerenteM2[s: EstadoIntegrado] {
  // VAZIO/QUEBRADO/DESCARTADO não mantêm desconhecimento.
  all f: Frasco |
    s.fisico[f] in VAZIO + QUEBRADO + DESCARTADO implies f not in s.saldoDesconhecido
  // Flag histórica nunca coexiste com FECHADO.
  all f: Frasco | f in s.aberturaHistorica implies s.fisico[f] != FECHADO
  // Quarentena bloqueia operação (projeção mínima; M0 mantém sua própria).
  all f: Frasco |
    f in s.emQuarentena implies s.disponibilidade[f] = INDISPONIVEL
  // Autorização técnica só existe após encerrar a quarentena para descarte.
  all f: Frasco |
    f in s.descarteTecnicoAutorizado implies
      (f not in s.emQuarentena and s.disponibilidade[f] = INDISPONIVEL)
}

pred naoDescartado[s: EstadoIntegrado, f: Frasco] {
  s.fisico[f] != DESCARTADO
}

pred aptoParaDescarte[s: EstadoIntegrado, f: Frasco] {
  naoDescartado[s, f]
  f not in s.emQuarentena
  s.disponibilidade[f] != EMPRESTADO
  (
    s.fisico[f] in VAZIO + QUEBRADO
    or (f in s.vencido and f not in s.usoVencidoAutorizado)
    or f in s.descarteTecnicoAutorizado
  )
}

pred preservaValidade[a, b: EstadoIntegrado] {
  b.vencido = a.vencido
  b.usoVencidoAutorizado = a.usoVencidoAutorizado
}

pred preservaValidadeExceto[a, b: EstadoIntegrado, f: Frasco] {
  all g: Frasco - f |
    (g in b.vencido iff g in a.vencido) and
    (g in b.usoVencidoAutorizado iff g in a.usoVencidoAutorizado)
}

pred preservaQuarentenaEAutorizacao[a, b: EstadoIntegrado] {
  b.emQuarentena = a.emQuarentena
  b.descarteTecnicoAutorizado = a.descarteTecnicoAutorizado
}

pred extraviarM2[a, b: EstadoIntegrado, f: Frasco] {
  coerenteM2[a]
  naoDescartado[a, f]
  a.fisico[f] != EXTRAVIADO
  b.fisico = a.fisico ++ f->EXTRAVIADO
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.saldoDesconhecido = a.saldoDesconhecido
  b.aberturaHistorica = a.aberturaHistorica
  preservaValidade[a, b]
  preservaQuarentenaEAutorizacao[a, b]
}

pred quebrarM2[a, b: EstadoIntegrado, f: Frasco] {
  coerenteM2[a]
  naoDescartado[a, f]
  a.disponibilidade[f] != EMPRESTADO
  b.fisico = a.fisico ++ f->QUEBRADO
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.saldoDesconhecido = a.saldoDesconhecido - f
  b.aberturaHistorica = a.aberturaHistorica
  preservaValidadeExceto[a, b, f]
  preservaQuarentenaEAutorizacao[a, b]
}

pred descartarM2[a, b: EstadoIntegrado, f: Frasco] {
  coerenteM2[a]
  aptoParaDescarte[a, f]
  b.fisico = a.fisico ++ f->DESCARTADO
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.saldoDesconhecido = a.saldoDesconhecido - f
  b.aberturaHistorica = a.aberturaHistorica
  preservaValidade[a, b]
  b.emQuarentena = a.emQuarentena
  b.descarteTecnicoAutorizado = a.descarteTecnicoAutorizado - f
}

pred confirmarEsgotamentoM2[a, b: EstadoIntegrado, f: Frasco] {
  coerenteM2[a]
  naoDescartado[a, f]
  b.fisico = a.fisico ++ f->VAZIO
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.saldoDesconhecido = a.saldoDesconhecido - f
  b.aberturaHistorica = a.aberturaHistorica
  preservaValidadeExceto[a, b, f]
  preservaQuarentenaEAutorizacao[a, b]
}

pred resolverQuarentenaParaDescarteM2[a, b: EstadoIntegrado, f: Frasco] {
  coerenteM2[a]
  f in a.emQuarentena
  naoDescartado[a, f]
  a.disponibilidade[f] != EMPRESTADO
  b.emQuarentena = a.emQuarentena - f
  b.descarteTecnicoAutorizado = a.descarteTecnicoAutorizado + f
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.fisico = a.fisico
  b.saldoDesconhecido = a.saldoDesconhecido
  b.aberturaHistorica = a.aberturaHistorica
  preservaValidade[a, b]
}

pred viaLote[f: Frasco] { some f.id_lote }

pred viaDireta[f: Frasco] { some f.id_especificacao_reagente }

pred estruturaCoerente[] {
  all f: Frasco | not (viaLote[f] iff viaDireta[f])
}

fun especEfetiva: Frasco -> Especificacao {
  { f: Frasco, e: Especificacao |
    (viaLote[f] and f.id_lote.id_especificacao = e) or
    (viaDireta[f] and f.id_especificacao_reagente = e) }
}

pred coerenteIntegrado[s: EstadoIntegrado] {
  coerenteM0[s]
  coerenteM2[s]
  estruturaCoerente[]
}

// S10.5: retirada sem abertura; não modela autorização operacional completa.
pred retirarComposto[a,b: EstadoIntegrado, f: Frasco, e: Emprestimo] {
  coerenteIntegrado[a]
  retirarM0[a,b,f,e]
  b.saldoDesconhecido = a.saldoDesconhecido
  b.aberturaHistorica = a.aberturaHistorica
  preservaValidade[a,b]
  b.descarteTecnicoAutorizado = a.descarteTecnicoAutorizado
}
// S9 ALM-06 / S10.5: encerramento extraordinário só do alvo.
pred extraviarComposto[a,b: EstadoIntegrado, f: Frasco] {
  coerenteIntegrado[a]
  extraviarM2[a,b,f]
  b.ativos = a.ativos - f->Emprestimo
}
// S7 esgotamento / S9 ALM-05 / S10.5: fim da custódia na devolução.
// Efeito abstrato; não modela todos os destinos/metrologia da devolução.
pred esgotarComposto[a,b: EstadoIntegrado, f: Frasco] {
  coerenteIntegrado[a]
  confirmarEsgotamentoM2[a,b,f]
  b.ativos = a.ativos - f->Emprestimo
}
pred quebrarComposto[a,b: EstadoIntegrado, f: Frasco] {
  coerenteIntegrado[a]
  quebrarM2[a,b,f]
  b.ativos = a.ativos
}
pred descartarComposto[a,b: EstadoIntegrado, f: Frasco] {
  coerenteIntegrado[a]
  descartarM2[a,b,f]
  b.ativos = a.ativos
}
pred resolverComposto[a,b: EstadoIntegrado, f: Frasco] {
  coerenteIntegrado[a]
  resolverQuarentenaParaDescarteM2[a,b,f]
  b.ativos = a.ativos
}
pred transicaoLocal[a,b: EstadoIntegrado, f: Frasco] {
  (some e: Emprestimo | retirarComposto[a,b,f,e]) or
  extraviarComposto[a,b,f] or esgotarComposto[a,b,f] or
  quebrarComposto[a,b,f] or descartarComposto[a,b,f] or resolverComposto[a,b,f]
}
assert RetiradaCoerente {
  all a,b: EstadoIntegrado, f: Frasco, e: Emprestimo |
    retirarComposto[a,b,f,e] implies coerenteIntegrado[b]
}
assert QuarentenaBloqueia {
  all a,b: EstadoIntegrado, f: Frasco, e: Emprestimo |
    f in a.emQuarentena implies not retirarComposto[a,b,f,e]
}
assert DescarteTecnicoBloqueia {
  all a,b: EstadoIntegrado, f: Frasco, e: Emprestimo |
    f in a.descarteTecnicoAutorizado implies not retirarComposto[a,b,f,e]
}
assert TerminaisBloqueiam {
  all a,b: EstadoIntegrado, f: Frasco, e: Emprestimo |
    a.fisico[f] in VAZIO + QUEBRADO + DESCARTADO + EXTRAVIADO
    implies not retirarComposto[a,b,f,e]
}
assert QuebraSemAtivo {
  all a,b: EstadoIntegrado, f: Frasco | quebrarComposto[a,b,f] implies no a.ativos[f]
}
assert DescarteSemAtivo {
  all a,b: EstadoIntegrado, f: Frasco | descartarComposto[a,b,f] implies no a.ativos[f]
}
assert ResolucaoSemAtivo {
  all a,b: EstadoIntegrado, f: Frasco | resolverComposto[a,b,f] implies no a.ativos[f]
}
assert ExtravioCoerente {
  all a,b: EstadoIntegrado, f: Frasco | extraviarComposto[a,b,f] implies coerenteIntegrado[b]
}
assert EsgotamentoCoerente {
  all a,b: EstadoIntegrado, f: Frasco | esgotarComposto[a,b,f] implies coerenteIntegrado[b]
}
assert TodasCoerentes {
  all a,b: EstadoIntegrado, f: Frasco | transicaoLocal[a,b,f] implies coerenteIntegrado[b]
}
assert EncerraSomenteAlvo {
  all a,b: EstadoIntegrado, f: Frasco |
    (extraviarComposto[a,b,f] or esgotarComposto[a,b,f]) implies
      (no b.ativos[f] and all g: Frasco - f | b.ativos[g] = a.ativos[g])
}
assert NaoInterfereOutros {
  all a,b: EstadoIntegrado, disj f,g: Frasco | transicaoLocal[a,b,f] implies {
    b.ativos[g] = a.ativos[g]
    b.fisico[g] = a.fisico[g]
    b.disponibilidade[g] = a.disponibilidade[g]
    (g in b.emQuarentena iff g in a.emQuarentena)
    (g in b.descarteTecnicoAutorizado iff g in a.descarteTecnicoAutorizado)
    (g in b.saldoDesconhecido iff g in a.saldoDesconhecido)
    (g in b.aberturaHistorica iff g in a.aberturaHistorica)
    (g in b.vencido iff g in a.vencido)
    (g in b.usoVencidoAutorizado iff g in a.usoVencidoAutorizado)
  }
}
pred EstadoHabitavel { some s: EstadoIntegrado | coerenteIntegrado[s] and some Frasco }
pred RetiradaHabitavel {
  some disj a,b: EstadoIntegrado, f: Frasco, e: Emprestimo |
    retirarComposto[a,b,f,e] and no a.ativos[f] and b.ativos[f] = e
}
pred IdentidadeEstado {
  some disj a,b: EstadoIntegrado, disj f,g: Frasco, e: Emprestimo |
    retirarComposto[a,b,f,e] and viaLote[f] and viaDireta[g] and
    one especEfetiva[f] and one especEfetiva[g] and coerenteIntegrado[b]
}
pred ExtravioComAtivo {
  some disj a,b: EstadoIntegrado, disj f,g: Frasco |
    extraviarComposto[a,b,f] and some a.ativos[f] and some a.ativos[g]
}
pred ExtravioSemAtivo {
  some disj a,b: EstadoIntegrado, f: Frasco | extraviarComposto[a,b,f] and no a.ativos[f]
}
pred EsgotamentoComAtivo {
  some disj a,b: EstadoIntegrado, disj f,g: Frasco |
    esgotarComposto[a,b,f] and some a.ativos[f] and some a.ativos[g]
}
pred EsgotamentoSemAtivo {
  some disj a,b: EstadoIntegrado, f: Frasco | esgotarComposto[a,b,f] and no a.ativos[f]
}
pred QuebraHabitavel { some disj a,b: EstadoIntegrado, f: Frasco | quebrarComposto[a,b,f] }
pred DescarteHabitavel { some disj a,b: EstadoIntegrado, f: Frasco | descartarComposto[a,b,f] }
pred ResolucaoHabitavel { some disj a,b: EstadoIntegrado, f: Frasco | resolverComposto[a,b,f] }

check RetiradaCoerente for 4 but exactly 2 EstadoIntegrado
check QuarentenaBloqueia for 4 but exactly 2 EstadoIntegrado
check DescarteTecnicoBloqueia for 4 but exactly 2 EstadoIntegrado
check TerminaisBloqueiam for 4 but exactly 2 EstadoIntegrado
check QuebraSemAtivo for 4 but exactly 2 EstadoIntegrado
check DescarteSemAtivo for 4 but exactly 2 EstadoIntegrado
check ResolucaoSemAtivo for 4 but exactly 2 EstadoIntegrado
check ExtravioCoerente for 4 but exactly 2 EstadoIntegrado
check EsgotamentoCoerente for 4 but exactly 2 EstadoIntegrado
check TodasCoerentes for 4 but exactly 2 EstadoIntegrado
check EncerraSomenteAlvo for 4 but exactly 2 EstadoIntegrado
check NaoInterfereOutros for 4 but exactly 2 EstadoIntegrado
run EstadoHabitavel for 4 but exactly 2 EstadoIntegrado
run RetiradaHabitavel for 4 but exactly 2 EstadoIntegrado
run IdentidadeEstado for 4 but exactly 2 EstadoIntegrado
run ExtravioComAtivo for 4 but exactly 2 EstadoIntegrado
run ExtravioSemAtivo for 4 but exactly 2 EstadoIntegrado
run EsgotamentoComAtivo for 4 but exactly 2 EstadoIntegrado
run EsgotamentoSemAtivo for 4 but exactly 2 EstadoIntegrado
run QuebraHabitavel for 4 but exactly 2 EstadoIntegrado
run DescarteHabitavel for 4 but exactly 2 EstadoIntegrado
run ResolucaoHabitavel for 4 but exactly 2 EstadoIntegrado
assert RetiradaCoerenteAmpliado {
  all a,b: EstadoIntegrado, f: Frasco, e: Emprestimo |
    retirarComposto[a,b,f,e] implies coerenteIntegrado[b]
 }
check RetiradaCoerenteAmpliado for 6 but exactly 2 EstadoIntegrado

assert QuarentenaBloqueiaAmpliado {
  all a,b: EstadoIntegrado, f: Frasco, e: Emprestimo |
    f in a.emQuarentena implies not retirarComposto[a,b,f,e]
 }
check QuarentenaBloqueiaAmpliado for 6 but exactly 2 EstadoIntegrado

assert ExtravioCoerenteAmpliado {
  all a,b: EstadoIntegrado, f: Frasco | extraviarComposto[a,b,f] implies coerenteIntegrado[b]
 }
check ExtravioCoerenteAmpliado for 6 but exactly 2 EstadoIntegrado

assert EsgotamentoCoerenteAmpliado {
  all a,b: EstadoIntegrado, f: Frasco | esgotarComposto[a,b,f] implies coerenteIntegrado[b]
 }
check EsgotamentoCoerenteAmpliado for 6 but exactly 2 EstadoIntegrado

assert NaoInterfereOutrosAmpliado {
  all a,b: EstadoIntegrado, disj f,g: Frasco | transicaoLocal[a,b,f] implies {
    b.ativos[g] = a.ativos[g]
    b.fisico[g] = a.fisico[g]
    b.disponibilidade[g] = a.disponibilidade[g]
    (g in b.emQuarentena iff g in a.emQuarentena)
    (g in b.descarteTecnicoAutorizado iff g in a.descarteTecnicoAutorizado)
    (g in b.saldoDesconhecido iff g in a.saldoDesconhecido)
    (g in b.aberturaHistorica iff g in a.aberturaHistorica)
    (g in b.vencido iff g in a.vencido)
    (g in b.usoVencidoAutorizado iff g in a.usoVencidoAutorizado)
  }
 }
check NaoInterfereOutrosAmpliado for 6 but exactly 2 EstadoIntegrado

pred IdentidadeEstadoAmpliado { IdentidadeEstado[] }
run IdentidadeEstadoAmpliado for 6 but exactly 2 EstadoIntegrado
