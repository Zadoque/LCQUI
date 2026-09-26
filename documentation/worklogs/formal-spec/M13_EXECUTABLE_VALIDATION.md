# M13 — Notificação unificada — validação executável

Estado: **VALIDATED**. Cadeia aditiva **CUE → IR v3 → Alloy → receipt → Rust →
LaTeX → PDF** concluída para a fatia M13, a partir do contrato documental de
`M13_DOCUMENTATION.md`. Nenhum arquivo de `functions/`, `frontend/`,
`firestore.rules` ou `storage.rules` foi tocado. O fechamento global pós-M13 é um
gate separado, sem M14 automático.

## 1. Entrada e saída

- Branch: `feat/formal-spec-cue-alloy`.
- HEAD de entrada da Etapa B: `324b3e20` (Etapa A, M13 documental).
- Baseline de Etapa A: `just formal-check` exit 0, PDF 450 páginas, 31 Overfull.
- Estado de saída: M0–M12 = VALIDATED; **M13 = VALIDATED**; HQs M13 = 0.

## 2. CUE e IR v3

- `specification/cue/domain/formal_m13.cue` — `#M13Contrato` com shapes
  `#M13Notificacao`, `#M13Caixa`, `#M13Leitura`, `#M13Marcacao`,
  `#M13LimparTudo`, `#M13Alvo`, `#M13Expiracao`, `#M13Emissao`, `#M13Operacao`.
  Enums fechados de 20 tipos, 6 papéis e 9 rotas de alvo; condicionais
  `lida=false ⇒ lida_em=null`, `id_destinatario = uid`, `id_turma` obrigatório
  nos 6 tipos acadêmicos e nulo nos demais, `expira_em=null` em
  `ESCASSEZ_ESTOQUE`, payload sem conteúdo protegido e coerência de status de
  emissão.
- Fixtures: **14 válidas + 17 inválidas** em `specification/cue/tests/m13/`
  (UID/papel divergente, tipo desconhecido, URL arbitrária na rota, ausência de
  `id_turma` acadêmico, `id_turma` operacional, escassez com prazo, lida/lida_em
  incoerentes, conteúdo protegido, `DELETE`/marcação de posteriores no lote,
  erro de emissão como sucesso). Grupo `['tests/m13', '#M13Contrato']` no
  `specCheck`.
- IR v3 aditivo: entidade `formal_m13_notificacoes` (`#CamposM13`), exemplo
  unificado ao contrato. Novo `spec_ir_sha256 =
  9f2bf7226eddabd9731a4b14302b78e71667d007466bffbc8f455c27a36fd579`. Todos os
  receipts M0–M12 mudaram **apenas** nesse campo (verificado linha a linha).

## 3. Alloy — estado composto e pontes

`specification/alloy/operations/notificacoes_m13.als`: um único `EstadoM13` com
caixa, leitura, marcação, lote, expiração, alvo/ACL, emissão e operações. Os
predicados `versaoCorrente`/`authOk`/`temVinculo` são reproduzidos de M12.1/M9;
`tools/formal/m13_composition.mjs` + `m13_composition.test.mjs` provam a
reprodução por token e rejeitam mutações independentes nas origens e no modelo.

- **28 checks UNSAT + 18 witnesses SAT = 46 resultados**. Escopos `for 4`/`for 5`
  (três comandos `for 5`). `model_sha256 =
  e5d6bd0f95adc711cb391949b7048a981d89039bf527d5e818ffbdfe02078625`.
- Propriedades: caixa única por UID e não leitura alheia; papel visual não filtra
  nem concede; Bolsista/Q12 e multi-role; marcação e `Limpar tudo` só próprios,
  idempotentes, sem `DELETE`, com corte estável e retry que retoma; expiração
  (`NULL` não expira; expirado não apaga); alvo válido versus URL arbitrária;
  revalidação de vínculo/remoção/escopo Q13 e revogação que corta o clique sem
  apagar o fato; `AlertaNaoContornaAcl`; privacidade; dedup por identidade M7 e
  chave distinta; erro não vira sucesso; `id_turma` condicional. Pontes
  `PonteM9ExigeAuth` e `PonteM12NaoAfrouxaAcl`.
