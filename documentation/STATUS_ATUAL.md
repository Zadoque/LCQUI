# Status atual do LCQUI

## Estado corrente — M13 validado (Notificação unificada, documental e executável)

O contrato da entidade única `Notificacao` foi consolidado na **Seção 7.8**
(`\label{sec:regras-notificacoes-m13}`), compondo M7, M8, M9, M11, M12.1 e M12.2
sem reabrir suas provas, e formalizado na cadeia **CUE → IR v3 → Alloy →
receipt → Rust → LaTeX → PDF**. HEAD de entrada da Etapa A:
`430fb0ad2b2df6f5542635d7a7bbea43e311ae5f` (árvore limpa, `origin` sincronizada);
commit documental `324b3e20`. **M0–M12 = VALIDATED; M13 = VALIDATED**; HQs
M13 = 0. Registros em
[worklog M13 documental](worklogs/formal-spec/M13_DOCUMENTATION.md) e
[worklog M13 executável](worklogs/formal-spec/M13_EXECUTABLE_VALIDATION.md).

- **Regras:** caixa única por conta (UID) reunindo todos os papéis, sem o papel
  visual filtrar nem conceder; leitura só da própria caixa; criação/marcação/
  `Limpar tudo` server-owned, `lida = false ⇒ lida_em = null`, retry
  idempotente, lote paginado/reentrante com **corte estável** por rodada e sem
  `DELETE`; `expira_em = null` em `ESCASSEZ_ESTOQUE`, expirado sai do ativo sem
  apagar; alvo/deep link revalida autorização corrente (M9/M11/M12) e nunca é
  URL/credencial; payload mínimo e Rules não mascaram campos; dedup reutiliza
  M7/M12.1/M12.2 e a prova M8 de `ESCASSEZ_ESTOQUE` (sem reconstruir M8), com
  docId `{id_emprestimo}--{janela}` para `DATA_DEVOLUCAO_REAGENTE`; `id_turma`
  obrigatório nos tipos acadêmicos e nulo nos operacionais.
- **Executável:** CUE `#M13Contrato` (**14 fixtures válidas + 17 inválidas**),
  IR v3 aditivo `formal_m13_notificacoes`, `notificacoes_m13.als` com estado
  composto (**28 checks UNSAT + 18 witnesses SAT = 46 resultados**, escopos 4/5),
  receipt `build/formal-validation-m13.json`, `validation_m13.rs` (35 testes Rust
  no total), guards `m13_composition.mjs`/`m13_composition.test.mjs`/
  `m13_contract.test.mjs` (43 testes Node no total), geração determinística e
  capítulo `Formal-Spec-M13.tex`. `model_sha256 = e5d6bd0f…78625`; receipt
  `fdf66039…308ce7d`.
- **Reconciliações:** M13-REC-01 (`id_turma` da Seção 4 reconciliado com a regra
  acadêmica) e M13-REC-02 (`geracao` incluída no snapshot `roteiro_anexo` da
  Seção 5, alinhando com a Seção 7.7 e a prova M12.2).
- **Projeções:** Seções 3, 4, 5, 6, 8 (UI-12), 9 (fluxos/regressão) e 11
  alinhadas; enum 3FN × dicionário nos 20 valores. Receipts M0–M12 mudaram
  somente em `spec_ir_sha256` (IR aditivo); nenhum `model_sha256` antigo mudou.
- **Gates:** `just formal-check` exit 0 (35 Rust, 43 Node, Alloy PASS, docs-check
  PASS, stale gate PASS); PDF **456 páginas**, exit 0, zero erros e zero
  referências indefinidas, **31 Overfull** (idêntico ao baseline da Etapa A).
- **Limites:** prova *bounded* (`for 4`/`for 5`); não certifica `functions/`,
  `frontend/`, Rules, Auth, Storage, relógio real, paginação/concorrência real
  nem entrega externa; dívida de implementação registrada para a matriz futura.

Próxima ação exata: **fechamento global pós-M13** (gate separado, sem M14
automático). Não implementar `functions/`, `frontend/`, `firestore.rules` ou
`storage.rules` nesta rodada.

## Histórico — M12 fechado (composição M12.1 × M12.2)

Fechamento de **M12 = VALIDATED**: prova conjunta de Posts/Comentários (M12.1) e
Roteiros/Storage/compartilhamento (M12.2) em um único `EstadoIntegrado`
(`specification/alloy/operations/composition_m12.als`), com a ponte
`ponteAcessoRoteiro`, guard de drift (`m12_composition.mjs`/`m12_contract.test.mjs`),
receipt `build/formal-validation-m12.json`, validador Rust `validation_m12.rs`,
capítulo `Formal-Spec-M12.tex` e PDF de **442 páginas**. HEAD de entrada:
`2922dd69a790e05aeeef776b4596e37e98d00401`. M0–M11, M12.1 e M12.2 seguem
VALIDATED; M13 = NOT_STARTED; **HQs M12 = 0**. Registro em
[worklog M12 fechamento](worklogs/formal-spec/M12_CLOSURE.md).

- **Composição (`composition_m12.als`):** **37 checks UNSAT + 18 witnesses
  SAT = 55 resultados** (scope 4/5); M12.2 passou a **52 checks UNSAT + 27
  witnesses SAT = 79 resultados**. `model_sha256` composição
  `2fa2d9f6…c4c16e`; receipt M12 `c0e091d4…1e1392`.
- **Item 2a (M12-CORR-01):** `compartilhar` exige `roteiroPublicavel[a,r]`
  explícito (check `CompartilharExigePublicavel`), alinhando o código ao worklog;
  negativas e sucesso nos três status (`WitnessProvisorio…`, `WitnessValidado…`,
  `WitnessCompartilhaPublicavel`).
- **Item 2b (M12-CORR-02):** M9/M11 não eliminam atomicamente vínculos ao
  tornar-se Chefe; a rota acadêmica exige papel `alunos` **e** vínculo atual.
  `coerente` de M12.2 deixou de assumir `vAluno not in chefes`; `promoverChefe`
  modela o vínculo legado e `ChefeComVinculoLegado…` prova a negação, mantendo o
  Chefe só por Q13. Alinha Alloy/CUE/Rust (`aluno_baixa` já exigia `ALUNO`).
- **M7/M9/Q09:** receipt na primeira execução, retry sem duplicar, reuso
  incompatível rejeitado, revogação preserva Post/snapshot/histórico/objeto/URL,
  M9 impede commit após revogação de vínculo.
- **Sem CUE/IR novo:** a ponte de dados já existe (`#M12_2RoteiroAnexo` embute
  `#M12_1RoteiroAnexo`; `#M12_2AnexoVinculado`); IR e receipts M0–M12.1
  inalterados (`spec_ir_sha256` idêntico).
- **Limites:** prova *bounded* (for 4/5); não certifica `functions/`, frontend,
  Rules, Storage real, bytes, concorrência nem atomicidade Firestore–Storage.

## Histórico — M12.2 executável validado (Roteiros, compartilhamento e Storage)

Cadeia aditiva **CUE → IR v3 → Alloy → receipt → Rust → LaTeX → PDF** para
Roteiros, compartilhamento, Storage/download e anexo a Post. HEAD de entrada da
rodada corretiva: `1000513a0e54de0f2f69583ff50532a6096420fc`; commit executável
`8fc21a61`. **M12.2 = VALIDATED** (após rodada corretiva); M0–M11 e M12.1 =
VALIDATED; M13 = NOT_STARTED; **HQs M12.2 = 0**. Registro em
[worklog M12.2 executável](worklogs/formal-spec/M12_2_EXECUTABLE_VALIDATION.md).

- **Rodada corretiva (dois achados fechados):** (1) `compartilhar` passou a
  exigir `roteiroPublicavel` e `coerente` rejeita compartilhamento de roteiro
  `Provisorio`/`Validado` (M12.2-CORR-01); (2) o Chefe só emite URL sob
  **escopo Q13 registrado** (`AuditoriaQ13`: Chefe + roteiro + Post removido que
  referencia o roteiro), com Chefe exclusivo sem vínculo de aluno
  (RN-ROLE-01) e fim do escopo impedindo apenas novas emissões
  (M12.2-CORR-02).

- **Realinhamento normativo (Fase 1):** a Seção 7.7 passou a distinguir
  **novas emissões** de URL (bloqueadas por remoção/perda de vínculo/revogação,
  revalidadas a cada emissão) do **uso de URL já emitida** (permanece válida até
  o prazo curto, sem revogação instantânea/retroativa); explicitou-se o limite
  transacional (geração persistida no Firestore, comparada na transação, versus
  inspeção externa do objeto no Storage, sem atomicidade entre serviços, com
  objeto/geração imutáveis e janela residual reconciliada). Seções 8/9/11
  alinhadas.
- **Interface M12.1↔M12.2:** `#M12_2RoteiroAnexo` refina aditivamente
  `#M12_1RoteiroAnexo` (projeção oculta) e acrescenta `geracao`;
  `#M12_2AnexoVinculado` liga o anexo à referência canônica. M12.1 permanece
  byte a byte idêntico e não é tratado como prova da geração.
- **CUE:** `#M12_2Contrato` (14 shapes, inclui `#M12_2EscopoAuditoriaQ13`;
  **18 fixtures válidas + 18 inválidas**), limites (nome 1–150, geração 1–120,
  tamanho positivo e **PDF estritamente < 15 MiB** = 15 728 640 bytes), ACL de
  UID único, status fechado `PROVISORIO|VALIDADO|PUBLICAVEL`.
