# M2.2 — Relações globais Alloy de Frasco_Reagente

Estado: VALIDATED (M2.2a e M2.2b), após erratum de cobertura de descarte.
Branch: `feat/formal-spec-cue-alloy`.
HEAD de entrada original: `dd46a446cc286dc895d638bd28b7c740775a3b60`
(`docs(archive): archive superseded formal-spec worklogs`), árvore limpa.
M2.1d = VALIDATED. Nenhuma pergunta humana nova. M2.3 NÃO iniciado.

Erratum de cobertura (mesma linha de trabalho): a primeira versão de
`bottle_state.als` marcada M2.2=VALIDATED **submodelava** `descartarFrasco`,
aceitando apenas `VAZIO`/`QUEBRADO` como elegíveis. A documentação também
permite o descarte de frasco `vencido` com `uso_vencido_autorizado=false`,
inclusive quando o estado físico é `ABERTO` ou `FECHADO`. O modelo foi
corrigido e revalidado. Formulação precisa: os checks anteriores verificavam
corretamente o modelo existente, mas o modelo não cobria um caminho normativo de
descarte.

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
- `documentation/Section-8-Descricao-das-telas-Dashboards.tex`
  (228/232: retirada e marcação de vazio/quebrado).
- `documentation/Section-9-Exemplos-de-fluxos.tex`.
- `documentation/Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/Section-10-Subsection-5-Fluxo-de-Reagentes.tex`
  (extravio 809-890; descarte MET-05 1043-1112).
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
`aberturaHistorica`, `vencido`, `usoVencidoAutorizado`. `em_quarentena`, pesos,
tara, validade calculada e empréstimo NÃO entram aqui (ver fora de escopo).
Os frames de `vencido`/`usoVencidoAutorizado` foram auditados por transição (ver
"Frame-condition audit pós-erratum"): preservação completa em
`extraviar`/`descartar`; não-interferência (frascos ≠ f) em
`quebrar`/`confirmarEsgotamento`.

