# M7 — validação executável

Receipt: `build/formal-validation-m7.json`. O modelo `idempotency_m7.als` tem
6 checks UNSAT e 4 witnesses SAT. CUE cobre 2 fixtures válidas e 2 inválidas.
Rust valida receipt e canonicalização: objetos ordenados recursivamente,
arrays na ordem original, `null` distinto de ausente e tipo no SHA-256; retry
usa a mesma intenção. A evidência não afirma exactly-once de infraestrutura,
nem ausência de TOCTOU, deadlock ou contenção. O fragmento é consumido por
`Formal-Spec-M7.tex`.
