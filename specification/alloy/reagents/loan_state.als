// M3 — ciclo de vida abstrato do Emprestimo_Reagente.
//
// Fontes normativas:
// - Seção 4: colunas 451-487; cardinalidade 802 ("no máximo um empréstimo ativo
//   por frasco"); máquina/invariantes 864 (EMPRESTADO exige um ativo EM_USO ou
//   ATRASADO) e 871 (devolução só para EM_USO/ATRASADO); 876 (ATRASADO é
//   promovido pelo job quando a data prevista é ultrapassada).
// - Seção 5: enum de status 427; data prevista 429; consumo/densidade 436/494.
// - Seção 7: 96 (job de atraso) e 133-139.
// - Seção 9: 210 (extravio encerra o empréstimo ativo; reencontro não o reabre).
// - Seção 10.5: 504-530 (retirada cria status EM_USO); 569-717 (devolução conclui
//   em DEVOLVIDO, DEVOLVIDO_COM_ATRASO ou DEVOLVIDO_COM_ANOMALIA); 845-880
//   (extravio do frasco encerra o empréstimo como ENCERRADO_EXTRAORDINARIO).
//
// Escopo: status do empréstimo, relação estática empréstimo->frasco, promoção de
// atraso e os encerramentos. ATIVOS = EM_USO + ATRASADO; ENCERRADOS = os quatro
// demais. Este módulo NÃO modela peso, tara, densidade, Q06, validade, TCR,
// autorização/RBAC, idempotência, Firestore, cache nem FLOW. A escolha entre
// DEVOLVIDO e DEVOLVIDO_COM_ATRASO por data pertence à devolução completa (M4);
// aqui ambas são realizáveis a partir de qualquer ativo. Não existe estado de
// reserva. A abstração `ativos` equivale ao conceito homônimo de M0/M2.4
// (disponibilidade EMPRESTADO <=> empréstimo ativo), sem compor os modelos.

module reagents/loan_state

abstract sig Status {}
one sig EM_USO, ATRASADO, DEVOLVIDO, DEVOLVIDO_COM_ATRASO, DEVOLVIDO_COM_ANOMALIA, ENCERRADO_EXTRAORDINARIO extends Status {}

sig Frasco {}

// Relação estática: um empréstimo pertence a um único frasco e não é reassociado.
sig Emprestimo {
  frasco: one Frasco
}

sig Estado {
  status: Emprestimo -> one Status
}

// Derivação de custódia ativa. O status é a autoridade; não há flag `ativo`.
fun ativos[s: Estado]: set Emprestimo {
  { e: Emprestimo | s.status[e] in EM_USO + ATRASADO }
}
fun ativosDoFrasco[s: Estado, f: Frasco]: set Emprestimo {
  { e: Emprestimo | e.frasco = f and s.status[e] in EM_USO + ATRASADO }
}

// INV-M3-ATIVO-UNICIDADE-001: no máximo um empréstimo ativo por frasco.
pred coerente[s: Estado] {
  all f: Frasco | lone ativosDoFrasco[s, f]
}

// Transições abstratas próprias do empréstimo. Cada uma altera somente o status
// do alvo; a relação com o frasco é estática.
pred atrasar[a, b: Estado, e: Emprestimo] {
  a.status[e] = EM_USO
  b.status = a.status ++ e->ATRASADO
}
pred devolver[a, b: Estado, e: Emprestimo] {
  a.status[e] in EM_USO + ATRASADO
  b.status = a.status ++ e->DEVOLVIDO
}
pred devolverComAtraso[a, b: Estado, e: Emprestimo] {
  a.status[e] in EM_USO + ATRASADO
  b.status = a.status ++ e->DEVOLVIDO_COM_ATRASO
}
pred devolverComAnomalia[a, b: Estado, e: Emprestimo] {
  a.status[e] in EM_USO + ATRASADO
  b.status = a.status ++ e->DEVOLVIDO_COM_ANOMALIA
}
pred encerrarExtraordinario[a, b: Estado, e: Emprestimo] {
  a.status[e] in EM_USO + ATRASADO
  b.status = a.status ++ e->ENCERRADO_EXTRAORDINARIO
}
pred algumaTransicao[a, b: Estado, e: Emprestimo] {
  atrasar[a, b, e] or devolver[a, b, e] or devolverComAtraso[a, b, e] or
  devolverComAnomalia[a, b, e] or encerrarExtraordinario[a, b, e]
}