- Origens registradas no receipt por hash: `posts_m12_1.als` (`0bf63794…`),
  `authorization_m9.als` (`ddd4db6f…`), `idempotency_m7.als` (`9b68d044…`),
  `stock_cache_scarcity_m8.als` (`16026104…`), `roteiros_m12_2.als`
  (`19ca6ca0…`). As fatias não são reexecutadas nem reabertas.

## 4. Receipt e Rust

- `build/formal-validation-m13.json` (versão 1, Alloy 6.2.0, `sat4j`, 46
  resultados, IDs `M13-INV-001..028` / `M13-WIT-029..046`), sha256
  `fdf66039738acb02b4f382a9f8257b7bf013df2de75b8fdee8d350206308ce7d`.
- `tools/spec-doc/src/validation_m13.rs` valida hashes do IR e do modelo, os
  cinco hashes de origem, ID/ordem/tipo/status/scope exatos e rejeita
  adulteração (versão, solver, IR, modelo, status do 1º check e do 1º run, scope,
  ID, assertion, tipo, origem, remoção/extra/lista vazia). Teste Rust incluído.
- `render_m13` em `render.rs`; `main.rs` lê o receipt, valida a cadeia M13 e o
  invariante `m13_exemplo_valido`, e vincula `formal_validation_m13_sha256` e
  `invariants/formal_m13.tex` no MANIFEST.

## 5. Geração e LaTeX

- `documentation/generated/entities/formal_m13_notificacoes.tex` e
  `documentation/generated/invariants/formal_m13.tex` gerados deterministicamente
  (duas execuções consecutivas byte a byte idênticas).
- `documentation/Formal-Spec-M13.tex` (capítulo 28) incluído em `main.tex`, com
  tabela norma → CUE/IR → check/witness → receipt e limites. O fragmento gerado
  lista os 46 resultados.

## 6. Gates

- `just formal-check` final **exit 0** (executado após o commit): `cargo fmt
  --check`; **35 testes Rust**; `cargo clippy --all-targets -- -D warnings`;
  **43 testes Node**; `alloy-check` PASS; `docs-check` PASS;
  `git diff --exit-code -- documentation/generated/` PASS; `git diff --check`
  PASS.
- PDF: **456 páginas**, exit 0, zero erros e zero referências indefinidas,
  **31 Overfull** (idêntico ao baseline de Etapa A verificado em worktree
  limpo); páginas 451–456 inspecionadas por extração de texto sem corte.
- Regressão M0–M12: modelos, receipts antigos (exceto `spec_ir_sha256`),
  fragmentos e MANIFEST conferidos; nenhum `model_sha256` antigo mudou; M12.2 e a
  composição M12 intactas.

## 7. Limites e dívida

A prova é *bounded* (`for 4`/`for 5`) e **não** certifica `functions/`,
`frontend/`, Firestore/Storage Rules, Auth, Storage real, entrega de e-mail,
relógio de produção (`America/Sao_Paulo`), paginação/concorrência real do
Firestore nem atomicidade entre serviços. A emissão dos tipos sem V1
efetivamente especificada (14 valores) permanece fora do contrato executável. A
matriz de implementação futura deve confrontar Rules/backend reais com este
contrato.

## 8. Alterações

`specification/cue/{domain/formal_m13.cue,docs/projection.cue,tests/m13/*}`,
`specification/alloy/operations/notificacoes_m13.als`,
`tools/formal/{check.mjs,m13_composition.mjs,m13_composition.test.mjs,m13_contract.test.mjs}`,
`tools/spec-doc/src/{main.rs,render.rs,validation_m13.rs}`,
`build/{spec-ir.json,formal-validation*.json,formal-validation-m13.json}`,
`documentation/generated/{entities,invariants,MANIFEST.json}`,
`documentation/{main.tex,main.pdf,Formal-Spec-M13.tex}` e a atualização de
estado. Nenhum arquivo de aplicação. Próxima ação: fechamento global pós-M13
(gate separado), sem M14 automático.

