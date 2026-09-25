// Contrato exato M4 e guard de drift das origens reproduzidas.
// O modelo M4 compõe Frasco (M2.4) e Emprestimo (M3) no mesmo universo.
export const withdrawalReturnModel = 'specification/alloy/reagents/withdrawal_return.als';
export const withdrawalReturnOrigins = [
  'specification/alloy/reagents/bottle_composition.als',
  'specification/alloy/reagents/loan_state.als',
];
export const withdrawalReturnExpected = [
  {id:'INV-M4-RETIRADA-APTA-001',name:'RetiradaApta',type:'check',scope:'check RetiradaApta for 4 but exactly 2 Estado'},
  {id:'INV-M4-RETIRADA-ATIVO-001',name:'RetiradaCriaAtivo',type:'check',scope:'check RetiradaCriaAtivo for 4 but exactly 2 Estado'},
  {id:'INV-M4-RETIRADA-DISPONIBILIDADE-001',name:'RetiradaEmprestado',type:'check',scope:'check RetiradaEmprestado for 4 but exactly 2 Estado'},
  {id:'INV-M4-RETIRADA-QUARENTENA-001',name:'QuarentenaBloqueiaRetirada',type:'check',scope:'check QuarentenaBloqueiaRetirada for 4 but exactly 2 Estado'},
  {id:'INV-M4-RETIRADA-DESCARTE-001',name:'DescarteBloqueiaRetirada',type:'check',scope:'check DescarteBloqueiaRetirada for 4 but exactly 2 Estado'},
  {id:'INV-M4-RETIRADA-VENCIDO-001',name:'VencidoSemAutorizacaoBloqueia',type:'check',scope:'check VencidoSemAutorizacaoBloqueia for 4 but exactly 2 Estado'},
  {id:'INV-M4-RETIRADA-VENCIMENTO-001',name:'RetiradaVencimentoApto',type:'check',scope:'check RetiradaVencimentoApto for 4 but exactly 2 Estado'},
  {id:'INV-M4-RETIRADA-SNAPSHOT-001',name:'RetiradaSnapshotVencido',type:'check',scope:'check RetiradaSnapshotVencido for 4 but exactly 2 Estado'},
  {id:'INV-M4-RETIRADA-ABERTURA-001',name:'AberturaNaRetirada',type:'check',scope:'check AberturaNaRetirada for 4 but exactly 2 Estado'},
  {id:'INV-M4-RETIRADA-FRAME-001',name:'RetiradaNaoInterfere',type:'check',scope:'check RetiradaNaoInterfere for 4 but exactly 2 Estado'},
  {id:'FRAME-M4-RETIRADA-STATUS-001',name:'RetiradaNaoInterfereStatus',type:'check',scope:'check RetiradaNaoInterfereStatus for 4 but exactly 2 Estado'},
  {id:'INV-M4-DEVOLUCAO-ATIVO-001',name:'DevolucaoExigeAtivo',type:'check',scope:'check DevolucaoExigeAtivo for 4 but exactly 2 Estado'},
  {id:'INV-M4-DEVOLUCAO-CUSTODIA-001',name:'DevolucaoEncerraCustodia',type:'check',scope:'check DevolucaoEncerraCustodia for 4 but exactly 2 Estado'},
  {id:'INV-M4-DEVOLUCAO-NORMAL-001',name:'DevolucaoNormal',type:'check',scope:'check DevolucaoNormal for 4 but exactly 2 Estado'},
  {id:'INV-M4-DEVOLUCAO-ATRASO-001',name:'DevolucaoAtraso',type:'check',scope:'check DevolucaoAtraso for 4 but exactly 2 Estado'},
  {id:'INV-M4-DEVOLUCAO-ANOMALIA-001',name:'DevolucaoAnomalia',type:'check',scope:'check DevolucaoAnomalia for 4 but exactly 2 Estado'},
  {id:'INV-M4-ANOMALIA-PRECEDENCIA-001',name:'AnomaliaPrecedeAtraso',type:'check',scope:'check AnomaliaPrecedeAtraso for 4 but exactly 2 Estado'},
  {id:'INV-M4-ANOMALIA-RETENCAO-001',name:'AnomaliaRetem',type:'check',scope:'check AnomaliaRetem for 4 but exactly 2 Estado'},
  {id:'INV-M4-ANOMALIA-DESTINO-001',name:'AnomaliaPrecedeDestino',type:'check',scope:'check AnomaliaPrecedeDestino for 4 but exactly 2 Estado'},
  {id:'INV-M4-ESGOTAMENTO-001',name:'EsgotamentoVazio',type:'check',scope:'check EsgotamentoVazio for 4 but exactly 2 Estado'},
  {id:'INV-M4-VAZIO-DESTINO-001',name:'VazioPrecedeDestino',type:'check',scope:'check VazioPrecedeDestino for 4 but exactly 2 Estado'},
  {id:'INV-M4-DESTINO-QUARENTENA-001',name:'DestinoQuarentena',type:'check',scope:'check DestinoQuarentena for 4 but exactly 2 Estado'},
  {id:'INV-M4-DESTINO-DISPONIVEL-001',name:'DestinoDisponivel',type:'check',scope:'check DestinoDisponivel for 4 but exactly 2 Estado'},
  {id:'INV-M4-DESTINO-DESCARTE-001',name:'DestinoDescarte',type:'check',scope:'check DestinoDescarte for 4 but exactly 2 Estado'},
  {id:'INV-M4-DEVOLUCAO-FRAME-001',name:'DevolucaoNaoInterfere',type:'check',scope:'check DevolucaoNaoInterfere for 4 but exactly 2 Estado'},
  {id:'FRAME-M4-DEVOLUCAO-STATUS-001',name:'DevolucaoNaoInterfereStatus',type:'check',scope:'check DevolucaoNaoInterfereStatus for 4 but exactly 2 Estado'},
  {id:'INV-M4-DEVOLUCAO-NAO-RECALCULA-001',name:'DevolucaoNaoRecalculaVencimento',type:'check',scope:'check DevolucaoNaoRecalculaVencimento for 4 but exactly 2 Estado'},
  {id:'INV-M4-DEVOLUCAO-SNAPSHOT-001',name:'DevolucaoSnapshotImutavel',type:'check',scope:'check DevolucaoSnapshotImutavel for 4 but exactly 2 Estado'},
  {id:'INV-M4-CLASSIFICACAO-VENCEU-001',name:'ClassificacaoVenceuDurante',type:'check',scope:'check ClassificacaoVenceuDurante for 4 but exactly 2 Estado'},
  {id:'INV-M4-CLASSIFICACAO-JA-VENCIDO-001',name:'ClassificacaoJaVencido',type:'check',scope:'check ClassificacaoJaVencido for 4 but exactly 2 Estado'},
  {id:'INV-M4-CLASSIFICACAO-DESCONHECIDA-001',name:'ClassificacaoValidadeDesconhecida',type:'check',scope:'check ClassificacaoValidadeDesconhecida for 4 but exactly 2 Estado'},
  {id:'INV-M4-CLASSIFICACAO-NORMAL-001',name:'ClassificacaoNormal',type:'check',scope:'check ClassificacaoNormal for 4 but exactly 2 Estado'},
  {id:'INV-M4-CLASSIFICACAO-PRECEDENCIA-VENCIDO-001',name:'ClassificacaoVencidoPrecedeDesconhecida',type:'check',scope:'check ClassificacaoVencidoPrecedeDesconhecida for 4 but exactly 2 Estado'},
  {id:'INV-M4-CLASSIFICACAO-PRECEDENCIA-JAVENCIDO-001',name:'ClassificacaoJaVencidoPrecedeDesconhecida',type:'check',scope:'check ClassificacaoJaVencidoPrecedeDesconhecida for 4 but exactly 2 Estado'},
  {id:'INV-M4-COERENCIA-001',name:'OperacoesPreservamCoerencia',type:'check',scope:'check OperacoesPreservamCoerencia for 4 but exactly 2 Estado'},
  {id:'WIT-M4-RETIRADA-ABERTO-001',name:'RetiradaAberto',type:'run',scope:'run RetiradaAberto for 4 but exactly 2 Estado'},
  {id:'WIT-M4-RETIRADA-FECHADO-001',name:'RetiradaFechado',type:'run',scope:'run RetiradaFechado for 4 but exactly 2 Estado'},
  {id:'WIT-M4-RETIRADA-ABERTURA-001',name:'RetiradaAbertura',type:'run',scope:'run RetiradaAbertura for 4 but exactly 2 Estado'},
  {id:'WIT-M4-RETIRADA-EXCEPCIONAL-001',name:'RetiradaExcepcional',type:'run',scope:'run RetiradaExcepcional for 4 but exactly 2 Estado'},
  {id:'WIT-M4-RETIRADA-VENCIDA-ABERTURA-001',name:'RetiradaVencidaNaAbertura',type:'run',scope:'run RetiradaVencidaNaAbertura for 4 but exactly 2 Estado'},
  {id:'WIT-M4-DEVOLUCAO-NORMAL-001',name:'DevolucaoNormalHabitavel',type:'run',scope:'run DevolucaoNormalHabitavel for 4 but exactly 2 Estado'},
  {id:'WIT-M4-DEVOLUCAO-ATRASADA-001',name:'DevolucaoAtrasadaHabitavel',type:'run',scope:'run DevolucaoAtrasadaHabitavel for 4 but exactly 2 Estado'},
  {id:'WIT-M4-DEVOLUCAO-ANOMALA-001',name:'DevolucaoAnomalaHabitavel',type:'run',scope:'run DevolucaoAnomalaHabitavel for 4 but exactly 2 Estado'},
  {id:'WIT-M4-DEVOLUCAO-VAZIO-001',name:'DevolucaoVazioHabitavel',type:'run',scope:'run DevolucaoVazioHabitavel for 4 but exactly 2 Estado'},
  {id:'WIT-M4-DEVOLUCAO-ANOMALIA-ATRASO-001',name:'DevolucaoAnomaliaAtraso',type:'run',scope:'run DevolucaoAnomaliaAtraso for 4 but exactly 2 Estado'},
  {id:'WIT-M4-DEVOLUCAO-ANOMALIA-VAZIO-001',name:'DevolucaoAnomaliaVazio',type:'run',scope:'run DevolucaoAnomaliaVazio for 4 but exactly 2 Estado'},
  {id:'WIT-M4-DEVOLUCAO-VENCIDO-QUARENTENA-001',name:'DevolucaoVencidoQuarentena',type:'run',scope:'run DevolucaoVencidoQuarentena for 4 but exactly 2 Estado'},
  {id:'WIT-M4-DEVOLUCAO-VENCIDO-DISPONIVEL-001',name:'DevolucaoVencidoDisponivel',type:'run',scope:'run DevolucaoVencidoDisponivel for 4 but exactly 2 Estado'},
  {id:'WIT-M4-DEVOLUCAO-VENCIDO-DESCARTE-001',name:'DevolucaoVencidoDescarte',type:'run',scope:'run DevolucaoVencidoDescarte for 4 but exactly 2 Estado'},
  {id:'WIT-M4-VENCEU-DURANTE-001',name:'VenceuDuranteEmprestimo',type:'run',scope:'run VenceuDuranteEmprestimo for 4 but exactly 2 Estado'},
  {id:'WIT-M4-JA-VENCIDO-001',name:'JaEstavaVencidoNoRetorno',type:'run',scope:'run JaEstavaVencidoNoRetorno for 4 but exactly 2 Estado'},
  {id:'WIT-M4-VALIDADE-DESCONHECIDA-001',name:'ValidadeDesconhecidaNoRetorno',type:'run',scope:'run ValidadeDesconhecidaNoRetorno for 4 but exactly 2 Estado'},
  {id:'WIT-M4-DOIS-FRASCOS-001',name:'DoisFrascosAtivos',type:'run',scope:'run DoisFrascosAtivos for 4 but exactly 2 Estado'},
  {id:'WIT-M4-CICLO-001',name:'CicloCompleto',type:'run',overall:5,scope:'run CicloCompleto for 5 but exactly 3 Estado'},
  {id:'INV-M4-RETIRADA-ATIVO-006',name:'RetiradaCriaAtivoAmpliado',type:'check',overall:6,scope:'check RetiradaCriaAtivoAmpliado for 6 but exactly 2 Estado'},
  {id:'INV-M4-RETIRADA-QUARENTENA-006',name:'QuarentenaBloqueiaRetiradaAmpliado',type:'check',overall:6,scope:'check QuarentenaBloqueiaRetiradaAmpliado for 6 but exactly 2 Estado'},
  {id:'INV-M4-DEVOLUCAO-FRAME-006',name:'DevolucaoNaoInterfereAmpliado',type:'check',overall:6,scope:'check DevolucaoNaoInterfereAmpliado for 6 but exactly 2 Estado'},
  {id:'INV-M4-DEVOLUCAO-SNAPSHOT-006',name:'DevolucaoSnapshotImutavelAmpliado',type:'check',overall:6,scope:'check DevolucaoSnapshotImutavelAmpliado for 6 but exactly 2 Estado'},
  {id:'INV-M4-COERENCIA-006',name:'OperacoesPreservamCoerenciaAmpliado',type:'check',overall:6,scope:'check OperacoesPreservamCoerenciaAmpliado for 6 but exactly 2 Estado'},
  {id:'WIT-M4-CICLO-006',name:'CicloCompletoAmpliado',type:'run',overall:6,scope:'run CicloCompletoAmpliado for 6 but exactly 3 Estado'},
];