// INV-M3-ATIVO-UNICIDADE-001: toda transição preserva a unicidade ativa.
assert UnicidadeAtivaPreservada {
  all a, b: Estado, e: Emprestimo |
    coerente[a] and algumaTransicao[a, b, e] implies coerente[b]
}

// INV-M3-ATRASO-ORIGEM-001: ATRASADO só é produzido a partir de EM_USO.
assert AtrasoSoDeEmUso {
  all a, b: Estado, e: Emprestimo |
    algumaTransicao[a, b, e] and b.status[e] = ATRASADO implies a.status[e] = EM_USO
}

// INV-M3-ENCERRADO-TERMINAL-001: nenhum status encerrado volta a ativo.
assert EncerradoNaoReabre {
  all a, b: Estado, e: Emprestimo |
    a.status[e] not in EM_USO + ATRASADO implies not algumaTransicao[a, b, e]
}

// INV-M3-DEVOLUCAO-ENCERRA-001: a devolução ordinária deixa o empréstimo encerrado.
assert DevolucaoEncerra {
  all a, b: Estado, e: Emprestimo |
    (devolver[a, b, e] or devolverComAtraso[a, b, e]) implies
      b.status[e] in DEVOLVIDO + DEVOLVIDO_COM_ATRASO
}

// INV-M3-ANOMALIA-ENCERRA-001: DEVOLVIDO_COM_ANOMALIA encerra a custódia.
assert AnomaliaNaoAtiva {
  all a, b: Estado, e: Emprestimo |
    devolverComAnomalia[a, b, e] implies b.status[e] not in EM_USO + ATRASADO
}

// INV-M3-EXTRAORDINARIO-ENCERRA-001: ENCERRADO_EXTRAORDINARIO encerra a custódia.
assert ExtraordinarioNaoAtivo {
  all a, b: Estado, e: Emprestimo |
    encerrarExtraordinario[a, b, e] implies b.status[e] not in EM_USO + ATRASADO
}

// FRAME-M3-STATUS-001: a transição do alvo não altera o status de outro empréstimo.
assert TransicaoNaoInterfereOutros {
  all a, b: Estado, e, e2: Emprestimo |
    e2 != e and algumaTransicao[a, b, e] implies b.status[e2] = a.status[e2]
}

// Testemunhas de não-vacuidade.
pred TestemunhaEmUso {
  some s: Estado, e: Emprestimo | coerente[s] and s.status[e] = EM_USO
}
pred TestemunhaAtrasado {
  some s: Estado, e: Emprestimo | coerente[s] and s.status[e] = ATRASADO
}
pred TestemunhaAtraso {
  some disj a, b: Estado, e: Emprestimo | atrasar[a, b, e]
}
pred TestemunhaDevolucaoNormal {
  some disj a, b: Estado, e: Emprestimo | devolver[a, b, e]
}
pred TestemunhaDevolucaoComAtraso {
  some disj a, b: Estado, e: Emprestimo | devolverComAtraso[a, b, e]
}
pred TestemunhaDevolucaoComAnomalia {
  some disj a, b: Estado, e: Emprestimo | devolverComAnomalia[a, b, e]
}
pred TestemunhaEncerramentoExtraordinario {
  some disj a, b: Estado, e: Emprestimo | encerrarExtraordinario[a, b, e]
}
// Prova que a unicidade é por frasco, não global.
pred TestemunhaDoisFrascosAtivos {
  some s: Estado, disj e1, e2: Emprestimo, disj f1, f2: Frasco |
    coerente[s] and e1.frasco = f1 and e2.frasco = f2 and
    s.status[e1] = EM_USO and s.status[e2] = ATRASADO
}
// Não-vacuidade dos antecedentes dos checks: há estado coerente que transiciona e
// há estado coerente com empréstimo já encerrado.
pred TestemunhaTransicaoCoerente {
  some disj a, b: Estado, e: Emprestimo | coerente[a] and devolver[a, b, e]
}
pred TestemunhaEstadoEncerrado {
  some s: Estado, e: Emprestimo |
    coerente[s] and
    s.status[e] in DEVOLVIDO + DEVOLVIDO_COM_ATRASO + DEVOLVIDO_COM_ANOMALIA + ENCERRADO_EXTRAORDINARIO
}

