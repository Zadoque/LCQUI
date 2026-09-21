# Reconciliação final pré-M2.4 — HQ-M2-008/B + HQ-M2-009/A

Estado: VALIDATED. Branch: `feat/formal-spec-cue-alloy`.
HEAD de entrada: `991dbdc3dce5ee5e28c5a4b167992225a204d71d`
(`docs(spec): record independent pre-M2.4 audit`), árvore limpa.

Esta unidade aplica as decisões humanas de
`AUDITORIA_INDEPENDENTE_PRE_M2_4.md` e corrige também os findings 4 e 5, que já
tinham solução normativa inequívoca. Não inicia M2.4.

## Decisões humanas

- **HQ-M2-008 — Alternativa B (RESOLVED).** Quarentena não vai direto a
  descarte. Exige decisão humana `PENDENTE_DE_DESCARTE`, que cria autorização
  operacional estruturada e mantém o frasco INDISPONIVEL; só então
  `descartarFrasco`. Sem nova coluna: `Frasco_Reagente` permanece com 29 campos.
- **HQ-M2-009 — Alternativa A (RESOLVED).** Resoluções metrológicas permanecem
  conjunto fechado de contratos tipados; sem resolvedor público genérico;
  pesagem ordinária não resolve pendência; recalibração não fabrica evidência;
  correção administrativa permanece fechada.

HQs M2 OPEN = 0.

## Arquivos modificados

Documentação normativa / pseudocódigos:
- `Section-4`: máquina de estados (quarentena não descarta direto; estado
  operacional derivado de `PENDENTE_DE_DESCARTE`), regra de pendência de descarte
  técnico e nota de resolução metrológica em `Emprestimo_Reagente`.
- `Section-5`: projeção operacional `Pendencias_Descarte_Frasco/{idFrasco}`.
- `Section-7`: corrigida a contradição de quarentena e ampliada a regra de
  descarte (`em_quarentena = false`; rota técnica).
- `Section-8` e `Section-9`: harmonização de UI/fluxo (descarte só após decisão).
- `Section-10.4`: contrato `desvincularGestorAlmoxarifado` (vínculo individual).
- `Section-10.5`: `resolverQuarentenaFrasco` cria a projeção e o evento;
  `descartarFrasco` lê/autoriza/consome; `existePendenciaMetrologicaTx` definido;
  endpoints tipados `repetirPesagemDevolucaoAnomala` e
  `confirmarEsgotamentoAposInspecao` + helpers privados.
- `Section-10.8`: "Resumo alvo inexistente" passa de `throw` a rejeição
  sistêmica com liberação do lock (`RESUMO_ALVO_NAO_ENCONTRADO`).
- `Section-11`: `Pendencias_Descarte_Frasco` como coleção interna backend-only.

Formal / geração:
- `specification/alloy/reagents/bottle_state.als`: `emQuarentena`,
  `descarteTecnicoAutorizado`, `resolverQuarentenaParaDescarte`,
  `aptoParaDescarte` reconciliada, consumo de autorização, frames e
  não-interferência, novas assertions/witnesses.
- `tools/formal/check.mjs`: contrato M2 atualizado (novos IDs/escopos; `overall`
  passa a ser expectativa explícita por comando, pois codifica o `exactly N`).
- `build/formal-validation-m2.json`: regenerado.
- `tools/spec-doc/src/validation_m2.rs`: contrato Rust atualizado (escopos
  exatos); testes de adulteração mantidos.
- `documentation/generated/invariants/frasco_reagente_m2.tex` e `MANIFEST.json`:
  regenerados.

Estado / worklogs:
- `M2_HUMAN_QUESTIONS.md` (HQ-M2-008/009 RESOLVED);
- `M2_2_ALLOY_RELATIONS.md`, `M2_3_PROVENANCE_IR_GENERATION.md`;
- `FORMAL_SPEC_STATE.md`, `STATUS_ATUAL.md`;
- `AUDITORIA_INDEPENDENTE_PRE_M2_4.md` (nota de reconciliação);
- este worklog.

## Findings corrigidos

