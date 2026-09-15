module reagents/withdrawal

abstract sig EstadoFisico {}
one sig FECHADO, ABERTO, VAZIO, QUEBRADO, DESCARTADO, EXTRAVIADO extends EstadoFisico {}
abstract sig Disponibilidade {}
one sig DISPONIVEL, EMPRESTADO extends Disponibilidade {}
sig Frasco {}
sig Emprestimo {}
sig Estado {
  fisico: Frasco -> one EstadoFisico,
  disponibilidade: Frasco -> one Disponibilidade,
  quarentena: set Frasco,
  ativos: Frasco -> set Emprestimo
}

// Correspondência da projeção operacional; não equivale à aptidão.
pred coerente[s: Estado] {
  all f: Frasco | (s.disponibilidade[f] = DISPONIVEL iff no s.ativos[f])
  all f: Frasco | lone s.ativos[f]
}
pred filtroFisico[s: Estado, f: Frasco] {
  s.fisico[f] in FECHADO + ABERTO
  s.disponibilidade[f] = DISPONIVEL
  f not in s.quarentena
}
// Abstração atômica; validade, autorização, idempotência não modeladas no M0.
pred retirar[a, b: Estado, f: Frasco, e: Emprestimo] {
  coerente[a]
  filtroFisico[a, f]
  no a.ativos.e
  b.fisico = a.fisico
  b.quarentena = a.quarentena
  b.ativos = a.ativos + f->e
  b.disponibilidade = a.disponibilidade ++ f->EMPRESTADO
}
// INV-FRASCO-001
assert BloqueioFisico {
  all a, b: Estado, f: Frasco, e: Emprestimo |
    retirar[a,b,f,e] implies
      (a.fisico[f] not in VAZIO + QUEBRADO + DESCARTADO + EXTRAVIADO and f not in a.quarentena)
}
// INV-EMPRESTIMO-001: condição de pós-estado não é assumida em retirar.
assert Unicidade {
  all a, b: Estado, f: Frasco, e: Emprestimo |
    retirar[a,b,f,e] implies coerente[b]
}
pred Testemunha {
  some disj a,b: Estado, f: Frasco, e: Emprestimo | retirar[a,b,f,e]
}
pred DisponivelNaoApto {
  some s: Estado, f: Frasco |
    coerente[s] and s.fisico[f] = EXTRAVIADO and
    s.disponibilidade[f] = DISPONIVEL and not filtroFisico[s,f]
}
check BloqueioFisico for 4 but exactly 2 Estado
check Unicidade for 4 but exactly 2 Estado
run Testemunha for 4 but exactly 2 Estado
run DisponivelNaoApto for 4 but exactly 2 Estado
