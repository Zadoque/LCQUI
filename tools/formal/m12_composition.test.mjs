import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {composedModelM12, originsM12, checkM12CompositionTrace} from './m12_composition.mjs';
const read = p => fs.readFileSync(p, 'utf8');
test('M12 trace accepts original sources and rejects independent drift', () => {
  checkM12CompositionTrace(read);
  for (const [file, before, after] of [
    [originsM12[0], 'and s.statusT[t] = Ativo', 'and s.statusT[t] = Arquivada'],
    [originsM12[1], 'p not in s.postRemovido', 'p in s.postRemovido'],
    [composedModelM12, 'p not in s.postRemovido', 'p in s.postRemovido'],
    [composedModelM12, 'roteiroStatus[r] = Publicavel', 'roteiroStatus[r] = Validado'],
  ]) {
    const modified = read(file).replace(before, after);
    assert.notEqual(modified, read(file));
    assert.throws(() => checkM12CompositionTrace(p => p === file ? modified : read(p)), /Drift/);
  }
});
