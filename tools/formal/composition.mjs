// Contrato exato M2.4, independente das saídas do solver.
export const composedModel = 'specification/alloy/reagents/bottle_composition.als';
export const composedExpected = [
  {
    "id": "COMP-M2-RETIRADA-COERENCIA-001",
    "name": "RetiradaCoerente",
    "type": "check",
    "scope": "check RetiradaCoerente for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-RETIRADA-QUARENTENA-001",
    "name": "QuarentenaBloqueia",
    "type": "check",
    "scope": "check QuarentenaBloqueia for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-RETIRADA-DESCARTE-001",
    "name": "DescarteTecnicoBloqueia",
    "type": "check",
    "scope": "check DescarteTecnicoBloqueia for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-RETIRADA-TERMINAL-001",
    "name": "TerminaisBloqueiam",
    "type": "check",
    "scope": "check TerminaisBloqueiam for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-QUEBRA-ATIVO-001",
    "name": "QuebraSemAtivo",
    "type": "check",
    "scope": "check QuebraSemAtivo for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-DESCARTE-ATIVO-001",
    "name": "DescarteSemAtivo",
    "type": "check",
    "scope": "check DescarteSemAtivo for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-QUARENTENA-ATIVO-001",
    "name": "ResolucaoSemAtivo",
    "type": "check",
    "scope": "check ResolucaoSemAtivo for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-EXTRAVIO-COERENCIA-001",
    "name": "ExtravioCoerente",
    "type": "check",
    "scope": "check ExtravioCoerente for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-EXTRAVIO-FISICO-001",
    "name": "ExtravioPreservaFisico",
    "type": "check",
    "scope": "check ExtravioPreservaFisico for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-EXTRAVIO-AUTORIZACAO-001",
    "name": "ExtravioRevogaAutorizacao",
    "type": "check",
    "scope": "check ExtravioRevogaAutorizacao for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-REENCONTRO-COERENCIA-001",
    "name": "ReencontroCoerente",
    "type": "check",
    "scope": "check ReencontroCoerente for 6 but exactly 4 EstadoIntegrado",
    "overall": 6
  },
  {
    "id": "COMP-M2-REENCONTRO-QUEBRADO-IND-001",
    "name": "QuebradoReencontradoNaoDisponivel",
    "type": "check",
    "scope": "check QuebradoReencontradoNaoDisponivel for 6 but exactly 4 EstadoIntegrado",
    "overall": 6
  },
  {
    "id": "COMP-M2-ESGOTAMENTO-COERENCIA-001",
    "name": "EsgotamentoCoerente",
    "type": "check",
    "scope": "check EsgotamentoCoerente for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-TRANSICOES-COERENCIA-001",
    "name": "TodasCoerentes",
    "type": "check",
    "scope": "check TodasCoerentes for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-ENCERRAMENTO-ALVO-001",
    "name": "EncerraSomenteAlvo",
    "type": "check",
    "scope": "check EncerraSomenteAlvo for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-FRAME-OUTROS-001",
    "name": "NaoInterfereOutros",
    "type": "check",
    "scope": "check NaoInterfereOutros for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-COERENCIA-001",
    "name": "EstadoHabitavel",
    "type": "run",
    "scope": "run EstadoHabitavel for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-RETIRADA-001",
    "name": "RetiradaHabitavel",
    "type": "run",
    "scope": "run RetiradaHabitavel for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-IDENTIDADE-ESTADO-001",
    "name": "IdentidadeEstado",
    "type": "run",
    "scope": "run IdentidadeEstado for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-EXTRAVIO-COM-ATIVO-001",
    "name": "ExtravioComAtivo",
    "type": "run",
    "scope": "run ExtravioComAtivo for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-EXTRAVIO-SEM-ATIVO-001",
    "name": "ExtravioSemAtivo",
    "type": "run",
    "scope": "run ExtravioSemAtivo for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-ESGOTAMENTO-COM-ATIVO-001",
    "name": "EsgotamentoComAtivo",
    "type": "run",
    "scope": "run EsgotamentoComAtivo for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-ESGOTAMENTO-SEM-ATIVO-001",
    "name": "EsgotamentoSemAtivo",
    "type": "run",
    "scope": "run EsgotamentoSemAtivo for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-QUEBRA-001",
    "name": "QuebraHabitavel",
    "type": "run",
    "scope": "run QuebraHabitavel for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-DESCARTE-001",
    "name": "DescarteHabitavel",
    "type": "run",
    "scope": "run DescarteHabitavel for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-QUARENTENA-001",
    "name": "ResolucaoHabitavel",
    "type": "run",
    "scope": "run ResolucaoHabitavel for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-EXTRAVIO-QUEBRADO-001",
    "name": "ExtravioQuebradoHabitavel",
    "type": "run",
    "scope": "run ExtravioQuebradoHabitavel for 4 but exactly 2 EstadoIntegrado"
  },
  {
    "id": "COMP-M2-REENCONTRO-QUEBRADO-001",
    "name": "ReencontroQuebradoHabitavel",
    "type": "run",
    "scope": "run ReencontroQuebradoHabitavel for 6 but exactly 4 EstadoIntegrado",
    "overall": 6
  },
  {
    "id": "COMP-M2-RETIRADA-COERENCIA-006",
    "name": "RetiradaCoerenteAmpliado",
    "type": "check",
    "scope": "check RetiradaCoerenteAmpliado for 6 but exactly 2 EstadoIntegrado",
    "overall": 6
  },
  {
    "id": "COMP-M2-RETIRADA-QUARENTENA-006",
    "name": "QuarentenaBloqueiaAmpliado",
    "type": "check",
    "scope": "check QuarentenaBloqueiaAmpliado for 6 but exactly 2 EstadoIntegrado",
    "overall": 6
  },
  {
    "id": "COMP-M2-EXTRAVIO-COERENCIA-006",
    "name": "ExtravioCoerenteAmpliado",
    "type": "check",
    "scope": "check ExtravioCoerenteAmpliado for 6 but exactly 2 EstadoIntegrado",
    "overall": 6
  },
  {
    "id": "COMP-M2-ESGOTAMENTO-COERENCIA-006",
    "name": "EsgotamentoCoerenteAmpliado",
    "type": "check",
    "scope": "check EsgotamentoCoerenteAmpliado for 6 but exactly 2 EstadoIntegrado",
    "overall": 6
  },
  {
    "id": "COMP-M2-FRAME-OUTROS-006",
    "name": "NaoInterfereOutrosAmpliado",
    "type": "check",
    "scope": "check NaoInterfereOutrosAmpliado for 6 but exactly 2 EstadoIntegrado",
    "overall": 6
  },
  {
    "id": "COMP-M2-IDENTIDADE-ESTADO-006",
    "name": "IdentidadeEstadoAmpliado",
    "type": "run",
    "scope": "run IdentidadeEstadoAmpliado for 6 but exactly 2 EstadoIntegrado",
    "overall": 6
  }
];

