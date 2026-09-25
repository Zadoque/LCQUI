# M12.2 — Roteiros, compartilhamento, Storage/download e anexo a Post (formalização executável)

Estado: **VALIDATED** (após rodada corretiva que fechou dois contraexemplos). Cadeia
aditiva CUE → IR v3 → Alloy → receipt verificável → validação Rust → geração
determinística → LaTeX → PDF. Não altera `functions/`, `frontend/`,
Firestore/Storage Rules, Auth, Storage, índices nem inicia M12/M13.

## 1. Entrada e fontes

- Branch: `feat/formal-spec-cue-alloy` (única).
- HEAD de entrada da formalização original: `eb6d89e47fd14eb43ddf98d22f194e9236f3a7d1`.
- HEAD de entrada da rodada corretiva: `1000513a0e54de0f2f69583ff50532a6096420fc`,
  árvore limpa e `origin` sincronizada. HEAD de saída = commit executável
  `8fc21a61` + commit documental seguinte.
- Fonte normativa: Seção 7.7 (`\label{sec:regras-roteiros-m12-2}`), reconciliada
  com Seções 3/4/5/8/9/11, RF21–RF23, UI-11, Q09 e Q13, e com a fronteira
  abstrata `roteiro_anexo`/`acessoRoteiroValidado` de M12.1 (Seção 7.6).
- Planejamento: M12 = NOT_STARTED (fechamento M12.1/M12.2); M13 = NOT_STARTED.

## 2. Rodada corretiva — achados e correções

A primeira versão executável passou pelos gates, mas a revisão independente
identificou duas lacunas semânticas. Ambas foram fechadas com contraexemplo
verdadeiro no solver (não apenas nominalmente).

| ID | Achado | Correção |
|---|---|---|
| M12.2-CORR-01 | `compartilhar` exigia proprietário e destinatário ativo, mas não `roteiroPublicavel`; `coerente` aceitava compartilhamento de roteiro `Provisorio`. | `compartilhar` passou a exigir `roteiroPublicavel[a,r]`; `coerente` passou a exigir `s.roteiroStatus[c.cRoteiro] = Publicavel` para todo compartilhamento. Novos `CompartilhamentoSoDePublicavel` e `NaoCompartilhaNaoPublicavel` (UNSAT) e testemunhas alcançáveis `WitnessProvisorioNaoCompartilha`, `WitnessValidadoNaoCompartilha` (dono e destinatário aptos) e `WitnessCompartilhaPublicavel` (SAT). |
| M12.2-CORR-02 | `podeEmitirUrl` dava ao Chefe acesso a **todo** roteiro publicável (`u in chefes`), sem vínculo concreto; `WitnessChefeEmite` só mostrava que algum Chefe emitia. | Introduzido `AuditoriaQ13` (Chefe, roteiro, Post removido que referencia o roteiro) e `escopoQ13[s,u,r]`; a emissão do Chefe passou a exigir escopo registrado. Transições `registrarAuditoriaQ13`/`encerrarAuditoriaQ13`. `coerente` exige Chefe exclusivo sem vínculo de aluno (RN-ROLE-01). Novos `ChefeSemEscopoNaoEmite`, `EscopoQ13SoDeChefeComPostReferenciado`, `EncerrarEscopoImpedeNovaEmissao` e `UrlEmitidaSobreviveAoEncerramentoEscopo` (UNSAT) e testemunhas `WitnessChefeComEscopoQ13`, `WitnessChefeSemEscopoNaoEmite`, `WitnessEncerrarEscopoImpedeEmissao` (SAT). |

Contraexemplo inicial de CORR-02: o check `ChefeSemEscopoNaoEmite` retornou SAT
porque um Chefe podia emitir por um vínculo de **aluno** independente. A causa
foi fechada tornando o papel Chefe exclusivo (RN-ROLE-01), o que também reduziu
o custo do solver (a busca pelo contraexemplo era o gargalo). Após a correção,
o `check` é UNSAT e a solução completa caiu de ~13 min para ~3,5 min.

Nenhuma decisão humana bloqueante: os dois achados foram resolvidos por Q13 +
Seção 11 + fail-closed explícito, com micro-reconciliação normativa mínima na
Seção 7.7/11. **HQs M12.2 = 0**.

### Matriz regra → fonte → camada de prova → cenário positivo → contraexemplo

