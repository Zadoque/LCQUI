// Guard de drift: o modelo M8 copia as dimensões Fisico/Localizacao/Disp de M5.
// A cópia é inevitável na arquitetura Alloy atual; este teste compara os dois
// modelos mecanicamente e registra M5 como origem.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const M5 = 'specification/alloy/reagents/loss_found_quarantine_m5.als';
const M8 = 'specification/alloy/reagents/stock_cache_scarcity_m8.als';

function sigValues(src, base) {
  const match = src.match(new RegExp(`one sig ([A-Z_,\\s]+?) extends ${base} \\{\\}`));
  assert.ok(match, `sig ${base} ausente`);
  return match[1]
    .split(',')
    .map(value => value.trim())
    .sort();
}

test('M8 reutiliza as dimensões de M5 sem divergência', () => {
  const m5 = fs.readFileSync(M5, 'utf8');
  const m8 = fs.readFileSync(M8, 'utf8');
  for (const base of ['Fisico', 'Localizacao', 'Disp']) {
    assert.deepEqual(sigValues(m8, base), sigValues(m5, base), `divergência em ${base}`);
  }
});

test('M8 mantém a aptidão única e a fronteira estrita de escassez', () => {
  const m8 = fs.readFileSync(M8, 'utf8');
  assert.match(m8, /pred frascoApto\[s: Store, f: Frasco\]/);
  assert.match(m8, /pred escassez\[s: Store, c: Config\]/);
  assert.match(m8, /#aptos\[s, c\] < c\.limiar/);
  assert.match(m8, /s\.localizacao\[f\] = LOCALIZADO/);
});
