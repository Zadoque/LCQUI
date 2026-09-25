# M6 — validação executável

Receipt: `build/formal-validation-m6.json`. O modelo `metrology_resolution_m6.als`
tem 6 checks UNSAT e 3 witnesses SAT. CUE cobre 2 fixtures válidas e 2
inválidas para tipos, rotas e ranges; relações quantitativas que exigem
subtração são validação numérica fora do Alloy. Rust valida proveniência e o
fragmento `generated/invariants/formal_m6.tex` consumido por
`Formal-Spec-M6.tex`. Não há correção administrativa metrológica genérica.
