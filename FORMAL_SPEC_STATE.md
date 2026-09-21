# LCQUI — Formal Specification State

## 1. Propósito desta fase
Camada formal ADITIVA CUE + Alloy + Rust → LaTeX. Rodada atual: realinhamento formal local M2.1d, pós-consolidação documental HQ-M2-004..007. Escopo autorizado: CUE `specification/cue/`, fixtures do grupo `frasco-completo` e arquivos de status. Aplicação, Rules executáveis e generated preservados. M0/M1 continuam historicamente validados; M2.2 NÃO iniciado. O CUE M2.1d realinha o recorte local a 29 colunas, incluindo `origem_tara` e invariantes locais de proveniência de tara; não certifica ciclo de vida, cache nem contratos relacionais globais, reservados a M2.2.

## 2. Baseline congelado da Fase 3B
- FUNCTIONAL_SHA = db29ea2f17dc785fb0b44ffb3aec16db29c45e94
- EVIDENCE_HEAD = 9d97ed30b4e7b7805f3d71802816d5d16abc496e
- SEMANTIC_GATE = PASS; FASE 3B = ENCERRADA.
- Auditoria terminou com liberação CUE/Alloy nos worklogs CHECKPOINT.md, VALIDACAO_LATEX.md e LOTE_3B_CONTRACT_CARDS.md em documentation/worklogs/consolidacao-gemini/. Foram lidos e preservados. CHECKPOINT histórico menciona 208 páginas; registro final db29ea2f documenta 211. Não reabrir essa auditoria.
- Regras congeladas: unknown/nonmeasurable/peso ausente != zero; disponibilidade DISPONIVEL|EMPRESTADO significa ausência/presença de empréstimo ativo, não aptidão; conteudo_nominal é original do fabricante; extravio não inventa peso_retorno; reencontro exige quarentena e não reabre empréstimo; Q06=max(0,peso_saida-peso_retorno), tara posterior não reescreve histórico; mesma chave+ator+payload canônico produz mesmo resultado, divergência rejeitada; estoque mínimo Especificação×Almoxarifado, escassez qtd_aptos<limite; timezone America/Sao_Paulo.

## 3. Branch atual
`feat/formal-spec-cue-alloy`. HEAD de entrada M2.0 e baseline documental M2: `9df335bc977bfcf16668bca4baf5f9ed50c2da1a`. HEAD de entrada M2.1d: `69726049708398eacb2018534e88c49633f53d06`. Árvore inicialmente limpa, referência local origin sincronizada. Baseline histórico M0/M1: `db29ea2f17dc785fb0b44ffb3aec16db29c45e94`; fechamento M1: `18d811aee11afc730960daa956af167e638b0ba9`. Não criar branch.

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
| M2 | Frasco completo (M2.0/M2.1 validados) | IN_PROGRESS |
| M3 | Empréstimo | NOT_STARTED |
| M4 | Retirada/devolução completas | NOT_STARTED |
| M5 | Extravio/reencontro/quarentena | NOT_STARTED |
| M6 | Q06/tara | NOT_STARTED |
| M7 | Idempotência | NOT_STARTED |
| M8 | Estoque/escassez/notificações | NOT_STARTED |
| M9 | Autorização/usuários | NOT_STARTED |
| M10 | Patrimônio | NOT_STARTED |
| M11 | Turmas/demais domínios | NOT_STARTED |
| M12 | Integração/redução de duplicação normativa | NOT_STARTED |

## 9. Milestone atual
M2 IN_PROGRESS: M2.0 VALIDATED; M2.1 VALIDATED; M2.1a VALIDATED; M2.1b DOCUMENTATION_VALIDATED; M2.1c VALIDATED; M2.1d VALIDATED; M2.2–M2.4 NOT_STARTED.

Estado formal explícito após M2.1d:
- M0 formal = VALIDATED; M0 erratum textual = corrigido (`Formal-Spec-M0.tex`: extraviado indisponível e fisicamente inapto). CUE/Alloy/Rust/IR M0 intactos.
- M1 = VALIDATED, não afetado; nenhum schema/generated/contrato M1 tocado.
- M2.0 = validação histórica; M2.1 = validação histórica; M2.1a = validação histórica.
- M2.1b = documentação reconciliada historicamente; decisões HQ004..007 foram atualizadas na rodada documental atual.
- M2.1c = CUE M2 realinhado à documentação M2.1b (VALIDATED); 28 colunas e implicação de abertura histórica.
- M2.1d = CUE M2 realinhado à documentação pós-HQ-M2-004..007 (VALIDATED); 29 colunas com `origem_tara` e três invariantes locais de proveniência de tara.
- M2.2 = NOT_STARTED.

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
Planejar/iniciar M2.2 em tarefa separada, usando o schema local M2.1d como baseline congelado. Não solicitar novamente decisões HQ-M2-004..007. Não iniciar M2.2 automaticamente.

