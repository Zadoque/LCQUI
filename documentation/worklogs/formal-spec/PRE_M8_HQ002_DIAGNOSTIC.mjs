// Diagnóstico de contradição, NÃO receipt de validação de M5.
// Executar da raiz: node documentation/worklogs/formal-spec/PRE_M8_HQ002_DIAGNOSTIC.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const origin = 'specification/alloy/reagents/bottle_composition.als';
const source = fs.readFileSync(origin, 'utf8');
// Reutiliza o modelo M2.4 integral, incluindo resolver/extraviar e coerência.
// -c HQ* seleciona somente o diagnóstico adicionado; comandos M2.4 preservados.
const diagnostic = `
pred hqReencontrarComAutorizacao[a,b: EstadoIntegrado,f: Frasco] {
 coerenteIntegrado[a]
 a.fisico[f]=EXTRAVIADO
 b.fisico=a.fisico ++ f->QUEBRADO
 b.disponibilidade=a.disponibilidade ++ f->INDISPONIVEL
 b.emQuarentena=a.emQuarentena+f
 b.descarteTecnicoAutorizado=a.descarteTecnicoAutorizado
 b.saldoDesconhecido=a.saldoDesconhecido
 b.aberturaHistorica=a.aberturaHistorica
 b.vencido=a.vencido
 b.usoVencidoAutorizado=a.usoVencidoAutorizado
 b.ativos=a.ativos
}
pred hqCiclo[a,b,c,d: EstadoIntegrado,f: Frasco] {
 a.fisico[f]=ABERTO
 f in a.emQuarentena
 resolverComposto[a,b,f]
 extraviarComposto[b,c,f]
 hqReencontrarComAutorizacao[c,d,f]
}
assert HQAutorizacaoQuarentena {
 all disj a,b,c,d: EstadoIntegrado, f: Frasco |
 hqCiclo[a,b,c,d,f] implies coerenteIntegrado[d]
}
pred HQCicloHabitavel {
 some disj a,b,c,d: EstadoIntegrado, f: Frasco | hqCiclo[a,b,c,d,f]
}
assert HQAutorizacaoQuarentenaAmpliado {
 all disj a,b,c,d: EstadoIntegrado, f: Frasco |
 hqCiclo[a,b,c,d,f] implies coerenteIntegrado[d]
}
pred HQCicloHabitavelAmpliado {
 some disj a,b,c,d: EstadoIntegrado, f: Frasco | hqCiclo[a,b,c,d,f]
}
check HQAutorizacaoQuarentena for 4 but exactly 4 EstadoIntegrado
run HQCicloHabitavel for 4 but exactly 4 EstadoIntegrado
check HQAutorizacaoQuarentenaAmpliado for 6 but exactly 4 EstadoIntegrado
run HQCicloHabitavelAmpliado for 6 but exactly 4 EstadoIntegrado
`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lcqui-pre-m8-hq002-'));
const model = path.join(dir, 'bottle_composition.als');
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
