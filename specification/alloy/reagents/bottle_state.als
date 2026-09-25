// M2.2b/M2.2c — coerência do estado corrente e transições documentadas.
// Fontes normativas:
// - Seção 4, Frasco_Reagente: explicações das linhas 399-414 e máquina de estados.
// - Seção 7, regras 184-205 (status/descarte) e 136-139 (esgotamento).
// - Seção 8, 228/232 (retirada e marcação de vazio/quebrado).
// - Seção 5, dicionário Frasco_Reagente (391-401) e projeção operacional de
//   pendência de descarte.
// - Seção 10.5: extravio, devolução, descarte MET-05, resolução de quarentena.
// - M0 (withdrawal.als): estados não utilizáveis e quarentena => INDISPONIVEL.
//
// HQ-M2-008/B: quarentena não vai direto a descarte. É preciso resolver
// a quarentena com a decisão humana PENDENTE_DE_DESCARTE, que gera uma
// autorização operacional estruturada (projeção Pendencias_Descarte_Frasco),
// e só então descartar. `descarteTecnicoAutorizado` é a abstração dessa
// projeção; NÃO é coluna de Frasco_Reagente (o CUE permanece com 29 colunas).
// M2.1d não é reaberto; a projeção operacional não é entidade SQL/3FN.
//
// Escopo: fisico, disponibilidade, saldoDesconhecido, aberturaHistorica,
// vencido, usoVencidoAutorizado, emQuarentena e descarteTecnicoAutorizado.
// Não modela pesos, tara numérica, validade calculada, empréstimo, cache nem
// fluxo diário. Não declara M0 e M2.2 compostos (dívida de M2.4).

module reagents/bottle_state

abstract sig EstadoFisico {}
one sig FECHADO, ABERTO, VAZIO, QUEBRADO, DESCARTADO extends EstadoFisico {}
abstract sig SituacaoLocalizacao {}
one sig LOCALIZADO extends SituacaoLocalizacao {}
one sig EXTRAVIADO extends SituacaoLocalizacao {}
abstract sig Disponibilidade {}
one sig DISPONIVEL, EMPRESTADO, INDISPONIVEL extends Disponibilidade {}

sig Frasco {}

sig Estado {
  fisico: Frasco -> one EstadoFisico,
  localizacao: Frasco -> one SituacaoLocalizacao,
  disponibilidade: Frasco -> one Disponibilidade,
  saldoDesconhecido: set Frasco,
  aberturaHistorica: set Frasco,
  vencido: set Frasco,
  usoVencidoAutorizado: set Frasco,
  emQuarentena: set Frasco,
  // Abstrai a projeção operacional server-owned Pendencias_Descarte_Frasco/{id}.
  descarteTecnicoAutorizado: set Frasco
}

// Invariantes de estado documentadas (Seção 4, 401/403; HQ-M2-008/B).
pred coerente[s: Estado] {
  // VAZIO confirmado resolve desconhecimento; quebra/descarte preservam (emenda pré-M8).
  all f: Frasco |
    s.fisico[f] = VAZIO implies f not in s.saldoDesconhecido
  // Flag histórica nunca coexiste com FECHADO.
  all f: Frasco | f in s.aberturaHistorica implies s.fisico[f] != FECHADO
  // Quarentena bloqueia operação (projeção mínima; M0 mantém sua própria).
  all f: Frasco |
    (f in s.emQuarentena or s.localizacao[f] = EXTRAVIADO) implies s.disponibilidade[f] = INDISPONIVEL
  // Autorização técnica só existe após encerrar a quarentena para descarte.
  all f: Frasco |
    f in s.descarteTecnicoAutorizado implies
      (f not in s.emQuarentena and s.disponibilidade[f] = INDISPONIVEL)
}

// Bloqueio terminal: DESCARTADO não inicia nenhuma transição M2.2.
pred naoDescartado[s: Estado, f: Frasco] {
  s.fisico[f] != DESCARTADO
}