check UnicidadeAtivaPreservada for 4 but exactly 2 Estado
check AtrasoSoDeEmUso for 4 but exactly 2 Estado
check EncerradoNaoReabre for 4 but exactly 2 Estado
check DevolucaoEncerra for 4 but exactly 2 Estado
check AnomaliaNaoAtiva for 4 but exactly 2 Estado
check ExtraordinarioNaoAtivo for 4 but exactly 2 Estado
check TransicaoNaoInterfereOutros for 4 but exactly 2 Estado
run TestemunhaEmUso for 4 but exactly 2 Estado
run TestemunhaAtrasado for 4 but exactly 2 Estado
run TestemunhaAtraso for 4 but exactly 2 Estado
run TestemunhaDevolucaoNormal for 4 but exactly 2 Estado
run TestemunhaDevolucaoComAtraso for 4 but exactly 2 Estado
run TestemunhaDevolucaoComAnomalia for 4 but exactly 2 Estado
run TestemunhaEncerramentoExtraordinario for 4 but exactly 2 Estado
run TestemunhaDoisFrascosAtivos for 4 but exactly 2 Estado
run TestemunhaTransicaoCoerente for 4 but exactly 2 Estado
run TestemunhaEstadoEncerrado for 4 but exactly 2 Estado

// Reexecução ampliada (scope 6) das propriedades centrais. Nomes distintos
// porque o receipt do solver é indexado pelo nome do comando.
assert UnicidadeAtivaPreservadaAmpliado {
  all a, b: Estado, e: Emprestimo |
    coerente[a] and algumaTransicao[a, b, e] implies coerente[b]
}
assert AtrasoSoDeEmUsoAmpliado {
  all a, b: Estado, e: Emprestimo |
    algumaTransicao[a, b, e] and b.status[e] = ATRASADO implies a.status[e] = EM_USO
}
assert EncerradoNaoReabreAmpliado {
  all a, b: Estado, e: Emprestimo |
    a.status[e] not in EM_USO + ATRASADO implies not algumaTransicao[a, b, e]
}
assert TransicaoNaoInterfereOutrosAmpliado {
  all a, b: Estado, e, e2: Emprestimo |
    e2 != e and algumaTransicao[a, b, e] implies b.status[e2] = a.status[e2]
}
pred TestemunhaDoisFrascosAtivosAmpliado {
  some s: Estado, disj e1, e2: Emprestimo, disj f1, f2: Frasco |
    coerente[s] and e1.frasco = f1 and e2.frasco = f2 and
    s.status[e1] = EM_USO and s.status[e2] = ATRASADO
}

check UnicidadeAtivaPreservadaAmpliado for 6 but exactly 2 Estado
check AtrasoSoDeEmUsoAmpliado for 6 but exactly 2 Estado
check EncerradoNaoReabreAmpliado for 6 but exactly 2 Estado
check TransicaoNaoInterfereOutrosAmpliado for 6 but exactly 2 Estado
run TestemunhaDoisFrascosAtivosAmpliado for 6 but exactly 2 Estado
