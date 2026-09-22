# M3 — Empréstimo de Reagente

Estado: VALIDATED. Branch: `feat/formal-spec-cue-alloy`.
HEAD de entrada: `158cb91f77b8301274c63e4ee8e384249721a5ba`
(`docs(spec): record M2.4 validation and close M2`), árvore limpa.
M2 = VALIDATED; M3 = entrada NOT_STARTED; M4 = NOT_STARTED. Nenhuma branch nova.

M3 migra para a camada formal a estrutura completa de `Emprestimo_Reagente`, a
coerência intrínseca do registro, a máquina abstrata de status, a unicidade de
empréstimo ativo por frasco, a evidência Alloy, IR/proveniência, Rust,
documentação gerada e LaTeX/PDF. NÃO implementa `registrarRetirada`/
`registrarDevolucao` completos (M4), extravio/reencontro/quarentena completos
(M5), Q06/tara/metrologia (M6), idempotência (M7) nem RBAC (M9).

## Gate de entrada

`just spec-check`, `just spec-export`, `just alloy-check`, `just rust-check`,
`just docs-check` e `git diff --check`: todos PASS com a árvore limpa. Nenhuma
falha classificada. `spawnSync cue`/`alloy6` funcionaram sem escalonamento.

## Autoridades lidas

`FORMAL_SPEC_STATE.md` primeiro; `documentation/STATUS_ATUAL.md`;
`specification/README.md`; os quatro arquivos
`specification/knowledge/{AI_HANDOFF,FORMAL_SPEC_ARCHITECTURE,CUE_KNOWLEDGE,RUST_LATEX_GENERATOR}.md`;
`documentation/COMPILACAO_NIX_LCQUI.md`; README do archive (registros
superados não usados como estado). Worklogs M0/M1/M2.1d/M2.2/M2.3/M2.4.
Fontes normativas M3: Seção 4 (entidade 451-499, cardinalidade 802, máquina
864/871, fechamento 876), Seção 5 (dicionário 421-452, denormalização 110/763-764,
texto 818), Seção 7 (job 96, regras 133-155), Seção 8 (228), Seção 9 (110/204/210),
Seção 10.5 (retirada 504-553, devolução 557-769, extravio 820-890) e Seção 10.7
(vinteamento/atraso 3-45). Backend real lido como evidência, não autoridade.

## M3.0 — auditoria normativa

Contagem extraída programaticamente:
`\campo{}` da entidade `Emprestimo_Reagente` na Seção 4 = **33**.

