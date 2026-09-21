# Auditoria independente pré-M2.4 — deadlocks, contradições documentais e impacto formal

Estado: auditoria READ-ONLY concluída (sem correções aplicadas).
Branch: `feat/formal-spec-cue-alloy`.
HEAD auditada: `db2aa90405dfe60abdcc1388acd6b4669d1921b2`
(`docs(spec): record M2.3 validation`), árvore limpa no início.

Esta auditoria ocorre depois de M2.3 VALIDATED e antes de M2.4. M2.4 NÃO foi
iniciado. As cinco suspeitas foram tratadas como hipóteses, não como fatos.

## Resultados

| # | Finding | Veredito | Severidade | Deadlock real? | Decisão humana? | Milestone primário |
|---|---|---|---|---|---|---|
| 1 | Esgotamento confirmado após devolução anômala | PARCIALMENTE_VERDADEIRO | Alta | Sim (execução) | Sim (HQ-M2-009) | M4/M6 |
| 2 | Ciclo de pendência metrológica | VERDADEIRO | Alta | Sim | Sim (HQ-M2-009) | M4/M6 |
| 3 | Descarte de frasco em quarentena | VERDADEIRO | Alta | Sim | Sim (HQ-M2-008) | M2/M5 |
| 4 | Lock patrimonial órfão | VERDADEIRO | Média | Sim (deadlock permanente) | Não | M10 |
| 5 | Acoplamento da revogação global de Gestor_Almoxarifado | VERDADEIRO | Média | Não (capacidade ausente) | Não (docs decidem zero vínculos) | M9 |

## Decisões que NÃO exigiram pergunta humana

Estas conclusões foram determinadas de forma inequívoca pela documentação
vigente e/ou por sua comparação com a implementação real. Não geraram HQ.

1. **Finding 1 — existência do caminho normativo de esgotamento posterior.**
   Já decidido: HQ-M2-005 ("confirmação posterior de vazio") e
   `Section-10-Subsection-5`, ~1368 ("Confirmar esgotamento após inspeção").
   O que falta é contrato executável, não decisão de domínio. A forma da API
   ficou em HQ-M2-009.

2. **Finding 4 — representação de rejeição sistêmica patrimonial.**
   Já decidida pela própria fonte: `Section-10-Subsection-8`, ~113-123 usa
   `status:"rejeitada"` + `motivo:"LOCAL_NAO_ENCONTRADO"` + `tx.delete(lockRef)`.
   `Section-4`, ~174, exige o lock liberado em todos os desfechos. A correção de
   "Resumo alvo inexistente" aplica o padrão já existente; nenhuma escolha de
   domínio nova. Pertence a M10.

3. **Finding 5 — validade de `Gestor_Almoxarifado` com zero vínculos.**
   Já decidida: `Section-8`, ~189 ("vínculos opcionais; sem vínculos, exibir
   estado vazio") e ~196 (gerenciar vínculos), além de `Section-4`, ~31-38 (N:N
   sem exigência de ao menos um vínculo). Logo, a resposta é **SIM**, e a
   operação individual é uma lacuna de contrato/implementação de M9, não uma
   ambiguidade de domínio.

4. **Finding 3 — `PENDENTE_DE_DESCARTE` não é campo persistido.**
   Determinado: é evento (`Section-4`, enum de histórico) e derivação de interface
   (`Section-4`, tabela da máquina de estados: `VENCIDO + uso_vencido_autorizado
   = false` quando não em quarentena). Porém a contradição entre `Section-7` ~52
   e ~192 **é** uma escolha de domínio em aberto → HQ-M2-008.

5. **Finding 2 — existência do deadlock.** A ausência de operação que encerre a
   pendência, a indefinição de `existePendenciaMetrologicaTx` e o bloqueio de
   `VOLTAR_A_DISPONIVEL` são fatos verificáveis; a *forma* da solução é que ficou
   em HQ-M2-009.

Perguntas humanas criadas: **HQ-M2-008** e **HQ-M2-009**, em
[`M2_HUMAN_QUESTIONS.md`](M2_HUMAN_QUESTIONS.md). Nenhuma foi respondida nesta
execução.

---

## Finding 1 — Esgotamento confirmado após devolução anômala

### Veredito
```text
PARCIALMENTE_VERDADEIRO
```

