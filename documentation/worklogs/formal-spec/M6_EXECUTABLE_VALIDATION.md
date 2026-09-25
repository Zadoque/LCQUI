# M6 — validação executável

Receipt: `build/formal-validation-m6.json`. O modelo `metrology_resolution_m6.als`
tem 7 checks UNSAT e 5 witnesses SAT, incluindo classificação Q06 de ganho e
retorno dentro da tolerância. CUE cobre 3 fixtures válidas e 2 inválidas para
tipos, rotas e ranges. Rust calcula Q06 (normal/higroscópico), valida a
classificação `peso_retorno > peso_saida + tolerância` e rejeita evaporação acima
da perda bruta; Alloy usa inteiros escalados para a relação abstrata. O fragmento
`generated/invariants/formal_m6.tex` é consumido por `Formal-Spec-M6.tex`. Não há
correção administrativa metrológica genérica.
