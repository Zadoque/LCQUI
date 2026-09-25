// M4 — retirada e devolução compostas (Frasco + Emprestimo no mesmo universo).
//
// Fontes normativas:
// - Seção 4: máquina de estados do frasco (862-871), categoria "devolução só para
//   EM_USO/ATRASADO", Q06 e esgotamento (905-907), snapshot vencido_na_retirada.
// - Seção 7: 96 (job EM_USO -> ATRASADO) e 133-139.
// - Seção 8: UI-07 (228): retirada, primeira abertura, vencido autorizado e
//   pós-devolução com destinos.
// - Seção 9: ALM-04/05/06 (203-210): retirada, devolução, destinos e fim de custódia.
// - Seção 10.5: registrarRetirada (417-554) e registrarDevolucao (557-799).
// - M2 (bottle_composition.als): coerência do frasco. M3 (loan_state.als): status.
//
// Escopo: composição operacional do MESMO Frasco e do MESMO Emprestimo. Não
// calcula Q06, tara, densidade, validade, evaporação nem resolução metrológica
// (M6); não modela extravio/reencontro/quarentena manual (M5), idempotência (M7)
// nem RBAC (M9). As guardas externas (RBAC, tomador, TCR, autoatendimento,
// confirmação de ciência) e os resultados metrológicos/atraso são fatos abstratos
// das operações. O status do empréstimo é a autoridade de custódia; o vencimento
// persistido do frasco (Estado.vencido) é a autoridade atual de validade, mantida
// pelo job. A devolução NÃO recalcula vencimento pelo relógio.
//
// O snapshot vencido_na_retirada é representado por Estado.vencidoNaRetirada e
// gravado apenas na retirada, a partir do estado resultante da eventual primeira
// abertura. A devolução o preserva. Para classificar o retorno sem duplicar
// autoridade, a projeção mínima validadeDesconhecida é introduzida aqui.

module reagents/withdrawal_return

abstract sig EstadoFisico {}
one sig FECHADO, ABERTO, VAZIO, QUEBRADO, DESCARTADO extends EstadoFisico {}
abstract sig SituacaoLocalizacao {}
one sig LOCALIZADO extends SituacaoLocalizacao {}
one sig EXTRAVIADO extends SituacaoLocalizacao {}
abstract sig Disponibilidade {}
one sig DISPONIVEL, EMPRESTADO, INDISPONIVEL extends Disponibilidade {}
abstract sig Status {}
one sig EM_USO, ATRASADO, DEVOLVIDO, DEVOLVIDO_COM_ATRASO, DEVOLVIDO_COM_ANOMALIA, ENCERRADO_EXTRAORDINARIO extends Status {}

abstract sig Bit {}
one sig Sim, Nao extends Bit {}
abstract sig DestinoVencido {}
one sig QUARENTENA, DISPONIVEL_AUTORIZADO, PENDENTE_DE_DESCARTE extends DestinoVencido {}

// Classificação determinística do retorno (Seção 5 da reconciliação pré-M5).
abstract sig ClasseDevolucao {}
one sig NORMAL, VENCEU_DURANTE, JA_VENCIDO, VALIDADE_DESCONHECIDA extends ClasseDevolucao {}

sig Frasco {}

// Relação estática: um empréstimo pertence a um único frasco.
sig Emprestimo {
  frasco: one Frasco
}

// Entradas abstratas da retirada. `guardasExternasOk` abstrai RBAC, tomador,
// confirmação de ciência e TCR; `abrirNoEmpremio` é a primeira abertura.
sig Retirada {
  abrirNoEmpremio: one Bit,
  guardasExternasOk: one Bit
}

// Entradas abstratas da devolução: resultados metrológicos e destino escolhido.
// Não existe `vencidoNoRetorno`: a validade de retorno é lida do estado
// persistido do frasco, não de uma segunda entrada.
sig Devolucao {
  anomaliaMetrologica: one Bit,
  ficouVazio: one Bit,
  atrasadoNoRetorno: one Bit,
  destino: one DestinoVencido
}

sig Estado {
  fisico: Frasco -> one EstadoFisico,
  localizacao: Frasco -> one SituacaoLocalizacao,
  disponibilidade: Frasco -> one Disponibilidade,
  saldoDesconhecido: set Frasco,
  aberturaHistorica: set Frasco,
  vencido: set Frasco,
  validadeDesconhecida: set Frasco,
  usoVencidoAutorizado: set Frasco,
  emQuarentena: set Frasco,
  descarteTecnicoAutorizado: set Frasco,
  // Parcial: empréstimo sem status em um estado ainda não existe.
  status: Emprestimo -> lone Status,
  // Snapshot histórico server-owned: empréstimos cujo vencido_na_retirada é true.
  vencidoNaRetirada: set Emprestimo
}

