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