| Campo | Seção 4 | Seção 5 (dicionário) | Seção 10 criação | Classificação |
|---|---|---|---|---|
| id | SERIAL PK | docId string | doc() | CANONICO_3FN |
| id_frasco_reagente | INTEGER FK | string O | sim | CANONICO_3FN |
| id_usuario_retirou | INTEGER FK | string O | sim | CANONICO_3FN |
| id_gestor_retirada | INTEGER FK | **omitido** | sim | CANONICO_3FN |
| status | ENUM 6 | enum | EM_USO | CANONICO_3FN |
| data_retirada | TIMESTAMP | Timestamp | sim | CANONICO_3FN |
| data_devolucao_prevista | DATE | string civil | sim | CANONICO_3FN |
| data_devolucao_efetuada | TIMESTAMP NULL | Timestamp N | null | CANONICO_3FN |
| id_local_usado | INTEGER FK | string O | sim | CANONICO_3FN |
| id_usuario_devolveu | INTEGER FK NULL | string N | null | CANONICO_3FN |
| id_gestor_devolucao | INTEGER FK NULL | string N | null | CANONICO_3FN |
| peso_saida | NUMERIC(10,3) | number O | sim | CANONICO_3FN |
| peso_retorno | NUMERIC(10,3) NULL | number N | null | CANONICO_3FN |
| medida_utilizada | NUMERIC(10,3) NULL | number N | null | CANONICO_3FN |
| consumo_validado | BOOLEAN | **omitido** | sim | CANONICO_3FN |
| anomalia_metrologica | TEXT NULL | **omitido** | null | CANONICO_3FN |
| peso_retorno_efetivo | NUMERIC(10,3) NULL | **omitido** | null | CANONICO_3FN |
| id_resolucao_metrologica | INTEGER FK NULL | **omitido** | null | CANONICO_3FN |
| unidade_medida_utilizada | ENUM ml,g | enum | sim | CANONICO_3FN |
| densidade_aplicada | NUMERIC(10,5) NULL | number N | sim | CANONICO_3FN |
| peso_perda_evaporacao | NUMERIC(10,3) | number O | sim | CANONICO_3FN |
| uso_vencido_aceito | BOOLEAN | boolean O | sim | CANONICO_3FN |
| finalidade_uso | ENUM 4 | enum | sim | CANONICO_3FN |
| auto_atendimento | BOOLEAN | boolean O | sim | CANONICO_3FN |
| justificativa_metodologica | TEXT NULL | string C | sim | CANONICO_3FN |
| tcr_versao | VARCHAR(100) NULL | string C | sim | CANONICO_3FN |
| tcr_aceito_em | TIMESTAMP NULL | Timestamp C | sim | CANONICO_3FN |
| tcr_aceito_por | INTEGER FK NULL | string C | sim | CANONICO_3FN |
| tcr_auditoria_id | INTEGER FK NULL | string C | sim | CANONICO_3FN |
| tipo_encerramento_excepcional | ENUM+NULL | enum N | null | CANONICO_3FN |
| motivo_encerramento_excepcional | TEXT NULL | string N | null | CANONICO_3FN |
| id_gestor_encerramento | INTEGER FK NULL | string N | null | CANONICO_3FN |
| massa_perda_estimada_g | NUMERIC(10,3) NULL | number N | null | CANONICO_3FN |

Projeções Firestore deliberadas (NÃO adicionadas à entidade relacional):
`id_almoxarifado`, `id_resumo_reagente`, `id_especificacao_reagente`,
`nome_reagente`, `nome_usuario_retirou` (tabela 110 e linha 763-764). São
deriváveis do frasco/especificação e existem para consulta/escopo.

### Reconciliação documental (Checkpoint A)

O dicionário da Seção 5 omitia 5 campos canônicos que a própria Seção 5
descreve (linha 818) ou referencia (linha 764): `id_gestor_retirada`,
`consumo_validado`, `anomalia_metrologica`, `peso_retorno_efetivo`,
`id_resolucao_metrologica`. Inseridos no dicionário na ordem da Seção 4,
com anotações coerentes; nenhuma regra de domínio foi alterada. Após a correção,
Seção 4 e Seção 5 têm 33 nomes idênticos em ordem idêntica (comparação
programática). Commit: `docs(spec): reconcile M3 loan contract` (`0bc5c0a7`).
`just docs-build` executado após a correção (296 páginas, zero erros).
Nenhuma HQ-M3: as omissions eram mecânicas.

## M3.1 — CUE

- `specification/cue/domain/campos_emprestimo.cue`: descritor `#CampoEmprestimo`,
  espelho de `#CampoFrasco` com NUMERIC(10,5) (escala 0.00001, faixa
  ±99999.99999) e VARCHAR(100) (`strings.MaxRunes`).
- `specification/cue/domain/emprestimo_reagente.cue`: `emprestimoReagenteCampos`
  (33 descritores, fonte estrutural única) e `#EmprestimoReagente`.
