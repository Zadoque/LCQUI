# Pré-M8 — reconciliação e backfill executável M5–M7

Estado da rodada: EM ANDAMENTO; nenhum PASS de M5–M7 declarado.
HEAD de entrada: `de6de7f49b766c6bd8bb2c94911d6a5cf74adbc6`.
Branch: `feat/formal-spec-cue-alloy`; árvore inicialmente limpa.

## Objetivo e escopo

Reconciliar resíduos correntes de M7 e quitar a dívida executável de M5–M7
até CUE → IR → Alloy → receipts → Rust → LaTeX → PDF. M8 não iniciado.
Autorizados: estado/worklogs, specification/, tools/formal/, tools/spec-doc/,
build/ formal e documentação. Proibidos: lógica de frontend/, functions/,
Rules, configurações Firebase operacionais e mudanças normativas por conveniência.
generated/ só pode ser escrito pelo Rust.

Documentação é autoridade humana; CUE verifica estrutura e quantitativos
expressáveis; Alloy verifica relações/transições em scopes limitados; Rust
valida proveniência/conjuntos exatos e gera evidência determinística; LaTeX
humano explica limites. Nenhuma camada certifica o backend real.

## Leitura e reconciliação mecânica

Lidos os arquivos obrigatórios da fase 0, os contratos normativos pertinentes
das Seções 4/5/7/8/9/10/11/12 e as receitas reais do justfile.

Resíduos correntes encontrados e corrigidos (linhas da HEAD de entrada):

| Arquivo/linha | Resíduo | Correção |
|---|---|---|
| FORMAL_SPEC_STATE.md:6 | M7 documental é o próximo milestone | M5–M7 documentais concluídos; backfill pré-M8 pendente |
| STATUS_ATUAL.md:27 | próxima ação é M7 documental | explicitamente checkpoint histórico |
| STATUS_ATUAL.md:38 | estado corrente M7 NOT_STARTED | DOCUMENTATION_VALIDATED |
| STATUS_ATUAL.md:51 | M7 NOT_STARTED após estado corrente | DOCUMENTATION_VALIDATED |
| STATUS_ATUAL.md:195 | estado corrente M7 NOT_STARTED | DOCUMENTATION_VALIDATED |
| PRE_M5_RECONCILIATION.md:6 | banner corrente M7 NOT_STARTED | DOCUMENTATION_VALIDATED; M8 NOT_STARTED |
| M5_DOCUMENTATION.md:12 | nota corrente pós-M6, M7 NOT_STARTED | nota pré-M8 atualizada |
| M5_DOCUMENTATION.md:232 | “hoje” M7 NOT_STARTED | explicitamente checkpoint pós-M6 |
| M5_DOCUMENTATION.md:236 | próxima ação corrente INICIAR M7 | backfill pré-M8 |

As próximas ações nos dois arquivos de estado agora condicionam a entrada de
M8 à quitação executável. Estados históricos em M6_DOCUMENTATION e
PRE_M7_RECONCILIATION foram preservados. M5–M7 continuam DOCUMENTATION_VALIDATED.

## Finding bloqueante / HQ-PRE-M8-001 — OPEN

Classificação: CONTRADICAO_REAL entre regras normativas, identificada na leitura.
Não é motivo para enfraquecer assertions nem excluir witness.

- Seção 4, linha 401: VAZIO/QUEBRADO/DESCARTADO não mantêm saldo desconhecido.
  Implementada em `bottle_state.als:48`, `bottle_composition.als` e
  `withdrawal_return.als:98` (`coerenteM2`).
- Seção 7, linha 201 (M5): reencontro preserva saldo_desconhecido e permite
  QUEBRADO como quebra constatada; não restringe essa constatação a saldo conhecido.
- Seção 10.5, linhas 1036–1041 e 1060–1077: aceita QUEBRADO e preserva a flag.
- Cenário: ABERTO com saldo desconhecido → EXTRAVIADO preservando a flag →
  reencontrado QUEBRADO, em quarentena, ainda com a flag true. O estado final
  viola `coerenteM2`, embora siga literalmente M5.

Decisão humana solicitada: qual regra prevalece para o reencontro QUEBRADO de
um frasco com saldo anteriormente desconhecido? Não presumir que mudar a flag
equivale a medir quantidade zero. Não rejeitar silenciosamente esse reencontro.
A composição completa de M5 está impedida enquanto ambas as regras forem exigidas.

## Validações e evidências

Pendentes de execução/registro: diagnóstico Alloy, gates, hashes, contagens,
receipts M5/M6/M7, módulos Rust, geração e integração PDF. IR ainda v3;
gerador ainda 0.2.0. Nenhuma nova evidência mecânica publicada.

## Saída e decisão sobre M8

M0–M4: validações históricas preservadas. M5/M6/M7: DOCUMENTATION_VALIDATED,
backfill não concluído. M8 = NOT_STARTED. **M8 NÃO PODE INICIAR** enquanto houver
HQ bloqueante ou gate pendente. Commits/HEAD de saída serão registrados após execução.
