# LCQUI — Formal Specification State

## 1. Propósito desta fase
Camada formal ADITIVA CUE + Alloy + Rust → LaTeX. Rodada atual: M2.1, registro completo do frasco em CUE. M0/M1 permanecem históricos validados; M2 completo ainda não validado. Não reiniciar auditoria global nem substituir aplicação.

## 2. Baseline congelado da Fase 3B
- FUNCTIONAL_SHA = db29ea2f17dc785fb0b44ffb3aec16db29c45e94
- EVIDENCE_HEAD = 9d97ed30b4e7b7805f3d71802816d5d16abc496e
- SEMANTIC_GATE = PASS; FASE 3B = ENCERRADA.
- Auditoria terminou com liberação CUE/Alloy nos worklogs CHECKPOINT.md, VALIDACAO_LATEX.md e LOTE_3B_CONTRACT_CARDS.md em documentation/worklogs/consolidacao-gemini/. Foram lidos e preservados. CHECKPOINT histórico menciona 208 páginas; registro final db29ea2f documenta 211. Não reabrir essa auditoria.
- Regras congeladas: unknown/nonmeasurable/peso ausente != zero; disponibilidade DISPONIVEL|EMPRESTADO significa ausência/presença de empréstimo ativo, não aptidão; conteudo_nominal é original do fabricante; extravio não inventa peso_retorno; reencontro exige quarentena e não reabre empréstimo; Q06=max(0,peso_saida-peso_retorno), tara posterior não reescreve histórico; mesma chave+ator+payload canônico produz mesmo resultado, divergência rejeitada; estoque mínimo Especificação×Almoxarifado, escassez qtd_aptos<limite; timezone America/Sao_Paulo.

## 3. Branch atual
`feat/formal-spec-cue-alloy`. HEAD de entrada M2.0 e baseline documental M2: `9df335bc977bfcf16668bca4baf5f9ed50c2da1a`. Árvore inicialmente limpa, referência local origin sincronizada. Baseline histórico M0/M1: `db29ea2f17dc785fb0b44ffb3aec16db29c45e94`; fechamento M1: `18d811aee11afc730960daa956af167e638b0ba9`. Não criar branch.

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
M2 IN_PROGRESS: M2.0 VALIDATED; M2.1 VALIDATED; M2.2–M2.4 NOT_STARTED. M0/M1 VALIDATED historicamente nos respectivos worklogs; nesta rodada somente regressão CUE reexecutada. A Auditoria 8 alterou M0 depois de M1: enum INDISPONIVEL e testemunha IndisponivelNaoApto; preservar o modelo atual, não restaurar a antiga testemunha DisponivelNaoApto.

## 10. Trabalho concluído
- Inventário e commit exclusivo do estado 672fc65a antes da camada formal.
- M0: CUE/IR/Alloy/Rust/LaTeX/PDF, escaping central, manifest SHA-256, dois invariantes e duas testemunhas.
- Duas falhas preexistentes de aplicação diagnosticadas e reparadas em d13d25d3; TypeScript de ambos os projetos e 12 testes de domínio passaram no fechamento M0.
- M1: 8 campos de Resumo e 11 de Especificação, frequência condicional, densidade NUMERIC(8,4), limites VARCHAR, enums, null e par com FK coerente; 35 fixtures novas além das 7 M0.
- IR v2 de três entidades, leitura v1 mantida, quatro fragmentos adicionais de entidades/mapeamentos; arquivos M0 idênticos.
- READMEs e knowledge atualizados; justfile mantém todos os comandos previstos mais rust-check.
- LaTeX aditivo e main.pdf de 216 páginas revisado.
- Worklogs duráveis: M0_VALIDATION.md, M0_BASELINE_DIAGNOSIS.md e M1_VALIDATION.md em documentation/worklogs/formal-spec/.

## 11. Trabalho em andamento
M2.1 VALIDATED. HEAD de entrada: 0ee6c0ce5c688359cbf88a10f64c7403df662413, árvore inicialmente limpa. #FrascoCompleto adicional com 27 campos, descritores compartilhados de valor/metadados, presença ! e null explícito, sem defaults SQL. XOR local, abertura histórica implica data null, prazo declarado positivo. DATE é string YYYY-MM-DD apenas lexical; TIMESTAMP string sem formato/timezone imposto. Sem regras físicas inventadas. Worklog: documentation/worklogs/formal-spec/M2_1_CUE_FRASCO_COMPLETO.md.
Gates PASS: just spec-check (M0 7 + M1 35 + M2.1 19 = 61 fixtures, fmt/vet), 27/27 remoções individuais rejeitadas, diagnósticos das 14 inválidas conferidos, 27 nomes/ordem comparados ao SQL, git diff --check. M0 e todos os arquivos fora do recorte preservados contra HEAD de entrada. Não executados Alloy, export IR, Rust, LaTeX/PDF. Implementação commitada em b475cd2e e push confirmado; encerrar nesta unidade, sem iniciar M2.2.

## 12. Próxima ação EXATA
Auditar M2.1 e iniciar M2.2 Alloy para identidade química, preservando assertions M0.
Na próxima execução: confirmar branch/status/HEAD; ler worklog M2.1, revisar descritores/schema e fixtures, especialmente limites da representação temporal e condicionais deliberadamente adiadas. Só após auditoria independente iniciar as relações Frasco/Lote/Especificacao e testemunhas das duas rotas. Preservar BloqueioFisico, Unicidade, Testemunha e IndisponivelNaoApto e atualizar atomicamente contratos de resultados quando necessário. M2.2 permanece NOT_STARTED.
Hash global IR/Rust continua histórico; migração explícita somente em M2.3. Não alterar a fonte SQL de M2-IDENTIDADE-001 silenciosamente.

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
M2.0 commitado/pushado em bc57fbac, handoff 0ee6c0ce. M2.1 tem entrada limpa em 0ee6c0ce. Arquivos desta unidade: domain/campos_frasco.cue, domain/frasco_completo.cue, 19 fixtures tests/frasco-completo, uma adição de grupo em tools/formal/check.mjs, estado e worklog M2.1. Commit validado: b475cd2e — feat(cue): model complete reagent bottle record. Push confirmado para origin/feat/formal-spec-cue-alloy (0ee6c0ce..b475cd2e). Este registro é o handoff documental adicional, a ser enviado à mesma branch. Nenhuma mudança local preexistente.

## 21. Como uma nova IA deve continuar
Ler este arquivo; confirmar status/log/branch; ler fontes indicadas; repetir gates mínimos e seguir seção 12. Não replanejar do zero nem reabrir 3B. Atualizar estado após unidades pequenas/validações/descobertas, antes de tarefas longas e antes/depois de commits. Manter tudo salvo para retomada em outra máquina. Usar NOT_STARTED/IN_PROGRESS/BLOCKED/IMPLEMENTED/VALIDATED; só VALIDATED conclui um escopo. Não alegar homologação integral a partir de checks limitados.

## 22. Definition of Done restante
M2.0 = VALIDATED; M2.1 = VALIDATED; M2.2 = NOT_STARTED; M2.3/M2.4 = NOT_STARTED. M2 completo permanece IN_PROGRESS. Faltam auditoria independente M2.1, relações Alloy, migração de proveniência/IR/geração, LaTeX/PDF e gates correspondentes. Não atribuir provas relacionais/globais à validação estrutural CUE.
