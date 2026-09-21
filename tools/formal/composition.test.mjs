import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {composedModel, origins, checkCompositionTrace} from './composition.mjs';
const read = p => fs.readFileSync(p, 'utf8');
test('trace accepts original sources and rejects independent drift', () => {
  checkCompositionTrace(read);
  for (const [file, before, after] of [
    [origins[0], 'lone s.ativos[f]', 'some s.ativos[f]'],
    [origins[1], 'not (viaLote[f] iff viaDireta[f])', '(viaLote[f] or viaDireta[f])'],
    [origins[2], 's.fisico[f] != DESCARTADO', 's.fisico[f] != QUEBRADO'],
    [composedModel, 'lone s.ativos[f]', 'some s.ativos[f]'],
    [composedModel, 'emQuarentena: set Frasco', 'outraQuarentena: set Frasco'],
  ]) {
    const modified = read(file).replace(before, after);
    assert.notEqual(modified, read(file));
    assert.throws(() => checkCompositionTrace(p => p === file ? modified : read(p)), /Drift/);
  }
});