- **IR:** v3 aditivo (`formal_m12_2_roteiros`, 16 campos) **inalterado** nesta
  rodada; `spec_ir_sha256` =
  `b5671cb75609239db147d9fbe446aafa35d12f2d71ee91753f4d4cb630573fe1`. Nenhum
  receipt M0–M12.1 mudou.
- **Alloy:** `roteiros_m12_2.als` com **47 checks UNSAT + 25 witnesses SAT = 72
  resultados** (scope 6/4): dono imutável, provisório→validado→publicável,
  objeto/geração fixos, compartilhamento único **só de roteiro publicável**,
  revogação Q09, ACL professor/aluno, **Chefe só sob escopo Q13**, turma
  arquivada, ex-aluno com claim, Post removido, anexar/trocar/manter/desvincular,
  histórico imutável, URL já emitida e composição M7/M9.
- **Receipt/Rust:** `build/formal-validation-m12-2.json` (receipt
  `ab924f4c…4f51`, modelo `51348d15…e417a`); `validation_m12_2.rs` valida 72
  itens e rejeita adulteração; 33 testes Rust; 36 Node; guard
  `m12_2_contract.test.mjs`.
- **PDF:** **435 páginas**, exit 0, zero erros/refs indefinidas, 31 Overfull
  únicos (iguais ao baseline); páginas 427–435 inspecionadas sem corte.
- **Limites:** não certifica `functions/src/roteiros.ts`/`posts.ts`, frontend,
  Rules, Storage real, bytes binários nem atomicidade Firestore/Storage.
- **Dívida de implementação:** `roteiros.ts` usa array de e-mail em vez de UID,
  sem `idOperacao`/M7/geração; `posts.ts` sem snapshot/geração; `storage.rules`
  libera `read` de `/roteiros` a qualquer autenticado.

Naquele checkpoint a próxima ação era **M13** (Notificação unificada: entidade
`Notificacao` M7/M8/M9/M12, reutilizando `ESCASSEZ_ESTOQUE` de M8), depois
concluída na rodada documental acima. **M12 = VALIDATED** (composição
M12.1/M12.2). O fechamento global após M13 é um gate, sem M14 automático.

## Histórico — M12.2 documental validado (Roteiros de Experimento)

Rodada **exclusivamente documental**. HEAD de entrada:
`b24813c1e77b4a36540a1289abbce0269ed50405`. Nova fonte normativa na
**Seção 7.7** (`\label{sec:regras-roteiros-m12-2}`), reconciliando 3FN,
Firestore, UI-11, fluxos, Seção 10.11 e Seção 11, com **Q09 incorporada**
(definição em `MODIFICACOES_CONSOLIDADAS_LCQUI.md`). **M12.2 =
DOCUMENTATION_VALIDATED**; M0–M11 e M12.1 = VALIDATED; M12 = NOT_STARTED
(composição M12.1/M12.2); M13 = NOT_STARTED; HQs M12.2 = 0. Registro em
[worklog M12.2](worklogs/formal-spec/M12_2_DOCUMENTATION.md).

- **Arquivo e autoria:** dono imutável `id_professor_upload`; referência
  canônica `storage_path` + `content_type` + `tamanho_bytes` + `owner_uid` +
  `geracao` + `criado_em`; `file_url` legado, nunca credencial; URL temporária.
- **Upload/publicabilidade:** professor ativo, PDF estritamente $<15$ MiB, bytes
  `%PDF-`, caminho/titularidade/geração; publicável só após validação; falha não
  cria registro utilizável; órfão reconciliado; Firestore–Storage sem transação
  única.
- **Compartilhamento/revogação (Q09):** relação única por (roteiro, professor),
  array server-owned, idempotente M7; revogação impede novas associações e
  preserva Posts históricos; notificação mínima `ROTEIRO_COMPARTILHADO`.
- **Leitura/download:** propriedade/compartilhamento atual (professor); vínculo
  canônico atual + Post acessível (aluno); turma arquivada somente leitura;
  ex-aluno negado; Chefe por Q13; sem vazamento por URL/cache/erro; falha
  fechado se objeto/geração ausente.
- **Anexo a Post:** no máximo um roteiro por Post; acesso atual no commit
  **inclusive na edição**; snapshot imutável com geração, não é autorização;
  desvincular não exige acesso e registra histórico M12.1.
- **Limites:** não certifica `functions/src/roteiros.ts`/`posts.ts`, frontend,
  Rules, Storage, Auth nem a aplicação real. PDF **424 páginas**, exit 0.
- **Dívida de implementação:** `roteiros.ts` usa array de e-mail em vez de UID,
  sem `idOperacao`/M7/geração; `posts.ts` sem snapshot/geração; `storage.rules`
  libera `read` de `/roteiros` a qualquer autenticado.

Próxima ação exata: formalização executável **M12.2** (CUE → IR → Alloy →
receipt → Rust → LaTeX → PDF) em rodada separada; depois o fechamento de M12 e,
por último, M13. O fechamento global após M13 é um gate, sem M14 automático.

## Histórico — M12.1 executável validado (Posts, comentários e moderação)

Cadeia executável aditiva concluída e corrigida na branch
`feat/formal-spec-cue-alloy`. HEAD de entrada da rodada corretiva:
`136c840a91b891afab585a84e15688fa852f4f28`. **M12.1 = VALIDATED** (documental e
executável, após saneamento semântico); M0–M11 = VALIDATED; M12.2 =
NOT_STARTED; M12 = NOT_STARTED (fechamento de composição/regressão M0–M11);
M13 = NOT_STARTED (Notificação unificada). Registro em
[worklog M12.1 executável](worklogs/formal-spec/M12_1_EXECUTABLE_VALIDATION.md).

- **Rodada corretiva (saneamento):** `podeEditarComent`/`podeLerComent` passaram
  a exigir `participa = vínculo canônico atual ∨ professor dono`; claim
  atualizada não recria participação (`WitnessClaimAtualSemVinculo`). O M7
  vacuoso (`retryM7 ≡ b=a`) foi substituído por composição com `idOperacao` e
  receipt (primeira execução/retry idêntico/reuso incompatível).
  `TurmaArquivadaNegaEscrita` tornou-se transversal a todas as escritas. A regra
  antiga que permitia o Chefe **editar** posts foi reconciliada (só
  modera/remove).
- **CUE:** `#M12_1Contrato` (Post, Comentário, históricos de edição/moderação,
  projeção de leitura, efeito mínimo de notificação vinculado ao `idOperacao`,
  operação); 20 fixtures válidas + 15 inválidas em
  `specification/cue/tests/m12_1/`.
- **IR v3 aditivo:** `formal_m12_1_posts`; hash global `b3a134a1…cb95`.
  Receipts M0–M11 inalterados fora de `spec_ir_sha256`; só o MANIFEST e os dois
  fragmentos M12.1 são novos.
- **Alloy:** `specification/alloy/operations/posts_m12_1.als` — **40 checks
  UNSAT + 17 witnesses SAT** (escopos 4/6 = 57 resultados): autoria imutável,
  participação por vínculo canônico/ownership (M11; claim não recria), turma
  arquivada somente leitura (Q08) inclusive Chefe, edição/remoção lógica com
  histórico imutável, moderação com máscara, fronteira abstrata de roteiro
  (M12.2), notificação sem conteúdo vinculada ao comando, composição M7 com
  receipt e M9 (revogação impede commit).
- **Receipt:** `build/formal-validation-m12-1.json`
  (`6928d5e8…2ec1`), validado por `validation_m12_1.rs` com rejeição de
  adulteração; testes Rust = 31.
- **Determinismo:** duas gerações consecutivas com diff zero; `docs-check`
  PASS.
- **PDF:** `main.pdf` **420 páginas** (baseline 418), exit 0, zero
  erros/referências indefinidas, 31 Overfull herdados; páginas 413–419
  inspecionadas.
- **Limites:** não certifica `functions/src/posts.ts`, frontend, Rules, Auth,
  Storage, a ACL de Roteiros (M12.2) nem a caixa de notificações (M13).
  Fronteira D-M12.1-01 (ACL de Roteiros) permanece não bloqueante; HQs M12.1 = 0.

Próxima ação exata: executar M12.2 (Roteiros, compartilhamento, Storage/download
e associação a Post) em rodada própria; depois o fechamento de M12 e, por
último, M13. O fechamento global após M13 é um gate, sem M14 automático.

## Histórico — M12.1 documental validado (Posts, comentários, edição/moderação)

Rodada **exclusivamente documental**, recorte estreito de M12.1. HEAD de
entrada: `9f5c6713114ee9ef2d77eb98f31e0788053caa7b`. Contrato normativo na
**Seção 7.6** (`\label{sec:regras-posts-comentarios-m12-1}`), reconciliado com
Seções 3/4/5/8/9/11, Q08/Q10/Q11/Q13, RF25 e M7/M9/M11. **M12.1 =
DOCUMENTATION_VALIDATED**; M0–M11 = VALIDATED; M12.2 = NOT_STARTED; M12 =
NOT_STARTED; M13 = NOT_STARTED (entidade unificada `Notificacao`: leitura
multi-role, lida/Limpar tudo, expiração, alvo/deep link com revalidação,
privacidade e dedup V1; compõe M7/M8/M9/M12 e reutiliza a prova M8 de
`ESCASSEZ_ESTOQUE`; fechamento global após M13 é gate, sem M14 automático);
HQs M12.1 = 0. Registro em
[worklog M12.1](worklogs/formal-spec/M12_1_DOCUMENTATION.md).