| ID | Propriedade | Classificação | Fonte | Artefato | Resultado |
|---|---|---|---|---|---|
| INV-M2-COERENCIA-001 | toda transição documentada preserva a coerência | indutiva (transição) | composição | `check TransicoesPreservamCoerencia` | UNSAT |
| INV-M2-DESCARTADO-TERMINAL-001 | `DESCARTADO` não inicia nenhuma transição M2.2 | terminality | Seção 4, 863; Seção 8, 232; Seção 9, 210 | `check DescartadoEhTerminal` | UNSAT |
| INV-M2-DESCARTADO-EXTRAVIO-001 | `DESCARTADO` não extravia | terminality | idem | `check DescartadoNaoExtravia` | UNSAT |
| INV-M2-DESCARTADO-QUEBRA-001 | `DESCARTADO` não quebra | terminality | idem | `check DescartadoNaoQuebra` | UNSAT |
| INV-M2-DESCARTADO-REDESCARTE-001 | `DESCARTADO` não é descartado novamente | terminality | idem | `check DescartadoNaoDescartaNovamente` | UNSAT |
| INV-M2-DESCARTADO-ESGOTAMENTO-001 | `DESCARTADO` não esgota | terminality | idem | `check DescartadoNaoEsgota` | UNSAT |
| INV-M2-EXTRAVIO-001 | extravio bloqueia (`INDISPONIVEL`) | transition effect | M0; Seção 4 | `check ExtravioIndisponivel` | UNSAT |
| FRAME-M2-EXTRAVIO-SALDO-001 | extravio preserva `saldo_desconhecido` | frame condition | Seção 4, 401; Seção 7, 200 | `check ExtravioPreservaSaldo` | UNSAT |
| FRAME-M2-EXTRAVIO-FLAG-001 | extravio preserva a flag histórica | frame condition | Seção 4, 403 | `check ExtravioPreservaFlag` | UNSAT |
| INV-M2-EXTRAVIO-REP-001 | extravio repetido não é permitido | transition precondition | Seção 10.5, 846-847 | `check ExtravioNaoRepetido` | UNSAT |
| FRAME-M2-EXTRAVIO-VALIDADE-001 | extravio preserva `vencido`/`usoVencidoAutorizado` | frame condition | Seção 10.5, 855-859 | `check ExtravioPreservaValidade` | UNSAT |
| INV-M2-TERMINAL-QUEBRA-IND-001 | quebra bloqueia | transition effect | M0; Seção 7, 187 | `check QuebraIndisponivel` | UNSAT |
| INV-M2-QUEBRA-EMPRESTIMO-001 | quebra não se aplica a frasco emprestado | transition precondition | Seção 8, 232 | `check QuebraNaoEmprestado` | UNSAT |
| FRAME-M2-QUEBRA-INTERF-001 | quebra não interfere em `vencido`/`usoVencidoAutorizado` de frascos ≠ f | non-interference | operação local; sem contrato no alvo | `check QuebraNaoInterfereValidade` | UNSAT |
| INV-M2-TERMINAL-DESCARTE-IND-001 | descarte bloqueia | transition effect | Seção 7, 192; Seção 10.5, 1085 | `check DescarteIndisponivel` | UNSAT |
| INV-M2-TERMINAL-DESCARTE-001 | descarte não mantém desconhecimento | state invariant via transição | Seção 4, 401; Seção 7, 200 | `check DescarteSaldoConhecido` | UNSAT |
| INV-M2-DESCARTE-FISICO-001 | descarte leva a `DESCARTADO` | transition effect | Seção 10.5, 1084 | `check DescarteFisicoDescartado` | UNSAT |
| FRAME-M2-DESCARTE-VALIDADE-001 | descarte preserva `vencido`/`usoVencidoAutorizado` | frame condition | Seção 10.5, 1083-1088 | `check DescartePreservaValidade` | UNSAT |
| INV-M2-DESCARTE-EMPRESTIMO-001 | frasco emprestado não é descartável | transition precondition | Seção 7, 192; Seção 10.5, 1070 | `check NaoDescarteEmprestado` | UNSAT |
| INV-M2-DESCARTE-USOVENCIDO-001 | uso vencido autorizado não habilita descarte pela via de vencimento | transition precondition | Seção 7, 192; Seção 10.5, 1077 | `check UsoVencidoNaoHabilitaDescarte` | UNSAT |
| INV-M2-TERMINAL-ESGOTAMENTO-IND-001 | esgotamento bloqueia | transition effect | Seção 7, 139 | `check EsgotamentoIndisponivel` | UNSAT |
| INV-M2-TERMINAL-QUEBRA-001 | quebra não mantém desconhecimento | state invariant via transição | Seção 4, 401; Seção 7, 200 | `check QuebraSaldoConhecido` | UNSAT |
| INV-M2-TERMINAL-ESGOTAMENTO-001 | esgotamento confirmado torna o saldo conhecido | transition effect | Seção 7, 139 | `check EsgotamentoSaldoConhecido` | UNSAT |
| FRAME-M2-ESGOTAMENTO-INTERF-001 | esgotamento não interfere em `vencido`/`usoVencidoAutorizado` de frascos ≠ f | non-interference | devolução fora da abstração | `check EsgotamentoNaoInterfereValidade` | UNSAT |
| INV-M2-ABERTURA-001 | transições preservam a flag histórica | frame condition | Seção 4, 403 | `check TransicoesPreservamFlag` | UNSAT |
| WIT-M2-EXTRAVIO-001 | extravio realizável | witness | — | `run TestemunhaExtravio` | SAT |
| WIT-M2-QUEBRA-001 | quebra realizável | witness | — | `run TestemunhaQuebra` | SAT |
| WIT-M2-DESCARTE-001 | descarte realizável (com pós-estado) | witness | — | `run TestemunhaDescarte` | SAT |
| WIT-M2-DESCARTE-VAZIO-001 | descarte de `VAZIO` realizável | witness | Seção 7, 192 | `run TestemunhaDescarteVazio` | SAT |
| WIT-M2-DESCARTE-QUEBRADO-001 | descarte de `QUEBRADO` realizável | witness | Seção 7, 192 | `run TestemunhaDescarteQuebrado` | SAT |
| WIT-M2-DESCARTE-VENCIDO-ABERTO-001 | descarte de `ABERTO` vencido sem uso autorizado realizável | witness | Seção 7, 192; Seção 10.5, 1075-1081 | `run TestemunhaDescarteVencidoAberto` | SAT |
| WIT-M2-DESCARTE-VENCIDO-FECHADO-001 | descarte de `FECHADO` vencido sem uso autorizado realizável | witness | idem | `run TestemunhaDescarteVencidoFechado` | SAT |
| WIT-M2-USOVENCIDO-001 | configuração `vencido` + `usoVencidoAutorizado` é realizável (`coerente`) | witness | Seção 7, 188 | `run TestemunhaVencidoComUsoAutorizado` | SAT |
| WIT-M2-ESGOTAMENTO-001 | esgotamento realizável | witness | — | `run TestemunhaEsgotamento` | SAT |

