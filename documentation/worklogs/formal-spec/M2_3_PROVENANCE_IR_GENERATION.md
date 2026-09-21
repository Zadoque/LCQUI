# M2.3 — Proveniência / IR / geração

Estado: VALIDATED. Branch: `feat/formal-spec-cue-alloy`.
HEAD de entrada: `4b057ac1d9bd6b83bdc0ecf3dff44eacb0a15fc1`
(`docs(spec): record M2.2 terminal-state audit`), árvore limpa.
M2.1d = VALIDATED; M2.2 = VALIDATED; M2.4 = NOT_STARTED.

M2.3 migra a cadeia executável `CUE → IR → evidência Alloy → Rust →
documentation/generated/` para conhecer o Frasco completo de M2.1d e a evidência
Alloy M2.2, preservando byte a byte os artefatos M0/M1 e sem integrar ao
`main.tex`.

## Baseline

```text
HEAD de entrada M2.3: 4b057ac1d9bd6b83bdc0ecf3dff44eacb0a15fc1
M2.2 = VALIDATED (congelado; sem alteração de Alloy)
M2.1d = VALIDATED (29 colunas; CUE intacto)
M0 = VALIDATED; M1 = VALIDATED
```

## Diagnóstico inicial

```text
IR v2: Frasco_Reagente = fatia M0 (3 campos) + Resumo/Especificação M1
CUE M2: frascoCompletoCampos = 29 campos (#FrascoCompleto)
Rust: lia build/spec-ir.json e build/formal-validation.json; ignorava a evidência M2
proveniência: campo único `baseline` = db29ea2f; o CUE M2 reflete documentação pós-M2.1b..d
generated: entities/frasco_reagente.tex e invariants/retirar_frasco.tex (M0)
```

## Decisões arquiteturais

- **Representação M0 × M2 no IR**: a mesma entidade lógica `Frasco_Reagente`
  aparece em duas projeções com `arquivo` de saída distinto — `frasco_reagente`
  (fatia M0, inalterada) e `frasco_reagente_m2` (projeção M2 completa). Não são
  duas entidades de negócio; o nome lógico e o `etapa`/`escopo` distinguem.
- **Versão do IR**: v2 não representava `sql`, `minimo_numero`/`maximo_numero`.
  Promovido a **v3**, com `Campo` estendido por campos opcionais. Rust continua
  lendo v1 e v2 (normalizados para v3) e rejeita versão desconhecida.
- **Proveniência**: estruturada em `proveniencia.baseline_historico_m0_m1`
  (`db29ea2f`) e `proveniencia.baseline_documental_m2` (`9df335bc`). Não se
  substituiu um SHA por outro; os dois conceitos ficam explícitos. Rust valida
  ambos contra constantes versionadas (`ir::provenance_ok`).
- **Validação M2 no Rust**: `validation_m2::ValidationM2` valida versão, Alloy,
  solver, hash do IR, conjunto exato de modelos
  (`bottle_identity.als`, `bottle_state.als`), hashes dos modelos, IDs, tipos,
  scopes e status; rejeita faltantes/extras/vazios.
- **Novos outputs**: `entities/frasco_reagente_m2.tex` (29 campos) e
  `invariants/frasco_reagente_m2.tex` (evidência M2.2). Sem integração LaTeX.
- **MANIFEST**: mantém `formal_validation_sha256` e acrescenta
  `formal_validation_m2_sha256`; `spec_ir_sha256` recalculado.

## Arquivos alterados

- `specification/cue/docs/projection.cue`: IR v3, proveniência estruturada e
  projeção `#CamposFrascoM2` derivada de `domain.frascoCompletoCampos` (sem
  segunda lista humana) + exemplo unificado a `#FrascoCompleto`.
- `tools/spec-doc/src/ir.rs`: `Ir` v3 com `Proveniencia`; `Campo.sql`,
  `minimo_numero`, `maximo_numero`; leitura v1/v2; `provenance_ok`.
- `tools/spec-doc/src/validation_m2.rs` (novo): validação e testes de adulteração.
- `tools/spec-doc/src/render.rs`: render de `SQL`/limites numéricos; fragmento
  M2 de evidência com ressalva de não-composição.
- `tools/spec-doc/src/main.rs`: lê/valida evidência M2; manifest ganha
  `formal_validation_m2_sha256`; teste de linkage/determinismo do manifest.
