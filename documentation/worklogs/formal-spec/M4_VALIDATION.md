# M4 — Retirada/devolução completas

Estado: VALIDATED. Branch: `feat/formal-spec-cue-alloy`.
HEAD de entrada: `0bf3c68fc6a0470c69faca3ed857d14079a8a533`
(`docs(spec): record M3 erratum and refresh current status`), árvore limpa.
M3 = VALIDATED (com erratum); M4 = NOT_STARTED na entrada; M5 = NOT_STARTED.

M4 formaliza a composição operacional `Frasco_Reagente + Emprestimo_Reagente +
registrarRetirada + registrarDevolucao` em um único universo Alloy. NÃO calcula
Q06/tara (M6), não modela extravio/reencontro/quarentena manual completos (M5),
idempotência (M7) nem RBAC (M9). Não altera `functions/`.

## Gate de entrada

`just spec-check`, `just spec-export`, `just alloy-check`, `just rust-check`,
`just docs-check` e `git diff --check`: PASS. Fixtures do erratum M3 confirmados
(anomalia pendente/resolvida VALID, `medida_utilizada` 0 VALID, negativa INVALID).

## Fontes lidas

`FORMAL_SPEC_STATE.md`; `documentation/STATUS_ATUAL.md`; worklogs
`M2_2_ALLOY_RELATIONS.md`, `M2_4_COMPOSITION_INTEGRATION.md`, `M3_VALIDATION.md`
(incluindo a seção "Erratum pós-validação M3") e `M2_HUMAN_QUESTIONS.md`.
Arquitetura: `specification/README.md` e os quatro arquivos
`specification/knowledge/`. Norma: Seções 4/5/7/8/9/10.5 (retirada 417-554,
devolução 557-799) e 10.7 (job EM_USO→ATRASADO). `MATRIZ_IMPLEMENTACAO_LCQUI.md`
(RF14/RF15/RN-QUIM-01/02). Backend `functions/src/reagentes.ts` como evidência.

## M4.0 — auditoria operacional

### registrarRetirada (Seção 10.5, 432-554)

| Pré-condição | Fonte | Efeito se falsa |
|---|---|---|
| permissão Chefe/Gestor | 434 | rejeita |
| tomador Professor/Bolsista ativo, não Chefe | 438-449 | rejeita |
| `disponibilidade = DISPONIVEL` | 459-461 | rejeita |
| `fisico ∈ {FECHADO, ABERTO}` | 462-464 | rejeita |
| `not em_quarentena` | 465-467 | rejeita |
| vencido/validade desconhecida exige `uso_vencido_autorizado` + confirmação | 483-485 | rejeita |
| pesquisa excepcional exige justificativa + TCR | 491-498 | rejeita |
| autoatendimento (Q14) | 500-501 | rejeita |

Efeito: cria empréstimo `EM_USO`; frasco `disponibilidade = EMPRESTADO`;
`abrirNoEmpremio` + FECHADO → `ABERTO` e recalcula validade; grava `SAIU`.

### registrarDevolucao (Seção 10.5, 569-799)

| Entrada/condição | Fonte | Efeito |
|---|---|---|
| `status ∈ {EM_USO, ATRASADO}` | 579-581 | rejeita |
| atraso pelo relógio (America/Sao_Paulo) | 633-638 | define status |
| anomalia metrológica | 623-626 | `DEVOLVIDO_COM_ANOMALIA`, INDISPONIVEL, quarentena, consumo pendente |
| `ficouVazio` | 617 | fisico VAZIO, saldo conhecido, INDISPONIVEL |
| vencido + destino | 670-681 | quarentena / disponível autorizado / pendente descarte |

### Casos-limite auditados

1. **Primeira abertura que vence.** `abrirNoEmpremio` em FECHADO recalcula a
   validade; se ficar vencido e `uso_vencido_autorizado=false`, a retirada é
   rejeitada (417-485). Não há deadlock: o gestor pode abrir antes
   (`registrarAberturaFrasco`) com destino e então retirar, ou o frasco já tinha
   uso vencido autorizado. M4 representa validade/vencimento como fatos
   abstratos e exige `usoVencidoAutorizado` para retirada vencida. Sem HQ.
