# M2.2 — Relações globais Alloy de Frasco_Reagente

Estado: VALIDATED (M2.2a e M2.2b). Branch: `feat/formal-spec-cue-alloy`.
HEAD de entrada: `dd46a446cc286dc895d638bd28b7c740775a3b60`
(`docs(archive): archive superseded formal-spec worklogs`), árvore limpa.
M2.1d = VALIDATED. Nenhuma pergunta humana nova. M2.3 NÃO iniciado.

M2.2 modela relações/propriedades que o schema local CUE M2.1d não pode
garantir. O princípio aplicado: só formalizar o que tem cadeia documental
inequívoca; o resto fica fora de escopo ou vira HQ. Nenhuma regra foi inventada.

## Baseline

```text
HEAD de entrada M2.2: dd46a446cc286dc895d638bd28b7c740775a3b60
M2.1d = VALIDATED (29 colunas, origem_tara local)
CUE não alterado
```

## Fontes efetivamente usadas

- `documentation/Section-4-Modelagem-Entidades-SQL-3FN.tex`
  (Lote 327-344; Frasco_Reagente 345-414, em especial 379, 399-403).
- `documentation/Section-5-Notas-de-Mapeamento-para-Firestore.tex`
  (dicionário Frasco_Reagente 366-402, em especial 381-382, 391-401).
- `documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex`
  (cadastro 120-139; status/descarte 184-205).
- `FORMAL_SPEC_STATE.md` §16 (contraexemplo M2-IDENTIDADE-001).
- `documentation/archive/formal-spec/M2_0_BASELINE_RECONCILIATION.md`.
- `documentation/worklogs/formal-spec/M2_HUMAN_QUESTIONS.md` (HQ-M2-001..007).
- `documentation/worklogs/formal-spec/M2_1D_CUE_REALIGNMENT.md`.
- `specification/alloy/reagents/withdrawal.als` (M0), `specification/README.md`,
  `tools/formal/check.mjs`.

## Classificação das propriedades

```text
prova:  assert + check (UNSAT) + run testemunha (SAT)
vacuidade: cada check antecedente tem witness SAT
scope:   4 (identidade) / 4 com exatamente 2 Estado (estado); reexecução
         ampliada em scope 6 registrada abaixo
```

## Matriz de propriedades

### M2.2a — identidade química efetiva (`bottle_identity.als`)

| ID | Propriedade | Classificação | Fonte | Artefato | Resultado |
|---|---|---|---|---|---|
| IDENTIDADE-001 | frasco coerente resolve exatamente uma especificação efetiva | state invariant estrutural | Seção 4, 379; M2.0 | `check IdentidadeUnica` | UNSAT (scope 4) |
| IDENTIDADE-002 | rota por lote resolve a especificação do lote | derived property | Seção 4, 379/389 | `check ViaLoteResolveLote` | UNSAT |
| IDENTIDADE-003 | rota direta resolve a referência direta | derived property | Seção 4, 379/389 | `check ViaDiretaResolveDireta` | UNSAT |
| IDENTIDADE-004 | as duas rotas não coexistem (XOR) | state invariant estrutural | Seção 4, 379; M2.0 | `check RotasNaoCoexistem` | UNSAT |
| IDENTIDADE-005 | sem rota não há especificação efetiva | derived property | Seção 4, 379 | `check SemRotaSemEspecificacao` | UNSAT |
| WIT-IDENTIDADE-LOTE-001 | frasco via lote é realizável | witness | Seção 4, 379 | `run ViaLoteValido` | SAT |
| WIT-IDENTIDADE-DIRETA-001 | frasco via referência direta é realizável | witness | Seção 4, 379 | `run ViaDiretaValida` | SAT |
| WIT-IDENTIDADE-ROTADUPLA-001 | rota dupla existe no universo e é excluída por `estruturaCoerente` | witness (contraexemplo documental) | M2-IDENTIDADE-001 | `run RotaDuplaIncoerente` | SAT |
| WIT-IDENTIDADE-SQL-001 | rota dupla satisfaz a condição `OR` do CHECK documental | witness (contraexemplo documental) | M2-IDENTIDADE-001 | `run RotaDuplaSobSql` | SAT |
| WIT-IDENTIDADE-SEMROTA-001 | frasco sem rota existe e não resolve especificação | witness | M2-IDENTIDADE-001 | `run SemRotaIncoerente` | SAT |