| Regra | Fonte | Camada | Cenário positivo | Contraexemplo |
|---|---|---|---|---|
| Geração no snapshot ligada à referência | S4/S5/S7.7 | CUE `#M12_2AnexoVinculado`; Alloy `AnexoUsaGeracaoCanonica` | `anexo_vinculado` | `anexo_geracao_divergente`, `geracao_ausente` |
| 15 MiB estrito / tipo / titularidade | S7.7/S8/S11 | CUE + Rust | `referencia_canonica` | `tamanho_15mib`, `content_type_nao_pdf`, `owner_divergente` |
| Provisório→validado→publicável | S7.7 | Alloy `CadastroComecaProvisorio`, `PublicavelSoDeValidado`, `ValidarFixaGeracao` | `WitnessValidaObjeto`, `WitnessPublica` | `status_invalido` |
| Objeto/geração fixos | S7.7 | Alloy `ObjetoNuncaSobrescrito`, `GeracaoNaoMudaSemValidar` | — | (UNSAT) |
| Compartilhar só roteiro publicável | S7.7 | Alloy `CompartilhamentoSoDePublicavel`, `NaoCompartilhaNaoPublicavel`, `compartilhar` | `WitnessCompartilhaPublicavel` | `WitnessProvisorioNaoCompartilha`, `WitnessValidadoNaoCompartilha` |
| Compartilhamento único/destinatário ativo | S4/S5/S7.7 | Alloy `CompartilhamentoUnico`, `CompartilharExigeDestinatarioAtivo` | `WitnessCompartilhadoEmite` | `WitnessReusoIncompativel` |
| Revogação Q09 preserva histórico | Q09/S7.7/S9 | Alloy `UrlEmitidaSobreviveARevogacao` + frames | `WitnessRevogadoNaoEmite` | (UNSAT) |
| Download professor/aluno/ex-aluno | S7.7/S8/S9/S11 | Alloy `EmissaoExigeAcesso`, `AlunoDependeDeVinculo`, `ExAlunoNaoEmite` | `WitnessAlunoEmitePostAtivo` | `WitnessExAlunoNaoEmite` |
| Chefe só sob escopo Q13 | Q13/S7.7/S11 | CUE `#M12_2EscopoAuditoriaQ13`; Alloy `escopoQ13`, `ChefeSemEscopoNaoEmite`, `EscopoQ13SoDeChefeComPostReferenciado` | `WitnessChefeComEscopoQ13` | `WitnessChefeSemEscopoNaoEmite` |
| Fim do escopo impede novas emissões | S7.7/S11 | Alloy `EncerrarEscopoImpedeNovaEmissao`, `UrlEmitidaSobreviveAoEncerramentoEscopo` | `WitnessEncerrarEscopoImpedeEmissao` | (UNSAT) |
| Turma arquivada / Post removido | S7.7/Q08 | Alloy `TurmaArquivadaNegaEscritaRoteiro`, `PostRemovidoNegaAluno` | `WitnessAlunoEmiteTurmaArquivada` | `WitnessPostRemovidoNaoEmiteAluno` |
| URL já emitida não é revogada retroativamente | S7.7/S9/S11 | Alloy `urlsAtivas`, `UrlAtivaUsavel` | `WitnessUrlAtivaAposRevogacao` | (UNSAT expirada) |
| Anexo/troca/manter/desvincular + histórico | S7.7/S8 | Alloy `AnexarExigeAcessoAtual`, `ManterExigeAcessoAtual`, `HistoricoAnexoNuncaRemovido` | `WitnessAnexaComAcesso`, `WitnessTrocaPreservaHistorico`, `WitnessDesvinculaSemAcesso` | (UNSAT) |
| M7 primeira execução/retry/reuso | S7.7 | Alloy `PrimeiraExecucaoProduzReceipt`, `RetryNaoReexecuta`, `ReusoIncompativelRejeitado` | `WitnessRetryAposExecucao` | `WitnessReusoIncompativel` |
| M9 revogação impede commit | S7.7 | Alloy `RevogacaoVinculoImpedeCommit` | `WitnessExAlunoNaoEmite` | (UNSAT) |

## 3. CUE e IR

`specification/cue/domain/formal_m12_2.cue` define `#M12_2Contrato` (14 shapes,
incluindo `#M12_2EscopoAuditoriaQ13`). Fixtures: **18 válidas** e **18
inválidas** em `specification/cue/tests/m12_2/`. `#M12_2RoteiroAnexo` embute
aditivamente o contrato M12.1 por projeção oculta; M12.1 permanece idêntico. IR
v3 aditivo (`formal_m12_2_roteiros`, 16 campos) inalterado nesta rodada:
`spec_ir_sha256` permanece
`b5671cb75609239db147d9fbe446aafa35d12f2d71ee91753f4d4cb630573fe1`. Nenhum
receipt M0–M12.1 mudou (nem `spec_ir_sha256`).

## 4. Alloy

`specification/alloy/operations/roteiros_m12_2.als`: **47 checks UNSAT + 25
witnesses SAT = 72 resultados**, escopos `for 6` (transições) e `for 4`
(mínimos), SAT4J. Frames granulares por transição; `urlsAtivas` modela a
validade temporal abstrata da URL já emitida; `AuditoriaQ13`/`escopoQ13` modelam
o escopo Q13. Contraexemplos iniciais corrigidos: compartilhamento de roteiro não
publicável, Chefe emitindo via vínculo de aluno e aderência dos frames à nova
transição. Não se modela concorrência real nem exactly-once.

