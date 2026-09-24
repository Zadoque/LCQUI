# Reconciliação pré-M5 (erratum formal/documental)

Branch: `feat/formal-spec-cue-alloy`.
HEAD de entrada: `e8c36660b4b5eddb76b15797d058898657f8dfd3`
(`docs(spec): correct M4 evidence result count`), árvore limpa.
Commits desta rodada: `3213c48a` (CUE), `21355c9f` (Alloy), `86ebe7c1`
(documentação normativa), `3a5dcc79` (evidência/geração) e `f23adc81`
(`main.pdf`). HEAD de saída: commit documental **imediatamente posterior ao do
PDF** (`f23adc81` + 1), resolvido com
`git log -1 --format=%H --grep="record pre-M5 reconciliation"` (um commit não
contém o próprio SHA).
Estado de entrada: M3 = VALIDATED; M4 = VALIDATED; M5 = NOT_STARTED.
Estado de saída: M3 = VALIDATED (com erratum pré-M5); M4 = VALIDATED (com
erratum pré-M5); **M5 = NOT_STARTED**; HQs novas = 0.

Esta rodada altera contratos cobertos por M3/M4; por isso os gates afetados
foram reabertos e reexecutados. O histórico de validação original permanece nos
worklogs M3/M4; os errata foram anexados, não sobrescreveram o histórico.

## Escopo executado

1. V2 documentada na Seção 12 (edição de Resumo/Especificação; três modalidades
   de correção de validade), sem implementar.
2. Novo snapshot `vencido_na_retirada` em `Emprestimo_Reagente` (V1).
3. Autoridade de vencimento na devolução: lê `Frasco_Reagente.vencido`, não
   recalcula pelo relógio.
4. Remoção de `Devolucao.vencidoNoRetorno` do Alloy (segunda autoridade).
5. Mensagem/destino determinísticos na devolução (casos A/B/C/D e precedências).
6. Catálogo JSON de Resumo/Especificação para pesquisa client-side (contratos de
   projeção, versionamento, geração, download, sincronização, falha e fallback).
7. Estado/versionamento server-owned (`versao_fonte` x `versao_publicada`).
8. Segurança/ACL do catálogo e do objeto no Storage.
9. Testes de regressão/mutação e guard de contrato documental.

Não iniciado: M5, edição V2, `EditSession`, versionamento por resumo, modo
offline para retirada/devolução, edição genérica de documento, scheduler com
frequência nova, M6/Q06 além da precedência já validada, M7, M9 completo,
microserviços/fila. Nenhuma alteração em `frontend/`, `functions/`,
`firestore.rules` ou `storage.rules`.

## Decisões humanas incorporadas

- V1 cadastra, mas não edita, Resumo/Especificação; concorrência de edição é V2.
- V1 não corrige validade de frasco; três modalidades futuras registradas.
- `vencido_na_retirada` é snapshot server-owned imutável, distinto de
  `uso_vencido_aceito`, não recalculado na devolução.
- A devolução usa o estado canônico persistido; a passagem do tempo é do job.
- O JSON do catálogo usa **objetos indexados por ID**, não arrays; não duplica
  a mesma informação em mapa e array. Arrays de pesquisa são derivados em
  memória pelo cliente.
- Sem `Usuarios/{uid}.catalogo_version`; autoridade única
  `Sistema_Catalogo_Reagentes/estado` separando `versao_fonte`/`versao_publicada`.
- Download do catálogo exige autorização equivalente à busca de reagentes; o
  locator é `storage_path` (sem URL pública permanente).

## Alterações formais

### CUE

- `specification/cue/domain/emprestimo_reagente.cue`: `vencido_na_retirada`
  (BOOLEAN, não nulo), 34 descritores; cabeçalho atualizado.
- `specification/cue/docs/projection.cue`: `#EmprestimoM3Exemplo` e rótulo da
  entidade em 34 colunas.
- Fixtures `specification/cue/tests/emprestimo/`: +3 (1 válida com snapshot true,
  2 inválidas: ausência e tipo). Todas as fixtures M3 anteriores receberam o
  campo. M3 = 28 (11 válidas, 17 inválidas).

### IR / Rust

- IR permanece **v3**; nenhum bump de formato. `spec_ir_sha256` =
  `0558049777b3f504eb15afaf1490aed335e4b2d9bfe7b9f13e3d41beb847a127`.
- `tools/spec-doc/src/validation_m4.rs`: lista fechada de 60 resultados.
- `tools/spec-doc/src/render.rs`: textos M3/M4 atualizados (34 colunas, snapshot,
  classificação, autoridade de vencimento).

### Alloy M4

- `specification/alloy/reagents/withdrawal_return.als` reescrito conforme
  `M4_VALIDATION.md` (erratum pré-M5).
- `tools/formal/withdrawal_return.mjs`: contrato exato de 60 comandos +
  `checkWithdrawalReturnContract`.
- `tools/formal/withdrawal_return.test.mjs`: mutações de segunda autoridade e
  snapshot.
