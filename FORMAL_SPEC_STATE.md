# LCQUI — Formal Specification State

## 1. Propósito desta fase
M0 = VALIDATED; M1 = VALIDATED; M2 = VALIDATED; M3 = VALIDATED; M4 = VALIDATED; M5 = VALIDATED; M6 = VALIDATED; M7 = VALIDATED; M8 = VALIDATED; M9 = VALIDATED; M10 = VALIDATED; M11 = VALIDATED (documental e executável; HQ-M11-001 resolvida = A; escopo exato: Turma, matrícula ativa, vínculo canônico/espelho e convite de ingresso — Posts, Comentários, Roteiros e notificações acadêmicas **não** estão cobertos por M11); M12.1 = VALIDATED (documental e executável; Posts, Comentários, edição/moderação e históricos; CUE → IR v3 aditivo → Alloy → receipt → Rust → LaTeX → PDF; fonte normativa na Seção 7.6); M12.2 = NOT_STARTED (Roteiros, compartilhamento, Storage/download e associação a Post); M12 = NOT_STARTED (fechamento de composição M12.1/M12.2 e regressão M0–M11); M13 = NOT_STARTED (entidade unificada `Notificacao` da 3FN: ciclo compartilhado de leitura por destinatário multi-role, marcar lida/Limpar tudo, expiração, alvo/deep link com revalidação, privacidade e deduplicação dos tipos V1; compõe M7/M8/M9/M12 e reutiliza a prova M8 de `ESCASSEZ_ESTOQUE`, sem refazer M8 nem prometer prova de emissão para cada enum). O fechamento global após M13 é um gate, sem criar M14 automaticamente. HEAD de entrada da rodada executável M11: `01fe84fde32aacee8e8c165f76faba40a5b2b786`; HEAD de entrada da rodada documental M12.1: `9f5c6713114ee9ef2d77eb98f31e0788053caa7b`. HEAD de entrada da formalização executável M10: `1be21d82fb8fa6f9528425578ddec86565cdb797` (árvore limpa, `origin` sincronizada). A cadeia CUE → IR → Alloy → receipt → Rust → geração → LaTeX → PDF foi concluída: `#M10Contrato` com 11 fixtures válidas e 11 inválidas, IR v3 aditivo (`formal_m10_patrimonio`), `patrimony_m10.als` com 29 checks UNSAT e 17 witnesses SAT, receipt verificável, validator Rust, guard de drift, canonicalização `N(s)`, fragmentos determinísticos e PDF de 389 páginas (390 após a reconciliação documental da busca de reagentes). M0–M9 sem regressão (receipts antigos mudaram somente em `spec_ir_sha256`); a implementação real permanece fora da evidência. A consolidação executável foi commitada em `03aa2771b7237afb59d22daae6e29198503f8034`; a reconciliação documental pós-M10 da busca de reagentes (M0–M10 inalterados, PDF 390 páginas) está em `documentation/worklogs/formal-spec/REAGENT_SEARCH_RECONCILIATION.md`. A rodada documental M11 (Turma, matrícula ativa, vínculo Aluno--Turma e convite de ingresso) foi conduzida sem alterar CUE/IR/Alloy/receipts/validadores Rust/gerador/frontend/functions/Rules: contrato nas Seções 3--11, exemplos de fluxo e PDF de 397 páginas, registrado em `documentation/worklogs/formal-spec/M11_DOCUMENTATION.md`. A HQ-M11-001 (redução de capacidade abaixo da ocupação) foi decidida pela **Opção A** (proibida; servidor rejeita fail-closed) e a fatia não possui HQ bloqueante. Com três auditorias de consistência sem novas falhas, **M11 = DOCUMENTATION_VALIDATED** para a fatia documental explicitamente definida. A formalização executável de M11 foi subsequentemente concluída: CUE `#M11Contrato` (12 fixtures válidas + 12 inválidas), IR v3 aditivo `formal_m11_turmas`, `turmas_m11.als` (33 checks UNSAT + 17 witnesses SAT), receipt verificável `build/formal-validation-m11.json`, `validation_m11.rs` (29 testes Rust no total), guard `m11_contract.test.mjs`, geração determinística e PDF de 405 páginas; **M11 = VALIDATED**. Próxima ação exata: **EXECUTAR M12.2 (ROTEIROS, COMPARTILHAMENTO, STORAGE/DOWNLOAD E ASSOCIAÇÃO A POST) EM RODADA PRÓPRIA; DEPOIS O FECHAMENTO DE M12 (COMPOSIÇÃO/REGRESSÃO M0–M11) E, POR ÚLTIMO, M13 (NOTIFICAÇÃO UNIFICADA)**. O fechamento global após M13 é um gate, sem M14 automático. Os parágrafos abaixo preservam o contexto histórico da fase.

Camada formal ADITIVA CUE + Alloy + Rust → LaTeX. M5, M6, M7, M8, M9 e M10 possuem contratos CUE, IR v3, modelos Alloy, receipts verificáveis, validators Rust, fragmentos gerados e capítulos integrados ao PDF. M0–M11 = VALIDATED; M12.1 = VALIDATED (fonte na Seção 7.6); M12.2/M12/M13 = NOT_STARTED. Próxima ação: M12.2; depois o fechamento M12 e M13; fechamento global após M13 é gate, sem M14. Cancelamento explícito de convite pendente e transferência de ownership de Turma permanecem fora das fatias validadas e não entram em M12 por inércia (não são requisitos V1 efetivos).

## 2. Baseline congelado da Fase 3B
- FUNCTIONAL_SHA = db29ea2f17dc785fb0b44ffb3aec16db29c45e94
- EVIDENCE_HEAD = 9d97ed30b4e7b7805f3d71802816d5d16abc496e
- SEMANTIC_GATE = PASS; FASE 3B = ENCERRADA.
- Auditoria terminou com liberação CUE/Alloy nos worklogs CHECKPOINT.md, VALIDACAO_LATEX.md e LOTE_3B_CONTRACT_CARDS.md em documentation/worklogs/consolidacao-gemini/. Foram lidos e preservados. CHECKPOINT histórico menciona 208 páginas; registro final db29ea2f documenta 211. Não reabrir essa auditoria.
- Regras congeladas: unknown/nonmeasurable/peso ausente != zero; disponibilidade DISPONIVEL|EMPRESTADO significa ausência/presença de empréstimo ativo, não aptidão; conteudo_nominal é original do fabricante; extravio não inventa peso_retorno; reencontro exige quarentena e não reabre empréstimo; Q06=max(0,peso_saida-peso_retorno), tara posterior não reescreve histórico; mesma chave+ator+payload canônico produz mesmo resultado, divergência rejeitada; estoque mínimo Especificação×Almoxarifado, escassez qtd_aptos<limite; timezone America/Sao_Paulo.

## 3. Branch atual
`feat/formal-spec-cue-alloy`. HEAD de entrada M2.0 e baseline documental M2: `9df335bc977bfcf16668bca4baf5f9ed50c2da1a`. HEAD de entrada M2.1d: `69726049708398eacb2018534e88c49633f53d06`. HEAD de entrada M2.2: `dd46a446cc286dc895d638bd28b7c740775a3b60`. HEAD de entrada M2.2 erratum: `f5384abc48a63be79b72db2d7be1489d41e03f0e`. HEAD de entrada M2.2 frame audit: `dcee5ff4f1a8385672bc1280e058596afe338905`. HEAD de entrada M2.3: `4b057ac1d9bd6b83bdc0ecf3dff44eacb0a15fc1`. HEAD de entrada da reconciliação pré-M2.4: `991dbdc3dce5ee5e28c5a4b167992225a204d71d`. HEAD de entrada M3 e baseline documental M3: `158cb91f77b8301274c63e4ee8e384249721a5ba`. HEAD de entrada da reconciliação pré-M5: `e8c36660b4b5eddb76b15797d058898657f8dfd3`; commits da rodada: `3213c48a` (CUE), `21355c9f` (Alloy), `86ebe7c1` (documentação normativa), `3a5dcc79` (evidência/geração) e `f23adc81` (`main.pdf`); HEAD final = commit documental imediatamente posterior ao do PDF (`f23adc81` + 1), resolvido por `git log -1 --format=%H --grep="record pre-M5 reconciliation"`. HEAD de entrada do M5 documental: `e560416623f55d4f730c2dc238978e7186d69923`; commits: `4647a084` (regras), `8c9ae939` (pseudocódigo/UI), `5011ce18` (exemplos) e `eb7ad016` (`main.pdf`); HEAD de saída = commit documental seguinte (`eb7ad016` + 1). Correção pós-auditoria M5 (F05..F08): entrada `83157c663f74d1ef3919cc8ab0b41fc3d60f07d6`; commits `6ce31a36` (reencontro/terminalidade), `224d2872` (pseudocódigo/UI), `7bdefac4` (casos de regressão) e `1d88970f` (`main.pdf`); HEAD final = commit documental seguinte (`1d88970f` + 1). M6 documental: entrada `3d6ecc60d4c830b4793311c77a8349f3d2b23a80`; commits `bbe256a8` (Q06/tara), `ad2f10df` (resolução/UI-17) e `58446729` (`main.pdf`); HEAD de saída = commit documental seguinte (`58446729` + 1). Árvore inicialmente limpa, referência local origin sincronizada. Baseline histórico M0/M1: `db29ea2f17dc785fb0b44ffb3aec16db29c45e94`; fechamento M1: `18d811aee11afc730960daa956af167e638b0ba9`. Não criar branch.