- **Post/Comentário:** autoria imutável; professor dono cria/edita Post; autor
  edita o próprio Comentário; Chefe intervém só por Q13 (moderação/remoção com
  motivo e auditoria, sem assumir autoria). Ninguém edita conteúdo alheio.
- **Remoção lógica:** `removido_da_apresentacao` + motivo/operador/instante;
  não apaga documento nem histórico (RF25); item some do feed de colegas.
- **Edição/moderação:** `editado`/`editado_em` em Post e Comentário; histórico
  imutável `Historico_Posts_Turma` e `Historico_Comentario` com `tipo`
  (`edicao`/`moderacao`) e `motivo`; moderação não apaga o texto original; a
  edição do autor não desfaz moderação.
- **Leitura/máscara:** leitura direta negada; `listarComentariosPost` autorizado
  revalida vínculo canônico atual e devolve original ao autor, aviso
  institucional a colegas e original+histórico ao professor dono/Chefe; sem
  vazamento em cache/notificação/erro.
- **Q08:** turma arquivada nega toda escrita acadêmica, inclusive moderação e
  para o Chefe, sem exceção administrativa.
- **Fronteira M12.2:** criação/edição de Post com roteiro valida o acesso atual
  e guarda o snapshot `roteiro_anexo`; upload/compartilhamento/URL ficam em
  M12.2 (dependência D-M12.1-01, não bloqueante).
- **Notificações `POST`/`COMENTARIO`:** efeito delimitado idempotente M7, sem
  conteúdo protegido no payload; o clique revalida acesso e a notificação não
  autoriza leitura. UI-12 completa fica fora de M12.1.
- **Limites:** não certifica `functions/src/posts.ts`, frontend, Rules, Auth,
  Storage, índices nem a implementação real. PDF **411 páginas**, exit 0.
- Dívida de implementação: `posts.ts`/Rules reais divergem do alvo (M12.1-F10).

Próxima ação exata: formalização executável **M12.1** (CUE → IR → Alloy →
receipt → Rust → LaTeX → PDF) em rodada separada; depois M12.2, o fechamento
M12 e M13; o fechamento global após M13 é um gate, sem M14 automático.

## Histórico — M11 executável validado (Turma, matrícula e convite)

Cadeia executável aditiva concluída na branch `feat/formal-spec-cue-alloy`.
HEAD de entrada: `01fe84fde32aacee8e8c165f76faba40a5b2b786`. Micro-reconciliação
normativa prévia (`PRE_M11_EXECUTABLE_RECONCILIATION.md`): PRE11-01 capacidade
(edição abaixo da ocupação proibida; `qtd_alunos > capacidade` válido por
exceção nominal), PRE11-02 fronteira Auth, PRE11-03 identidade/histórico de
convite, PRE11-04 idempotência de aceite. **M11 = VALIDATED**; M0–M10 = VALIDATED;
M12.1 = DOCUMENTATION_VALIDATED; M12.2 = NOT_STARTED; M12 = NOT_STARTED (fechamento de composição/regressão M0–M11); HQs M11 abertas = 0.

- **CUE:** `#M11Contrato` (turma, vínculo canônico, espelho, evento, convite,
  pendência HMAC, aceitação); 12 fixtures válidas + 12 inválidas em
  `specification/cue/tests/m11/`.
- **IR v3 aditivo:** `formal_m11_turmas`; hash global
  `2443afeb…4c7d`. Receipts M0–M10 mudaram somente em `spec_ir_sha256`; só o
  MANIFEST e os dois fragmentos M11 são novos.
- **Alloy:** `specification/alloy/operations/turmas_m11.als` — **33 checks UNSAT
  + 17 witnesses SAT** (escopos 4/6/8): código único/reserva permanente,
  arquivamento/desarquivamento, ingresso por vaga, exceção acima da capacidade,
  HQ-M11-001 = A, coerência vínculo–contador–espelho, remoção/reingresso,
  convites e pendência única, idempotência M7 e composição M9.
- **Receipt:** `build/formal-validation-m11.json`
  (`1ba2e7b3…bce5`), validado por `validation_m11.rs` com rejeição de
  adulteração; testes Rust = 29.
- **Determinismo:** duas gerações consecutivas com diff zero; `docs-check`
  PASS.
- **PDF:** `main.pdf` **405 páginas**, exit 0, zero erros/referências
  indefinidas, 30 Overfull herdados; páginas 399–405 inspecionadas.
- **Limites:** não certifica backend `functions/src/turmas.ts`, frontend, Auth,
  e-mail, HMAC concreto, Rules, índices nem concorrência real. Registro em
  [worklog M11 executável](worklogs/formal-spec/M11_EXECUTABLE_VALIDATION.md).

Próxima ação exata: formalização executável M12.1 (CUE → IR → Alloy → receipt
→ Rust → LaTeX → PDF) em rodada separada; depois M12.2 (Roteiros,
compartilhamento, Storage/download e associação a Post) e o fechamento M12.
Cancelamento explícito de convite pendente e transferência de ownership de
Turma permanecem fora das fatias validadas e não entram em M12 por inércia.

## Histórico — M11 documental (Turma, matrícula e convite)

Rodada **exclusivamente documental** na branch `feat/formal-spec-cue-alloy`.
HEAD de entrada: `394b88e7c5f2abd5ca0467915bfcd35276bbc4a8` (árvore limpa,
`origin` sincronizada). Baseline e gate final: `just formal-check` exit `0`
(17 testes Node/guards, `alloy-check` PASS, `docs-check` do gerador, build LaTeX
e stale gate); `documentation/generated/` sem diff. PDF publicado: **397
páginas** (entrada 390), 0 erros, 0 referências indefinidas, 30 Overfull
(herdados). Nenhum artefato `specification/cue/`, Alloy, IR, receipt, validador
Rust, gerador, `frontend/`, `functions/`, `firestore.rules` ou `storage.rules`
foi alterado. Registro durável em
[worklog M11 documental](worklogs/formal-spec/M11_DOCUMENTATION.md).

- **Contrato:** nova subseção normativa **7.5 Turmas, matrícula e convites
  (M11)** (`\ref{sec:regras-turmas-m11}`), reconciliando RN-TUR-01 (Seção 4),
  dicionários/espelhos (Seção 5), UI-10 (Seção 8), fluxos (Seção 9), contrato
  M11 (Seção 10.10) e Rules (Seção 11); matriz e papel do Chefe ajustados na
  Seção 3.
- **Turma:** identidade `Turma/{id}`, dono `id_professor`, `capacidade` inteiro
  positivo, `codigo_turma` único gerado no servidor (`Chaves_Unicas/Turma__…`,
  não liberado ao arquivar), `status` Ativo/Arquivada, `qtd_alunos` e `versao`;
  arquivar/desarquivar preserva ID, membros, posts, histórico e bloqueia
  escritas (Q08). Inclusão/remoção de membro não incrementa `versao`.
- **Matrícula:** `Turma/{id}/Alunos/{uid}` é o vínculo canônico e o espelho
  `Usuarios/{uid}/Turmas/{id}` é só projeção; `qtd_alunos` é a autoridade
  transacional de vaga (o `COUNT` 3FN é a mesma grandeza, não leitura fora da
  transação); remoção decrementa uma vez, nunca abaixo de zero; removido só
  reingressa por convite; retry M7 idempotente e matrícula já existente devolve
  acesso sem duplicar contagem.
- **Capacidade:** ingresso ordinário exige `qtd_alunos < capacidade` no commit;
  só convite nominal do professor dono com `exceder_capacidade` +
  `justificativa_excecao`, revalidado na aceitação, ultrapassa a capacidade;
  código nunca é exceção. Redução abaixo da ocupação: fail-closed na V1 e
  **HQ-M11-001** aberta.
- **Convites:** e-mail normalizado, token CSPRNG guardado só como hash,
  docId determinístico por HMAC, expiração de 7 dias, unicidade transacional de
  pendente por (e-mail, `id_turma`) inclusive a chave global com `NULL`;
  convite global não cria matrícula; aceitação única e idempotente; Auth e
  envio de e-mail são etapas externas pós-commit; criar registro ≠ enviar
  e-mail.
- **HQ-M11-001 — RESOLVED (A):** redução de `capacidade` abaixo de
  `qtd_alunos` é **proibida**; o servidor rejeita, fail-closed, e orienta
  remover membros antes. Sem HQ bloqueante e com três auditorias de
  consistência sem novas falhas, **M11 = DOCUMENTATION_VALIDATED** para a fatia
  documental explicitamente definida; a formalização executável não foi
  iniciada. Fora de M11: formalização completa de Posts/Comentários/Roteiros/
  notificações; cancelamento explícito de convite pendente; formalização
  executável (CUE → IR → Alloy → receipt → Rust → LaTeX → PDF).
- **Dívida de implementação (não homologada):** `functions/src/turmas.ts`
  decide por claims, não aplica receipt M7 nem `Chaves_Unicas` de turma,
  recontagem/`qtd_alunos` divergente, `removido_por`/`modo_ingresso` ausentes,
  espelho com PII, `versao` não incrementada em arquivar; `aceitarConviteAluno`
  não está implementado no backend; Rules reais divergem do alvo (Seção 11).

Próxima ação exata: executar a formalização executável M11 (CUE → IR → Alloy →
receipt → Rust → LaTeX → PDF) em rodada separada, a partir deste contrato
documental.