### Evidência documental (caminho conceitual EXISTE)
- `Section-10-.../Section-10-Subsection-5-Fluxo-de-Reagentes.tex`, ~1354-1373:
  item 2 — "Confirmar esgotamento após inspeção: confirmação humana explícita e
  pesagem real do recipiente vazio aplicam o contrato de esgotamento".
- `M2_HUMAN_QUESTIONS.md`, HQ-M2-005 (~148-150): "confirmação posterior de vazio".

### Evidência de pseudocódigo (contrato executável AUSENTE)
- `registrarDevolucao` ~617: `confirmarEsgotamento` só durante a devolução.
- Não há `confirmarEsgotamentoAposInspecao`; `existePendenciaMetrologicaTx`
  (~1228) é chamado e nunca definido.
- `recalibrarTaraFrascoEsgotado` ~997 exige `estado_fisico_frasco === "VAZIO"`.

### Evidência da implementação real
```text
AUSENTE
```
`functions/src/reagentes.ts` só tem cadastro/abertura/retirada/devolução; sem
campos de metrologia nem operações de resolução.

### Sequência de estados
```text
S0: empréstimo EM_USO
   ↓ registrarDevolucao (confirmarEsgotamento != true, peso abaixo da tara)
S1: DEVOLVIDO_COM_ANOMALIA; frasco ABERTO + em_quarentena + INDISPONIVEL;
    consumo_validado=false; id_resolucao_metrologica=null; peso_retorno preservado
   ↓ inspeção constata vazio  ... NENHUM contrato executável leva a:
S2: VAZIO + saldo conhecido + pendência encerrada   (bloqueado)
```

### Contra-evidência investigada
Busca por função, campos, evento `AJUSTE`, `FICOU_VAZIO`, aliases e operações
compensatórias em `.tex` e `functions/`. A hipótese "não existe contrato
executável" não foi refutada; a hipótese "não existe caminho normativo" é falsa.

### Solução sugerida no prompt original
`confirmarEsgotamentoAposInspecao` — nome aceitável; contrato não decidido.

### Decisão humana
```text
HQ-M2-009
```

### Matriz de impacto
| Artefato/Milestone | Impacto |
|---|---|
| `.tex` normativo | NÃO |
| pseudocódigo `.tex` | SIM (falta o endpoint) |
| backend real | SIM (ausente) |
| CUE M2.1d | NÃO |
| Alloy M2.2 | NÃO |
| IR/proveniência M2.3 | NÃO |
| M3 Empréstimo | NÃO |
| M4 Retirada/devolução | SIM |
| M5 Extravio/quarentena | SIM (saída de quarentena condicionada) |
| M6 Q06/tara | SIM |
| M9 Usuários/autorização | NÃO |
| M10 Patrimônio | NÃO |

---

## Finding 2 — Ciclo de pendência metrológica

### Veredito
```text
VERDADEIRO
```

### Evidência documental
- `Section-10-Subsection-5` ~704-717: anomalia grava
  `status=DEVOLVIDO_COM_ANOMALIA`, `consumo_validado=false`,
  `peso_retorno_efetivo=null`.
- `Section-5` ("Extensões ... decisões M2 consolidadas"): `consumo_validado`
  falso na retirada e na anomalia; `id_resolucao_metrologica` referencia o
  evento AJUSTE efetivo; todos server-owned.
- ~1364: `peso_retorno_efetivo` aponta para a medição validada;
  `id_resolucao_metrologica` referencia o evento auditável.

### Evidência de pseudocódigo
- `existePendenciaMetrologicaTx` chamado (~1228) e não definido.
- Nenhum pseudocódigo grava `consumo_validado: true` ou
  `id_resolucao_metrologica` não nulo.
- `resolverQuarentenaFrasco` ~1228 bloqueia `VOLTAR_A_DISPONIVEL`; ~1234 bloqueia
  vencido sem autorização.
- `registrarPesagemRotina` (S10.11 ~68-97) não resolve pendência (~1376).
- `recalibrarTaraFrascoEsgotado` exige VAZIO e não encerra `consumo_validado`.
- `corrigirOperacao` só cobre `RETIRADA_RETIRANTE_INCORRETO`.

### Evidência da implementação real
```text
AUSENTE
```