- Constraints locais formalizadas:
  - INV-M3-DENSIDADE-001/002 (Seções 4,494 e 5,438): `unidade_medida_utilizada
    = "ml"` exige `densidade_aplicada != null`; `= "g"` exige `null`; o descritor
    garante positividade quando não nula.
  - INV-M3-ANOMALIA-001 (Seção 4,498): `status = DEVOLVIDO_COM_ANOMALIA` implica
    `consumo_validado = false`, `peso_retorno_efetivo = null`,
    `id_resolucao_metrologica = null`.
  - INV-M3-EXTRAORDINARIO-001 (Seção 5,449 e 10.5,871-875): `status =
    ENCERRADO_EXTRAORDINARIO` implica `tipo_encerramento_excepcional`,
    `motivo_encerramento_excepcional` e `id_gestor_encerramento` não nulos. A
    recíproca NÃO é assumida; o detalhamento quebra/sinistro fica para M4/M5.
- Fixtures: 8 válidas (`em_uso_solido`, `atrasado`, `devolvido`,
  `devolvido_com_atraso`, `devolvido_com_anomalia`, `encerrado_extraordinario`,
  `liquido_com_densidade`, `solido_sem_densidade`) + 13 inválidas
  (`status_enum`, `finalidade_enum`, `unidade_enum`,
  `tipo_encerramento_enum`, `campo_ausente`, `densidade_ausente_liquido`,
  `densidade_presente_solido`, `densidade_nao_positiva`, `escala_peso`,
  `escala_densidade`, `bundle_extraordinario_incompleto`,
  `anomalia_consumo_validado`, `tcr_versao_longa`).
- Paridade Seção 4 × CUE: `loanContractParity()` em `tools/formal/check.mjs`
  extrai `\campo{}` do bloco `Emprestimo_Reagente` e compara nomes/ordem/
  quantidade com `cue export ./domain -e emprestimoReagenteCampos`; incluído em
  `spec-check` (logo `spec-export`). Qualquer drift falha o gate.
- Fixtures: M3 +21 (8 válidas, 13 inválidas). Total: M0 7, M1 35, M2 30, M3 21
  = **93** (65 inválidas, 28 válidas). Regressão M0/M1/M2 idêntica.
- Commit: `feat(cue): model complete reagent loan record` (`c8de4c0e`).

## M3.2 — Alloy

`specification/alloy/reagents/loan_state.als`: um universo `Frasco`,
`Emprestimo` com relação estática `frasco: one Frasco`, `Estado` com
`status: Emprestimo -> one Status`. `ATIVOS = EM_USO + ATRASADO`;
encerrados são os quatro restantes. `ativosDoFrasco[s,f]` deriva a custódia do
status (sem flag `ativo`). `coerente[s]` = no máximo um ativo por frasco.
Transições: `atrasar`, `devolver`, `devolverComAtraso`, `devolverComAnomalia`,
`encerrarExtraordinario`; cada uma altera somente o status do alvo.

| ID | Propriedade | Scope 4 | Scope 6 |
|---|---|---|---|
| INV-M3-ATIVO-UNICIDADE-001 | transições preservam a unicidade ativa | UNSAT | UNSAT |
| INV-M3-ATRASO-ORIGEM-001 | ATRASADO só vem de EM_USO | UNSAT | UNSAT |
| INV-M3-ENCERRADO-TERMINAL-001 | encerrado não reabre | UNSAT | UNSAT |
| INV-M3-DEVOLUCAO-ENCERRA-001 | devolução encerra | UNSAT | — |
| INV-M3-ANOMALIA-ENCERRA-001 | anomalia não é ativa | UNSAT | — |
| INV-M3-EXTRAORDINARIO-ENCERRA-001 | extraordinário não é ativo | UNSAT | — |
| FRAME-M3-STATUS-001 | transição de e não altera e2 | UNSAT | UNSAT |