| Finding | Correção aplicada | Formal afetado |
|---|---|---|
| 1 | Endpoint tipado `confirmarEsgotamentoAposInspecao` documentado (estado corrente × consumo histórico separados) | não |
| 2 | `existePendenciaMetrologicaTx` definido; `repetirPesagemDevolucaoAnomala` e helpers privados documentados; resolvedor genérico proibido | não |
| 3 | HQ-M2-008/B: quarentena → `PENDENTE_DE_DESCARTE` (autorização estruturada) → descarte; sem nova coluna | M2.2 + M2.3 |
| 4 | `Resumo alvo inexistente` passa a rejeição sistêmica com liberação de lock | M10 futuro |
| 5 | `desvincularGestorAlmoxarifado` (vínculo individual; papel global preservado) | M9 futuro |

## CUE

```text
Frasco_Reagente = 29 campos (frascoCompletoCampos)
M2.1d NÃO reaberto
72 fixtures PASS
build/spec-ir.json byte a byte igual
```

## Alloy antes/depois

- Antes: 20 checks + 9 runs; sem quarentena/autorização; `aptoParaDescarte`
  exigia VAZIO/QUEBRADO/vencido.
- Depois: 30 checks + 11 runs de estado; `emQuarentena` e
  `descarteTecnicoAutorizado`; `resolverQuarentenaParaDescarte`;
  `aptoParaDescarte` inclui `not emQuarentena` e a rota técnica; terminalidade e
  frames preservados.
- Scope 6: nenhum contraexemplo no escopo declarado para
  `QuarentenaNaoDescartaDireto`, `DescartadoEhTerminal`,
  `TransicoesPreservamCoerencia`, `DescarteConsomeAutorizacao`,
  `PreservacaoQuarentenaOrtogonais`, `ResolucaoQuarentenaNaoInterfereOutros`;
  witnesses SAT.
- M0 (`withdrawal.als`) inalterado.

## M2.3 revalidação

- `spec-ir` inalterado; `formal-validation-m2` regenerado; validador Rust
  atualizado; `generated/invariants/frasco_reagente_m2.tex` + `MANIFEST.json`
  atualizados; fragmentos M0/M1 e entidade M2 idênticos; determinismo PASS;
  stale/tampering PASS. M2.3 = VALIDATED.

## Correção pós-revisão (deadlock 1 — resolução metrológica)

Revisão externa do PDF compilado apontou dois bugs de execução no pseudocódigo
de resolução metrológica adicionado pela HQ-M2-009/A:

- `houveMovimentacaoFisicaPosteriorTx` não filtrava por data. Como a retirada e
  a devolução gravam eventos `SAIU`/`ENTROU` anteriores, o helper retornava
  `true` sempre e os endpoints nunca chamavam
  `finalizarPendenciaMetrologicaTx`, mantendo o deadlock.
- O fechamento do esgotamento usava `emprestimo.medida_utilizada ?? 0`, que é
  `NULL` na anomalia, gravando consumo validado `0`.

Correção aplicada (somente `Section-10.5`, pseudocódigo):
- o helper agora recebe `desde` e filtra `timestamp > desde`; as duas chamadas
  passam `emprestimo.data_devolucao_efetuada`;
- o consumo efetivo passa a ser
  `max(0, peso_saida - pesoVazioRealMedido - peso_perda_evaporacao)`, convertido
  por `densidade_aplicada`; `peso_retorno_efetivo` recebe `pesoVazioRealMedido`.

Impacto: apenas documental/pseudocódigo. CUE (29 colunas), Alloy M2.2, IR,
evidência formal M2.2 e M2.3 permanecem válidos; `docs-build` PASS. Não impede
M2.4.

## Backend real

`functions/` NÃO foi reconciliado nesta etapa; continua dívida explícita de
M4/M5/M6/M9/M10. Esta unidade é documental/formal.

## Gates

| Comando | Resultado |
|---|---|
| `just spec-check` | PASS (72 fixtures) |
| `just spec-export` | PASS (IR inalterado) |
| `just alloy-check` | PASS (M0 + M2.2, 30 checks/11 runs de estado) |
| `just rust-check` | PASS |
| `just docs-generate` | PASS |
| `just docs-check` | PASS |
| `just docs-build` | PASS (285 páginas, sem erros/refs indefinidas) |
| `just formal-check` | PASS (após commit; o gate compara `documentation/generated/` com a árvore versionada) |
| `git diff --check` | PASS |

## Estado final

```text
HQ-M2-008 = RESOLVED (B)
HQ-M2-009 = RESOLVED (A)
HQs OPEN = 0

M2.1d = VALIDATED
M2.2  = VALIDATED
M2.3  = VALIDATED
M2.4  = NOT_STARTED
```

## Próxima ação EXATA

INICIAR M2.4.
