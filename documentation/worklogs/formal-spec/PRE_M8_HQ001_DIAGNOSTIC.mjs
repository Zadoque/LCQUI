// Diagnóstico de contradição, NÃO receipt de validação de M5.
// Executar da raiz: node documentation/worklogs/formal-spec/PRE_M8_HQ001_DIAGNOSTIC.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const origin = 'specification/alloy/reagents/withdrawal_return.als';
const source = fs.readFileSync(origin, 'utf8');
// Reutiliza o modelo real INTEGRAL, incluindo coerenteM4/coerenteM2 sem edições.
// -c HQ* seleciona somente o diagnóstico adicionado; comandos M4 preservados.
const diagnostic = `
pred hqReencontroQuebrado[a, b: Estado, f: Frasco] {
  coerenteM4[a]
  a.fisico[f] = EXTRAVIADO
  f in a.saldoDesconhecido
  no a.descarteTecnicoAutorizado
  b.fisico = a.fisico ++ f->QUEBRADO
  b.disponibilidade = a.disponibilidade ++ f->INDISPONIVEL
  b.emQuarentena = a.emQuarentena + f
  b.saldoDesconhecido = a.saldoDesconhecido
  b.aberturaHistorica = a.aberturaHistorica
  b.vencido = a.vencido
  b.validadeDesconhecida = a.validadeDesconhecida
  b.usoVencidoAutorizado = a.usoVencidoAutorizado
  b.descarteTecnicoAutorizado = a.descarteTecnicoAutorizado
  b.status = a.status
  b.vencidoNaRetirada = a.vencidoNaRetirada
}
assert HQPreservaCoerencia {
  all a, b: Estado, f: Frasco |
    hqReencontroQuebrado[a,b,f] implies coerenteM4[b]
}
pred HQOrigemHabitavel {
  some disj a,b: Estado, f: Frasco | hqReencontroQuebrado[a,b,f]
}
assert HQPreservaCoerenciaAmpliado {
  all a, b: Estado, f: Frasco |
    hqReencontroQuebrado[a,b,f] implies coerenteM4[b]
}
check HQPreservaCoerencia for 4 but exactly 2 Estado
run HQOrigemHabitavel for 4 but exactly 2 Estado
check HQPreservaCoerenciaAmpliado for 6 but exactly 2 Estado
`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lcqui-pre-m8-hq001-'));
const model = path.join(dir, 'withdrawal_return.als');
fs.writeFileSync(model, source + diagnostic);
const version = spawnSync('alloy6', ['version'], {encoding: 'utf8'});
if (version.error || version.status !== 0 || version.stdout.trim() !== '6.2.0')
  throw new Error('Diagnóstico exige Alloy 6.2.0');
const run = spawnSync('alloy6', ['exec', '-q', '-c', 'HQ*', '-s', 'sat4j', '-t', 'json', '-o', path.join(dir, 'result'), model], {encoding: 'utf8'});
if (run.error || run.status !== 0) throw new Error(`${run.error ?? run.stderr}; evidência: ${dir}`);
const receipt = JSON.parse(fs.readFileSync(path.join(dir, 'result/receipt.json')));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
// Apenas relata o resultado real; SAT de assertion é CONTRAEXEMPLO, nunca PASS.
console.log(JSON.stringify({
  classificacao: 'DIAGNOSTICO_NAO_VALIDACAO',
  origin, origin_sha256: sha(source), diagnostic_sha256: sha(source + diagnostic),
  alloy: version.stdout.trim(), solver: receipt.solver,
  resultados: Object.values(receipt.commands).map(c => ({
    comando: c.source, tipo: c.type,
    status: c.solution?.length ? 'SAT' : 'UNSAT',
  })),
  evidencia_local: dir,
}, null, 2));