Witnesses SAT: `TestemunhaEmUso`, `TestemunhaAtrasado`, `TestemunhaAtraso`,
`TestemunhaDevolucaoNormal`, `TestemunhaDevolucaoComAtraso`,
`TestemunhaDevolucaoComAnomalia`, `TestemunhaEncerramentoExtraordinario`,
`TestemunhaDoisFrascosAtivos` (unicidade é por frasco, não global),
`TestemunhaTransicaoCoerente` e `TestemunhaEstadoEncerrado` (não-vacuidade dos
antecedentes), além de `TestemunhaDoisFrascosAtivosAmpliado` em scope 6.
Total: **11 checks UNSAT + 11 runs SAT** (7+4 checks; 10+1 runs), todos os
checks com witness SAT correspondente. Linguagem: "nenhum contraexemplo no
escopo declarado", nunca prova universal.

Equivalência conceitual com M0/M2.4: o `ativos` derivado do status é a mesma
abstração de `disponibilidade = EMPRESTADO <=> empréstimo ativo`; nenhuma
composição de universos foi criada e `bottle_composition.als` não foi alterado.

Commit: `feat(alloy): formalize reagent loan lifecycle` (`4b08ab52`).

## M3.3 — IR / proveniência

- IR permanece **v3** (v3 já representava entidades; a proveniência ganhou um
  campo opcional, sem quebrar a leitura de v1/v2).
- `docs/projection.cue`: `#CamposEmprestimoM3` derivado de
  `domain.emprestimoReagenteCampos` (sem segunda lista), `#EmprestimoM3Exemplo`
  unificado a `domain.#EmprestimoReagente` e entidade `emprestimo_reagente`
  (etapa "projeção M3 completa (33 colunas)").
- Proveniência: acrescentado `baseline_documental_m3 =
  158cb91f77b8301274c63e4ee8e384249721a5ba`, distinto de
  `baseline_historico_m0_m1` (`db29ea2f`) e `baseline_documental_m2`
  (`9df335bc`). Rust `ir::provenance_ok` exige os três.
- `spec_ir_sha256` novo: `1398cac06138712e869e5467b7bab18eb7e0034a973d2ed2f30e150233381f5c`.

## M3.4 — Rust / receipt

- `tools/spec-doc/src/validation_m3.rs`: valida `build/formal-validation-m3.json`
  (versão 1, Alloy 6.2.0, solver sat4j, hash do IR, path/hash do modelo,
  lista exata ordenada de 22 IDs/nomes/tipos/scopes/status). 9 testes Rust PASS;
  o teste de adulteração rejeita versão/solver, hashes IR/modelo, SAT↔UNSAT,
  scope, ID/nome/tipo, remoção/extra/lista vazia e bytes adulterados.
- `ir.rs`, `render.rs`, `main.rs`: leitura/validação da evidência M3, fragmento
  `invariants/emprestimo_reagente.tex` e chave `formal_validation_m3_sha256` no
  manifest. O teste de manifest confere hashes reais das cinco entradas e de
  cada saída, além de determinismo.
- Receipt `build/formal-validation-m3.json` (22 resultados).
- Commits: `feat(spec-doc): validate and render M3 loan evidence` (`e0f4b3a4`).

## M3.5 — Geração, determinismo e stale

- `docs-generate` produz `entities/emprestimo_reagente.tex` (33 colunas, SQL,
  enums, limites, padrão DATE, VARCHAR) e `invariants/emprestimo_reagente.tex`
  (22 resultados). Fragmentos M0/M1/M2 e os firestore existentes permanecem
  **byte a byte idênticos**; apenas `MANIFEST.json` mudou entre os antigos.
- Stale demonstrado ANTES da geração: `just docs-check` falhou com
  `Generated stale: MANIFEST.json; execute docs-generate`. Depois de
  `docs-generate`, `docs-check` PASS.
- Determinismo: duas gerações comparadas recursivamente (`diff -r`): idênticas.

## M3.6 — LaTeX / PDF

- `documentation/Formal-Spec-M3.tex` criado e integrado após M2 em `main.tex`
  (`\input{Formal-Spec-M3.tex}`), sem alterar a ordem M0/M1/M2.
