# M12.2 — Roteiros, compartilhamento, Storage/download e anexo a Post (formalização executável)

Estado: **VALIDATED**. Cadeia aditiva CUE → IR v3 → Alloy → receipt verificável →
validação Rust → geração determinística → LaTeX → PDF. Não altera `functions/`,
`frontend/`, Firestore/Storage Rules, Auth, Storage, índices nem inicia M12/M13.

## 1. Entrada e fontes

- Branch: `feat/formal-spec-cue-alloy` (única).
- HEAD de entrada: `eb6d89e47fd14eb43ddf98d22f194e9236f3a7d1`, árvore limpa e
  `origin` sincronizada. HEAD de saída = commit executável `a11c716b` + commit
  documental seguinte.
- Fonte normativa: Seção 7.7 (`\label{sec:regras-roteiros-m12-2}`), reconciliada
  com Seções 3/4/5/8/9/11, RF21–RF23, UI-11, Q09 e Q13, e com a fronteira
  abstrata `roteiro_anexo`/`acessoRoteiroValidado` de M12.1 (Seção 7.6).
- Q09 (`MODIFICACOES_CONSOLIDADAS_LCQUI.md`): a revogação impede novas
  associações e preserva os Posts históricos via snapshot.
- Planejamento: M12 = NOT_STARTED (fechamento M12.1/M12.2); M13 = NOT_STARTED.

## 2. Fase 1 — micro-realinhamento normativo

| ID | Achado | Correção |
|---|---|---|
| M12.2-REAL-01 | A Seção 7.7 afirmava genericamente que Post removido/roteiro revogado ``não vazam por URL'', sem distinguir emissão nova de URL já entregue. | Reescreveu-se ``Leitura e download'': remoção, perda de vínculo e revogação impedem **novas emissões**; a URL curta já emitida permanece utilizável até expirar, sem revogação instantânea/retroativa; cada nova emissão revalida no endpoint; nenhum cache/erro/notificação/leitura direta devolve o conteúdo. Alinharam-se Seções 8 (UI-11), 9 (fluxos) e 11 (Rules/Storage). |
| M12.2-REAL-02 | ``Upload seguro e publicabilidade'' dizia só que Firestore e Storage não têm transação única, sem separar a geração persistida da inspeção externa do objeto. | Fixou-se: a geração é **persistida no documento** e lida/comparada **na transação do Firestore**; a inspeção do objeto no Storage é **externa**; o Firestore **não** lê nem trava a geração real do Storage; objeto e geração **imutáveis**; validação binária antes do vínculo; **janela residual** e reconciliação explícita; sem atomicidade entre serviços. Alinhou-se a composição M7/M9, a Seção 8 e a Seção 11. |
| M12.2-REAL-03 | `#M12_1RoteiroAnexo` (M12.1) **não** continha `geracao`, exigida pela Seção 7.7 no snapshot. | Preferiu-se **extensão aditiva**: `#M12_2RoteiroAnexo` reconstrói o anexo M12.1 via projeção oculta `_refina_m12_1: #M12_1RoteiroAnexo & {...}` e acrescenta `geracao`; `#M12_2AnexoVinculado` liga o anexo à referência canônica (`geracao`, `storage_path`, `tamanho_bytes`, `id_roteiro`). M12.1 permanece **byte a byte idêntico** e não é tratado como prova da geração. |

Nenhuma decisão humana bloqueante: todos os casos foram resolvidos por Q09 +
Seção 11 + fail-closed explícito. **HQs M12.2 = 0**.

### Matriz regra → fonte → camada de prova → cenário positivo → contraexemplo

