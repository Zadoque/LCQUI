import { HttpsError } from "firebase-functions/v2/https";
import {
  ID_OPERACAO_PATTERN,
  canonicalize,
  construirIdentidade,
  hashPayload,
  validarIdOperacao,
} from "../../idempotencia";

describe("TEST-UNIT-M7-CANON — canonicalização determinística (Seção 7/M7)", () => {
  it("TEST-UNIT-M7-CANON-001 — ordem de chaves não altera o canonical", () => {
    expect(canonicalize({ a: 1, b: 2 })).toBe(canonicalize({ b: 2, a: 1 }));
    expect(canonicalize({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
  });

  it("TEST-UNIT-M7-CANON-002 — objetos aninhados são ordenados recursivamente", () => {
    const x = { z: { b: 1, a: 2 }, a: 3 };
    const y = { a: 3, z: { a: 2, b: 1 } };
    expect(canonicalize(x)).toBe(canonicalize(y));
    expect(canonicalize(x)).toBe('{"a":3,"z":{"a":2,"b":1}}');
  });

  it("TEST-UNIT-M7-CANON-003 — ordem de array é preservada", () => {
    expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
    expect(canonicalize([1, 2])).toBe("[1,2]");
  });

  it("TEST-UNIT-M7-CANON-004 — null é distinto de campo ausente", () => {
    expect(canonicalize({ a: null })).not.toBe(canonicalize({}));
    expect(canonicalize({ a: null })).toBe('{"a":null}');
  });

  it("TEST-UNIT-M7-CANON-005 — undefined em objeto equivale a campo ausente", () => {
    expect(canonicalize({ a: undefined })).toBe(canonicalize({}));
    expect(canonicalize({ a: undefined, b: 1 })).toBe(canonicalize({ b: 1 }));
  });

  it("TEST-UNIT-M7-CANON-006 — strings não sofrem trim", () => {
    expect(canonicalize(" abc ")).not.toBe(canonicalize("abc"));
    expect(canonicalize(" abc ")).toBe('" abc "');
  });

  it("TEST-UNIT-M7-CANON-007 — strings não sofrem mudança de caixa", () => {
    expect(canonicalize("A")).not.toBe(canonicalize("a"));
  });

  it("TEST-UNIT-M7-CANON-008 — números não sofrem arredondamento nem coerção", () => {
    expect(canonicalize(1)).toBe("1");
    expect(canonicalize(1.5)).toBe("1.5");
    expect(canonicalize(1)).not.toBe(canonicalize("1"));
    expect(canonicalize(1)).not.toBe(canonicalize(true));
    expect(canonicalize(0.1 + 0.2)).toBe("0.30000000000000004");
  });

  it("TEST-UNIT-M7-CANON-009 — tipos não suportados falham fechado", () => {
    expect(() => canonicalize(NaN)).toThrow();
    expect(() => canonicalize(Infinity)).toThrow();
    expect(() => canonicalize(-Infinity)).toThrow();
    expect(() => canonicalize(10n)).toThrow();
    expect(() => canonicalize(undefined)).toThrow();
    expect(() => canonicalize(() => 1)).toThrow();
    expect(() => canonicalize(Symbol("x"))).toThrow();
    expect(() => canonicalize(new Date())).toThrow();
  });
});

describe("TEST-UNIT-M7-HASH — impressão canônica da operação (Seção 7/M7)", () => {
  it("TEST-UNIT-M7-HASH-001 — mesmo tipo e payload semanticamente igual → mesmo hash", () => {
    expect(hashPayload("RETIRADA", { a: 1, b: 2 })).toBe(hashPayload("RETIRADA", { b: 2, a: 1 }));
  });

  it("TEST-UNIT-M7-HASH-002 — payload diferente → hash diferente", () => {
    expect(hashPayload("RETIRADA", { a: 1 })).not.toBe(hashPayload("RETIRADA", { a: 2 }));
    expect(hashPayload("RETIRADA", [1, 2])).not.toBe(hashPayload("RETIRADA", [2, 1]));
    expect(hashPayload("RETIRADA", { a: null })).not.toBe(hashPayload("RETIRADA", {}));
  });

  it("TEST-UNIT-M7-HASH-003 — tipo_operacao diferente com mesmo payload → hash diferente", () => {
    expect(hashPayload("RETIRADA", { a: 1 })).not.toBe(hashPayload("DEVOLUCAO", { a: 1 }));
  });

  it("TEST-UNIT-M7-HASH-004 — idOperacao fora do payload não altera o hash; dentro, altera", () => {
    const ident1 = construirIdentidade("u1", "T", { a: 1 });
    const ident2 = construirIdentidade("u1", "T", { a: 1 });
    expect(ident1.payloadHash).toBe(ident2.payloadHash);
    // Se o chamador incluir idOperacao no payload semântico, o hash muda: o
    // contrato exige excluí-lo do payload relevante.
    expect(hashPayload("T", { a: 1, idOperacao: "op-1" })).not.toBe(
      hashPayload("T", { a: 1, idOperacao: "op-2" })
    );
  });

  it("TEST-UNIT-M7-HASH-005 — formato SHA-256 hexadecimal minúsculo (CUE M7)", () => {
    const hash = hashPayload("T", { a: 1 });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("TEST-UNIT-M7-ID — formato de idOperacao (Seção 7/M7)", () => {
  it("TEST-UNIT-M7-ID-001 — aceita uuid e conjuntos seguros até 128", () => {
    expect(validarIdOperacao("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "550e8400-e29b-41d4-a716-446655440000"
    );
    expect(validarIdOperacao("a".repeat(128))).toBe("a".repeat(128));
    expect(validarIdOperacao("op_1-ABC")).toBe("op_1-ABC");
  });

  it("TEST-UNIT-M7-ID-002 — rejeita vazio, longo, caracteres inseguros e não-string", () => {
    for (const invalido of ["", "a".repeat(129), "op 1", "op/1", "op.1", "op:1", 123, null, undefined]) {
      expect(() => validarIdOperacao(invalido)).toThrow(HttpsError);
    }
  });

  it("TEST-UNIT-M7-ID-003 — construirIdentidade exige uid e tipo_operacao", () => {
    expect(() => construirIdentidade("", "T", {})).toThrow(HttpsError);
    expect(() => construirIdentidade("u1", "", {})).toThrow(HttpsError);
    expect(construirIdentidade("u1", "T", {})).toEqual({
      uid: "u1",
      tipoOperacao: "T",
      payloadHash: hashPayload("T", {}),
    });
  });

  it("TEST-UNIT-M7-ID-004 — ID_OPERACAO_PATTERN corresponde à validação", () => {
    expect(ID_OPERACAO_PATTERN.test("op-1")).toBe(true);
    expect(ID_OPERACAO_PATTERN.test("op 1")).toBe(false);
  });
});
