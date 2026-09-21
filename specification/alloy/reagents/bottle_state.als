// M2.2b/M2.2c — coerência do estado corrente e transições documentadas.
// Fontes normativas:
// - Seção 4, Frasco_Reagente: explicações das linhas 399-414, em especial
//   saldo_desconhecido (401) e abertura_historica_desconhecida (403).
// - Seção 7, regras 184-205 (status/descarte) e 136-139 (esgotamento).
// - Seção 8, 228/232 (retirada e marcação de vazio/quebrado).
// - Seção 5, dicionário Frasco_Reagente (391-401).
// - Seção 10.5: registrarExtravioOuReencontro (809-890), registrarDevolucao
//   (610-681) e descartarFrasco/MET-05 (1043-1112).
// - M0 (withdrawal.als): estados não utilizáveis e quarentena => INDISPONIVEL;
//   essa dimensão não é duplicada aqui para não inventar frame de em_quarentena.
// Escopo: fisico, disponibilidade, saldoDesconhecido, aberturaHistorica,
// vencido e usoVencidoAutorizado. Frames auditados: extraviar/descartar
// preservam vencido/usoVencido (pseudocódigo); quebrar os deixa não
// especificados no frasco-alvo; confirmarEsgotamento delega vencido/usoVencido
// à devolução, fora desta abstração. Em todos os casos, frascos não-alvo são
// preservados (não-interferência). Não modela pesos, tara, validade calculada,
// empréstimo, cache nem fluxo diário.

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
  aberturaHistorica: set Frasco,
  vencido: set Frasco,
  usoVencidoAutorizado: set Frasco
}

// Invariantes de estado documentadas (Seção 4, 401/403).
pred coerente[s: Estado] {
  // VAZIO/QUEBRADO/DESCARTADO não mantêm desconhecimento.
  all f: Frasco |
    s.fisico[f] in VAZIO + QUEBRADO + DESCARTADO implies f not in s.saldoDesconhecido
  // Flag histórica nunca coexiste com FECHADO.
  all f: Frasco | f in s.aberturaHistorica implies s.fisico[f] != FECHADO
}

// Seção 7, 192 / Seção 10.5, 1075-1081 (MET-05): elegibilidade de descarte.
// VAZIO ou QUEBRADO ou (vencido e sem uso vencido autorizado); nunca emprestado.
pred aptoParaDescarte[s: Estado, f: Frasco] {
  s.disponibilidade[f] != EMPRESTADO
  (
    s.fisico[f] in VAZIO + QUEBRADO
    or (f in s.vencido and f not in s.usoVencidoAutorizado)
  )
}

// Frames de validade operacional persistida. PRESERVED: relação completa
// inalterada. preservaValidadeExceto: relação dos frascos != f inalterada; o
// pós-valor de f é deliberadamente não especificado pelo predicado isolado.
pred preservaValidade[a, b: Estado] {
  b.vencido = a.vencido
  b.usoVencidoAutorizado = a.usoVencidoAutorizado
}
pred preservaValidadeExceto[a, b: Estado, f: Frasco] {
  all g: Frasco - f |
    (g in b.vencido iff g in a.vencido) and
    (g in b.usoVencidoAutorizado iff g in a.usoVencidoAutorizado)
}

// Extravio: bloqueia (M0), preserva saldo e flag (Seção 4, 401/403), rejeita
// extravio repetido (Seção 10.5, 846-847) e preserva vencido/usoVencido
// (pseudocódigo 855-859 não os modifica; dimensões independentes).
pred extraviar[a, b: Estado, f: Frasco] {
  coerente[a]
  a.fisico[f] != EXTRAVIADO
  b.fisico = a.fisico ++ f->EXTRAVIADO
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.saldoDesconhecido = a.saldoDesconhecido
  b.aberturaHistorica = a.aberturaHistorica
  preservaValidade[a, b]
}

// Quebra: terminal, não mantém desconhecimento; flag preservada (Seção 4, 403).
// Empréstimo ativo deve ser encerrado antes da transição incompatível (Seção 8,
// 232). Não há operação documentada que fixe vencido/usoVencido no alvo; fica
// não especificado, preservando os demais frascos.
pred quebrar[a, b: Estado, f: Frasco] {
  coerente[a]
  a.disponibilidade[f] != EMPRESTADO
  b.fisico = a.fisico ++ f->QUEBRADO
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.saldoDesconhecido = a.saldoDesconhecido - f
  b.aberturaHistorica = a.aberturaHistorica
  preservaValidadeExceto[a, b, f]
}

