import test from "node:test";
import assert from "node:assert/strict";

import {
  construirEstadoAutenticacao,
  destinoSeguroAposLogin,
  extrairPapeisClaims,
} from "../lib/authBootstrap.mjs";

test("sessão Auth sem papel é preservada para bootstrap de convite", () => {
  assert.deepEqual(construirEstadoAutenticacao(undefined), {
    roles: [],
    ativo: false,
  });
});

test("claims aceitam somente papéis conhecidos e removem duplicatas", () => {
  assert.deepEqual(
    extrairPapeisClaims(["Aluno", "Aluno", "papel_inventado", 42]),
    ["Aluno"]
  );
});

test("login preserva redirect local para o convite", () => {
  const destino = "/convite?id=convite-1&token=token-1";
  assert.equal(
    destinoSeguroAposLogin(`?redirect=${encodeURIComponent(destino)}`),
    destino
  );
});

test("login rejeita redirect externo ou protocol-relative", () => {
  assert.equal(destinoSeguroAposLogin("?redirect=https://example.com"), "/");
  assert.equal(destinoSeguroAposLogin("?redirect=%2F%2Fevil.example"), "/");
  assert.equal(destinoSeguroAposLogin(""), "/");
});
