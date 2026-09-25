# M12.1 — Posts, comentários e moderação (formalização executável)

Estado: **VALIDATED** (após rodada corretiva). Cadeia aditiva: CUE → IR v3 →
Alloy → receipt verificável → validação Rust → geração determinística → LaTeX →
PDF. Não altera `functions/`, `frontend/`, Firestore/Storage Rules, Auth,
Storage, índices nem inicia M12.2/M13.

## 1. Entrada e fontes

- Branch: `feat/formal-spec-cue-alloy` (única).
- HEAD de entrada da rodada corretiva: `136c840a91b891afab585a84e15688fa852f4f28`,
  árvore limpa e `origin` sincronizada. HEAD de saída = commit documental
  seguinte.
- Fonte normativa: Seção 7.6
  (`\label{sec:regras-posts-comentarios-m12-1}`), reconciliada com Seções 3–5 e
  8–11, RF19/RF20, UI-11, Q08/Q10/Q11/Q13/Q10, RF25 e M7/M9/M11.
- Planejamento: `M13 = NOT_STARTED` (Notificação unificada) reservado na tabela
  e nos ponteiros; M12.2/M12 permanecem NOT_STARTED.

## 2. Rodada corretiva — contraexemplos iniciais e correções

A primeira versão executável de M12.1 foi rejeitada na inspeção semântica. Os
problemas e suas correções:

| ID | Contraexemplo/defeito | Correção |
|---|---|---|
| M12.1-CORR-01 | `podeEditarComent` exigia autoria + Auth + turma ativa, mas **não** o vínculo canônico atual: um ex-aluno com claim atualizada podia editar o próprio comentário. `podeLerComent` abria exceção de autoria após a perda do vínculo. | Introduzido `participa[s,u,t] = temVinculo ∨ ehDono`. Edição e criação de Comentário e leitura exigem participação (ou chefia para leitura). `RemovidoNaoEditaComent`, `EditarComentExigeParticipacaoAtual` e `RemovidoNaoLe` fixam o fail-closed. |
| M12.1-CORR-02 | Revogação só era distinguível pelo atraso da claim. | `WitnessClaimAtualSemVinculo` encadeia `revogarVinculo` + `atualizarClaim` (claim corrente) e prova que, sem vínculo/ownership, o ex-aluno **não** edita nem lê. A participação não é recriada por claim. |
| M12.1-CORR-03 | `retryM7[a,b] ≡ b=a`, com transições congelando comandos/recibos via `frameM7`; nenhum comando era consumido nem receipt produzido. | Transições recebem `o: Comando`, exigem identidade nova e gravam `comandos`/`recibos` (`registraComando`). `retryM7[a,b,o]` exige `o ∈ comandos` e `recibos[o.cmdId]=o`. `PrimeiraExecucaoProduzReceipt`, `RetryNaoReexecuta` e `RetryNaoDuplicaFato` cobrem o ciclo; `WitnessRetryAposExecucao` encadeia execução + replay. |
| M12.1-CORR-04 | `ReusoIncompativelNaoHerda` era só coerência estática. | `IdentidadeComandoUnica` (estática) mantida e `ReusoIncompativelRejeitado` modela a tentativa incompatível: um comando com `idOperacao` já consumido por outra identidade é recusado por todas as transições; `WitnessReusoIncompativel` mostra a tentativa. |
| M12.1-CORR-05 | `TurmaArquivadaNegaEscrita` só quantificava `criarPost`. | Propriedade reescrita transversalmente: turma Arquivada não admite nenhuma transição de escrita (criar/editar/remover Post, criar/editar/moderar Comentário), inclusive Chefe. Testemunhas positivas por operação em turma Ativa foram adicionadas (`WitnessEditarComent` etc.). |
| M12.1-CORR-06 | Regra antiga ``Histórico de Posts na Turma'' (Seção 7) dizia que o Chefe podia **editar** posts. | Reconciliada: o Chefe apenas **modera e remove da apresentação** (Q13), sem editar conteúdo em caráter de autoria. |
| M12.1-CORR-07 | Notificação não estava vinculada ao comando. | `Notif.nOperacao` = `idOperacao`; `#M12_1NotificacaoEfeito` ganhou `id_operacao` (CUE/fixtures); `NotificacaoSoDoAlvo` exige o vínculo. |