---

# Rodada corretiva (M13-CORR-01/02/03)

Esta rodada corrige três achados encontrados por revisão adversarial sobre a
revisão `88b821c2`. O relato acima é preservado como histórico; os números
correntes desta rodada estão abaixo. M13 permanece `VALIDATED` somente após o
gate desta rodada.

## CORR-01 — contexto acadêmico completo (seis tipos)

O Alloy representava apenas quatro dos seis tipos acadêmicos
(`TPost`, `TComentario`, `TAdicionado`, `TRemovido`), omitindo `TURMA_ARQUIVADA` e
`TURMA_DESARQUIVADA`, enquanto CUE/IR/Seção 7.8 exigiam os seis. Correção:

- Os 20 valores do enum estão agora como `one sig` em `academico`, com `academico`
  cobrindo explicitamente os seis (`TComentario`, `TPost`, `TAdicionado`,
  `TRemovido`, `TArquivada`, `TDesarquivada`).
- Testemunhas `WitnessArquivamentoTurma` e `WitnessDesarquivamentoTurma`, com
  `id_turma`/turma e navegação; checks `IdTurmaAcademicoObrigatorio` e
  `IdTurmaOperacionalNulo` cobrem os seis.
- Fixtures novas: `notificacao_turma_arquivada`, `notificacao_turma_desarquivada`
  (válidas) e `notificacao_turma_arquivada_sem_turma` (inválida). Totais: **16
  válidas + 18 inválidas**.
- Guard `checkM13AcademicTypes` compara CUE, Alloy, Seção 7.8 e o capítulo LaTeX,
  com teste de adulteração que remove um tipo em cada camada.
- A propriedade é estrutural (contexto), não de emissão: cobrir `id_turma` de um
  tipo não cria fluxo emissor nem alega emissão provada.

## CORR-02 — ponte real de autorização (M9/M11/M12)

Na referência, `alunoComVinculo` não exigia papel acadêmico e `PonteM12NaoAfrouxaAcl`
usava o próprio `acessoAtual` (circular). Contraexemplo reproduzido no solver da
referência: um Chefe com vínculo legado, sem papel acadêmico, satisfazia a rota
acadêmica em `EPost` (`run ContraexemploChefeLegado` = SAT na revisão `88b821c2`).
Correção:

- O vocabulário de autorização de `notificacoes_m13.als` passa a ser o de
  `composition_m12.als` e os predicados `versaoCorrente`, `authOk`, `temVinculo`,
  `proprietario`, `compartilhadoAtual`, `roteiroPublicavel`,
  `acessoProfessorRoteiro`, `alunoAcessoPost`, `alunoPodeBaixar`, `escopoQ13` e
  `podeEmitirUrl` são cópias verificadas por token (guard
  `m13_composition.mjs`); `composition_m12.als` entra nas origens do receipt
  (6 origens) e no validador Rust.
- Rotas explícitas: `rotaAcademicaPost` (= `alunoAcessoPost`: papel `alunos` +
  vínculo canônico + Post não removido), `rotaProfessorPost`,
  `rotaChefeAdmin` (Q13 de Post/Comentário, sem registro de URL),
  `rotaProfessorRoteiro` (= `acessoProfessorRoteiro`), `rotaAlunoRoteiro`
  (= `alunoPodeBaixar`), `rotaChefeRoteiro` (Chefe + roteiro publicável +
  `escopoQ13`), `rotaTurma`, `rotaAlmox`, `rotaEmprestimo`.
