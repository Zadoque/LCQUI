# M2.1d — Realinhamento formal local pós-HQ-M2-004..007

Estado: VALIDATED (CUE M2 local realinhado às 29 colunas documentais, com
`origem_tara` e invariantes locais de proveniência de tara).
Branch: `feat/formal-spec-cue-alloy`.
HEAD de entrada: `69726049708398eacb2018534e88c49633f53d06`
(`docs(status): update STATUS_ATUAL and M2_HUMAN_QUESTIONS with consolidated decisions and revisions`),
árvore limpa antes das alterações. Nenhuma branch nova. Nenhum push nesta unidade.

Esta execução realinha `specification/cue/domain/frasco_completo.cue` à
documentação normativa consolidada após as decisões humanas HQ-M2-004..007.
NÃO inicia Alloy M2.2, backend, frontend, Rules executáveis, IR, Rust, generated,
cache, rate limiter ou fluxos de empréstimo/devolução.

## Autoridades lidas

- `FORMAL_SPEC_STATE.md`
- `documentation/STATUS_ATUAL.md`
- `documentation/worklogs/formal-spec/M2_HUMAN_QUESTIONS.md`
- `documentation/Section-4-Modelagem-Entidades-SQL-3FN.tex` (entidade `Frasco_Reagente`)
- `documentation/Section-5-Notas-de-Mapeamento-para-Firestore.tex`
- `documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex`
- `documentation/Section-4` e demais seções relevantes via `STATUS_ATUAL.md`
- `specification/README.md`, `specification/cue/README.md`
- `specification/cue/domain/frasco_completo.cue`, `campos_frasco.cue`, `frasco.cue`
- `specification/cue/docs/projection.cue`, `firestore/mapeamentos.cue`
- todos os fixtures do grupo `frasco-completo`
- worklogs `M2_0_BASELINE_RECONCILIATION.md`, `M2_1A_AUDITORIA_NORMATIVA.md`,
  `M2_1B_DOCUMENTATION_RECONCILIATION.md`, `M2_1C_CUE_REALIGNMENT.md`,
  `M2_1_CUE_FRASCO_COMPLETO.md`

Hierarquia de autoridade adotada: (1) decisões humanas RESOLVED em
`M2_HUMAN_QUESTIONS.md`; (2) documentação LaTeX atual; (3) `FORMAL_SPEC_STATE.md`;
(4) CUE M2.1c, artefato realinhado; (5) worklogs históricos.

## Diagnóstico inicial

| Item | Estado antes de M2.1d |
|---|---|
| Seção 4 `Frasco_Reagente` | 29 colunas, com `origem_tara` entre `peso_frasco_vazio` e `medida_usada` |
| CUE `frascoCompletoCampos` (M2.1c) | 28 colunas, sem `origem_tara` |
| diferença | exatamente a coluna `origem_tara` |
| fixtures M2 (`frasco-completo`) | 22 (6 válidas, 16 inválidas) |
| fixtures totais | 64 (M0 7, M1 35, M2 22) |

`origem_tara` formalizada documentalmente com tipo `ENUM`, `nullable`, valores não
nulos `REFERENCIA_TEORICA` e `MEDIDA_REAL`; `NULL` representa ausência de tara
conhecida persistida (não zero, não estimativa).

## Decisões implementadas

- Adicionado o descritor `origem_tara` (`sql: "ENUM"`, `nulo: true`,
  `valores: ["REFERENCIA_TEORICA", "MEDIDA_REAL"]`) na 12ª posição, imediatamente
  após `peso_frasco_vazio` e antes de `medida_usada`, preservando nome e ordem da
  Seção 4.
- INV-M2.1d-TARA-001/002: equivalência local tara ↔ origem. Quando
  `peso_frasco_vazio` é null, `origem_tara` é obrigatoriamente null; quando
  `origem_tara` é null, `peso_frasco_vazio` é obrigatoriamente null.
- INV-M2.1d-TARA-003: `origem_tara == "REFERENCIA_TEORICA"` exige
  `condicao_inicial_cadastro == "FECHADO"`.
- `NULL` de `origem_tara` permanece apenas ausência de tara, via o mecanismo
  existente `nulo: true`; não foi introduzido membro textual `"NULL"` no enum.
- Relações de ciclo de vida e equivalências indevidas (`FECHADO → saldo conhecido`,
  `tara null → saldo_desconhecido true`, `origem não nula → saldo_desconhecido false`,
  `JA_ABERTO → origem sempre NULL`, transições `VAZIO`/`QUEBRADO`/`DESCARTADO`)
  NÃO foram modeladas; pertencem a M2.2.