## 4. Estrutura existente preservada
Inventário real efetuado antes da criação da camada formal:
- `frontend/` EXISTE, sem hífen (não há front-end/). UI Next/React/TypeScript com package.json próprio.
- `functions/` EXISTE, backend Firebase/Cloud Functions TypeScript, assets, testes Jest e package.json próprios.
- Raiz: README.md, firebase.json, firestore.rules, storage.rules, .firebaserc, flake.nix/lock preservados. Não existem package.json nem firestore.indexes.json na raiz; não inventar substitutos.
- Documentação original, Sections 1–12, archive, decisões e worklogs 3B preservados. main.tex recebeu somente inputs aditivos M0/M1. main.pdf atualizado após build/inspeção; main.aux/log/toc históricos não sobrescritos.
- .gitignore recebeu apenas tools/spec-doc/target e build/latex. .agents/.codex protegidos.
- Únicas correções de aplicação desde o baseline: d13d25d3 remove prop não consumida em frontend/src/app/reagentes/page.tsx e separa fixtures de functions/src/__tests__/domain/roles.test.ts. Nenhuma lógica de backend modificada. frontend/AGENTS.md e guias Next locais foram lidos antes dessa edição.
- Nesta rodada M1, diff de frontend/functions/configurações/worklogs 3B contra 182447d3 é vazio.

## 5. Divisão de autoridade
- frontend: UI real.
- functions: backend real TypeScript/Firebase.
- Firestore: banco operacional real.
- CUE: estrutura, tipos, enums e nulabilidade da fatia migrada.
- Alloy: relações/invariantes/transição abstrata no scope declarado.
- Rust: transformação determinística, sem backend ou geração de aplicação.
- LaTeX: apresentação, rationale, UX e conteúdo humano.
Para M2, usar as fontes documentais em 9df335bc; o baseline 3B da seção 2 registra a validação histórica, não congela as correções posteriores.

## 6. Ambiente e ferramentas
Confirmados: CUE linguagem v0.17.1 (build devel), Alloy 6.2.0, cargo 1.97.0, rustc 1.97.1, rustfmt, Node v26.8.1, jq, just 1.58.0, latexmk 4.87/TeX Live Nix. Python ausente. Docker não introduzido; flake da aplicação intacto.
Guia seguido: documentation/COMPILACAO_NIX_LCQUI.md.
Ambiente local reutilizável, confirmar caminhos se mudar de máquina:
```sh
export CARGO_HOME=/tmp/lcqui-cargo
export PATH=/nix/store/z4czsax3mdyxx77mwb0yjarnzb1rip00-just-1.58.0/bin:/nix/store/hl0dgwqvnh7ls66xn4hmdxay7alrviy3-texlive-2025-r78234-final-env/bin:$PATH
just formal-check
```
Alternativa: `nix shell nixpkgs#texliveFull nixpkgs#just -c just formal-check`, mantendo CUE/Alloy/Node/Rust disponíveis. Cargo.lock versionado; serde/serde_json/sha2 em /tmp/lcqui-cargo. Em máquina nova, cargo fetch --locked antes de --offline. Gerador 0.2.0; mesmas dependências do M0.
Sandbox: .git somente leitura exige escalonamento; daemon Nix também; Node spawnSync cue retorna EPERM no sandbox, wrapper executado escalonado. Cargo fetch inicialmente falhou por DNS e passou escalonado. Nenhuma rejeição automática pendente. Poppler via Nix usado para inspeção PDF.

### 6.1 Política de segurança do crate Rust (obrigatória)

`tools/spec-doc` é um crate de evidência formal e **não admite** diretivas que
reduzam a segurança ou mascarem problemas. Decisão registrada na formalização de
M10 e válida para todo o crate:

- `main.rs` declara `#![forbid(dead_code)]`, `#![forbid(unsafe_code)]` e
  `#![deny(warnings)]`.
- Nenhum `#[allow(...)]` de lint é permitido em `tools/spec-doc/src`. Problemas
  de código morto são resolvidos na causa, não suprimidos.
- O ponto de entrada de produção (`fn main` e o helper `fn list`) é
  `#[cfg(not(test))]`: sob `--test`, o harness do rustc injeta
  `#[allow(dead_code)]` sobre o `main` do crate, o que conflita com
  `#![forbid(dead_code)]` (E0453). Deixar o harness gerar o próprio entrypoint
  de teste elimina o conflito sem permitir código morto.
- Funções de referência determinística que só são exercidas pela suíte de testes
  permanecem como `#[cfg(test)]` (uso real nos testes; ausentes do binário de
  produção). Toda transformação exigida pelo pipeline de geração permanece em
  produção.
- Campos de schema mantidos por `serde(deny_unknown_fields)` devem ser
  efetivamente lidos/validados; não se mantém campo morto.

Findings independentes de M10: **RUST-SAFETY-01** (11 funções com
`allow(dead_code)` passaram a `#[cfg(test)]`), **RUST-SAFETY-02** (`Campo`
numérico `nao_negativo`/`positivo`/`maximo` passou a ser lido em
`Campo::metadata_ok` chamado por `Ir::valid()`), **RUST-SAFETY-03** (proibição
crate-wide de `unsafe_code` e de código morto via `forbid`, com `main`/`list`
em `cfg(not(test))`). Detalhes em
`documentation/worklogs/formal-spec/M10_EXECUTABLE_VALIDATION.md` (§7).

## 7. Arquitetura formal
- CUE: domain/frasco.cue (três dimensões M0), campos_catalogo.cue, resumo_reagente.cue e especificacao_reagente.cue. Descritores geram constraints e metadados; não há segundo schema documental.
- M1 representa registros normalizados com IDs inteiros e campos obrigatórios mesmo quando nullable (null explícito). Não são payloads de criação nem documentos Firestore.
- #ParCatalogo verifica FK no par e densidade de líquido; não prova existência global/imutabilidade.
- firestore/mapeamentos.cue contém notas de projeção (docIds/FKs string, unidade derivada, composição embutida), não schema Firestore completo.
- docs/projection.cue exporta IR v2 concreto com entidades[] (Frasco, Resumo, Especificação) e exemplos unificados ao domínio.
- Node executa CUE/Alloy e normaliza receipt. Hash do IR completo vincula entradas; Alloy continua verificando somente assertions M0. Verificação de vocabulário seleciona somente frasco_reagente.
- Rust 0.2.0 lê IR v1/v2, valida proveniência e nomes seguros/únicos, gera seis fragmentos .tex e MANIFEST.json. Os dois fragmentos M0 ficaram idênticos.
- main.tex inclui seções humanas Formal-Spec-M0.tex e Formal-Spec-M1.tex. Nenhum TypeScript gerado/substituído.

## 8. Milestones planejados
| Milestone | Escopo | Estado |
|---|---|---|
| M0 | Infraestrutura e fatia vertical | VALIDATED |
| M1 | Resumo_Reagente + Especificacao_Reagente | VALIDATED |
| M2 | Frasco completo (M2.0–M2.4 validados) | VALIDATED |
| M3 | Empréstimo | VALIDATED |
| M4 | Retirada/devolução completas | VALIDATED |
| M5 | Extravio/reencontro/quarentena | VALIDATED |
| M6 | Q06/tara | VALIDATED |
| M7 | Idempotência | VALIDATED |
| M8 | Estoque/escassez/notificações | VALIDATED |
| M9 | Autorização/usuários | VALIDATED |
| M10 | Patrimônio | VALIDATED |
| M11 | Turmas, matrícula e convite | VALIDATED |
| M12.1 | Posts, comentários, edição/moderação e históricos | VALIDATED |
| M12.2 | Roteiros, compartilhamento, Storage/download e associação a Post | NOT_STARTED |
| M12 | Fechamento de composição M12.1/M12.2 e regressão M0–M11 | NOT_STARTED |
| M13 | Notificação unificada (leitura multi-role, lida/Limpar tudo, expiração, alvo, privacidade, dedup V1) | NOT_STARTED |

