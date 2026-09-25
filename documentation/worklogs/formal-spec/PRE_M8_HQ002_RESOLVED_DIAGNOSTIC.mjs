// Diagnóstico pós-correção de HQ-PRE-M8-002. Não é receipt de milestone.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';

const origin = 'specification/alloy/reagents/bottle_composition.als';
const source = fs.readFileSync(origin, 'utf8');
const diagnostic = `
assert HQ002_PreservacaoFisica { all a,b: EstadoIntegrado, f: Frasco |
  extraviarComposto[a,b,f] implies b.fisico[f] = a.fisico[f] }
assert HQ002_RevogacaoNoExtravio { all a,b: EstadoIntegrado, f: Frasco |
  extraviarComposto[a,b,f] implies f not in b.descarteTecnicoAutorizado }
assert HQ002_ReencontroCoerente { all a,b: EstadoIntegrado, f: Frasco |
  reencontrarComposto[a,b,f] implies
    (b.localizacao[f] = LOCALIZADO and f in b.emQuarentena and
     f not in b.descarteTecnicoAutorizado and b.fisico[f] = a.fisico[f] and
     coerenteIntegrado[b]) }
assert HQ002_QuebradoNaoDisponivel { all a,b: EstadoIntegrado, f: Frasco |
  reencontrarComposto[a,b,f] and a.fisico[f] = QUEBRADO
    implies b.disponibilidade[f] = INDISPONIVEL }
pred HQ002_QuebradoExtravioHabitavel {
  some disj a,b: EstadoIntegrado, f: Frasco |
    a.fisico[f] = QUEBRADO and a.localizacao[f] = LOCALIZADO and
    extraviarComposto[a,b,f] and b.fisico[f] = QUEBRADO and
    b.localizacao[f] = EXTRAVIADO and f not in b.descarteTecnicoAutorizado }
pred HQ002_CicloQuebradoHabitavel {
  some disj a,b,c,d: EstadoIntegrado, f: Frasco |
    a.fisico[f] = QUEBRADO and a.localizacao[f] = LOCALIZADO and
    f in a.emQuarentena and resolverComposto[a,b,f] and
    extraviarComposto[b,c,f] and reencontrarComposto[c,d,f] and
    d.fisico[f] = QUEBRADO and d.localizacao[f] = LOCALIZADO and
    f in d.emQuarentena and f not in d.descarteTecnicoAutorizado }
check HQ002_PreservacaoFisica for 4
check HQ002_RevogacaoNoExtravio for 4
check HQ002_ReencontroCoerente for 6
check HQ002_QuebradoNaoDisponivel for 6
run HQ002_QuebradoExtravioHabitavel for 4
run HQ002_CicloQuebradoHabitavel for 6 but exactly 4 EstadoIntegrado
`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lcqui-hq002-resolved-'));
const model = path.join(dir, 'bottle_composition.als');
fs.writeFileSync(model, source + diagnostic);
const version = spawnSync('alloy6', ['version'], {encoding: 'utf8'});
if (version.error || version.status !== 0 || version.stdout.trim() !== '6.2.0') throw new Error('Alloy 6.2.0 requerido');
const run = spawnSync('alloy6', ['exec', '-q', '-c', 'HQ002_*', '-s', 'sat4j', '-t', 'json', '-o', path.join(dir, 'result'), model], {encoding: 'utf8'});
if (run.error || run.status !== 0) throw new Error(`${run.error ?? run.stderr}; evidência: ${dir}`);
const receipt = JSON.parse(fs.readFileSync(path.join(dir, 'result/receipt.json')));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const resultados = Object.values(receipt.commands).map(c => ({comando: c.source, tipo: c.type, status: c.solution?.length ? 'SAT' : 'UNSAT'}));
const output = {classificacao: 'DIAGNOSTICO_POS_CORRECAO', origin, origin_sha256: sha(source), diagnostic_sha256: sha(source + diagnostic), alloy: version.stdout.trim(), solver: receipt.solver, resultados};
fs.writeFileSync(path.join('documentation/worklogs/formal-spec/PRE_M8_DIAGNOSTIC_EVIDENCE/HQ002-resolved.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({...output, evidencia_local: dir}, null, 2));
