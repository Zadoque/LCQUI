// Guard de drift do M13: a Notificação unificada deve permanecer alinhada entre
// modelo Alloy, orquestrador, validador Rust, LaTeX e a fonte normativa.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const alloy = fs.readFileSync('specification/alloy/operations/notificacoes_m13.als', 'utf8');
const check = fs.readFileSync('tools/formal/check.mjs', 'utf8');
const orchestration = fs.readFileSync('tools/formal/m13_composition.mjs', 'utf8');
const rust = fs.readFileSync('tools/spec-doc/src/validation_m13.rs', 'utf8');
const render = fs.readFileSync('tools/spec-doc/src/render.rs', 'utf8');
const mainTex = fs.readFileSync('documentation/main.tex', 'utf8');
const m13Tex = fs.readFileSync('documentation/Formal-Spec-M13.tex', 'utf8');
const docs7 = fs.readFileSync('documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex', 'utf8');

test('M13 preserva predicados, rotas e pontes da notificação unificada', () => {
  for (const pred of [
    'pred acessoAtual',
    'pred caixaDe',
    'pred navegar',
    'pred alunoAcessoPost',
    'pred acessoProfessorRoteiro',
    'pred podeEmitirUrl',
    'pred rotaAcademicaPost',
    'pred rotaChefeAdmin',
    'pred rotaChefeRoteiro',
    'pred visaoComentario',
    'pred emitir',
    'pred marcarLida',
    'pred limparTudo',
    'pred expirar',
  ]) {
    assert.ok(alloy.includes(pred), `predicado M13 ausente: ${pred}`);
  }
  for (const assertion of [
    'assert NaoLeCaixaAlheia',
    'assert SemDelete',
    'assert LimparTudoCorteEstavel',
    'assert ExpiracaoDistingueNull',
    'assert AlertaNaoContornaAcl',
    'assert RotaAcademicaExigePapel',
    'assert ChefeLegadoNaoUsaAcademico',
    'assert ChefeSemEscopoNaoEmiteUrl',
    'assert PonteRotaChefeRoteiroRefinaUrl',
    'assert ColegaVeAviso',
    'assert EmissaoMesmaIdentidadeNaoDuplica',
    'assert IdTurmaAcademicoObrigatorio',
  ]) {
    assert.ok(alloy.includes(assertion), `assertion M13 ausente: ${assertion}`);
  }
});

test('M13 orquestração, validação Rust, LaTeX e fonte normativa registram a prova', () => {
  assert.match(orchestration, /notificacoes_m13\.als/);
  assert.match(orchestration, /composition_m12\.als/);
  assert.match(orchestration, /checkM13AcademicTypes/);
  assert.match(check, /m13_composition\.mjs/);
  assert.match(check, /checkM13AcademicTypes/);
  assert.match(check, /build\/formal-validation-m13\.json/);
  assert.match(rust, /specification\/alloy\/operations\/notificacoes_m13\.als/);
  assert.match(rust, /composition_m12\.als/);
  assert.match(rust, /M13-INV-001/);
  assert.match(rust, /M13-WIT-059/);
  assert.match(rust, /origins: \[&\[u8\]; 6\]/);
  assert.match(render, /pub fn render_m13/);
  assert.match(mainTex, /\\input\{Formal-Spec-M13\.tex\}/);
  assert.match(m13Tex, /Notificação unificada/);
  assert.match(m13Tex, /TURMA\\_ARQUIVADA/);
  assert.match(docs7, /sec:regras-notificacoes-m13/);
  assert.match(docs7, /RN-M13-08/);
  assert.match(docs7, /Obrigações V1 de emissão por tipo/);
});