// ATIVOS = EM_USO + ATRASADO, derivado do status (sem flag `ativo`).
fun ativos[s: Estado]: set Emprestimo {
  { e: Emprestimo | s.status[e] = EM_USO or s.status[e] = ATRASADO }
}
fun ativosDoFrasco[s: Estado, f: Frasco]: set Emprestimo {
  { e: Emprestimo | e.frasco = f and (s.status[e] = EM_USO or s.status[e] = ATRASADO) }
}

// Bloco reproduzido de M2 (bottle_composition.als/coerenteM2); guardado por
// tools/formal/withdrawal_return.mjs.
pred coerenteM2[s: Estado] {
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

// M3: no máximo um empréstimo ativo por frasco (reproduzido de loan_state/coerente).
pred coerenteM3[s: Estado] {
  all f: Frasco | lone ativosDoFrasco[s, f]
}

// Coerência integrada: M2 + M3 + disponibilidade EMPRESTADO <=> empréstimo ativo.
pred coerenteM4[s: Estado] {
  coerenteM2[s]
  coerenteM3[s]
  all f: Frasco | (s.disponibilidade[f] = EMPRESTADO iff some ativosDoFrasco[s, f])
  // M0: estado físico não utilizável e quarentena implicam INDISPONIVEL.
  all f: Frasco |
    (s.fisico[f] in VAZIO + QUEBRADO + DESCARTADO or s.localizacao[f] = EXTRAVIADO or f in s.emQuarentena)
    implies s.disponibilidade[f] = INDISPONIVEL
}

// Retirada: aptidão operacional do frasco (Seção 8/9/10.5), exceto vencimento.
pred aptoParaRetirada[s: Estado, f: Frasco] {
  s.disponibilidade[f] = DISPONIVEL
  s.fisico[f] in FECHADO + ABERTO
  f not in s.emQuarentena
  f not in s.descarteTecnicoAutorizado
  no ativosDoFrasco[s, f]
}

// Vencimento/validade desconhecida exige autorização expressa do gestor.
pred vencimentoAutorizado[s: Estado, f: Frasco] {
  (f not in s.vencido and f not in s.validadeDesconhecida) or f in s.usoVencidoAutorizado
}

// Destino de validade exigido: vencido atual (autoridade persistida) ou validade
// desconhecida. `vencido` tem precedência sobre `validadeDesconhecida`.
pred precisaDestino[s: Estado, f: Frasco] {
  f in s.vencido or f in s.validadeDesconhecida
}

// Classificação determinística do retorno. O vencimento persistido tem
// precedência sobre a validade desconhecida, e a distinção "venceu durante o
// empréstimo" x "já estava vencido" usa o snapshot imutável do empréstimo.
fun classificacao[s: Estado, e: Emprestimo]: one ClasseDevolucao {
  ((e.frasco in s.vencido and e not in s.vencidoNaRetirada) implies VENCEU_DURANTE
   else ((e.frasco in s.vencido and e in s.vencidoNaRetirada) implies JA_VENCIDO
   else ((e.frasco not in s.vencido and e.frasco in s.validadeDesconhecida) implies VALIDADE_DESCONHECIDA
   else NORMAL)))
}

// Ordem normativa da retirada: aplicar abertura, determinar o vencido resultante,
// então validar a autorização de vencimento e criar o empréstimo gravando o
// snapshot vencido_na_retirada com esse mesmo estado.
pred retirar[a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada] {
  coerenteM4[a]
  op.guardasExternasOk = Sim
  aptoParaRetirada[a, f]
  e.frasco = f
  no a.status[e]
  // Primeira abertura durante a retirada: FECHADO -> ABERTO e, quando ocorre,
  // pode recalcular o vencimento. Sem abertura, o vencimento persistido é lido.
  (((op.abrirNoEmpremio = Sim and a.fisico[f] = FECHADO) and
      b.fisico = a.fisico ++ f->ABERTO and
      (b.vencido = a.vencido or b.vencido = a.vencido + f)) or
   ((not (op.abrirNoEmpremio = Sim and a.fisico[f] = FECHADO)) and
      b.fisico = a.fisico and b.vencido = a.vencido))
  // Guarda de vencimento/validade desconhecida sobre o estado resultante.
  vencimentoAutorizado[b, f]
  // Cria exatamente um empréstimo ativo para o frasco.
  b.status = a.status + e->EM_USO
  b.disponibilidade = a.disponibilidade ++ f->EMPRESTADO
  // Snapshot factual: e em vencido_na_retirada sse o frasco está vencido no
  // estado resultante da retirada (após eventual abertura).
  ((f in b.vencido and b.vencidoNaRetirada = (a.vencidoNaRetirada - e) + e) or
   (f not in b.vencido and b.vencidoNaRetirada = a.vencidoNaRetirada - e))
  // Demais dimensões preservadas (validade calculada pertence a M6).
  b.saldoDesconhecido = a.saldoDesconhecido
  b.localizacao = a.localizacao
  b.aberturaHistorica = a.aberturaHistorica
  b.validadeDesconhecida = a.validadeDesconhecida
  b.usoVencidoAutorizado = a.usoVencidoAutorizado
  b.emQuarentena = a.emQuarentena
  b.descarteTecnicoAutorizado = a.descarteTecnicoAutorizado
}

// Devolução: só empréstimo ativo; sempre encerra a custódia. Precedência de
// efeitos: anomalia > vazio > destino de validade > normal (Seções 8/9/10.5).
// A autoridade de vencimento é o estado persistido do frasco; a devolução não
// recalcula pelo relógio e não altera `vencido` nem o snapshot.
pred devolver[a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao] {
  coerenteM4[a]
  (a.status[e] = EM_USO or a.status[e] = ATRASADO)
  e.frasco = f
  // Status: anomalia prevalece sobre atraso; atraso define DEVOLVIDO_COM_ATRASO.
  ((op.anomaliaMetrologica = Sim and b.status = a.status ++ e->DEVOLVIDO_COM_ANOMALIA) or
   (op.anomaliaMetrologica = Nao and op.atrasadoNoRetorno = Sim and b.status = a.status ++ e->DEVOLVIDO_COM_ATRASO) or
   (op.anomaliaMetrologica = Nao and op.atrasadoNoRetorno = Nao and b.status = a.status ++ e->DEVOLVIDO))
  // Estado físico: esgotamento confirmado leva a VAZIO.
  ((op.ficouVazio = Sim and b.fisico = a.fisico ++ f->VAZIO) or
   (op.ficouVazio = Nao and b.fisico = a.fisico))
  // Saldo: vazio torna conhecido; anomalia sem vazio mantém desconhecido.
  ((op.ficouVazio = Sim and b.saldoDesconhecido = a.saldoDesconhecido - f) or
   (op.ficouVazio = Nao and op.anomaliaMetrologica = Sim and b.saldoDesconhecido = a.saldoDesconhecido + f) or
   (op.ficouVazio = Nao and op.anomaliaMetrologica = Nao and b.saldoDesconhecido = a.saldoDesconhecido))
  // Disponibilidade: vazio/anomalia/descarte/quarentena -> INDISPONIVEL.
  ((op.ficouVazio = Sim and b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL) or
   (op.ficouVazio = Nao and op.anomaliaMetrologica = Sim and b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL) or
   (op.ficouVazio = Nao and op.anomaliaMetrologica = Nao and precisaDestino[a, f] and op.destino = DISPONIVEL_AUTORIZADO and b.disponibilidade = a.disponibilidade ++ f->DISPONIVEL) or
   (op.ficouVazio = Nao and op.anomaliaMetrologica = Nao and precisaDestino[a, f] and op.destino != DISPONIVEL_AUTORIZADO and b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL) or
   (op.ficouVazio = Nao and op.anomaliaMetrologica = Nao and not precisaDestino[a, f] and b.disponibilidade = a.disponibilidade ++ f->DISPONIVEL))
  // Quarentena: anomalia e destino QUARENTENA entram; demais saem.
  ((op.anomaliaMetrologica = Sim and b.emQuarentena = a.emQuarentena + f) or
   (op.anomaliaMetrologica = Nao and precisaDestino[a, f] and op.destino = QUARENTENA and b.emQuarentena = a.emQuarentena + f) or
   (op.anomaliaMetrologica = Nao and (not precisaDestino[a, f] or op.destino != QUARENTENA) and b.emQuarentena = a.emQuarentena - f))
  // Uso vencido autorizado: só destino DISPONIVEL o concede; demais revogam.
  ((op.anomaliaMetrologica = Nao and precisaDestino[a, f] and op.destino = DISPONIVEL_AUTORIZADO and b.usoVencidoAutorizado = a.usoVencidoAutorizado + f) or
   (op.anomaliaMetrologica = Sim and b.usoVencidoAutorizado = a.usoVencidoAutorizado - f) or
   (op.anomaliaMetrologica = Nao and precisaDestino[a, f] and op.destino != DISPONIVEL_AUTORIZADO and b.usoVencidoAutorizado = a.usoVencidoAutorizado - f) or
   (op.anomaliaMetrologica = Nao and not precisaDestino[a, f] and b.usoVencidoAutorizado = a.usoVencidoAutorizado))
  // Vencimento persistido e snapshot histórico: NÃO recalculados nem reescritos.
  b.vencido = a.vencido
  b.localizacao = a.localizacao
  b.vencidoNaRetirada = a.vencidoNaRetirada
  b.validadeDesconhecida = a.validadeDesconhecida
  b.aberturaHistorica = a.aberturaHistorica
  b.descarteTecnicoAutorizado = a.descarteTecnicoAutorizado
}

// INV-M4-RETIRADA-APTA-001.
assert RetiradaApta {
  all a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada |
    retirar[a, b, f, e, op] implies aptoParaRetirada[a, f]
}
// INV-M4-RETIRADA-ATIVO-001: exatamente um ativo para o frasco após retirada.
assert RetiradaCriaAtivo {
  all a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada |
    retirar[a, b, f, e, op] implies ativosDoFrasco[b, f] = e
}
// INV-M4-RETIRADA-DISPONIBILIDADE-001.
assert RetiradaEmprestado {
  all a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada |
    retirar[a, b, f, e, op] implies b.disponibilidade[f] = EMPRESTADO
}
// INV-M4-RETIRADA-QUARENTENA-001.
assert QuarentenaBloqueiaRetirada {
  all a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada |
    f in a.emQuarentena implies not retirar[a, b, f, e, op]
}
// INV-M4-RETIRADA-DESCARTE-001 (autorização técnica e pendente de descarte).
assert DescarteBloqueiaRetirada {
  all a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada |
    f in a.descarteTecnicoAutorizado implies not retirar[a, b, f, e, op]
}
assert VencidoSemAutorizacaoBloqueia {
  all a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada |
    (f in a.vencido and f not in a.usoVencidoAutorizado) implies not retirar[a, b, f, e, op]
}
// INV-M4-RETIRADA-VENCIMENTO-001: o vencido resultante da abertura exige
// autorização; nenhuma retirada cria empréstimo de frasco vencido sem ela.
assert RetiradaVencimentoApto {
  all a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada |
    retirar[a, b, f, e, op] implies vencimentoAutorizado[b, f]
}
// INV-M4-RETIRADA-SNAPSHOT-001: o snapshot gravado é o vencido observado na
// criação, após eventual primeira abertura.
assert RetiradaSnapshotVencido {
  all a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada |
    retirar[a, b, f, e, op] implies (e in b.vencidoNaRetirada iff f in b.vencido)
}
// INV-M4-RETIRADA-ABERTURA-001.
assert AberturaNaRetirada {
  all a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada |
    retirar[a, b, f, e, op] and op.abrirNoEmpremio = Sim and a.fisico[f] = FECHADO
    implies b.fisico[f] = ABERTO
}
// INV-M4-RETIRADA-FRAME-001.
assert RetiradaNaoInterfere {
  all a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada, g: Frasco |
    retirar[a, b, f, e, op] and g != f implies {
      b.fisico[g] = a.fisico[g]
      b.disponibilidade[g] = a.disponibilidade[g]
      (g in b.saldoDesconhecido iff g in a.saldoDesconhecido)
      (g in b.aberturaHistorica iff g in a.aberturaHistorica)
      (g in b.vencido iff g in a.vencido)
      (g in b.validadeDesconhecida iff g in a.validadeDesconhecida)
      (g in b.usoVencidoAutorizado iff g in a.usoVencidoAutorizado)
      (g in b.emQuarentena iff g in a.emQuarentena)
      (g in b.descarteTecnicoAutorizado iff g in a.descarteTecnicoAutorizado)
    }
}
// Frame de status e snapshot para empréstimos alheios.
assert RetiradaNaoInterfereStatus {
  all a, b: Estado, f: Frasco, e, e2: Emprestimo, op: Retirada |
    retirar[a, b, f, e, op] and e2 != e implies {
      b.status[e2] = a.status[e2]
      (e2 in b.vencidoNaRetirada iff e2 in a.vencidoNaRetirada)
    }
}

// INV-M4-DEVOLUCAO-ATIVO-001.
assert DevolucaoExigeAtivo {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] implies (a.status[e] = EM_USO or a.status[e] = ATRASADO)
}
// INV-M4-DEVOLUCAO-CUSTODIA-001.
assert DevolucaoEncerraCustodia {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] implies not (b.status[e] = EM_USO or b.status[e] = ATRASADO)
}
// INV-M4-DEVOLUCAO-NORMAL-001.
assert DevolucaoNormal {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.anomaliaMetrologica = Nao and op.atrasadoNoRetorno = Nao
    implies b.status[e] = DEVOLVIDO
}
// INV-M4-DEVOLUCAO-ATRASO-001.
assert DevolucaoAtraso {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.anomaliaMetrologica = Nao and op.atrasadoNoRetorno = Sim
    implies b.status[e] = DEVOLVIDO_COM_ATRASO
}
// INV-M4-DEVOLUCAO-ANOMALIA-001 e precedência.
assert DevolucaoAnomalia {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.anomaliaMetrologica = Sim
    implies b.status[e] = DEVOLVIDO_COM_ANOMALIA
}
assert AnomaliaPrecedeAtraso {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.anomaliaMetrologica = Sim and op.atrasadoNoRetorno = Sim
    implies b.status[e] = DEVOLVIDO_COM_ANOMALIA
}
// INV-M4-ANOMALIA-RETENCAO-001.
assert AnomaliaRetem {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.anomaliaMetrologica = Sim
    implies (f in b.emQuarentena and b.disponibilidade[f] = INDISPONIVEL)
}
// INV-M4-ANOMALIA-DESTINO-PRECEDENCIA-001: anomalia prevalece sobre o destino de
// validade (nenhum destino pode tirar a quarentena/INDISPONIVEL da anomalia).
assert AnomaliaPrecedeDestino {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.anomaliaMetrologica = Sim
    implies (f in b.emQuarentena and b.disponibilidade[f] = INDISPONIVEL and
             f not in b.usoVencidoAutorizado)
}
// INV-M4-ESGOTAMENTO-001 (vazio tem precedência sobre disponibilidade).
assert EsgotamentoVazio {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.ficouVazio = Sim
    implies (b.fisico[f] = VAZIO and b.disponibilidade[f] = INDISPONIVEL)
}
// INV-M4-VAZIO-DESTINO-PRECEDENCIA-001: vazio prevalece sobre o destino de
// validade (mesmo DISPONIVEL_AUTORIZADO não torna o vazio retirável).
assert VazioPrecedeDestino {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.ficouVazio = Sim
    implies (b.fisico[f] = VAZIO and b.disponibilidade[f] = INDISPONIVEL and
             not aptoParaRetirada[b, f])
}
// INV-M4-DESTINO-QUARENTENA-001.
assert DestinoQuarentena {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.anomaliaMetrologica = Nao and
    precisaDestino[a, f] and op.destino = QUARENTENA
    implies (f in b.emQuarentena and b.disponibilidade[f] = INDISPONIVEL)
}
// INV-M4-DESTINO-DISPONIVEL-001.
assert DestinoDisponivel {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.anomaliaMetrologica = Nao and
    precisaDestino[a, f] and op.destino = DISPONIVEL_AUTORIZADO
    implies (f in b.usoVencidoAutorizado and f not in b.emQuarentena)
}
// INV-M4-DESTINO-DESCARTE-001: pendente de descarte não pode ser retirado.
assert DestinoDescarte {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.anomaliaMetrologica = Nao and
    precisaDestino[a, f] and op.destino = PENDENTE_DE_DESCARTE
    implies (f not in b.usoVencidoAutorizado and f not in b.emQuarentena and
             b.disponibilidade[f] = INDISPONIVEL and not aptoParaRetirada[b, f])
}
// INV-M4-DEVOLUCAO-FRAME-001.
assert DevolucaoNaoInterfere {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao, g: Frasco |
    devolver[a, b, e, f, op] and g != f implies {
      b.fisico[g] = a.fisico[g]
      b.disponibilidade[g] = a.disponibilidade[g]
      (g in b.saldoDesconhecido iff g in a.saldoDesconhecido)
      (g in b.aberturaHistorica iff g in a.aberturaHistorica)
      (g in b.vencido iff g in a.vencido)
      (g in b.validadeDesconhecida iff g in a.validadeDesconhecida)
      (g in b.usoVencidoAutorizado iff g in a.usoVencidoAutorizado)
      (g in b.emQuarentena iff g in a.emQuarentena)
      (g in b.descarteTecnicoAutorizado iff g in a.descarteTecnicoAutorizado)
    }
}
assert DevolucaoNaoInterfereStatus {
  all a, b: Estado, e, e2: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and e2 != e implies {
      b.status[e2] = a.status[e2]
      (e2 in b.vencidoNaRetirada iff e2 in a.vencidoNaRetirada)
    }
}
// INV-M4-DEVOLUCAO-NAO-RECALCULA-001: a devolução não recalcula o vencimento
// pelo relógio; `vencido` permanece o estado persistido.
assert DevolucaoNaoRecalculaVencimento {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] implies b.vencido = a.vencido
}
// INV-M4-DEVOLUCAO-SNAPSHOT-001: a devolução não reescreve o snapshot histórico.
assert DevolucaoSnapshotImutavel {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] implies b.vencidoNaRetirada = a.vencidoNaRetirada
}
// Classificação determinística do retorno (Seção 5).
assert ClassificacaoVenceuDurante {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and f in a.vencido and e not in a.vencidoNaRetirada
    implies classificacao[a, e] = VENCEU_DURANTE
}
assert ClassificacaoJaVencido {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and f in a.vencido and e in a.vencidoNaRetirada
    implies classificacao[a, e] = JA_VENCIDO
}
assert ClassificacaoValidadeDesconhecida {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and f not in a.vencido and f in a.validadeDesconhecida
    implies classificacao[a, e] = VALIDADE_DESCONHECIDA
}
assert ClassificacaoNormal {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and f not in a.vencido and f not in a.validadeDesconhecida
    implies classificacao[a, e] = NORMAL
}
assert ClassificacaoVencidoPrecedeDesconhecida {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and f in a.vencido and f in a.validadeDesconhecida and
    e not in a.vencidoNaRetirada
    implies classificacao[a, e] = VENCEU_DURANTE
}
assert ClassificacaoJaVencidoPrecedeDesconhecida {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and f in a.vencido and f in a.validadeDesconhecida and
    e in a.vencidoNaRetirada
    implies classificacao[a, e] = JA_VENCIDO
}
// INV-M4-COERENCIA-001: retirada e devolução preservam a coerência integrada.
assert OperacoesPreservamCoerencia {
  all a, b: Estado |
    coerenteM4[a] and
    ((some f: Frasco, e: Emprestimo, op: Retirada | retirar[a, b, f, e, op]) or
     (some e: Emprestimo, f: Frasco, op: Devolucao | devolver[a, b, e, f, op]))
    implies coerenteM4[b]
}

