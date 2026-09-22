import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {withdrawalReturnModel, withdrawalReturnOrigins, checkWithdrawalReturnTrace} from './withdrawal_return.mjs';
const read = p => fs.readFileSync(p, 'utf8');
test('M4 trace accepts originals and rejects drift of reproduced semantics', () => {
  checkWithdrawalReturnTrace(read);
  for (const [file, before, after] of [
    [withdrawalReturnOrigins[0], 's.fisico[f] in VAZIO + QUEBRADO + DESCARTADO implies f not in s.saldoDesconhecido', 's.fisico[f] in VAZIO + QUEBRADO implies f not in s.saldoDesconhecido'],
    [withdrawalReturnOrigins[0], 's.fisico[f] in VAZIO + QUEBRADO + DESCARTADO + EXTRAVIADO', 's.fisico[f] in VAZIO'],
    [withdrawalReturnOrigins[1], 's.status[e] in EM_USO + ATRASADO', 's.status[e] in EM_USO'],
    [withdrawalReturnOrigins[1], 'one sig EM_USO, ATRASADO, DEVOLVIDO', 'one sig EM_USO, DEVOLVIDO'],
    [withdrawalReturnModel, 'one sig EM_USO, ATRASADO, DEVOLVIDO', 'one sig EM_USO, DEVOLVIDO'],
    [withdrawalReturnModel, 's.fisico[f] in VAZIO + QUEBRADO + DESCARTADO + EXTRAVIADO', 's.fisico[f] in VAZIO'],
  ]) {
    const modified = read(file).replace(before, after);
    assert.notEqual(modified, read(file), `mutação não aplicada: ${before}`);
    assert.throws(() => checkWithdrawalReturnTrace(p => p === file ? modified : read(p)), /Drift/);
  }
});
