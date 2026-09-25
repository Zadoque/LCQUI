module reagents/metrology_resolution_m6

abstract sig Rota {}
one sig REPETIR_PESAGEM, CONFIRMAR_ESGOTAMENTO, RECALIBRAR_TARA extends Rota {}
abstract sig Status {}
one sig PENDENTE, RESOLVIDA extends Status {}
sig Frasco {}
sig Medicao {}
sig Resolucao {}
sig Estado {
  pendencia: set Frasco,
  status: Frasco -> one Status,
  pesoRetorno: Frasco -> one Medicao,
  pesoRetornoEfetivo: Frasco -> lone Medicao,
  rota: Frasco -> lone Rota,
  resolucao: Frasco -> lone Resolucao,
  quarentena: set Frasco,
  taraReal: set Frasco
}

pred coerente[s: Estado] {
  all f: Frasco | f in s.pendencia iff s.status[f] = PENDENTE
  all f: Frasco | some f.(s.resolucao) implies f not in s.pendencia
  all f: Frasco | f in s.taraReal implies f not in s.pendencia
  all f: Frasco | f in s.pendencia implies f in s.quarentena
  all f: Frasco | some f.(s.resolucao) implies some s.pesoRetornoEfetivo[f]
}

pred repetirPesagem[a,b: Estado, f: Frasco, r: Resolucao] {
  coerente[a]
  f in a.pendencia
  b.pesoRetorno = a.pesoRetorno
  some b.pesoRetornoEfetivo[f]
  b.pendencia = a.pendencia - f
  b.status = a.status ++ f->RESOLVIDA
  b.rota = a.rota ++ f->REPETIR_PESAGEM
  b.resolucao = a.resolucao ++ f->r
  b.quarentena = a.quarentena
  b.taraReal = a.taraReal
}
pred confirmarEsgotamento[a,b: Estado, f: Frasco, r: Resolucao] {
  coerente[a]
  f in a.pendencia
  b.pesoRetorno = a.pesoRetorno
  b.pesoRetornoEfetivo = a.pesoRetornoEfetivo ++ f->a.pesoRetorno[f]
  b.pendencia = a.pendencia - f
  b.status = a.status ++ f->RESOLVIDA
  b.rota = a.rota ++ f->CONFIRMAR_ESGOTAMENTO
  b.resolucao = a.resolucao ++ f->r
  b.quarentena = a.quarentena
  b.taraReal = a.taraReal + f
}
pred recalibrarTara[a,b: Estado, f: Frasco, r: Resolucao] {
  coerente[a]
  f in a.pendencia
  f in a.quarentena
  b.pesoRetorno = a.pesoRetorno
  b.pesoRetornoEfetivo = a.pesoRetornoEfetivo
  b.pendencia = a.pendencia - f
  b.status = a.status ++ f->RESOLVIDA
  b.rota = a.rota ++ f->RECALIBRAR_TARA
  b.resolucao = a.resolucao ++ f->r
  b.quarentena = a.quarentena
  b.taraReal = a.taraReal + f
}

assert PesoRetornoImutavel { all a,b: Estado, f: Frasco |
  (repetirPesagem[a,b,f,Resolucao] or confirmarEsgotamento[a,b,f,Resolucao] or recalibrarTara[a,b,f,Resolucao]) implies
    b.pesoRetorno[f] = a.pesoRetorno[f] }
assert ResolucaoEncerraPendencia { all a,b: Estado, f: Frasco, r: Resolucao |
  (repetirPesagem[a,b,f,r] or confirmarEsgotamento[a,b,f,r] or recalibrarTara[a,b,f,r]) implies
    f not in b.pendencia and some f.(b.resolucao) }
assert ResolucaoNaoLiberaQuarentena { all a,b: Estado, f: Frasco, r: Resolucao |
  (repetirPesagem[a,b,f,r] or confirmarEsgotamento[a,b,f,r] or recalibrarTara[a,b,f,r]) implies
    f in b.quarentena }
assert RotaFechada { all a,b: Estado, f: Frasco, r: Resolucao |
  (repetirPesagem[a,b,f,r] or confirmarEsgotamento[a,b,f,r] or recalibrarTara[a,b,f,r]) implies
    b.rota[f] in REPETIR_PESAGEM + CONFIRMAR_ESGOTAMENTO + RECALIBRAR_TARA }
assert SemCorrecaoAdministrativa { all a,b: Estado, f: Frasco, r: Resolucao |
  (repetirPesagem[a,b,f,r] or confirmarEsgotamento[a,b,f,r] or recalibrarTara[a,b,f,r]) implies
    some b.rota[f] }
assert RecalibracaoExigeQuarentena { all a,b: Estado, f: Frasco, r: Resolucao |
  recalibrarTara[a,b,f,r] implies f in a.quarentena }

pred WitnessRepetirPesagem { some disj a,b: Estado, f: Frasco, r: Resolucao |
  f in a.pendencia and repetirPesagem[a,b,f,r] }
pred WitnessEsgotamento { some disj a,b: Estado, f: Frasco, r: Resolucao |
  f in a.pendencia and confirmarEsgotamento[a,b,f,r] }
pred WitnessRecalibracao { some disj a,b: Estado, f: Frasco, r: Resolucao |
  f in a.pendencia and f in a.quarentena and recalibrarTara[a,b,f,r] }

check PesoRetornoImutavel for 4
check ResolucaoEncerraPendencia for 4
check ResolucaoNaoLiberaQuarentena for 6
check RotaFechada for 6
check SemCorrecaoAdministrativa for 6
check RecalibracaoExigeQuarentena for 6
run WitnessRepetirPesagem for 4
run WitnessEsgotamento for 4
run WitnessRecalibracao for 6