- `just docs-build`: exit 0, **302 páginas**, zero erros e referências
  indefinidas. 28 Overfull únicos, os mesmos do baseline (nenhum novo). Páginas
  296–302 inspecionadas com Poppler: entidade, campos, ciclo de vida, 22
  resultados e limites legíveis. `documentation/main.pdf` atualizado após
  inspeção.
- Commit: `docs(spec): integrate M3 loan documentation into the PDF` (`4cfabe5a`).

## Regressões

- CUE: M0 7, M1 35, M2 30 permanecem com a mesma classificação; M3 apenas
  acrescenta 21.
- Receipts antigos (`formal-validation.json`, `formal-validation-m2.json`,
  `formal-validation-m24.json`): comparados com a HEAD de entrada, diferem
  APENAS em `spec_ir_sha256` (o IR mudou legitimamente por M3). `model_sha256`,
  resultados e scopes permanecem idênticos (verificado programaticamente).
- Modelos `withdrawal.als`, `bottle_identity.als`, `bottle_state.als`,
  `bottle_composition.als`: **byte a byte idênticos**.
- Fragmentos M0/M1/M2 `byte a byte` idênticos.
- `Formal-Spec-M0/M1/M2.tex`: intactos.

## HQs

HQs M3 criadas: **0**. As omissões da Seção 5 eram mecânicas e foram
reconciliadas. O bundle de encerramento extraordinário tem fonte direta no único
produtor documentado (Seção 10.5) e na Seção 5,449; a recíproca não foi
assumida. HQs M3 abertas: **0**.

Questões DEFERRED_TO_M4/M5 (não bloqueiam M3): fórmula exata de consumo na
devolução; destino de validade pós-retorno; ordem de reads/writes Firestore;
consumo transacional do TCR; primeira abertura na retirada; efeito quantitativo
da anomalia no frasco e escolha entre devolução comum/atrasada por data; se e
como `QUEBRA_ACIDENTAL` produz `ENCERRADO_EXTRAORDINARIO` (sem produtor no fluxo
atual).

## Divergências backend × documentação (registradas, não corrigidas)

`functions/src/reagentes.ts` diverge da especificação vigente: criação não grava
`id_gestor_retirada`, `peso_perda_evaporacao`, `consumo_validado`,
`anomalia_metrologica`, `peso_retorno_efetivo`, `id_resolucao_metrologica`,
`unidade_medida_utilizada`, `densidade_aplicada`, `auto_atendimento`,
`justificativa_metodologica` nem TCR; usa `finalidade = "DIDATICO_DEMONSTRACAO"`,
ausente do enum documental; devolução rejeita ganho acima de 102% em vez de
concluir `DEVOLVIDO_COM_ANOMALIA`; não grava `consumo_validado`. O backend real
permanece dívida de M4/M5/M6/M9/M10. `functions/` não foi modificado.

## Gates finais

| Comando | Resultado |
|---|---|
| `just spec-check` | PASS (93 fixtures) |
| `just spec-export` | PASS (IR v3 + entidade M3) |
| `just alloy-check` | PASS (M0 + M2.2 + M2.4 + M3) |
| `just rust-check` | PASS (fmt, 9 testes, clippy `-D warnings`) |
| `just docs-generate` | PASS |
| `just docs-check` | PASS |
| `just docs-build` | PASS (302 páginas) |
| `just formal-check` | PASS |
| `git diff --check` | PASS |

## Estado final

- M0 = VALIDATED; M1 = VALIDATED; M2 = VALIDATED; **M3 = VALIDATED**.
- M4 = NOT_STARTED.

PRÓXIMA AÇÃO EXATA: `INICIAR M4 — Retirada/devolução completas`.
Não iniciar M4 nesta execução.

## Erratum pós-validação M3

Estado: M3 reaberto como IN_PROGRESS e novamente VALIDATED. Branch
`feat/formal-spec-cue-alloy`; HEAD de entrada do erratum:
`f62a4f9918bf30190c02c296ab8f206cca753cdc`, árvore limpa. O primeiro fechamento
de M3 permanece registrado acima e não foi reescrito.

