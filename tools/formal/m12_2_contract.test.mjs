// Guard de drift M12.2: enums, nomes canônicos, predicados/assertions centrais,
// fonte normativa e regras determinísticas devem permanecer alinhados entre
// documentação, CUE, Alloy e Rust. Não duplica o parsing frágil.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cue = fs.readFileSync('specification/cue/domain/formal_m12_2.cue', 'utf8');
const cueM121 = fs.readFileSync('specification/cue/domain/formal_m12_1.cue', 'utf8');
const alloy = fs.readFileSync('specification/alloy/operations/roteiros_m12_2.als', 'utf8');
const rust = fs.readFileSync('tools/spec-doc/src/validation_m12_2.rs', 'utf8');
const docs7 = fs.readFileSync('documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex', 'utf8');
const docs5 = fs.readFileSync('documentation/Section-5-Notas-de-Mapeamento-para-Firestore.tex', 'utf8');
const docs8 = fs.readFileSync('documentation/Section-8-Descricao-das-telas-Dashboards.tex', 'utf8');
const docs11 = fs.readFileSync('documentation/Section-11-Regras-de-Seguranca-do-Firestore-Security-Rules.tex', 'utf8');
const docs = docs7 + docs5 + docs8 + docs11;

test('M12.2 mantém os enums de Roteiro/URL entre CUE, Alloy e docs', () => {
  for (const value of ['PROVISORIO', 'VALIDADO', 'PUBLICAVEL']) {
    assert.match(cue, new RegExp(`"${value}"`), `status CUE ausente: ${value}`);
  }
  for (const value of ['Provisorio', 'Validado', 'Publicavel']) {
    assert.match(alloy, new RegExp(`\\b${value}\\b`), `status Alloy ausente: ${value}`);
  }
  for (const value of ['ATIVA', 'EXPIRADA']) {
    assert.match(cue, new RegExp(`"${value}"`), `validade CUE ausente: ${value}`);
  }
  assert.match(cue, /ROTEIRO_COMPARTILHADO/, 'tipo de notificação ausente');
  assert.match(docs, /ROTEIRO\\_COMPARTILHADO/, 'notificação documental ausente');
  assert.match(cue, /#M12_2EscopoAuditoriaQ13:/, 'shape de escopo Q13 ausente no CUE');
});

test('M12.2 preserva os nomes canônicos e a fronteira de M12.1', () => {
  for (const value of [
    'id_professor_upload',
    'storage_path',
    'content_type',
    'tamanho_bytes',
    'owner_uid',
    'geracao',
    'professores_compartilhados',
    'nome_arquivo',
    'id_operacao',
  ]) {
    assert.match(cue, new RegExp(value), `nome CUE ausente: ${value}`);
    assert.match(docs, new RegExp(value.replaceAll('_', '\\\\_')), `nome documental ausente: ${value}`);
  }
  assert.match(rust, /M12_2-INV-001/);
  assert.match(rust, /M12_2-WIT-079/);
  // Refinamento aditivo: M12.2 embute o anexo M12.1 e M12.1 permanece assinado.
  assert.match(cue, /#M12_2RoteiroAnexo: \{[^}]*_refina_m12_1:\s*#M12_1RoteiroAnexo/s, 'projeção de refinamento ausente');
  assert.match(cueM121, /#M12_1RoteiroAnexo:/, 'anexo M12.1 ausente');
});

test('M12.2 preserva os predicados e assertions centrais do Alloy', () => {
  for (const pred of [
    'pred podeEmitirUrl',
    'pred acessoProfessorRoteiro',
    'pred alunoPodeBaixar',
    'pred alunoAcessoPost',
    'pred roteiroPublicavel',
    'pred compartilhadoAtual',
    'pred escopoQ13',
    'pred registrarAuditoriaQ13',
    'pred encerrarAuditoriaQ13',
    'pred emitirUrl',
    'pred compartilhar',
    'pred revogarCompartilhamento',
    'pred anexarPost',
    'pred trocarAnexo',
    'pred manterAnexo',
    'pred desvincularPost',
    'pred retryM7',
  ]) {
    assert.ok(alloy.includes(pred), `predicado Alloy ausente: ${pred}`);
  }
  for (const assertion of [
    'assert DonoImutavel',
    'assert ObjetoNuncaSobrescrito',
    'assert GeracaoNaoMudaSemValidar',
    'assert CadastroComecaProvisorio',
    'assert PublicavelSoDeValidado',
    'assert CompartilhamentoUnico',
    'assert CompartilhamentoSoDePublicavel',
    'assert NaoCompartilhaNaoPublicavel',
    'assert EmissaoExigeAcesso',
    'assert ExAlunoNaoEmite',
    'assert PostRemovidoNegaAluno',
    'assert TurmaArquivadaNegaEscritaRoteiro',
    'assert UrlEmitidaSobreviveARevogacao',
    'assert UrlAtivaUsavel',
    'assert AnexarExigeAcessoAtual',
    'assert ManterExigeAcessoAtual',
    'assert TrocarExigeAcessoAtual',
    'assert HistoricoAnexoNuncaRemovido',
    'assert RemocaoPostPreservaSnapshot',
    'assert ChefeNaoAnexa',
    'assert ChefeSemEscopoNaoEmite',
    'assert EscopoQ13SoDeChefeComPostReferenciado',
    'assert EncerrarEscopoImpedeNovaEmissao',
    'assert UrlEmitidaSobreviveAoEncerramentoEscopo',
    'assert PrimeiraExecucaoProduzReceipt',
    'assert ReusoIncompativelRejeitado',
    'assert RetryNaoReexecuta',
    'assert RevogacaoVinculoImpedeCommit',
    'assert TransicoesPreservamCoerencia',
    'assert CompartilharExigePublicavel',
    'assert RotaAcademicaExigePapel',
    'assert ChefeComVinculoLegadoNaoUsaRotaAcademica',
    'assert PromoverChefePreservaVinculoLegado',
    'assert PromoverChefePreservaCoerencia',
  ]) {
    assert.ok(alloy.includes(assertion), `assertion Alloy ausente: ${assertion}`);
  }
  for (const pred of ['pred promoverChefe']) {
    assert.ok(alloy.includes(pred), `predicado Alloy ausente: ${pred}`);
  }
});

test('M12.2 fonte normativa distingue URL nova, URL emitida e transação', () => {
  assert.match(docs7, /\\label\{sec:regras-roteiros-m12-2\}/, 'label normativo ausente');
  assert.match(docs7, /novas emiss[õo]es/i, 'regra de novas emissões ausente');
  assert.match(docs7, /j[áa] emitida/i, 'regra de URL já emitida ausente');
  assert.match(docs7, /n[ãa]o[^\n]*instant[âa]nea/i, 'não revogação instantânea ausente');
  assert.match(docs7, /n[ãa]o[^\n]*transa[çc][ãa]o [úu]nica/i, 'limite transacional ausente');
  assert.match(docs7, /refina aditivamente/i, 'refinamento aditivo M12.1->M12.2 ausente');
  assert.match(docs, /Q09/, 'Q09 ausente nas fontes');
  assert.match(docs7, /Registro\\_de\\_Auditoria/, 'escopo Q13/auditoria ausente na fonte');
  assert.match(docs7, /Elegibilidade para compartilhamento/i, 'regra de elegibilidade ausente');
  assert.match(docs7, /n[ãa]o pode ser compartilhado/i, 'proibição de compartilhar não publicável ausente');
});

test('M12.2 Rust valida proveniência e regras determinísticas', () => {
  assert.match(rust, /specification\/alloy\/operations\/roteiros_m12_2\.als/);
  assert.match(rust, /pub fn tamanho_valido/);
  assert.match(rust, /pub fn content_type_pdf/);
  assert.match(rust, /pub fn titularidade_ok/);
  assert.match(rust, /pub fn status_publicavel/);
  assert.match(rust, /pub fn anexo_vinculado_ok/);
  assert.match(rust, /pub fn aluno_baixa/);
  assert.match(rust, /pub fn uids_unicos/);
  assert.match(rust, /pub fn escopo_q13_ativo/);
  assert.match(rust, /pub fn check\(&self, ir: &\[u8\], model: &\[u8\]\) -> bool/);
});

// Regras determinísticas espelhando o Rust.
const LIMITE = 15 * 1024 * 1024;
const tamanhoValido = n => n > 0 && n < LIMITE;
const contentPdf = t => t === 'application/pdf';
const titularidadeOk = (upload, owner) => upload === owner;
const alunoBaixa = (papel, vinculo, post) => papel === 'ALUNO' && vinculo && post;
const urlUtilizavel = v => v === 'ATIVA';
const uidsUnicos = a => new Set(a).size === a.length && a.every(u => u.length > 0);
const escopoQ13Ativo = (chefe, roteiro, escopos) =>
  chefe.length > 0 && roteiro.length > 0
  && escopos.some(([c, r]) => c === chefe && r === roteiro);

test('M12.2 regras determinísticas de limite, titularidade, URL e aluno', () => {
  assert.equal(tamanhoValido(1), true);
  assert.equal(tamanhoValido(LIMITE - 1), true);
  assert.equal(tamanhoValido(LIMITE), false);
  assert.equal(tamanhoValido(0), false);
  assert.equal(contentPdf('application/pdf'), true);
  assert.equal(contentPdf('image/png'), false);
  assert.equal(titularidadeOk('prof-1', 'prof-1'), true);
  assert.equal(titularidadeOk('prof-1', 'prof-9'), false);
  assert.equal(alunoBaixa('ALUNO', true, true), true);
  assert.equal(alunoBaixa('ALUNO', false, true), false);
  assert.equal(alunoBaixa('EX_ALUNO', true, true), false);
  assert.equal(urlUtilizavel('ATIVA'), true);
  assert.equal(urlUtilizavel('EXPIRADA'), false);
  assert.equal(uidsUnicos(['prof-2', 'prof-3']), true);
  assert.equal(uidsUnicos(['prof-2', 'prof-2']), false);
  assert.equal(escopoQ13Ativo('chefe-1', 'rot-1', [['chefe-1', 'rot-1']]), true);
  assert.equal(escopoQ13Ativo('chefe-1', 'rot-1', [['chefe-1', 'rot-2']]), false);
  assert.equal(escopoQ13Ativo('chefe-1', 'rot-1', []), false);
});
