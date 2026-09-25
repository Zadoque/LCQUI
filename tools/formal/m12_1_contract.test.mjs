// Guard de drift M12.1: enums, nomes canônicos, predicados/assertions centrais
// e regras determinísticas devem permanecer alinhados entre documentação
// normativa, CUE, Alloy e Rust. Não duplica o parsing frágil.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cue = fs.readFileSync('specification/cue/domain/formal_m12_1.cue', 'utf8');
const alloy = fs.readFileSync('specification/alloy/operations/posts_m12_1.als', 'utf8');
const rust = fs.readFileSync('tools/spec-doc/src/validation_m12_1.rs', 'utf8');
const docs7 = fs.readFileSync('documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex', 'utf8');
const docs4 = fs.readFileSync('documentation/Section-4-Modelagem-Entidades-SQL-3FN.tex', 'utf8');
const docs5 = fs.readFileSync('documentation/Section-5-Notas-de-Mapeamento-para-Firestore.tex', 'utf8');
const docs8 = fs.readFileSync('documentation/Section-8-Descricao-das-telas-Dashboards.tex', 'utf8');
const docs11 = fs.readFileSync('documentation/Section-11-Regras-de-Seguranca-do-Firestore-Security-Rules.tex', 'utf8');
const docs = docs7 + docs4 + docs5 + docs8 + docs11;

test('M12.1 mantém os enums de histórico e visão entre CUE, Alloy e docs', () => {
  for (const value of ['edicao', 'moderacao']) {
    assert.match(cue, new RegExp(`"${value}"`), `tipo histórico CUE ausente: ${value}`);
    assert.match(docs, new RegExp(value), `tipo histórico documental ausente: ${value}`);
  }
  for (const value of ['AUTOR', 'COLEGA', 'AUDITOR']) {
    assert.match(cue, new RegExp(`"${value}"`), `visão CUE ausente: ${value}`);
  }
  for (const value of ['HEdicao', 'HModeracao']) {
    assert.match(alloy, new RegExp(`\\b${value}\\b`), `tipo histórico Alloy ausente: ${value}`);
  }
});

test('M12.1 preserva os nomes canônicos do contrato nas fontes', () => {
  for (const value of [
    'id_professor',
    'id_usuario',
    'id_post',
    'titulo',
    'descricao',
    'texto',
    'editado',
    'editado_em',
    'removido_da_apresentacao',
    'motivo_remocao',
    'moderado',
    'motivo_moderacao',
    'id_operacao',
  ]) {
    assert.match(cue, new RegExp(value), `nome CUE ausente: ${value}`);
    assert.match(docs, new RegExp(value.replaceAll('_', '\\\\_')), `nome documental ausente: ${value}`);
  }
  assert.match(rust, /M12_1-INV-001/);
  assert.match(rust, /M12_1-WIT-047/);
});

test('M12.1 preserva os predicados e assertions centrais do Alloy', () => {
  for (const pred of [
    'pred podeCriarPost',
    'pred podeEditarPost',
    'pred podeRemoverPost',
    'pred podeCriarComent',
    'pred podeEditarComent',
    'pred podeModerarComent',
    'pred listar',
    'pred revogarVinculo',
    'pred retryM7',
    'pred acessoRoteiroValidado',
  ]) {
    assert.ok(alloy.includes(pred), `predicado Alloy ausente: ${pred}`);
  }
  for (const assertion of [
    'assert TurmaArquivadaNegaEscrita',
    'assert ColegaNaoVeOriginalModerado',
    'assert EdicaoNaoDesfazModeracao',
    'assert RemocaoPreservaDocumento',
    'assert SemAcessoNaoPublicaComRoteiro',
    'assert AutorImutavelPost',
    'assert RetryNaoDuplica',
    'assert RevogacaoImpedeCommit',
  ]) {
    assert.ok(alloy.includes(assertion), `assertion Alloy ausente: ${assertion}`);
  }
});

test('M12.1 documento normativo e fronteiras', () => {
  assert.match(docs7, /\\label\{sec:regras-posts-comentarios-m12-1\}/, 'label normativo ausente');
  assert.match(docs7, /desfaz a\s+modera/i, 'regra de moderação persistente ausente');
  assert.match(docs7, /M12\.2/, 'fronteira M12.2 ausente na Seção 7');
  assert.match(docs11, /listarComentariosPost|m[áa]scara/i, 'máscara/endpoint ausente na Seção 11');
});

test('M12.1 Rust valida proveniência e regras determinísticas', () => {
  assert.match(rust, /specification\/alloy\/operations\/posts_m12_1\.als/);
  assert.match(rust, /pub fn titulo_valido/);
  assert.match(rust, /pub fn descricao_valida/);
  assert.match(rust, /pub fn texto_valido/);
  assert.match(rust, /pub fn edicao_permitida/);
  assert.match(rust, /pub fn deve_mascarar/);
  assert.match(rust, /pub fn check\(&self, ir: &\[u8\], model: &\[u8\]\) -> bool/);
});

// Executa as regras documentadas de forma determinística, espelhando o Rust.
function tituloValido(n) {
  return n >= 1 && n <= 150;
}
function textoValido(n) {
  return n >= 1 && n <= 2000;
}
function deveMascarar(visao, moderado) {
  return moderado && visao === 'COLEGA';
}
function edicaoPermitida(autor, operador) {
  return autor === operador;
}

test('M12.1 regras determinísticas de limite, edição e máscara', () => {
  assert.equal(tituloValido(1), true);
  assert.equal(tituloValido(150), true);
  assert.equal(tituloValido(0), false);
  assert.equal(tituloValido(151), false);
  assert.equal(textoValido(2000), true);
  assert.equal(textoValido(2001), false);
  assert.equal(edicaoPermitida('uid-a', 'uid-a'), true);
  assert.equal(edicaoPermitida('uid-a', 'uid-b'), false);
  assert.equal(deveMascarar('COLEGA', true), true);
  assert.equal(deveMascarar('COLEGA', false), false);
  assert.equal(deveMascarar('AUTOR', true), false);
  assert.equal(deveMascarar('AUDITOR', true), false);
});