- `tools/formal/doc_contract.test.mjs` (novo): guard documental da devolução e
  do catálogo JSON.

## Contagens reais

| Item | Valor |
|---|---|
| Fixtures M0 / M1 / M2 / M3 | 7 / 35 / 31 / 28 = **101** |
| Seção 4 × CUE (`Emprestimo_Reagente`) | 34 = 34 |
| Alloy M4 checks UNSAT | **40** (scope 4: 35; scope 6: 5) |
| Alloy M4 witnesses SAT | **20** (scope 4: 19; scope 6: 1) |
| Alloy M4 resultados totais | **60** |
| Testes Rust (`cargo test`) | **10** |
| Testes Node (`node --test tools/formal/*.test.mjs`) | **6** |

## Gates executados

| Gate | Resultado |
|---|---|
| `just spec-check` | PASS (101 fixtures; paridade 34 = 34) |
| `just spec-export` | PASS (IR v3, entidade 34 colunas) |
| `just alloy-check` (`node --test` + modelo) | PASS (M0 + M2.2 + M2.4 + M3 + M4) |
| `just rust-check` (fmt/test/clippy) | PASS (10 testes, clippy `-D warnings`) |
| `just docs-generate` | PASS |
| `just docs-check` | PASS (stale/tamper rejeitados) |
| `just docs-build` | PASS, exit 0, **313 páginas**, zero erros/referências indefinidas |
| `just formal-check` | equivalente executado por partes (rust-check + docs-check + docs-build + `git diff --check`) |
| `git diff --check` | PASS |

Observação instrumental: o binário `just` foi coletado pelo GC do Nix no meio
da sessão; os comandos das receitas foram executados diretamente, com os mesmos
argumentos, e `latexmk` foi executado com o PATH do TeX Live. Nenhum gate foi
abrandado.

## Inspeção do PDF

`build/latex/main.pdf` (313 páginas) renderizado com Poppler e inspecionado nas
páginas alteradas: 35 (explicação de `vencido_na_retirada` na Seção 4), 191
(pseudocódigo da devolução com autoridade de vencimento e classificação), 223
(formato canônico do catálogo JSON), 286 (Seções 12.6/12.7 – V2) e 310 (novos
checks/classificações M4). `documentation/main.pdf` atualizado a partir de
`build/latex/main.pdf` após aprovação.

## Receipts

- `build/formal-validation-m4.json`: 60 resultados, v1, Alloy 6.2.0, sat4j.
- `build/formal-validation.json`, `formal-validation-m2.json`,
  `formal-validation-m24.json`, `formal-validation-m3.json`: alterados **apenas**
  em `spec_ir_sha256` (o IR mudou legitimamente pelo novo campo).
- `documentation/generated/`: `MANIFEST.json`,
  `entities/emprestimo_reagente.tex`, `invariants/emprestimo_reagente.tex` e
  `invariants/retirada_devolucao_m4.tex` regenerados; fragmentos M0/M1/M2/M2.4
  inalterados.

## Critérios de aceite atendidos

1. `vencido_na_retirada` existe como snapshot histórico imutável.
2. A devolução distingue venceu-durante / já-vencido / validade-desconhecida.
3. A devolução não recalcula vencimento pelo relógio.
4. Não existe segunda autoridade `vencidoNoRetorno`.
5. M4 preserva `anomalia > vazio > validade > normal`.
6. V2 registra edição de Resumo/Especificação e as três correções de validade.
7. V1 especifica catálogo JSON materializado para pesquisa client-side.
8. Criação de Resumo/Especificação incrementa `versao_fonte` server-owned.
9. Publicação do JSON separada de `versao_fonte` (sem path de versão inexistente).
10. Sincronização client-side com subscribe/atualização/unsubscribe.
11. Não existe `catalogo_version` em `Usuario`.
12. Download exige autorização equivalente à busca de reagentes.
13. JSON nunca é autoridade operacional.
14. Fallback canônico `resolverCatalogoPorIds` no Firestore.
15. Divergência JSON × Firestore tem recuperação automática.
16. Referência a objeto inexistente é erro de integridade referencial.
17. Operações físicas não são concluídas offline.
18. M3/M4 revalidados após os gates.
19. M5 permanece NOT_STARTED.

## HQs

Nenhuma HQ nova. As decisões desta rodada constavam do prompt; detalhes técnicos
foram resolvidos mecanicamente.

## Divergências de produção ainda pendentes

- `functions/src/reagentes.ts` mantém lógica legada
  `venceuAgora = validadeEfetiva <= agora; frascoVencido = frasco.vencido || venceuAgora`
  na devolução e no reencontro. **Não homologada** nesta rodada; a devolução
  normativa lê o estado persistido. Permanece dívida de M5/M6.
- Catálogo JSON, `Sistema_Catalogo_Reagentes`, `obterCatalogoReagentes`,
  `resolverCatalogoPorIds`, geração/publicação e sincronização **especificados**,
  **não implementados**.
- Edição V2 de Resumo/Especificação e correções de validade **especificadas**,
  **não implementadas**.