## 5. Receipt e Rust

`build/formal-validation-m12-2.json`: versão 1, Alloy 6.2.0, solver `sat4j`,
modelo `roteiros_m12_2.als`, 72 resultados, IDs `M12_2-INV-001..047` e
`M12_2-WIT-048..072`. Hashes: receipt
`ab924f4c3b821bc219bf28a29440d202e58236f38e4b9d60341b9c6851ab4f51`, modelo
`51348d15c00a3ac629cbe9232025846cbc3856e98be064377f24bff9847e417a`, IR
`b5671cb7…3fe1`.

`tools/spec-doc/src/validation_m12_2.rs` valida os 72 itens exatos (ID, ordem,
tipo, scope, status) e rejeita adulteração de hash/modelo/ID/status/scope e troca
`check`↔`run`. Funções determinísticas: `tamanho_valido`, `content_type_pdf`,
`titularidade_ok` (produção, usadas pelo invariante de IR `m12_2_exemplo_valido`)
e `status_publicavel`, `anexo_vinculado_ok`, `emissao_exige_acesso`,
`url_emitida_utilizavel`, `aluno_baixa`, `uids_unicos`, `escopo_q13_ativo`
(`#[cfg(test)]`). Testes Rust = **33**. `#![forbid(dead_code)]`,
`#![forbid(unsafe_code)]`, `#![deny(warnings)]`; nenhum `#[allow(...)]`.

## 6. Guard, gerador e determinismo

`tools/formal/m12_2_contract.test.mjs` = 6 testes (36 Node no total), cobrindo
enums, nomes, fronteira M12.1↔M12.2, predicados/assertions centrais (incluindo
escopo Q13), fonte normativa (novas emissões / URL já emitida / não atomicidade /
refinamento aditivo / elegibilidade de compartilhamento / escopo Q13) e regras
determinísticas. `render_m12_2` emite `entities/formal_m12_2_roteiros.tex` e
`invariants/formal_m12_2.tex`; MANIFEST vincula
`formal_validation_m12_2_sha256`. Duas gerações consecutivas: **diff zero**.

## 7. Gates e PDF

- `just formal-check` **exit 0** com árvore limpa: `cargo fmt --check` = 0;
  `cargo test --locked` = 33 PASS; `cargo clippy --all-targets -- -D warnings` =
  0; 36 testes Node PASS; Alloy PASS; `docs-check` PASS;
  `git diff --exit-code -- documentation/generated/` PASS; `git diff --check` = 0.
- PDF `main.pdf`: **435 páginas** (baseline 434), exit 0, zero erros e zero
  referências indefinidas, 31 Overfull únicos (iguais ao baseline). Inspeção
  visual das páginas 427–435 sem corte ou sobreposição.
- Regressão M0–M12.1: nenhum modelo, resultado, fragmento de M0–M12.1 nem
  `build/spec-ir.json` alterado; somente `formal-validation-m12-2.json` mudou.

## 8. Auditorias

1. **Sections 3–11/Q09/Q13 × CUE/IR/fixtures — limpa:** campos canônicos de
   `Roteiro_Experimento` coincidem (Seções 4/5); PK composta
   `(id_roteiro, id_professor)` ↔ array server-owned único; `file_url` legado;
   limites de UI-11 e Storage refletidos; Q09 preservado; compartilhamento só de
   publicável e escopo Q13 do Chefe reconciliados na Seção 7.7 e na Seção 11;
   `#M12_2EscopoAuditoriaQ13` cobre o registro de auditoria; `content_type`
   restrito a PDF (V1) é intencional.
2. **Alloy × receipt × Rust × fragmentos/MANIFEST × PDF — limpa:** hashes do IR,
   modelo e receipt conferem; `validation_m12_2` reproduz os 72 itens; MANIFEST
   vincula receipt e fragmentos; páginas 427–435 renderizadas sem defeito.

Nenhuma inconsistência nova após as correções.

## 9. Limites, HQ e estado

Não certifica `functions/src/roteiros.ts`, `functions/src/posts.ts`, frontend,
`firestore.rules`, `storage.rules`, Firebase, Auth, Storage real, bytes
binários, atomicidade entre Firestore e Storage nem concorrência sob carga.
HQs M12.2 = 0. M0–M11 e M12.1 = **VALIDATED**; **M12.2 = VALIDATED**; M12 =
**NOT_STARTED** (fechamento de composição M12.1/M12.2 e regressão M0–M11);
M13 = **NOT_STARTED** (Notificação unificada).

Próxima ação permitida:

```text
Fechamento M12 (composição M12.1/M12.2 e regressão M0–M11) em rodada própria;
depois M13. O fechamento global após M13 é um gate, sem M14 automático.
```