function block(source, kind, name) {
  source = source.replace(/\/\/[^\n]*/g, '');
  const match = new RegExp(`\\b${kind}\\s+${name}\\b`).exec(source);
  if (!match) throw new Error(`Bloco ausente: ${kind} ${name}`);
  let i = source.indexOf('{', match.index), depth = 1;
  for (i++; depth && i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') depth--;
  }
  if (depth) throw new Error(`Bloco incompleto: ${name}`);
  return source.slice(match.index, i);
}
const rename = (s, names) => s.replace(/\b\w+\b/g, w => names[w] ?? w);
const tokens = s => s.replace(/\/\/[^\n]*/g, '').match(/[A-Za-z_][A-Za-z_0-9]*|->|!=|\+\+|[^\s]/g)?.join(' ');
const line = (source, needle) => {
  const l = source.replace(/\/\/[^\n]*/g, '').split('\n').find(x => x.includes(needle));
  if (!l) throw new Error(`Linha ausente: ${needle}`);
  return l;
};
const activeStatuses = source => ['EM_USO', 'ATRASADO'].every(x => source.includes(x));
const closedStatuses = source => ['DEVOLVIDO', 'DEVOLVIDO_COM_ATRASO', 'DEVOLVIDO_COM_ANOMALIA', 'ENCERRADO_EXTRAORDINARIO'];
const physicalClause = source => {
  const t = source.replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' ');
  const i = t.indexOf('s.fisico[f] in VAZIO + QUEBRADO + DESCARTADO or s.localizacao[f] = EXTRAVIADO');
  const j = t.indexOf('INDISPONIVEL', i);
  if (i < 0 || j < 0) throw new Error('Drift M4: cláusula física de M0 ausente');
  return t.slice(i, j + 'INDISPONIVEL'.length);
};