## Estado corrente pós-M10 executável

M0–M10 = **VALIDATED**; M11+ = **NOT_STARTED**. HEAD de entrada da formalização
executável: `1be21d82fb8fa6f9528425578ddec86565cdb797`, árvore limpa e `origin`
sincronizada. A cadeia CUE → IR → Alloy → receipt → Rust → geração → LaTeX → PDF
de M10 foi concluída: `#M10Contrato` (11 fixtures válidas + 11 inválidas), IR v3
aditivo (`formal_m10_patrimonio`), `patrimony_m10.als` (29 checks UNSAT + 17
witnesses SAT), receipt verificável, validator Rust, guard de drift,
canonicalização `N(s)` e PDF de 389 páginas. Regressão M0–M9 PASS; receipts
antigos mudaram somente em `spec_ir_sha256`. Findings independentes de segurança
Rust (RUST-SAFETY-01..03) resolvidos. A consolidação executável foi commitada em
`03aa2771b7237afb59d22daae6e29198503f8034`. Próxima ação exata: **AVALIAR A
ENTRADA EM M11 — TURMAS / DEMAIS DOMÍNIOS — EM RODADA SEPARADA**. Não iniciar
M11.

Atualizado em 25/09/2026 — M10 executável concluído. Estado corrente:
M0–M10 = VALIDATED; M11+ = NOT_STARTED; nenhuma HQ bloqueante. Registro em
[worklog M10 executável](worklogs/formal-spec/M10_EXECUTABLE_VALIDATION.md).

Reconciliação documental pós-M10 (busca de reagentes): a Seção 5 passa a
descrever a busca em memória sobre o catálogo JSON (Firestore canônico, JSON
projeção autorizada, cache descartável), propõe a depreciação de
`letra_inicial` de Reagentes mantendo o campo/mapping como legado, e define
ordenação, navegação por inicial (A–Z/`#`) e janela de renderização; a Seção 8
trata o seletor nome/CAS/fórmula como UX opcional; a Seção 10.5 alinha o acesso
do Aluno à matriz da Seção 3/M9/Seção 11. M0–M10 permanecem VALIDATED; nenhum
artefato formal (CUE/IR/Alloy/receipt/validator/generated) foi alterado; o
frontend ainda usa a estratégia antiga (dívida de implementação). Registro em
[worklog de reconciliação](worklogs/formal-spec/REAGENT_SEARCH_RECONCILIATION.md).
PDF 390 páginas.

- **M10 — Patrimônio:** `Bem_Patrimonial` é a unidade física e
  `Resumo_Bem_Patrimonial` é o catálogo; nome/local no bem são projeções. A
  plaqueta é `trim().toUpperCase()`, única e não reutilizável após baixa. A
  única máquina V1 é `Ativo -> Inservivel -> Ja_dado_baixa`; conservação é
  independente e baixa é rito M9+M7 próprio, com SEI/PDF binariamente validado,
  histórico e terminalidade. A versão cobre fatos canônicos, não fan-out
  derivado. Locks têm proprietário/tipo/chave, não expiram por idade e não se
  confundem com `Chaves_Unicas`, versão ou receipt M7. A formalização executável
  adicionou CUE/Alloy/receipt/validator/guard/canonicalização e elevou o PDF a
  389 páginas; três auditorias de conteúdo limpas. M10-F01 a F05 e F13 a F17
  foram resolvidos documentalmente; M10-F06 a F12 permanecem divergências de
  implementação/dívida registradas, sem HQ.

## M8 executável (Estoque / Escassez / Notificações)

Branch: `feat/formal-spec-cue-alloy`. HEAD de entrada documental `4e142287`;
a formalização executável parte do M8 documental validado. Foram alterados
`specification/` (CUE/Alloy/fixtures), `tools/formal/check.mjs`,
`tools/spec-doc/` (Rust), `build/` (IR/receipt), `documentation/generated/`,
`documentation/Formal-Spec-M8.tex`, `documentation/main.tex` e `main.pdf`.
`frontend/`, `functions/`, `firestore.rules` e `storage.rules` permanecem
intactos.

- **CUE:** `#M8Configuracao`, `#M8Estoque`, `#M8Cache`, `#M8Notificacao` e união
  `#M8Contrato`; 6 fixtures válidas e 7 inválidas.
- **Alloy:** aptidão única, fronteira estritamente menor da escassez,
  invalidação/publicação do cache por geração e emissão idempotente de
  `ESCASSEZ_ESTOQUE`.
- **Rust:** validator de 40 resultados exatos, testes semânticos (`<` estrito,
  idade `< 30 s`, rate limit 5/min, chave determinística, agregação segregada) e
  testes de adulteração.
- **Determinismo:** duas gerações consecutivas byte a byte idênticas;
  `git diff --exit-code -- documentation/generated/` PASS.
- **PDF:** exit 0, 367 páginas, zero erros, zero referências indefinidas, 32
  Overfull (herdados).
- **Limitações:** a evidência não certifica a implementação Firebase atual nem
  disponibilidade física real; TTL é abstraído com limites em Rust; o backfill
  legado é pré-condição operacional declarada.

## M8 documental (Estoque / Escassez / Notificações)

Branch: `feat/formal-spec-cue-alloy`. HEAD de entrada:
`4e142287536e4cde3077c0b3b72c13185734faed`. Rodada **exclusivamente
documental**: `frontend/`, `functions/`, `specification/`, `tools/`,
`firestore.rules`, `storage.rules`, `build/*.json` e `documentation/generated/`
intactos. Registro durável em
[worklog M8_DOCUMENTATION](worklogs/formal-spec/M8_DOCUMENTATION.md).

- **Estoque atual:** `Frasco_Reagente` é a autoridade; sem view persistente e sem
  encadeamento D→D-1. `Resumo_*_Diario` são FLOW históricos. Agregação protegida
  `navegador → backend → count()/sum() → Frasco_Reagente`. `saldo_aferido_g`/`ml`
  server-owned; desconhecido/ausente/inconsistente é `NULL`, nunca zero; g e mL
  não se somam.
- **Aptidão única:** predicado `frascoAptoParaUso` (localizado, disponível,
  `FECHADO`/`ABERTO`, sem quarentena, validade compatível, sem pendência M5/M6),
  compartilhado por dashboard, retirada e escassez. `qtdAptos` é número de
  frascos.
- **Escassez:** configuração `Almoxarifado/{almox}/Estoques_Configurados/{idResumo_idEspec}`;
  `qtd_limiar_escassez` inteiro não negativo em frascos; efeito
  `qtdAptos < qtd_limiar` (estritamente menor). `ativo` e `notificacao_ativa`
  distintos; `Almoxarifado.ativo=false` não avalia; backfill legado é
  pré-condição operacional ("especificar o job ≠ ativar a cron").
- **Cache:** `Sistema_Cache_Dashboard` lazy, TTL semântico `< 30 s`, escopos
  `ESTOQUE__ALMOX`/`ESTOQUE__ALMOX__RESUMO`, geração/invalidação transacional,
  publicação só se a geração não mudou. Ordem `App Check → Auth → RBAC/escopo →
  rate limit (5/min/UID) → cache/agregação`, inclusive em cache hit. O job de
  escassez **não** usa cache.
- **Notificações:** `ESCASSEZ_ESTOQUE` em `Usuarios/{uid}/Notificacoes`, docId
  determinístico `escassez_{almox}_{config}_{dataCivil}`, data civil
  `America/Sao_Paulo`, destinatários vinculados ao almoxarifado; apenas
  `ALREADY_EXISTS` é no-op e erros diversos propagam; ler/marcar lida é
  server-owned; "Limpar tudo" não é `DELETE`.
- **Findings:** M8-F01..F06 corrigidos documentalmente (query de escassez sem
  `situacao_localizacao`, erro engolido, aptidão sem autoridade única, retirada
  sem localização, ausência de "cache ≠ escassez", `Estoques_Configurados` fora
  das Rules). M8-F07..F10 (`firestore.rules` notificações, backend sem
  job/config/saldo/cache, rótulo "frascos ou ml/g", cache/`count()` não
  implementados) registrados como dívida. Nenhuma HQ. PDF **361 páginas**, zero
  erros.


## M7 documental (Idempotência)

Branch: `feat/formal-spec-cue-alloy`. HEAD de entrada: `f6032a6082bc790d3a8b243970b6355f808f8875`. Rodada **exclusivamente documental**: nenhum arquivo executável ou formal alterado. Registro durável em [worklog M7_DOCUMENTATION](worklogs/formal-spec/M7_DOCUMENTATION.md).

- **Contrato global:** identidade de comando `(uid, tipo_operacao, payload_hash)`; `idOperacao` opaco, obrigatório, criado antes da primeira tentativa e reutilizado em retry (novo id só em nova intenção). Retry devolve o resultado persistido e não reaplica efeitos.
- **Canonicalização única:** `canonicalize` recursivo (objetos ordenados, arrays preservados, `null` ≠ ausente, `undefined` ≡ ausente, sem trim/upper/arredondamento); `hashPayload = SHA-256(tipo_operacao + "\n" + canonicalize(payload))`; `idOperacao` fora do hash.
- **Estados:** comando Firestore atômico grava `CONCLUIDA` na mesma transação; workflow com etapa externa usa `PENDENTE`→`CONCLUIDA`/`FALHOU` com outbox/caminho determinístico; reutilização incompatível → `ALREADY_EXISTS` (fail-closed).
- **Taxonomia distinta:** comando (`Operacoes`), evento (`Eventos_Processados`, ``efeito observado único'', não exactly-once), unicidade (`Chaves_Unicas`), lock (`Locks_Requisicao_Patrimonio`), materialização (recomputação absoluta).
- **Aplicado a:** retirada, devolução, abertura, M5 e as três rotas M6; jobs (chave determinística vs recomputação absoluta); notificações; etiquetas/PDF (`idOperacao` obrigatório). Matriz de 24 casos.
- **Findings:** M7-F01..F09 resolvidos; M7-F10 (`functions/` divergente) registrado como dívida de implementação. Nenhuma HQ. PDF **341 páginas**, zero erros. **M7 = DOCUMENTATION_VALIDATED**; 3 auditorias integrais consecutivas limpas.

