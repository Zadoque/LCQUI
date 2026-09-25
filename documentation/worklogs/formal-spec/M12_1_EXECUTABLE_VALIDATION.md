# M12.1 — Posts, comentários e moderação (formalização executável)

Estado: **VALIDATED**. Cadeia aditiva concluída: CUE → IR v3 → Alloy → receipt
verificável → validação Rust → geração determinística → LaTeX → PDF. Não altera
`functions/`, `frontend/`, Firestore/Storage Rules, Auth, Storage, índices nem
inicia M12.2/M13.

## 1. Entrada e fontes

- Branch: `feat/formal-spec-cue-alloy` (única).
- HEAD de entrada: `5810dba119adbe973e54e9f5beb1c72b1159dc16`, árvore limpa e
  `origin` sincronizada. HEAD de saída = commit documental seguinte.
- Fonte normativa: Seção 7.6
  (`\label{sec:regras-posts-comentarios-m12-1}`), reconciliada com Seções 3–5 e
  8–11, RF19/RF20, UI-11, Q08/Q10/Q11/Q13/Q10, RF25 e M7/M9/M11.
- Baseline: `just formal-check` exit `0` antes das alterações (29 testes Rust,
  24 Node, Alloy, gerador e PDF de 411 páginas).
- Planejamento: `M13 = NOT_STARTED` reservado na tabela e nos ponteiros
  correntes (Notificação unificada; compõe M7/M8/M9/M12; reutiliza a prova M8 de
  `ESCASSEZ_ESTOQUE`; fechamento global após M13 é gate, sem M14 automático).

## 2. CUE

`specification/cue/domain/formal_m12_1.cue` define `#M12_1Contrato` como união
fechada de `#M12_1TurmaContexto`, `#M12_1Vinculo`, `#M12_1RoteiroAnexo`,
`#M12_1Post`, `#M12_1Comentario`, `#M12_1HistoricoPost`,
`#M12_1HistoricoComentario`, `#M12_1ComentarioLeitura`,
`#M12_1NotificacaoEfeito` e `#M12_1Operacao`. Enums fechados de status de turma,
tipo de histórico (`edicao`/`moderacao`), visão (`AUTOR`/`COLEGA`/`AUDITOR`),
tipo de notificação e tipo/status de operação. Condicionais: `motivo_remocao`,
`removido_por` e `removido_em` exigidos sse `removido_da_apresentacao`;
`editado_em` exigido sse `editado`; `motivo_moderacao`/`moderado_por`/
`moderado_em` sse `moderado`; histórico de edição exige texto antigo/novo e
histórico de moderação exige motivo; projeção de leitura impede que `COLEGA`
receba o original de comentário moderado; notificação nunca transporta conteúdo
protegido. Limites: título 1--150, descrição 1--10\,000, texto 1--2\,000, nome
de arquivo 1--150 e tamanho positivo.

Fixtures: **20 válidas** e **15 inválidas** em `specification/cue/tests/m12_1/`
(`cue vet -c ./domain … -d '#M12_1Contrato'`), cobrindo limites, nulabilidade,
campos condicionais, autoria, post removido, moderação sem motivo, histórico de
edição versus moderação, anexo opcional e projeção pública sem original.

## 3. IR e versionamento

IR permanece na versão **3**; a fatia aditiva `formal_m12_1_posts` foi
acrescida em `specification/cue/docs/projection.cue` com `#CamposM12_1` e
exemplo estrutural. O hash global do IR passou de
`2443afeb…4c7d` para `b3a134a1e2f04cc9726c64a0e7a50310e8ee21c162fbbac0256dcabff846cb95`.
Receipts M0–M11 foram regenerados e mudaram **somente** em `spec_ir_sha256`
(0 divergências fora desse campo). Fragmentos M0–M11 permanecem byte a byte
idênticos; só o MANIFEST e os dois fragmentos M12.1 são novos.

## 4. Alloy

Modelo: `specification/alloy/operations/posts_m12_1.als`, com frames granulares
e pré/pós. Universo: autores, Turma, Post, Comentário, históricos, leitura,
notificação, roteiro, vínculo canônico, enums fechados e `Estado` temporal com
autorização M9 e recibo M7 abstratos.

- **Checks:** 34 UNSAT.
- **Witnesses:** 13 SAT.
- **Escopos:** `for 6` (transições) e `for 4` (cenários mínimos); bitwidth
  inteiro padrão do Alloy 6.2.0.
- **Cobertura:** criação/edição/remoção de Post apenas em turma Ativo e pelo
  professor dono; criação/edição/moderação de Comentário em Ativo; turma
  Arquivada nega toda escrita acadêmica (inclusive Chefe); Chefe não cria Post
  nem edita conteúdo; autoria imutável; terceiro não edita; comentar exige
  vínculo canônico atual; leitura exige vínculo/autoria/ownership/chefia e
  inativo não lê; edição e moderação criam evento histórico imutável; remoção
  lógica preserva documento e histórico e jamais remove histórico anterior;
  edição posterior não desfaz moderação; máscara (colega não vê original, autor
  e auditor veem); notificação só do alvo; publicação com roteiro exige
  `acessoRoteiroValidado` e sem acesso não publica; reuso incompatível não herda
  receipt M7; retry não duplica fato; revogação impede commit; transições
  preservam coerência.