2. **PENDENTE_DE_DESCARTE pós-devolução.** O pseudocódigo deixava
   `disponibilidade` no valor-base (`DISPONIVEL`), contrariando o invariante
   `quarentena → INDISPONIVEL` e a regra "pendente de descarte bloqueia nova
   retirada". Correção mecânica: as ramificações QUARENTENA e
   PENDENTE_DE_DESCARTE gravam `disponibilidade = "INDISPONIVEL"`. Além disso,
   M4 bloqueia retirada vencida sem autorização, de modo que mesmo um frasco
   `DISPONIVEL` vencido/sem autorização não é retirável.
3. **Anomalia + vencimento.** A anomalia tem precedência: retenção em quarentena
   e consumo pendente; o destino de validade ocorre depois (`else if`). M4
   formaliza a precedência.
4. **Vazio + anomalia.** Dimensões ortogonais: `fisico = VAZIO` com
   `emQuarentena = true` e `INDISPONIVEL` é permitido (DISCREPANCIA_TARA_REAL).
5. **Vazio + vencido.** VAZIO tem precedência: `INDISPONIVEL` mesmo com destino
   `DISPONIVEL_AUTORIZADO`.

Nenhuma contradição de domínio exigiu decisão humana: **HQ-M4 criadas = 0**. A
única correção documental foi mecânica (item 2).

## Matriz de sobreposição

| Conceito | M2.4 | M3 | M4 |
|---|---|---|---|
| Frasco | Frasco | frasco do empréstimo | único universo |
| físico | sim | — | M2 |
| disponibilidade | sim | derivada do ativo | compartilhada |
| quarentena | sim | — | M2 |
| vencido / uso vencido autorizado | sim | — | M2 |
| saldo desconhecido | sim | — | M2 |
| Emprestimo | ativo abstrato | completo | M3 |
| status do empréstimo | — | sim | M3 |
| vínculo empréstimo→frasco | ativo abstrato | estático | compartilhado |
| consumo validado | — | CUE | mínimo abstrato (`DEVOLVIDO_COM_ANOMALIA`) |
| anomalia | — | CUE | resultado abstrato da devolução |

## M4.1 — modelo Alloy

`specification/alloy/reagents/withdrawal_return.als`. `status` é parcial
(`Emprestimo -> lone Status`) para representar existência no ato da retirada;
M3 usava status total por não modelar criação. `ATIVOS = EM_USO + ATRASADO`
derivado. `coerenteM4 = coerenteM2 (M2.4) + coerenteM3 (M3) + disponibilidade
EMPRESTADO <=> ativo + cláusula física de M0`. Operações `retirar` e `devolver`
com entradas abstratas `Retirada`/`Devolucao` (bits e destino). Guardas externas
(RBAC/tomador/ciência/TCR) e resultados metrológicos/atraso/vencimento são fatos
abstratos.