## M6 documental (Q06 / tara / metrologia quantitativa)

Branch: `feat/formal-spec-cue-alloy`. Primeira rodada M6: HEAD de entrada `3d6ecc60...`, commits `bbe256a8`, `ad2f10df`, `58446729`. Revisão HQ-M6-001/002: HEAD de entrada `ee97770d...`; HEAD final = commit documental seguinte ao do PDF, resolvido com `git log -1 --format=%H --grep="resolve M6 findings and close M6"`. Rodada **exclusivamente documental**: nenhum arquivo executável ou formal alterado (`frontend/`, `functions/`, `specification/`, `tools/`, Rules, IR, receipts e `documentation/generated/` intactos). Registro durável em [worklog M6_DOCUMENTATION](worklogs/formal-spec/M6_DOCUMENTATION.md).

- **Q06:** tolerância sobre o peso bruto de saída (`peso_saida`); normal max(1 g, 0,005×peso_saida), higroscópico max(2 g, 0,02×peso_saida); anomalia se `peso_retorno > peso_saida + tolerância`. Q06 compara retorno com saída, **nunca com a tara**; limiar fixo de 5 g eliminado.
- **Consumo/evaporação/densidade:** perda bruta = max(0, peso_saida − peso_retorno_efetivo); constraint `0 ≤ peso_perda_evaporacao ≤ perda_bruta` (violação **rejeitada**, sem clamp); `massa_consumida = perda_bruta − evaporação`; volume por `densidade_aplicada` histórica e positiva.
- **Tara:** três situações fechadas (`NULL`, `REFERENCIA_TEORICA`, `MEDIDA_REAL`); tara real só com recipiente vazio pesado. **Esgotamento** por confirmação explícita; tara real divergente preservada + `DISCREPANCIA_TARA_REAL` + recalibração auditável.
- **Retorno abaixo da tara:** tara real → `DEVOLVIDO_COM_ANOMALIA` com pendência, INDISPONIVEL e quarentena; referência teórica → `REFERENCIA_TEORICA_INCONSISTENTE`, sem impossibilidade física.
- **Pendência:** `existePendenciaMetrologicaTx(idFrasco)` = `status = DEVOLVIDO_COM_ANOMALIA` E `consumo_validado = false`; fora desse par, inconsistência de integridade. **Três rotas metrológicas tipadas** (HQ-M6-001); a V1 **não** possui correção administrativa metrológica; resolver não libera quarentena (M5). `massa_perda_estimada_g` permanece estimativa de sinistro.
- **Prevenção (UI-18):** dupla digitação independente do mesmo operador, unidade fixa em g, contexto visual, alertas de plausibilidade e revisão final antes do commit; valores anômalos fisicamente possíveis são preservados, não “corrigidos”.
- **Seção 12:** estudos futuros A (integração direta com a balança) e B (correção metrológica auditável excepcionalíssima).
- **Findings:** M6-F01/F02 resolvidos por HQ-M6-001/HQ-M6-002; M6-F03/F04/F05 corrigidos. PDF **330 páginas**, zero erros. **M6 = DOCUMENTATION_VALIDATED**; naquele checkpoint, a próxima ação era o M7 documental, posteriormente concluído.

## M5 documental (extravio / reencontro / quarentena)

Branch: `feat/formal-spec-cue-alloy`. HEAD de entrada original: `e560416623f55d4f730c2dc238978e7186d69923`. Esta rodada é **exclusivamente documental**: nenhum arquivo executável ou formal foi alterado (`frontend/`, `functions/`, `specification/`, `tools/`, Rules, IR, receipts e `documentation/generated/` intactos). Primeira validação: commits `4647a084`, `8c9ae939`, `5011ce18` e `eb7ad016` (`main.pdf`). Correção pós-auditoria independente (findings M5-F05..F08): HEAD de entrada `83157c663f74d1ef3919cc8ab0b41fc3d60f07d6`; commits `6ce31a36` (domínio de reencontro/terminalidade), `224d2872` (pseudocódigo/UI), `7bdefac4` (casos de regressão) e `1d88970f` (`main.pdf`); HEAD final = commit documental seguinte (`1d88970f` + 1). Registro durável em [worklog M5_DOCUMENTATION](worklogs/formal-spec/M5_DOCUMENTATION.md).

- **Extravio:** permitido de qualquer estado físico em localização `LOCALIZADO`, exceto `DESCARTADO` (terminal); efeito `situacao_localizacao = EXTRAVIADO` + `INDISPONIVEL`, preservando o estado físico e revogando autorização corrente, preservando saldo, `saldo_desconhecido`, peso, tara, validade, `vencido`, `abertura_historica_desconhecida` e localização. Não é consumo, esgotamento nem peso zero.
- **Extravio durante empréstimo:** encerra `ENCERRADO_EXTRAORDINARIO`/`EXTRAVIO_SINISTRO` sem `peso_retorno`, `peso_retorno_efetivo`, consumo validado nem `data_devolucao_efetuada`; `peso_saida` preservado; `massa_perda_estimada_g` só como estimativa com tara conhecida (fronteira M6).
- **Reencontro:** novo fato de localização, só de `situacao_localizacao = EXTRAVIADO`; impõe quarentena compulsória (`em_quarentena = TRUE`, `INDISPONIVEL`), não reabre empréstimo e não recalcula validade (lê `Frasco_Reagente.vencido`). O estado físico constatado é preservado salvo inspeção compatível; o estado constatado (`ABERTO`/`FECHADO`/`VAZIO`/`QUEBRADO`) é validado contra o último estado antes do extravio (trilha histórica): `FECHADO` só se antes era `FECHADO` e sem abertura; `ABERTO` se antes era `ABERTO`/`FECHADO` (marcando abertura desconhecida no último caso); `VAZIO` só se antes era `VAZIO`; `QUEBRADO` é quebra constatada. Transições impossíveis (`ABERTO`/`VAZIO`/`QUEBRADO` → `FECHADO`; `VAZIO`/`QUEBRADO` → `ABERTO`) são rejeitadas. `REENCONTRADO ≠ DISPONIVEL`.
- **Quarentena:** dimensão operacional própria, distinta de `INDISPONIVEL`; bloqueia retirada e descarte direto. Saídas: `VOLTAR_A_DISPONIVEL` (só `ABERTO`/`FECHADO`) e `PENDENTE_DE_DESCARTE` (mais permanência); nenhuma revalida validade; sem `QUARENTENA → DESCARTADO` direto; `VAZIO`/`QUEBRADO` nunca voltam a `DISPONIVEL`.
- **Terminalidade corrigida:** `DESCARTADO` é o único estado terminal; `VAZIO` e `QUEBRADO` são fisicamente não utilizáveis/indisponíveis, normalmente encaminhados para descarte, mas não são terminais.
- Documentação atualizada nas Seções 4, 7, 8 (UI-16), 9 (Fluxos A–D e casos de regressão) e 10.5 (pseudocódigo de extravio/reencontro); PDF **316 páginas**, zero erros. Findings M5-F01..F08 corrigidos; HQs M5 abertas = 0. **M5 = DOCUMENTATION_VALIDATED**; a formalização executável (CUE/Alloy/Rust) está pendente e é objeto desta etapa pré-M8. Naquele checkpoint, a próxima ação era o M6 documental — posteriormente concluído; estado corrente: **M6 = DOCUMENTATION_VALIDATED, M7 = DOCUMENTATION_VALIDATED**.

## Reconciliação pré-M5 (erratum de M3/M4)

Branch: `feat/formal-spec-cue-alloy`. HEAD de entrada: `e8c36660b4b5eddb76b15797d058898657f8dfd3`. Commits desta rodada: `3213c48a` (CUE), `21355c9f` (Alloy), `86ebe7c1` (documentação normativa), `3a5dcc79` (evidência/geração) e `f23adc81` (`main.pdf`). O HEAD final é o commit documental **imediatamente posterior ao do PDF** (`f23adc81` + 1), registrado por este arquivo e resolvido com `git log -1 --format=%H --grep="record pre-M5 reconciliation"` (um commit não contém o próprio SHA). Registro durável em [worklog PRE_M5_RECONCILIATION](worklogs/formal-spec/PRE_M5_RECONCILIATION.md); errata anexados a [M3_VALIDATION](worklogs/formal-spec/M3_VALIDATION.md) e [M4_VALIDATION](worklogs/formal-spec/M4_VALIDATION.md) sem reescrever o histórico.

O que foi **especificado/validado**:

- `Emprestimo_Reagente` ganhou o snapshot imutável `vencido_na_retirada` (Seção 4/5; CUE com **34 colunas**; IR v3; fixtures M3 = 28; total 101). Todos os gates CUE/Alloy/Rust/geração/LaTeX reexecutados; PDF 313 páginas, zero erros.
- A devolução usa o vencimento persistido `Frasco_Reagente.vencido` (autoridade do job da Seção 10.7) e **não** recalcula pelo relógio; classifica o retorno em venceu-durante / já-vencido / validade-desconhecida / normal. `Devolucao.vencidoNoRetorno` foi removido do Alloy; M4 = **40 checks UNSAT + 20 witnesses SAT**. Guard `doc_contract.test.mjs` protege os contratos documentais.
- Seção 12: V2 registra a edição de Resumo/Especificação e as três modalidades de correção de validade (`DESCONHECIDA_PARA_CONHECIDA`, `DATA_INCORRETA_PARA_DATA_CORRETA`, `CONHECIDA_PARA_DESCONHECIDA`), sem implementar.
- Seções 10.5/11: catálogo JSON de Resumo/Especificação para pesquisa client-side; estado server-owned `Sistema_Catalogo_Reagentes/estado` separando `versao_fonte`/`versao_publicada`; geração/publicação por Cloud Function; `obterCatalogoReagentes()`; sincronização client-side; fallback canônico `resolverCatalogoPorIds`; erro de integridade referencial; JSON nunca é autoridade operacional; sem `catalogo_version` em `Usuario`; formato canônico por objetos indexados por ID.

O que continua **pendente de implementação real**: catálogo JSON e suas Cloud Functions; edição V2 e correções de validade; e a lógica legada de devolução/reencontro em `functions/src/reagentes.ts`, que ainda recalcula vencimento pelo relógio e não é homologada. Nenhuma alteração em `frontend/`, `functions/`, `firestore.rules` ou `storage.rules`. Estado corrente: M5 = DOCUMENTATION_VALIDATED e M6 = DOCUMENTATION_VALIDATED; naquele checkpoint pré-M5, M6 ainda estava NOT_STARTED. M7 = DOCUMENTATION_VALIDATED.

---

# Histórico anterior

Atualizado em 21/09/2026 — consolidação documental HQ-M2-004..007, realinhamento formal local M2.1d e relações globais Alloy M2.2 (com erratum de cobertura de descarte).
Branch: `feat/formal-spec-cue-alloy`.
HEAD inicial da consolidação: `25e3825f5045a328e59f17115f2dbbda0710fb26`.
HEAD de entrada do realinhamento M2.1d: `69726049708398eacb2018534e88c49633f53d06`.
HEAD do fechamento M2.1d (local e remoto): `f27a797289dfa28ec4f3b445feb5599900cd4410`.

A consolidação foi registrada em **15 commits, um por arquivo**, de `5c625870` a `b5d3f099`. O PDF compilado foi commitado por último, em `b5d3f099` (`docs(pdf): publish compiled M2 reconciliation`). Não houve push, deploy ou alteração da aplicação nesta sequência.

Após esses commits, o usuário solicitou a atualização de `M2_HUMAN_QUESTIONS.md` e deste status. Essas duas revisões Markdown ficaram na árvore de trabalho sem commit até serem versionadas em `69726049708398eacb2018534e88c49633f53d06` (`docs(status): update STATUS_ATUAL and M2_HUMAN_QUESTIONS with consolidated decisions and revisions`), que é a HEAD de entrada do realinhamento M2.1d.

O realinhamento formal local **M2.1d** realinhou `specification/cue/` às 29 colunas documentais de `Frasco_Reagente`, introduziu `origem_tara` e suas invariantes locais de proveniência de tara. Detalhes, paridade e gates em `worklogs/formal-spec/M2_1D_CUE_REALIGNMENT.md`.

As relações globais Alloy **M2.2** foram concluídas e VALIDATED, após erratum de cobertura de descarte, frame-condition audit e terminal-state audit: `bottle_identity.als` (identidade química efetiva) e `bottle_state.als` (coerência de estado, transições documentadas e terminalidade de `DESCARTADO`), com 30 `check` UNSAT e 14 testemunhas SAT. O erratum corrigiu a elegibilidade de `descartarFrasco`, que estava restrita a `VAZIO`/`QUEBRADO`; a documentação também permite descarte de frasco vencido com `uso_vencido_autorizado=false`, inclusive `ABERTO`/`FECHADO`, nunca emprestado. A auditoria de frames fixou `vencido`/`usoVencidoAutorizado`: PRESERVED em extraviar/descartar; não-interferência em frascos ≠ f para quebrar (UNSPECIFIED no alvo) e confirmarEsgotamento (OUT_OF_ABSTRACTION, decidido pela devolução). O terminal-state audit bloqueou qualquer transição a partir de `DESCARTADO` (Seção 4/8/9), sem tornar `VAZIO`/`QUEBRADO`/`EXTRAVIADO` terminais. M2.2 foi posteriormente reconciliado por HQ-M2-008/B (quarentena → pendência técnica → descarte). Detalhes em [worklog M2.2](worklogs/formal-spec/M2_2_ALLOY_RELATIONS.md).

Os três commits de M2.1d (`fd6d3bc1`, `c6bad174`, `f27a7972`) foram inicialmente apenas locais. Em verificação posterior, `origin/feat/formal-spec-cue-alloy` passou a apontar para `f27a797289dfa28ec4f3b445feb5599900cd4410`, publicando-os. O Git permite afirmar apenas que a remota mudou; o push ocorreu fora da execução M2.1d e não foi executado por ela.

Nesta unidade, por solicitação explícita do usuário, foi executado push de `feat/formal-spec-cue-alloy`. Foram publicados os commits pendentes anteriores (`0f0505e0`, `dd46a446`), os commits M2.2 (`a3bf7303`, `aeeb712c`, `ae176154`, `7eb40930`) e o commit documental que registra este push. A SHA final da remota não é antecipada aqui porque o commit que contém este texto ainda não possui SHA no momento da redação.

O erratum de cobertura de descarte partiu de `f5384abc48a63be79b72db2d7be1489d41e03f0e` (commit `10366096`). A auditoria de frame conditions partiu de `dcee5ff4f1a8385672bc1280e058596afe338905` (commit `cc8e1ad0`). O terminal-state audit partiu de `5d70bede3d6027ed3c043d4c5115e59ef827eecf` (commit `1b4adabb`), no recorte então vigente. Nenhuma alteração de backend, CUE, `withdrawal.als`, `bottle_identity.als`, IR, generated, Rules ou `.tex` naquelas unidades.

M2.3 partiu de `4b057ac1d9bd6b83bdc0ecf3dff44eacb0a15fc1`. Migrou a proveniência executável para formato estruturado (`baseline_historico_m0_m1` = `db29ea2f`; `baseline_documental_m2` = `9df335bc`) e promoveu o IR a v3 (projeção `frasco_reagente_m2`, 29 campos, SQL e limites). O `build/formal-validation.json` M0 mudou somente em `spec_ir_sha256`; `model_sha256` e resultados M0 permanecem idênticos.

A reconciliação final pré-M2.4 partiu de `991dbdc3dce5ee5e28c5a4b167992225a204d71d`, após a auditoria independente. Aplicou **HQ-M2-008/B** (quarentena não vai direto a descarte; exige `PENDENTE_DE_DESCARTE`, que gera autorização operacional estruturada) e **HQ-M2-009/A** (resolução metrológica tipada, sem resolvedor genérico). Reconciliou `.tex` das Seções 4, 5, 7, 8, 9, 10.4, 10.5, 10.8 e 11; reabriu e revalidou o Alloy M2.2 (agora 35 `check` UNSAT e 16 testemunhas SAT somando identidade e estado, com quarentena → pendência técnica → descarte) e revalidou M2.3. M2.1d permanece com 29 colunas e `build/spec-ir.json` inalterado. HQs M2 OPEN = 0. Backend real continua dívida de M4/M5/M6/M9/M10. Detalhes em `worklogs/formal-spec/PRE_M2_4_RECONCILIATION.md`.

## Escopo efetivamente executado

A reconciliação inicial foi limitada aos arquivos .tex, PDF compilado e arquivos de status. A sequência de commits também versionou o documento de decisões fornecido pelo usuário, sem modificar seu conteúdo. Posteriormente, o usuário autorizou explicitamente atualizar M2_HUMAN_QUESTIONS.md. Código de frontend/backend, firestore.rules, CUE/Alloy, fixtures, generated e demais worklogs históricos permaneceram intactos. Os pseudocódigos e Rules no PDF são especificação, não implementação implantada.

## Decisões consolidadas

- **HQ-M2-004 — RESOLVED:** FECHADO com conteúdo nominal NULL é permitido; tara/origem NULL e saldo desconhecido. Abertura/pesagem bruta não tornam o saldo conhecido. Sem tara real, segue o ciclo de JA_ABERTO em situação equivalente, incluindo quebra/descarte/extravio; não fabricar tara nem quantidade. EXTRAVIADO preserva a flag; estados terminais seguem a semântica preexistente.
- **HQ-M2-005 — RESOLVED:** limiar fixo de 5 g eliminado; Q06 mantém max(1 g, 0,005 × saída) ou max(2 g, 0,02 × saída) para higroscópicos. Retorno abaixo da tara é registrado sem falsificação, encerrando custódia e bloqueando reutilização enquanto pendente. Origem teórica/real é explícita.
- **HQ-M2-006 — RESOLVED:** resumos de reagentes/almoxarifado exclusivamente FLOW, sem posição diária, dependência D-1 ou replay até hoje. Correções fechadas reprocessam somente datas diretamente afetadas. Patrimônio preservado.
- **HQ-M2-007 — RESOLVED:** pesagem ordinária aceita observação opcional; descrição automática identificada como sistema não exige justificativa humana de 20 caracteres. Operações especiais mantêm seus contratos.

