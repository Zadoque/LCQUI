import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {withdrawalReturnModel, withdrawalReturnOrigins, checkWithdrawalReturnTrace} from './withdrawal_return.mjs';
const read = p => fs.readFileSync(p, 'utf8');
test('M4 trace accepts originals and rejects drift of reproduced semantics', () => {
  checkWithdrawalReturnTrace(read);
  for (const [file, before, after] of [
    [withdrawalReturnOrigins[0], 's.fisico[f] = VAZIO implies f not in s.saldoDesconhecido', 's.fisico[f] in VAZIO + QUEBRADO implies f not in s.saldoDesconhecido'],
    [withdrawalReturnOrigins[0], 's.fisico[f] in VAZIO + QUEBRADO + DESCARTADO or s.localizacao[f] = EXTRAVIADO', 's.fisico[f] in VAZIO'],
    [withdrawalReturnOrigins[1], 's.status[e] in EM_USO + ATRASADO', 's.status[e] in EM_USO'],
    [withdrawalReturnOrigins[1], 'one sig EM_USO, ATRASADO, DEVOLVIDO', 'one sig EM_USO, DEVOLVIDO'],
    [withdrawalReturnModel, 'one sig EM_USO, ATRASADO, DEVOLVIDO', 'one sig EM_USO, DEVOLVIDO'],
    [withdrawalReturnModel, 's.fisico[f] in VAZIO + QUEBRADO + DESCARTADO or s.localizacao[f] = EXTRAVIADO', 's.fisico[f] in VAZIO'],
  ]) {
    const modified = read(file).replace(before, after);
    assert.notEqual(modified, read(file), `mutação não aplicada: ${before}`);
    assert.throws(() => checkWithdrawalReturnTrace(p => p === file ? modified : read(p)), /Drift/);
  }
});
test('M4 contract rejects a second expiry authority or snapshot tampering', () => {
  const original = read(withdrawalReturnModel);
  for (const [before, after] of [
    ['  atrasadoNoRetorno: one Bit,\n  destino: one DestinoVencido', '  atrasadoNoRetorno: one Bit,\n  vencidoNoRetorno: one Bit,\n  destino: one DestinoVencido'],
    ['  vencidoNaRetirada: set Emprestimo', '  vencidoNaRetirada2: set Emprestimo'],
    ['fun classificacao[s: Estado, e: Emprestimo]: one ClasseDevolucao {', 'fun outraClassificacao[s: Estado, e: Emprestimo]: one ClasseDevolucao {'],
    ['pred precisaDestino[s: Estado, f: Frasco] {', 'pred outroDestino[s: Estado, f: Frasco] {'],
  ]) {
    const modified = original.replace(before, after);
    assert.notEqual(modified, original, `mutação não aplicada: ${before}`);
    assert.throws(() => checkWithdrawalReturnTrace(p => p === withdrawalReturnModel ? modified : read(p)), /Drift/);
  }
});