## 9. Milestone atual
M4 VALIDATED (Retirada/devolução completas, com erratum pré-M5). M3 VALIDATED (com erratum pré-M5); M5 = VALIDATED; M6 = VALIDATED; M7 = VALIDATED; M8 = VALIDATED; M9 = VALIDATED; M10 = VALIDATED; M11 = VALIDATED; M12.1 = VALIDATED; M12.2/M12/M13 = NOT_STARTED. A implementação Firebase continua fora da evidência formal.

- M10 = VALIDATED (documental `ca76f5f2`; executável a partir de `1be21d82`; worklogs `M10_DOCUMENTATION.md` e `M10_EXECUTABLE_VALIDATION.md`): identidade de unidade física separada do resumo catalográfico; plaqueta permanente canônica `trim().toUpperCase()` em lock, requisição e `Chaves_Unicas`; máquina V1 `Ativo -> Inservivel -> Ja_dado_baixa`, sem reversão/salto e sem exclusão física; conservação independente. `versao` inicia em 1 e cobre fatos canônicos, não fan-out derivado. Locks carregam proprietário/tipo/chave e não expiram por idade; unicidade, lock, versão e M7 são mecanismos distintos. Baixa é rito próprio M9+M7 com SEI, PDF binariamente validado, histórico e terminalidade. Histórico normativo é a subcoleção `Historico_Patrimonio`; cadastro, edição e baixa são atômicos. Findings M10-F01..F05 e M10-F13..F17 foram resolvidos documentalmente; M10-F06..F12 registram divergências/dívida de implementação. A formalização executável acrescentou `#M10Contrato` (11 fixtures válidas + 11 inválidas), IR v3 aditivo (`formal_m10_patrimonio`), `patrimony_m10.als` (29 checks UNSAT + 17 witnesses SAT), receipt, validator Rust, guard de drift, canonicalização determinística e PDF de 389 páginas. Findings independentes de segurança Rust (RUST-SAFETY-01..03) resolvidos. Zero HQ e três auditorias limpas. M10 encerrado; sucedido por M11 (VALIDATED, documental e executável).

- M9 = VALIDATED (entrada executável `d105bf8e`): CUE (`#M9Contrato`, 4 fixtures válidas e 6 inválidas), IR v3 aditivo (`formal_m9_autorizacao`), Alloy `authorization_m9.als` (13 checks UNSAT + 9 witnesses SAT, scope 8 com 2 escopos), receipt verificável, validator Rust, guard de drift de papéis, fragmentos e `Formal-Spec-M9.tex` (PDF 375 páginas). `podeExecutar` exige autenticação, usuário ativo, papel persistido, versão corrente, vínculo/escopo ou ownership e recurso não server-owned; `podeCommitar` acrescenta domínio válido. Revogação incrementa versão; claim antiga não restaura autorização; TOCTOU revalida no commit. Nenhuma HQ. Não certifica Firebase, Rules, backend, UI ou infraestrutura. Próxima ação: avaliar M10 em rodada separada.

- M8 = VALIDATED (entrada documental `4e142287`; formalização executável na sequência): contrato de estoque atual, escassez e notificações com CUE (`#M8Contrato`), IR v3 (entidade aditiva `formal_m8_contrato`), Alloy composto (`stock_cache_scarcity_m8.als`: 25 checks UNSAT + 15 witnesses SAT), receipt `build/formal-validation-m8.json`, validator Rust `validation_m8.rs` (40 resultados exatos + testes semânticos de fronteira/agregação + adulteração), fragmentos gerados e `Formal-Spec-M8.tex` integrado ao PDF (367 páginas). Estoque atual é `Frasco_Reagente` (sem view persistente; resumos `*_Diario` são FLOW histórico); agregação protegida `count()/sum()`; saldos `saldo_aferido_g`/`saldo_aferido_ml` server-owned e desconhecido ≠ zero. Predicado único `frascoAptoParaUso` e `qtdAptos` em frascos. Escassez `qtdAptos < qtd_limiar_escassez` (estritamente menor) por configuração `Almoxarifado/{almox}/Estoques_Configurados/{idResumo_idEspec}`; `ativo`/`notificacao_ativa` distintos; backfill legado é pré-condição operacional. Cache `Sistema_Cache_Dashboard` lazy, TTL semântico < 30 s, geração/invalidação transacional, rate limit 5/min/UID antes do cache (inclusive cache hit); job de escassez não usa cache. Notificação `ESCASSEZ_ESTOQUE` idempotente em `America/Sao_Paulo`, destinatários vinculados. Findings M8-F01..F06 corrigidos documentalmente; M8-F07..F10 permanecem dívida de implementação; nenhuma HQ. A evidência não certifica a implementação Firebase atual. Próxima ação: avaliar a entrada em M9 em rodada separada.

- M7 = DOCUMENTATION_VALIDATED (entrada `f6032a60`): contrato global de idempotência. Identidade de comando `(uid, tipo_operacao, payload_hash)`; `idOperacao` opaco obrigatório, criado antes da primeira tentativa e reutilizado em retry; canonicalização determinística `canonicalize` (objetos ordenados recursivamente, arrays preservados, null ≠ ausente, undefined ≡ ausente, sem normalização de domínio) e `hashPayload = SHA-256(tipo_operacao + "\n" + canonicalize(payload))`; estados `PENDENTE/CONCLUIDA/FALHOU` (comando atômico grava direto `CONCLUIDA`); efeitos externos pós-commit/outbox; triggers deduplicados por `eventId` (``efeito observado único'', não exactly-once); jobs por chave determinística (`create`) ou recomputação absoluta; materializações substituem sem dupla soma; etiquetas/PDF com `idOperacao` obrigatório e caminho determinístico; retirada/devolução/abertura, M5 e as três rotas M6 passaram a seguir o contrato. Matriz de 24 casos; 3 auditorias integrais consecutivas limpas. Findings M7-F01..F10 resolvidos (F10 = divergência de implementação registrada); nenhuma HQ; PDF 341 páginas. Formalização executável pendente (dívida futura).

- M6 = DOCUMENTATION_VALIDATED (entrada `3d6ecc60`; revisão HQ-M6-001/002 em `ee97770d`): contrato quantitativo consolidado. Q06 sobre `peso_saida` (normal $\max(1g,0{,}005)$; higroscópico $\max(2g,0{,}02)$; anomalia se retorno $>$ saída $+$ tolerância), nunca contra a tara; limiar de 5\,g eliminado. Vocabulário metrológico com autoridade única (`peso_retorno` imutável, `peso_retorno_efetivo` validado, `peso_atual` corrente, `medida_utilizada`/`consumo_validado` separando pendência de resultado). Consumo $=\Delta_{bruto}-\text{evaporação}$ com $0 \le \text{evaporação} \le \Delta_{bruto}$ (violação rejeitada, sem clamp); densidade histórica. Tara nas três situações; esgotamento por confirmação explícita; retorno abaixo de tara real versus referência teórica; matriz de ganho; `existePendenciaMetrologicaTx` definido no par `DEVOLVIDO_COM_ANOMALIA` + `consumo_validado=false`; **três rotas metrológicas tipadas** (HQ-M6-001: sem correção administrativa metrológica na V1; `corrigirOperacao` só administrativo não metrológico); resolução não libera quarentena; `massa_perda_estimada_g` como estimativa de sinistro; UI-18 (dupla digitação independente, unidade fixa, contexto, alertas, revisão final); estudos futuros na Seção 12. Findings M6-F01..F05 resolvidos/corrigidos; PDF 330 páginas; nenhum arquivo executável/formal alterado. A formalização executável de M6 permanece dívida futura.
- M5 = DOCUMENTATION_VALIDATED (exclusivamente documental, HEAD de entrada `e5604166`): consolidação normativa de extravio, reencontro e quarentena. Extravio permitido de qualquer estado exceto `DESCARTADO`/`EXTRAVIADO`; efeito `EXTRAVIADO`+`INDISPONIVEL` preservando saldo, `saldo_desconhecido`, peso, tara, validade, `vencido`, `abertura_historica_desconhecida` e localização; não é consumo, esgotamento nem peso zero. Extravio durante empréstimo encerra `ENCERRADO_EXTRAORDINARIO`/`EXTRAVIO_SINISTRO` sem `peso_retorno`/`peso_retorno_efetivo`/consumo validado, `medida_utilizada = NULL`, `consumo_validado = FALSE`, `data_devolucao_efetuada = NULL`; `peso_saida` preservado. Reencontro é novo fato, só de `EXTRAVIADO`, impõe quarentena compulsória (`em_quarentena = TRUE`, `INDISPONIVEL`), não reabre empréstimo e não recalcula validade (lê `Frasco_Reagente.vencido`). O estado constatado (`ABERTO`/`FECHADO`/`VAZIO`/`QUEBRADO`) é validado contra o último estado antes do extravio (trilha histórica). `VAZIO`/`QUEBRADO` não são terminais e nunca voltam a `DISPONIVEL`. Saídas da quarentena: `VOLTAR_A_DISPONIVEL` (só `ABERTO`/`FECHADO`) e `PENDENTE_DE_DESCARTE`; nenhuma revalida validade. Findings M5-F01..F08 corrigidos; HQs M5 abertas = 0. A formalização executável de M5 (CUE/Alloy/Rust/IR/receipt) permanece como **dívida futura**.

