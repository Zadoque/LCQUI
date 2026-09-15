// Orquestração apenas: nenhuma geração LaTeX fora do Rust.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root = path.resolve(import.meta.dirname, '../..');
process.chdir(root);
const cueDir = path.join(root, 'specification/cue');
function run(command, args, cwd=root) {
  const r = spawnSync(command, args, {cwd, encoding:'utf8'});
  if (r.error || r.status !== 0) throw new Error(`${command} ${args.join(' ')}\n${r.error ?? r.stderr ?? r.stdout}`);
  return r.stdout;
}
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
function write(file, data) { fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file,data); }
function specCheck() {
  run('cue',['vet','./...'],cueDir);
  for (const kind of ['valid','invalid']) {
    const files = fs.readdirSync(`${cueDir}/tests/${kind}`).sort();
    if (!files.length) throw new Error(`Sem fixtures ${kind}`);
    for (const file of files) {
      const r=spawnSync('cue',['vet','-c','./domain',`./tests/${kind}/${file}`,'-d','#Frasco'],{cwd:cueDir,encoding:'utf8'});
      if (r.error || (kind==='valid' ? r.status!==0 : r.status!==1)) throw new Error(`Fixture ${kind}/${file}: ${r.error ?? r.stderr}`);
    }
  }
  // cue fmt deve ser um gate sem modificar as fontes.
  const files=fs.readdirSync(cueDir,{recursive:true}).filter(f=>f.endsWith('.cue')).sort();
  for (const file of files) {
    const original=fs.readFileSync(path.join(cueDir,file),'utf8');
    const temp=fs.mkdtempSync(path.join(os.tmpdir(),'lcqui-cue-fmt-'));
    const copy=path.join(temp,'source.cue');
    fs.writeFileSync(copy,original);
    run('cue',['fmt',copy]);
    if(fs.readFileSync(copy,'utf8')!==original) throw new Error(`Execute cue fmt: ${file}`);
    fs.rmSync(temp,{recursive:true});
  }
}
function specExport() {
  specCheck();
  write('build/spec-ir.json',run('cue',['export','./docs','-e','ir'],cueDir));
}
function alloyCheck() {
  specExport();
  const version=run('alloy6',['version']).trim();
  if(version!=='6.2.0') throw new Error(`Alloy esperado 6.2.0, obtido ${version}`);
  const model='specification/alloy/reagents/withdrawal.als';
  const source=fs.readFileSync(model);
  const ir=fs.readFileSync('build/spec-ir.json');
  // Guard contra drift entre vocabulário estrutural e relacional.
  for(const field of JSON.parse(ir).campos) for(const value of field.valores)
    if(!new RegExp(`\\b${value}\\b`).test(source.toString())) throw new Error(`Enum ausente no Alloy: ${value}`);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'lcqui-alloy-'));
  run('alloy6',['exec','-q','-c','*','-s','sat4j','-t','json','-o',path.join(temp,'result'),model]);
  const receipt=JSON.parse(fs.readFileSync(path.join(temp,'result/receipt.json')));
  const expected=[['BloqueioFisico','check','INV-FRASCO-001'],['Unicidade','check','INV-EMPRESTIMO-001'],['Testemunha','run','WIT-RETIRADA-001'],['DisponivelNaoApto','run','WIT-DISPONIBILIDADE-001']];
  if(Object.keys(receipt.commands).sort().join()!==expected.map(x=>x[0]).sort().join()) throw new Error('Comandos Alloy divergentes');
  const results=expected.map(([name,type,id])=>{
    const c=receipt.commands[name];
    if(c.type!==type || c.overall!==4 || c.scopes.join()!=='exactly 2 Estado') throw new Error(`Scope/tipo inesperado: ${name}`);
    const sat=Array.isArray(c.solution)&&c.solution.length>0;
    if(sat!==(type==='run')) throw new Error(`CONTRAEXEMPLO PÓS-3B ou testemunha ausente: ${name}; evidência ${temp}. Registrar no FORMAL_SPEC_STATE.md antes de alterar regras.`);
    return {id,assertion:name,tipo:type,scope:c.source,status:sat?'SAT':'UNSAT'};
  });
  write('build/formal-validation.json',JSON.stringify({versao:1,alloy:version,solver:receipt.solver,model,model_sha256:hash(source),spec_ir_sha256:hash(ir),resultados:results},null,2)+'\n');
  fs.rmSync(temp,{recursive:true});
}
const cmd=process.argv[2];
if(cmd==='spec-check') specCheck();
else if(cmd==='spec-export') specExport();
else if(cmd==='alloy-check') alloyCheck();
else throw new Error('Uso: node tools/formal/check.mjs spec-check|spec-export|alloy-check');
console.log(`${cmd}: PASS`);