## Alterações CUE

`specification/cue/domain/frasco_completo.cue`:
- comentário de baseline atualizado de 28 para 29 colunas (M2.1d);
- novo descritor `origem_tara` com observação semântica (referência derivada
  versus medição física; null = ausência, não zero);
- declarações explícitas `peso_frasco_vazio!` e `origem_tara!` no corpo de
  `#FrascoCompleto`, necessárias porque referências usadas em condições `if`
  precisam constar estaticamente do struct (o loop dinâmico não as torna
  referenciáveis em condição);
- três implicações locais de proveniência de tara.

Nenhuma constraint M2.1c foi enfraquecida. Permanecem intactas: identidade
relacional local (`id_lote` ↔ `id_especificacao_reagente`), abertura histórica
(`abertura_historica_desconhecida → data_abertura null` e `→ estado != FECHADO`)
e quarentena (`em_quarentena → detalhe_status != null`).

## Fixtures

### Anteriores atualizados (22)

Todas receberam `origem_tara` imediatamente após `peso_frasco_vazio`, ocupando a
posição 12 da linha completa. Como todas possuem `peso_frasco_vazio = null`, a
origem usada foi `null`, exceto `limites_numericos_zero.json`, cujo
`peso_frasco_vazio = 0` (não nulo) e `condicao_inicial_cadastro = FECHADO`
recebeu `REFERENCIA_TEORICA`.

- válidas (6): `abertura_historica`, `historico_extraviado`,
  `limites_numericos_zero`, `quarentena_com_detalhe`, `rota_direta`, `rota_lote`.
- inválidas (16): `abertura_historica_com_data`, `abertura_historica_fechado`,
  `data_formato`, `disponibilidade_enum`, `escala_numerica`, `estado_enum`,
  `identidade_ausente`, `identidade_dupla`, `nao_null`, `nullable_ausente`,
  `prazo_zero`, `precisao_numerica`, `projecao_firestore`,
  `quarentena_sem_detalhe`, `saldo_ausente`, `timestamp_tipo`.

Cada inválida foi diagnosticada isoladamente por `cue vet -c`: todas continuam
falhando pelo motivo original; nenhuma falha passou a ser causada por
`origem_tara`. Exemplos: `projecao_firestore` falha em `eh_higroscopico: field
not allowed`; `quarentena_sem_detalhe` falha em `detalhe_status`; `identidade_*`
falham na XOR; `abertura_historica_fechado` falha em `estado_fisico_frasco`.

### Novas (8)

| Fixture | Tipo | Objetivo | Esperado | Real |
|---|---|---|---|---|
| `valid/sem_tara_sem_origem.json` | válida | FECHADO + nominal NULL + tara NULL + origem NULL (HQ-M2-004) | PASS | PASS |
| `valid/origem_referencia_teorica_fechado.json` | válida | origem REFERENCIA_TEORICA de frasco originalmente FECHADO | PASS | PASS |
| `valid/origem_medida_real_fechado.json` | válida | tara real de frasco originalmente FECHADO | PASS | PASS |
| `valid/origem_medida_real_ja_aberto.json` | válida | JA_ABERTO que adquiriu tara real posteriormente (impede `JA_ABERTO → origem sempre NULL`) | PASS | PASS |
| `invalid/origem_sem_tara.json` | inválida | origem presente com tara null — viola INV-M2.1d-TARA-001 | FAIL | FAIL em `origem_tara` (linha 61) |
| `invalid/tara_sem_origem.json` | inválida | tara presente com origem null — viola INV-M2.1d-TARA-002 | FAIL | FAIL em `peso_frasco_vazio` (linha 62) |
| `invalid/referencia_teorica_ja_aberto.json` | inválida | REFERENCIA_TEORICA com condição inicial JA_ABERTO — viola INV-M2.1d-TARA-003 | FAIL | FAIL em `condicao_inicial_cadastro` (linha 65) |
| `invalid/origem_enum.json` | inválida | valor `ESTIMADA` fora do enum | FAIL | FAIL na disjunção de `origem_tara` |

Terminologia explícita `REFERENCIA_TEORICA`/`MEDIDA_REAL`; nenhum nome vago como
`tara_conhecida`. Nenhuma fixture reintroduz a antiga regra dos 5 g.

### Contagem

