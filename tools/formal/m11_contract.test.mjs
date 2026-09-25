// Guard de drift M11: enums fechados, nomes canônicos e predicados centrais
// devem permanecer alinhados entre a documentação normativa, o shape CUE, o
// modelo Alloy e a validação Rust. Não duplica o parsing frágil.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cue = fs.readFileSync('specification/cue/domain/formal_m11.cue', 'utf8');
const alloy = fs.readFileSync('specification/alloy/operations/turmas_m11.als', 'utf8');
const rust = fs.readFileSync('tools/spec-doc/src/validation_m11.rs', 'utf8');
const docs7 = fs.readFileSync('documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex', 'utf8');
const docs4 = fs.readFileSync('documentation/Section-4-Modelagem-Entidades-SQL-3FN.tex', 'utf8');
const docs8 = fs.readFileSync('documentation/Section-8-Descricao-das-telas-Dashboards.tex', 'utf8');
const docs = docs7 + docs4 + docs8;

test('M11 mantém o enum de status da turma entre documentação, CUE e Alloy', () => {
  for (const value of ['Ativo', 'Arquivada']) {
    assert.match(cue, new RegExp(`"${value}"`), `status turma CUE ausente: ${value}`);
    assert.match(docs, new RegExp(value), `status turma documental ausente: ${value}`);
  }
  assert.match(alloy, /\bAtivo\b/);
  assert.match(alloy, /\bArquivada\b/);
});

test('M11 mantém os enums de convite e evento entre CUE e Alloy', () => {
  for (const value of ['pendente', 'aceitado', 'expirado']) {
    assert.match(cue, new RegExp(`"${value}"`), `status convite CUE ausente: ${value}`);
  }
  for (const value of ['Pendente', 'Aceitado', 'Expirado']) {
    assert.match(alloy, new RegExp(`\\b${value}\\b`), `status convite Alloy ausente: ${value}`);
  }
  for (const value of ['CODIGO', 'CONVITE']) {
    assert.match(cue, new RegExp(`"${value}"`), `modo CUE ausente: ${value}`);
  }
  assert.match(alloy, /\bPorCodigo\b/);
  assert.match(alloy, /\bPorConvite\b/);
  for (const value of ['inclusao_aluno', 'exclusao_aluno']) {
    assert.match(cue, new RegExp(`"${value}"`), `evento CUE ausente: ${value}`);
  }
  assert.match(alloy, /\bInclusao\b/);
  assert.match(alloy, /\bExclusao\b/);
});

test('M11 preserva os nomes canônicos do contrato nas fontes', () => {
  for (const value of [
    'id_professor',
    'id_materia',
    'capacidade',
    'codigo_turma',
    'qtd_alunos',
    'exceder_capacidade',
    'justificativa_excecao',
    'aceitado_por',
    'aceitado_em',
    'token_hash',
    'modo_ingresso',
  ]) {
    assert.match(cue, new RegExp(value), `nome CUE ausente: ${value}`);
    assert.match(docs, new RegExp(value.replaceAll('_', '\\\\_')), `nome documental ausente: ${value}`);
  }
  assert.match(rust, /M11-INV-001/);
  assert.match(rust, /M11-WIT-050/);
});

test('M11 preserva os predicados e assertions centrais do Alloy', () => {
  for (const pred of [
    'pred podeGerirTurma',
    'pred ingressarOrdinario',
    'pred aceitarConviteTurma',
    'pred aceitarConviteGlobal',
    'pred revogarAcesso',
    'pred retryM7',
    'pred criarNovoConviteAposTerminalidade',
  ]) {
    assert.ok(alloy.includes(pred), `predicado Alloy ausente: ${pred}`);
  }
  for (const assertion of [
    'assert EdicaoCapacidadeNaoAbaixoOcupacao',
    'assert ExcecaoNaoEhBypassGenerico',
    'assert SemVagaNaoHaIngressoOrdinario',
    'assert AceitarGlobalNaoMatricula',
    'assert EspelhoNaoSobreviveRemocao',
    'assert AceitarConsomeUmaVez',
    'assert PendenciaUnicaPorEmailContexto',
    'assert RevogacaoImpedeCommit',
  ]) {
    assert.ok(alloy.includes(assertion), `assertion Alloy ausente: ${assertion}`);
  }
});

test('M11 documento normativo, decisão humana e fronteira de espelho', () => {
  assert.match(docs7, /\\label\{sec:regras-turmas-m11\}/, 'label normativo ausente');
  assert.match(docs7, /HQ-M11-001 = A/, 'decisão HQ-M11-001 ausente');
  assert.match(docs7, /qtd\\_alunos > capacidade/, 'estado de exceção acima da capacidade ausente');
  assert.match(docs7, /vínculo canônico/i, 'menção ao vínculo canônico ausente');
});

test('M11 Rust valida proveniência e regras determinísticas', () => {
  assert.match(rust, /specification\/alloy\/operations\/turmas_m11\.als/);
  assert.match(rust, /normalizar_email/);
  assert.match(rust, /ingresso_permitido/);
  assert.match(rust, /edicao_capacidade_permitida/);
  assert.match(rust, /pub fn check\(&self, ir: &\[u8\], model: &\[u8\]\) -> bool/);
});

// Executa as regras documentadas de forma determinística, espelhando o Rust.
function ingressoPermitido(qtd, cap, excede) {
  return cap >= 1 && qtd >= 0 && (qtd < cap || excede);
}
function edicaoPermitida(qtd, nova) {
  return nova >= 1 && nova >= qtd;
}
function normalizarEmail(entrada) {
  const normalizado = entrada.trim().toLowerCase();
  return normalizado === '' || [...normalizado].length > 150 ? null : normalizado;
}

test('M11 regras determinísticas respeitam a decisão HQ-M11-001 = A', () => {
  assert.equal(ingressoPermitido(4, 5, false), true);
  assert.equal(ingressoPermitido(5, 5, false), false);
  assert.equal(ingressoPermitido(5, 5, true), true);
  assert.equal(ingressoPermitido(8, 5, true), true);
  assert.equal(edicaoPermitida(5, 5), true);
  assert.equal(edicaoPermitida(5, 7), true);
  assert.equal(edicaoPermitida(5, 4), false);
  assert.equal(edicaoPermitida(0, 0), false);
  assert.equal(normalizarEmail(' Aluno@UENF.br '), 'aluno@uenf.br');
  assert.equal(normalizarEmail('   '), null);
});