- Reconciliação pré-M5 (entrada `e8c36660`): `Emprestimo_Reagente` ganhou o snapshot imutável `vencido_na_retirada` (Seção 4/5, CUE, fixtures, IR, Rust; 34 colunas). A devolução passou a usar o vencimento persistido `Frasco_Reagente.vencido` (autoridade do job), sem recálculo pelo relógio, e classifica o retorno em venceu-durante / já-vencido / validade-desconhecida / normal. `Devolucao.vencidoNoRetorno` foi removido do Alloy; `Estado` ganhou `validadeDesconhecida` e `vencidoNaRetirada`; `retirar` grava o snapshot a partir do vencido resultante da abertura; `precisaDestino` condiciona o destino. M4 agora **40 checks UNSAT + 20 witnesses SAT = 60 resultados** (scope 4: 35 checks + 19 runs; scope 6: 5 checks + 1 run). `validation_m4.rs` valida 60 resultados; `withdrawal_return.mjs` guarda o contrato (inclui rejeição de `vencidoNoRetorno`); `doc_contract.test.mjs` guarda os contratos documentais de devolução e catálogo. Fixtures M3 = 28; total 101. PDF 313 páginas, zero erros. A Seção 12 registra as features V2 (edição de Resumo/Especificação e três correções de validade). A Seção 10.5/11 documentam o catálogo JSON, seu versionamento server-owned (`versao_fonte`/`versao_publicada`), geração/publicação, download autorizado e fallback canônico; nada disso está implementado. HQs M3/M4 abertas = 0.
- M4 = VALIDATED (histórico pré-erratum): `specification/alloy/reagents/withdrawal_return.als` compõe Frasco (M2.4) e Emprestimo (M3) no mesmo universo. `coerenteM4 = coerenteM2 + coerenteM3 + disponibilidade EMPRESTADO <=> ativo + cláusula física de M0`; `ATIVOS = EM_USO + ATRASADO` derivado do status (sem flag). 27 checks UNSAT + 16 witnesses SAT (scope 4 e 6). CUE/IR daquela unidade inalterados; `build/formal-validation-m4.json` com hashes do modelo e das origens; Rust `validation_m4` rejeitando adulteração; guard de drift `withdrawal_return.mjs`; fragmento `invariants/retirada_devolucao_m4.tex` e `Formal-Spec-M4.tex` integrados; PDF 306 páginas. Correção documental mecânica na Seção 10.5 (QUARENTENA/PENDENTE_DE_DESCARTE gravam INDISPONIVEL). Modelos M0–M3 e receipts antigos inalterados. (Superado pelo erratum pré-M5 acima.)

M3 VALIDATED (Emprestimo_Reagente), após erratum pós-validação. M2 VALIDATED. Registro em `documentation/worklogs/formal-spec/M3_VALIDATION.md`, incluindo a seção "Erratum pós-validação M3".

- M3 erratum concluído:
  - removida a implicação incorreta de pendência eterna para `DEVOLVIDO_COM_ANOMALIA`; a pendência passou a ser `status = DEVOLVIDO_COM_ANOMALIA AND consumo_validado = false`;
  - anomalia resolvida agora é representável (`consumo_validado = true` exige `medida_utilizada`, `peso_retorno_efetivo` e `id_resolucao_metrologica` não nulos), mantendo `peso_retorno` e `anomalia_metrologica`;
  - grandezas de massa/volume passaram a garantir `>= 0` (zero válido) via metadado `nao_negativo`, sem alterar `densidade_aplicada` (`> 0`): em M3 `medida_utilizada`, `peso_saida`, `peso_retorno`, `peso_retorno_efetivo`, `peso_perda_evaporacao`, `massa_perda_estimada_g`; em M2 `conteudo_nominal`, `peso_no_cadastrado`, `peso_atual`, `peso_frasco_vazio`, `medida_usada` (sem reabrir o milestone M2);
  - fixtures de regressão adicionadas: pendência aberta e resolvida, zero e negativa, bundles resolvidos incompletos; M3 agora 25 fixtures (10/15);
  - `STATUS_ATUAL.md` reconciliado (M2.4 integrado, composição concluída, contagem corrente 7/35/31/25 = 98).
  - Alloy M3, M0/M2/M2.4 e modelos standalone permanecem inalterados; receipts antigos mudaram apenas em `spec_ir_sha256`.

- M3 = VALIDATED (original): Seção 5 reconciliada (5 campos canônicos omitidos do dicionário foram inseridos; 33 nomes = Seção 4). CUE `emprestimoReagenteCampos`/`#EmprestimoReagente` com 33 colunas, enums, nulabilidade, NUMERIC(10,3)/(10,5), VARCHAR(100), densidade condicional (líquido > 0, sólido null), bundle de anomalia e bundle de encerramento extraordinário; 21 fixtures M3 (8 válidas, 13 inválidas) no fechamento original; paridade Seção 4 × CUE automatizada em `check.mjs`. Alloy `loan_state.als`: ATIVOS = EM_USO + ATRASADO, encerrados não reabrem, unicidade ativa por frasco, atraso só de EM_USO, frame de status; 11 checks UNSAT + 11 runs SAT (scope 4/6). IR v3 acrescenta a projeção `emprestimo_reagente` (33 colunas) e `baseline_documental_m3 = 158cb91f`; Rust `validation_m3` valida 22 resultados e rejeita adulteração; gerador emite `entities/emprestimo_reagente.tex` e `invariants/emprestimo_reagente.tex`; `Formal-Spec-M3.tex` integrado ao `main.tex`; PDF 302 páginas, zero erros. HQs M3 abertas = 0. Receipts antigos mudaram apenas em `spec_ir_sha256`. Backend real continua dívida de M4/M5/M6/M9/M10 (divergências registradas no worklog).

M2 VALIDATED: M2.0 VALIDATED; M2.1 VALIDATED; M2.1a VALIDATED; M2.1b DOCUMENTATION_VALIDATED; M2.1c VALIDATED; M2.1d VALIDATED; M2.2 VALIDATED; M2.3 VALIDATED; M2.4 VALIDATED.

