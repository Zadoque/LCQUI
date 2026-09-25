module reagents/loss_found_quarantine_m5

abstract sig Fisico {}
one sig FECHADO, ABERTO, VAZIO, QUEBRADO, DESCARTADO extends Fisico {}
abstract sig Localizacao {}
one sig LOCALIZADO, EXTRAVIADO extends Localizacao {}
abstract sig Disp {}
one sig DISPONIVEL, EMPRESTADO, INDISPONIVEL extends Disp {}
sig Frasco {}
sig Estado {
  fisico: Frasco -> one Fisico,
  localizacao: Frasco -> one Localizacao,
  disponibilidade: Frasco -> one Disp,
  quarentena: set Frasco,
  autorizacaoDescarte: set Frasco,
  saldoDesconhecido: set Frasco,
  emprestimoAtivo: set Frasco
}

pred coerente[s: Estado] {
  all f: Frasco |
    (s.localizacao[f] = EXTRAVIADO or f in s.quarentena or
     s.fisico[f] in VAZIO + QUEBRADO + DESCARTADO) implies
       s.disponibilidade[f] = INDISPONIVEL
  all f: Frasco | s.fisico[f] = DESCARTADO implies
    s.localizacao[f] = LOCALIZADO and f not in s.quarentena and
    f not in s.autorizacaoDescarte and f not in s.emprestimoAtivo
  all f: Frasco | f in s.autorizacaoDescarte implies
    s.localizacao[f] = LOCALIZADO and f not in s.quarentena and
    s.disponibilidade[f] = INDISPONIVEL and s.fisico[f] != DESCARTADO
}

pred extraviar[a,b: Estado, f: Frasco] {
  coerente[a]
  a.localizacao[f] = LOCALIZADO
  a.fisico[f] != DESCARTADO
  b.fisico = a.fisico
  b.localizacao = a.localizacao ++ f->EXTRAVIADO
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.quarentena = a.quarentena
  b.autorizacaoDescarte = a.autorizacaoDescarte - f
  b.saldoDesconhecido = a.saldoDesconhecido
  b.emprestimoAtivo = a.emprestimoAtivo - f
}

pred reencontrar[a,b: Estado, f: Frasco] {
  coerente[a]
  a.localizacao[f] = EXTRAVIADO
  a.fisico[f] != DESCARTADO
  b.fisico = a.fisico
  b.localizacao = a.localizacao ++ f->LOCALIZADO
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.quarentena = a.quarentena + f
  b.autorizacaoDescarte = a.autorizacaoDescarte - f
  b.saldoDesconhecido = a.saldoDesconhecido
  b.emprestimoAtivo = a.emprestimoAtivo
}

pred autorizar[a,b: Estado, f: Frasco] {
  coerente[a]
  a.localizacao[f] = LOCALIZADO
  f in a.quarentena
  a.fisico[f] in VAZIO + QUEBRADO
  b.fisico = a.fisico
  b.localizacao = a.localizacao
  b.disponibilidade = a.disponibilidade
  b.quarentena = a.quarentena - f
  b.autorizacaoDescarte = a.autorizacaoDescarte + f
  b.saldoDesconhecido = a.saldoDesconhecido
  b.emprestimoAtivo = a.emprestimoAtivo
}

pred descartar[a,b: Estado, f: Frasco] {
  coerente[a]
  f in a.autorizacaoDescarte
  f not in a.emprestimoAtivo
  b.fisico = a.fisico ++ f->DESCARTADO
  b.localizacao = a.localizacao
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.quarentena = a.quarentena
  b.autorizacaoDescarte = a.autorizacaoDescarte - f
  b.saldoDesconhecido = a.saldoDesconhecido
  b.emprestimoAtivo = a.emprestimoAtivo
}

pred liberar[a,b: Estado, f: Frasco] {
  coerente[a]
  f in a.quarentena
  a.localizacao[f] = LOCALIZADO
  a.fisico[f] in FECHADO + ABERTO
  f not in a.autorizacaoDescarte
  b.fisico = a.fisico
  b.localizacao = a.localizacao
  b.disponibilidade = a.disponibilidade ++ f->DISPONIVEL
  b.quarentena = a.quarentena - f
  b.autorizacaoDescarte = a.autorizacaoDescarte
  b.saldoDesconhecido = a.saldoDesconhecido
  b.emprestimoAtivo = a.emprestimoAtivo
}