### Sequência do deadlock
```text
E0 empréstimo EM_USO
 ↓ registrarDevolucao (anomalia)
E1 DEVOLVIDO_COM_ANOMALIA; consumo_validado=false; id_resolucao_metrologica=null;
   frasco em_quarentena=true, disponibilidade=INDISPONIVEL
 ↓ resolverQuarentenaFrasco(VOLTAR_A_DISPONIVEL)
   guard: existePendenciaMetrologicaTx == true → failed-precondition
 ↓ resolverQuarentenaFrasco(PENDENTE_DE_DESCARTE)
   grava em_quarentena=false, disponibilidade=INDISPONIVEL, detalhe textual
 ↓ descartarFrasco
   guard: VAZIO || QUEBRADO || (vencido && !usoVencido) → ABERTO não vencido REPROVA
E2 nenhuma operação encerra a pendência nem leva a DESCARTADO  → deadlock real
```

### Contra-evidência investigada
Busca textual por helper, campos e eventos. Não refuta o finding.

### Solução sugerida no prompt original
`resolverPendenciaMetrologica` — perigosa como API `campo+valor`; alternativas em
HQ-M2-009.

### Decisão humana
```text
HQ-M2-009
```

### Matriz de impacto
Idêntica à do Finding 1 (M4/M6/M5; CUE/Alloy/M2.3 = NÃO).

---

## Finding 3 — Descarte de frasco em quarentena

### Veredito
```text
VERDADEIRO
```

### Evidência documental (contradição)
- `Section-7` ~52: "Um frasco no estado de quarentena pode ser descartado ou
  voltar ao estado disponível (...) conforme a máquina de estados da Seção 4."
- `Section-7` ~192: `descartarFrasco` só para VAZIO, QUEBRADO ou
  (`vencido=true` e `uso_vencido_autorizado=false`), com
  `disponibilidade != EMPRESTADO`. Quarentena não consta.
- `Section-4` tabela (~855-863): `QUARENTENA → bloqueia nova retirada`;
  `PENDENTE DE DESCARTE` derivado de `VENCIDO + uso_vencido_autorizado=false`
  quando não em quarentena.
- `Section-8` UI-07 (~285): decisão de quarentena oferece
  "VOLTAR A DISPONIVEL" ou "PENDENTE DE DESCARTE".
- `Section-4` enum de histórico: `PENDENTE_DE_DESCARTE` como evento, não campo.

### Evidência de pseudocódigo
- `resolverQuarentenaFrasco` grava apenas `em_quarentena=false`,
  `disponibilidade=INDISPONIVEL`, `detalhe_status` textual (~1237-1245).
- `descartarFrasco` (~1070-1081) só aceita a tripla VAZIO/QUEBRADO/vencido.

### Evidência da implementação real
```text
AUSENTE
```

### Sequência de estados
```text
S0: ABERTO, vencido=false, em_quarentena=true, disponibilidade=INDISPONIVEL
   ↓ resolverQuarentenaFrasco(PENDENTE_DE_DESCARTE)
S1: em_quarentena=false, disponibilidade=INDISPONIVEL, detalhe="pendente de descarte"
   ↓ descartarFrasco
   guard: fisico ∉ {VAZIO,QUEBRADO} e vencido=false → REPROVA
S2: nunca alcança DESCARTADO  → contradição com Section 7 ~52
```

### Contra-evidência investigada
A leitura "quarentena já coberta por PENDENTE_DE_DESCARTE" não se sustenta:
(a) o cenário tem `vencido=false`; (b) `PENDENTE_DE_DESCARTE` deriva de vencido,
não de quarentena. Contradição confirmada.

### Solução sugerida / alternativas
A: `em_quarentena` habilita descarte; B: quarentena exige
`PENDENTE_DE_DESCARTE` persistido; C: novo estado/campo estruturado
`PENDENTE_DE_DESCARTE`. Nenhuma escolhida — HQ-M2-008.

### Decisão humana
```text
HQ-M2-008
```

### Matriz de impacto
| Artefato/Milestone | Impacto |
|---|---|
| `.tex` normativo | SIM (contradição Seção 7) |
| pseudocódigo `.tex` | SIM |
| backend real | SIM (ausente) |
| CUE M2.1d | SIM se alternativa C; NÃO em A/B |
| Alloy M2.2 | SIM (`aptoParaDescarte`; possível dimensão `em_quarentena`) |
| IR/proveniência M2.3 | SIM (stale após correção) |
| M3 Empréstimo | NÃO |
| M4 Retirada/devolução | NÃO |
| M5 Extravio/quarentena | SIM |
| M6 Q06/tara | NÃO |
| M9 Usuários/autorização | NÃO |
| M10 Patrimônio | NÃO |

