// M2.2b/M2.2c — coerência do estado corrente e transições documentadas.
// Fontes normativas:
// - Seção 4, Frasco_Reagente: explicações das linhas 399-414, em especial
//   saldo_desconhecido (401) e abertura_historica_desconhecida (403).
// - Seção 7, regras 184-205 (status/descarte) e 136-139 (esgotamento).
// - Seção 5, dicionário Frasco_Reagente (391-401).
// - M0 (withdrawal.als): estados não utilizáveis e quarentena => INDISPONIVEL;
//   essa dimensão não é duplicada aqui para não inventar frame de em_quarentena.
// Escopo: saldo_desconhecido e abertura_historica_desconhecida nas transições
// cujos efeitos e frames estão documentados. Não modela pesos, tara, validade,
// vencimento, empréstimo, cache nem fluxo diário.

module reagents/bottle_state

abstract sig EstadoFisico {}
one sig FECHADO, ABERTO, VAZIO, QUEBRADO, DESCARTADO, EXTRAVIADO extends EstadoFisico {}
abstract sig Disponibilidade {}
one sig DISPONIVEL, EMPRESTADO, INDISPONIVEL extends Disponibilidade {}

sig Frasco {}

sig Estado {
  fisico: Frasco -> one EstadoFisico,
  disponibilidade: Frasco -> one Disponibilidade,
  saldoDesconhecido: set Frasco,
  aberturaHistorica: set Frasco
}

// Invariantes de estado documentadas (Seção 4, 401/403).
pred coerente[s: Estado] {
  // VAZIO/QUEBRADO/DESCARTADO não mantêm desconhecimento.
  all f: Frasco |
    s.fisico[f] in VAZIO + QUEBRADO + DESCARTADO implies f not in s.saldoDesconhecido
  // Flag histórica nunca coexiste com FECHADO.
  all f: Frasco | f in s.aberturaHistorica implies s.fisico[f] != FECHADO
}

// Extravio: bloqueia (M0) e preserva saldo e flag (Seção 4, 401/403).
pred extraviar[a, b: Estado, f: Frasco] {
  coerente[a]
  b.fisico = a.fisico ++ f->EXTRAVIADO
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.saldoDesconhecido = a.saldoDesconhecido
  b.aberturaHistorica = a.aberturaHistorica
}

// Quebra: terminal, não mantém desconhecimento; flag preservada (Seção 4, 403).
pred quebrar[a, b: Estado, f: Frasco] {
  coerente[a]
  b.fisico = a.fisico ++ f->QUEBRADO
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.saldoDesconhecido = a.saldoDesconhecido - f
  b.aberturaHistorica = a.aberturaHistorica
}

// Descarte institucional nos casos VAZIO/QUEBRADO (Seção 7, 187/192; 4, 403).
pred descartar[a, b: Estado, f: Frasco] {
  coerente[a]
  a.fisico[f] in VAZIO + QUEBRADO
  a.disponibilidade[f] != EMPRESTADO
  b.fisico = a.fisico ++ f->DESCARTADO
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.saldoDesconhecido = a.saldoDesconhecido - f
  b.aberturaHistorica = a.aberturaHistorica
}

// Esgotamento confirmado pelo gestor (Seção 7, 139; 4, 403 para a flag).
pred confirmarEsgotamento[a, b: Estado, f: Frasco] {
  coerente[a]
  b.fisico = a.fisico ++ f->VAZIO
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.saldoDesconhecido = a.saldoDesconhecido - f
  b.aberturaHistorica = a.aberturaHistorica
}

pred algumaTransicao[a, b: Estado, f: Frasco] {
  extraviar[a, b, f] or quebrar[a, b, f] or descartar[a, b, f] or
  confirmarEsgotamento[a, b, f]
}

// INV-M2-COERENCIA-001: toda transição documentada preserva a coerência.
assert TransicoesPreservamCoerencia {
  all a, b: Estado, f: Frasco | algumaTransicao[a, b, f] implies coerente[b]
}

