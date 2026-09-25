// Guard de drift M10: enums fechados, nomes canônicos e predicados centrais
// devem permanecer alinhados entre a documentação normativa, o shape CUE, o
// modelo Alloy e a canonicalização em Rust. Não duplica o parsing frágil.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cue = fs.readFileSync('specification/cue/domain/formal_m10.cue', 'utf8');
const alloy = fs.readFileSync('specification/alloy/operations/patrimony_m10.als', 'utf8');
const rust = fs.readFileSync('tools/spec-doc/src/validation_m10.rs', 'utf8');
const docs4 = fs.readFileSync('documentation/Section-4-Modelagem-Entidades-SQL-3FN.tex', 'utf8');
const docs7 = fs.readFileSync('documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex', 'utf8');
const docs10 = fs.readFileSync(
  'documentation/Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/' +
    'Section-10-Subsection-8-Fluxo-de-Bens-Patrimoniais.tex',
  'utf8',
);
const docs = docs4 + docs7 + docs10;

test('M10 mantém o enum de status entre documentação, CUE e Alloy', () => {
  const status = ['Ativo', 'Inservivel', 'Ja_dado_baixa'];
  const alloyStatus = ['Ativo', 'Inservivel', 'JaDadoBaixa'];
  for (const value of status) assert.match(cue, new RegExp(`"${value}"`), `status CUE ausente: ${value}`);
  for (const value of alloyStatus) assert.match(alloy, new RegExp(`\\b${value}\\b`), `status Alloy ausente: ${value}`);
  assert.match(docs, /Ativo -> Inservivel -> Ja\\_dado\\_baixa/, 'cadeia V1 ausente da documentação');
});

test('M10 mantém o enum de conservação entre documentação, CUE e Alloy', () => {
  for (const value of ['BOM', 'REGULAR', 'RUIM']) {
    assert.match(cue, new RegExp(`"${value}"`), `conservação CUE ausente: ${value}`);
    assert.match(alloy, new RegExp(`\\b${value}\\b`), `conservação Alloy ausente: ${value}`);
  }
  assert.match(docs4, /BOM, REGULAR, RUIM/, 'conservação documental ausente');
});

test('M10 mantém os tipos de lock e histórico entre documentação, CUE e Alloy', () => {
  for (const value of ['EDICAO', 'ADICAO']) {
    assert.match(cue, new RegExp(`"${value}"`), `tipo de lock CUE ausente: ${value}`);
    assert.match(alloy, new RegExp(`\\b${value}\\b`), `tipo de lock Alloy ausente: ${value}`);
    assert.match(docs4, new RegExp(value), `tipo de lock documental ausente: ${value}`);
  }
  for (const value of ['cadastro', 'edicao', 'baixa']) {
    assert.match(cue, new RegExp(`"${value}"`), `tipo de histórico CUE ausente: ${value}`);
    assert.match(docs4, new RegExp(value), `tipo de histórico documental ausente: ${value}`);
  }
  for (const value of ['EvCadastro', 'EvEdicao', 'EvBaixa']) {
    assert.match(alloy, new RegExp(`\\b${value}\\b`), `tipo de histórico Alloy ausente: ${value}`);
  }
});

test('M10 preserva os nomes canônicos do contrato', () => {
  for (const value of [
    'Resumo',
    'numero_patrimonio',
    'id_resumo_bem_patrimonial',
    'estado_conservacao',
    'documento_dado_baixa_pdf_url',
    'versao_bem_origem',
    'numero_patrimonio_normalizado',
    'id_requisicao',
    'chave_recurso',
  ]) {
    assert.match(cue, new RegExp(value), `nome CUE ausente: ${value}`);
  }
  for (const value of ['reservas', 'Plaqueta', 'Resumo', 'Bem']) {
    assert.match(alloy, new RegExp(`\\b${value}\\b`), `nome Alloy ausente: ${value}`);
  }
});

test('M10 preserva os predicados centrais e a composição M7/M9', () => {
  assert.match(alloy, /pred aprovarEdicao\[a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario, ev: Evento\]/);
  assert.match(alloy, /pred aprovarAdicao\[a, b: Estado, r: ReqAdicao, lk: Lock, u: Usuario, nb: Bem, ev: Evento\]/);
  assert.match(alloy, /pred baixar\[a, b: Estado, bm: Bem, u: Usuario, c: Comprovante, ev: Evento\]/);
  assert.match(alloy, /pred conflitoVersaoEdicao\[a, b: Estado, r: ReqEdicao, lk: Lock, u: Usuario\]/);
  assert.match(alloy, /pred conflitoUnicidadeAdicao\[a, b: Estado, r: ReqAdicao, lk: Lock, u: Usuario\]/);
  assert.match(alloy, /pred podeAprovarPatrimonio\[s: Estado, u: Usuario\]/);
  assert.match(alloy, /pred retryM7\[a, b: Estado\]/);
  // lock != Chaves_Unicas
  assert.match(alloy, /reservas:       Plaqueta -> lone Bem/);
  assert.match(alloy, /locks:          set Lock/);
});

test('M10 canonicalização N(s)=trim().toUpperCase() documentada e em Rust', () => {
  assert.match(docs7, /trim\(\)\.toUpperCase\(\)/, 'canonicalização ausente na Seção 7');
  assert.match(rust, /entrada\.trim\(\)\.to_uppercase\(\)/);
  assert.match(rust, /normalizar_numero_patrimonio/);
  assert.match(rust, /" 00123 "/, 'teste de preservação de zeros ausente');
});

// Executa a regra documentada de forma determinística, espelhando o Rust.
function normalizarNumeroPatrimonio(entrada) {
  const normalizado = entrada.trim().toUpperCase();
  return normalizado === '' || [...normalizado].length > 30 ? null : normalizado;
}

test('M10 canonicalização preserva zeros e rejeita vazio/excesso', () => {
  assert.equal(normalizarNumeroPatrimonio('abc-123'), 'ABC-123');
  assert.equal(normalizarNumeroPatrimonio(' ABC-123 '), 'ABC-123');
  assert.equal(normalizarNumeroPatrimonio('abc-123 '), 'ABC-123');
  assert.equal(normalizarNumeroPatrimonio(' 00123 '), '00123');
  assert.equal(normalizarNumeroPatrimonio('   '), null);
  assert.equal(normalizarNumeroPatrimonio('a'.repeat(31)), null);
});
