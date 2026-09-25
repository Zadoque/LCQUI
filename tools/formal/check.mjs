// Orquestração apenas: nenhuma geração LaTeX fora do Rust.
import fs from 'node:fs';
import {composedModel, composedExpected, origins, checkCompositionTrace} from './composition.mjs';
import {withdrawalReturnModel, withdrawalReturnOrigins, withdrawalReturnExpected, checkWithdrawalReturnTrace} from './withdrawal_return.mjs';
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
  const groups = [['tests', '#Frasco'], ['tests/catalogo/resumo', '#ResumoReagente'], ['tests/catalogo/especificacao', '#EspecificacaoReagente'], ['tests/catalogo/par', '#ParCatalogo'], ['tests/frasco-completo', '#FrascoCompleto'], ['tests/emprestimo', '#EmprestimoReagente'], ['tests/m5', '#M5Operacao'], ['tests/m6', '#M6Metrologia'], ['tests/m7', '#M7Operacao'], ['tests/m8', '#M8Contrato'], ['tests/m9', '#M9Contrato']];
  for (const [directory, definition] of groups) for (const kind of ['valid','invalid']) {
    const files = fs.readdirSync(`${cueDir}/${directory}/${kind}`).sort();
    if (!files.length) throw new Error(`Sem fixtures ${kind}`);
    for (const file of files) {
      const r=spawnSync('cue',['vet','-c','./domain',`./${directory}/${kind}/${file}`,'-d',definition],{cwd:cueDir,encoding:'utf8'});
      if (r.error || (kind==='valid' ? r.status!==0 : r.status!==1)) throw new Error(`Fixture ${directory}/${kind}/${file}: ${r.error ?? r.stderr}`);
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
  loanContractParity();
}
// Guard de drift M3: nomes/ordem/quantidade da entidade documental devem coincidir
// com emprestimoReagenteCampos, sem lista manual duplicada.
function loanContractParity() {
  const tex=fs.readFileSync('documentation/Section-4-Modelagem-Entidades-SQL-3FN.tex','utf8');
  const start=tex.indexOf('\\begin{entidade}{Emprestimo\\_Reagente}');
  const end=tex.indexOf('\\end{entidade}',start);
  if(start<0||end<0) throw new Error('Entidade Emprestimo_Reagente ausente da Seção 4');
  const block=tex.slice(start,end);
  const documented=[...block.matchAll(/\\campo\{([^}]+)\}/g)].map(m=>m[1].replace(/\\_/g,'_'));
  const cueNames=JSON.parse(run('cue',['export','./domain','-e','emprestimoReagenteCampos'],cueDir)).map(c=>c.nome);
  const mismatch=documented.length!==cueNames.length||documented.some((n,i)=>n!==cueNames[i]);
  if(mismatch) throw new Error(`Paridade Seção 4 x CUE divergente: ${documented.length} documentais, ${cueNames.length} CUE`);
}
function specExport() {
  specCheck();
  write('build/spec-ir.json',run('cue',['export','./docs','-e','ir'],cueDir));
}
function execAlloy(model, expected) {
  const source=fs.readFileSync(model);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'lcqui-alloy-'));
  run('alloy6',['exec','-q','-c','*','-s','sat4j','-t','json','-o',path.join(temp,'result'),model]);
  const receipt=JSON.parse(fs.readFileSync(path.join(temp,'result/receipt.json')));
  if(Object.keys(receipt.commands).sort().join()!==expected.map(x=>x.name).sort().join())
    throw new Error(`Comandos Alloy divergentes em ${model}; evidência ${temp}`);
  const results=expected.map(e=>{
    const c=receipt.commands[e.name];
    // `overall` codifica o escopo `exactly N` (N+2), não o sucesso do comando.
    if(c.type!==e.type || c.overall!==(e.overall??4) || c.source!==e.scope)
      throw new Error(`Tipo/scope inesperado em ${model}: ${e.name} (${c.source}); evidência ${temp}`);
    const sat=Array.isArray(c.solution)&&c.solution.length>0;
    if(sat!==(e.type==='run'))
      throw new Error(`CONTRAEXEMPLO PÓS-3B ou testemunha ausente: ${model} ${e.name}; evidência ${temp}. Registrar no FORMAL_SPEC_STATE.md antes de alterar regras.`);
    return {id:e.id,assertion:e.name,tipo:e.type,scope:c.source,status:sat?'SAT':'UNSAT'};
  });
  fs.rmSync(temp,{recursive:true});
  return {solver:receipt.solver,source,results};
}
function alloyCheck() {
  specExport();
  const version=run('alloy6',['version']).trim();
  if(version!=='6.2.0') throw new Error(`Alloy esperado 6.2.0, obtido ${version}`);
  const model='specification/alloy/reagents/withdrawal.als';
  const source=fs.readFileSync(model);
  const ir=fs.readFileSync('build/spec-ir.json');
  // Guard contra drift entre vocabulário estrutural e relacional.
  const bottle=JSON.parse(ir).entidades.find(e=>e.arquivo==='frasco_reagente');
  if(!bottle) throw new Error('Fatia Frasco ausente do IR');
  for(const field of bottle.campos) for(const value of field.valores)
    if(!new RegExp(`\\b${value}\\b`).test(source.toString())) throw new Error(`Enum ausente no Alloy: ${value}`);
  // M0: artefato canônico consumido pelo gerador Rust; formato preservado.
  const m0=[
    {id:'INV-FRASCO-001',name:'BloqueioFisico',type:'check',scope:'check BloqueioFisico for 4 but exactly 2 Estado'},
    {id:'INV-EMPRESTIMO-001',name:'Unicidade',type:'check',scope:'check Unicidade for 4 but exactly 2 Estado'},
    {id:'WIT-RETIRADA-001',name:'Testemunha',type:'run',scope:'run Testemunha for 4 but exactly 2 Estado'},
    {id:'WIT-DISPONIBILIDADE-001',name:'IndisponivelNaoApto',type:'run',scope:'run IndisponivelNaoApto for 4 but exactly 2 Estado'},
  ];
  const m0run=execAlloy(model,m0);
  write('build/formal-validation.json',JSON.stringify({versao:1,alloy:version,solver:m0run.solver,model,model_sha256:hash(source),spec_ir_sha256:hash(ir),resultados:m0run.results},null,2)+'\n');
  // M2.2: identidade e coerência de estado. Artefato próprio; não entra no IR/gerador (M2.3).
  const estado='for 4 but exactly 2 Estado';
  const m2=[
    ['specification/alloy/reagents/bottle_identity.als',[
      {id:'IDENTIDADE-001',name:'IdentidadeUnica',type:'check',scope:'check IdentidadeUnica for 4'},
      {id:'IDENTIDADE-002',name:'ViaLoteResolveLote',type:'check',scope:'check ViaLoteResolveLote for 4'},
      {id:'IDENTIDADE-003',name:'ViaDiretaResolveDireta',type:'check',scope:'check ViaDiretaResolveDireta for 4'},
      {id:'IDENTIDADE-004',name:'RotasNaoCoexistem',type:'check',scope:'check RotasNaoCoexistem for 4'},
      {id:'IDENTIDADE-005',name:'SemRotaSemEspecificacao',type:'check',scope:'check SemRotaSemEspecificacao for 4'},
      {id:'WIT-IDENTIDADE-LOTE-001',name:'ViaLoteValido',type:'run',scope:'run ViaLoteValido for 4'},
      {id:'WIT-IDENTIDADE-DIRETA-001',name:'ViaDiretaValida',type:'run',scope:'run ViaDiretaValida for 4'},
      {id:'WIT-IDENTIDADE-ROTADUPLA-001',name:'RotaDuplaIncoerente',type:'run',scope:'run RotaDuplaIncoerente for 4'},
      {id:'WIT-IDENTIDADE-SQL-001',name:'RotaDuplaSobSql',type:'run',scope:'run RotaDuplaSobSql for 4'},
      {id:'WIT-IDENTIDADE-SEMROTA-001',name:'SemRotaIncoerente',type:'run',scope:'run SemRotaIncoerente for 4'},
    ]],
    ['specification/alloy/reagents/bottle_state.als',[
      {id:'INV-M2-COERENCIA-001',name:'TransicoesPreservamCoerencia',type:'check',scope:`check TransicoesPreservamCoerencia ${estado}`},
      {id:'INV-M2-DESCARTADO-TERMINAL-001',name:'DescartadoEhTerminal',type:'check',scope:`check DescartadoEhTerminal ${estado}`},
      {id:'INV-M2-DESCARTADO-EXTRAVIO-001',name:'DescartadoNaoExtravia',type:'check',scope:`check DescartadoNaoExtravia ${estado}`},
      {id:'INV-M2-DESCARTADO-QUEBRA-001',name:'DescartadoNaoQuebra',type:'check',scope:`check DescartadoNaoQuebra ${estado}`},
      {id:'INV-M2-DESCARTADO-REDESCARTE-001',name:'DescartadoNaoDescartaNovamente',type:'check',scope:`check DescartadoNaoDescartaNovamente ${estado}`},
      {id:'INV-M2-DESCARTADO-ESGOTAMENTO-001',name:'DescartadoNaoEsgota',type:'check',scope:`check DescartadoNaoEsgota ${estado}`},
      {id:'INV-M2-DESCARTADO-QUARENTENA-001',name:'DescartadoNaoResolveQuarentena',type:'check',scope:`check DescartadoNaoResolveQuarentena ${estado}`},
      {id:'INV-M2-QUARENTENA-DESCARTE-001',name:'QuarentenaNaoDescartaDireto',type:'check',scope:`check QuarentenaNaoDescartaDireto ${estado}`},
      {id:'INV-M2-EXTRAVIO-001',name:'ExtravioIndisponivel',type:'check',scope:`check ExtravioIndisponivel ${estado}`},
      {id:'FRAME-M2-EXTRAVIO-FISICO-001',name:'ExtravioPreservaFisico',type:'check',scope:`check ExtravioPreservaFisico ${estado}`},
      {id:'FRAME-M2-EXTRAVIO-LOCALIZACAO-001',name:'ExtravioMarcaLocalizacao',type:'check',scope:`check ExtravioMarcaLocalizacao ${estado}`},
      {id:'FRAME-M2-EXTRAVIO-AUTORIZACAO-001',name:'ExtravioRevogaAutorizacao',type:'check',scope:`check ExtravioRevogaAutorizacao ${estado}`},
      {id:'FRAME-M2-EXTRAVIO-SALDO-001',name:'ExtravioPreservaSaldo',type:'check',scope:`check ExtravioPreservaSaldo ${estado}`},
      {id:'FRAME-M2-EXTRAVIO-FLAG-001',name:'ExtravioPreservaFlag',type:'check',scope:`check ExtravioPreservaFlag ${estado}`},
      {id:'INV-M2-EXTRAVIO-REP-001',name:'ExtravioNaoRepetido',type:'check',scope:`check ExtravioNaoRepetido ${estado}`},
      {id:'FRAME-M2-EXTRAVIO-VALIDADE-001',name:'ExtravioPreservaValidade',type:'check',scope:`check ExtravioPreservaValidade ${estado}`},
      {id:'FRAME-M2-REENCONTRO-LOCALIZACAO-001',name:'ReencontroLocalizaEQuarentena',type:'check',scope:`check ReencontroLocalizaEQuarentena ${estado}`},
      {id:'FRAME-M2-REENCONTRO-FISICO-001',name:'ReencontroPreservaFisico',type:'check',scope:`check ReencontroPreservaFisico ${estado}`},
      {id:'FRAME-M2-REENCONTRO-AUTORIZACAO-001',name:'ReencontroRevogaAutorizacao',type:'check',scope:`check ReencontroRevogaAutorizacao ${estado}`},
      {id:'INV-M2-REENCONTRO-QUEBRADO-IND-001',name:'QuebradoNaoDisponivelAposReencontro',type:'check',scope:`check QuebradoNaoDisponivelAposReencontro ${estado}`},
      {id:'INV-M2-TERMINAL-QUEBRA-IND-001',name:'QuebraIndisponivel',type:'check',scope:`check QuebraIndisponivel ${estado}`},
      {id:'INV-M2-QUEBRA-EMPRESTIMO-001',name:'QuebraNaoEmprestado',type:'check',scope:`check QuebraNaoEmprestado ${estado}`},
      {id:'FRAME-M2-QUEBRA-INTERF-001',name:'QuebraNaoInterfereValidade',type:'check',scope:`check QuebraNaoInterfereValidade ${estado}`},
      {id:'INV-M2-TERMINAL-DESCARTE-IND-001',name:'DescarteIndisponivel',type:'check',scope:`check DescarteIndisponivel ${estado}`},
      {id:'FRAME-M2-DESCARTE-CONHECIMENTO-001',name:'DescartePreservaConhecimentoMetrologico',type:'check',scope:`check DescartePreservaConhecimentoMetrologico ${estado}`},
      {id:'INV-M2-DESCARTE-FISICO-001',name:'DescarteFisicoDescartado',type:'check',scope:`check DescarteFisicoDescartado ${estado}`},
      {id:'FRAME-M2-DESCARTE-VALIDADE-001',name:'DescartePreservaValidade',type:'check',scope:`check DescartePreservaValidade ${estado}`},
      {id:'FRAME-M2-DESCARTE-AUTORIZACAO-001',name:'DescarteConsomeAutorizacao',type:'check',scope:`check DescarteConsomeAutorizacao ${estado}`},
      {id:'INV-M2-DESCARTE-EMPRESTIMO-001',name:'NaoDescarteEmprestado',type:'check',scope:`check NaoDescarteEmprestado ${estado}`},
      {id:'INV-M2-DESCARTE-USOVENCIDO-001',name:'UsoVencidoNaoHabilitaDescarte',type:'check',scope:`check UsoVencidoNaoHabilitaDescarte ${estado}`},
      {id:'INV-M2-TERMINAL-ESGOTAMENTO-IND-001',name:'EsgotamentoIndisponivel',type:'check',scope:`check EsgotamentoIndisponivel ${estado}`},
      {id:'FRAME-M2-QUEBRA-CONHECIMENTO-001',name:'QuebraPreservaConhecimentoMetrologico',type:'check',scope:`check QuebraPreservaConhecimentoMetrologico ${estado}`},
      {id:'INV-M2-TERMINAL-ESGOTAMENTO-001',name:'EsgotamentoSaldoConhecido',type:'check',scope:`check EsgotamentoSaldoConhecido ${estado}`},
      {id:'FRAME-M2-ESGOTAMENTO-INTERF-001',name:'EsgotamentoNaoInterfereValidade',type:'check',scope:`check EsgotamentoNaoInterfereValidade ${estado}`},
      {id:'FRAME-M2-QUARENTENA-ORTOGONAL-001',name:'PreservacaoQuarentenaOrtogonais',type:'check',scope:`check PreservacaoQuarentenaOrtogonais ${estado}`},
      {id:'FRAME-M2-RESOLUCAO-QUARENTENA-001',name:'ResolucaoQuarentenaNaoInterfereOutros',type:'check',scope:`check ResolucaoQuarentenaNaoInterfereOutros ${estado}`},
      {id:'INV-M2-ABERTURA-001',name:'TransicoesPreservamFlag',type:'check',scope:`check TransicoesPreservamFlag ${estado}`},
      {id:'WIT-M2-QUEBRA-DESCONHECIDO-001',name:'QuebraSaldoDesconhecidoHabitavel',type:'run',scope:'run QuebraSaldoDesconhecidoHabitavel for 4 but exactly 2 Estado'},
      {id:'WIT-M2-QUEBRA-CONHECIDO-001',name:'QuebraSaldoConhecidoHabitavel',type:'run',scope:'run QuebraSaldoConhecidoHabitavel for 4 but exactly 2 Estado'},
      {id:'FRAME-M2-QUEBRA-CONHECIMENTO-006',name:'QuebraPreservaConhecimentoMetrologicoAmpliado',type:'check',overall:6,scope:'check QuebraPreservaConhecimentoMetrologicoAmpliado for 6 but exactly 2 Estado'},
      {id:'WIT-M2-DESCARTE-DESCONHECIDO-001',name:'DescarteSaldoDesconhecidoHabitavel',type:'run',scope:'run DescarteSaldoDesconhecidoHabitavel for 4 but exactly 2 Estado'},
      {id:'WIT-M2-DESCARTE-CONHECIDO-001',name:'DescarteSaldoConhecidoHabitavel',type:'run',scope:'run DescarteSaldoConhecidoHabitavel for 4 but exactly 2 Estado'},
      {id:'FRAME-M2-DESCARTE-CONHECIMENTO-006',name:'DescartePreservaConhecimentoMetrologicoAmpliado',type:'check',overall:6,scope:'check DescartePreservaConhecimentoMetrologicoAmpliado for 6 but exactly 2 Estado'},
      {id:'WIT-M2-EXTRAVIO-001',name:'TestemunhaExtravio',type:'run',scope:`run TestemunhaExtravio ${estado}`},
      {id:'WIT-M2-EXTRAVIO-FISICO-001',name:'TestemunhaExtravioPreservaFisico',type:'run',scope:`run TestemunhaExtravioPreservaFisico ${estado}`},
      {id:'WIT-M2-REENCONTRO-QUEBRADO-001',name:'TestemunhaReencontroQuebrado',type:'run',overall:6,scope:'run TestemunhaReencontroQuebrado for 6 but exactly 4 Estado'},
      {id:'WIT-M2-QUEBRA-001',name:'TestemunhaQuebra',type:'run',scope:`run TestemunhaQuebra ${estado}`},
      {id:'WIT-M2-DESCARTE-001',name:'TestemunhaDescarte',type:'run',scope:`run TestemunhaDescarte ${estado}`},
      {id:'WIT-M2-DESCARTE-VAZIO-001',name:'TestemunhaDescarteVazio',type:'run',scope:`run TestemunhaDescarteVazio ${estado}`},
      {id:'WIT-M2-DESCARTE-QUEBRADO-001',name:'TestemunhaDescarteQuebrado',type:'run',scope:`run TestemunhaDescarteQuebrado ${estado}`},
      {id:'WIT-M2-DESCARTE-VENCIDO-ABERTO-001',name:'TestemunhaDescarteVencidoAberto',type:'run',scope:`run TestemunhaDescarteVencidoAberto ${estado}`},
      {id:'WIT-M2-DESCARTE-VENCIDO-FECHADO-001',name:'TestemunhaDescarteVencidoFechado',type:'run',scope:`run TestemunhaDescarteVencidoFechado ${estado}`},
      {id:'WIT-M2-ESGOTAMENTO-001',name:'TestemunhaEsgotamento',type:'run',scope:`run TestemunhaEsgotamento ${estado}`},
      {id:'WIT-M2-USOVENCIDO-001',name:'TestemunhaVencidoComUsoAutorizado',type:'run',scope:`run TestemunhaVencidoComUsoAutorizado ${estado}`},
      {id:'WIT-M2-RESOLVER-QUARENTENA-001',name:'TestemunhaResolverQuarentena',type:'run',scope:`run TestemunhaResolverQuarentena ${estado}`},
      {id:'WIT-M2-QUARENTENA-DESCARTE-001',name:'TestemunhaQuarentenaAteDescarte',type:'run',overall:5,scope:'run TestemunhaQuarentenaAteDescarte for 5 but exactly 3 Estado'},
    ]],
  ];
  let solverM2=null;
  const modelos=m2.map(([file,expected])=>{
    const r=execAlloy(file,expected);
    if(solverM2!==null && solverM2!==r.solver) throw new Error(`Solvers M2 divergentes: ${solverM2} vs ${r.solver}`);
    solverM2=r.solver;
    return {model:file,model_sha256:hash(r.source),resultados:r.results};
  });
  write('build/formal-validation-m2.json',JSON.stringify({versao:1,alloy:version,solver:solverM2,spec_ir_sha256:hash(ir),modelos},null,2)+'\n');
  checkCompositionTrace(file => fs.readFileSync(file));
  const composed = execAlloy(composedModel, composedExpected);
  write('build/formal-validation-m24.json',JSON.stringify({versao:1,alloy:version,solver:composed.solver,spec_ir_sha256:hash(ir),model:composedModel,model_sha256:hash(composed.source),origens:origins.map(model=>({model,model_sha256:hash(fs.readFileSync(model))})),resultados:composed.results},null,2)+'\n');
  // M3: ciclo de vida do Emprestimo_Reagente. Evidência própria.
  const loan='specification/alloy/reagents/loan_state.als';
  const m3=[
    {id:'INV-M3-ATIVO-UNICIDADE-001',name:'UnicidadeAtivaPreservada',type:'check',scope:'check UnicidadeAtivaPreservada for 4 but exactly 2 Estado'},
    {id:'INV-M3-ATRASO-ORIGEM-001',name:'AtrasoSoDeEmUso',type:'check',scope:'check AtrasoSoDeEmUso for 4 but exactly 2 Estado'},
    {id:'INV-M3-ENCERRADO-TERMINAL-001',name:'EncerradoNaoReabre',type:'check',scope:'check EncerradoNaoReabre for 4 but exactly 2 Estado'},
    {id:'INV-M3-DEVOLUCAO-ENCERRA-001',name:'DevolucaoEncerra',type:'check',scope:'check DevolucaoEncerra for 4 but exactly 2 Estado'},
    {id:'INV-M3-ANOMALIA-ENCERRA-001',name:'AnomaliaNaoAtiva',type:'check',scope:'check AnomaliaNaoAtiva for 4 but exactly 2 Estado'},
    {id:'INV-M3-EXTRAORDINARIO-ENCERRA-001',name:'ExtraordinarioNaoAtivo',type:'check',scope:'check ExtraordinarioNaoAtivo for 4 but exactly 2 Estado'},
    {id:'FRAME-M3-STATUS-001',name:'TransicaoNaoInterfereOutros',type:'check',scope:'check TransicaoNaoInterfereOutros for 4 but exactly 2 Estado'},
    {id:'WIT-M3-EM-USO-001',name:'TestemunhaEmUso',type:'run',scope:'run TestemunhaEmUso for 4 but exactly 2 Estado'},
    {id:'WIT-M3-ATRASADO-001',name:'TestemunhaAtrasado',type:'run',scope:'run TestemunhaAtrasado for 4 but exactly 2 Estado'},
    {id:'WIT-M3-ATRASO-001',name:'TestemunhaAtraso',type:'run',scope:'run TestemunhaAtraso for 4 but exactly 2 Estado'},
    {id:'WIT-M3-DEVOLUCAO-001',name:'TestemunhaDevolucaoNormal',type:'run',scope:'run TestemunhaDevolucaoNormal for 4 but exactly 2 Estado'},
    {id:'WIT-M3-DEVOLUCAO-ATRASO-001',name:'TestemunhaDevolucaoComAtraso',type:'run',scope:'run TestemunhaDevolucaoComAtraso for 4 but exactly 2 Estado'},
    {id:'WIT-M3-DEVOLUCAO-ANOMALIA-001',name:'TestemunhaDevolucaoComAnomalia',type:'run',scope:'run TestemunhaDevolucaoComAnomalia for 4 but exactly 2 Estado'},
    {id:'WIT-M3-ENCERRAMENTO-001',name:'TestemunhaEncerramentoExtraordinario',type:'run',scope:'run TestemunhaEncerramentoExtraordinario for 4 but exactly 2 Estado'},
    {id:'WIT-M3-DOIS-FRASCOS-001',name:'TestemunhaDoisFrascosAtivos',type:'run',scope:'run TestemunhaDoisFrascosAtivos for 4 but exactly 2 Estado'},
    {id:'WIT-M3-TRANSICAO-COERENTE-001',name:'TestemunhaTransicaoCoerente',type:'run',scope:'run TestemunhaTransicaoCoerente for 4 but exactly 2 Estado'},
    {id:'WIT-M3-ESTADO-ENCERRADO-001',name:'TestemunhaEstadoEncerrado',type:'run',scope:'run TestemunhaEstadoEncerrado for 4 but exactly 2 Estado'},
    {id:'INV-M3-ATIVO-UNICIDADE-006',name:'UnicidadeAtivaPreservadaAmpliado',type:'check',overall:6,scope:'check UnicidadeAtivaPreservadaAmpliado for 6 but exactly 2 Estado'},
    {id:'INV-M3-ATRASO-ORIGEM-006',name:'AtrasoSoDeEmUsoAmpliado',type:'check',overall:6,scope:'check AtrasoSoDeEmUsoAmpliado for 6 but exactly 2 Estado'},
    {id:'INV-M3-ENCERRADO-TERMINAL-006',name:'EncerradoNaoReabreAmpliado',type:'check',overall:6,scope:'check EncerradoNaoReabreAmpliado for 6 but exactly 2 Estado'},
    {id:'FRAME-M3-STATUS-006',name:'TransicaoNaoInterfereOutrosAmpliado',type:'check',overall:6,scope:'check TransicaoNaoInterfereOutrosAmpliado for 6 but exactly 2 Estado'},
    {id:'WIT-M3-DOIS-FRASCOS-006',name:'TestemunhaDoisFrascosAtivosAmpliado',type:'run',overall:6,scope:'run TestemunhaDoisFrascosAtivosAmpliado for 6 but exactly 2 Estado'},
  ];
  const m3run=execAlloy(loan,m3);
  write('build/formal-validation-m3.json',JSON.stringify({versao:1,alloy:version,solver:m3run.solver,spec_ir_sha256:hash(ir),model:loan,model_sha256:hash(m3run.source),resultados:m3run.results},null,2)+'\n');
  // M4: retirada/devolução compostas. Guard de drift das origens M2.4/M3.
  checkWithdrawalReturnTrace(file => fs.readFileSync(file));
  const m4run=execAlloy(withdrawalReturnModel, withdrawalReturnExpected);
  write('build/formal-validation-m4.json',JSON.stringify({versao:1,alloy:version,solver:m4run.solver,spec_ir_sha256:hash(ir),model:withdrawalReturnModel,model_sha256:hash(m4run.source),origens:withdrawalReturnOrigins.map(model=>({model,model_sha256:hash(fs.readFileSync(model))})),resultados:m4run.results},null,2)+'\n');
  const runMilestone = (model, entries, file, milestone) => {
    const expected = entries.map(([name,type,scope], i) => ({
      id: `${milestone}-${type === 'check' ? 'INV' : 'WIT'}-${String(i + 1).padStart(3, '0')}`,
      name, type, scope,
      overall: scope.includes('for 8') ? 8 : scope.includes('for 7') ? 7 : scope.includes('for 6') ? 6 : 4,
    }));
    const result = execAlloy(model, expected);
    write(file, JSON.stringify({versao: 1, alloy: version, solver: result.solver,
      spec_ir_sha256: hash(ir), model, model_sha256: hash(result.source),
      resultados: result.results}, null, 2) + '\n');
  };
  runMilestone('specification/alloy/reagents/loss_found_quarantine_m5.als', [
    ['ExtravioPreservaFisico','check','check ExtravioPreservaFisico for 4'],
    ['ExtravioMarcaLocalizacao','check','check ExtravioMarcaLocalizacao for 4'],
    ['ExtravioRevogaAutorizacao','check','check ExtravioRevogaAutorizacao for 4'],
    ['ExtravioEncerraEmprestimo','check','check ExtravioEncerraEmprestimo for 4'],
    ['ReencontroImponeQuarentena','check','check ReencontroImponeQuarentena for 6'],
    ['ReencontroPreservaFisico','check','check ReencontroPreservaFisico for 6'],
    ['ReencontroRevogaAutorizacao','check','check ReencontroRevogaAutorizacao for 6'],
    ['QuebradoNaoDisponivel','check','check QuebradoNaoDisponivel for 6'],
    ['FisicosImpedemLiberacao','check','check FisicosImpedemLiberacao for 6'],
    ['DescartadoTerminal','check','check DescartadoTerminal for 6'],
    ['QuarentenaNaoDescartaDireto','check','check QuarentenaNaoDescartaDireto for 6'],
    ['SaldoNaoFabricado','check','check SaldoNaoFabricado for 6'],
    ['WitnessAberto','run','run WitnessAberto for 4'],
    ['WitnessFechado','run','run WitnessFechado for 4'],
    ['WitnessQuebradoCiclo','run','run WitnessQuebradoCiclo for 7 but exactly 6 Estado'],
    ['WitnessExtravioEmprestimo','run','run WitnessExtravioEmprestimo for 4'],
  ], 'build/formal-validation-m5.json', 'M5');
  runMilestone('specification/alloy/reagents/metrology_resolution_m6.als', [
    ['PesoRetornoImutavel','check','check PesoRetornoImutavel for 4'],
    ['ResolucaoEncerraPendencia','check','check ResolucaoEncerraPendencia for 4'],
    ['ResolucaoNaoLiberaQuarentena','check','check ResolucaoNaoLiberaQuarentena for 6'],
    ['RotaFechada','check','check RotaFechada for 6'],
    ['SemCorrecaoAdministrativa','check','check SemCorrecaoAdministrativa for 6'],
    ['RecalibracaoExigeQuarentena','check','check RecalibracaoExigeQuarentena for 6'],
    ['Q06ClassificacaoCoerente','check','check Q06ClassificacaoCoerente for 6'],
    ['WitnessRepetirPesagem','run','run WitnessRepetirPesagem for 4'],
    ['WitnessEsgotamento','run','run WitnessEsgotamento for 4'],
    ['WitnessRecalibracao','run','run WitnessRecalibracao for 6'],
    ['WitnessGanhoQ06','run','run WitnessGanhoQ06 for 6'],
    ['WitnessRetornoDentroQ06','run','run WitnessRetornoDentroQ06 for 6'],
  ], 'build/formal-validation-m6.json', 'M6');
  runMilestone('specification/alloy/operations/idempotency_m7.als', [
    ['IdentidadeUnicaNaoDuplicaEfeito','check','check IdentidadeUnicaNaoDuplicaEfeito for 4'],
    ['RetryNaoReexecuta','check','check RetryNaoReexecuta for 6'],
    ['ReusoIncompativelRejeitado','check','check ReusoIncompativelRejeitado for 6'],
    ['EventoDeduplicado','check','check EventoDeduplicado for 6'],
    ['MaterializacaoSubstitutiva','check','check MaterializacaoSubstitutiva for 6'],
    ['TransicoesPreservamCoerencia','check','check TransicoesPreservamCoerencia for 6'],
    ['WitnessPrimeiraExecucao','run','run WitnessPrimeiraExecucao for 4'],
    ['WitnessRetry','run','run WitnessRetry for 6 but exactly 3 Store'],
    ['WitnessEventoDuplicado','run','run WitnessEventoDuplicado for 6'],
    ['WitnessMaterializacao','run','run WitnessMaterializacao for 6'],
  ], 'build/formal-validation-m7.json', 'M7');
  runMilestone('specification/alloy/reagents/stock_cache_scarcity_m8.als', [
    ['ExtraviadoNuncaApto','check','check ExtraviadoNuncaApto for 6'],
    ['QuarentenaNuncaApta','check','check QuarentenaNuncaApta for 6'],
    ['FisicoImpedidoNuncaApto','check','check FisicoImpedidoNuncaApto for 6'],
    ['EmprestadoNaoApto','check','check EmprestadoNaoApto for 6'],
    ['PendenciaNuncaApta','check','check PendenciaNuncaApta for 6'],
    ['VencidoSemAutorizacaoNaoApto','check','check VencidoSemAutorizacaoNaoApto for 6'],
    ['AptoNuncaDescartado','check','check AptoNuncaDescartado for 6'],
    ['AbaixoDoLimiarEhEscassez','check','check AbaixoDoLimiarEhEscassez for 6'],
    ['IgualAoLimiarNaoEhEscassez','check','check IgualAoLimiarNaoEhEscassez for 6'],
    ['AcimaDoLimiarNaoEhEscassez','check','check AcimaDoLimiarNaoEhEscassez for 6'],
    ['AlmoxInativoNaoAvalia','check','check AlmoxInativoNaoAvalia for 6'],
    ['ConfigInativaNaoAvalia','check','check ConfigInativaNaoAvalia for 6'],
    ['InvalidacaoMudaGeracaoEInvalida','check','check InvalidacaoMudaGeracaoEInvalida for 4'],
    ['InvalidacaoNaoRecalcula','check','check InvalidacaoNaoRecalcula for 4'],
    ['InvalidacaoImpedeHitValido','check','check InvalidacaoImpedeHitValido for 4'],
    ['PublicacaoExigeMesmaGeracao','check','check PublicacaoExigeMesmaGeracao for 4'],
    ['CacheMudouGeracaoNaoPublica','check','check CacheMudouGeracaoNaoPublica for 4'],
    ['PublicacaoNaoAlteraFatos','check','check PublicacaoNaoAlteraFatos for 4'],
    ['SemEscassezNaoNotifica','check','check SemEscassezNaoNotifica for 6'],
    ['ConfigInativaNaoEmite','check','check ConfigInativaNaoEmite for 6'],
    ['NotificacaoDesativadaNaoEmite','check','check NotificacaoDesativadaNaoEmite for 6'],
    ['GestorNaoVinculadoNaoRecebe','check','check GestorNaoVinculadoNaoRecebe for 6'],
    ['AlmoxInativoNaoEmite','check','check AlmoxInativoNaoEmite for 6'],
    ['RetryNaoDuplicaNotificacao','check','check RetryNaoDuplicaNotificacao for 6'],
    ['NotificacaoUnicaPorDia','check','check NotificacaoUnicaPorDia for 6'],
    ['WitnessFechadoApto','run','run WitnessFechadoApto for 4'],
    ['WitnessAbertoApto','run','run WitnessAbertoApto for 4'],
    ['WitnessVencidoAutorizadoApto','run','run WitnessVencidoAutorizadoApto for 4'],
    ['WitnessSaldoDesconhecidoApto','run','run WitnessSaldoDesconhecidoApto for 4'],
    ['WitnessEscassezAbaixo','run','run WitnessEscassezAbaixo for 4'],
    ['WitnessLimiteExato','run','run WitnessLimiteExato for 4'],
    ['WitnessAcimaDoLimite','run','run WitnessAcimaDoLimite for 4'],
    ['WitnessCacheMissCalculaEPublica','run','run WitnessCacheMissCalculaEPublica for 4'],
    ['WitnessCacheHit','run','run WitnessCacheHit for 4'],
    ['WitnessInvalidacao','run','run WitnessInvalidacao for 4'],
    ['WitnessGeracaoMudou','run','run WitnessGeracaoMudou for 4'],
    ['WitnessNovoCalculoAposInvalidacao','run','run WitnessNovoCalculoAposInvalidacao for 4'],
    ['WitnessEscassezComNotificacao','run','run WitnessEscassezComNotificacao for 6'],
    ['WitnessEscassezSilenciada','run','run WitnessEscassezSilenciada for 6'],
    ['WitnessNovaNotificacaoOutroDia','run','run WitnessNovaNotificacaoOutroDia for 6 but exactly 3 Store'],
  ], 'build/formal-validation-m8.json', 'M8');
  runMilestone('specification/alloy/operations/authorization_m9.als', [
    ['UsuarioInativoNuncaAutorizado','check','check UsuarioInativoNuncaAutorizado for 8 but exactly 2 Escopo'],
    ['PapelNaoPermitidoNaoAutoriza','check','check PapelNaoPermitidoNaoAutoriza for 8 but exactly 2 Escopo'],
    ['SemVinculoNecessarioNega','check','check SemVinculoNecessarioNega for 8 but exactly 2 Escopo'],
    ['OwnershipErradoNega','check','check OwnershipErradoNega for 8 but exactly 2 Escopo'],
    ['ClaimObsoletaNaoRestauraAutorizacao','check','check ClaimObsoletaNaoRestauraAutorizacao for 8 but exactly 2 Escopo'],
    ['VinculoRevogadoRemoveAutorizacao','check','check VinculoRevogadoRemoveAutorizacao for 8 but exactly 2 Escopo'],
    ['PapelRevogadoRemoveAutorizacao','check','check PapelRevogadoRemoveAutorizacao for 8 but exactly 2 Escopo'],
    ['DesativacaoRemoveAutorizacao','check','check DesativacaoRemoveAutorizacao for 8 but exactly 2 Escopo'],
    ['RevogadoAntesDoCommitNaoPodeCommitar','check','check RevogadoAntesDoCommitNaoPodeCommitar for 8 but exactly 2 Escopo'],
    ['AutorizacaoNaoBypassaDominio','check','check AutorizacaoNaoBypassaDominio for 8 but exactly 2 Escopo'],
    ['ChefeNaoBypassaDominio','check','check ChefeNaoBypassaDominio for 8 but exactly 2 Escopo'],
    ['ServerOwnedNuncaEscritaCliente','check','check ServerOwnedNuncaEscritaCliente for 8 but exactly 2 Escopo'],
    ['RevalidacaoNoCommitPermiteSomenteAtual','check','check RevalidacaoNoCommitPermiteSomenteAtual for 8 but exactly 2 Escopo'],
    ['WitnessChefeGerenciaUsuario','run','run WitnessChefeGerenciaUsuario for 8 but exactly 2 Escopo'],
    ['WitnessGestorNoEscopo','run','run WitnessGestorNoEscopo for 8 but exactly 2 Escopo'],
    ['WitnessProfessorProprio','run','run WitnessProfessorProprio for 8 but exactly 2 Escopo'],
    ['WitnessVersaoCorrente','run','run WitnessVersaoCorrente for 8 but exactly 2 Escopo'],
    ['WitnessClaimAntigaAposRevogacao','run','run WitnessClaimAntigaAposRevogacao for 8 but exactly 2 Escopo, exactly 2 Estado'],
    ['WitnessCommitPermitidoSemRevogacao','run','run WitnessCommitPermitidoSemRevogacao for 8 but exactly 2 Escopo'],
    ['WitnessNegacaoPorEscopo','run','run WitnessNegacaoPorEscopo for 8 but exactly 2 Escopo'],
    ['WitnessNegacaoPorOwnership','run','run WitnessNegacaoPorOwnership for 8 but exactly 2 Escopo'],
    ['WitnessChefeDominioInvalidoNaoComita','run','run WitnessChefeDominioInvalidoNaoComita for 8 but exactly 2 Escopo'],
  ], 'build/formal-validation-m9.json', 'M9');
}
const cmd=process.argv[2];
if(cmd==='spec-check') specCheck();
else if(cmd==='spec-export') specExport();
else if(cmd==='alloy-check') alloyCheck();
else throw new Error('Uso: node tools/formal/check.mjs spec-check|spec-export|alloy-check');
console.log(`${cmd}: PASS`);
