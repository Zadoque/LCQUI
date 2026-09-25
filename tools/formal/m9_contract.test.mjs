// Guard de drift M9: papéis fechados e predicado central devem permanecer
// alinhados entre a fonte documental, o shape CUE e a abstração Alloy.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cue = fs.readFileSync('specification/cue/domain/formal_m9.cue', 'utf8');
const alloy = fs.readFileSync('specification/alloy/operations/authorization_m9.als', 'utf8');
const docs = fs.readFileSync('documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex', 'utf8');
const roles = ['Chefe_Geral', 'Gestor_Almoxarifado', 'Gestor_Bens_Patrimoniais', 'Professor', 'Aluno', 'Bolsista'];
const alloyRoles = ['ChefeGeral', 'GestorAlmoxarifado', 'GestorBensPatrimoniais', 'Professor', 'Aluno', 'Bolsista'];

test('M9 mantém o conjunto fechado de papéis entre documentação, CUE e Alloy', () => {
  for (const role of roles) {
    assert.match(cue, new RegExp(`"${role}"`), `papel CUE ausente: ${role}`);
    assert.match(docs, new RegExp(role.replaceAll('_', '\\\\_')), `papel documental ausente: ${role}`);
  }
  for (const role of alloyRoles) assert.match(alloy, new RegExp(`\\b${role}\\b`));
});

test('M9 preserva autoridade única e separação entre autorização e domínio', () => {
  assert.match(alloy, /pred podeExecutar\[s: Estado, u: Usuario, o: Operacao, r: Recurso\]/);
  assert.match(alloy, /pred podeCommitar\[s: Estado, u: Usuario, o: Operacao, r: Recurso\]/);
  assert.match(alloy, /r\.dominioValido = SIM/);
  assert.match(alloy, /assert ClaimObsoletaNaoRestauraAutorizacao/);
  assert.match(alloy, /assert RevogadoAntesDoCommitNaoPodeCommitar/);
});