Estado formal explícito após M2.4:
- M0 formal = VALIDATED; M0 erratum textual = corrigido (`Formal-Spec-M0.tex`: extraviado indisponível e fisicamente inapto). CUE/Alloy/Rust/IR M0 intactos.
- M1 = VALIDATED, não afetado; nenhum schema/generated/contrato M1 tocado.
- M2.0 = validação histórica; M2.1 = validação histórica; M2.1a = validação histórica.
- M2.1b = documentação reconciliada historicamente; decisões HQ004..007 foram atualizadas na rodada documental atual.
- M2.1c = CUE M2 realinhado à documentação M2.1b (VALIDATED); 28 colunas e implicação de abertura histórica.
- M2.1d = CUE M2 realinhado à documentação pós-HQ-M2-004..007 (VALIDATED); 29 colunas com `origem_tara` e três invariantes locais de proveniência de tara.
- M2.2 = VALIDATED (Alloy): `bottle_identity.als` (identidade/XOR, 5 assertions, 5 testemunhas) e `bottle_state.als` (saldo terminal, flag histórica, transições extravio/quebra/descarte/esgotamento, `emQuarentena`, autorização técnica de descarte, frames de validade/quarentena e terminalidade de `DESCARTADO`; 30 assertions, 11 testemunhas). Nenhuma HQ nova. Pesos, tara, validade calculada, empréstimo e refill deliberadamente fora de escopo.
- M2.2 erratum: a marcação inicial de VALIDATED foi temporariamente reaberta para IN_PROGRESS porque `descartar` estava submodelado (aceitava apenas VAZIO/QUEBRADO). A documentação também permite descarte de frasco vencido com `uso_vencido_autorizado=false`, inclusive em ABERTO/FECHADO. Correção: `vencido`/`usoVencidoAutorizado` adicionados apenas como fatos de entrada de `aptoParaDescarte`; testemunhas SAT para os novos caminhos; `extraviar` rejeita repetição; `quebra` não se aplica a emprestado. Os checks anteriores verificavam corretamente o modelo existente, mas o modelo não cobria o caminho normativo.
- M2.2 frame-condition audit: `vencido`/`usoVencidoAutorizado`, introduzidos no erratum, ficaram sem frame pós-transição e podiam variar livremente (inclusive em frascos ≠ f). Corrigido com `preservaValidade` (extraviar, descartar) e `preservaValidadeExceto` (quebrar, confirmarEsgotamento). Classificação: extraviar/descartar = PRESERVED; quebrar = UNSPECIFIED no alvo; confirmarEsgotamento = OUT_OF_ABSTRACTION (devolução decide vencido/usoVencido). Em todos, frascos ≠ f preservados. 4 assertions novas (`FRAME-M2-EXTRAVIO-VALIDADE-001`, `FRAME-M2-DESCARTE-VALIDADE-001`, `FRAME-M2-QUEBRA-INTERF-001`, `FRAME-M2-ESGOTAMENTO-INTERF-001`) e witness fortalecida `TestemunhaVencidoComUsoAutorizado`. Nenhuma HQ nova.
- M2.2 terminal-state audit: `DESCARTADO` era alcançável, mas nenhuma precondition comum bloqueava transições posteriores. Corrigido com helper `naoDescartado[s,f] = fisico[f] != DESCARTADO` em `extraviar`/`quebrar`/`confirmarEsgotamento` e incorporado a `aptoParaDescarte`. 5 assertions novas (`INV-M2-DESCARTADO-TERMINAL/EXTRAVIO/QUEBRA/REDESCARTE/ESGOTAMENTO-001`). `VAZIO`, `QUEBRADO` e `EXTRAVIADO` NÃO foram tornados terminais. Nenhuma HQ nova. O frame-condition audit anterior permanece válido.
- M2.2 passou a carregar a projeção mínima de quarentena (`emQuarentena` e `descarteTecnicoAutorizado`) necessária para formalizar HQ-M2-008/B; M0 (`withdrawal.als`) permanece inalterado.
- M2.3 = VALIDATED (proveniência/IR/geração): IR v3 com projeção `frasco_reagente_m2` (29 colunas, derivada de `frascoCompletoCampos`) ao lado da fatia M0; proveniência estruturada validada por Rust; `validation_m2` valida a evidência Alloy M2.2; gerador emite fragmentos M2 vinculados ao MANIFEST. Fragmentos M0/M1 byte a byte idênticos; geração determinística; stale/tampering rejeitados. Nenhuma HQ nova.
- M2.4 = VALIDATED (composição M0 × M2.2): `bottle_composition.als` em estratégia aditiva — um único universo Frasco com um único par fisico/disponibilidade e uma relação emQuarentena. Predicados reproduzidos comparados mecanicamente com origens (guard de drift léxico). Gate Alloy: 12 checks UNSAT + 10 witnesses SAT em scope 4; 5 checks UNSAT + 1 witness SAT em scope 6; sempre exatamente 2 EstadoIntegrado. Nenhum contraexemplo semântico. Evidência `build/formal-validation-m24.json`, versão 1, SAT4J/Alloy 6.2.0. `validation_m24.rs`: 8 testes Rust (versão/solver/hashes IR/modelo/origens/SAT↔UNSAT/scope/ID/adulteração). Guard de drift no teste `composition.test.mjs` (incluído em `alloy-check`). Fragmento `invariants/frasco_reagente_m2_composed.tex` gerado; `Formal-Spec-M2.tex` criado e integrado ao `main.tex`. Build final: exit 0, 295 páginas, zero erros LaTeX, 28 Overfull preexistentes. `withdrawal.als`, `bottle_identity.als`, `bottle_state.als`, CUE M2.1d e IR v3 permanecem inalterados. Não certifica ciclo de empréstimo, metrologia, autorização, idempotência ou concorrência. M3–M12 seguem como NOT_STARTED.
- M0 formal-validation: apenas `spec_ir_sha256` mudou (IR mudou legitimamente); `model_sha256` e os 4 resultados permanecem idênticos.
- Reconciliação pré-M2.4 (HQ-M2-008/B, HQ-M2-009/A): `.tex` das Seções 4/5/7/8/9/10.4/10.5/10.8/11 reconciliados. HQs M2 OPEN = 0. Backend real continua dívida de M4/M5/M6/M9/M10.

M0/M1 VALIDATED historicamente nos respectivos worklogs. A Auditoria 8 alterou M0 depois de M1: enum INDISPONIVEL e testemunha IndisponivelNaoApto; preservar o modelo atual, não restaurar a antiga testemunha DisponivelNaoApto.

## 10. Trabalho concluído
- Inventário e commit exclusivo do estado 672fc65a antes da camada formal.
- M0: CUE/IR/Alloy/Rust/LaTeX/PDF, escaping central, manifest SHA-256, dois invariantes e duas testemunhas.
- Duas falhas preexistentes de aplicação diagnosticadas e reparadas em d13d25d3; TypeScript de ambos os projetos e 12 testes de domínio passaram no fechamento M0.
- M1: 8 campos de Resumo e 11 de Especificação, frequência condicional, densidade NUMERIC(8,4), limites VARCHAR, enums, null e par com FK coerente; 35 fixtures novas além das 7 M0.
- IR v2 de três entidades, leitura v1 mantida, quatro fragmentos adicionais de entidades/mapeamentos; arquivos M0 idênticos.
- READMEs e knowledge atualizados; justfile mantém todos os comandos previstos mais rust-check.
- LaTeX aditivo e main.pdf de 216 páginas revisado.
- Worklogs duráveis: M0_VALIDATION.md, M0_BASELINE_DIAGNOSIS.md e M1_VALIDATION.md em documentation/worklogs/formal-spec/.

## 11. Registro histórico — consolidação documental HQ-M2-004..007

ATENÇÃO: esta seção preserva o estado observado naquele checkpoint. Foi
posteriormente superada pelas decisões RESOLVED em `M2_HUMAN_QUESTIONS.md` e
pelo fechamento M2.1d. Não utilizar os estados OPEN nem a situação Git desta
seção como estado corrente.

HEAD de entrada: `25e3825f5045a328e59f17115f2dbbda0710fb26`, branch `feat/formal-spec-cue-alloy`. No checkpoint desta seção, nenhum commit havia sido criado. Fonte de decisões: documento de consolidação fornecido pelo usuário; restrição posterior limita alterações a .tex, PDF e status.

- HQ-M2-004 RESOLVED: FECHADO + nominal NULL inicia sem tara e com saldo desconhecido; abertura/pesagem bruta não resolvem; ciclo sem tara equivalente ao JA_ABERTO, inclusive transições terminais/extravio.
- HQ-M2-005 RESOLVED: eliminado limiar fixo; Q06 dinâmica preservada; peso observado aceito, custódia encerrada com DEVOLVIDO_COM_ANOMALIA, bloqueio operacional e consumo pendente. Origem teórica/real explícita, nova pesagem e confirmação de vazio auditadas; tara real anterior somente substituída por recalibração de vazio com justificativa.
- HQ-M2-006 RESOLVED: resumos de reagentes/almoxarifado FLOW-only, sem STOCK diário, cascata D→hoje ou view persistente de estoque atual. Frasco_Reagente + count()/sum() server-side; Auth/App Check/RBAC, 5/min/UID, cache lazy de 30 s com invalidação transacional por mutação e proteção contra publicação obsoleta. Patrimônio preservado.
- HQ-M2-007 RESOLVED: pesagem ordinária tem observação opcional e descrição automática identificada; operações especiais conservam suas justificativas.

Validação naquele checkpoint: just docs-build PASS (275 páginas, zero erros/referências indefinidas; 28 Overfull herdados, comparação com baseline compilado de 267 páginas); spec-check/spec-export/alloy-check PASS no recorte existente; git diff --check PASS. PDF inspecionado antes da publicação. Inventário de arquivos, campos removidos, auditoria e resultados de validação desta rodada: [STATUS_ATUAL.md](documentation/STATUS_ATUAL.md). Os registros M2.1b/M2.1c e M2_HUMAN_QUESTIONS.md não foram reescritos fora do escopo autorizado; seus estados OPEN para HQ004..007 estão superados pelas decisões acima e pelas fontes .tex atuais.

## 12. Próxima ação EXATA
**M10 = VALIDATED.** M0–M9 = VALIDATED; M10 fechou CUE → IR → Alloy → receipt → Rust → geração → LaTeX → PDF com 29 checks UNSAT, 17 witnesses SAT, IR v3 aditivo (`formal_m10_patrimonio`), receipt verificável, validator Rust, guard de drift, canonicalização `N(s)` e PDF de 389 páginas. Regressão M0–M9 PASS (receipts antigos mudaram somente em `spec_ir_sha256`); a evidência continua restrita ao modelo formal e não certifica a implementação Firebase. A consolidação executável está pronta e não commitada.

