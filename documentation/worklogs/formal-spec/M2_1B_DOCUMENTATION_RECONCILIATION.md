# M2.1b — Reconciliação documental pós-decisões humanas

Estado: M2.1b DOCUMENTATION_VALIDATED.
Branch: `feat/formal-spec-cue-alloy`. Execução exclusivamente documental.
HEAD de entrada: `de874a4bf2e9c1827feef2b6b4a52f552db06fdb`, árvore limpa,
sincronizada com `origin`. Não foi criada branch nova.

Este checkpoint é posterior ao M2.1a e NÃO implica que o CUE já represente a
nova documentação. M2.1/M2.1a continuam sendo validações históricas do CUE
contra a documentação então vigente. Como a documentação evoluiu, registra-se
explicitamente: **o CUE M2.1/M2.1a necessita realinhamento antes de M2.2.**

## Decisões humanas aplicadas

1. `condicao_inicial_cadastro` (enum `FECHADO`/`JA_ABERTO`) como dimensão
   histórica imutável, distinta de `saldo_desconhecido`.
2. Cadastro de frasco já aberto sem fabricar tara nem saldo: elimina
   `CONHECE_TARA`/`ESTIMA_VOLUME`/`ESTIMA_MASSA` e os campos
   `pesoFrascoVazioInformado`/`volumeAtualEstimado`/`massaAtualEstimada`;
   inicia `peso_frasco_vazio = NULL` e `saldo_desconhecido = true`.
3. `conteudo_nominal` é declaração original do fabricante; NULL quando
   desconhecido; nunca 0 para representar desconhecido.
4. Tara real = peso do recipiente efetivamente vazio medido; eliminada a
   recalibração parcial estimada (`recalibrarTaraParcial`/`novoPesoVazioEstimado`).
5. Esgotamento confirmado explicitamente pelo gestor (frasco FECHADO ou
   JA_ABERTO), não pela comparação com a tara; peso de retorno vira tara real.
6. Ciclo de vida de `saldo_desconhecido`: atual (não histórico); JA_ABERTO
   inicia true; esvaziamento com tara real vira false; VAZIO/QUEBRADO/DESCARTADO
   não mantêm; EXTRAVIADO e quarentena preservam.
7. `abertura_historica_desconhecida` é histórica (data_abertura null, estado
   atual nunca FECHADO, preservada em estados posteriores), sem fabricar data.
8. `validade_desconhecida` cobre validade efetiva indeterminável por ausência da
   data histórica de abertura; `true` não implica `vencido=false`; vencimento
   ortogonal à quarentena; inexistente "revalidação de validade".
9. Justificativas humanas `>= 20` após trim somente para a lista fechada;
   mensagens automáticas isentas; sem mínimo global em `detalhe_status`.
10. Correção compensatória e auditável de erro do gestor (ex.: retirante
    errado), sem devolução fictícia, sem consumo fictício, sem DELETE.
11. Resumos diários como projeções reconstruíveis; `consolidarResumosDiarios`;
    REPROCESSAMENTO substitui (não incrementa); IDs determinísticos; metadados
    `calculado_em`/`versao_calculo`; DATA_ALVO/janela/corte; correção histórica
    reprocessa o dia afetado; D-1 + D-0; `evaporacaoMl`.
12. M0: erratum textual somente.

## Arquivos modificados

- `documentation/Section-4-Modelagem-Entidades-SQL-3FN.tex`
- `documentation/Section-5-Notas-de-Mapeamento-para-Firestore.tex`
- `documentation/Section-6-Materialized-Views.tex`
- `documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex`
- `documentation/Section-8-Descricao-das-telas-Dashboards.tex`
- `documentation/Section-9-Exemplos-de-fluxos.tex`
- `documentation/Section-10-.../Section-10-Subsection-5-Fluxo-de-Reagentes.tex`
- `documentation/Section-10-.../Section-10-Subsection-6-Validacao-sincrona-de-validade.tex`
- `documentation/Section-10-.../Section-10-Subsection-7-Jobs-Agendados.tex`
- `documentation/Section-10-.../Section-10-Subsection-9-Relatorios-em-PDF.tex`
- `documentation/Formal-Spec-M0.tex`
- `documentation/MODIFICACOES_CONSOLIDADAS_LCQUI.md` (registro de decisão Q06/Q04)
- `documentation/worklogs/formal-spec/M2_HUMAN_QUESTIONS.md`
- `documentation/worklogs/formal-spec/M2_1B_DOCUMENTATION_RECONCILIATION.md` (este)
- `FORMAL_SPEC_STATE.md`

## Mudanças principais

- cadastro: `condicao_inicial_cadastro`; JA_ABERTO sem tara/saldo fabricados;
  FECHADO com tara apenas derivada; lote opcional.
- tara: real = recipiente vazio medido; removida recalibração parcial estimada;
  `recalibrarTaraFrascoEsgotado` exige recipiente vazio e motivo.
- saldo: `saldo_desconhecido` com ciclo de vida definido (D8).
- validade: `validade_desconhecida` cobre indeterminação; vencimento ortogonal.
- quarentena: operações `colocarFrascoEmQuarentena` e `resolverQuarentenaFrasco`
  transacionais, idempotentes, com TOCTOU, escopo, motivo e histórico; sem
  revalidar validade; sem forçar `vencido`.
