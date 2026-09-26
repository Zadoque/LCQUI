import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {m13Model, m13CopiedModel, checkM13CompositionTrace} from './m13_composition.mjs';
const read = p => fs.readFileSync(p, 'utf8');
test('M13 trace accepts original source and rejects independent drift', () => {
  checkM13CompositionTrace(read);
  for (const [file, before, after] of [
    [m13CopiedModel, 's.claimVersao[u] = s.versaoPerm[u]', 's.claimVersao[u] >= s.versaoPerm[u]'],
    [m13CopiedModel, 'v.vTurma = t', 'v.vTurma != t'],
    [m13Model, 'u in s.ativos and versaoCorrente[s, u]', 'u in s.ativos or versaoCorrente[s, u]'],
    [m13Model, 'v.vAluno = u and v.vTurma = t', 'v.vAluno = u or v.vTurma = t'],
  ]) {
    const modified = read(file).replace(before, after);
    assert.notEqual(modified, read(file), `mutação não aplicada em ${file}: ${before}`);
    assert.throws(() => checkM13CompositionTrace(p => p === file ? modified : read(p)), /Drift/);
  }
});
