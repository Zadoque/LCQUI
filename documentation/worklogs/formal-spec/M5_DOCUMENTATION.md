# M5 — Extravio / Reencontro / Quarentena (documentação)

Estado: **DOCUMENTATION_VALIDATED**. Branch: `feat/formal-spec-cue-alloy`.
HEAD de entrada: `e560416623f55d4f730c2dc238978e7186d69923`
(`docs(spec): record pre-M5 reconciliation validation`), árvore limpa.
Commits desta rodada: `4647a084` (regras M5, Seções 4/7), `8c9ae939`
(pseudocódigo + UI-16, Seções 10.5/8), `5011ce18` (exemplos, Seção 9) e
`eb7ad016` (`main.pdf`). HEAD de saída: commit documental imediatamente
posterior ao do PDF (`eb7ad016` + 1), resolvido com
`git log -1 --format=%H --grep="record M5 documentation validation"`.
M5 = DOCUMENTATION_VALIDATED; M6 = NOT_STARTED (naquele checkpoint de fechamento de M5).
Nota de estado corrente (pós-M6): `M6 = DOCUMENTATION_VALIDATED`, `M7 = NOT_STARTED`. Este arquivo é registro histórico do fechamento de M5.

Correção pós-auditoria independente (M5-F05..M5-F08): HEAD de entrada
`83157c663f74d1ef3919cc8ab0b41fc3d60f07d6`; commits `6ce31a36` (domínio de
reencontro + terminalidade, Seções 4/7), `224d2872` (pseudocódigo + UI-16,
Seções 10.5/8), `7bdefac4` (casos de regressão, Seção 9) e `1d88970f`
(`main.pdf`); HEAD de saída = commit documental seguinte (`1d88970f` + 1),
resolvido com `git log -1 --format=%H --grep="M5 findings M5-F05"`.

Esta rodada é **exclusivamente documental**. NÃO formaliza M5 em CUE/Alloy/Rust
e NÃO altera `frontend/`, `functions/`, `firestore.rules`, `storage.rules`,
`firebase.json`, `.firebaserc`, `specification/`, `tools/`, código Rust, scripts
Node formais, fixtures, receipts, IR nem `documentation/generated/`. A
formalização executável de M5 permanece para uma etapa posterior; M6 não foi
iniciado.

## Escopo exato

Consolidar normativamente o ciclo de extravio, reencontro, quarentena
obrigatória após reencontro, avaliação do frasco reencontrado e saídas da
quarentena, com efeitos sobre empréstimo, disponibilidade, estado físico,
validade, saldo, pesagens, histórico, estoque e auditoria.

## Fontes consultadas

`FORMAL_SPEC_STATE.md`; `documentation/STATUS_ATUAL.md`;
`documentation/worklogs/formal-spec/PRE_M5_RECONCILIATION.md`;
`documentation/worklogs/formal-spec/M2_HUMAN_QUESTIONS.md` (HQ-M2-008/B,
HQ-M2-001..005); `Section-4` (entidades Frasco/Emprestimo/Historico e máquina de
estados); `Section-5` (dicionários); `Section-7` (regras de status, validade,
descarte e justificativas); `Section-8` (UI-07/UI-14); `Section-9` (exemplos);
`Section-10-Subsection-5` (pseudocódigos `registrarDevolucao`,
`registrarExtravioOuReencontro`, `descartarFrasco`, `colocarFrascoEmQuarentena`,
`resolverQuarentenaFrasco`) e `Section-10-Subsection-7` (job de vencimento).
`functions/src/reagentes.ts` lido apenas como evidência de divergência.

## Regras de M5 consolidadas

- **Extravio.** Permitido de qualquer estado físico, exceto `DESCARTADO`
  (terminal) e o próprio `EXTRAVIADO`; efeito `EXTRAVIADO` + `INDISPONIVEL`;
  preserva saldo, `saldo_desconhecido`, `peso_atual`, tara, validade, `vencido`,
  `uso_vencido_autorizado`, `abertura_historica_desconhecida` e localização.
  Extravio não é consumo, esgotamento nem peso zero.
- **Extravio durante empréstimo.** Encerra o empréstimo ativo como
  `ENCERRADO_EXTRAORDINARIO` / `EXTRAVIO_SINISTRO`; `peso_retorno`,
  `peso_retorno_efetivo`, `medida_utilizada`, `id_resolucao_metrologica` e
  `data_devolucao_efetuada` ficam `NULL`; `consumo_validado = FALSE`;
  `peso_saida` preservado; `massa_perda_estimada_g` só com tara conhecida e como
  estimativa (fronteira M6).
