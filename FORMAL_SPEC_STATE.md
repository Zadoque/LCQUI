# LCQUI — Formal Specification State

## 1. Propósito desta fase
M4 = VALIDATED (Retirada/devolução completas, com erratum pré-M5); M3 = VALIDATED (com erratum pré-M5); M2 = VALIDATED. M5 = DOCUMENTATION_VALIDATED (extravio/reencontro/quarentena). M6 = DOCUMENTATION_VALIDATED (Q06/tara/metrologia; três rotas; sem correção administrativa metrológica na V1). M7 = DOCUMENTATION_VALIDATED (idempotência: contrato global de comandos/eventos/jobs/materializações; M8 = NOT_STARTED). A reconciliação pré-M7 foi concluída (`documentation/worklogs/formal-spec/PRE_M7_RECONCILIATION.md`, PASS). A reconciliação pré-M5 (entrada `e8c36660`; commits `3213c48a`..`f23adc81` + registro documental) adicionou o snapshot `vencido_na_retirada`, tornou o vencimento persistido a autoridade da devolução, removeu `Devolucao.vencidoNoRetorno`, formalizou a classificação do retorno e especificou o catálogo JSON (V1) e as features V2. Registro em `documentation/worklogs/formal-spec/PRE_M5_RECONCILIATION.md`; errata em `M3_VALIDATION.md` e `M4_VALIDATION.md`. Entrada M3: `158cb91f77b8301274c63e4ee8e384249721a5ba`. Entrada M4: `0bf3c68fc6a0470c69faca3ed857d14079a8a533`. Os parágrafos abaixo preservam o contexto histórico da fase.

Camada formal ADITIVA CUE + Alloy + Rust → LaTeX. M2 encerrado com composição M0 × M2.2 em `bottle_composition.als`; evidência M2.4 validada pelo Rust. M3 migrou `Emprestimo_Reagente` (**34 colunas** após o erratum pré-M5), sua máquina de status (`loan_state.als`) e a evidência M3. M4 compôs Frasco e Emprestimo nas operações de retirada e devolução (`withdrawal_return.als`, erratum pré-M5). M5, M6 e M7 documentais foram consolidados (`DOCUMENTATION_VALIDATED`). A formalização executável CUE/Alloy/Rust de M5–M7 ainda está pendente, sendo quitada nesta etapa pré-M8. M8 = NOT_STARTED; sua entrada depende dos gates completos desta etapa.

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
| M5 | Extravio/reencontro/quarentena | DOCUMENTATION_VALIDATED |
| M6 | Q06/tara | DOCUMENTATION_VALIDATED |
| M7 | Idempotência | DOCUMENTATION_VALIDATED |
| M8 | Estoque/escassez/notificações | NOT_STARTED |
| M9 | Autorização/usuários | NOT_STARTED |
| M10 | Patrimônio | NOT_STARTED |
| M11 | Turmas/demais domínios | NOT_STARTED |
| M12 | Integração/redução de duplicação normativa | NOT_STARTED |

## 9. Milestone atual
M4 VALIDATED (Retirada/devolução completas, com erratum pré-M5). M3 VALIDATED (com erratum pré-M5); M5 = DOCUMENTATION_VALIDATED; M6 = DOCUMENTATION_VALIDATED; M7 = DOCUMENTATION_VALIDATED. Registro completo em `M4_VALIDATION.md`, `PRE_M5_RECONCILIATION.md`, `M5_DOCUMENTATION.md`, `M6_DOCUMENTATION.md` e `M7_DOCUMENTATION.md`.

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
Pré-M8: **M8 NÃO PODE INICIAR**. `HQ-PRE-M8-001` OPEN: reencontro QUEBRADO preserva saldo desconhecido em M5, mas viola a coerência vigente M2/M4. Diagnóstico Alloy real encontrou contraexemplo nos scopes 4 e 6; witness de origem SAT. Resolver a contradição normativa antes de validar a composição M5. Evidência e retomada em `documentation/worklogs/formal-spec/PRE_M8_FORMALIZATION_BACKFILL.md`.