// Elegibilidade de descarte (Seção 7, 192; HQ-M2-008/B). A quarentena deve
// ser resolvida antes; a quarta rota é a autorização técnica de descarte.
pred aptoParaDescarte[s: Estado, f: Frasco] {
  naoDescartado[s, f]
  s.localizacao[f] = LOCALIZADO
  f not in s.emQuarentena
  s.disponibilidade[f] != EMPRESTADO
  (
    s.fisico[f] in VAZIO + QUEBRADO
    or (f in s.vencido and f not in s.usoVencidoAutorizado)
    or f in s.descarteTecnicoAutorizado
  )
}

// Frames de validade operacional persistida.
pred preservaValidade[a, b: Estado] {
  b.vencido = a.vencido
  b.usoVencidoAutorizado = a.usoVencidoAutorizado
}
pred preservaValidadeExceto[a, b: Estado, f: Frasco] {
  all g: Frasco - f |
    (g in b.vencido iff g in a.vencido) and
    (g in b.usoVencidoAutorizado iff g in a.usoVencidoAutorizado)
}

// Frames de quarentena e autorização técnica para operações ortogonais.
pred preservaQuarentenaEAutorizacao[a, b: Estado] {
  b.emQuarentena = a.emQuarentena
  b.descarteTecnicoAutorizado = a.descarteTecnicoAutorizado
}

// Extravio é localização, não estado físico. Preserva o último fato físico,
// revoga a autorização corrente e mantém o histórico no evento de operação.
pred extraviar[a, b: Estado, f: Frasco] {
  coerente[a]
  naoDescartado[a, f]
  a.localizacao[f] = LOCALIZADO
  b.fisico = a.fisico
  b.localizacao = a.localizacao ++ f->EXTRAVIADO
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.saldoDesconhecido = a.saldoDesconhecido
  b.aberturaHistorica = a.aberturaHistorica
  preservaValidade[a, b]
  b.emQuarentena = a.emQuarentena
  b.descarteTecnicoAutorizado = a.descarteTecnicoAutorizado - f
}

// Reencontro localiza novamente o recipiente, conserva o fato físico e impõe
// quarentena. A autorização anterior não reaparece; nova decisão é necessária.
pred reencontrar[a, b: Estado, f: Frasco] {
  coerente[a]
  a.localizacao[f] = EXTRAVIADO
  a.fisico[f] != DESCARTADO
  b.fisico = a.fisico
  b.localizacao = a.localizacao ++ f->LOCALIZADO
  b.emQuarentena = a.emQuarentena + f
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.descarteTecnicoAutorizado = a.descarteTecnicoAutorizado - f
  b.saldoDesconhecido = a.saldoDesconhecido
  b.aberturaHistorica = a.aberturaHistorica
  preservaValidade[a, b]
}

// Quebra: não terminal, preserva conhecimento metrológico e flag histórica (Seção 4, 403).
// Empréstimo ativo deve ser encerrado antes da transição incompatível (Seção 8,
// 232). vencido/usoVencido não especificados no alvo; quarentena/autorização
// preservadas.
pred quebrar[a, b: Estado, f: Frasco] {
  coerente[a]
  naoDescartado[a, f]
  a.disponibilidade[f] != EMPRESTADO
  a.localizacao[f] = LOCALIZADO
  b.fisico = a.fisico ++ f->QUEBRADO
  b.localizacao = a.localizacao
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.saldoDesconhecido = a.saldoDesconhecido
  b.aberturaHistorica = a.aberturaHistorica
  preservaValidadeExceto[a, b, f]
  preservaQuarentenaEAutorizacao[a, b]
}

// Descarte institucional. Consome a autorização técnica do alvo, se houver.
pred descartar[a, b: Estado, f: Frasco] {
  coerente[a]
  aptoParaDescarte[a, f]
  b.fisico = a.fisico ++ f->DESCARTADO
  b.localizacao = a.localizacao
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.saldoDesconhecido = a.saldoDesconhecido
  b.aberturaHistorica = a.aberturaHistorica
  preservaValidade[a, b]
  b.emQuarentena = a.emQuarentena
  b.descarteTecnicoAutorizado = a.descarteTecnicoAutorizado - f
}