M2_HUMAN_QUESTIONS.md foi atualizado por solicitação explícita do usuário: HQ-M2-004..007 estão RESOLVED, com respostas completas; HQ-M2-002 foi reconciliada com a possibilidade de FECHADO com saldo desconhecido. Todas as sete perguntas do arquivo estão resolvidas. Referências OPEN nos demais registros anteriores são históricas e estão superadas; não representam decisões humanas pendentes.

## Arquitetura documental resultante

Frasco_Reagente é a autoridade atual; backend protegido executa count()/sum() sobre seu estado corrente e saldos derivados server-owned (saldo_aferido_g/ml). Historico_Frasco_Reagente/Emprestimo_Reagente preservam fatos FLOW e alimentam Resumo_Almoxarifado_Diario/Resumo_Reagente_Diario por dia civil America/Sao_Paulo, em intervalo semiaberto. Não existe view persistente de estoque atual.

Sistema_Cache_Dashboard é cache efêmero lazy. Chaves: ESTOQUE__ALMOX e ESTOQUE__ALMOX__RESUMO com IDs codificados deterministicamente, escopo/filtros normalizados. Campos: escopo, resultado, calculado_em, versao_calculo, geracao, valido. TTL máximo 30 segundos, contado conservadoramente do início do cálculo; invalidação pode antecipar expiração. Sem scheduler periódico, recálculo apenas no próximo acesso. Publicação verifica geração para impedir que cálculo iniciado antes de mutação recoloque cache obsoleto.

Auth, App Check, RBAC/escopo e limite atômico de 5 solicitações/minuto/UID precedem cache e agregações, inclusive em cache hit. Coleção de cache e Sistema_Rate_Limit_Dashboard negam leitura/escrita cliente na especificação de Rules. Frontend mantém cache curto, horário do cálculo e ação Atualizar. TTL deletion não controla a validade semântica.

Invalidam no menor escopo seguro: cadastro, abertura, retirada, devoluções normal/anômala, resolução que muda estado corrente, esgotamento, pesagem/evaporação/ajuste/recalibração com efeito atual, quebra, descarte, extravio/reencontro, quarentena e decisões de validade/descarte. Origem/destino são invalidados em transferência/associação somente se houver contrato suportado. Mutação e invalidação são transacionais; nenhuma exige recálculo imediato. Correções exclusivamente históricas e reprocessamento FLOW não invalidam estoque atual.

## Campos removidos dos resumos

De **Resumo_Almoxarifado_Diario**, STOCK:

- qtd_frascos_fechados_no_fim_do_dia
- qtd_frascos_abertos_no_fim_do_dia
- qtd_frascos_emprestados_no_fim_do_dia
- qtd_frascos_saldo_desconhecido
- volume_total_disponivel_aferido_ml
- massa_total_disponivel_aferida_g

Também removido volume_total_usado_nos_frascos_devolvidos_durante_o_dia por redundância/ambiguidade de consumo, não por ser STOCK.

De **Resumo_Reagente_Diario**, STOCK:

- qtd_frascos_fechados_disponiveis
- qtd_frascos_abertos_disponiveis
- qtd_frascos_em_uso
- qtd_frascos_saldo_desconhecido
- qtd_frascos_vazios
- volume_total_disponivel_aferido_ml
- massa_total_disponivel_aferida_g

## Devolução e resolução metrológica

peso_retorno original e instante são preservados; peso_atual registra a observação. origem_tara distingue REFERENCIA_TEORICA, MEDIDA_REAL e NULL. DEVOLVIDO_COM_ANOMALIA encerra custódia. Sem vazio confirmado e com inconsistência, quarentena/INDISPONIVEL impede nova retirada; saldo_desconhecido=true e saldos derivados NULL. Tara teórica inconsistente não é tratada como limite físico real.

consumo_validado=false mantém medida_utilizada/peso_retorno_efetivo NULL; consumo/evaporação não são somados definitivamente. Resolução por nova pesagem preserva leitura original e registra AJUSTE vinculado, autoria/instante e medição efetiva. Confirmação posterior de vazio aplica VAZIO/INDISPONIVEL e saldo zero; tara real divergente anterior não é sobrescrita. Sua substituição usa recalibrarTaraFrascoEsgotado, somente com recipiente vazio, justificativa humana e auditoria. Liberação de quarentena mantém seu contrato próprio e não contorna pendência.

A resolução quantitativa fica vinculada por id_resolucao_metrologica; data FLOW continua a do retorno físico. Reprocessar somente datas afetadas. Se houve movimentação física posterior, uma nova pesagem atual não prova a medição histórica; não inventar evidência nem replay. Correções administrativas permanecem em conjunto fechado.

## Arquivos alterados e motivos

| Arquivo | Motivo |
|---|---|
| Section-4-Modelagem-Entidades-SQL-3FN.tex | Cadastro/metrologia, origem_tara e campos mínimos de consumo validado/resolução; preservação da medição. |
| Section-5-Notas-de-Mapeamento-para-Firestore.tex | Dicionários FLOW, saldo corrente, origem, fatos históricos e coleções internas. |
| Section-6-Materialized-Views.tex | Remoção de STOCK diário e campo legado; arquitetura de estoque atual/cache/proteção/invalidação. |
| Section-7-Requisitos-e-Regras-de-Negocio.tex | Regras e tabela de obrigatoriedade reconciliadas; decisões HQ004..007 resolvidas. |
| Section-8-Descricao-das-telas-Dashboards.tex | Estado atual separado do período FLOW; cadastro NULL, UI de anomalia e pesagem opcional. |
| Section-9-Exemplos-de-fluxos.tex | Exemplo de devolução física com anomalia e preservação de peso. |
| Section-10-Subsection-5-Fluxo-de-Reagentes.tex | Pseudocódigos de cadastro/devolução/recalibração/liberação e contratos fechados de resolução. |
| Section-10-Subsection-7-Jobs-Agendados.tex | Produtor FLOW-only, intervalo semiaberto, correções somente nas datas afetadas. |
| Section-10-Subsection-9-Relatorios-em-PDF.tex | Remoção da leitura de STOCK diário; exclusão de consumo pendente; janela semiaberta. |
| Section-10-Subsection-11-Funcoes-Academicas-e-Pesagem.tex | Observação opcional, autoria automática, derivação de saldo/invalidação. |
| Section-11-Regras-de-Seguranca-do-Firestore-Security-Rules.tex | Rules documentais deny-all para cache/limite internos. |
| main.pdf | PDF recompilado e inspecionado. |
| ../FORMAL_SPEC_STATE.md | Estado formal, decisões resolvidas e próximos passos sem iniciar M2.2. |
| STATUS_ATUAL.md | Este relatório, HEAD verificada, sequência de commits e revisões posteriores. |
| worklogs/formal-spec/M2_HUMAN_QUESTIONS.md | Revisão posterior aos 15 commits: HQ004..007 resolvidas e HQ002 reconciliada; versionada em 69726049. |
| worklogs/formal-spec/Consolidação das decisões humanas M2 e simplificação da arquitetura de estoque.md | Documento de entrada versionado em commit próprio, sem alteração de conteúdo; posteriormente arquivado em `archive/formal-spec/`. |

Os arquivos Section-10-Subsection-* ficam em documentation/Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/; os demais .tex e main.pdf ficam em documentation/.

## Validações da consolidação publicada

| Comando/verificação | Resultado |
|---|---|
| just docs-build (TeX Live Nix, workflow do guia COMPILACAO_NIX_LCQUI.md) | PASS final, exit 0, 275 páginas, zero erros/referências indefinidas. |
| latexmk sobre checkout documental temporário da HEAD inicial | PASS, exit 0, 267 páginas; baseline de diagramação. |
| Comparação dos logs finais | 28 avisos Overfull em ambos, mesmas larguras. Os três avisos novos da edição foram corrigidos. |
| Inspeção visual com Poppler | Modelo p.29, almoxarifado p.95, reagente p.99, cache pp.103–105, anomalia pp.208–210 e Rules p.267 conferidos. Trechos novos legíveis; overflow preexistente na seção de uploads da p.267 permanece registrado. |
| just spec-check | PASS, 64 fixtures existentes (M0 7, M1 35, M2 22). |
| just spec-export | PASS, exportação do recorte formal existente. |
| just alloy-check | PASS, regressão do modelo existente M0; não é prova M2.2. |
| git diff --check | PASS. |
| Diff de functions/frontend/specification/Rules executáveis/generated | Vazio. |
| Busca global nas fontes .tex | Sem limiar fixo, exigência universal nominal FECHADO ou rejeição por retorno abaixo da tara; STOCK removido dos dois schemas/dicionários/PDF. Snapshots patrimoniais/químicos, prazos civis e objetos QuerySnapshot foram classificados como não afetados. |
| Testes de aplicação | Não aplicáveis: nenhuma alteração de código executável. |

A primeira tentativa de build falhou por linguagem JavaScript não definida em Listings; corrigida para TypeScript já suportada. Primeira execução de spec-check foi bloqueada pelo sandbox (spawnSync cue EPERM); reexecução escalonada autorizada passou, assim como export/Alloy. Não são falhas remanescentes.