M10 permanece encerrado. A entrada em M11 — Turmas / demais domínios — foi avaliada e concluída em rodadas separadas (documental e executável): **M11 = VALIDATED**. M12.1 foi concluído em rodadas documental e executável (**M12.1 = VALIDATED**; worklogs `documentation/worklogs/formal-spec/M12_1_DOCUMENTATION.md` e `M12_1_EXECUTABLE_VALIDATION.md`). Próxima ação: M12.2 (Roteiros/Storage); depois o fechamento M12 e M13 (Notificação unificada); o fechamento global após M13 é um gate, sem M14 automático. Registro executável de M10 em `documentation/worklogs/formal-spec/M10_EXECUTABLE_VALIDATION.md`; de M11 em `documentation/worklogs/formal-spec/M11_EXECUTABLE_VALIDATION.md`.

M7 documental: contrato global de idempotência em `documentation/worklogs/formal-spec/M7_DOCUMENTATION.md`; identidade `(uid, tipo_operacao, payload_hash)`, canonicalização única, `idOperacao` obrigatório, comandos atômicos vs workflows externos, dedup de eventos, jobs e materializações; findings M7-F01..F09 corrigidos e M7-F10 registrado como divergência de implementação. A formalização executável CUE/Alloy/Rust de M5–M7 foi concluída no backfill pré-M8. M8 = VALIDATED. Registro: `documentation/worklogs/formal-spec/PRE_M8_FORMALIZATION_BACKFILL.md`, `documentation/worklogs/formal-spec/M8_DOCUMENTATION.md` e `M8_EXECUTABLE_VALIDATION.md`. A implementação real (`functions/src/reagentes.ts`) segue divergente e não foi alterada.

HQs M2/M3/M4 OPEN = 0. `withdrawal_return.als` (60 resultados), `build/formal-validation-m4.json`, `validation_m4.rs`, `withdrawal_return.mjs`, `doc_contract.test.mjs`, `Formal-Spec-M4.tex` e o PDF de 313 páginas estão commitados em `3213c48a`..`f23adc81` (registro documental no commit imediatamente seguinte). O IR foi para `spec_ir_sha256 = 0558049777...`; os receipts antigos mudaram apenas nesse campo. O backend real (`functions/src/reagentes.ts`) continua divergindo da especificação (autoridade de vencimento na devolução/reencontro, finalidade, anomalia, snapshots/TCR, destinos) e é dívida de M4/M5/M6/M7/M9; o catálogo JSON está especificado, não implementado. Não inferir prova de Q06/tara, extravio/quarentena completos, idempotência ou autorização a partir dos gates M4.

## 13. Arquivos que devem ser lidos para continuar
1. Este arquivo, ponto único de retomada.
2. documentation/worklogs/formal-spec/M1_VALIDATION.md e specification/README.md.
3. specification/cue/domain/{frasco,campos_catalogo,resumo_reagente,especificacao_reagente}.cue; docs/projection.cue; firestore/mapeamentos.cue; tests/.
4. specification/alloy/reagents/{withdrawal,bottle_identity,bottle_state}.als e tools/formal/check.mjs.
5. tools/spec-doc/src/{ir,render,main,validation,validation_m2,latex}.rs, Cargo.toml/lock, tests/fixtures/ir-v1.json e justfile.
5b. build/spec-ir.json (IR v3, proveniência estruturada), build/formal-validation.json (M0) e build/formal-validation-m2.json (M2.2); documentation/generated/{entities/frasco_reagente_m2.tex,invariants/frasco_reagente_m2.tex,MANIFEST.json}.
6. specification/knowledge/{AI_HANDOFF,FORMAL_SPEC_ARCHITECTURE,CUE_KNOWLEDGE,RUST_LATEX_GENERATOR}.md.
7. documentation/COMPILACAO_NIX_LCQUI.md e Formal-Spec-M0.tex/Formal-Spec-M1.tex.
8. Fontes M2: Section-4-Modelagem-Entidades-SQL-3FN.tex e Section-5-Notas-de-Mapeamento-para-Firestore.tex, trechos Frasco_Reagente. Fluxo operacional está em Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/Section-10-Subsection-5-Fluxo-de-Reagentes.tex; Seção 10.7 contém jobs.
9. Diagnóstico de aplicação já concluído em M0_BASELINE_DIAGNOSIS.md, somente se necessário; não reiniciar auditoria.
10. Worklogs M2 históricos (M2.0, M2.1, M2.1a, M2.1b, M2.1c) e o prompt de consolidação foram arquivados em `documentation/archive/formal-spec/`; consulte o README desse diretório. Não são estado atual.

## 14. Comandos de validação
Na raiz, após configurar ambiente:
```sh
git branch --show-current
git status
git log --oneline -10
just spec-check
just spec-export
just alloy-check
just rust-check
just docs-generate
just docs-check
just docs-build
just formal-check
```
Não executar docs-generate antes do gate stale quando a intenção é detectar divergência. formal-check recalcula entradas mas não regenera .tex: exige --check, compila e roda git diff generated.
Direto: `cd specification/cue && cue fmt ./... && cue vet ./... && cue export ./docs -e ir`.
Preservação M1:
```sh
git diff 182447d3 --exit-code -- frontend functions firebase.json firestore.rules storage.rules .firebaserc flake.nix flake.lock documentation/worklogs/consolidacao-gemini
```
Checks de aplicação executados no fechamento M0 (não repetidos no M1, pois código intacto):
```sh
functions/node_modules/.bin/tsc --noEmit -p functions/tsconfig.json
frontend/node_modules/.bin/tsc --noEmit --incremental false -p frontend/tsconfig.json
npm test --prefix functions -- --runInBand src/__tests__/domain
```
Usar tsc direto: script build de functions contém `|| true`. Não mascarar erro.
PDF: just docs-build grava build/latex/main.pdf; inspecionar log final/páginas alteradas antes de copiar para documentation/main.pdf.

## 15. Validações já executadas
- M0: pipeline completo, 7 fixtures, 2 testes Rust, determinismo/stale, PDF de 213 páginas revisado; reparos de aplicação com TypeScript PASS e 12 testes Jest PASS.
- M1: cue fmt/vet/export e 42 fixtures (7 M0 + 35 M1) PASS; IR v2 com três exemplos unificados aos schemas.
- Alloy 6.2.0/SAT4J reexecutado: BloqueioFisico e Unicidade UNSAT; Testemunha e DisponivelNaoApto SAT; scope 4, exatamente 2 Estado, bitwidth 4. Mesmos checks M0, não nova prova M1.
- Rust 0.2.0 fmt/test (4)/clippy --all-targets -D warnings PASS: escaping, proveniência/resultados adulterados, leitura v1/v2, nomes inseguros/duplicados e versão desconhecida.
- docs-generate/docs-check PASS; duas gerações comparadas recursivamente idênticas; alteração deliberada de Resumo em cópia /tmp rejeitada como stale. Dois .tex M0 idênticos byte a byte.
- just formal-check final PASS, log /tmp/lcqui-m1-final-check.log. Build real anterior desta rodada: exit 0, 216 páginas, zero erros/referências indefinidas, 21 Overfulls herdados, nenhum no trecho M1. Páginas 214–216 renderizadas com Poppler e aprovadas; main.pdf copiado depois. Gate final confirmou PDF atualizado.
- Diff de aplicação/configurações/worklogs 3B contra 182447d3 vazio; git diff --check PASS.

## 16. Contraexemplos / problemas encontrados
CONTRAEXEMPLO PÓS-M1 M2-IDENTIDADE-001 — CONTRADICAO_REAL (constraint SQL insuficiente frente ao texto, já presente em 3B):
- Propriedade: exatamente uma rota relacional para a especificação efetiva.
- Fonte: Seção 4, Constraint de Identidade Química do Frasco, linha 377 em 9df335bc.
- Caso: id_lote=1, Lote[1].id_especificacao_reagente=10, id_especificacao_reagente=20.
- CHECK OR atual: aceita as duas referências não nulas; permite resolver duas especificações distintas. Mesmo se iguais, ainda viola a exclusividade textual.
- Texto: lote informado exige referência direta NULL; sem lote exige referência direta.
- Interpretação adotada para M2: XOR no registro relacional; referências projetadas Firestore não seguem esse XOR. Fonte documental permanece intacta.
- Evidência: tabela-verdade executável no worklog M2.0; não é resultado de solver Alloy. M2.2 deverá modelar ambas as rotas com testemunhas SAT e resolução única.

