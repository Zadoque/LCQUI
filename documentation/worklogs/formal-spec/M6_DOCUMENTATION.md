# M6 — Q06 / tara / metrologia quantitativa (documentação)

Estado: **DOCUMENTATION_VALIDATED**. Branch: `feat/formal-spec-cue-alloy`.
HEAD de entrada: `3d6ecc60d4c830b4793311c77a8349f3d2b23a80`
(`docs(m5): reconcile final handoff before M6`), árvore limpa.
Revisão seguinte (HQ-M6-001/002): entrada `ee97770dece0fc88302785bb61624178d9697d99`.

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
- **Três rotas metrológicas tipadas** (HQ-M2-009/A revisada por HQ-M6-001):
  `repetirPesagemDevolucaoAnomala`; `confirmarEsgotamentoAposInspecao`;
  `recalibrarTaraFrascoEsgotado`. Todas preservam `peso_retorno`, o status
  histórico e `id_resolucao_metrologica`; nenhuma libera quarentena. A V1
  **não** possui correção administrativa metrológica.
- **Matriz de 26 casos quantitativos** em `longtable` (Seção 7), incluindo as
  faixas de evaporação e a dupla digitação.
- **`massa_perda_estimada_g`** (M5/extravio): permanece estimativa de sinistro;
  exige tara conhecida (não nula) e nunca é consumo validado, peso de retorno,
  prova de descarte ou de saldo zero. Sem tara conhecida permanece `null`.

## Findings

| ID | Categoria | Descrição | Ação |
|---|---|---|---|
| M6-F01 | `LACUNA_DE_DOMINIO` | A quarta rota de resolução (correção administrativa metrológica) da HQ-M2-009 era referida como “já suportada”, mas o único `tipoCorrecao` suportado (`RETIRADA_RETIRANTE_INCORRETO`) não altera metrologia. | **RESOLVIDO por HQ-M6-001**: a V1 não possui correção administrativa metrológica; o conjunto metrológico passa a três rotas. |
| M6-F02 | `LACUNA_DE_DOMINIO` | `peso_perda_evaporacao` não possuía validação para exceder a perda bruta observada. | **RESOLVIDO por HQ-M6-002**: constraint `0 <= evaporação <= perda bruta`; violação rejeitada antes do commit, sem clamp. |
| M6-F03 | `TRADUCAO_DOCUMENTAL_INCORRETA` | `repetirPesagemDevolucaoAnomala` calculava o consumo sem subtrair `peso_perda_evaporacao`, divergindo do contrato de devolução normal e de `confirmarEsgotamentoAposInspecao`, que a subtraem; Section 4 dizia `massa consumida = max(0, saida-retorno)` sem separar evaporação. | Corrigido: consumo = perda bruta menos evaporação em todas as rotas; Section 4/7 ajustadas. |
| M6-F04 | `TRADUCAO_DOCUMENTAL_INCORRETA` | Pseudocódigo da devolução lia `frasco.eh_higroscopico` sem que a autoridade estivesse explícita na Seção 4 (campo denormalizado). | Documentado: snapshot imutável no frasco, fonte canônica `Resumo_Reagente.eh_higroscopico` (Seção 5). |
| M6-F05 | `ERRO_MECANICO` | Fórmulas com `\_` dentro de modo matemático quebravam a compilação. | Corrigido (notação matemática sem `\_`). |

## Decisões humanas resolvidas

- **HQ-M6-001 = RESOLVED.** A V1 **não** possui correção administrativa
  metrológica, genérica ou específica. Não existem `CORRIGIR_PESO_RETORNO`,
  `ERRO_TRANSCRICAO_PESO`, `CORRIGIR_EVAPORACAO`, `CORRIGIR_TARA`, editor
  `campo+novoValor` nem `resolverPendenciaMetrologica` genérico. `corrigirOperacao`
  permanece só para tipos administrativos não metrológicos (hoje
  `RETIRADA_RETIRANTE_INCORRETO`) e **não** é rota metrológica. O conjunto
  metrológico fechado passa a **três rotas**. Consequência documentada: medição
  persistida não tem edição administrativa na V1; a prevenção de erro antes do
  commit passa a ser crítica; uma nova pesagem nunca é prova automática da
  medição histórica anterior; sem rota física legítima, a pendência permanece e
  a V1 não fabrica evidência. Isso não rejeita a filosofia de correções
  compensatórias administrativas não metrológicas.