// INV-M2-EXTRAVIO-001 e frames (saldo e flag histórica preservados).
assert ExtravioIndisponivel {
  all a, b: Estado, f: Frasco |
    extraviar[a, b, f] implies b.disponibilidade[f] = INDISPONIVEL
}
assert ExtravioPreservaSaldo {
  all a, b: Estado, f: Frasco |
    extraviar[a, b, f] implies
      (f in b.saldoDesconhecido iff f in a.saldoDesconhecido)
}
assert ExtravioPreservaFlag {
  all a, b: Estado, f: Frasco |
    extraviar[a, b, f] implies
      (f in b.aberturaHistorica iff f in a.aberturaHistorica)
}

// INV-M2-TERMINAL-IND-001: terminais bloqueiam o frasco.
assert QuebraIndisponivel {
  all a, b: Estado, f: Frasco |
    quebrar[a, b, f] implies b.disponibilidade[f] = INDISPONIVEL
}
assert DescarteIndisponivel {
  all a, b: Estado, f: Frasco |
    descartar[a, b, f] implies b.disponibilidade[f] = INDISPONIVEL
}
assert EsgotamentoIndisponivel {
  all a, b: Estado, f: Frasco |
    confirmarEsgotamento[a, b, f] implies b.disponibilidade[f] = INDISPONIVEL
}

// INV-M2-TERMINAL-001: terminais não mantêm desconhecimento (Seção 4, 401).
assert QuebraSaldoConhecido {
  all a, b: Estado, f: Frasco |
    quebrar[a, b, f] implies f not in b.saldoDesconhecido
}
assert DescarteSaldoConhecido {
  all a, b: Estado, f: Frasco |
    descartar[a, b, f] implies f not in b.saldoDesconhecido
}
assert EsgotamentoSaldoConhecido {
  all a, b: Estado, f: Frasco |
    confirmarEsgotamento[a, b, f] implies f not in b.saldoDesconhecido
}

// INV-M2-ABERTURA-001: as transições modeladas preservam a flag histórica.
assert TransicoesPreservamFlag {
  all a, b: Estado, f: Frasco |
    algumaTransicao[a, b, f] implies
      (f in b.aberturaHistorica iff f in a.aberturaHistorica)
}

// Testemunhas de não-vacuidade por transição.
pred TestemunhaExtravio {
  some disj a, b: Estado, f: Frasco | extraviar[a, b, f]
}
pred TestemunhaQuebra {
  some disj a, b: Estado, f: Frasco | quebrar[a, b, f]
}
pred TestemunhaDescarte {
  some disj a, b: Estado, f: Frasco | descartar[a, b, f]
}
pred TestemunhaEsgotamento {
  some disj a, b: Estado, f: Frasco | confirmarEsgotamento[a, b, f]
}

check TransicoesPreservamCoerencia for 4 but exactly 2 Estado
check ExtravioIndisponivel for 4 but exactly 2 Estado
check ExtravioPreservaSaldo for 4 but exactly 2 Estado
check ExtravioPreservaFlag for 4 but exactly 2 Estado
check QuebraIndisponivel for 4 but exactly 2 Estado
check DescarteIndisponivel for 4 but exactly 2 Estado
check EsgotamentoIndisponivel for 4 but exactly 2 Estado
check QuebraSaldoConhecido for 4 but exactly 2 Estado
check DescarteSaldoConhecido for 4 but exactly 2 Estado
check EsgotamentoSaldoConhecido for 4 but exactly 2 Estado
check TransicoesPreservamFlag for 4 but exactly 2 Estado
run TestemunhaExtravio for 4 but exactly 2 Estado
run TestemunhaQuebra for 4 but exactly 2 Estado
run TestemunhaDescarte for 4 but exactly 2 Estado
run TestemunhaEsgotamento for 4 but exactly 2 Estado