// Testemunhas de não-vacuidade (retirada e devolução realmente ocorrem).
pred RetiradaAberto {
  some disj a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada |
    retirar[a, b, f, e, op] and a.fisico[f] = ABERTO and a.disponibilidade[f] = DISPONIVEL
}
pred RetiradaFechado {
  some disj a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada |
    retirar[a, b, f, e, op] and a.fisico[f] = FECHADO and
    op.abrirNoEmpremio = Nao and b.fisico[f] = FECHADO
}
pred RetiradaAbertura {
  some disj a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada |
    retirar[a, b, f, e, op] and a.fisico[f] = FECHADO and
    op.abrirNoEmpremio = Sim and b.fisico[f] = ABERTO
}
pred RetiradaExcepcional {
  some disj a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada |
    retirar[a, b, f, e, op] and f in a.vencido and f in a.usoVencidoAutorizado
}
// A primeira abertura torna o frasco vencido; com autorização, o snapshot grava
// vencido_na_retirada = true.
pred RetiradaVencidaNaAbertura {
  some disj a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada |
    retirar[a, b, f, e, op] and a.fisico[f] = FECHADO and op.abrirNoEmpremio = Sim and
    f not in a.vencido and f in b.vencido and f in a.usoVencidoAutorizado and
    e in b.vencidoNaRetirada
}
pred DevolucaoNormalHabitavel {
  some disj a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.anomaliaMetrologica = Nao and
    op.atrasadoNoRetorno = Nao and op.ficouVazio = Nao and
    f not in a.vencido and f not in a.validadeDesconhecida and
    b.status[e] = DEVOLVIDO and b.disponibilidade[f] = DISPONIVEL
}
pred DevolucaoAtrasadaHabitavel {
  some disj a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.anomaliaMetrologica = Nao and
    op.atrasadoNoRetorno = Sim and b.status[e] = DEVOLVIDO_COM_ATRASO
}
pred DevolucaoAnomalaHabitavel {
  some disj a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.anomaliaMetrologica = Sim and
    b.status[e] = DEVOLVIDO_COM_ANOMALIA and f in b.emQuarentena
}
pred DevolucaoVazioHabitavel {
  some disj a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.ficouVazio = Sim and
    b.fisico[f] = VAZIO and b.disponibilidade[f] = INDISPONIVEL
}
pred DevolucaoAnomaliaAtraso {
  some disj a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.anomaliaMetrologica = Sim and
    op.atrasadoNoRetorno = Sim and b.status[e] = DEVOLVIDO_COM_ANOMALIA
}
pred DevolucaoAnomaliaVazio {
  some disj a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.anomaliaMetrologica = Sim and
    op.ficouVazio = Sim and b.fisico[f] = VAZIO and f in b.emQuarentena
}
pred DevolucaoVencidoQuarentena {
  some disj a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.anomaliaMetrologica = Nao and
    f in a.vencido and op.destino = QUARENTENA and
    f in b.emQuarentena and b.disponibilidade[f] = INDISPONIVEL
}
pred DevolucaoVencidoDisponivel {
  some disj a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.anomaliaMetrologica = Nao and
    f in a.vencido and op.destino = DISPONIVEL_AUTORIZADO and
    f in b.usoVencidoAutorizado and b.disponibilidade[f] = DISPONIVEL
}
pred DevolucaoVencidoDescarte {
  some disj a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and op.anomaliaMetrologica = Nao and
    f in a.vencido and op.destino = PENDENTE_DE_DESCARTE and
    b.disponibilidade[f] = INDISPONIVEL and not aptoParaRetirada[b, f]
}
// Casos de classificação A/B/C.
pred VenceuDuranteEmprestimo {
  some disj a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and f in a.vencido and e not in a.vencidoNaRetirada and
    classificacao[a, e] = VENCEU_DURANTE
}
pred JaEstavaVencidoNoRetorno {
  some disj a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and f in a.vencido and e in a.vencidoNaRetirada and
    classificacao[a, e] = JA_VENCIDO
}
pred ValidadeDesconhecidaNoRetorno {
  some disj a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] and f not in a.vencido and f in a.validadeDesconhecida and
    classificacao[a, e] = VALIDADE_DESCONHECIDA and
    (op.destino = QUARENTENA or op.destino = DISPONIVEL_AUTORIZADO or op.destino = PENDENTE_DE_DESCARTE)
}
// Dois frascos com empréstimos ativos simultâneos: unicidade é por frasco.
pred DoisFrascosAtivos {
  some s: Estado, disj e1, e2: Emprestimo, disj f1, f2: Frasco |
    coerenteM4[s] and e1.frasco = f1 and e2.frasco = f2 and
    s.status[e1] = EM_USO and s.status[e2] = ATRASADO
}
// Ciclo completo: retirada seguida de devolução normal.
pred CicloCompleto {
  some disj a, b, c: Estado, f: Frasco, e: Emprestimo, op1: Retirada, op2: Devolucao |
    retirar[a, b, f, e, op1] and devolver[b, c, e, f, op2] and
    op2.anomaliaMetrologica = Nao and op2.atrasadoNoRetorno = Nao and
    op2.ficouVazio = Nao and f not in b.vencido and f not in b.validadeDesconhecida and
    c.status[e] = DEVOLVIDO and no ativosDoFrasco[c, f] and c.disponibilidade[f] = DISPONIVEL
}