O módulo distingue `estruturaCoerente[]` (XOR do texto) de `condicaoEstiloSql[]`
(OR do CHECK). `RotaDuplaSobSql` torna explícito que a condição SQL aceita o
estado que o texto rejeita, sem alterar a fonte documental.

### M2.2b/M2.2c — coerência de estado (`bottle_state.als`)

Estado modelado: `fisico`, `disponibilidade`, `saldoDesconhecido`,
`aberturaHistorica`. `em_quarentena`, `vencido`, pesos, tara, validade e
empréstimo NÃO entram aqui (ver fora de escopo).

| ID | Propriedade | Classificação | Fonte | Artefato | Resultado |
|---|---|---|---|---|---|
| INV-M2-COERENCIA-001 | toda transição documentada preserva a coerência | indutiva (transição) | composição | `check TransicoesPreservamCoerencia` | UNSAT |
| INV-M2-EXTRAVIO-001 | extravio bloqueia (`INDISPONIVEL`) | transition effect | M0; Seção 4 | `check ExtravioIndisponivel` | UNSAT |
| FRAME-M2-EXTRAVIO-SALDO-001 | extravio preserva `saldo_desconhecido` | frame condition | Seção 4, 401; Seção 7, 200 | `check ExtravioPreservaSaldo` | UNSAT |
| FRAME-M2-EXTRAVIO-FLAG-001 | extravio preserva a flag histórica | frame condition | Seção 4, 403 | `check ExtravioPreservaFlag` | UNSAT |
| INV-M2-TERMINAL-QUEBRA-IND-001 | quebra bloqueia | transition effect | M0; Seção 7, 187 | `check QuebraIndisponivel` | UNSAT |
| INV-M2-TERMINAL-DESCARTE-IND-001 | descarte bloqueia | transition effect | Seção 7, 192 | `check DescarteIndisponivel` | UNSAT |
| INV-M2-TERMINAL-ESGOTAMENTO-IND-001 | esgotamento bloqueia | transition effect | Seção 7, 139 | `check EsgotamentoIndisponivel` | UNSAT |
| INV-M2-TERMINAL-QUEBRA-001 | quebra não mantém desconhecimento | state invariant via transição | Seção 4, 401; Seção 7, 200 | `check QuebraSaldoConhecido` | UNSAT |
| INV-M2-TERMINAL-DESCARTE-001 | descarte não mantém desconhecimento | state invariant via transição | Seção 4, 401; Seção 7, 200 | `check DescarteSaldoConhecido` | UNSAT |
| INV-M2-TERMINAL-ESGOTAMENTO-001 | esgotamento confirmado torna o saldo conhecido | transition effect | Seção 7, 139 | `check EsgotamentoSaldoConhecido` | UNSAT |
| INV-M2-ABERTURA-001 | transições preservam a flag histórica | frame condition | Seção 4, 403 | `check TransicoesPreservamFlag` | UNSAT |
| WIT-M2-EXTRAVIO-001 | extravio realizável | witness | — | `run TestemunhaExtravio` | SAT |
| WIT-M2-QUEBRA-001 | quebra realizável | witness | — | `run TestemunhaQuebra` | SAT |
| WIT-M2-DESCARTE-001 | descarte realizável | witness | — | `run TestemunhaDescarte` | SAT |
| WIT-M2-ESGOTAMENTO-001 | esgotamento realizável | witness | — | `run TestemunhaEsgotamento` | SAT |

O invariante de estado `coerente[s]` (terminais sem desconhecimento; flag => físico
!= FECHADO) é preservado por todas as transições; a não-vacuidade de cada
transição é dada por testemunha SAT.

## Perguntas humanas novas

Nenhuma. Nenhuma das propriedades formalizadas exigiu escolha entre
interpretações plausíveis; todas têm fonte direta. Em particular:

- A implicação estática terminal ⇒ saldo conhecido foi confirmada na redação
  vigente (Seção 4, 401; Seção 7, 200) antes de ser formalizada.
- Extravio/quarentena como frame (preservam saldo) foi tratado como transição,
  não como valor absoluto.
- Não se formalizou `MEDIDA_REAL ⇒ VAZIO`, `FECHADO ⇒ saldo conhecido`,
  `tara null ⇒ saldo_desconhecido`, nem refill/reutilização de frasco vazio.

## Propriedades deliberadamente fora de escopo