- Checks: `RotaAcademicaExigePapel`, `ChefeLegadoNaoUsaAcademico`,
  `ChefeAdminNaoHerdaAcademico`, `SemVinculoNaoRestaura`,
  `ProfessorDonoMantemAcesso`, `CompartilhamentoSoProfessor`,
  `ChefeSemEscopoNaoEmiteUrl`, `EscopoEncerradoImpedeNovaEmissao`,
  `EncerramentoEscopoPreservaRoteiro`, `RoteiroAlunoExigePostEAnexo`,
  `PonteRotaChefeRoteiroRefinaUrl`, `AlertaNaoContornaAcl`.
- Projeção de comentário moderado: `ColegaVeAviso`, `AutorVeOriginal`,
  `AuditorVeOriginal` e `NotificacaoNaoExpoeOriginal`.
- Testemunhas positivas impedem a correção que nega tudo:
  `WitnessRotaAcademicaValida`, `WitnessChefeLegadoNaoUsaAcademico`,
  `WitnessProfessorDonoPost`, `WitnessCompartilhamentoRoteiro`,
  `WitnessChefeComEscopo`, `WitnessEscopoEncerrado`, `WitnessSemVinculoClaimAtual`
  e as de projeção de comentário.
- A paginação continua sendo um lote abstrato com corte estável; o capítulo e
  este worklog declaram esse limite, sem retirar o requisito normativo.

## CORR-03 — obrigação V1 versus cobertura da prova

A generalização anterior (“somente seis tipos / os outros 14”) era incorreta:
havia obrigações fora daquela lista. A tabela de reconciliação dos 20 tipos:

| Tipo | Fonte de obrigação V1 | Evento/destinatário definido | Cobertura estrutural M13 | Prova de emissão existente | Fronteira não provada |
|---|---|---|---|---|---|
| POST | Seção 7.6 (M12.1) | Post em turma; membros/autores | `#M13Notificacao` (acadêmico) | M12.1 (efeito delimitado) | Entrega real |
| COMENTARIO | Seção 7.6 (M12.1) | Comentário; autor/colegas | `#M13Notificacao` (acadêmico) | M12.1 | Entrega real |
| ROTEIRO_COMPARTILHADO | Seção 7.7 (M12.2) | Professor destinatário | `#M13Notificacao` | M12.2 | Entrega real |
| ESCASSEZ_ESTOQUE | Seção 7.8/10.7 (M8) | Gestor vinculado ao almoxarifado; docId diário | `#M13Notificacao` + M8 | M8 (receipt) | Job/cron real |
| FRASCOS_VENCIDOS | Seção 10.7 (job) | Gestores vinculados; `vencidos_{almox}_{dia}` | `#M13Notificacao` (operacional) | Não formalizada em M13 | Job real; dedup |
| DATA_DEVOLUCAO_REAGENTE | Seção 7.8/10.7 | Retirante (Professor/Bolsista); `{id_emprestimo}--{janela}` | `#M13Notificacao` | Não (M8 diário não cobre) | Job real; janela |
| ENTREGA_ATRASADA | Seção 10.7 (job) | Gestores vinculados; `atraso_{almox}_{dia}` | `#M13Notificacao` (operacional) | Não formalizada | Job real; dedup |
| REQUISICAO_BEM | Seção 4/7.8 | Professor solicitante, na resposta | Enum `#M13Tipo` | Não (patrimônio fora de M13) | Fluxo de requisição |
| REQUISICAO_ADICAO_BEM | Seção 4/7.8 | Gestores de bens, na abertura | Enum | Não | Fluxo de requisição |
| REQUISICAO_EDICAO_BEM | Seção 4/7.8 | Gestores de bens, na abertura | Enum | Não | Fluxo de requisição |
| TURMA_ARQUIVADA | Seções 8--9 (PRO-02) | Membros da turma | `#M13Notificacao` (acadêmico) | M11 ar/desarquivamento; emissão não formalizada | Backend |
| TURMA_DESARQUIVADA | Seções 8--9 (PRO-02) | Membros da turma | `#M13Notificacao` (acadêmico) | Idem | Backend |
| AUTO_ATENDIMENTO_RETIRADA | Q14 (Seção 7) | Chefia | Enum (operacional) | Não formalizada | Backend |
| ADICIONADO | Sem obrigação V1 decidida | — | Acadêmico | — | Destinatário/mecanismo não decididos |
| REMOVIDO | Sem obrigação V1 decidida | — | Acadêmico | — | Destinatário/mecanismo não decididos |
| BEM_INSERVIVEL | Sem obrigação V1 decidida | — | Enum | — | Destinatário/mecanismo não decididos |
| FRASCOS_VAZIOS | Taxonomia compartilhada (7.8) | — | Enum | — | Destinatário/mecanismo não decididos |
| FRASCOS_QUEBRADOS | Taxonomia compartilhada (7.8) | — | Enum | — | Destinatário/mecanismo não decididos |
| FRASCOS_A_SEREM_PESADOS | Taxonomia compartilhada (7.8) | — | Enum | — | Destinatário/mecanismo não decididos |
| FRASCOS_EM_QUARENTENA | Taxonomia compartilhada (7.8) | — | Enum | — | Destinatário/mecanismo não decididos |