| Regra | Fonte | Camada | Cenário positivo | Contraexemplo |
|---|---|---|---|---|
| Geração no snapshot ligada à referência | S4/S5/S7.7 | CUE `#M12_2AnexoVinculado`; Alloy `AnexoUsaGeracaoCanonica` | `anexo_vinculado` | `anexo_geracao_divergente`, `geracao_ausente` |
| 15 MiB estrito / tipo / titularidade | S7.7/S8/S11 | CUE + Rust | `referencia_canonica` | `tamanho_15mib`, `content_type_nao_pdf`, `owner_divergente` |
| Provisório→validado→publicável | S7.7 | Alloy `CadastroComecaProvisorio`, `PublicavelSoDeValidado`, `ValidarFixaGeracao` | `WitnessValidaObjeto`, `WitnessPublica` | `status_invalido` |
| Objeto/geração fixos | S7.7 | Alloy `ObjetoNuncaSobrescrito`, `GeracaoNaoMudaSemValidar` | — | (UNSAT) |
| Compartilhamento único/destinatário ativo | S4/S5/S7.7 | Alloy `CompartilhamentoUnico`, `CompartilharExigeDestinatarioAtivo` | `WitnessCompartilhadoEmite` | `WitnessReusoIncompativel` |
| Revogação Q09 preserva histórico | Q09/S7.7/S9 | Alloy `UrlEmitidaSobreviveARevogacao` + frames | `WitnessRevogadoNaoEmite` | (UNSAT) |
| Download professor/aluno/Chefe/ex-aluno | S7.7/S8/S9/S11 | Alloy `EmissaoExigeAcesso`, `AlunoDependeDeVinculo`, `ExAlunoNaoEmite` | `WitnessAlunoEmitePostAtivo`, `WitnessChefeEmite` | `WitnessExAlunoNaoEmite` |
| Turma arquivada / Post removido | S7.7/Q08 | Alloy `TurmaArquivadaNegaEscritaRoteiro`, `PostRemovidoNegaAluno` | `WitnessAlunoEmiteTurmaArquivada` | `WitnessPostRemovidoNaoEmiteAluno` |
| URL já emitida não é revogada retroativamente | S7.7/S9/S11 | Alloy `urlsAtivas`, `UrlAtivaUsavel` | `WitnessUrlAtivaAposRevogacao` | (UNSAT expirada) |
| Anexo/troca/manter/desvincular + histórico | S7.7/S8 | Alloy `AnexarExigeAcessoAtual`, `ManterExigeAcessoAtual`, `HistoricoAnexoNuncaRemovido` | `WitnessAnexaComAcesso`, `WitnessTrocaPreservaHistorico`, `WitnessDesvinculaSemAcesso` | (UNSAT) |
| M7 primeira execução/retry/reuso | S7.7 | Alloy `PrimeiraExecucaoProduzReceipt`, `RetryNaoReexecuta`, `ReusoIncompativelRejeitado` | `WitnessRetryAposExecucao` | `WitnessReusoIncompativel` |
| M9 revogação impede commit | S7.7 | Alloy `RevogacaoVinculoImpedeCommit` | `WitnessExAlunoNaoEmite` | (UNSAT) |

## 3. CUE e IR

`specification/cue/domain/formal_m12_2.cue` define `#M12_2Contrato` (13 shapes).
Fixtures: **17 válidas** e **16 inválidas** em `specification/cue/tests/m12_2/`.
`#M12_2RoteiroAnexo` embute aditivamente o contrato M12.1 por projeção oculta;
M12.1 permanece idêntico. IR v3 aditivo (`formal_m12_2_roteiros`, 16 campos)
substitui nenhuma chave anterior. `spec_ir_sha256` passou de
`b3a134a1…` (M12.1) para
`b5671cb75609239db147d9fbe446aafa35d12f2d71ee91753f4d4cb630573fe1`; receipts
M0–M12.1 mudaram **apenas** nesse campo (modelos/resultados preservados).

## 4. Alloy

`specification/alloy/operations/roteiros_m12_2.als`: **41 checks UNSAT + 20
witnesses SAT = 61 resultados**, escopos `for 6` (transições) e `for 4`
(mínimos), SAT4J. Frames granulares por transição (cadastrar não fixa
`roteiroStatus`; emitir não fixa `urls`); `urlsAtivas` modela a validade
temporal abstrata da URL já emitida. Contraexemplos iniciais corrigidos:
metadados pendentes de Roteiro fora do estado (`CadastroComecaProvisorio`,
`RoteiroValidadoTemGeracao`), criação como primeira escrita (`DonoImutavel`) e
asserção excessiva sobre Post removido (`PostRemovidoNegaAluno`). Duas rodadas
de correção de frame ocorreram antes do gate. Não se modela concorrência real
nem exactly-once.