## 3. Matriz regra normativa → predicado/transição → check negativo → witness positivo → teste

| Regra (Seção 7.6) | Predicado/transição | Check (UNSAT) | Witness (SAT) | Fixture/teste |
|---|---|---|---|---|
| Só dono cria/edita Post | `podeCriarPost`/`criarPost`/`editarPost` | `CriarPostSoEmAtivo`, `TerceiroNaoEditaPost` | `WitnessCriarPost`, `WitnessEditarPost` | `post_simples`, `post_editado` |
| Participação = vínculo ou dono | `participa` | `ComentarExigeParticipacaoAtual`, `EditarComentExigeParticipacaoAtual` | `WitnessCriarComent`, `WitnessEditarComent` | `vinculo_atual` |
| Removido não edita/lê com claim corrente | `podeEditarComent`/`podeLerComent` | `RemovidoNaoEditaComent`, `RemovidoNaoLe` | `WitnessClaimAtualSemVinculo` | — |
| Chefe só modera/remove (Q13) | `podeRemoverPost`, `podeModerarComent` | `ChefeNaoCriaPost`, `ChefeNaoEditaConteudo` | `WitnessChefeModera`, `WitnessRemoverPost` | `post_removido`, `historico_post_moderacao` |
| Turma arquivada = somente leitura | todas as transições | `TurmaArquivadaNegaEscrita` (transversal) | witnesses por operação em Ativo | `turma_arquivada` |
| Edição gera histórico imutável | `editarPost`/`editarComent` | `EdicaoPostCriaHistorico`, `HistoricoNuncaRemovido` | `WitnessEditarPost` | `historico_post_edicao` |
| Remoção lógica preserva documento | `removerPost` | `RemocaoPreservaDocumento` | `WitnessRemoverPost` | `post_removido` |
| Moderação não apaga original; edição não desfaz | `moderarComent`/`editarComent` | `EdicaoNaoDesfazModeracao`, `ComentModeradoPreservado` | `WitnessEdicaoNaoDesfazModeracao` | `comentario_moderado` |
| Máscara de leitura | `listar`/`mostraOriginal` | `ColegaNaoVeOriginalModerado`, `AutorVeOriginalMarcado`, `AuditorVeOriginal` | `WitnessLeituraMascarada` | `leitura_colega_moderado`, `leitura_autor_moderado` |
| M7 primeira execução/retry/reuso | `registraComando`/`retryM7` | `PrimeiraExecucaoProduzReceipt`, `RetryNaoReexecuta`, `RetryNaoDuplicaFato`, `ReusoIncompativelRejeitado` | `WitnessRetryAposExecucao`, `WitnessReusoIncompativel` | `operacao_editar_post` |
| M9 revogação/participação no commit | `revogarVinculo`/`atualizarClaim` | `RevogacaoImpedeCommit`, `RemovidoNaoEditaComent` | `WitnessRemocaoAlunoBloqueia` | — |
| Fronteira M12.2 (roteiro) | `acessoRoteiroValidado` | `SemAcessoNaoPublicaComRoteiro`, `PublicacaoComRoteiroExigeAcesso` | `WitnessPublicaComRoteiro`, `WitnessRoteiroAceito` | `roteiro_anexo`, `post_com_roteiro` |
| Notificação delimitada | `criarPost`/`Notif` | `NotificacaoSoDoAlvo` | `WitnessCriarPost` | `notificacao_efeito` |

**Demonstrado** (bounded model checking, escopos 4/6): as propriedades acima no
modelo declarado. **Abstração explícita** (não provado): conteúdo textual,
canonicalização/HMAC, handlers de Security Rules, transações Firestore sob
carga, concorrência real, ACL/Storage/URL de Roteiros (M12.2) e caixa de
notificações (M13).

## 4. CUE e IR