- **Reencontro.** Só de `EXTRAVIADO`; novo fato físico; estado constatado
  `ABERTO`/`FECHADO`/`VAZIO`/`QUEBRADO`, validado contra o último estado antes do
  extravio (`FECHADO` só se antes `FECHADO` e sem abertura; `ABERTO` se antes
  `ABERTO`/`FECHADO`, marcando abertura desconhecida no segundo caso; `VAZIO` só
  se antes `VAZIO`; `QUEBRADO` é quebra constatada); entra compulsoriamente em
  `em_quarentena = TRUE` + `INDISPONIVEL`; não reabre empréstimo; preserva saldo e
  `vencido`; não inventa `VAZIO`/saldo/tara quando apenas parece vazio.
- **Validade no reencontro.** Lê o estado persistido `Frasco_Reagente.vencido`;
  não recalcula pelo relógio, não introduz segunda autoridade temporal e não
  antecipa as correções da V2.
- **Quarentena.** Dimensão operacional própria, distinta de `INDISPONIVEL`;
  bloqueia retirada, devolução (não há empréstimo ativo) e descarte direto;
  ortogonal a estado físico, validade, saldo e anomalia.
- **Saídas.** Conjunto fechado: `VOLTAR_A_DISPONIVEL` (exige estado físico
  ABERTO/FECHADO, sem pendência metrológica e sem vencido sem autorização) e
  `PENDENTE_DE_DESCARTE` (mantém `INDISPONIVEL`, cria autorização estruturada
  consumida por `descartarFrasco`); permanência não é decisão de saída. Nenhuma
  saída revalida validade; não existe `QUARENTENA → DESCARTADO` direto.
- **Rastreabilidade.** Eventos imutáveis `EXTRAVIO`, `REENCONTRO`,
  `ENTROU_EM_QUARENTENA`, `LIBERADO_QUARENTENA`, `PENDENTE_DE_DESCARTE` com
  frasco, almoxarifado, ator, instante, motivo e vínculo ao empréstimo. O
  reencontro não apaga o extravio; a resolução não apaga o reencontro.

## Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `documentation/Section-4-Modelagem-Entidades-SQL-3FN.tex` | 4 linhas novas na máquina de estados (`EXTRAVIADO`, `REENCONTRO`, `QUARENTENA + VOLTAR_A_DISPONIVEL`); correção de "Fechamento dos estados automáticos" (devolução/reencontro leem o persistido). |
| `documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex` | Nova subseção normativa `Extravio, reencontro e quarentena (M5)`. |
| `documentation/Section-8-Descricao-das-telas-Dashboards.tex` | Nova `UI-16: extravio e reencontro de frascos` (UX documental). |
| `documentation/Section-9-Exemplos-de-fluxos.tex` | Fluxos A/B/C/D de extravio/reencontro/quarentena/descarte. |
| `documentation/Section-10-...-Subsection-5-Fluxo-de-Reagentes.tex` | Pseudocódigo de extravio/reencontro corrigido; `lstlisting` separado e rotulado `M5`. |
| `documentation/main.pdf` | Recompilado (316 páginas). |
| `documentation/STATUS_ATUAL.md`, `FORMAL_SPEC_STATE.md` | Estado documental de M5. |
| `documentation/worklogs/formal-spec/M5_DOCUMENTATION.md` | Este registro. |

Nenhuma coluna nova foi criada em `Frasco_Reagente`, `Emprestimo_Reagente` ou
`Historico_Frasco_Reagente`. Nenhum enum novo.

## Extravio durante empréstimo

O empréstimo ativo é encerrado como `ENCERRADO_EXTRAORDINARIO`
(`EXTRAVIO_SINISTRO`). Como não houve retorno físico, não há `peso_retorno`,
`peso_retorno_efetivo` nem consumo validado; `medida_utilizada` fica `NULL`,
`consumo_validado = FALSE`, `peso_saida` é preservado e
`data_devolucao_efetuada` permanece `NULL`. `massa_perda_estimada_g` é estimativa
opcional, só com tara conhecida. A determinação quantitativa definitiva é
fronteira M6.

## Reencontro

Novo fato físico, não desfaz o extravio e não reabre empréstimo. O frasco passa
ao estado constatado com quarentena compulsória e `INDISPONIVEL`.
`REENCONTRADO ≠ DISPONIVEL`.

## Quarentena e saídas

`em_quarentena = TRUE` bloqueia nova retirada e não é sinônimo de
`INDISPONIVEL`. Saídas normativas: `VOLTAR_A_DISPONIVEL` e
`PENDENTE_DE_DESCARTE` (mais a permanência, que não é saída). Nenhuma revalida
validade; o descarte técnico exige `PENDENTE_DE_DESCARTE` (HQ-M2-008/B).

## Validade no reencontro

O estado persistido `Frasco_Reagente.vencido` é a autoridade; a passagem do tempo
é do job de vencimento (Seção 10.7). O reencontro apenas lê o persistido e, no
caso indeterminado, marca `validade_desconhecida`. Nenhuma segunda autoridade
temporal foi introduzida.