O invariante de estado `coerente[s]` (terminais sem desconhecimento; flag => físico
!= FECHADO) é preservado por todas as transições; a não-vacuidade de cada
transição é dada por testemunha SAT. A elegibilidade de descarte está isolada em
`aptoParaDescarte[s,f] = disponibilidade != EMPRESTADO and (VAZIO or QUEBRADO or
(vencido and not usoVencidoAutorizado))`.

## Erratum M2.2 — cobertura de descarte

- **Submodelagem identificada:** `descartar[a,b,f]` exigia
  `a.fisico[f] in VAZIO + QUEBRADO`, removendo do domínio o descarte de frasco
  vencido sem uso autorizado.
- **Regra normativa real:** `descartarFrasco` é permitido para `VAZIO`,
  `QUEBRADO` ou `vencido=true` com `uso_vencido_autorizado=false`, desde que
  `disponibilidade != EMPRESTADO` (Seção 7, 192; Seção 10.5, 1070-1081,
  comentário MET-05). Nos estados `ABERTO`/`FECHADO` pode haver produto
  remanescente; o descarte formaliza a baixa do passivo químico perigoso.
- **Razão da correção:** o modelo não pode eliminar um caso válido do domínio por
  conveniência de modelagem.
- **Dimensões adicionadas:** `vencido` e `usoVencidoAutorizado` (conjuntos de
  `Frasco`), usados somente na precondition; sem invariantes globais novos.
- **Preconditions auditadas:** `extraviar` passou a rejeitar extravio repetido;
  `quebrar` passou a exigir `disponibilidade != EMPRESTADO`; `confirmarEsgotamento`
  mantém-se sem precondition modelada (o contrato de devolução está fora da
  abstração).
- **Frames:** na primeira passagem, `vencido`/`usoVencidoAutorizado` ficaram sem
  frame pós-transição (não eram necessários à consistência de `coerente[b]`).
  Isso foi corrigido na auditoria de frames subsequente (abaixo).
- **Testemunhas novas:** `TestemunhaDescarteVazio`, `TestemunhaDescarteQuebrado`,
  `TestemunhaDescarteVencidoAberto`, `TestemunhaDescarteVencidoFechado`,
  `TestemunhaVencidoComUsoAutorizado` (todas SAT, com pós-estado explícito para os
  descartes).
- **Assertions novas:** `ExtravioNaoRepetido`, `QuebraNaoEmprestado`,
  `DescarteFisicoDescartado`, `NaoDescarteEmprestado`,
  `UsoVencidoNaoHabilitaDescarte`.
- **Resultado:** as duas testemunhas antes ausentes
  (`WIT-M2-DESCARTE-VENCIDO-ABERTO-001`, `WIT-M2-DESCARTE-VENCIDO-FECHADO-001`)
  retornam SAT; as assertions retornam UNSAT no scope declarado (4) e em scope 6.
  Nenhuma HQ foi necessária: a elegibilidade de descarte está decidida
  documentalmente.

## Frame-condition audit pós-erratum

Problema auditado: após o erratum, `vencido` e `usoVencidoAutorizado` entraram
em `Estado`, mas as quatro transições não mencionavam esses campos no
pós-estado. Em Alloy, campo não mencionado não é preservado: o solver pode
escolher livremente seu valor — inclusive para frascos ≠ f. Os checks anteriores
verificavam corretamente as propriedades declaradas, mas o modelo deixava livres
relações recém-introduzidas.

Classificação por transição e campo (auditada nas fontes, não por senso comum):

| Transição | Campo | Classificação | Fonte | Resultado |
|---|---|---|---|---|
| extraviar | vencido | PRESERVED | Seção 10.5, 855-859 (tx.update só altera físico/disponibilidade/detalhe) + independência das dimensões | UNSAT |
| extraviar | usoVencidoAutorizado | PRESERVED | idem | UNSAT |
| quebrar | vencido | UNSPECIFIED (no alvo) | não há operação documentada que fixe o pós-valor | não-interferência UNSAT |
| quebrar | usoVencidoAutorizado | UNSPECIFIED (no alvo) | idem | não-interferência UNSAT |
| descartar | vencido | PRESERVED | Seção 10.5, 1083-1088 (tx.update só altera físico/disponibilidade/quarentena/detalhe) | UNSAT |
| descartar | usoVencidoAutorizado | PRESERVED | idem | UNSAT |
| confirmarEsgotamento | vencido | OUT_OF_ABSTRACTION | Seção 10.5, 660 (`vencido: frascoVencido` na devolução) | não-interferência UNSAT |
| confirmarEsgotamento | usoVencidoAutorizado | OUT_OF_ABSTRACTION | Seção 10.5, 668-679 (destino pós-devolução) | não-interferência UNSAT |