“Fora da prova de emissão M13” não significa “fora da V1”. A Seção 7.8 foi
corrigida para não generalizar; destinatário, frequência, prazo e chave de dedup
dos tipos sem fonte decisória permanecem lacuna explícita, não prova nem
dispensa.

## Ajustes de revisão semântica (fan-out, coerência e expiração)

Após revisão adversarial dos próprios resultados:

- **Fan-out versus dedup.** A restrição original “um aviso por operação” foi
  substituída por deduplicação **por destinatário**: a mesma operação (ou a mesma
  chave determinística M8) não notifica o mesmo UID duas vezes, mas pode ter
  fan-out para destinatários distintos (`fanOut`, `FanOutNaoDuplicaDestinatario`,
  `WitnessFanOutMesmaOperacao`). Isso alinha M7 (identidade de comando por
  retry) e M8 (chave determinística) sem impedir o fan-out do domínio.
- **Preservação de coerência não vacua.** As transições deixaram de incluir
  `coerente[b]` como conclusão; a preservação passou a ser **derivada** por
  `TransicoesPreservamCoerencia`, com frames explícitos. Isso encontrou e fechou
  lacunas reais de preservação (alvo válido/`alvoInvalido` e id_turma/escassez
  nas emissões; consistência de `lida/lida_em` em átomos não emitidos no lote).
- **Expiração e conjunto ativo.** `ExpiradoForaDoAtivo` passou a usar
  `ativo[s,n]` (emitido e não vencido): o aviso expirado sai do conjunto ativo e
  o registro permanece, sem `DELETE`.

## Evidência da rodada corretiva

- Alloy: **35 checks UNSAT + 26 witnesses SAT = 61 resultados** (escopos 4/5;
  comandos `for 5` conforme o modelo).
- Receipt `build/formal-validation-m13.json` (6 origens); hashes atualizados
  abaixo após a regeneração.
- CUE/IR: `spec_ir_sha256` **inalterado** (`9f2bf722…36fd579`); M0–M12
  preservados byte a byte (nenhum `model_sha256` ou receipt antigo mudou).
- Rust `validation_m13.rs` com 6 origens e 61 entradas exatas.
- Node: 44 testes (guards de composição, tipos acadêmicos e mutação controlada).
- PDF com 0 erros, 0 referências indefinidas, 31 Overfull (igual ao baseline).

## Limites preservados

Continua sendo prova *bounded* (`for 4`/`for 5`), de lote abstrato para ``Limpar
tudo'', e não certifica Firebase, Firestore/Storage, Rules, Auth, relógio real,
paginação/concorrência real nem entrega externa.
