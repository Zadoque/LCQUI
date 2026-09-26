# Fechamento global da especificação formal (M0–M13)

Resultado do gate: **PASS**.

Registro único de encerramento do escopo declarado M0–M13. Não cria novo
milestone. Escopo: coerência entre artefatos, reprodutibilidade na mesma revisão
e correspondência entre alegações de cobertura e evidência. Não prova requisitos
nunca incluídos nas fatias aprovadas.

## 1. Entrada e revisões verificadas

- Branch: `feat/formal-spec-cue-alloy` (única).
- `ENTRY_HEAD` da rodada de correção: `88b821c25e1477f0e7ee8251a8fc5a0c65c9e678`
  (árvore limpa, `origin` sincronizada).
- Baseline do gate: `just formal-check` **exit 0** em `88b821c2`.
- Revisão de evidência verificada: **`9c01d58a`** ("fix(m13): complete academic
  types, real authorization bridge and V1 reconciliation"); `just formal-check`
  **exit 0** nessa revisão (35 testes Rust, 44 Node, `alloy-check` PASS,
  `docs-check` PASS, stale gate PASS, `git diff --check` PASS).
- O commit de encerramento é **exclusivamente documental**:
  `git diff --name-only 9c01d58a..HEAD` contém apenas arquivos `*.md`
  (`GLOBAL_FORMAL_CLOSURE.md`, `FORMAL_SPEC_STATE.md`, `STATUS_ATUAL.md`). Nenhuma
  entrada de pipeline (CUE, IR, Alloy, receipt, Rust, gerador, LaTeX) mudou, logo
  o gate acima permanece o gate da revisão de evidência.
- HEAD final e `origin` reportados ao fim da rodada (push normal).

## 2. Matriz compacta de fechamento

Legenda de contagem: `checks/witnesses` UNSAT/SAT no receipt.

| Fatia | Fonte normativa vigente | CUE/IR | Modelo/checks/witnesses | Receipt/Rust | Fragmento/capítulo | Cobertura e limites | Gate |
|---|---|---|---|---|---|---|---|
| M0 | Seção 4 (Frasco, filtro físico) | `#Frasco` / `frasco_reagente` | `withdrawal.als` 2/2 | `formal-validation.json`, `validation.rs` | `invariants/retirar_frasco.tex`; `Formal-Spec-M0.tex` | filtro físico; não é autorização de retirada | PASS |
| M1 | Seções 4/5 (Resumo/Especificação) | descritores / `resumo_reagente`, `especificacao_reagente` | (sem Alloy) | IR/gerador | `entities/*.tex`; `Formal-Spec-M1.tex` | catálogo estrutural; sem prova relacional global | PASS |
| M2 | Seções 4/5/7 (Frasco completo) | `frascoCompletoCampos` / `frasco_reagente_m2` | `bottle_identity.als`+`bottle_state.als` 44/22; `bottle_composition.als` 21/13 | `m2.json`, `m24.json`; `validation_m2/m24.rs` | `frasco_reagente_m2*.tex`; `Formal-Spec-M2.tex` | identidade, estado e composição; não empréstimo | PASS |
| M3 | Seção 4 (`Emprestimo_Reagente`) | `emprestimoReagenteCampos` / `emprestimo_reagente` | `loan_state.als` 11/11 | `m3.json`; `validation_m3.rs` | `emprestimo_reagente.tex`; `Formal-Spec-M3.tex` | ciclo de status; Q06/tara fora | PASS |
| M4 | Seções 4/5/7 (retirada/devolução) | reusa CUE/IR M3 | `withdrawal_return.als` 40/20 | `m4.json`; `validation_m4.rs` | `retirada_devolucao_m4.tex`; `Formal-Spec-M4.tex` | retirada/devolução compostas; Q06 numérico em M6 | PASS |
| M5 | Seção 7 (extravio/reencontro/quarentena) | `#M5` / `formal_m5_operacao` | `loss_found_quarantine_m5.als` 12/4 | `m5.json`; `validation_m5.rs` | `formal_m5.tex`; `Formal-Spec-M5.tex` | transições M5; metrologia fora | PASS |
| M6 | Seção 7 (Q06/tara/metrologia) | `#M6` / `formal_m6_metrologia` | `metrology_resolution_m6.als` 7/5 | `m6.json`; `validation_m6.rs` | `formal_m6.tex`; `Formal-Spec-M6.tex` | relações abstratas; ponto flutuante em Rust | PASS |
| M7 | Seção 7 (idempotência) | `#M7` / `formal_m7_operacao` | `idempotency_m7.als` 6/4 | `m7.json`; `validation_m7.rs` | `formal_m7.tex`; `Formal-Spec-M7.tex` | identidade/retry/dedup; não exactly-once | PASS |
| M8 | Seção 7 (estoque/escassez) | `#M8` / `formal_m8_contrato` | `stock_cache_scarcity_m8.als` 25/15 | `m8.json`; `validation_m8.rs` | `formal_m8.tex`; `Formal-Spec-M8.tex` | aptidão/escassez/cache; não implementação | PASS |
| M9 | Seção 7 (autorização) | `#M9` / `formal_m9_autorizacao` | `authorization_m9.als` 13/9 | `m9.json`; `validation_m9.rs` | `formal_m9.tex`; `Formal-Spec-M9.tex` | decisão abstrata; não Firebase/UI | PASS |
| M10 | Seção 7 (patrimônio) | `#M10` / `formal_m10_patrimonio` | `patrimony_m10.als` 29/17 | `m10.json`; `validation_m10.rs` | `formal_m10.tex`; `Formal-Spec-M10.tex` | identidade/máquina/versão/locks; M7/M9 | PASS |
| M11 | Seção 7 (turmas/matrícula/convite) | `#M11` / `formal_m11_turmas` | `turmas_m11.als` 33/17 | `m11.json`; `validation_m11.rs` | `formal_m11.tex`; `Formal-Spec-M11.tex` | turma/vínculo/contador/convite; e-mail/HMAC fora | PASS |
| M12.1 | Seção 7.6 | `#M12_1` / `formal_m12_1_posts` | `posts_m12_1.als` 40/17 | `m12-1.json`; `validation_m12_1.rs` | `formal_m12_1.tex`; `Formal-Spec-M12-1.tex` | posts/comentários/moderação; ACL de Roteiro em M12.2 | PASS |
| M12.2 | Seção 7.7 | `#M12_2` / `formal_m12_2_roteiros` | `roteiros_m12_2.als` 52/27 | `m12-2.json`; `validation_m12_2.rs` | `formal_m12_2.tex`; `Formal-Spec-M12-2.tex` | Roteiros/URL/compartilhamento; Storage real fora | PASS |
| M12 | Seções 7.6/7.7 | `#M12_1`+`#M12_2` | `composition_m12.als` 37/18; origens M12.1/M12.2 | `m12.json`; `validation_m12.rs` | `formal_m12.tex`; `Formal-Spec-M12.tex` | composição M12.1×M12.2; ponte de geração | PASS |
| M13 | Seção 7.8 | `#M13` / `formal_m13_notificacoes` | `notificacoes_m13.als` 35/26; 6 origens | `m13.json`; `validation_m13.rs` | `formal_m13.tex`; `Formal-Spec-M13.tex` | notificação unificada; rotas reproduzem M12; lote abstrato | PASS |

Todos os receipts M0–M13 estão ligados ao `spec_ir_sha256` atual
(`9f2bf7226eddabd9731a4b14302b78e71667d007466bffbc8f455c27a36fd579`) e aos
`model_sha256` reais; o MANIFEST vincula IR, receipts e fragmentos.

## 3. Verificações de escopo (item 6.1)

- **Regra substituída ainda vigente?** Não. A nota antiga de `id_turma` da Seção 4
  foi reconciliada (M13-REC-01) e a generalização “somente seis tipos” da Seção
  7.8 foi substituída pela tabela de obrigações V1 (M13-CORR-03). A projeção
  Firestore da Seção 5 inclui `geracao` no snapshot (M13-REC-02).
- **Requisito obrigatório virou opcional por não ter sido modelado?** Não. As
  emissões obrigatórias fora da prova M13 (requisições de patrimônio, atraso,
  arquivamento/desarquivamento, autoatendimento) permanecem obrigatórias na V1 e
  estão marcadas como fronteira não provada, não como dispensa.
- **Prova atribuída ao milestone errado?** Não. M13 reusa M7/M8/M12 por origens
  com hash e reproduz a autorização de `composition_m12.als`; os capítulos
  declaram que as provas isoladas não são reabertas.
- **“VALIDATED” como certificação de backend?** Não. Todos os capítulos e estados
  delimitam explicitamente que a evidência não certifica `functions/`,
  `frontend/`, Rules, Auth, Storage nem serviços reais.
- **Lacuna interna escondida como dívida de implementação?** Não. As lacunas
  internas (tipos sem fonte decisória de emissão; paginação real) estão
  declaradas como lacuna/limite, não convertidas em prova.

## 4. Compatibilidade entre fatias (item 6.2)

Auditoria das interfaces efetivamente compartilhadas, com os guardas/testes
existentes:

| Interface | Produtor → consumidor | Evidência de compatibilidade |
|---|---|---|
| Identidade/estado do frasco | M0 → M2.2/M2.4/M3/M4 | `composition.test.mjs`, `validation_m24` |
| Vencimento/snapshot | M2 → M4/M5/M6 | `withdrawal_return.mjs`, `m8_origins.test.mjs` |
| Dimensões de extravio/quarentena | M5 → M8 | `m8_origins.test.mjs` |
| Identidade/retry M7 | M7 → M8/M10/M11/M12.1/M12.2/M13 | `m*_contract.test.mjs`; receipts com origem M7 |
| Estoque/escassez M8 | M8 → M13 (`ESCASSEZ_ESTOQUE`) | receipt M13 registra `stock_cache_scarcity_m8.als` |
| Papéis/versões/vínculos M9/M11 | M9/M11 → M10/M12.1/M12.2/M13 | `m9_contract.test.mjs`, `m11_contract.test.mjs`, `m13_composition.mjs` |
| Participação canônica/autoria | M11/M12.1 → M12/M13 | `m12_composition.mjs`, `m13_composition.mjs` |
| Publicabilidade/geração/ACL/URL | M12.2 → M12/M13 | `m12_composition.mjs`, `m13_composition.mjs` |
| Destinatário/payload/clique/dedup | M13 | `m13_contract.test.mjs`, `validation_m13` |

A auditoria encontrou **uma lacuna concreta** nesta rodada: a rota acadêmica de
M13 não exigia papel acadêmico (M13-CORR-02), corrigida com reprodução verificável
da autorização de `composition_m12.als` e novo guard. Não foram identificadas
outras lacunas que exigissem novas provas; os guardas existentes cobrem as demais
interfaces.

## 5. Reprodução e regressão global (item 6.3)

- `just formal-check` **exit 0** na revisão de evidência `9c01d58a`:
  `cargo fmt --check`; `cargo test --locked` (35 testes); `cargo clippy
  --all-targets -- -D warnings`; 44 testes Node (guards); `alloy-check` PASS com o
  solver real de todas as fatias previstas pelo runner; `docs-check` PASS; stale
  gate PASS; `git diff --check` PASS.
- **Regressão M0–M12:** nesta rodada `spec_ir_sha256` e **todos** os receipts
  M0–M12 permaneceram byte a byte inalterados; nenhum `model_sha256`, resultado
  ou origem antiga mudou. Somente o receipt M13, o modelo M13 e seus consumidores
  mudaram.
- **Determinismo:** duas gerações consecutivas do gerador produziram
  `documentation/generated/` byte a byte idêntico.
- **PDF:** `documentation/main.pdf` com **458 páginas**, exit 0, zero erros e zero
  referências indefinidas, **31 Overfull** (idêntico ao baseline `88b821c2`); as
  páginas 451–458 (capítulo M13) foram renderizadas e inspecionadas visualmente.
- **Ligação de artefatos:** IR ↔ modelos ↔ origens ↔ receipts ↔ validadores ↔
  MANIFEST ↔ fragmentos verificada pelo `docs-check` do gerador e pelos testes de
  adulteração Rust/Node.

## 6. Achados resolvidos nesta rodada

- **M13-CORR-01** (contexto acadêmico incompleto): corrigido; guard
  `checkM13AcademicTypes` cobre os seis tipos em CUE, Alloy, Seção 7.8 e capítulo,
  com teste de omissão.
- **M13-CORR-02** (ponte de autorização fraca/circular): corrigido; contraexemplo
  original (`run ContraexemploChefeLegado` = SAT em `88b821c2`) eliminado; rotas
  reproduzem `composition_m12.als` com guard e origens no receipt/Rust.
- **M13-CORR-03** (generalização de emissão V1): corrigido; tabela dos 20 tipos no
  worklog M13 e Seção 7.8 reconciliada.

## 7. Limites aceitos

A evidência é *bounded* (`for 4`/`for 5`) e abstrata: não certifica Firebase,
Firestore/Storage Rules, Auth, backend `functions/`, `frontend/`, Storage real,
bytes, relógio de produção, paginação/concorrência real nem entrega externa. A
paginação de ``Limpar tudo'' é um lote abstrato com corte estável. Dívidas de
implementação permanecem registradas nos worklogs por fatia e não bloqueiam o
fechamento formal, por não contradizerem a norma nem a evidência.

## 8. Resultado

**PASS.** Matriz de rastreabilidade coerente, regressão M0–M12 preservada,
determinismo confirmado, PDF válido, guardas e validadores exercitados na
revisão `9c01d58a`. Nenhum bloqueio. Nenhum novo milestone criado.