CONCLUIR RECONCILIAÇÃO E FORMALIZAÇÃO EXECUTÁVEL PRÉ-M8. Somente após todos os gates: `INICIAR M8 DOCUMENTAL`. M0–M4 = VALIDATED; M5 = DOCUMENTATION_VALIDATED; M6 = DOCUMENTATION_VALIDATED; M7 = DOCUMENTATION_VALIDATED; M8 = NOT_STARTED. Não iniciar M8 nesta rodada.

M7 documental: contrato global de idempotência em `documentation/worklogs/formal-spec/M7_DOCUMENTATION.md`; identidade `(uid, tipo_operacao, payload_hash)`, canonicalização única, `idOperacao` obrigatório, comandos atômicos vs workflows externos, dedup de eventos, jobs e materializações; findings M7-F01..F09 corrigidos e M7-F10 registrado como divergência de implementação. Nenhum arquivo executável ou formal alterado; PDF 341 páginas. A formalização executável CUE/Alloy/Rust de M5–M7 ainda está pendente, sendo quitada nesta etapa pré-M8. Registro: `documentation/worklogs/formal-spec/PRE_M8_FORMALIZATION_BACKFILL.md`. A implementação real (`functions/src/reagentes.ts`) segue divergente e não foi alterada.

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
M0 = VALIDATED (erratum textual corrigido); M1 = VALIDATED (não afetado); M2.0/M2.1/M2.1a = validações históricas; M2.1b = DOCUMENTATION_VALIDATED; M2.1c = VALIDATED; M2.1d = VALIDATED (CUE local de 29 colunas, `origem_tara`); M2.2 = VALIDATED (Alloy: identidade química efetiva e coerência de estado); M2.3 = VALIDATED (IR v3, proveniência estruturada, validação da evidência M2.2 e geração determinística dos fragmentos M2 integrados em M2.4); M2.4 = VALIDATED (composição aditiva M0 × M2.2: 12+5 checks UNSAT, 10+1 witnesses SAT, guard de drift, evidência versionada, fragmento composto, LaTeX/PDF integrado); M2 = VALIDATED; M3 = VALIDATED (Seção 5 reconciliada; CUE de 33 colunas no fechamento original, **34** após o erratum pré-M5 com o snapshot `vencido_na_retirada`; `loan_state.als` com 11 checks UNSAT + 11 witnesses SAT; projeção `emprestimo_reagente` e `baseline_documental_m3` no IR v3; `validation_m3` Rust; fragmentos M3 e `Formal-Spec-M3.tex` integrados; PDF 313 páginas; erratum pós-validação: anomalia resolvida representável e `medida_utilizada >= 0`, 25 fixtures M3; erratum pré-M5: snapshot imutável, 28 fixtures M3). HQs M2 OPEN = 0; HQs M3 OPEN = 0. Finding 4 (lock patrimonial) e Finding 5 (desvínculo individual) reconciliados documentalmente; implementação real permanece dívida de M9/M10. M4 = VALIDATED (composição operacional de retirada/devolução em `withdrawal_return.als`: **40 checks UNSAT + 20 witnesses SAT = 60 resultados** após o erratum pré-M5, que removeu `Devolucao.vencidoNoRetorno`, adicionou o snapshot `vencido_na_retirada` e a classificação do retorno; guard de drift das origens M2.4/M3 + `doc_contract.test.mjs`; `validation_m4` Rust com 60 resultados; `Formal-Spec-M4.tex` e PDF de 313 páginas; erro mecânico da Seção 10.5/7 corrigido para autoridade persistida). HQs M2/M3/M4 OPEN = 0. Finding 4 (lock patrimonial) e Finding 5 (desvínculo individual) reconciliados documentalmente; implementação real permanece dívida de M9/M10. M5 = DOCUMENTATION_VALIDATED (extravio/reencontro/quarentena consolidados documentalmente; formalização executável pendente). M6 = DOCUMENTATION_VALIDATED (Q06/tara/metrologia; três rotas; sem correção administrativa metrológica na V1). M7 = DOCUMENTATION_VALIDATED (idempotência: comando/evento/job/materialização; identidade `(uid, tipo_operacao, payload_hash)`; `idOperacao` obrigatório). M8 documental = NOT_STARTED. Esta rodada não certifica execução de backend nem concorrência.
