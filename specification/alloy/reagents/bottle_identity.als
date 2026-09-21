// M2.2a — identidade química efetiva do Frasco_Reagente.
// Fonte normativa: Seção 4, entidade Lote (id_especificacao_reagente NOT NULL)
// e Constraint de Identidade Química do Frasco (linhas 377-380): com lote, a
// referência direta é NULL; sem lote, a referência direta é obrigatória.
// Interpretação adotada em M2 (worklog M2.0, M2-IDENTIDADE-001): exatamente uma
// rota relacional (XOR). O CHECK OR documental admite duas rotas; o texto não.
// Escopo: estrutura e resolução efetiva. Não modela FK global nem Firestore.

module reagents/bottle_identity

sig Especificacao {}

sig Lote {
  id_especificacao: one Especificacao
}

sig Frasco {
  id_lote: lone Lote,
  id_especificacao_reagente: lone Especificacao
}

pred viaLote[f: Frasco] { some f.id_lote }
pred viaDireta[f: Frasco] { some f.id_especificacao_reagente }

// Estrutura coerente: exatamente uma rota estrutural.
pred estruturaCoerente[] {
  all f: Frasco | not (viaLote[f] iff viaDireta[f])
}

// Condição SQL documental: pelo menos uma rota. Mais fraca que o texto.
pred condicaoEstiloSql[] {
  all f: Frasco | viaLote[f] or viaDireta[f]
}

// Resolução efetiva: união das rotas. Em estrutura coerente é função.
fun especEfetiva: Frasco -> Especificacao {
  { f: Frasco, e: Especificacao |
    (viaLote[f] and f.id_lote.id_especificacao = e) or
    (viaDireta[f] and f.id_especificacao_reagente = e) }
}

// IDENTIDADE-001: todo frasco coerente possui exatamente uma especificação efetiva.
assert IdentidadeUnica {
  estruturaCoerente[] implies (all f: Frasco | one especEfetiva[f])
}

// IDENTIDADE-002: se usa lote, a resolução efetiva é a especificação do lote.
assert ViaLoteResolveLote {
  estruturaCoerente[] implies
    (all f: Frasco | viaLote[f] implies especEfetiva[f] = f.id_lote.id_especificacao)
}

// IDENTIDADE-003: se não usa lote, a resolução efetiva é a referência direta.
assert ViaDiretaResolveDireta {
  estruturaCoerente[] implies
    (all f: Frasco | viaDireta[f] implies especEfetiva[f] = f.id_especificacao_reagente)
}

// IDENTIDADE-004: as duas rotas não coexistem (consequência do XOR).
assert RotasNaoCoexistem {
  estruturaCoerente[] implies
    (all f: Frasco | not (viaLote[f] and viaDireta[f]))
}

// Sem rota não há especificação efetiva (vale mesmo sem coerência).
assert SemRotaSemEspecificacao {
  all f: Frasco | (not viaLote[f] and not viaDireta[f]) implies no especEfetiva[f]
}

// Testemunhas de não-vacuidade das rotas coerentes.
pred ViaLoteValido {
  estruturaCoerente[]
  some f: Frasco | viaLote[f]
}
pred ViaDiretaValida {
  estruturaCoerente[]
  some f: Frasco | viaDireta[f]
}

// Configurações admitidas pela condição SQL mas excluídas pela estrutura coerente.
pred RotaDuplaIncoerente {
  not estruturaCoerente[]
  some f: Frasco | viaLote[f] and viaDireta[f]
}
pred RotaDuplaSobSql {
  condicaoEstiloSql[]
  some f: Frasco | viaLote[f] and viaDireta[f]
}
pred SemRotaIncoerente {
  not estruturaCoerente[]
  some f: Frasco | not viaLote[f] and not viaDireta[f]
}

check IdentidadeUnica for 4
check ViaLoteResolveLote for 4
check ViaDiretaResolveDireta for 4
check RotasNaoCoexistem for 4
check SemRotaSemEspecificacao for 4
run ViaLoteValido for 4
run ViaDiretaValida for 4
run RotaDuplaIncoerente for 4
run RotaDuplaSobSql for 4
run SemRotaIncoerente for 4