- **HQ-M6-002 = RESOLVED.** `0 <= peso_perda_evaporacao <= perda_bruta`, com
  `perda_bruta = max(0, peso_saida - peso_retorno_efetivo)`. A evaporação nunca
  excede toda a massa observada como desaparecida. Exemplo inválido rejeitado:
  saída 100 g, retorno efetivo 95 g, evaporação 8 g. Sem clamp para 5 g,
  sem “virar anomalia”, sem corrigir automaticamente; a mensagem indica que a
  evaporação excede a perda bruta e o operador corrige antes da conclusão. Na
  devolução original a validação usa `perda_bruta_observada = max(0, peso_saida -
  peso_retorno)`; se `peso_retorno >= peso_saida`, a evaporação deve ser zero. Na
  resolução, a evaporação é revalidada contra o novo `peso_retorno_efetivo` antes
  de `consumo_validado = true`.

## Prevenção de erro de pesagem (UI-18)

A estratégia de prevenção foi informada por boas práticas gerais de integridade
de dados laboratoriais (minimizar transcrição, checar digitação, preservar o dado
original, trilha auditável, preferir captura eletrônica direta quando possível,
usar validações de faixa/plausibilidade sem falsificar observações). Não é
alegação de conformidade regulatória do LCQUI (FDA/WHO/GxP). A V1 adota **dupla
digitação independente do mesmo operador** (não é dupla conferência por dois
profissionais nem novo papel), unidade fixa em g, contexto visual, alertas de
plausibilidade e revisão final antes do commit.

## Auditoria final restrita de M6

Pergunta de fechamento: existe cenário quantitativo do M6 que exija resultado sem
comportamento suficiente para alcançá-lo sem inventar dado/política? Resposta:
**não**. Verificados Q06, tara, esgotamento, evaporação, ganho, consumo,
densidade, repetição de pesagem, confirmação posterior de vazio, recalibração,
pendência, quarentena e extravio. A limitação de não haver correção metrológica
administrativa foi explicitamente documentada (não é lacuna silenciosa): quando
as três rotas físicas não puderem legitimamente resolver, a pendência permanece.

## Estudo futuro registrado na Seção 12

Nova subseção `Captura automática de pesagens e correção metrológica auditável
(versões futuras)`: estudo A (integração direta com a balança — interfaces,
instrumento, timestamp, unidade/resolução, estabilidade, trilha, offline,
replay) e estudo B (correção metrológica excepcionalíssima, com tipos fechados,
evidência, segunda aprovação, preservação do original). Não são requisitos V1/V2.

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
| `documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex` | Subseção M6: vocabulário, Q06, consumo/evaporação/densidade (constraint), tara, esgotamento, retorno abaixo da tara, ganho, pendência, **três rotas** (sem correção metrológica), matriz de **26 casos**. |
| `documentation/Section-4-Modelagem-Entidades-SQL-3FN.tex` | Q06: perda bruta x consumo com constraint de evaporação; três rotas; sem correção administrativa metrológica. |
| `documentation/Section-10-...-Subsection-5-Fluxo-de-Reagentes.tex` | Validação da evaporação na devolução e nas três rotas; sem quarta rota metrológica. |
| `documentation/Section-8-Descricao-das-telas-Dashboards.tex` | UI-17 (três rotas, sem ``Corrigir operação'') e nova UI-18 (dupla digitação/contexto/alertas/revisão). |
| `documentation/Section-12-...-Versoes-Futuras.tex` | Estudos futuros A (integração com balança) e B (correção metrológica auditável). |
| `documentation/main.pdf` | Recompilado (330 páginas). |
| `documentation/STATUS_ATUAL.md`, `FORMAL_SPEC_STATE.md` | Estado documental de M6. |

Nenhuma coluna nova, enum novo ou entidade nova.

## Validações executadas

- `git status` / diff restrito a arquivos documentais.
- `git diff --check`: PASS.
- Compilação LaTeX (TeX Live/Nix; `just` indisponível por GC do Nix, comando
  `latexmk` da receita `docs-build`): exit 0, **330 páginas**, zero erros e zero
  referências indefinidas; 26 \textit{Overfull} únicos.
- Inspeção com Poppler das páginas alteradas: subseção M6/Q06, tabela de 20
  casos, matriz de ganho, UI-17 e pseudocódigo de `repetirPesagem`.

## Estado final

- M0–M4 = VALIDATED; M5 = DOCUMENTATION_VALIDATED.
- **M6 = DOCUMENTATION_VALIDATED** — contrato quantitativo consolidado; findings
  M6-F01/M6-F02 resolvidos por HQ-M6-001/HQ-M6-002; nenhum finding aberto.
- M7 = NOT_STARTED. A formalização executável de M5/M6 permanece dívida futura.

PRÓXIMA AÇÃO EXATA: INICIAR M7 DOCUMENTAL — Idempotência. Não iniciar M7 nesta
rodada.

## Commits

Revisão HQ-M6-001/002: commits desta rodada e `main.pdf`; HEAD de saída = commit
documental imediatamente posterior ao do PDF, resolvido com
`git log -1 --format=%H --grep="resolve M6 findings and close M6"`.
Os commits da primeira rodada M6 foram `bbe256a8`, `ad2f10df` e `58446729`.