---

## Finding 4 — Lock patrimonial órfão

### Veredito
```text
VERDADEIRO
```

### Evidência documental / pseudocódigo
- `Section-10-Subsection-8` ~51-55: o lock DEVE ser liberado em todos os
  desfechos, "não apenas abortar, para evitar lock permanente irrecuperável".
- ~113-123: `Local` inexistente é rejeição sistêmica
  (`status:"rejeitada"` + `tx.delete(lockRef)` + `motivo:"LOCAL_NAO_ENCONTRADO"`).
- ~127-131: "Resumo alvo inexistente" faz `throw`, sem rejeitar/liberar lock;
  a exceção aborta a transação e reverte o `tx.delete(lockRef)` (~160).
- `Section-4` ~174 reforça o invariante de lock.

### Evidência da implementação real
```text
DIVERGENTE
```
`functions/src/patrimonio.ts`: não verifica `versao_bem_origem`; em
`if (!bemSnap.exists) throw` (~91-92) após `tx.delete(lockRef)` (~70) → rollback;
`limparLocksOrfaos` não limpa por haver requisição pendente → deadlock permanente.

### Sequência
```text
S0: requisição de edição pendente + lock bem_edicao_{idBem}
 ↓ responderRequisicaoEdicaoBem(aprovar=true); Bem alvo inexistente
S1: tx.delete(lock) (encenado) → throw → ROLLBACK
S2: requisição continua pendente + lock continua ativo; retry nunca sucede
```

### Contra-evidência investigada
O throw não está em caminho de rejeição; o padrão correto já existe na própria
fonte. `limparLocksOrfaos` foi verificado e não resolve.

### Solução sugerida no prompt original
"Rejeição sistêmica + liberar lock + registrar motivo" — correta e já
documentada.

### Decisão humana
```text
NÃO NECESSÁRIA
```

### Matriz de impacto
| Artefato/Milestone | Impacto |
|---|---|
| `.tex` normativo | NÃO |
| pseudocódigo `.tex` | SIM |
| backend real | SIM |
| CUE/Alloy/IR/M2.3 | NÃO |
| M10 Patrimônio | SIM |
| demais | NÃO |

---

## Finding 5 — Desvinculação pontual de Gestor de Almoxarifado

### Veredito
```text
VERDADEIRO
```

### Evidência documental
- `Section-8` ~189: vínculos opcionais; sem vínculos, estado vazio.
- `Section-8` ~196: "Gerenciar vínculos" e proteção do último gestor de
  almoxarifado ativo, inclusive em revogação global.
- `Section-9` ~138: "Gerenciar gestores permite trocar responsáveis".
- `Section-4` ~31-38: N:N sem exigência de ao menos um vínculo.
- `Section-5` ~759: `Almoxarifado.qtd_gestores_ativos` derivado dos vínculos.

### Evidência de pseudocódigo
- `revogarPapel` (S10.4) remove o papel e todos os vínculos (cascata ~81-91);
  não há operação de vínculo individual.

### Evidência da implementação real
```text
DIVERGENTE
```
`functions/src/usuarios.ts` `alterarPapel` apaga papel e vínculos (~127-130);
não há desvínculo individual; contador é recontado (não mantido);
`functions/src/domain/revogarPapel.ts` valida com leituras não transacionais
(TOCTOU), divergindo do pseudocódigo.

### Caso concreto
```text
Almox A: G + H (2 gestores ativos)
Almox B: somente G (1 gestor ativo)
Objetivo: remover G apenas de A
```
`revogarPapel(G,"Gestor_Almoxarifado")` remove G de A e de B; RN-ROLE-05 aborta
porque B ficaria sem gestor. Não há caminho para o objetivo.

### Decisão importante
```text
É válido Gestor_Almoxarifado com zero vínculos?  → SIM (Section 8 ~189/196).
```

### Decisão humana
```text
NÃO NECESSÁRIA
```

### Matriz de impacto
| Artefato/Milestone | Impacto |
|---|---|
| `.tex` normativo | NÃO |
| pseudocódigo `.tex` | SIM |
| backend real | SIM |
| CUE/Alloy/IR/M2.3 | NÃO |
| M9 Usuários/autorização | SIM |
| demais | NÃO |