// Esgotamento confirmado pelo gestor. vencido/usoVencido do alvo pertencem à
// devolução (fora desta abstração); quarentena/autorização preservadas porque
// resolver consumo NÃO libera quarentena (Seção 10.5).
pred confirmarEsgotamento[a, b: Estado, f: Frasco] {
  coerente[a]
  naoDescartado[a, f]
  b.fisico = a.fisico ++ f->VAZIO
  b.localizacao = a.localizacao
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.saldoDesconhecido = a.saldoDesconhecido - f
  b.aberturaHistorica = a.aberturaHistorica
  preservaValidadeExceto[a, b, f]
  preservaQuarentenaEAutorizacao[a, b]
}

// HQ-M2-008/B: resolverQuarentenaFrasco(PENDENTE_DE_DESCARTE). Encerra a
// quarentena do alvo, cria autorização técnica estruturada e mantém o frasco
// INDISPONIVEL. Não descarta o frasco.
pred resolverQuarentenaParaDescarte[a, b: Estado, f: Frasco] {
  coerente[a]
  f in a.emQuarentena
  naoDescartado[a, f]
  a.disponibilidade[f] != EMPRESTADO
  a.localizacao[f] = LOCALIZADO
  b.emQuarentena = a.emQuarentena - f
  b.descarteTecnicoAutorizado = a.descarteTecnicoAutorizado + f
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.fisico = a.fisico
  b.localizacao = a.localizacao
  b.saldoDesconhecido = a.saldoDesconhecido
  b.aberturaHistorica = a.aberturaHistorica
  preservaValidade[a, b]
}

pred algumaTransicao[a, b: Estado, f: Frasco] {
  extraviar[a, b, f] or reencontrar[a, b, f] or quebrar[a, b, f] or descartar[a, b, f] or
  confirmarEsgotamento[a, b, f] or resolverQuarentenaParaDescarte[a, b, f]
}

// INV-M2-COERENCIA-001: toda transição documentada preserva a coerência.
assert TransicoesPreservamCoerencia {
  all a, b: Estado, f: Frasco | algumaTransicao[a, b, f] implies coerente[b]
}

// INV-M2-DESCARTADO-TERMINAL-001 e casos específicos.
assert DescartadoEhTerminal {
  all a, b: Estado, f: Frasco |
    a.fisico[f] = DESCARTADO implies not algumaTransicao[a, b, f]
}
assert DescartadoNaoExtravia {
  all a, b: Estado, f: Frasco |
    a.fisico[f] = DESCARTADO implies not extraviar[a, b, f]
}
assert DescartadoNaoQuebra {
  all a, b: Estado, f: Frasco |
    a.fisico[f] = DESCARTADO implies not quebrar[a, b, f]
}
assert DescartadoNaoDescartaNovamente {
  all a, b: Estado, f: Frasco |
    a.fisico[f] = DESCARTADO implies not descartar[a, b, f]
}
assert DescartadoNaoEsgota {
  all a, b: Estado, f: Frasco |
    a.fisico[f] = DESCARTADO implies not confirmarEsgotamento[a, b, f]
}
assert DescartadoNaoResolveQuarentena {
  all a, b: Estado, f: Frasco |
    a.fisico[f] = DESCARTADO implies not resolverQuarentenaParaDescarte[a, b, f]
}

// INV-M2-QUARENTENA-001 (HQ-M2-008/B): quarentena não descarta direto.
assert QuarentenaNaoDescartaDireto {
  all a, b: Estado, f: Frasco |
    f in a.emQuarentena implies not descartar[a, b, f]
}

