// Guard de drift do fechamento M12: a composição M12.1 x M12.2 deve permanecer
// alinhada entre modelo Alloy, orquestrador, validador Rust, LaTeX e a fonte
// normativa. Não duplica o parsing frágil da prova (ver m12_composition.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const alloy = fs.readFileSync('specification/alloy/operations/composition_m12.als', 'utf8');
const check = fs.readFileSync('tools/formal/check.mjs', 'utf8');
const orchestration = fs.readFileSync('tools/formal/m12_composition.mjs', 'utf8');
const rust = fs.readFileSync('tools/spec-doc/src/validation_m12.rs', 'utf8');
const render = fs.readFileSync('tools/spec-doc/src/render.rs', 'utf8');
const mainTex = fs.readFileSync('documentation/main.tex', 'utf8');
const m12Tex = fs.readFileSync('documentation/Formal-Spec-M12.tex', 'utf8');
const docs7 = fs.readFileSync('documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex', 'utf8');

test('M12 composição preserva predicados, assertions e ponte entre as fatias', () => {
  for (const pred of [
    'pred ponteAcessoRoteiro',
    'pred coerenteComposta',
    'pred publicarPostComAnexo',
    'pred compartilharRoteiro',
    'pred revogarCompartilhamentoComposto',
    'pred manterAnexoComposto',
    'pred desvincularPostComposto',
    'pred removerPostApresentacaoComposto',
    'pred emitirUrlComposto',
    'pred registrarAuditoriaQ13Composto',
    'pred promoverChefeComposto',
  ]) {
    assert.ok(alloy.includes(pred), `predicado de composição ausente: ${pred}`);
  }
  for (const assertion of [
    'assert PublicacaoCompostaRefinaAcessoM12_1',
    'assert PublicacaoCompostaProvaGeracao',
    'assert RevogacaoCompostaPreservaPost',
    'assert RevogadoNaoMantemAnexoSemAcesso',
    'assert RotaAcademicaExigePapelEVinculo',
    'assert ChefeComVinculoLegadoNaoBaixaComposto',
    'assert ChefeNaoPublicaPostComposto',
    'assert ChefeSemEscopoNaoEmiteComposto',
    'assert PrimeiraExecucaoCompostaProduzReceipt',
    'assert ReusoIncompativelCompostoNaoHerda',
  ]) {
    assert.ok(alloy.includes(assertion), `assertion de composição ausente: ${assertion}`);
  }
});

test('M12 orquestração, validação Rust e LaTeX registram a prova conjunta', () => {
  assert.match(orchestration, /composition_m12\.als/);
  assert.match(orchestration, /posts_m12_1\.als/);
  assert.match(orchestration, /roteiros_m12_2\.als/);
  assert.match(check, /m12_composition\.mjs/);
  assert.match(check, /build\/formal-validation-m12\.json/);
  assert.match(rust, /specification\/alloy\/operations\/composition_m12\.als/);
  assert.match(rust, /posts_m12_1\.als/);
  assert.match(rust, /roteiros_m12_2\.als/);
  assert.match(rust, /M12-INV-001/);
  assert.match(rust, /M12-WIT-055/);
  assert.match(rust, /pub fn check\(&self, ir: &\[u8\], model: &\[u8\], origins: \[&\[u8\]; 2\]\) -> bool/);
  assert.match(render, /pub fn render_m12/);
  assert.match(mainTex, /\\input\{Formal-Spec-M12\.tex\}/);
  assert.match(m12Tex, /composição M12\.1/);
  assert.match(m12Tex, /papel acadêmico/);
});

test('M12 fonte normativa distingue papel acadêmico de vínculo canônico', () => {
  assert.match(docs7, /papel acadêmico autorizado/i);
  assert.match(docs7, /vínculo legado/i);
});
