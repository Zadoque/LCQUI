import { test } from "node:test";
import assert from "node:assert";
import { DirtyRegistry } from "../lib/dirtyRegistry.mjs";

// Testes para DirtyRegistry

test("set(id, true) → hasDirty() true", () => {
  const r = new DirtyRegistry();
  r.set("form-a", true);
  assert.strictEqual(r.hasDirty(), true);
});

test("set(id, false) → hasDirty() false", () => {
  const r = new DirtyRegistry();
  r.set("form-a", true);
  r.set("form-a", false);
  assert.strictEqual(r.hasDirty(), false);
});

test("remove remove formulário sujo", () => {
  const r = new DirtyRegistry();
  r.set("form-a", true);
  r.remove("form-a");
  assert.strictEqual(r.hasDirty(), false);
});

test("clear remove todos os formulários", () => {
  const r = new DirtyRegistry();
  r.set("form-a", true);
  r.set("form-b", true);
  r.clear();
  assert.strictEqual(r.hasDirty(), false);
});

test("múltiplos ids — hasDirty true enquanto ao menos um sujo", () => {
  const r = new DirtyRegistry();
  r.set("form-a", true);
  r.set("form-b", true);
  assert.strictEqual(r.hasDirty(), true);
  r.set("form-a", false);
  assert.strictEqual(r.hasDirty(), true);
  r.set("form-b", false);
  assert.strictEqual(r.hasDirty(), false);
});

test("registro vazio — hasDirty false", () => {
  const r = new DirtyRegistry();
  assert.strictEqual(r.hasDirty(), false);
});