Os gates anteriores estavam verdes, mas **não cobriam o estado
`DEVOLVIDO_COM_ANOMALIA` já resolvido**: as fixtures só representavam a anomalia
recém-produzida (pendência aberta) e a constraint do CUE tratava o status como
pendência permanente. Essa é a lacuna de cobertura que este erratum fecha.

### Problema 1 — `DEVOLVIDO_COM_ANOMALIA` como pendência eterna

- Constraint anterior (incorreta):
  ```cue
  if status == "DEVOLVIDO_COM_ANOMALIA" {
      consumo_validado!:         false
      peso_retorno_efetivo!:     null
      id_resolucao_metrologica!: null
  }
  ```
- Por que estava errada: confundia o status histórico da devolução com o estado
  quantitativo. A documentação (Seção 10.5, `finalizarPendenciaMetrologicaTx`,
  linhas 1458-1474) permite que um contrato tipado resolva a pendência gravando
  `consumo_validado: true`, `peso_retorno_efetivo`, `medida_utilizada` e
  `id_resolucao_metrologica`, mantendo o status e preservando `peso_retorno` e
  `anomalia_metrologica`. A pendência é `<status = DEVOLVIDO_COM_ANOMALIA AND
  consumo_validado = false>` (helper `existePendenciaMetrologicaTx`, Seção 10.5,
  linhas 1418-1427), não o status isolado.
- Constraint nova:
  ```cue
  if status == "DEVOLVIDO_COM_ANOMALIA" && consumo_validado == false {
      medida_utilizada!:         null
      peso_retorno_efetivo!:     null
      id_resolucao_metrologica!: null
  }
  if status == "DEVOLVIDO_COM_ANOMALIA" && consumo_validado == true {
      medida_utilizada!:         !=null
      peso_retorno_efetivo!:     !=null
      id_resolucao_metrologica!: !=null
  }
  ```
  A recíproca do bundle resolvido tem fonte direta: o único escritor de
  `consumo_validado = true` em status anômalo é `finalizarPendenciaMetrologicaTx`,
  que grava os três valores na mesma transação. `peso_retorno` e
  `anomalia_metrologica` não são tocados por nenhuma constraint (Seção 36).
- Fixture pendente: `valid/devolvido_com_anomalia.json` (status anômalo,
  `consumo_validado = false`, três campos nulos) — VALID.
- Fixture resolvida: `valid/devolvido_com_anomalia_resolvida.json` (status
  anômalo, `consumo_validado = true`, `medida_utilizada = 0`,
  `peso_retorno = 520` preservado, `peso_retorno_efetivo = 520`,
  `id_resolucao_metrologica = 7`, `anomalia_metrologica = GANHO_ACIMA_Q06`) —
  VALID. A fixture negativa antiga `invalid/anomalia_consumo_validado.json`
  passou a representar exatamente esse estado válido e foi movida para
  `valid/devolvido_com_anomalia_resolvida.json`.
- Fixtures negativas do bundle resolvido:
  `invalid/anomalia_resolvida_sem_resolucao.json` (resolvida sem
  `id_resolucao_metrologica`) e `invalid/anomalia_resolvida_sem_peso_efetivo.json`
  (resolvida sem `peso_retorno_efetivo`) — INVALID.

### Problema 2 — campos quantitativos de massa/volume aceitavam negativos

- Antes: `medida_utilizada` (e demais grandezas de massa/volume) eram apenas
  NUMERIC(10,3) nullable, com mínimo -9999999.999; aceitavam `-0.001`. O texto
  gerado dizia "não negativo" mas exibia "Mínimo: -9999999.999".
- Depois: os descritores ganharam `nao_negativo: *false | bool` (distinto de
  `positivo`, que significa `> 0`), impondo `>= 0` sem alterar
  `densidade_aplicada` (`positivo: true`, `> 0`). A projeção passa
  `minimo_numero: 0` para o IR, e os fragmentos gerados mostram `Mínimo: 0.`.