## 5. Receipt e Rust

`build/formal-validation-m12-2.json`: versão 1, Alloy 6.2.0, solver `sat4j`,
modelo `roteiros_m12_2.als`, 61 resultados, IDs `M12_2-INV-001..041` e
`M12_2-WIT-042..061`. Hashes: receipt
`ac0c7008e04d176a1d7bf6f8d84ef61df99715e66e5edfc1d85b1cf5f0fd64da`, modelo
`b86da4bc451d94ac652cba1e34ae0c3453999fe2322040d3340696d41ed77aaf`, IR
`b5671cb7…3fe1`.

`tools/spec-doc/src/validation_m12_2.rs` valida os 61 itens exatos (ID, ordem,
tipo, scope, status) e rejeita adulteração de hash/modelo/ID/status/scope e troca
`check`↔`run`. Funções determinísticas: `tamanho_valido`, `content_type_pdf`,
`titularidade_ok` (produção, usadas pelo invariante de IR `m12_2_exemplo_valido`)
e `status_publicavel`, `anexo_vinculado_ok`, `emissao_exige_acesso`,
`url_emitida_utilizavel`, `aluno_baixa`, `uids_unicos` (`#[cfg(test)]`). Testes
Rust = **33**. `#![forbid(dead_code)]`, `#![forbid(unsafe_code)]`,
`#![deny(warnings)]`; nenhum `#[allow(...)]`.

## 6. Guard, gerador e determinismo

`tools/formal/m12_2_contract.test.mjs` = 6 testes (36 Node no total), cobrindo
enums, nomes, fronteira M12.1↔M12.2, predicados/assertions centrais, fonte
normativa (novas emissões / URL já emitida / não atomicidade / refinamento
aditivo) e regras determinísticas. `render_m12_2` emite
`entities/formal_m12_2_roteiros.tex` e `invariants/formal_m12_2.tex`; MANIFEST
vincula `formal_validation_m12_2_sha256`. Duas gerações consecutivas: **diff
zero**.

## 7. Gates e PDF

- `just formal-check` **exit 0** com árvore limpa: `cargo fmt --check` = 0;
  `cargo test --locked` = 33 PASS; `cargo clippy --all-targets -- -D warnings` =
  0; 36 testes Node PASS; Alloy PASS; `docs-check` PASS; `git diff --exit-code --
  documentation/generated/` PASS; `git diff --check` = 0.
- PDF `main.pdf`: **434 páginas** (baseline 420), exit 0, zero erros e zero
  referências indefinidas, 31 Overfull únicos (iguais ao baseline). Inspeção
  visual das páginas 427–434 sem corte ou sobreposição.
- Regressão M0–M12.1: modelos e resultados preservados; M12.1 byte a byte
  idêntico; receipts antigos mudaram apenas `spec_ir_sha256`.

## 8. Auditorias

1. **Sections 3–11/Q09 × CUE/IR/fixtures — limpa:** campos canônicos de
   `Roteiro_Experimento` coincidem (Seções 4/5); PK composta
   `(id_roteiro, id_professor)` ↔ array server-owned único; `file_url` legado;
   limites de UI-11 e Storage refletidos; Q09 preservado; `content_type`
   restrito a PDF (V1) é intencional; o array `professores_compartilhados` não
   entra na projeção IR (relacional), sendo provado em Alloy/CUE.
2. **Alloy × receipt × Rust × fragmentos/MANIFEST × PDF — limpa:** hashes do IR,
   modelo e receipt conferem; `validation_m12_2` reproduz os 61 itens; MANIFEST
   vincula receipt e fragmentos; páginas 427–434 renderizadas sem defeito.

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