Nenhum novo solver Alloy executado em M2.0. Contraexemplo documental M2 abaixo; registros históricos seguem. Registrar novos casos antes de alterar regra: ID, assertion, scope, estado inicial/final, fonte 3B, interpretação e classificação BUG_MODELO_FORMAL/TRADUCAO_INCORRETA/LACUNA_POS_3B/CONTRADICAO_REAL.
CONTRAEXEMPLO PÓS-3B CUE-M1-001 (RESOLVIDO), classificação TRADUCAO_INCORRETA:
- Propriedade: frequência nullable deve estar explicitamente presente no registro normalizado M1.
- Scope: uma fixture tests/catalogo/resumo/invalid/nullable_ausente.json, não assertion Alloy.
- Estado inicial: requer_pesagem_frequente=false, frequência ausente; resultado original: vet aceitava por completação de null.
- Fonte: dicionário nullable da Seção 5 e convenção explícita de linha completa escolhida no M1, não política de ausência do Firestore.
- Interpretação/correção: usar campos obrigatórios `!`, inclusive nas condições, para distinguir presença de valor inferido. Fixture agora rejeitada; nenhuma regra 3B alterada. Detalhes em M1_VALIDATION.md.

**RESOLVIDO NA IMPLEMENTAÇÃO DA AUDITORIA 8**:
- A omissão de `INDISPONIVEL` na propriedade `disponibilidade` do M0 foi resolvida (PDF-004/C004).
- O Alloy foi atualizado de forma que frascos em estado não apto impliquem `INDISPONIVEL`. O validador Alloy comprovou a coerência sem gerar deadlocks. Evidência registrada em `M0_INDISPONIVEL_VALIDATION.md`.
Problemas preexistentes de aplicação RESOLVIDOS no M0:
- APP-BASELINE-001: TS2322 em frontend/src/app/reagentes/page.tsx:524. Prop tipoSubstanciaResumo não declarada/consumida removida em d13d25d3; typecheck passou, comportamento interno do modal não mudou.
- APP-BASELINE-002: teste de Bolsista+Gestor sem Aluno esperava a segunda validação mas recebia "Bolsista exige papel Aluno." Casos separados em d13d25d3, mantendo classe/mensagens e usando Aluno+Bolsista+Gestor na incompatibilidade. Autorização não alterada; 12/12 testes passaram.
Problemas instrumentais resolvidos: usar alloy6 help exec (não --help); CUE embedding/referências locais corrigidos; Overfull M0 do caminho do manifest corrigido; Clippy M1 pediu colapsar if (corrigido sem supressão). Sandbox na seção 6. Uma tentativa de consolidar este estado via script Node falhou em sintaxe antes de escrever; arquivo consolidado integralmente depois, sem perda dos resultados.

## 17. Decisões tomadas nesta fase
- Preservar árvore real e regras 3B; reparos pontuais de aplicação foram unidade separada, não reauditoria.
- M0 é filtro físico necessário, não elegibilidade operacional completa. Coerência inicial é hipótese Alloy; final é assertion. Após Auditoria 8, a testemunha atual usa EXTRAVIADO+INDISPONIVEL; a aceitação estrutural de um enum pelo CUE não demonstra coerência relacional Alloy.
- M1 representa linhas completas; nullable não é optional, defaults de criação não são injetados. IDs inteiros são relacionais; docIds/FKs string são Firestore.
- Frequência condicional e densidade de líquido verificadas em CUE. Existência global, composição, imutabilidade e autorização não são inferidas de par estático.
- HTTPS é padrão estrutural com host não vazio, não parsing completo/acessibilidade de recurso.
- Notas de mapeamento não são segundo schema. IR v2 preserva leitor v1 e fragmentos M0. Rust somente apresenta constraints, não implementa backend.
- Generated/IR/resultados versionados, sem dados voláteis; target e build/latex ignorados. PDF humano com today não promete identidade binária entre datas/TeX diferentes.
- Escopo Alloy não aumenta por o IR incluir mais entidades. Não gerar UX/rationale; texto humano continua no LaTeX.

## 18. Itens ainda não migrados
Relações/IR/documentação do Frasco completo e demais domínios M5–M12; composição, integridade global/imutabilidade do catálogo, schemas Firestore completos, testes specification→Firebase Emulator e CI hospedada. M1 já contém os dois registros normalizados e notas de mapeamento. M3 já contém o registro completo de Emprestimo_Reagente (34 colunas), sua máquina de status e evidência Alloy. M4 já contém a composição operacional de retirada/devolução, o snapshot `vencido_na_retirada` e a classificação do retorno. O catálogo JSON (`Sistema_Catalogo_Reagentes`, geração/publicação, `obterCatalogoReagentes`, `resolverCatalogoPorIds`) está **especificado, não implementado**. As features V2 (edição de Resumo/Especificação e correções de validade) estão especificadas na Seção 12, não implementadas. Nenhuma aplicação TypeScript gerada/substituída. Documentação humana original preservada.

## 19. Commits desta fase
- 672fc65a — chore(spec): add formal specification state.
- 0f679e33 — feat(spec): validate partial bottle model with CUE and Alloy.
- 2e5c8f79 — feat(spec-doc): generate deterministic bottle documentation.
- cbd0eba4 — docs(spec): integrate and validate M0 formal documentation.
- e95a42ab — chore(spec): save final handoff state.
- d13d25d3 — fix: resolve baseline typecheck and role test failures.
- 182447d3 — docs(spec): mark M0 validated and prepare M1 handoff (HEAD inicial M1, push anterior concluído).
- c38a7f67 — feat(cue): model reagent summary and specification records.
- f577dafb — feat(spec-doc): support catalog IR and preserve M0 output.
- Checkpoint final M1: assunto `docs(spec): integrate validated M1 catalog documentation`; resolver SHA com `git log -1 --format=%H --grep="validated M1 catalog"` (um commit não contém seu próprio SHA).
- ed384076 — feat(alloy): compose M0 and M2 bottle state (`bottle_composition.als`, `composition.mjs`, `formal-validation-m24.json`, `check.mjs`).
- d7ac41ce — feat(spec-doc): validate and render M2 composition evidence (`validation_m24.rs`, `render.rs`, `main.rs`, `composition.test.mjs`, `justfile`, `frasco_reagente_m2_composed.tex`).
- Commit documental M2.4: assunto `docs(spec): record M2.4 validation and close M2`; resolver SHA com `git log -1 --format=%H --grep="M2.4 validation"` (um commit não contém seu próprio SHA).

## 20. Estado do Git
M2.4 entrada `a0388182c406b0768eb8c31cb9307b66fad3dece`, árvore limpa. Commits da unidade: `ed384076` (feat(alloy): compose M0 and M2 bottle state) e `d7ac41ce` (feat(spec-doc): validate and render M2 composition evidence). Commit documental desta unidade: `docs(spec): record M2.4 validation and close M2`. `withdrawal.als`, `bottle_identity.als`, `bottle_state.als`, CUE M2.1d, IR v3 e os fragmentos M2.2/M2.3 permaneceram inalterados; `git diff --check` PASS.
Reconciliação pré-M2.4 entrada `991dbdc3dce5ee5e28c5a4b167992225a204d71d`, árvore limpa. Unidade: HQ-M2-008/B e HQ-M2-009/A, correção dos findings 4/5, Alloy M2.2 reaberto/revalidado e M2.3 revalidado. `withdrawal.als`, CUE M2.1d e `build/spec-ir.json` permaneceram inalterados. Commits e push registrados no worklog `PRE_M2_4_RECONCILIATION.md`.
M2.3 entrada `4b057ac1d9bd6b83bdc0ecf3dff44eacb0a15fc1`, árvore limpa. Commits: `d02aaa8a` (`feat(spec): project full M2 bottle into IR`), `fa8b125b` (`feat(spec-doc): validate M2 Alloy evidence and harden provenance`), `84185868` (`feat(spec-doc): render M2 entity and formal evidence`), `7b8a78e9` (`test(spec-doc): assert manifest provenance links and determinism`). Commit documental desta unidade: `docs(spec): record M2.3 validation`. `withdrawal.als`, `bottle_identity.als`, `bottle_state.als`, o CUE de domínio M2.1d, `main.tex`, `Formal-Spec-M0/M1.tex` e o PDF permaneceram inalterados; `git diff --check` PASS.
M2.2 terminal-state audit entrada `5d70bede3d6027ed3c043d4c5115e59ef827eecf`, árvore limpa. Commit da correção: `1b4adabb` (`fix(alloy): enforce discarded bottle terminality`; `bottle_state.als` + `tools/formal/check.mjs` + `build/formal-validation-m2.json`). Commit documental da auditoria: `docs(spec): record M2.2 terminal-state audit`. `withdrawal.als`, `bottle_identity.als`, `build/formal-validation.json` e o CUE M2.1d permaneceram inalterados; `git diff --check` PASS.
M2.2 frame-condition audit entrada `dcee5ff4f1a8385672bc1280e058596afe338905`, árvore limpa. Commit da correção: `cc8e1ad0` (`fix(alloy): constrain M2 bottle transition frames`; `bottle_state.als` + `tools/formal/check.mjs` + `build/formal-validation-m2.json`). Commit documental da auditoria: `docs(spec): record M2.2 frame-condition audit`. `withdrawal.als`, `bottle_identity.als`, `build/formal-validation.json` e o CUE M2.1d permaneceram inalterados; `git diff --check` PASS.
M2.2 erratum entrada `f5384abc48a63be79b72db2d7be1489d41e03f0e`, árvore limpa. Commit da correção: `10366096` (`fix(alloy): restore full bottle discard eligibility`; `bottle_state.als` + `tools/formal/check.mjs` + `build/formal-validation-m2.json`). Commit documental do erratum: `docs(spec): record M2.2 coverage erratum`. `withdrawal.als`, `bottle_identity.als`, `build/formal-validation.json` e o CUE M2.1d permaneceram inalterados; `git diff --check` PASS.
M2.2 entrada `dd46a446cc286dc895d638bd28b7c740775a3b60`, árvore limpa. Commits da unidade: `a3bf7303` (`feat(alloy): model M2 bottle identity relations`), `aeeb712c` (`feat(alloy): model M2 bottle state coherence`) e `ae176154` (`test(alloy): gate M2 identity and state witnesses`; `tools/formal/check.mjs` + `build/formal-validation-m2.json`). Commit documental desta unidade: `7eb40930` (`docs(spec): record M2.2 validation state`). `withdrawal.als` e `build/formal-validation.json` permaneceram inalterados; `git diff --check` PASS.
Push desta unidade: autorizado explicitamente e executado; `origin/feat/formal-spec-cue-alloy` passa a conter os commits `0f0505e0`, `dd46a446`, os três commits de modelo/gate de M2.2 (`a3bf7303`, `aeeb712c`, `ae176154`), `7eb40930` e o commit documental que registra este push. Como um commit não contém o próprio SHA, este registro não antecipa a SHA final da remota.
M2.1d entrada `69726049708398eacb2018534e88c49633f53d06`, árvore limpa. Commits da unidade: `fd6d3bc1` (`feat(cue): realign M2 bottle schema with M2.1d origem_tara`; CUE + 22 fixtures existentes), `c6bad174` (`test(cue): add M2.1d tara-origin fixtures`; 8 fixtures novas) e `f27a7972` (`docs(spec): record M2.1d CUE realignment`; este worklog e os arquivos de status). Ao encerrar a unidade, os três commits eram apenas locais e `origin/feat/formal-spec-cue-alloy` ainda apontava para `69726049`; nenhum push foi executado pela unidade. `git diff --check` PASS; `build/spec-ir.json` e `build/formal-validation.json` inalterados.