// Scope canônico: 2 estados, 2 frascos, 2 empréstimos; reexecução ampliada.
check RetiradaApta for 4 but exactly 2 Estado
check RetiradaCriaAtivo for 4 but exactly 2 Estado
check RetiradaEmprestado for 4 but exactly 2 Estado
check QuarentenaBloqueiaRetirada for 4 but exactly 2 Estado
check DescarteBloqueiaRetirada for 4 but exactly 2 Estado
check VencidoSemAutorizacaoBloqueia for 4 but exactly 2 Estado
check RetiradaVencimentoApto for 4 but exactly 2 Estado
check RetiradaSnapshotVencido for 4 but exactly 2 Estado
check AberturaNaRetirada for 4 but exactly 2 Estado
check RetiradaNaoInterfere for 4 but exactly 2 Estado
check RetiradaNaoInterfereStatus for 4 but exactly 2 Estado
check DevolucaoExigeAtivo for 4 but exactly 2 Estado
check DevolucaoEncerraCustodia for 4 but exactly 2 Estado
check DevolucaoNormal for 4 but exactly 2 Estado
check DevolucaoAtraso for 4 but exactly 2 Estado
check DevolucaoAnomalia for 4 but exactly 2 Estado
check AnomaliaPrecedeAtraso for 4 but exactly 2 Estado
check AnomaliaRetem for 4 but exactly 2 Estado
check AnomaliaPrecedeDestino for 4 but exactly 2 Estado
check EsgotamentoVazio for 4 but exactly 2 Estado
check VazioPrecedeDestino for 4 but exactly 2 Estado
check DestinoQuarentena for 4 but exactly 2 Estado
check DestinoDisponivel for 4 but exactly 2 Estado
check DestinoDescarte for 4 but exactly 2 Estado
check DevolucaoNaoInterfere for 4 but exactly 2 Estado
check DevolucaoNaoInterfereStatus for 4 but exactly 2 Estado
check DevolucaoNaoRecalculaVencimento for 4 but exactly 2 Estado
check DevolucaoSnapshotImutavel for 4 but exactly 2 Estado
check ClassificacaoVenceuDurante for 4 but exactly 2 Estado
check ClassificacaoJaVencido for 4 but exactly 2 Estado
check ClassificacaoValidadeDesconhecida for 4 but exactly 2 Estado
check ClassificacaoNormal for 4 but exactly 2 Estado
check ClassificacaoVencidoPrecedeDesconhecida for 4 but exactly 2 Estado
check ClassificacaoJaVencidoPrecedeDesconhecida for 4 but exactly 2 Estado
check OperacoesPreservamCoerencia for 4 but exactly 2 Estado
run RetiradaAberto for 4 but exactly 2 Estado
run RetiradaFechado for 4 but exactly 2 Estado
run RetiradaAbertura for 4 but exactly 2 Estado
run RetiradaExcepcional for 4 but exactly 2 Estado
run RetiradaVencidaNaAbertura for 4 but exactly 2 Estado
run DevolucaoNormalHabitavel for 4 but exactly 2 Estado
run DevolucaoAtrasadaHabitavel for 4 but exactly 2 Estado
run DevolucaoAnomalaHabitavel for 4 but exactly 2 Estado
run DevolucaoVazioHabitavel for 4 but exactly 2 Estado
run DevolucaoAnomaliaAtraso for 4 but exactly 2 Estado
run DevolucaoAnomaliaVazio for 4 but exactly 2 Estado
run DevolucaoVencidoQuarentena for 4 but exactly 2 Estado
run DevolucaoVencidoDisponivel for 4 but exactly 2 Estado
run DevolucaoVencidoDescarte for 4 but exactly 2 Estado
run VenceuDuranteEmprestimo for 4 but exactly 2 Estado
run JaEstavaVencidoNoRetorno for 4 but exactly 2 Estado
run ValidadeDesconhecidaNoRetorno for 4 but exactly 2 Estado
run DoisFrascosAtivos for 4 but exactly 2 Estado
run CicloCompleto for 5 but exactly 3 Estado