// INV-M2-EXTRAVIO-001 e frames.
assert ExtravioIndisponivel {
  all a, b: Estado, f: Frasco |
    extraviar[a, b, f] implies b.disponibilidade[f] = INDISPONIVEL
}
assert ExtravioPreservaFisico {
  all a, b: Estado, f: Frasco |
    extraviar[a, b, f] implies b.fisico[f] = a.fisico[f]
}
assert ExtravioMarcaLocalizacao {
  all a, b: Estado, f: Frasco |
    extraviar[a, b, f] implies b.localizacao[f] = EXTRAVIADO
}
assert ExtravioRevogaAutorizacao {
  all a, b: Estado, f: Frasco |
    extraviar[a, b, f] implies f not in b.descarteTecnicoAutorizado
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
assert ExtravioNaoRepetido {
  all a, b: Estado, f: Frasco |
    a.localizacao[f] = EXTRAVIADO implies not extraviar[a, b, f]
}
assert ExtravioPreservaValidade {
  all a, b: Estado, f: Frasco |
    extraviar[a, b, f] implies
      (b.vencido = a.vencido and b.usoVencidoAutorizado = a.usoVencidoAutorizado)
}
assert ReencontroLocalizaEQuarentena {
  all a, b: Estado, f: Frasco |
    reencontrar[a, b, f] implies
      (b.localizacao[f] = LOCALIZADO and f in b.emQuarentena and
       b.disponibilidade[f] = INDISPONIVEL)
}
assert ReencontroPreservaFisico {
  all a, b: Estado, f: Frasco |
    reencontrar[a, b, f] implies b.fisico[f] = a.fisico[f]
}
assert ReencontroRevogaAutorizacao {
  all a, b: Estado, f: Frasco |
    reencontrar[a, b, f] implies f not in b.descarteTecnicoAutorizado
}
assert QuebradoNaoDisponivelAposReencontro {
  all a, b: Estado, f: Frasco |
    reencontrar[a, b, f] and a.fisico[f] = QUEBRADO
    implies (b.fisico[f] = QUEBRADO and b.disponibilidade[f] = INDISPONIVEL)
}

// INV-M2-TERMINAL-IND-001.
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
assert QuebraNaoEmprestado {
  all a, b: Estado, f: Frasco |
    quebrar[a, b, f] implies a.disponibilidade[f] != EMPRESTADO
}

// INV-M2-TERMINAL-001.
assert QuebraPreservaConhecimentoMetrologico {
  all a, b: Estado, f: Frasco |
    quebrar[a, b, f] implies b.saldoDesconhecido = a.saldoDesconhecido
}
assert DescartePreservaConhecimentoMetrologico {
  all a, b: Estado, f: Frasco |
    descartar[a, b, f] implies b.saldoDesconhecido = a.saldoDesconhecido
}
assert EsgotamentoSaldoConhecido {
  all a, b: Estado, f: Frasco |
    confirmarEsgotamento[a, b, f] implies f not in b.saldoDesconhecido
}
assert DescarteFisicoDescartado {
  all a, b: Estado, f: Frasco |
    descartar[a, b, f] implies b.fisico[f] = DESCARTADO
}
assert DescartePreservaValidade {
  all a, b: Estado, f: Frasco |
    descartar[a, b, f] implies
      (b.vencido = a.vencido and b.usoVencidoAutorizado = a.usoVencidoAutorizado)
}

// FRAME-M2-DESCARTE-AUTORIZACAO-001: descarte consome a autorização do alvo.
assert DescarteConsomeAutorizacao {
  all a, b: Estado, f: Frasco |
    descartar[a, b, f] implies f not in b.descarteTecnicoAutorizado
}

// FRAME-M2-QUARENTENA-ORTOGONAL-001: operações ortogonais preservam quarentena
// e autorização técnica.
assert PreservacaoQuarentenaOrtogonais {
  all a, b: Estado, f: Frasco |
    (quebrar[a, b, f] or confirmarEsgotamento[a, b, f])
    implies
      (b.emQuarentena = a.emQuarentena and
       b.descarteTecnicoAutorizado = a.descarteTecnicoAutorizado)
}

// FRAME-M2-QUEBRA-INTERF-001 / FRAME-M2-ESGOTAMENTO-INTERF-001: operações
// locais não interferem em frascos != f.
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

// FRAME-M2-RESOLUCAO-QUARENTENA-001: resolução altera quarentena/autorização
// somente do alvo.
assert ResolucaoQuarentenaNaoInterfereOutros {
  all a, b: Estado, disj f, g: Frasco |
    resolverQuarentenaParaDescarte[a, b, f] implies
      ((g in b.emQuarentena iff g in a.emQuarentena) and
       (g in b.descarteTecnicoAutorizado iff g in a.descarteTecnicoAutorizado))
}

// INV-M2-DESCARTE-EMPRESTIMO-001 e USOVENCIDO.
assert NaoDescarteEmprestado {
  all a, b: Estado, f: Frasco |
    a.disponibilidade[f] = EMPRESTADO implies not descartar[a, b, f]
}
// O uso vencido autorizado não cria elegibilidade pela rota de vencimento;
// a rota técnica permanece independente e legítima (HQ-M2-008/B).
assert UsoVencidoNaoHabilitaDescarte {
  all a, b: Estado, f: Frasco |
    (a.fisico[f] in ABERTO + FECHADO and f in a.usoVencidoAutorizado and
     f not in a.descarteTecnicoAutorizado)
    implies not descartar[a, b, f]
}

// INV-M2-ABERTURA-001.
assert TransicoesPreservamFlag {
  all a, b: Estado, f: Frasco |
    algumaTransicao[a, b, f] implies
      (f in b.aberturaHistorica iff f in a.aberturaHistorica)
}

// Testemunhas de não-vacuidade por transição.
pred TestemunhaExtravio {
  some disj a, b: Estado, f: Frasco | extraviar[a, b, f]
}
pred TestemunhaExtravioPreservaFisico {
  some disj a, b: Estado, f: Frasco |
    extraviar[a, b, f] and a.fisico[f] = QUEBRADO and
    b.fisico[f] = QUEBRADO and a.localizacao[f] = LOCALIZADO and
    b.localizacao[f] = EXTRAVIADO and f not in b.descarteTecnicoAutorizado
}
pred TestemunhaReencontroQuebrado {
  some disj a, b: Estado, c, d: Estado, f: Frasco |
    resolverQuarentenaParaDescarte[a, b, f] and
    extraviar[b, c, f] and reencontrar[c, d, f] and
    a.fisico[f] = QUEBRADO and d.fisico[f] = QUEBRADO and
    d.localizacao[f] = LOCALIZADO and f in d.emQuarentena and
    f not in d.descarteTecnicoAutorizado
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
pred TestemunhaVencidoComUsoAutorizado {
  some s: Estado, f: Frasco |
    coerente[s] and f in s.vencido and f in s.usoVencidoAutorizado
}
// HQ-M2-008/B: resolução de quarentena para pendente de descarte.
pred TestemunhaResolverQuarentena {
  some disj a, b: Estado, f: Frasco |
    resolverQuarentenaParaDescarte[a, b, f] and f in b.descarteTecnicoAutorizado
}
// Caminho completo QUARENTENA -> PENDENTE -> DESCARTADO (ABERTO, não vencido).
pred TestemunhaQuarentenaAteDescarte {
  some disj a, b, c: Estado, f: Frasco |
    resolverQuarentenaParaDescarte[a, b, f] and descartar[b, c, f] and
    a.fisico[f] = ABERTO and f not in a.vencido and
    f in a.emQuarentena and c.fisico[f] = DESCARTADO
}

check TransicoesPreservamCoerencia for 4 but exactly 2 Estado
check DescartadoEhTerminal for 4 but exactly 2 Estado
check DescartadoNaoExtravia for 4 but exactly 2 Estado
check DescartadoNaoQuebra for 4 but exactly 2 Estado
check DescartadoNaoDescartaNovamente for 4 but exactly 2 Estado
check DescartadoNaoEsgota for 4 but exactly 2 Estado
check DescartadoNaoResolveQuarentena for 4 but exactly 2 Estado
check QuarentenaNaoDescartaDireto for 4 but exactly 2 Estado
check ExtravioIndisponivel for 4 but exactly 2 Estado
check ExtravioPreservaFisico for 4 but exactly 2 Estado
check ExtravioMarcaLocalizacao for 4 but exactly 2 Estado
check ExtravioRevogaAutorizacao for 4 but exactly 2 Estado
check ExtravioPreservaSaldo for 4 but exactly 2 Estado
check ExtravioPreservaFlag for 4 but exactly 2 Estado
check ExtravioNaoRepetido for 4 but exactly 2 Estado
check ExtravioPreservaValidade for 4 but exactly 2 Estado
check ReencontroLocalizaEQuarentena for 4 but exactly 2 Estado
check ReencontroPreservaFisico for 4 but exactly 2 Estado
check ReencontroRevogaAutorizacao for 4 but exactly 2 Estado
check QuebradoNaoDisponivelAposReencontro for 4 but exactly 2 Estado
check QuebraIndisponivel for 4 but exactly 2 Estado
check QuebraNaoEmprestado for 4 but exactly 2 Estado
check QuebraNaoInterfereValidade for 4 but exactly 2 Estado
check DescarteIndisponivel for 4 but exactly 2 Estado
check DescartePreservaConhecimentoMetrologico for 4 but exactly 2 Estado
check DescarteFisicoDescartado for 4 but exactly 2 Estado
check DescartePreservaValidade for 4 but exactly 2 Estado
check DescarteConsomeAutorizacao for 4 but exactly 2 Estado
check NaoDescarteEmprestado for 4 but exactly 2 Estado
check UsoVencidoNaoHabilitaDescarte for 4 but exactly 2 Estado
check EsgotamentoIndisponivel for 4 but exactly 2 Estado
check QuebraPreservaConhecimentoMetrologico for 4 but exactly 2 Estado
check EsgotamentoSaldoConhecido for 4 but exactly 2 Estado
check EsgotamentoNaoInterfereValidade for 4 but exactly 2 Estado
check PreservacaoQuarentenaOrtogonais for 4 but exactly 2 Estado
check ResolucaoQuarentenaNaoInterfereOutros for 4 but exactly 2 Estado
check TransicoesPreservamFlag for 4 but exactly 2 Estado
run TestemunhaExtravio for 4 but exactly 2 Estado
run TestemunhaExtravioPreservaFisico for 4 but exactly 2 Estado
run TestemunhaReencontroQuebrado for 6 but exactly 4 Estado
run TestemunhaQuebra for 4 but exactly 2 Estado
run TestemunhaDescarte for 4 but exactly 2 Estado
run TestemunhaDescarteVazio for 4 but exactly 2 Estado
run TestemunhaDescarteQuebrado for 4 but exactly 2 Estado
run TestemunhaDescarteVencidoAberto for 4 but exactly 2 Estado
run TestemunhaDescarteVencidoFechado for 4 but exactly 2 Estado
run TestemunhaEsgotamento for 4 but exactly 2 Estado
run TestemunhaVencidoComUsoAutorizado for 4 but exactly 2 Estado
run TestemunhaResolverQuarentena for 4 but exactly 2 Estado
run TestemunhaQuarentenaAteDescarte for 5 but exactly 3 Estado

pred QuebraSaldoDesconhecidoHabitavel { some disj a,b: Estado, f: Frasco | quebrar[a,b,f] and f in a.saldoDesconhecido and f in b.saldoDesconhecido }
run QuebraSaldoDesconhecidoHabitavel for 4 but exactly 2 Estado

pred QuebraSaldoConhecidoHabitavel { some disj a,b: Estado, f: Frasco | quebrar[a,b,f] and f not in a.saldoDesconhecido and f not in b.saldoDesconhecido }
run QuebraSaldoConhecidoHabitavel for 4 but exactly 2 Estado

assert QuebraPreservaConhecimentoMetrologicoAmpliado { all a,b: Estado, f: Frasco | quebrar[a,b,f] implies b.saldoDesconhecido = a.saldoDesconhecido }
check QuebraPreservaConhecimentoMetrologicoAmpliado for 6 but exactly 2 Estado

pred DescarteSaldoDesconhecidoHabitavel { some disj a,b: Estado, f: Frasco | descartar[a,b,f] and f in a.saldoDesconhecido and f in b.saldoDesconhecido }
run DescarteSaldoDesconhecidoHabitavel for 4 but exactly 2 Estado

pred DescarteSaldoConhecidoHabitavel { some disj a,b: Estado, f: Frasco | descartar[a,b,f] and f not in a.saldoDesconhecido and f not in b.saldoDesconhecido }
run DescarteSaldoConhecidoHabitavel for 4 but exactly 2 Estado

assert DescartePreservaConhecimentoMetrologicoAmpliado { all a,b: Estado, f: Frasco | descartar[a,b,f] implies b.saldoDesconhecido = a.saldoDesconhecido }
check DescartePreservaConhecimentoMetrologicoAmpliado for 6 but exactly 2 Estado