Distinção explícita:
- **PRESERVED**: a operação documental não toca o campo e a relação completa é
  fixada (`b.vencido = a.vencido`), o que também garante não-interferência em
  frascos ≠ f.
- **UNSPECIFIED**: não há contrato documental que determine o pós-valor no
  frasco-alvo. Não se inventa preservação; fixa-se apenas a não-interferência nos
  demais frascos.
- **OUT_OF_ABSTRACTION**: o pós-valor pertence à operação maior de devolução
  (recálculo de vencimento e decisão pós-validade), não ao efeito isolado de
  `confirmarEsgotamento`. A ausência de frame no alvo é deliberada; frascos ≠ f
  são preservados.

Frames adicionados (`specification/alloy/reagents/bottle_state.als`):
- `extraviar`: `preservaValidade[a,b]` (`b.vencido = a.vencido` e
  `b.usoVencidoAutorizado = a.usoVencidoAutorizado`).
- `descartar`: `preservaValidade[a,b]`.
- `quebrar`: `preservaValidadeExceto[a,b,f]` (todo `g: Frasco - f` preservado).
- `confirmarEsgotamento`: `preservaValidadeExceto[a,b,f]`.

Assertions adicionadas:
- `FRAME-M2-EXTRAVIO-VALIDADE-001` / `ExtravioPreservaValidade` — UNSAT.
- `FRAME-M2-DESCARTE-VALIDADE-001` / `DescartePreservaValidade` — UNSAT.
- `FRAME-M2-QUEBRA-INTERF-001` / `QuebraNaoInterfereValidade` — UNSAT.
- `FRAME-M2-ESGOTAMENTO-INTERF-001` / `EsgotamentoNaoInterfereValidade` — UNSAT.

Witness fortalecida: `TestemunhaVencidoComUsoAutorizado` (`coerente`, `f in
vencido`, `f in usoVencidoAutorizado`) — SAT, substitui a witness fraca
`UsoVencidoAutorizadoConfig`.

Nenhuma HQ foi necessária: as preservações vêm do pseudocódigo; as ausências de
frame são abstrações explícitas, não lacunas que bloqueiem a prova.

## Terminal-state audit

### Problema

`DESCARTADO` era alcançável, mas nenhuma transição compartilhava uma
precondition que bloqueasse operações posteriores. O modelo permitia
`DESCARTADO → EXTRAVIADO/QUEBRADO/VAZIO/DESCARTADO`, contrariando a
documentação.

### Fonte

- Seção 4, 863: `DESCARTADO & É terminal; não retorna a DISPONIVEL.`
- Seção 8, 232: "Descartar ... é terminal, sem excluir documento."
- Seção 9, 210: "Descarte é terminal; política de remoção lógica em Q07."

### Correção

- Helper `naoDescartado[s,f] = s.fisico[f] != DESCARTADO`, aplicado a
  `extraviar`, `quebrar` e `confirmarEsgotamento`; em `descartar`, incorporado a
  `aptoParaDescarte`, que passou a exigir `naoDescartado[s,f]` além de
  `disponibilidade != EMPRESTADO` e da elegibilidade já auditada.
- Efeitos e frames anteriores preservados.

### Não implicações

```text
VAZIO não foi tornado terminal (VAZIO → DESCARTADO segue permitido).
QUEBRADO não foi tornado terminal (QUEBRADO → DESCARTADO segue permitido).
EXTRAVIADO não foi tornado terminal (o domínio prevê reencontro; a transição
de reencontro permanece fora de bottle_state.als).
```

### Provas

- `DescartadoEhTerminal` (agregada) → UNSAT no scope 4 e no scope 6.
- `DescartadoNaoExtravia`, `DescartadoNaoQuebra`, `DescartadoNaoDescartaNovamente`,
  `DescartadoNaoEsgota` → UNSAT.
- Não-vacuidade: `TestemunhaDescarte`, `TestemunhaDescarteVazio`,
  `TestemunhaDescarteQuebrado`, `TestemunhaDescarteVencidoAberto`,
  `TestemunhaDescarteVencidoFechado` continuam SAT; portanto `DESCARTADO` é
  alcançável e, uma vez alcançado, nenhuma transição M2.2 sai dele.

Nenhuma outra terminalidade foi declarada; nenhuma HQ foi necessária.

## Perguntas humanas novas

Nenhuma. Nenhuma das propriedades formalizadas exigiu escolha entre
interpretações plausíveis; todas têm fonte direta. Em particular:

