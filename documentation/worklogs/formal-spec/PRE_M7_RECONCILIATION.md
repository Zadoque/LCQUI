# Reconciliação pré-M7 (M6 → M7)

## 1. Objetivo
Reconciliação mecânica e documental final entre M6 e M7, para deixar a entrada de
M7 limpa e inequívoca. **M7 NÃO foi iniciado** e nenhuma semântica de
idempotência foi modelada ou alterada.

## 2. Branch
`feat/formal-spec-cue-alloy`.

## 3. HEAD de entrada real
`4cdf1ddb741e6366b1b90f14db91c138c6d9d982`
(`docs(m6): resolve M6 findings and close M6`), árvore limpa. Confirmado por
`git rev-parse HEAD`; contém o fechamento de M6.

## 4. Baseline normativo (não rediscutido)
- Q06 usa `peso_saida` (nunca tara): normal `max(1 g, 0,005×peso_saida)`;
  higroscópico `max(2 g, 0,02×peso_saida)`.
- Evaporação: `0 <= peso_perda_evaporacao <= perda_bruta`, com
  `perda_bruta = max(0, peso_saida − peso_retorno_efetivo)`; violação rejeitada
  antes do commit, sem clamp.
- HQ-M6-001 RESOLVIDA: a V1 não possui correção administrativa metrológica.
- Três rotas metrológicas tipadas: `repetirPesagemDevolucaoAnomala`,
  `confirmarEsgotamentoAposInspecao`, `recalibrarTaraFrascoEsgotado`.
- UI-18: dupla digitação independente do mesmo operador, unidade fixa em g,
  contexto visual, alertas de plausibilidade e revisão final.
- M0–M4 = VALIDATED; M5 = DOCUMENTATION_VALIDATED; M6 = DOCUMENTATION_VALIDATED;
  M7 = NOT_STARTED.

## 5. Findings encontrados e classificação

| ID | Categoria | Descrição | Classificação |
|---|---|---|---|
| PRE-M7-F01 | Estado corrente obsoleto | `FORMAL_SPEC_STATE.md` dizia que M6 era o próximo milestone documental. | Estado corrente |
| PRE-M7-F02 | Estado histórico apresentado como corrente | `STATUS_ATUAL.md` e `PRE_M5_RECONCILIATION.md` tinham trechos com `M6 = NOT_STARTED` (e banner de "estado corrente") que já foram superados. | Histórico/obsoleto |
| PRE-M7-F03 | Decisão supersedida não marcada | `M6_DOCUMENTATION.md` ("Decisões anteriores preservadas") ainda listava "quatro caminhos tipados (HQ-M2-009/A)" sem marcar a supersessão. | Decisão supersedida |
| PRE-M7-F04 | Evidência desatualizada | `M6_DOCUMENTATION.md` registrava inspeção de "tabela de 20 casos", mas a matriz normativa atual tem 26. | Erro mecânico |

Também foi anotada, como decisão supersedida, a menção a "quatro caminhos" em
`M2_HUMAN_QUESTIONS.md` (registro histórico de HQ-M2-009).

## 6. Correções efetuadas
- `FORMAL_SPEC_STATE.md`: "M6 é o próximo milestone documental" → "M7 documental
  é o próximo milestone" (M5 e M6 consolidados).
- `STATUS_ATUAL.md`: os trechos de M5/pré-M5/M4 passaram a distinguir o
  checkpoint histórico do estado corrente (`M6 = DOCUMENTATION_VALIDATED`,
  `M7 = NOT_STARTED`); a "próxima ação" da seção M5 foi marcada como relativa
  àquele checkpoint.
- `PRE_M5_RECONCILIATION.md`: banner de estado corrente atualizado para
  `M5 = DOCUMENTATION_VALIDATED`, `M6 = DOCUMENTATION_VALIDATED`,
  `M7 = NOT_STARTED`.
- `M5_DOCUMENTATION.md`: nota de estado corrente pós-M6 acrescentada; "Estado
  final" e "Próxima ação" marcados como checkpoint histórico.
- `M6_DOCUMENTATION.md`: seção renomeada para distinguir decisões preservadas de
  decisões revisadas; "quatro caminhos (HQ-M2-009/A)" explicitamente marcado como
  **supersedido por HQ-M6-001** (três rotas); evidência de inspeção corrigida para
  26 casos.
- `M2_HUMAN_QUESTIONS.md`: nota histórica indicando que a quarta rota foi
  supersedida por HQ-M6-001.

Nenhuma decisão normativa foi alterada; nenhuma HQ foi aberta ou reaberta.

## 7. Confirmação: nenhuma decisão de M7 introduzida
Nenhum texto de idempotência foi modelado, alterado ou antecipado. M7 permanece
`NOT_STARTED`.

## 8. Confirmação: executáveis/formais intocados
Diff zero em `frontend/`, `functions/`, `specification/`, `tools/`,
`firestore.rules`, `storage.rules`, `firebase.json`, `.firebaserc`,
`documentation/generated/` e `build/formal-validation*.json`.

## 9. Validações realizadas
- `git status` e revisão integral do diff.
- `git diff --check`: PASS.
- Busca mecânica global (seção 6 do prompt) reexecutada após as correções: zero
  ocorrência em que M6 apareça como não iniciado em contexto corrente e zero
  "quatro rotas/caminhos" apresentada como contrato atual (a única menção
  remanescente está explicitamente marcada como supersedida).
- Matriz quantitativa: `.tex` com casos 1–26 (contagem mecânica = 26); PDF
  contém os 26 casos, incluindo o caso 26 ("dupla digitação divergente");
  evidência do worklog coerente.
- `.pdf` inalterado nesta rodada (nenhum `.tex` normativo foi alterado); a
  compilação corrente (330 páginas) permanece coerente com a fonte da matriz.

## 10. Gate final pré-M7
| # | Pergunta | Resposta |
|---|---|---|
| 1 | M6 ainda é `NOT_STARTED` como estado corrente? | NÃO |
| 2 | M6 ainda é a próxima milestone? | NÃO |
| 3 | Texto normativo corrente permite quatro rotas metrológicas? | NÃO |
| 4 | Existe correção administrativa metrológica na V1? | NÃO |
| 5 | Matriz no `.tex` tem exatamente 26 casos? | SIM |
| 6 | PDF contém os mesmos 26 casos? | SIM |
| 7 | Worklog registra a inspeção de 26 casos? | SIM |
| 8 | Finding pré-M7 ainda OPEN? | NÃO |
| 9 | HQ não resolvida necessária para M7 documental? | NÃO |
| 10 | Decisão de idempotência introduzida? | NÃO |
| 11 | Arquivo executável/formal modificado? | NÃO |
| 12 | M7 continua `NOT_STARTED`? | SIM |

`PRE-M7 RECONCILIATION = PASS`.

## 11. Estado final
```text
M0–M4 = VALIDATED
M5 = DOCUMENTATION_VALIDATED
M6 = DOCUMENTATION_VALIDATED
M7 = NOT_STARTED
```

## 12. Próxima ação exata
`INICIAR M7 DOCUMENTAL — Idempotência`
