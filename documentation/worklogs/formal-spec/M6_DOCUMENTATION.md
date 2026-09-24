# M6 — Q06 / tara / metrologia quantitativa (documentação)

Estado: **DOCUMENTATION_IN_PROGRESS**. Branch: `feat/formal-spec-cue-alloy`.
HEAD de entrada: `3d6ecc60d4c830b4793311c77a8349f3d2b23a80`
(`docs(m5): reconcile final handoff before M6`), árvore limpa.

Esta rodada é **exclusivamente documental**. NÃO formaliza M6 em CUE/Alloy/Rust
e NÃO altera `frontend/`, `functions/`, `firestore.rules`, `storage.rules`,
`firebase.json`, `.firebaserc`, `specification/`, `tools/`, fixtures, IR,
receipts nem `documentation/generated/`. M7 não foi iniciado.

## Escopo

Consolidar o contrato quantitativo: Q06, ganho de massa, higroscopicidade,
consumo, evaporação, densidade histórica, tara (desconhecida/teórica/real),
esgotamento, saldo conhecido/desconhecido, devolução metrologicamente anômala,
resolução posterior, recalibração, efeitos históricos, quarentena e interação
com o extravio de M5.

## Fontes lidas

`FORMAL_SPEC_STATE.md`; `documentation/STATUS_ATUAL.md`;
`documentation/worklogs/formal-spec/M2_HUMAN_QUESTIONS.md` (HQ-M2-004/005/007/009);
`M5_DOCUMENTATION.md`; Sections 4 (Frasco/Emprestimo/Historico/Q06), 5
(dicionário e semântica quantitativa), 7 (regras de pesagem, Q06, tara, saldo,
devolução), 8 (telas), 9 (exemplos), 10.5 (fluxo e resolução) e 10.11 (pesagem).
`functions/src/reagentes.ts` apenas como evidência de divergência.

## Decisões anteriores preservadas

- Q06 dinâmica sobre o peso bruto de saída; limiar fixo de 5\,g eliminado.
- Esgotamento por confirmação humana explícita, não por comparação com a tara.
- Tara: desconhecida (`NULL`), referência teórica derivada e tara real medida.
- Quatro caminhos tipados de resolução (HQ-M2-009/A), sem dispatcher genérico.
- Status histórico `DEVOLVIDO_COM_ANOMALIA` não é reescrito pela resolução.
- Resolver pendência não libera quarentena (M5).

## Semântica consolidada (Seção 7, subseção M6)

- **Q06**: normal $\max(1g, 0{,}005\times peso\_saida)$; higroscópico
  $\max(2g, 0{,}02\times peso\_saida)$; anomalia se
  $peso\_retorno > peso\_saida + tolerancia$. Q06 compara retorno com saída,
  nunca com a tara; não existe tolerância de tara nem limiar fixo.
- **Vocabulário**: `peso_saida`, `peso_retorno`, `peso_retorno_efetivo`,
  `peso_atual`, `peso_frasco_vazio`/`origem_tara`, `peso_no_cadastrado`,
  `medida_utilizada`, `peso_perda_evaporacao`, `massa_perda_estimada_g`, saldo,
  `saldo_desconhecido`, `consumo_validado`, `anomalia_metrologica`,
  `id_resolucao_metrologica`, `densidade_aplicada` — cada um com autoridade
  única. Desconhecido $\neq$ zero, estimado $\neq$ medido, atual $\neq$
  histórico, referência teórica $\neq$ tara real.
- **Consumo/evaporação/densidade**:
  $\Delta_{bruto}=peso\_saida-peso\_retorno^{efetivo}$;
  $massa\_consumida=\max(0,\Delta_{bruto}-\text{Evap})$; volume por
  `densidade_aplicada` histórica e positiva (nunca densidade corrente
  arbitrária).
- **Higroscopicidade**: `eh_higroscopico` do frasco é snapshot denormalizado e
  imutável, preenchido no cadastro a partir de `Resumo_Reagente.eh_higroscopico`
  (Seção 5); alterações posteriores do resumo não o reescrevem.
- **Tara**: três situações fechadas (desconhecida / `REFERENCIA_TEORICA` /
  `MEDIDA_REAL`); tara real só com recipiente efetivamente vazio pesado.
- **Esgotamento**: confirmação explícita; `VAZIO`/INDISPONIVEL/saldo zero; tara
  real estabelecida se não havia; `conteudo_nominal` inalterado; tara real
  divergente preservada + `DISCREPANCIA_TARA_REAL` + recalibração auditável.
- **Retorno abaixo da tara**: abaixo de tara real → `DEVOLVIDO_COM_ANOMALIA` com
  pendência, INDISPONIVEL e quarentena; abaixo de referência teórica →
  `REFERENCIA_TEORICA_INCONSISTENTE`, sem impossibilidade física.
- **Ganho de massa**: matriz de três faixas × higroscopicidade; dentro da
  tolerância = consumo zero (evento de higroscopia só se higroscópico); acima de
  Q06 = anomalia, sem rollback, custódia encerrada e frasco bloqueado.
- **Pendência**: `existePendenciaMetrologicaTx(idFrasco)` = existe empréstimo com
  `status=DEVOLVIDO_COM_ANOMALIA` E `consumo_validado=false`; autoridade
  `Emprestimo_Reagente`; fora do par é inconsistência de integridade.
- **Quatro rotas tipadas**: `repetirPesagemDevolucaoAnomala`;
  `confirmarEsgotamentoAposInspecao`; `recalibrarTaraFrascoEsgotado`; correção
  administrativa suportada. Todas preservam `peso_retorno`, o status histórico e
  `id_resolucao_metrologica`; nenhuma libera quarentena.