| ID | Propriedade | Scope | Resultado |
|---|---|---|---|
| INV-M4-RETIRADA-APTA-001 | retirada só de frasco apto | 4 | UNSAT |
| INV-M4-RETIRADA-ATIVO-001 | retirada cria exatamente um ativo | 4 | UNSAT |
| INV-M4-RETIRADA-DISPONIBILIDADE-001 | pós-retirada EMPRESTADO | 4 | UNSAT |
| INV-M4-RETIRADA-QUARENTENA-001 | quarentena bloqueia retirada | 4 | UNSAT |
| INV-M4-RETIRADA-DESCARTE-001 | pendência/autorização de descarte bloqueia | 4 | UNSAT |
| INV-M4-RETIRADA-VENCIDO-001 | vencido sem autorização bloqueia | 4 | UNSAT |
| INV-M4-RETIRADA-ABERTURA-001 | abrir em FECHADO → ABERTO | 4 | UNSAT |
| INV-M4-RETIRADA-FRAME-001 | retirada não interfere em outros frascos | 4 | UNSAT |
| FRAME-M4-RETIRADA-STATUS-001 | retirada não altera status alheio | 4 | UNSAT |
| INV-M4-DEVOLUCAO-ATIVO-001 | só ativo é devolvido | 4 | UNSAT |
| INV-M4-DEVOLUCAO-CUSTODIA-001 | toda devolução encerra custódia | 4 | UNSAT |
| INV-M4-DEVOLUCAO-NORMAL-001 | sem atraso/anomalia → DEVOLVIDO | 4 | UNSAT |
| INV-M4-DEVOLUCAO-ATRASO-001 | atraso → DEVOLVIDO_COM_ATRASO | 4 | UNSAT |
| INV-M4-DEVOLUCAO-ANOMALIA-001 | anomalia → DEVOLVIDO_COM_ANOMALIA | 4 | UNSAT |
| INV-M4-ANOMALIA-PRECEDENCIA-001 | anomalia prevalece sobre atraso | 4 | UNSAT |
| INV-M4-ANOMALIA-RETENCAO-001 | anomalia → INDISPONIVEL + quarentena | 4 | UNSAT |
| INV-M4-ESGOTAMENTO-001 | vazio → VAZIO + INDISPONIVEL | 4 | UNSAT |
| INV-M4-DESTINO-QUARENTENA-001 | quarentena coerente | 4 | UNSAT |
| INV-M4-DESTINO-DISPONIVEL-001 | disponível autorizado coerente | 4 | UNSAT |
| INV-M4-DESTINO-DESCARTE-001 | pendente descarte não retirável | 4 | UNSAT |
| INV-M4-DEVOLUCAO-FRAME-001 | devolução não interfere em outros frascos | 4 | UNSAT |
| FRAME-M4-DEVOLUCAO-STATUS-001 | devolução não altera status alheio | 4 | UNSAT |
| INV-M4-COERENCIA-001 | operações preservam `coerenteM4` | 4 | UNSAT |
| INV-M4-RETIRADA-ATIVO-006 | idem, ampliado | 6 | UNSAT |
| INV-M4-RETIRADA-QUARENTENA-006 | idem, ampliado | 6 | UNSAT |
| INV-M4-DEVOLUCAO-FRAME-006 | idem, ampliado | 6 | UNSAT |
| INV-M4-COERENCIA-006 | idem, ampliado | 6 | UNSAT |

Witnesses SAT (16): `RetiradaAberto`, `RetiradaFechado`, `RetiradaAbertura`,
`RetiradaExcepcional`, `DevolucaoNormalHabitavel`, `DevolucaoAtrasadaHabitavel`,
`DevolucaoAnomalaHabitavel`, `DevolucaoVazioHabitavel`,
`DevolucaoAnomaliaAtraso`, `DevolucaoAnomaliaVazio`,
`DevolucaoVencidoQuarentena`, `DevolucaoVencidoDisponivel`,
`DevolucaoVencidoDescarte`, `DoisFrascosAtivos`, `CicloCompleto` (5/3 estados) e
`CicloCompletoAmpliado` (6/3 estados).

Total: **27 checks UNSAT + 16 runs SAT**.

## Contraexemplos durante o desenvolvimento

CONTRAEXEMPLO M4-DEV-001 — classificação BUG_MODELO_FORMAL. As restrições
condicionais pós-estado foram escritas como implicações (`C implies b.x = ...`),
mas pares de antecedentes não fixavam o campo quando nenhum era verdadeiro,
permitindo `b.fisico` divergir de `a.fisico` e violar a coerência. Corrigido
reescrevendo cada campo condicional como disjunção particionante
`(C1 and b.x = v1) or (C2 and b.x = v2) or ...`. Após a correção, os 27 checks
ficaram UNSAT e as 16 testemunhas SAT. Registrado para que a abstração não seja
afrouxada sem nova verificação.

## Drift guard

`tools/formal/withdrawal_return.mjs` compara o que M4 reproduz:
`coerenteM2` de `bottle_composition.als`, a cláusula física de `coerenteM0`, a
unicidade de `loan_state.als` (`coerente` → `coerenteM3`), os enums
`EstadoFisico`/`Disponibilidade`/`Status` e o conjunto de status ativos. O teste
`withdrawal_return.test.mjs` muta cada origem e o modelo e exige falha. Incluído
em `alloy-check` via `node --test tools/formal/*.test.mjs`.