// Descarte institucional: VAZIO, QUEBRADO ou vencido sem uso autorizado;
// nunca emprestado (Seção 7, 192; Seção 10.5, 1070-1081). Preserva
// vencido/usoVencido como fatos persistidos (pseudocódigo 1083-1088).
pred descartar[a, b: Estado, f: Frasco] {
  coerente[a]
  aptoParaDescarte[a, f]
  b.fisico = a.fisico ++ f->DESCARTADO
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.saldoDesconhecido = a.saldoDesconhecido - f
  b.aberturaHistorica = a.aberturaHistorica
  preservaValidade[a, b]
}

// Esgotamento confirmado pelo gestor (Seção 7, 139; 4, 403 para a flag).
// Modela apenas a projeção física/metrológica do efeito. vencido e
// usoVencidoAutorizado do frasco-alvo são determinados pela devolução
// (Seção 10.5, 660/668-679), fora desta abstração; frascos não-alvo são
// preservados.
pred confirmarEsgotamento[a, b: Estado, f: Frasco] {
  coerente[a]
  b.fisico = a.fisico ++ f->VAZIO
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.saldoDesconhecido = a.saldoDesconhecido - f
  b.aberturaHistorica = a.aberturaHistorica
  preservaValidadeExceto[a, b, f]
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
// Invariante documentada: extravio repetido não é permitido (Seção 10.5, 846).
assert ExtravioNaoRepetido {
  all a, b: Estado, f: Frasco |
    a.fisico[f] = EXTRAVIADO implies not extraviar[a, b, f]
}
// FRAME-M2-EXTRAVIO-VALIDADE-001: extravio preserva vencido/usoVencido.
assert ExtravioPreservaValidade {
  all a, b: Estado, f: Frasco |
    extraviar[a, b, f] implies
      (b.vencido = a.vencido and b.usoVencidoAutorizado = a.usoVencidoAutorizado)
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
// INV-M2-QUEBRA-EMPRESTIMO-001 (Seção 8, 232).
assert QuebraNaoEmprestado {
  all a, b: Estado, f: Frasco |
    quebrar[a, b, f] implies a.disponibilidade[f] != EMPRESTADO
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
assert DescarteFisicoDescartado {
  all a, b: Estado, f: Frasco |
    descartar[a, b, f] implies b.fisico[f] = DESCARTADO
}

// FRAME-M2-DESCARTE-VALIDADE-001: descarte preserva vencido/usoVencido.
assert DescartePreservaValidade {
  all a, b: Estado, f: Frasco |
    descartar[a, b, f] implies
      (b.vencido = a.vencido and b.usoVencidoAutorizado = a.usoVencidoAutorizado)
}

// FRAME-M2-QUEBRA-INTERF-001 / FRAME-M2-ESGOTAMENTO-INTERF-001: operações
// locais não interferem em frascos != f, mesmo quando o pós-valor de f é
// não especificado (quebra) ou pertence à devolução (esgotamento).
assert QuebraNaoInterfereValidade {
  all a, b: Estado, disj f, g: Frasco |
    quebrar[a, b, f] implies
      ((g in b.vencido iff g in a.vencido) and
       (g in b.usoVencidoAutorizado iff g in a.usoVencidoAutorizado))
}
assert EsgotamentoNaoInterfereValidade {
  all a, b: Estado, disj f, g: Frasco |
    confirmarEsgotamento[a, b, f] implies
      ((g in b.vencido iff g in a.vencido) and
       (g in b.usoVencidoAutorizado iff g in a.usoVencidoAutorizado))
}

// INV-M2-DESCARTE-EMPRESTIMO-001: frasco emprestado não é descartável
// (Seção 7, 192; Seção 10.5, 1070).
assert NaoDescarteEmprestado {
  all a, b: Estado, f: Frasco |
    a.disponibilidade[f] = EMPRESTADO implies not descartar[a, b, f]
}
// INV-M2-DESCARTE-USOVENCIDO-001: uso vencido autorizado não habilita descarte
// pela rota de vencimento; em ABERTO/FECHADO só a terceira rota existiria e ela
// exige uso_vencido_autorizado = false (Seção 7, 192).
assert UsoVencidoNaoHabilitaDescarte {
  all a, b: Estado, f: Frasco |
    (a.fisico[f] in ABERTO + FECHADO and f in a.usoVencidoAutorizado)
    implies not descartar[a, b, f]
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
  some disj a, b: Estado, f: Frasco | descartar[a, b, f] and posDescarte[b, f]
}
pred TestemunhaEsgotamento {
  some disj a, b: Estado, f: Frasco | confirmarEsgotamento[a, b, f]
}

pred posDescarte[b: Estado, f: Frasco] {
  b.fisico[f] = DESCARTADO
  b.disponibilidade[f] = INDISPONIVEL
  f not in b.saldoDesconhecido
}
// Caminhos obrigatórios de descarte (Seção 7, 192; Seção 10.5, 1075-1081).
pred TestemunhaDescarteVazio {
  some disj a, b: Estado, f: Frasco |
    descartar[a, b, f] and a.fisico[f] = VAZIO and posDescarte[b, f]
}
pred TestemunhaDescarteQuebrado {
  some disj a, b: Estado, f: Frasco |
    descartar[a, b, f] and a.fisico[f] = QUEBRADO and posDescarte[b, f]
}
pred TestemunhaDescarteVencidoAberto {
  some disj a, b: Estado, f: Frasco |
    descartar[a, b, f] and a.fisico[f] = ABERTO and
    f in a.vencido and f not in a.usoVencidoAutorizado and posDescarte[b, f]
}
pred TestemunhaDescarteVencidoFechado {
  some disj a, b: Estado, f: Frasco |
    descartar[a, b, f] and a.fisico[f] = FECHADO and
    f in a.vencido and f not in a.usoVencidoAutorizado and posDescarte[b, f]
}
// Configuração operacional relevante: vencido com uso autorizado é habitável.
pred TestemunhaVencidoComUsoAutorizado {
  some s: Estado, f: Frasco |
    coerente[s] and f in s.vencido and f in s.usoVencidoAutorizado
}

check TransicoesPreservamCoerencia for 4 but exactly 2 Estado
check ExtravioIndisponivel for 4 but exactly 2 Estado
check ExtravioPreservaSaldo for 4 but exactly 2 Estado
check ExtravioPreservaFlag for 4 but exactly 2 Estado
check ExtravioNaoRepetido for 4 but exactly 2 Estado
check ExtravioPreservaValidade for 4 but exactly 2 Estado
check QuebraIndisponivel for 4 but exactly 2 Estado
check QuebraNaoEmprestado for 4 but exactly 2 Estado
check QuebraNaoInterfereValidade for 4 but exactly 2 Estado
check DescarteIndisponivel for 4 but exactly 2 Estado
check DescarteSaldoConhecido for 4 but exactly 2 Estado
check DescarteFisicoDescartado for 4 but exactly 2 Estado
check DescartePreservaValidade for 4 but exactly 2 Estado
check NaoDescarteEmprestado for 4 but exactly 2 Estado
check UsoVencidoNaoHabilitaDescarte for 4 but exactly 2 Estado
check EsgotamentoIndisponivel for 4 but exactly 2 Estado
check QuebraSaldoConhecido for 4 but exactly 2 Estado
check EsgotamentoSaldoConhecido for 4 but exactly 2 Estado
check EsgotamentoNaoInterfereValidade for 4 but exactly 2 Estado
check TransicoesPreservamFlag for 4 but exactly 2 Estado
run TestemunhaExtravio for 4 but exactly 2 Estado
run TestemunhaQuebra for 4 but exactly 2 Estado
run TestemunhaDescarte for 4 but exactly 2 Estado
run TestemunhaDescarteVazio for 4 but exactly 2 Estado
run TestemunhaDescarteQuebrado for 4 but exactly 2 Estado
run TestemunhaDescarteVencidoAberto for 4 but exactly 2 Estado
run TestemunhaDescarteVencidoFechado for 4 but exactly 2 Estado
run TestemunhaEsgotamento for 4 but exactly 2 Estado
run TestemunhaVencidoComUsoAutorizado for 4 but exactly 2 Estado