As revisões Markdown posteriores não exigem recompilação do PDF nem nova execução dos gates formais. Nesta atualização foi executado git diff --check; os resultados de build e gates acima permanecem evidências da consolidação publicada, não novas execuções.

Logs locais: /tmp/m2-docs-build.log, build/latex/main.log e /tmp/m2-baseline-build.log. O PDF publicado foi copiado de build/latex/main.pdf somente após aprovação do log final e inspeção visual, conforme o guia.

## Formal e pendências concretas

**M4 foi VALIDATED.** `specification/alloy/reagents/withdrawal_return.als`
compõe Frasco (M2.4) e Emprestimo (M3) no mesmo universo: a retirada cria
exatamente um empréstimo ativo (`EM_USO`) com o frasco `EMPRESTADO`, e a
devolução sempre encerra a custódia (normal/atraso/anomalia), com vazio, destinos
de vencido e anomalia tratados por precedência. São 27 checks UNSAT e 16
witnesses SAT (scopes 4/6), com guard de drift das origens em
`tools/formal/withdrawal_return.mjs`. A evidência está em
`build/formal-validation-m4.json`, validada por `validation_m4.rs`; o fragmento
`invariants/retirada_devolucao_m4.tex` e `Formal-Spec-M4.tex` foram integrados ao
PDF (306 páginas). O CUE/IR não mudaram. A Seção 10.5 foi corrigida
mecanicamente: os destinos QUARENTENA e PENDENTE_DE_DESCARTE gravam
`disponibilidade = INDISPONIVEL`. HQs M4 abertas = 0. No checkpoint histórico
descrito neste parágrafo, M5 ainda estava NOT_STARTED; estado corrente:
M5 = DOCUMENTATION_VALIDATED, M6 = DOCUMENTATION_VALIDATED, M7 = DOCUMENTATION_VALIDATED. Detalhes
em [worklog M4](worklogs/formal-spec/M4_VALIDATION.md).

**M3 foi VALIDATED**, com erratum pós-validação. A Seção 5 foi reconciliada (5
campos canônicos que o próprio dicionário descrevia estavam ausentes e foram
inseridos; 33 nomes iguais aos da Seção 4). O CUE ganhou
`emprestimoReagenteCampos`/`#EmprestimoReagente` (33 colunas); a paridade
Seção 4 × CUE é automatizada em `check.mjs`. O Alloy `loan_state.als` formaliza
o ciclo de vida do empréstimo (11 checks UNSAT + 11 witnesses SAT em scopes
4/6). O IR v3 acrescenta a projeção `emprestimo_reagente` e
`baseline_documental_m3`; `validation_m3.rs` valida a evidência; os fragmentos
M3 e `Formal-Spec-M3.tex` foram integrados ao PDF (302 páginas). O erratum
corrigiu a anomalia: `DEVOLVIDO_COM_ANOMALIA` é fato histórico e a pendência
quantitativa é `consumo_validado = false`; a resolução pode gravar os valores
mantendo o status. As grandezas de massa/volume passaram a exigir `>= 0` (zero
válido), tanto em M3 (`medida_utilizada`, `peso_saida`, `peso_retorno`,
`peso_retorno_efetivo`, `peso_perda_evaporacao`, `massa_perda_estimada_g`) quanto
em M2 (`conteudo_nominal`, `peso_no_cadastrado`, `peso_atual`,
`peso_frasco_vazio`, `medida_usada`), sem reabrir o milestone M2. M3
ficou com 25 fixtures (10 válidas, 15 inválidas) e M2 ganhou a negativa
`invalid/peso_negativo`. Receipts M0/M2/M2.4 mudaram
apenas em `spec_ir_sha256`; o modelo Alloy M3 não mudou. HQs M3 OPEN = 0. M4
(Retirada/devolução completas) = VALIDATED (ver a seção de reconciliação pré-M5
acima; o texto abaixo é histórico). Detalhes em
[worklog M3](worklogs/formal-spec/M3_VALIDATION.md). O backend real
(`functions/src/reagentes.ts`) diverge da especificação vigente e é dívida de
M4/M5/M6/M9/M10.

**M2.2, M2.3 e M2.4 foram VALIDATED.** O CUE M2.1d permanece o recorte local de 29 colunas com `origem_tara`. O Alloy M2.2 acrescenta `bottle_identity.als` (identidade química efetiva: XOR de rotas e resolução única) e `bottle_state.als` (saldo terminal, flag histórica, transições extravio/quebra/descarte/esgotamento, frames auditados de vencido/usoVencido, `emQuarentena`, autorização técnica de descarte e terminalidade de `DESCARTADO`), reconciliados por HQ-M2-008/B, totalizando 35 `check` UNSAT e 16 testemunhas SAT somando identidade e estado; HQs M2 OPEN = 0. `withdrawal.als` (M0) permanece intacto. M2.3 migrou a cadeia: IR v3 transporta a projeção `frasco_reagente_m2` (29 colunas) ao lado da fatia M0; o Rust valida a evidência M2.2 (`build/formal-validation-m2.json`) e os hashes dos modelos; o gerador emite `entities/frasco_reagente_m2.tex` e `invariants/frasco_reagente_m2.tex`, com `formal_validation_m2_sha256` no `MANIFEST.json`. M2.4 criou `Formal-Spec-M2.tex`, integrou a seção M2 ao `main.tex`, concluiu a composição M0 × M2.2 em `bottle_composition.als` e gerou a evidência `build/formal-validation-m24.json` (12+5 checks UNSAT, 10+1 witnesses SAT). Fragmentos M0/M1 byte a byte idênticos; geração determinística. Detalhes nos [worklogs M2.2](worklogs/formal-spec/M2_2_ALLOY_RELATIONS.md), [M2.3](worklogs/formal-spec/M2_3_PROVENANCE_IR_GENERATION.md) e [M2.4](worklogs/formal-spec/M2_4_COMPOSITION_INTEGRATION.md). Backend, cache, Q06, tara numérica, validade e FLOW continuam fora do escopo provado. Contagem de fixtures naquele checkpoint (M0/M1/M2/M3): 7/35/31/25 = 98; após o erratum pré-M5, 7/35/31/28 = 101.

Backend atual ainda tem contratos legados (ex.: cadastro fechado exige volumeNominal e devolução rejeita ganho acima de 102%); cache/endpoint e resolução precisam de implementação futura. Esta rodada não altera nem homologa esse código. Não há novas perguntas humanas sobre decisões já resolvidas.

## Histórico anterior — evidência preservada, não status da rodada atual

Snapshot de 13/09/2026. Branch: `docs/realinhamento-especificacao-lcqui`.

## Plano e decisões

21 itens enumerados: 6 P1, 6 P2 e 9 P3; 20 aplicados à documentação e 1 cancelado (P3-04, DP-B01). O total anterior 20/19 era erro aritmético. Nenhum item foi removido para acomodar a contagem.
As 10 decisões DP-A01–DP-D02 estão resolvidas em `DUVIDAS_PENDENTES_LCQUI.md`; não há decisão de domínio bloqueando execução. Os 20 itens executáveis foram APLICADO_DOCUMENTACAO nas rodadas A–D; código não é atestado por isso.

## Implementação e riscos

RF01–RF25 e RN-ROLE-01–15 permanecem parciais; documentação não comprova código ou homologação. AUD-35/36: hardening de baixa prioridade, pois deny-all já protege as coleções internas. AUD-37: exclusividade já validada fora de transação, sem garantia concorrente; correção pendente. AUD-27: caminho patrimonial divergente, migração ainda não preparada nem executada.
DP-D01 mantém verificação seletiva de ativo; mutações sem requerAtivo=true podem confiar em token ainda válido até renovação. Claims antigas em conta ainda ativa também exigem consideração explícita. DP-D02 mantém retenção indefinida V1 como política conservadora LCQUI/UENF sujeita à futura política arquivística/LGPD institucional.

## Execução e validação

Fase 0 e rodadas A–D concluídas em commits separados. Validação final aprovada: 172 páginas, exit 0, zero erros/referências indefinidas; 19 avisos tipográficos Overfull remanescentes; código e preparação de migração ainda pendentes. Builds isolados aprovados, todos exit 0, zero erros e referências indefinidas:

| Build | Páginas |
|---|---|
| Inicial | 164 |
| A | 166 |
| B | 167 |
| C | 171 |
| D | 173 |

Nenhum teste funcional executado nesta sessão até esta etapa. Nenhum deploy, merge ou migração remota.

## Histórico de marcos

- 11/09/2026: contratos UI, fluxos, dicionário e RN-ROLE consolidados. Build histórico de 164 páginas; resultado não reutilizado como validação atual.
- 13/09/2026: resolução formal das 10 DPs e inclusão de P2-05/P2-06 no plano.
- 20/09/2026: Auditoria 8 (Especificação Consolidada V5) aplicada integralmente à documentação LaTeX e validador formal M0 (CUE + Alloy + Rust) atualizado para contemplar o status INDISPONIVEL de frascos.
- 20/09/2026: Auditoria 9 (Ciclo de vida de reagentes e frascos) aplicada aos enums NoSQL, 3FN e código Typescript, não exigindo modificação nos artefatos de infraestrutura M0 e M1. Validação M0 e M1 verificada sem regressões.

Inspeção visual: páginas 61 (snapshot), 143 (TCR), 145 (Q06) e 169 (Rules) do PDF final legíveis, sem cortes de conteúdo nas amostras. Build final /tmp/lcqui-tex-final; PDF atualizado somente após aprovação.