// Comparação lexical conservadora: mesmos tokens após renomes explícitos.
// Não deriva expectativas do receipt e não reescreve modelos standalone.
export const origins = [
  'specification/alloy/reagents/withdrawal.als',
  'specification/alloy/reagents/bottle_identity.als',
  'specification/alloy/reagents/bottle_state.als',
];
const m0Names = {Estado:'EstadoIntegrado', quarentena:'emQuarentena', coerente:'coerenteM0', retirar:'retirarM0'};
const m2Names = {Estado:'EstadoIntegrado', coerente:'coerenteM2', extraviar:'extraviarM2', quebrar:'quebrarM2', descartar:'descartarM2', confirmarEsgotamento:'confirmarEsgotamentoM2', resolverQuarentenaParaDescarte:'resolverQuarentenaParaDescarteM2'};
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
const rename = (s,names) => s.replace(/\b\w+\b/g, word => names[word] ?? word);
const tokens = s => s.replace(/\/\/[^\n]*/g, '').match(/[A-Za-z_][A-Za-z_0-9]*|->|!=|\+\+|[^\s]/g)?.join(' ');
export function checkCompositionTrace(read) {
  const composition = read(composedModel).toString();
  const sources = origins.map(p => read(p).toString());
  const compare = (index, kind, names, mapping={}) => {
    for (const name of names) {
      const expected = rename(block(sources[index],kind,name),mapping);
      const actual = block(composition,kind,mapping[name]??name);
      if (tokens(expected)!==tokens(actual)) throw new Error(`Drift de composição: ${origins[index]} ${name}`);
    }
  };
  compare(0,'pred',['coerente','filtroFisico','retirar'],m0Names);
  compare(2,'pred',['coerente','naoDescartado','aptoParaDescarte','preservaValidade','preservaValidadeExceto','preservaQuarentenaEAutorizacao','extraviar','quebrar','descartar','confirmarEsgotamento','resolverQuarentenaParaDescarte'],m2Names);
  compare(1,'pred',['viaLote','viaDireta','estruturaCoerente']);
  compare(1,'fun',['especEfetiva']);
  compare(1,'sig',['Frasco','Lote','Especificacao']);
  compare(0,'sig',['Emprestimo']);
  for (const i of [0,2]) {
    compare(i,'abstract sig',['EstadoFisico','SituacaoLocalizacao','Disponibilidade']);
    compare(i,'one sig',['FECHADO','LOCALIZADO','EXTRAVIADO','DISPONIVEL']);
  }
  const state = rename(block(sources[2],'sig','Estado'),m2Names)
    .replace('fisico:', 'ativos: Frasco -> set Emprestimo, fisico:');
  if(tokens(state)!==tokens(block(composition,'sig','EstadoIntegrado')))
    throw new Error('Drift do vocabulário integrado');
}