- **Refill/reutilização de frasco VAZIO** (VAZIO → ABERTO/DISPONIVEL): a
  documentação não descreve essa operação. Não modelada; não era necessária ao
  escopo de M2.2. Não gerou HQ por não bloquear estas propriedades.
- **Frame de `em_quarentena` em quebra/descarte/esgotamento/extraviado**: não
  documentado. Por isso `em_quarentena` foi deixado fora de `bottle_state.als`;
  a propriedade `quarentena => INDISPONIVEL` permanece coberta pelo M0
  (`withdrawal.als`), sem inventar frame.
- **Pesos, tara, `origem_tara`, Q06, devolução anômala/resolução metrológica**:
  não modelados (M3+/M2.3). A tara não é abstraída aqui.
- **`vencido`, `validade_*`, empréstimo ativo, unicidade de empréstimo**: cobertos
  pelo M0 ou por milestones posteriores; não duplicados.
- **Cache 30 s, rate limit 5/min, App Check, Auth/RBAC, TTL, geração,
  Firestore transactions, FLOW diário, correção genérica**: contratos
  arquiteturais, fora do M2.2.

## Reexecução em scope maior

Além do scope canônico (4 / exatamente 2 Estado), as assertions centrais foram
reexecutadas sem contraexemplo:

```text
bottle_identity.als, scope 6:
  IdentidadeUnica, ViaLoteResolveLote, ViaDiretaResolveDireta -> UNSAT
bottle_state.als, scope 6 com exatamente 2 Estado:
  TransicoesPreservamCoerencia, ExtravioPreservaSaldo,
  ExtravioPreservaFlag, TransicoesPreservamFlag -> UNSAT
```

Linguagem precisa: "nenhum contraexemplo encontrado no scope declarado". Alloy
não prova para todos os tamanhos; o gate usa o scope fixado.

## Não regressão M0/M1/M2.1d

- `withdrawal.als` NÃO foi alterado. `build/formal-validation.json` permaneceu
  byte a byte idêntico (`model_sha256` inalterado), então o gerador Rust
  (`docs-check`) continua válido.
- M0: BloqueioFisico/Unicidade UNSAT; Testemunha/IndisponivelNaoApto SAT.
- M1: CUE `spec-check` PASS.
- M2.1d: 72 fixtures PASS.

## Gates

| Comando | Resultado | Observação |
|---|---|---|
| `just spec-check` | PASS | 72 fixtures; CUE M2.1d inalterado |
| `just spec-export` | PASS | IR inalterado |
| `just alloy-check` | PASS | M0 + 25 comandos M2.2 (11 checks UNSAT, 4 runs SAT de estado; 5 checks UNSAT, 5 runs SAT de identidade) |
| `just rust-check` | PASS | gerador inalterado |
| `just docs-check` | PASS | generated sem stale |
| `git diff --check` | PASS | — |

`just docs-build`/`formal-check` integral não executados: nenhuma fonte `.tex`
foi alterada e não se alega recompilação de PDF.

## Artefatos

- `specification/alloy/reagents/bottle_identity.als` (M2.2a).
- `specification/alloy/reagents/bottle_state.als` (M2.2b/M2.2c).
- `tools/formal/check.mjs`: passa a executar os dois módulos; mantém o formato de
  `build/formal-validation.json` (consumido pelo Rust) e grava os resultados M2.2
  em `build/formal-validation-m2.json`.
- `build/formal-validation-m2.json`: evidência normalizada. Não entra no IR nem
  em `documentation/generated/` (isso é M2.3).

## Limitações

M2.2 certifica somente as relações e transições listadas, no scope declarado.
Não certifica implementação Firebase/backend, concorrência, autorização, cache,
rate limit, Q06, tara numérica, refill, validade/vencimento, empréstimo completo
nem integração LaTeX. Não substitui M2.3.

## Estado final

- M2.2 = VALIDATED.
- M2.3 = NOT_STARTED.
- Nenhuma HQ nova.

## Commits

- `a3bf7303` — `feat(alloy): model M2 bottle identity relations`.
- `aeeb712c` — `feat(alloy): model M2 bottle state coherence`.
- `ae176154` — `test(alloy): gate M2 identity and state witnesses`.
- Commit documental desta unidade: `docs(spec): record M2.2 validation state`.

## Próxima ação EXATA

Planejar M2.3 (proveniência/IR/geração) em tarefa separada, sem iniciá-lo
automaticamente. Não reabrir M0/M1/M2.1d.