- A implicação estática terminal ⇒ saldo conhecido foi confirmada na redação
  vigente (Seção 4, 401; Seção 7, 200) antes de ser formalizada.
- Extravio foi modelado como transição com frame explícito (preserva saldo e
  flag). Quarentena permanece fora de `bottle_state.als`; sua propriedade
  `quarentena => INDISPONIVEL` continua no M0, sem frame adicional inventado.
- Não se formalizou `MEDIDA_REAL ⇒ VAZIO`, `FECHADO ⇒ saldo conhecido`,
  `tara null ⇒ saldo_desconhecido`, nem refill/reutilização de frasco vazio.
- A auditoria de frames de `vencido`/`usoVencidoAutorizado` também não exigiu HQ:
  extraviar/descartar preservam (pseudocódigo); quebrar fica UNSPECIFIED no alvo
  (sem contrato); confirmarEsgotamento é OUT_OF_ABSTRACTION. Em todos, frascos ≠ f
  são preservados.

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
- **`validade_*` calculada, empréstimo ativo, unicidade de empréstimo**: cobertos
  pelo M0 ou por milestones posteriores; não duplicados. `vencido` e
  `usoVencidoAutorizado` são modelados apenas como fatos atuais (entrada da
  precondition de descarte e frames auditados), sem cálculo de validade.
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
  TransicoesPreservamCoerencia, DescartadoEhTerminal,
  DescartadoNaoExtravia, DescartadoNaoQuebra, DescartadoNaoDescartaNovamente,
  DescartadoNaoEsgota, ExtravioPreservaValidade, DescartePreservaValidade,
  QuebraNaoInterfereValidade, EsgotamentoNaoInterfereValidade,
  DescarteIndisponivel, DescarteSaldoConhecido, DescarteFisicoDescartado,
  NaoDescarteEmprestado, UsoVencidoNaoHabilitaDescarte
    -> nenhum contraexemplo no scope declarado
bottle_state.als, testemunhas, scope 6:
  TestemunhaDescarteVencidoAberto, TestemunhaDescarteVencidoFechado,
  TestemunhaDescarteVazio, TestemunhaDescarteQuebrado,
  TestemunhaVencidoComUsoAutorizado -> SAT
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
| `just alloy-check` | PASS | M0 + 44 comandos M2.2 (25 checks UNSAT, 9 runs SAT de estado; 5 checks UNSAT, 5 runs SAT de identidade) |
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
rate limit, Q06, tara numérica, refill, cálculo de validade/vencimento (somente
os fatos atuais `vencido`/`usoVencidoAutorizado`), empréstimo completo nem
integração LaTeX. Não substitui M2.3. A composição de um modelo único M0 ∧ M2.2
não é feita aqui (dívida para M2.4, se reservada).

## Estado final

- M2.2 = VALIDATED.
- M2.3 = NOT_STARTED.
- Nenhuma HQ nova.

## Commits

Unidade original (já publicada):
- `a3bf7303` — `feat(alloy): model M2 bottle identity relations`.
- `aeeb712c` — `feat(alloy): model M2 bottle state coherence`.
- `ae176154` — `test(alloy): gate M2 identity and state witnesses`.
- `7eb40930` — `docs(spec): record M2.2 validation state`.
- Publicação: push autorizado explicitamente pelo usuário e executado. A remota
  contém os commits M2.2 acima, os pendentes anteriores (`0f0505e0`, `dd46a446`)
  e os commits documentais da publicação (`f5384abc`).

Erratum de cobertura:
- `10366096` — `fix(alloy): restore full bottle discard eligibility`
  (`bottle_state.als` + `tools/formal/check.mjs` + `build/formal-validation-m2.json`).
- `dcee5ff4` — `docs(spec): record M2.2 coverage erratum`.

Auditoria de frame conditions:
- `cc8e1ad0` — `fix(alloy): constrain M2 bottle transition frames`
  (`bottle_state.als` + `tools/formal/check.mjs` + `build/formal-validation-m2.json`).
- `5d70bede` — `docs(spec): record M2.2 frame-condition audit`.

Auditoria de estado terminal:
- `1b4adabb` — `fix(alloy): enforce discarded bottle terminality`
  (`bottle_state.als` + `tools/formal/check.mjs` + `build/formal-validation-m2.json`).
- Commit documental da auditoria: `docs(spec): record M2.2 terminal-state audit`.

## Próxima ação EXATA

Planejar M2.3 (proveniência/IR/geração) em tarefa separada, sem iniciá-lo
automaticamente. Não reabrir M0/M1/M2.1d.

