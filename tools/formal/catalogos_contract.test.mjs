import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const modelPath = 'specification/alloy/operations/catalogos_v2.als';

test('CATALOGOS-001: o modelo Alloy fixa catálogos independentes e manifesto compatível', () => {
  const model = fs.readFileSync(modelPath, 'utf8');
  for (const nome of ['Resumos', 'Especificacoes', 'Substancias', 'Materias']) assert.match(model, new RegExp(`\\b${nome}\\b`));
  for (const predicado of ['mutacaoFonte', 'edicaoMateria', 'publicacaoIndependente']) assert.match(model, new RegExp(`pred ${predicado}`));
  for (const assertion of ['ManifestoRefletePublicadas', 'MutacaoNaoVazaParaOutroCatalogo', 'EdicaoDeMateriaNaoMexeNosDemais', 'PublicacaoNaoRegride']) {
    assert.match(model, new RegExp(`assert ${assertion}`));
  }
});

test('CATALOGOS-002: o contrato CUE exige as quatro versões no manifesto', () => {
  const cue = fs.readFileSync('specification/cue/domain/catalogos.cue', 'utf8');
  for (const nome of ['resumos', 'especificacoes', 'substancias', 'materias']) {
    assert.match(cue, new RegExp(`\\b${nome}:`));
  }
  assert.match(cue, /schema_version:\s+2/);
});