`specification/cue/domain/formal_m12_1.cue` define `#M12_1Contrato` (10 shapes).
Fixtures: **20 válidas** e **15 inválidas** em `specification/cue/tests/m12_1/`.
A fronteira de notificação passou a exigir `id_operacao`. IR permanece v3; a
fatia `formal_m12_1_posts` não mudou de forma, e o hash global permanece
`b3a134a1e2f04cc9726c64a0e7a50310e8ee21c162fbbac0256dcabff846cb95`. Receipts
M0–M11 inalterados (0 divergências fora de `spec_ir_sha256`); fragmentos M0–M11
byte a byte idênticos.

## 5. Alloy

`specification/alloy/operations/posts_m12_1.als`: **40 checks UNSAT + 17
witnesses SAT = 57 resultados**, escopos `for 6` (transições) e `for 4`
(mínimos). Frames granulares; composição M7 com recibo; `atualizarClaim` como
refresh abstrato de token. Não se modela concorrência real nem exactly-once.

## 6. Receipt e Rust

`build/formal-validation-m12-1.json`: versão 1, Alloy 6.2.0, solver `sat4j`,
modelo `posts_m12_1.als`, 57 resultados, IDs `M12_1-INV-001..040` e
`M12_1-WIT-041..057`. Hashes: receipt
`6928d5e8a337a2f69016fda0e963ff6157aac25dbcbda6f4103a2ce437342ec1`, modelo
`0bf637944ae109a2f076ba200dc120751bbdf62b017dcb17fbebfa370bd5c1e8`, IR
`b3a134a1…cb95`.

`tools/spec-doc/src/validation_m12_1.rs` valida os 57 itens exatos (IDs, ordem,
tipo, scope, status) e rejeita adulteração de hash/modelo/ID/status/scope e troca
`check`↔`run`. Funções determinísticas (`#[cfg(test)]`): `titulo_valido`,
`descricao_valida`, `texto_valido`, `edicao_permitida`, `deve_mascarar`. Testes
Rust = **31**. `#![forbid(dead_code)]`, `#![forbid(unsafe_code)]`,
`#![deny(warnings)]`; nenhum `#[allow(...)]`.

## 7. Guard, gerador e determinismo

`tools/formal/m12_1_contract.test.mjs` = 6 testes (30 Node no total), cobrindo
enums, nomes, predicados/assertions centrais e regras determinísticas. `render_m12_1`
emite `entities/formal_m12_1_posts.tex` e `invariants/formal_m12_1.tex`; MANIFEST
vincula `formal_validation_m12_1_sha256`. Duas gerações consecutivas: **diff
zero**. `docs-check` PASS.

## 8. Gates e PDF

- `just formal-check` **exit 0** após a correção; `cargo fmt --check` = 0;
  `cargo test --locked` = 31 PASS; `cargo clippy --all-targets -- -D warnings`
  = 0; `git diff --check` = 0; determinismo = 0; M0–M11 sem regressão.
- PDF `main.pdf`: **420 páginas** (baseline 418), exit 0, zero erros e zero
  referências indefinidas, 31 Overfull herdados. Inspeção visual das páginas
  413–419 sem corte ou sobreposição.

## 9. Limites, HQ e estado

Não certifica `functions/src/posts.ts`, frontend, `firestore.rules`,
`storage.rules`, Firebase, Auth, Storage, a ACL de Roteiros (M12.2) nem a caixa
de notificações (M13). HQs M12.1 = 0 (a leitura de ex-aluno ficou fail-closed;
nenhuma ambiguidade bloqueante). M0–M11 = **VALIDATED**; **M12.1 = VALIDATED**;
M12.2 = **NOT_STARTED**; M12 = **NOT_STARTED** (fechamento/regressão); M13 =
**NOT_STARTED** (Notificação unificada).

Próxima ação permitida:

```text
M12.2 (Roteiros, compartilhamento, Storage/download e associação a Post) em
rodada própria; depois o fechamento de M12 e, por último, M13. O fechamento
global após M13 é um gate, sem M14 automático.
```