- Campos marcados em M3 (`emprestimo_reagente.cue`): `medida_utilizada`,
  `peso_saida`, `peso_retorno`, `peso_retorno_efetivo`, `peso_perda_evaporacao`,
  `massa_perda_estimada_g`.
- Campos marcados em M2 (`frasco_completo.cue`, sem reabrir o milestone M2):
  `conteudo_nominal`, `peso_no_cadastrado`, `peso_atual`, `peso_frasco_vazio`,
  `medida_usada`. A fixture de limites `valid/limites_numericos_zero.json` foi
  ajustada de `peso_no_cadastrado = -9999999.999` para `0` (novo limite inferior)
  e foi adicionada a negativa `invalid/peso_negativo.json`
  (`peso_atual = -0.001`). Fundamento: Seção 4, checklist, "todos os valores
  quantitativos de massa, volume, capacidade, contagens ... devem obedecer aos
  limites não negativos ou positivos".
- Fixture zero M3: `valid/medida_utilizada_zero.json` (consumo validado 0) —
  VALID, provando `>= 0` e não `> 0`.
- Fixture negativa M3: `invalid/medida_utilizada_negativa.json` (`-0.001`) —
  INVALID.

### Problema 3 — `STATUS_ATUAL.md` stale

O bloco de status corrente ainda dizia que "os fragmentos M2 ainda NÃO são
integrados ao `main.tex`" e que "a composição M0 e M2.2 permanece para M2.4",
além de citar a contagem `7/35/30 = 72`. Corrigido para reconhecer M2.4 =
VALIDATED, `Formal-Spec-M2.tex` integrado, composição M0 × M2.2 concluída, M3 =
VALIDATED, e contagem corrente 7/35/31/25 = 98.

### Regressões e contagens após o erratum

- CUE `Emprestimo_Reagente`: 33 colunas, nenhum enum novo, nenhum status novo.
  Constraints alteradas: pendência de anomalia (agora por `consumo_validado`) +
  `medida_utilizada >= 0`.
- Fixtures: M3 passou de 21 (8 válidas, 13 inválidas) para **25 (10 válidas,
  15 inválidas)**. Total: M0 7, M1 35, M2 31 (M2 ganhou `invalid/peso_negativo`),
  M3 25 = **98**.
- Paridade Seção 4 × CUE: 33 = 33, nomes/ordem iguais.
- Alloy: `loan_state.als` **não mudou**; `model_sha256` = `1b7d7e6f8009...`;
  22 resultados idênticos. `withdrawal.als`, `bottle_identity.als`,
  `bottle_state.als`, `bottle_composition.als` byte a byte idênticos.
- IR mudou (metadata de `medida_utilizada`: `minimo_numero: 0`), então os quatro
  receipts mudaram **apenas** em `spec_ir_sha256`; `model_sha256`, resultados e
  scopes idênticos (verificado programaticamente).
- Generated: apenas `entities/emprestimo_reagente.tex` e `MANIFEST.json`
  mudaram; `invariants/emprestimo_reagente.tex` e os fragmentos M0/M1/M2
  permanecem. Determinismo confirmado; stale detectado antes de regenerar.
- PDF: exit 0, 302 páginas, zero erros/referências indefinidas, 28 Overfull
  únicos (nenhum novo). Página 298 mostra `Mínimo: 0.` em `medida_utilizada`;
  página 300 mostra o esclarecimento sobre status histórico × pendência.

### Estado final do erratum

- M0 = VALIDATED; M1 = VALIDATED; M2 = VALIDATED; **M3 = VALIDATED**.
- M4 = NOT_STARTED. HQs M3 abertas = 0.

PRÓXIMA AÇÃO EXATA: `INICIAR M4 — Retirada/devolução completas`.