// Reexecução ampliada (scope 6) das propriedades centrais.
assert RetiradaCriaAtivoAmpliado {
  all a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada |
    retirar[a, b, f, e, op] implies ativosDoFrasco[b, f] = e
}
assert QuarentenaBloqueiaRetiradaAmpliado {
  all a, b: Estado, f: Frasco, e: Emprestimo, op: Retirada |
    f in a.emQuarentena implies not retirar[a, b, f, e, op]
}
assert DevolucaoNaoInterfereAmpliado {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao, g: Frasco |
    devolver[a, b, e, f, op] and g != f implies {
      b.fisico[g] = a.fisico[g]
      b.disponibilidade[g] = a.disponibilidade[g]
      (g in b.saldoDesconhecido iff g in a.saldoDesconhecido)
      (g in b.vencido iff g in a.vencido)
      (g in b.validadeDesconhecida iff g in a.validadeDesconhecida)
      (g in b.emQuarentena iff g in a.emQuarentena)
    }
}
assert DevolucaoSnapshotImutavelAmpliado {
  all a, b: Estado, e: Emprestimo, f: Frasco, op: Devolucao |
    devolver[a, b, e, f, op] implies b.vencidoNaRetirada = a.vencidoNaRetirada
}
assert OperacoesPreservamCoerenciaAmpliado {
  all a, b: Estado |
    coerenteM4[a] and
    ((some f: Frasco, e: Emprestimo, op: Retirada | retirar[a, b, f, e, op]) or
     (some e: Emprestimo, f: Frasco, op: Devolucao | devolver[a, b, e, f, op]))
    implies coerenteM4[b]
}
check RetiradaCriaAtivoAmpliado for 6 but exactly 2 Estado
check QuarentenaBloqueiaRetiradaAmpliado for 6 but exactly 2 Estado
check DevolucaoNaoInterfereAmpliado for 6 but exactly 2 Estado
check DevolucaoSnapshotImutavelAmpliado for 6 but exactly 2 Estado
check OperacoesPreservamCoerenciaAmpliado for 6 but exactly 2 Estado
pred CicloCompletoAmpliado { CicloCompleto[] }
run CicloCompletoAmpliado for 6 but exactly 3 Estado