- M2 antes: 22 (6 válidas, 16 inválidas).
- novas M2.1d: 8 (4 válidas, 4 inválidas).
- M2 agora: 30 (10 válidas, 20 inválidas).
- total agora: 72 (M0 7, M1 35, M2 30).

## Paridade Seção 4 × CUE

Verificação reproduzível comparando os nomes de `\campo{}` da entidade
`Frasco_Reagente` com `cue export ./domain -e frascoCompletoCampos`:

```text
Seção 4: 29
CUE:     29
nomes e ordem: PASS
origem_tara: tipo=enum, sql=ENUM, nulo=true,
             valores=["REFERENCIA_TEORICA","MEDIDA_REAL"]
nulabilidade de origem_tara: PASS
enum origem_tara: PASS
```

Comando usado:

```sh
node -e '...'   # extrai \\campo{...} da Seção 4 e compara com
                # cue export ./domain -e frascoCompletoCampos
```

## Gates

| Comando | Resultado | Observação |
|---|---|---|
| `just spec-check` | PASS | vet do módulo, 72 fixtures (7/35/30), gate `cue fmt` sem mutação |
| `just spec-export` | PASS | IR v2 inalterado; projeção usa a fatia M0 |
| `just alloy-check` | PASS | regressão do modelo existente; M2.2 NÃO executado porque continua NOT_STARTED |
| `git diff --check` | PASS | sem erros de whitespace |

`build/spec-ir.json` e `build/formal-validation.json` permaneceram idênticos
(`git diff` vazio): `frascoCompletoCampos` não entra no IR; nenhuma mudança de
IR/Rust/generated foi produzida.

## Limitações — o que M2.1d NÃO prova

M2.1d prova apenas a estrutura local de `origem_tara`, o enum permitido, a
nulabilidade, a coerência local tara ↔ origem, a impossibilidade de
`REFERENCIA_TEORICA` para `condicao_inicial_cadastro = JA_ABERTO`, a manutenção
das constraints M2.1c anteriores e a ausência de regressão nos fixtures
executados.

M2.1d NÃO prova ciclo de vida completo, transições, quarentena × disponibilidade,
consumo, devolução anômala, cache, rate limit, concorrência Firestore,
autorização, resolução de anomalia, fluxo de empréstimo, invariantes globais
Alloy nem implementação real de backend. Um `PASS` de CUE não certifica nenhum
desses temas.

## Efeito nos milestones

- M0/M1: VALIDATED; intactos.
- M2.0/M2.1/M2.1a: validações históricas.
- M2.1b: DOCUMENTATION_VALIDATED.
- M2.1c: VALIDATED.
- M2.1d: VALIDATED.
- M2.2: NOT_STARTED.
- M2: IN_PROGRESS.

## HQs

HQ-M2-001..007 permanecem RESOLVED. Nenhuma pergunta foi reaberta e nenhuma nova
pergunta humana foi criada.

## Commits

- `fd6d3bc1` — `feat(cue): realign M2 bottle schema with M2.1d origem_tara`
  (CUE + 22 fixtures existentes). Commit local, sem push.
- `c6bad174` — `test(cue): add M2.1d tara-origin fixtures` (8 fixtures novas).
  Commit local, sem push.
- Commit documental desta unidade: `docs(spec): record M2.1d CUE realignment`
  (este worklog, `FORMAL_SPEC_STATE.md` e `STATUS_ATUAL.md`). Um commit não
  contém seu próprio SHA.

HEAD remota observada antes da unidade: `origin/feat/formal-spec-cue-alloy` em
`69726049708398eacb2018534e88c49633f53d06`.

## Verificação posterior de publicação

No encerramento da execução registrada acima, os três commits estavam apenas
locais: a branch estava três commits à frente da remota e nenhum push foi feito
pelo agente. Esse permanece sendo o fato histórico desta execução.

Em verificação posterior, a branch remota `origin/feat/formal-spec-cue-alloy`
passou a apontar para:

```text
f27a797289dfa28ec4f3b445feb5599900cd4410
```

Portanto os três commits M2.1d (`fd6d3bc1`, `c6bad174`, `f27a7972`) encontram-se
atualmente publicados. O Git permite afirmar apenas que a remota mudou; o push
ocorreu fora da execução M2.1d e não foi executado pela unidade registrada neste
worklog. Isso não altera nenhuma conclusão técnica de M2.1d.

## Próxima ação EXATA

Planejar/iniciar M2.2 em tarefa separada, usando o schema local M2.1d como
baseline congelado. Não iniciar M2.2 automaticamente.