Premissas abstratas: o conteúdo textual é opaco (validado em CUE/Rust); a
autorização M9 é a interface abstrata `authOk`; o acesso ao roteiro é o
predicado `acessoRoteiroValidado`, sem ACL/Storage/URL reais. Não se prova
handlers de Rules, transações Firestore sob carga, concorrência real, fan-out
de notificação nem ACL de Roteiros (M12.2).

## 5. Receipt

`build/formal-validation-m12-1.json`: versão 1, Alloy 6.2.0, solver `sat4j`,
modelo `specification/alloy/operations/posts_m12_1.als`, 47 resultados (34
`check` UNSAT + 13 `run` SAT), IDs `M12_1-INV-001..034` e
`M12_1-WIT-035..047`, scopes preservados. Hashes: receipt
`4c353ef3e0522953365089c9f993faa69f5ad19ec439b145d89ee6d16d730b88`, modelo
`948947395152179deb7530c52f98d0ceb799aac63853d329421f27291c243a98`, IR
`b3a134a1…cb95`.

## 6. Rust

`tools/spec-doc/src/validation_m12_1.rs` valida versão, Alloy, solver, caminho
do modelo, `spec_ir_sha256`, `model_sha256`, quantidade exata (47), IDs exatos,
ordem, tipo `check`/`run`, scopes e status. Adulterações rejeitadas nos testes:
hash do IR, hash do modelo, caminho do modelo, resultado removido/adicionado,
ID duplicado, status invertido, scope alterado e troca `check`↔`run` nas duas
direções. Funções de referência determinística (mesmo contrato
RUST-SAFETY-01, `#[cfg(test)]`): `titulo_valido`, `descricao_valida`,
`texto_valido`, `edicao_permitida` e `deve_mascarar`. `main.rs` acrescenta
`m12_1_exemplo_valido`, que exige do exemplo do IR os limites de Q10, visão
fechada e ausência de conteúdo protegido. Testes Rust: **31** no total (29
históricos + 2 M12.1). `#![forbid(dead_code)]`, `#![forbid(unsafe_code)]` e
`#![deny(warnings)]` preservados; nenhum `#[allow(...)]`.

## 7. Guard de drift

`tools/formal/m12_1_contract.test.mjs` (6 testes) compara enums de histórico e
visão, nomes canônicos, predicados/assertions centrais e as regras
determinísticas entre documentação, CUE, Alloy e Rust. Incluído automaticamente
por `node --test tools/formal/*.test.mjs` (30 testes Node no total).

## 8. Gerador, MANIFEST e determinismo

`render.rs` (`render_m12_1`) emite `entities/formal_m12_1_posts.tex` e
`invariants/formal_m12_1.tex`; `main.rs` vincula `formal_validation_m12_1_sha256`
ao `MANIFEST.json`. Duas gerações consecutivas: **diff zero**. `docs-check`
PASS.

## 9. LaTeX, PDF e inspeção

`documentation/Formal-Spec-M12-1.tex` é incluído em `main.tex` após M11. O
capítulo cobre CUE, autoria/participação/turma arquivada, edição/remoção
lógica/históricos, moderação/máscara, fronteira M12.2, notificação, composição
M7/M9 e limites. `main.pdf` tem **418 páginas** (baseline 411), exit `0`, zero
erros e zero referências indefinidas; Overfull **31** (perfil herdado).
Inspeção visual das páginas novas 412–418 (título, seções, fragmento de entidade
e lista de 47 resultados) sem corte ou sobreposição.

## 10. Regressão M0–M11

CUE antigo, Alloy antigo, validators, guards e fragmentos antigos PASS. Modelos
e resultados históricos inalterados; receipts M0–M11 mudaram somente em
`spec_ir_sha256`. 31 testes Rust, 30 Node e Alloy de todos os milestones PASS.

## 11. Gates e auditorias

Gates finais: `git diff --check` = 0; `cargo fmt --check` = 0;
`cargo test --locked` = 0 (31 testes); `cargo clippy --all-targets -- -D
warnings` = 0; `just formal-check` = 0. Determinismo de geração: diff zero.

Três auditorias por conteúdo:

1. **Auditoria A — CUE × Seção 7.6 × fixtures:** limites, condicionais e máscara
   reconciliados; 20+15 fixtures com paridade. **Limpa**.
2. **Auditoria B — Alloy × receipt × Rust × gerado × MANIFEST:** conjunto exato
   de 47 resultados, IDs/escopos e adulteração; regressão M0–M11 restrita a
   `spec_ir_sha256`. **Limpa**.
3. **Auditoria C — fronteira e limites:** ACL de Roteiros e caixa de
   notificações declaradas fora (M12.2/M13); inspeção visual das páginas
   412–418; ausência de M12.2/M13. **Limpa**.

HQs M12.1 abertas: **0**.

## 12. Limites explícitos

Esta evidência não certifica `functions/src/posts.ts`, o frontend,
`firestore.rules`, `storage.rules`, Firebase, Auth, Storage, Admin SDK, App
Check, transações reais, índices, a ACL de Roteiros (M12.2) nem a caixa de
notificações (M13). A prova é do modelo formal declarado.

## 13. Estado final e próxima ação

M0–M11 = **VALIDATED**; **M12.1 = VALIDATED** (documental e executável);
M12.2 = **NOT_STARTED**; M12 = **NOT_STARTED** (fechamento de composição e
regressão M0–M11); M13 = **NOT_STARTED**.

Próxima ação permitida:

```text
M12.2 (Roteiros, compartilhamento, Storage/download e associação a Post) em
rodada própria; depois o fechamento de M12 e, por último, M13. O fechamento
global após M13 é um gate, sem M14 automático.
```