## M4.2 — IR / receipt / Rust

- CUE e IR **inalterados** (nenhuma entidade nova). `spec_ir_sha256` não mudou.
- Receipt `build/formal-validation-m4.json` (versão 1, Alloy 6.2.0, sat4j), com
  hashes do modelo e das origens (`bottle_composition.als`, `loan_state.als`).
- Rust `validation_m4.rs`: valida versão/solver/IR/modelo/origens e a lista exata
  ordenada de 42 resultados; testes de adulteração rejeitam hash IR/modelo/origem
  errado, SAT↔UNSAT, scope, ID/nome/tipo, remoção/extra/lista vazia.
- `render.rs`/`main.rs`: fragmento `invariants/retirada_devolucao_m4.tex` e chave
  `formal_validation_m4_sha256` no manifest. 10 testes Rust PASS; clippy `-D warnings`.

## M4.3 — Geração / stale / determinismo

- Stale demonstrado antes da geração: `docs-check` falhou com
  `Generated stale: MANIFEST.json`. Depois, PASS.
- Determinismo: duas gerações comparadas recursivamente: idênticas.
- Apenas `MANIFEST.json` mudou entre os fragmentos antigos; o novo fragmento M4
  foi adicionado; M0–M3 permanecem byte a byte idênticos.

## M4.4 — LaTeX / PDF

- `Formal-Spec-M4.tex` criado e integrado após M3 em `main.tex`.
- `docs-build`: exit 0, **306 páginas**, zero erros/referências indefinidas, 28
  Overfull únicos (nenhum novo). Páginas 302–306 inspecionadas com Poppler.
- Correção documental: Seção 10.5 devolução (QUARENTENA e PENDENTE_DE_DESCARTE)
  agora grava `disponibilidade = "INDISPONIVEL"`; o restante compila sem erros.

## Backend real × contrato M4 (não corrigido nesta etapa)

| Contrato | Documento | Backend (`functions/src/reagentes.ts`) | Situação |
|---|---|---|---|
| Retirada cria `EM_USO` e EMPRESTADO | sim | sim (293/302) | implementação futura parcial |
| Retirada grava ator/gestor, snapshots, TCR, auto | sim | não | implementação futura M4/M9 |
| `finalidade_uso` documental | AULA_PRATICA… | `DIDATICO_DEMONSTRACAO` (286) | implementação futura M4 |
| Devolução aceita ganho com anomalia | sim (705-714) | rejeita >102% (352-355) | implementação futura M6 |
| Devolução grava `consumo_validado`, anomalia, efetivo, resolução | sim | não | implementação futura M6 |
| Atraso pelo relógio | sim | sim (364/388) | implementação futura parcial |
| Vencido exige destino | sim (670-681) | parcial (378-385) | implementação futura M5/M6 |
| Idempotência `idOperacao` | M7 | parcial | M7 |
| RBAC/Custom Claims | M9 | parcial | M9 |

O backend não é chamado de validado; nenhuma alteração em `functions/`.

## Regressões M0–M3

`withdrawal.als`, `bottle_identity.als`, `bottle_state.als`,
`bottle_composition.als`, `loan_state.als`: byte a byte idênticos. Receipts
M0/M2/M2.4/M3 inalterados (IR não mudou). CUE inalterado.

## Gates finais

| Comando | Resultado |
|---|---|
| `just spec-check` | PASS (98 fixtures) |
| `just spec-export` | PASS |
| `just alloy-check` | PASS (M0 + M2.2 + M2.4 + M3 + M4) |
| `just rust-check` | PASS (fmt, 10 testes, clippy) |
| `just docs-generate` | PASS |
| `just docs-check` | PASS |
| `just docs-build` | PASS (306 páginas) |
| `just formal-check` | PASS |
| `git diff --check` | PASS |

## Estado final

- M0 = VALIDATED; M1 = VALIDATED; M2 = VALIDATED; M3 = VALIDATED;
  **M4 = VALIDATED**.
- M5 = NOT_STARTED. HQs M4 abertas = 0.

PRÓXIMA AÇÃO EXATA: `INICIAR M5 — Extravio/reencontro/quarentena`.