Estado remoto atualmente verificado: `origin/feat/formal-spec-cue-alloy` = `f27a797289dfa28ec4f3b445feb5599900cd4410`, portanto os três commits M2.1d estão publicados. O Git permite afirmar apenas que a remota mudou; o push ocorreu após o encerramento da unidade, fora da execução M2.1d.
M2.1c entrada fc94fa87, sem alterações preexistentes. Commit desta unidade: `1655a5bb` (`feat(cue): realign M2 bottle schema with M2.1b documentation`), com push confirmado. Alterados: `specification/cue/domain/frasco_completo.cue` e 22 fixtures do grupo `frasco-completo` (21 alteradas + 1 nova). `git diff --check` PASS; árvore sincronizada após o envio.
Registro histórico M2.1b: entrada de874a4b; checkpoint 1 `33c462fc` (docs(frasco): reconcile registration, balance and quarantine semantics); checkpoint 2 `252e4e50` (docs(materialization): define rebuildable daily summaries); checkpoint final `facd2882` (docs(spec): record reconciled M2 documentation state); complemento de gates docs(spec): finalize M2.1b gate record. Compilação LaTeX exit 0, 267 páginas, zero erros/refs indefinidas; `documentation/main.pdf` atualizado nessa unidade.
Registro histórico: M2.1a entrada ce299d42; checkpoints documentais 4e0e60e5/88f913fe; CUE f340500f (fix(cue): align bottle schema with audited local constraints).

## 21. Como uma nova IA deve continuar
Ler este arquivo; confirmar status/log/branch; ler fontes indicadas; repetir gates mínimos e seguir seção 12. Não replanejar do zero nem reabrir 3B. Atualizar estado após unidades pequenas/validações/descobertas, antes de tarefas longas e antes/depois de commits. Manter tudo salvo para retomada em outra máquina. Usar NOT_STARTED/IN_PROGRESS/BLOCKED/IMPLEMENTED/VALIDATED; só VALIDATED conclui um escopo. Não alegar homologação integral a partir de checks limitados.

## 22. Definition of Done restante
M0 = VALIDATED (erratum textual corrigido); M1 = VALIDATED (não afetado); M2.0/M2.1/M2.1a = validações históricas; M2.1b = DOCUMENTATION_VALIDATED; M2.1c = VALIDATED; M2.1d = VALIDATED (CUE local de 29 colunas, `origem_tara`); M2.2 = VALIDATED (Alloy: identidade química efetiva e coerência de estado); M2.3 = VALIDATED (IR v3, proveniência estruturada, validação da evidência M2.2 e geração determinística dos fragmentos M2 integrados em M2.4); M2.4 = VALIDATED (composição aditiva M0 × M2.2: 12+5 checks UNSAT, 10+1 witnesses SAT, guard de drift, evidência versionada, fragmento composto, LaTeX/PDF integrado); M2 = VALIDATED; M3 = VALIDATED (Seção 5 reconciliada; CUE de 33 colunas no fechamento original, **34** após o erratum pré-M5 com o snapshot `vencido_na_retirada`; `loan_state.als` com 11 checks UNSAT + 11 witnesses SAT; projeção `emprestimo_reagente` e `baseline_documental_m3` no IR v3; `validation_m3` Rust; fragmentos M3 e `Formal-Spec-M3.tex` integrados; PDF 313 páginas; erratum pós-validação: anomalia resolvida representável e `medida_utilizada >= 0`, 25 fixtures M3; erratum pré-M5: snapshot imutável, 28 fixtures M3). HQs M2 OPEN = 0; HQs M3 OPEN = 0. Finding 4 (lock patrimonial) e Finding 5 (desvínculo individual) reconciliados documentalmente; implementação real permanece dívida de M9/M10. M4 = VALIDATED (composição operacional de retirada/devolução em `withdrawal_return.als`: **40 checks UNSAT + 20 witnesses SAT = 60 resultados** após o erratum pré-M5, que removeu `Devolucao.vencidoNoRetorno`, adicionou o snapshot `vencido_na_retirada` e a classificação do retorno; guard de drift das origens M2.4/M3 + `doc_contract.test.mjs`; `validation_m4` Rust com 60 resultados; `Formal-Spec-M4.tex` e PDF de 313 páginas; erro mecânico da Seção 10.5/7 corrigido para autoridade persistida). HQs M2/M3/M4 OPEN = 0. Finding 4 (lock patrimonial) e Finding 5 (desvínculo individual) reconciliados documentalmente; implementação real permanece dívida de M9/M10. M5 = DOCUMENTATION_VALIDATED (extravio/reencontro/quarentena consolidados documentalmente; formalização executável pendente). M6 = DOCUMENTATION_VALIDATED (Q06/tara/metrologia; três rotas; sem correção administrativa metrológica na V1). M7 = DOCUMENTATION_VALIDATED (idempotência: comando/evento/job/materialização; identidade `(uid, tipo_operacao, payload_hash)`; `idOperacao` obrigatório). M8 = VALIDATED (estoque atual/escassez/notificações; predicado único `frascoAptoParaUso`; `qtdAptos < limiar`; cache lazy 30 s com geração; notificação idempotente `ESCASSEZ_ESTOQUE`; CUE + IR v3 aditivo + Alloy composto 25 checks/15 witnesses + receipt + validator Rust + geração determinística + `Formal-Spec-M8.tex`; findings M8-F07..F10 como dívida de implementação; nenhuma HQ). Esta rodada não certifica execução de backend nem concorrência.
# Estado corrente pós-backfill pré-M8

M0 = VALIDATED; M1 = VALIDATED; M2 = VALIDATED; M3 = VALIDATED; M4 = VALIDATED;
M5 = VALIDATED; M6 = VALIDATED; M7 = VALIDATED; M8 = VALIDATED. A cadeia
executável CUE → IR → Alloy → receipts → Rust → LaTeX → PDF de M5–M8 foi
concluída e os gates finais passaram; M8 formalizou estoque, escassez e
notificações. A próxima ação exata é **avaliar a entrada em M9 —
autorização/usuários**, em rodada separada. Não iniciar M9. Os parágrafos
históricos abaixo preservam os estados anteriores à quitação.
