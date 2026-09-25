# M5 — validação executável

Receipt: `build/formal-validation-m5.json`. O modelo `loss_found_quarantine_m5.als`
tem 12 checks UNSAT e 4 witnesses SAT, nos scopes 4, 6 e ciclo com exatamente
6 estados. CUE cobre 3 fixtures válidas e 2 inválidas. Rust valida hashes,
ordem, escopos e resultados; o fragmento `generated/invariants/formal_m5.tex`
é consumido por `Formal-Spec-M5.tex`. M5 não certifica o backend Firebase.