O CUE M2.1d já realinha o recorte local a 29 colunas com origem_tara e as invariantes locais de proveniência de tara. Saldo corrente, custódia encerrada com pendência, quarentena, resolução auditável, independência FLOW e transições de ciclo de vida são entradas para a futura modelagem relacional M2.2, que permanece NOT_STARTED. Não inferir prova desses contratos pelos gates históricos. Proveniência/IR/geração M2 permanece M2.3. M2-IDENTIDADE-001 não foi alterado.

## 13. Arquivos que devem ser lidos para continuar
1. Este arquivo, ponto único de retomada.
2. documentation/worklogs/formal-spec/M1_VALIDATION.md e specification/README.md.
3. specification/cue/domain/{frasco,campos_catalogo,resumo_reagente,especificacao_reagente}.cue; docs/projection.cue; firestore/mapeamentos.cue; tests/.
4. specification/alloy/reagents/withdrawal.als e tools/formal/check.mjs.
5. tools/spec-doc/src/{ir,render,main,validation,latex}.rs, Cargo.toml/lock, tests/fixtures/ir-v1.json e justfile.
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
Relações/IR/documentação do Frasco completo e demais domínios M3–M12; composição, integridade global/imutabilidade do catálogo, contratos completos de retirada, schemas Firestore completos, testes specification→Firebase Emulator e CI hospedada. M1 já contém os dois registros normalizados e notas de mapeamento. Nenhuma aplicação TypeScript gerada/substituída. Documentação humana original preservada.

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

## 20. Estado do Git
M2.1d entrada `69726049708398eacb2018534e88c49633f53d06`, árvore limpa. Commits da unidade: `fd6d3bc1` (`feat(cue): realign M2 bottle schema with M2.1d origem_tara`; CUE + 22 fixtures existentes), `c6bad174` (`test(cue): add M2.1d tara-origin fixtures`; 8 fixtures novas) e `f27a7972` (`docs(spec): record M2.1d CUE realignment`; este worklog e os arquivos de status). Ao encerrar a unidade, os três commits eram apenas locais e `origin/feat/formal-spec-cue-alloy` ainda apontava para `69726049`; nenhum push foi executado pela unidade. `git diff --check` PASS; `build/spec-ir.json` e `build/formal-validation.json` inalterados.

Estado remoto atualmente verificado: `origin/feat/formal-spec-cue-alloy` = `f27a797289dfa28ec4f3b445feb5599900cd4410`, portanto os três commits M2.1d estão publicados. O Git permite afirmar apenas que a remota mudou; o push ocorreu após o encerramento da unidade, fora da execução M2.1d.
M2.1c entrada fc94fa87, sem alterações preexistentes. Commit desta unidade: `1655a5bb` (`feat(cue): realign M2 bottle schema with M2.1b documentation`), com push confirmado. Alterados: `specification/cue/domain/frasco_completo.cue` e 22 fixtures do grupo `frasco-completo` (21 alteradas + 1 nova). `git diff --check` PASS; árvore sincronizada após o envio.
Registro histórico M2.1b: entrada de874a4b; checkpoint 1 `33c462fc` (docs(frasco): reconcile registration, balance and quarantine semantics); checkpoint 2 `252e4e50` (docs(materialization): define rebuildable daily summaries); checkpoint final `facd2882` (docs(spec): record reconciled M2 documentation state); complemento de gates docs(spec): finalize M2.1b gate record. Compilação LaTeX exit 0, 267 páginas, zero erros/refs indefinidas; `documentation/main.pdf` atualizado nessa unidade.
Registro histórico: M2.1a entrada ce299d42; checkpoints documentais 4e0e60e5/88f913fe; CUE f340500f (fix(cue): align bottle schema with audited local constraints).

## 21. Como uma nova IA deve continuar
Ler este arquivo; confirmar status/log/branch; ler fontes indicadas; repetir gates mínimos e seguir seção 12. Não replanejar do zero nem reabrir 3B. Atualizar estado após unidades pequenas/validações/descobertas, antes de tarefas longas e antes/depois de commits. Manter tudo salvo para retomada em outra máquina. Usar NOT_STARTED/IN_PROGRESS/BLOCKED/IMPLEMENTED/VALIDATED; só VALIDATED conclui um escopo. Não alegar homologação integral a partir de checks limitados.

## 22. Definition of Done restante
M0 = VALIDATED (erratum textual corrigido); M1 = VALIDATED (não afetado); M2.0/M2.1/M2.1a = validações históricas; M2.1b = DOCUMENTATION_VALIDATED; M2.1c = VALIDATED; M2.1d = VALIDATED (CUE local de 29 colunas, `origem_tara` e invariantes locais de proveniência de tara); M2.2/M2.3/M2.4 = NOT_STARTED; M2 = IN_PROGRESS. HQ-M2-004/005/006/007 RESOLVED documentalmente; não aguardam resposta humana. O realinhamento local das novas extensões está cumprido por M2.1d. Faltam relações Alloy (M2.2), proveniência/IR/geração (M2.3) e integração LaTeX/PDF com gates próprios. Esta rodada não certifica ciclo de vida, cache, execução de backend nem compilação integrada.