---

## Seção especial — impacto sobre o formal já validado

| Finding | M2.1d CUE | M2.2 Alloy | M2.3 IR/proveniência | Ação futura |
|---|---|---:|---:|---|
| 1 | NÃO | NÃO | NÃO | M4/M6 (sem impacto formal M2) |
| 2 | NÃO | NÃO | NÃO | M4/M6 (sem impacto formal M2) |
| 3 | SIM em C / NÃO em A/B | SIM | SIM | HQ-M2-008 → se CUE/Alloy mudar: reabrir M2.2 → revalidar M2.3 |
| 4 | NÃO | NÃO | NÃO | M10 |
| 5 | NÃO | NÃO | NÃO | M9 |

Regra pós-M2.3: se a reconciliação de HQ-M2-008 alterar `frasco_completo.cue`
e/ou `bottle_state.als`, a sequência obrigatória é `M2.1d → M2.2 → M2.3`, com
`M2.3 → IN_PROGRESS → regenerar/revalidar → VALIDATED` antes de M2.4.

## Seção especial — ordem recomendada de reconciliação

```text
HQs 008/009 (decisão humana)
        ↓
F3: reconciliar Section 7 (~52 × ~192) e Section 8/9/4; definir PENDENTE_DE_DESCARTE
        ↓  se decidir por alternativa A/B/C:
CUE M2.1d (se nova coluna — alternativa C)
        ↓
Alloy M2.2 (aptoParaDescarte / assinatura de Estado)
        ↓
revalidar M2.3 (IR/evidência/generated)  → M2.3 VALIDATED
        ↓
F1/F2: definir contratos de resolução metrológica em S10.5 e backend (M4/M6)
        ↓
F4: corrigir pseudocódigo S10.8 + backend (M10)      [independente]
        ↓
F5: contrato de vínculo individual (M9)              [independente]
        ↓
PDF (se .tex normativo mudar)
        ↓
auditoria final
        ↓
M2.4
```

## Efeitos colaterais avaliados nas soluções propostas
- F3 alternativa A: risco de bypass de quarentena; exige manter INDISPONIVEL e
  `disponibilidade != EMPRESTADO`.
- F3 alternativa C: exige backfill e convive com o estado derivado antigo; afeta
  M2.1d.
- F1/F2 resolvedor genérico: risco de "correção genérica" (proibida); exige
  idempotência, TOCTOU, evento AJUSTE vinculado à medição original, reprocessar
  apenas a data FLOW da devolução e invalidar cache só se houver efeito corrente.
- F4: sem baixa dupla nem bypass; mantém auditoria e lock coerentes.
- F5: exige decremento de `qtd_gestores_ativos` e proteção do último gestor;
  risco de contador incorreto se a implementação continuar a reconhecer.

## Auditoria cruzada final
- F1 e F2 compartilham o mesmo estado de pendência; encerrá-la é pré-condição de
  F1.
- F3 cruza com F2 em `PENDENTE_DE_DESCARTE`: se F3 criar estado estruturado, ele
  precisa coexistir com a pendência metrológica sem contorná-la.
- F4 e F5 não compartilham estado com os demais e ficam em M10/M9.

## Podemos começar M2.4?

```text
NÃO
```

F3 é inconsistência normativa confirmada que toca `aptoParaDescarte` (Alloy
M2.2) e potencialmente CUE M2.1d, podendo deixar M2.3 stale. HQ-M2-008 e
HQ-M2-009 permanecem OPEN, e HQ-M2-008 incide diretamente sobre o baseline de
M2.4.

## Proibições — confirmado
Nenhum `.tex`, backend, frontend, CUE, Alloy, Rust, IR, validation, generated ou
PDF foi editado; nenhum milestone alterado; nenhuma HQ respondida. A auditoria
não aplicou diffs nem corrigiu código.

## HQs criadas
- [HQ-M2-008](M2_HUMAN_QUESTIONS.md#hq-m2-008--descarte-de-frasco-em-quarentena)
  — descarte de frasco em quarentena.
- [HQ-M2-009](M2_HUMAN_QUESTIONS.md#hq-m2-009--encerramento-da-pendência-metrológica-e-resolução-pós-devolução-anômala)
  — encerramento da pendência metrológica e resolução pós-devolução anômala.