assert ExtravioPreservaFisico { all a,b: Estado, f: Frasco |
  extraviar[a,b,f] implies b.fisico[f] = a.fisico[f] }
assert ExtravioMarcaLocalizacao { all a,b: Estado, f: Frasco |
  extraviar[a,b,f] implies b.localizacao[f] = EXTRAVIADO }
assert ExtravioRevogaAutorizacao { all a,b: Estado, f: Frasco |
  extraviar[a,b,f] implies f not in b.autorizacaoDescarte }
assert ExtravioEncerraEmprestimo { all a,b: Estado, f: Frasco |
  extraviar[a,b,f] implies f not in b.emprestimoAtivo }
assert ReencontroImponeQuarentena { all a,b: Estado, f: Frasco |
  reencontrar[a,b,f] implies b.localizacao[f] = LOCALIZADO and
    f in b.quarentena and b.disponibilidade[f] = INDISPONIVEL }
assert ReencontroPreservaFisico { all a,b: Estado, f: Frasco |
  reencontrar[a,b,f] implies b.fisico[f] = a.fisico[f] }
assert ReencontroRevogaAutorizacao { all a,b: Estado, f: Frasco |
  reencontrar[a,b,f] implies f not in b.autorizacaoDescarte }
assert QuebradoNaoDisponivel { all a,b: Estado, f: Frasco |
  reencontrar[a,b,f] and a.fisico[f] = QUEBRADO implies
    b.disponibilidade[f] = INDISPONIVEL }
assert FisicosImpedemLiberacao { all a,b: Estado, f: Frasco |
  liberar[a,b,f] implies a.fisico[f] in FECHADO + ABERTO }
assert DescartadoTerminal { all a,b: Estado, f: Frasco |
  a.fisico[f] = DESCARTADO implies not (extraviar[a,b,f] or reencontrar[a,b,f] or autorizar[a,b,f] or descartar[a,b,f]) }
assert QuarentenaNaoDescartaDireto { all a,b: Estado, f: Frasco |
  f in a.quarentena implies not descartar[a,b,f] }
assert SaldoNaoFabricado { all a,b: Estado, f: Frasco |
  (extraviar[a,b,f] or reencontrar[a,b,f]) implies
    (f in a.saldoDesconhecido iff f in b.saldoDesconhecido) }

pred WitnessAberto { some disj a,b,c: Estado, f: Frasco |
  a.fisico[f] = ABERTO and a.localizacao[f] = LOCALIZADO and
  extraviar[a,b,f] and reencontrar[b,c,f] and c.fisico[f] = ABERTO }
pred WitnessFechado { some disj a,b,c: Estado, f: Frasco |
  a.fisico[f] = FECHADO and a.localizacao[f] = LOCALIZADO and
  extraviar[a,b,f] and reencontrar[b,c,f] and c.fisico[f] = FECHADO }
pred WitnessQuebradoCiclo { some disj a,b,c,d,e,g: Estado, f: Frasco |
  a.fisico[f] = QUEBRADO and a.localizacao[f] = LOCALIZADO and
  f in a.quarentena and autorizar[a,b,f] and extraviar[b,c,f] and
  reencontrar[c,d,f] and autorizar[d,e,f] and descartar[e,g,f] }
pred WitnessExtravioEmprestimo { some disj a,b: Estado, f: Frasco |
  f in a.emprestimoAtivo and a.localizacao[f] = LOCALIZADO and
  extraviar[a,b,f] and f not in b.emprestimoAtivo }

check ExtravioPreservaFisico for 4
check ExtravioMarcaLocalizacao for 4
check ExtravioRevogaAutorizacao for 4
check ExtravioEncerraEmprestimo for 4
check ReencontroImponeQuarentena for 6
check ReencontroPreservaFisico for 6
check ReencontroRevogaAutorizacao for 6
check QuebradoNaoDisponivel for 6
check FisicosImpedemLiberacao for 6
check DescartadoTerminal for 6
check QuarentenaNaoDescartaDireto for 6
check SaldoNaoFabricado for 6
run WitnessAberto for 4
run WitnessFechado for 4
run WitnessQuebradoCiclo for 7 but exactly 6 Estado
run WitnessExtravioEmprestimo for 4
