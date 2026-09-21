# M2.1c — Auditoria M2.1b e realinhamento do CUE M2

Estado: VALIDATED (CUE M2 realinhado à documentação reconciliada M2.1b).
Branch: `feat/formal-spec-cue-alloy`. HEAD de entrada: `fc94fa8766335c46ffa655b70476da8e8ffb1c27`,
árvore limpa e sincronizada. Nenhuma branch nova.

Esta execução audita a documentação M2.1b e realinha `specification/cue/` a ela.
NÃO inicia M2.2 Alloy. O M0 Alloy foi apenas reexecutado como regressão.

## Auditoria da documentação M2.1b vs. CUE M2.1

| ID | Achado | Classificação | Ação |
|---|---|---|---|
| A-M2.1B-01 | Seção 4 agora tem 28 colunas (`condicao_inicial_cadastro` após `saldo_desconhecido`); CUE tinha 27 | LACUNA_POS_3B | Adicionar campo enum no CUE |
| A-M2.1B-02 | Texto normativo: `abertura_historica_desconhecida=true => estado_fisico_frasco != FECHADO` não modelado | LACUNA_POS_3B | Adicionar constraint local |
| A-M2.1B-03 | `saldo_desconhecido` tem ciclo de vida de criação/transição, não invariante de linha | ESCOPO | Não modelar como constraint local |
| A-M2.1B-04 | `condicao_inicial_cadastro` é histórica/imutável e não implica estado em linha normalizada | ESCOPO | Modelar apenas enum; sem implicação de linha |
| A-M2.1B-05 | `validade_desconhecida` D9b tem exceção ("salvo outra informação suficiente") | ESCOPO | Não é invariante estrita; não modelar |
| A-M2.1B-06 | Quarentena ortogonal e efeito `em_quarentena => INDISPONIVEL` são relacionais/transacionais | ESCOPO_M2.2 | Deferido a M2.2; não modelado agora |
| A-M2.1B-07 | `em_quarentena => detalhe_status != null` (M2.1a) permanece suportado | CONFIRMADA | Preservar |

A comparação automatizada de nomes/ordem entre as 28 colunas da Seção 4 e os 28
descritores de `frascoCompletoCampos` retornou PASS.

## Alterações CUE

`specification/cue/domain/frasco_completo.cue`:
- novo descritor `condicao_inicial_cadastro` (`sql: "ENUM"`, valores `FECHADO`/`JA_ABERTO`);
- nova implicação local `abertura_historica_desconhecida => estado_fisico_frasco != "FECHADO"`;
- observações de `abertura_historica_desconhecida` e `saldo_desconhecido` alinhadas à M2.1b;
- comentário de baseline atualizado para 28 colunas/M2.1c.

Não foram modeladas: implicação de `condicao_inicial_cadastro` sobre estado,
ciclo de vida de `saldo_desconhecido`, exceções de `validade_desconhecida`
e ortogonalidade/coerência de quarentena (relacional, M2.2).

## Fixtures

- As 21 fixtures M2.1 existentes receberam `condicao_inicial_cadastro`
  (presença obrigatória na linha normalizada): FECHADO nas bases; JA_ABERTO em
  `valid/abertura_historica`, `valid/historico_extraviado` e
  `invalid/abertura_historica_com_data`.
- `invalid/abertura_historica_com_data` teve o estado ajustado para ABERTO para
  violar **apenas** a consequência de `data_abertura` (isolamento preservado).
- Nova fixture `invalid/abertura_historica_fechado.json`: flag histórica true
  com estado atual FECHADO, violando a nova implicação A-M2.1B-02.
- Contagens: M0 7 + M1 35 + M2 22 (6 válidas, 16 inválidas) = 64.

## Gates

- `just spec-check`: PASS (vet do módulo, todas as fixtures, gate `cue fmt` sem mutação).
- Diagnósticos: nova inválida falha em `estado_fisico_frasco`; `abertura_historica_com_data`
  falha apenas em `data_abertura`; `abertura_historica.json` válida PASS.
- Comparação Seção 4 × CUE: PASS (28 × 28, nomes e ordem).
- `just spec-export`: PASS (IR v2 inalterado; projeção usa a fatia M0).
- `just alloy-check`: PASS (regressão M0; nenhuma assertion/modelo M2.2 novo).
- `git diff --check`: PASS.

## Efeito nos milestones

- M0: VALIDATED; inalterado; Alloy reexecutado sem regressão.
- M1: não afetado (nenhum arquivo M1 tocado).
- M2.1: validação histórica; M2.1a: validação histórica.
- M2.1b: documentação reconciliada (histórico).
- M2.1c: CUE M2 realinhado à documentação M2.1b. M2.2 NOT_STARTED.

O antigo passo "CUE M2.1/M2.1a necessita realinhamento antes de M2.2" está
cumprido por esta unidade.

## HQs

Inalteradas. HQ-M2-001/002/003 RESOLVED; HQ-M2-004/005/006/007 OPEN, sem
respostas inferidas. Nenhuma decisão de domínio nova foi necessária.

## Commits

- `1655a5bb` — `feat(cue): realign M2 bottle schema with M2.1b documentation`
  (CUE + 22 fixtures), push confirmado em `origin/feat/formal-spec-cue-alloy`.
- Commit documental desta unidade: `docs(spec): record M2.1c CUE realignment`.

## Próxima ação EXATA

Decidir com revisão humana se M2.2 Alloy pode começar, tratando as relações
globais (identidade química única, coerência de quarentena/disponibilidade,
ciclo de vida de flags). Não iniciar M2.2 automaticamente.