// Regressões de segunda autoridade e do snapshot histórico (Seção 19).
export function checkWithdrawalReturnContract(source) {
  const t = source.replace(/\/\/[^\n]*/g, '');
  if (/\bvencidoNoRetorno\b/.test(t))
    throw new Error('Drift M4: segunda autoridade vencidoNoRetorno reintroduzida');
  if (!/vencidoNaRetirada\s*:\s*set\s+Emprestimo/.test(t))
    throw new Error('Drift M4: snapshot vencidoNaRetirada ausente do estado');
  if (!/b\.vencido\s*=\s*a\.vencido/.test(t))
    throw new Error('Drift M4: autoridade vencido não preservada explicitamente');
  if (!/b\.vencidoNaRetirada\s*=\s*a\.vencidoNaRetirada/.test(t))
    throw new Error('Drift M4: snapshot histórico não é preservado');
  if (!/fun\s+classificacao/.test(t))
    throw new Error('Drift M4: classificação determinística ausente');
  if (!/pred\s+precisaDestino\s*\[/.test(t))
    throw new Error('Drift M4: destino condicionado à validade ausente');
}

// Compara o que M4 reproduz de M2.4 (Frasco) e M3 (Emprestimo). Renomes
// explícitos: EstadoIntegrado -> Estado; coerente -> coerenteM3.
export function checkWithdrawalReturnTrace(read) {
  const composition = read(withdrawalReturnOrigins[0]).toString();
  const loan = read(withdrawalReturnOrigins[1]).toString();
  const m4 = read(withdrawalReturnModel).toString();
  checkWithdrawalReturnContract(m4);
  const est = {EstadoIntegrado: 'Estado'};
  if (tokens(rename(block(composition, 'pred', 'coerenteM2'), est)) !== tokens(block(m4, 'pred', 'coerenteM2')))
    throw new Error('Drift M4: coerenteM2 de M2.4');
  if (physicalClause(composition) !== physicalClause(m4))
    throw new Error('Drift M4: cláusula física de M0');
  const m3 = {coerente: 'coerenteM3'};
  if (tokens(rename(block(loan, 'pred', 'coerente'), m3)) !== tokens(block(m4, 'pred', 'coerenteM3')))
    throw new Error('Drift M4: unicidade ativa de M3');
  for (const name of ['EstadoFisico', 'Disponibilidade', 'Status']) {
    const a = name === 'Status' ? tokens(line(loan, 'extends Status')) : tokens(line(composition, `extends ${name}`));
    const b = tokens(line(m4, `extends ${name}`));
    if (a !== b) throw new Error(`Drift M4: enum ${name}`);
  }
  for (const src of [block(m4, 'fun', 'ativosDoFrasco'), block(loan, 'fun', 'ativosDoFrasco'), block(loan, 'fun', 'ativos')]) {
    if (!activeStatuses(src)) throw new Error('Drift M4: conjunto de status ativos divergente');
    if (closedStatuses(src).some(x => src.includes(x))) throw new Error('Drift M4: status encerrado tratado como ativo');
  }
  if (!m4.includes('classificacao[') || !m4.includes('precisaDestino['))
    throw new Error('Drift M4: classificação/destino não usados nas operações');
}
