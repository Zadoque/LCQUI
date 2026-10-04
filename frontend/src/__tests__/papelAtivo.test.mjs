import { test } from "node:test";
import assert from "node:assert";
import { resolverPapelAtivo } from "../lib/papelAtivo.mjs";

// Testes para resolverPapelAtivo

test("preferido autorizado é mantido", () => {
  const roles = ["aluno", "professor"];
  const preferido = "professor";
  const resultado = resolverPapelAtivo(roles, preferido);
  assert.strictEqual(resultado, "professor");
});

test("preferido ausente cai no primeiro", () => {
  const roles = ["aluno", "professor"];
  const preferido = "coordenador";
  const resultado = resolverPapelAtivo(roles, preferido);
  assert.strictEqual(resultado, "aluno");
});

test("lista vazia → null", () => {
  const roles = [];
  const preferido = "aluno";
  const resultado = resolverPapelAtivo(roles, preferido);
  assert.strictEqual(resultado, null);
});

test("entradas inválidas (undefined) → null", () => {
  const roles = undefined;
  const preferido = "aluno";
  const resultado = resolverPapelAtivo(roles, preferido);
  assert.strictEqual(resultado, null);
});

test("entradas inválidas ([]) → null", () => {
  const roles = [];
  const preferido = undefined;
  const resultado = resolverPapelAtivo(roles, preferido);
  assert.strictEqual(resultado, null);
});