## Fronteiras

- **M6 (Q06/tara):** valor quantitativo de `massa_perda_estimada_g`, composição
  de consumo, tara e resolução metrológica. M5 preserva os dados observados e
  não inventa resultado.
- **M7 (idempotência):** as operações de M5 têm `id_operacao` já documentado;
  o mecanismo não foi redesenhado.
- **M9 (autorização):** M5 indica o papel conceitualmente autorizado
  (Chefe\_Geral / Gestor\_Almoxarifado com vínculo); RBAC completo não foi
  redesenhado.

## Findings

| ID | Categoria | Descrição | Ação |
|---|---|---|---|
| M5-F01 | `TRADUCAO_DOCUMENTAL_INCORRETA` | Seção 4 ("Fechamento dos estados automáticos") ainda dizia que o vencimento era recalculado sincronicamente em "cadastro e devolução", contradizendo a autoridade persistida consolidada na reconciliação pré-M5. | Corrigido: recálculo apenas em cadastro e primeira abertura; devolução e reencontro leem o persistido. |
| M5-F02 | `TRADUCAO_DOCUMENTAL_INCORRETA` | Pseudocódigo de extravio gravava `medida_utilizada: 0` e `data_devolucao_efetuada` (retorno físico) e calculava `massa_perda_estimada_g` mesmo sem tara, contradizendo "extravio não é consumo nem devolução física". | Corrigido: `medida_utilizada: null`, `data_devolucao_efetuada` nulo, estimativa só com tara conhecida. |
| M5-F03 | `TRADUCAO_DOCUMENTAL_INCORRETA` + `DIVERGENCIA_IMPLEMENTACAO_FUTURA` | Pseudocódigo de reencontro recalculava vencimento por `validadeCalculada <= agora` e gravava `vencido`, criando segunda autoridade temporal. O mesmo padrão existe em `functions/src/reagentes.ts` (não alterado). | Documentação corrigida para ler o persistido; a implementação permanece dívida futura. |
| M5-F04 | `ERRO_MECANICO` | `registrarExtravio` não bloqueava `DESCARTADO`, apesar da terminalidade consolidada; `FECHADO` no reencontro não era validado contra abertura conhecida. | Guards adicionados ao pseudocódigo. |
| M5-F05 | `CONTRADICAO_NORMATIVA` | O reencontro só aceitava estado constatado `ABERTO`/`FECHADO`, embora `VAZIO` e `QUEBRADO` possam ser extraviados; isso forçava transições físicas inexistentes (`VAZIO`/`QUEBRADO` → `ABERTO`/`FECHADO`). | Reencontro passou a validar o estado constatado (`ABERTO`/`FECHADO`/`VAZIO`/`QUEBRADO`) contra o último estado antes do extravio, obtido da trilha histórica; transições impossíveis são rejeitadas. |
| M5-F06 | `TRADUCAO_DOCUMENTAL_INCORRETA` | Texto dizia que "VAZIO confirmado, QUEBRADO e DESCARTADO seguem a semântica terminal", contradizendo a formalização M2.2, na qual só `DESCARTADO` é terminal. | Reformulado em Seções 4 e 7: `VAZIO` e `QUEBRADO` são fisicamente não utilizáveis/indisponíveis, mas não terminais; só `DESCARTADO` é terminal. Nenhuma formalização M2 alterada. |
| M5-F07 | `ERRO_MECANICO` | `FORMAL_SPEC_STATE.md` ainda afirmava, como estado corrente, que M5 "permanece NOT_STARTED". | Substituído pelo estado corrente `DOCUMENTATION_VALIDATED`, com a formalização executável registrada como dívida futura. |
| M5-F08 | `TRADUCAO_DOCUMENTAL_INCORRETA` | A "Próxima ação EXATA" mandava formalizar M5 (CUE/Alloy/Rust), incompatível com a estratégia de fechar documentalmente até M12. | Próxima ação alterada para `INICIAR M6 DOCUMENTAL — Q06 / tara / metrologia quantitativa`; a formalização de M5 permanece como dívida futura. |

Nenhum finding foi classificado como `LACUNA_DE_DOMINIO`; portanto nenhuma HQ foi
aberta. Observação residual: se relatórios futuros precisarem de um instante de
encerramento no próprio empréstimo, o evento histórico/operação é a fonte; não
bloqueia M5.

## Correção pós-auditoria independente (M5-F05..M5-F08)

Após a primeira validação, uma auditoria independente apontou que o domínio de
reencontro era incompleto para `VAZIO`/`QUEBRADO`, que a terminologia de
terminalidade estava incorreta e que o estado/estratégia no
`FORMAL_SPEC_STATE.md` estavam obsoletos. Correções aplicadas, exclusivamente
documentais:

- Reencontro valida `estadoConstatadoAoReencontrar` contra
  `estadoAntesDoExtravio`, reconstruído da trilha histórica ordenada (sem nova
  coluna, sem reescrever o evento anterior):
  - `FECHADO` só se antes era `FECHADO` e sem abertura conhecida;
  - `ABERTO` se antes era `ABERTO` ou `FECHADO` (neste caso marca
    `abertura_historica_desconhecida`, `validade_desconhecida`,
    `validade_efetiva = null` e `data_abertura = null`);
  - `VAZIO` só se antes era `VAZIO`;
  - `QUEBRADO` representa quebra física constatada;
  - transições impossíveis (`ABERTO`/`VAZIO`/`QUEBRADO` → `FECHADO`;
    `VAZIO`/`QUEBRADO` → `ABERTO`) são rejeitadas.
- Frasco não previamente `VAZIO` que pareça vazio: M5 não inventa `VAZIO`,
  `saldo = 0` nem tara nova; mantém quarentena e remete a confirmação a M6.
- `VOLTAR_A_DISPONIVEL` nunca libera `VAZIO`, `QUEBRADO` ou `DESCARTADO`;
  `VAZIO`/`QUEBRADO` só podem manter quarentena ou seguir para
  `PENDENTE_DE_DESCARTE`.
- Terminalidade: apenas `DESCARTADO` é terminal.
- `FORMAL_SPEC_STATE.md`: estado corrente de M5 e próxima ação corrigidos.

## Divergências de implementação observadas (não corrigidas)

`functions/src/reagentes.ts` ainda: (a) recalcula `venceuAgora`/`frascoVencido`
no reencontro; (b) grava `medida_utilizada: 0` e `data_devolucao_efetuada` no
encerramento por extravio. Permanecem `DIVERGENCIA_IMPLEMENTACAO_FUTURA`; o
código não foi alterado.

## Validações executadas

Primeira validação (M5-F01..F04):

- `git status` / diff restrito a arquivos documentais.
- `git diff --check`: PASS.
- Compilação LaTeX (procedimento do projeto, TeX Live/Nix): exit 0,
  **316 páginas**, zero erros e zero referências indefinidas; 24 \textit{Overfull}
  únicos.
- Inspeção com Poppler das páginas alteradas: 116 (regras M5), 144 (UI-16),
  152 (Fluxos A/B), 198 (rótulo do novo `lstlisting` M5); pseudocódigo
  de extravio/reencontro e tabela da Seção 4 conferidos.

Validação final pós-F05..F08 (commit `1d88970f`):

- `git status` / diff restrito a arquivos documentais.
- `git diff --check`: PASS.
- Compilação LaTeX (procedimento do projeto, TeX Live/Nix): exit 0,
  **321 páginas**, zero erros e zero referências indefinidas; 25 \textit{Overfull}
  únicos (nenhum bloqueante).
- Inspeção com Poppler das páginas/trechos alterados: 120 (regras M5 — reencontro
  e saídas), 147 (UI-16), 156 (casos de regressão), 203 e 207 (pseudocódigo de
  reencontro e helper da trilha histórica); máquina de estados da Seção 4
  conferida.
- Diff zero nas árvores de código executável e artefatos formais:
  `frontend/`, `functions/`, `specification/`, `tools/`, `firestore.rules`,
  `storage.rules`, `firebase.json`, `.firebaserc`, `documentation/generated/`,
  `build/formal-validation*.json`.

Nota: a reconciliação final de handoff pré-M6 (ver `9dacc178`..HEAD) apenas
corrige status Markdown; não altera `.tex` normativo nem o `main.pdf`.

## Estado final

- M0–M4 = VALIDATED (M3/M4 com erratum pré-M5).
- **M5 = DOCUMENTATION_VALIDATED** — documentação normativa consolidada,
  compilação e inspeção aprovadas (321 páginas); formalização executável
  (CUE/Alloy/Rust/IR/receipt) registrada como **dívida futura**, ainda **não**
  realizada e não é a próxima ação imediata.
- M6 = NOT_STARTED (naquele checkpoint; hoje M6 = DOCUMENTATION_VALIDATED e M7 = NOT_STARTED). Nenhuma HQ M5 aberta; findings M5-F01..F08 encerrados.

PRÓXIMA AÇÃO EXATA (no checkpoint de fechamento de M5):
INICIAR M6 DOCUMENTAL — Q06 / tara / metrologia quantitativa.
(Concluída posteriormente: M6 = DOCUMENTATION_VALIDATED; a próxima ação corrente é `INICIAR M7 DOCUMENTAL — Idempotência`.)

A formalização executável de M5 (CUE/Alloy/Rust/IR/receipt) permanece
registrada como dívida futura e não é a próxima ação imediata.