- **Matriz de 20 casos quantitativos** em `longtable` (Seção 7).
- **`massa_perda_estimada_g`** (M5/extravio): permanece estimativa de sinistro;
  exige tara conhecida (não nula) e nunca é consumo validado, peso de retorno,
  prova de descarte ou de saldo zero. Sem tara conhecida permanece `null`.

## Findings

| ID | Categoria | Descrição | Ação |
|---|---|---|---|
| M6-F01 | `LACUNA_DE_DOMINIO` | A quarta rota de resolução (correção administrativa metrológica) da HQ-M2-009 é referida como “já suportada”, mas o único `tipoCorrecao` suportado (`RETIRADA_RETIRANTE_INCORRETO`) não altera metrologia; o conjunto concreto de correções administrativas metrológicas da V1 não está enumerado. | Registrado. Proposta **HQ-M6-001**. Não foi inventada lista; M6 fica IN_PROGRESS. |
| M6-F02 | `LACUNA_DE_DOMINIO` | `peso_perda_evaporacao` não possui validação documentada para o caso em que excede a perda bruta observada (evaporação maior que o desaparecimento de massa), resultado fisicamente impossível. | Registrado. Proposta **HQ-M6-002**. Não foi inventada política; M6 fica IN_PROGRESS. |
| M6-F03 | `TRADUCAO_DOCUMENTAL_INCORRETA` | `repetirPesagemDevolucaoAnomala` calculava o consumo sem subtrair `peso_perda_evaporacao`, divergindo do contrato de devolução normal e de `confirmarEsgotamentoAposInspecao`, que a subtraem; Section 4 dizia `massa consumida = max(0, saida-retorno)` sem separar evaporação. | Corrigido: consumo = perda bruta menos evaporação em todas as rotas; Section 4/7 ajustadas. |
| M6-F04 | `TRADUCAO_DOCUMENTAL_INCORRETA` | Pseudocódigo da devolução lia `frasco.eh_higroscopico` sem que a autoridade estivesse explícita na Seção 4 (campo denormalizado). | Documentado: snapshot imutável no frasco, fonte canônica `Resumo_Reagente.eh_higroscopico` (Seção 5). |
| M6-F05 | `ERRO_MECANICO` | Fórmulas com `\_` dentro de modo matemático quebravam a compilação. | Corrigido (notação matemática sem `\_`). |

## Decisões humanas pendentes

- **HQ-M6-001 (proposta)** — conjunto concreto das correções administrativas
  metrológicas suportadas.
- **HQ-M6-002 (proposta)** — resposta a `peso_perda_evaporacao` acima da perda
  bruta observada (rejeitar, classificar como anomalia ou aceitar com clamp).

## Fronteiras

- **M7 (idempotência)**: as operações de resolução têm `idOperacao`/
  `id_operacao`; o mecanismo global não é redesenhado.
- **M8 (estoque)**: a resolução só invalida cache/altera saldo corrente quando
  muda a contribuição atual do frasco; escassez/dashboard não são redesenhados.
- **M9 (autorização)**: papéis conceituais Chefe\_Geral/Gestor\_Almoxarifado já
  existentes.

## Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex` | Nova subseção M6 (vocabulário, Q06, consumo/evaporação/densidade, tara, esgotamento, retorno abaixo da tara, ganho, pendência, quatro rotas, matriz de 20 casos); fórmula de consumo com evaporação. |
| `documentation/Section-4-Modelagem-Entidades-SQL-3FN.tex` | Q06: separação entre perda bruta e consumo (evaporação). |
| `documentation/Section-10-...-Subsection-5-Fluxo-de-Reagentes.tex` | `repetirPesagemDevolucaoAnomala` passa a subtrair `peso_perda_evaporacao`. |
| `documentation/Section-8-Descricao-das-telas-Dashboards.tex` | Nova UI-17 (resolução metrológica). |
| `documentation/main.pdf` | Recompilado (327 páginas). |
| `documentation/STATUS_ATUAL.md`, `FORMAL_SPEC_STATE.md` | Estado documental de M6. |

Nenhuma coluna nova, enum novo ou entidade nova.

## Validações executadas

- `git status` / diff restrito a arquivos documentais.
- `git diff --check`: PASS.
- Compilação LaTeX (TeX Live/Nix; `just` indisponível por GC do Nix, comando
  `latexmk` da receita `docs-build`): exit 0, **327 páginas**, zero erros e zero
  referências indefinidas; 29 \textit{Overfull} únicos (tabelas novas).
- Inspeção com Poppler das páginas alteradas: subseção M6/Q06, tabela de 20
  casos, matriz de ganho, UI-17 e pseudocódigo de `repetirPesagem`.

## Estado final

- M0–M4 = VALIDATED; M5 = DOCUMENTATION_VALIDATED.
- **M6 = DOCUMENTATION_IN_PROGRESS** — contrato quantitativo consolidado, mas
  dois findings de lacuna (M6-F01, M6-F02) exigem decisão humana antes de M7.
- M7 = NOT_STARTED.

PRÓXIMA AÇÃO EXATA: auditar/reconciliar os findings M6 (HQ-M6-001, HQ-M6-002)
antes de iniciar o M7 documental. Não iniciar M7.

## Commits

`bbe256a8` (Q06/tara, Seções 4/7), `ad2f10df` (pseudocódigo + UI-17,
Seções 10.5/8) e `58446729` (`main.pdf`). HEAD de saída: commit documental
imediatamente posterior ao do PDF (`58446729` + 1), resolvido com
`git log -1 --format=%H --grep="record M6 documentation state"`.