- `tools/formal/check.mjs`: evidência M2 passa a registrar `solver`.
- `build/spec-ir.json`, `build/formal-validation.json`,
  `build/formal-validation-m2.json`: regenerados.
- `documentation/generated/{entities/frasco_reagente_m2.tex,invariants/frasco_reagente_m2.tex,MANIFEST.json}`.
- `specification/README.md`, `FORMAL_SPEC_STATE.md`, `documentation/STATUS_ATUAL.md`.

Não alterados: `withdrawal.als`, `bottle_identity.als`, `bottle_state.als`,
CUE de domínio M2.1d, `main.tex`, `Formal-Spec-M0.tex`, `Formal-Spec-M1.tex`,
PDF, backend, frontend, Rules.

## Evidência formal

Alloy M2.2 não foi alterado. `build/formal-validation.json` (M0) mudou somente em
`spec_ir_sha256`, como esperado quando o IR muda; `model_sha256` e os quatro
resultados permanecem idênticos. M2: 10 resultados de identidade (5 UNSAT, 5 SAT)
e 34 de estado (25 UNSAT, 9 SAT), inalterados.

## Fragmentos antigos

Byte a byte idênticos: `entities/frasco_reagente.tex`,
`invariants/retirar_frasco.tex`, `entities/resumo_reagente.tex`,
`entities/especificacao_reagente.tex`, `firestore/*.tex`. Apenas o
`MANIFEST.json` mudou (novos vínculos e arquivo).

## Determinismo

Duas gerações consecutivas comparadas recursivamente: **idênticas**. Nenhum
timestamp ou HEAD de execução entra nos arquivos. O teste Rust
`manifest_links_ir_both_validations_and_outputs_deterministically` também compara
duas execuções de `generated`.

## Stale / tampering

| Caso | Comando | Resultado |
|---|---|---|
| `generated/` alterado | `just docs-check` | falha (`Generated stale: invariants/frasco_reagente_m2.tex`) |
| status UNSAT→SAT em `formal-validation-m2.json` | gerador direto `--check` | rejeita (`IR ou validação inválida/stale`) |
| modelo Alloy alterado sem atualizar evidência | gerador direto `--check` | rejeita |
| hash do IR errado, hash de modelo errado, scope alterado, resultado ausente/extra, modelo ausente/inesperado, modelos/resultados vazios, solver divergente | testes `validation_m2` | todos rejeitados |

## Limitações

- Sem composição `M0` e `M2.2`; os módulos são verificados separadamente, e o
  fragmento M2 explicita isso. Composição é dívida de M2.4.
- Sem integração ao `main.tex`/PDF; `docs-build` não é prova de M2.3.
- Sem schema Firestore completo do Frasco.
- Não certifica backend, concorrência, cache, Q06 nem tara numérica.
- DATE/TIMESTAMP permanecem strings de intercâmbio; nenhuma validação de
  calendário foi inventada.

## HQs

Nenhuma. A proveniência pôde ser determinada a partir de `FORMAL_SPEC_STATE.md`,
`specification/README.md` e dos worklogs M2.0–M2.2.

## Gates

| Comando | Resultado |
|---|---|
| `just spec-check` | PASS (72 fixtures) |
| `just spec-export` | PASS (IR v3) |
| `just alloy-check` | PASS (M0 + M2.2, sem alteração de modelo) |
| `just rust-check` | PASS (fmt, 7 testes, clippy `-D warnings`) |
| `just docs-generate` | PASS |
| `just docs-check` | PASS |
| `git diff --check` | PASS |

`just formal-check` não executado: inclui `docs-build` (LaTeX); como os
fragmentos M2 não são integrados e nenhuma fonte `.tex` foi alterada, a
compilação não é prova de M2.3 e não se alega integração ao PDF.

## Commits

- `d02aaa8a` — `feat(spec): project full M2 bottle into IR`.
- `fa8b125b` — `feat(spec-doc): validate M2 Alloy evidence and harden provenance`.
- `84185868` — `feat(spec-doc): render M2 entity and formal evidence`.
- `7b8a78e9` — `test(spec-doc): assert manifest provenance links and determinism`.
- Commit documental desta unidade: `docs(spec): record M2.3 validation`.

## Próxima ação EXATA

Planejar M2.4 (composição M0 e M2.2 e/ou integração LaTeX/PDF, conforme o
roadmap), em tarefa separada. Não iniciar M2.4 automaticamente.