- extravio/reencontro: preserva `saldo_desconhecido`; reencontro em quarentena;
  não fabrica data de abertura (marca flag e `validade_desconhecida`).
- correções: `corrigirOperacao` compensatória e auditável.
- resumos/reprocessamento: produtor `consolidarResumosDiarios(DATA_ALVO)`;
  IDs determinísticos; unicidade diária; substituição; metadados; reprocesso de
  dias históricos afetados.
- UI: separação condição física inicial × condição operacional; lote opcional;
  frasco já aberto sem estimativas; confirmação de vazio na devolução; UI-14
  (quarentena) e UI-15 (corrigir operação).

## Contradições encontradas e resolvidas

1. `Formal-Spec-M0.tex` ainda dizia "frasco extraviado disponível, mas
   fisicamente inapto" — corrigido para "indisponível e fisicamente inapto"
   (erratum textual; CUE/Alloy/Rust do M0 intactos).
2. `Section-5` descrevia `peso_frasco_vazio` como exclusivamente real, mas o
   cadastro FECHADO persiste tara derivada — reconciliado explicitando a
   referência derivada provisória até o esgotamento.
3. `MODIFICACOES_CONSOLIDADAS_LCQUI.md` equiparava `PENDENTE_DE_DESCARTE` a
   `vencido = true` e permitia recalibração de tara com produto restante —
   corrigido para o modelo ortogonal e para tara real somente com recipiente
   vazio.

## Material histórico preservado

`documentation/archive/**`, `documentation/worklogs/consolidacao-gemini/**`,
`DECISOES_DOCUMENTAIS_*`, `Fase_3*.md` e afins permanecem como registros
históricos, inclusive menções às modalidades antigas; não são contratos atuais.

## Efeitos

- M0: VALIDATED mantido; apenas erratum textual. Nenhum CUE/Alloy/Rust/IR/PDF
  formal do M0 alterado. Nenhuma prova reexecutada.
- M1: não afetado. Nenhum schema/generated/contrato M1 tocado.
- M2.1/M2.1a: validações históricas do CUE contra a documentação anterior.
  CUE M2.1a (`em_quarentena => detalhe_status != null`) permanece, mas o CUE M2
  NÃO foi realinhado às novas decisões (frasco.cue/frasco_completo.cue intactos).
- M2.2: NOT_STARTED.

## Novas HQs (não inventar domínio)

- HQ-M2-004: cadastro FECHADO com `conteudo_nominal = NULL`.
- HQ-M2-005: retenção do limiar de 5 g abaixo da tara como anomalia.
- HQ-M2-006: suficiência de replay / snapshot mínimo de fim de dia.
- HQ-M2-007: `registrarPesagemRotina` como justificativa humana obrigatória.

HQ-M2-001/002/003 marcadas RESOLVED em `M2_HUMAN_QUESTIONS.md`.

## Implementation gaps (não corrigidos nesta execução)

- `functions/src/`: backend real ainda implementa `modalidade`/`CONHECE_TARA`/
  `ESTIMA_*`, recalibração parcial, e não possui `condicao_inicial_cadastro`,
  `colocarFrascoEmQuarentena`, `resolverQuarentenaFrasco` nem `corrigirOperacao`.
  IMPLEMENTATION_GAP — execução futura.
- `frontend/`: UI real ainda expõe as modalidades antigas e não tem UI-14/UI-15.
  IMPLEMENTATION_GAP.
- Automação de reprocessamento dos resumos diários por correção histórica ainda
  não implementada. IMPLEMENTATION_GAP.
- CUE M2 desalinhado das novas decisões. Próxima execução.

## Auditoria final (após zero inconsistências conhecidas)

Três rodadas consecutivas, cada uma releu entidades, regras, UI, fluxos,
10.5/10.6/10.7/10.9, confrontou estados/flags/pesos/validade/quarentena/
materializações e executou buscas léxicas.

- PASS 1: encontrou `MODIFICACOES_CONSOLIDADAS_LCQUI.md:125`; corrigido,
  contador reiniciado.
- PASS 2: encontrou `MODIFICACOES_CONSOLIDADAS_LCQUI.md:53`; corrigido,
  contador reiniciado.
- PASS A: sem novas inconsistências.
- PASS B: sem novas inconsistências.
- PASS C: sem novas inconsistências.

## Gates

- `git diff --check`: PASS.
- Ambientes LaTeX balanceados em todos os `.tex` alterados (begin/end).
- Buscas léxicas: resíduos somente em material histórico/archive ou em negativas
  explícitas.
- Compilação LaTeX: registrada abaixo.

## Commits

- Checkpoint 1: `docs(frasco): reconcile registration, balance and quarantine semantics`.
- Checkpoint 2: `docs(materialization): define rebuildable daily summaries`.
- Checkpoint final: `docs(spec): record reconciled M2 documentation state`.
- SHAs resolvidos por `git log --format=%H --grep=<assunto>` (um commit não
  contém o próprio SHA). HEAD final desta unidade: o commit final acima.

## Próxima ação EXATA

Auditar a documentação M2.1b e realinhar o CUE M2 (`frasco.cue`/`frasco_completo.cue`)
à nova documentação normativa, reexecutar fixtures; somente depois considerar
M2.2 Alloy. Não iniciar M2.2 nesta unidade.
