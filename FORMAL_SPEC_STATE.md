# LCQUI — Formal Specification State

## 1. Propósito desta fase
Camada formal ADITIVA: CUE + Alloy especificam a aplicação existente; Rust apenas gera documentação LaTeX determinística. Nesta sessão foi implementado somente M0. Não reiniciar auditoria, não fazer migração big-bang, não criar branch nem substituir UI/backend.

## 2. Baseline congelado da Fase 3B
- FUNCTIONAL_SHA = db29ea2f17dc785fb0b44ffb3aec16db29c45e94
- EVIDENCE_HEAD = 9d97ed30b4e7b7805f3d71802816d5d16abc496e
- SEMANTIC_GATE = PASS; FASE 3B = ENCERRADA.
- Worklogs finais lidos: CHECKPOINT.md, VALIDACAO_LATEX.md, LOTE_3B_CONTRACT_CARDS.md em documentation/worklogs/consolidacao-gemini/. A auditoria terminou com liberação para CUE/Alloy. O CHECKPOINT histórico menciona 208 páginas; o registro final db29ea2f em VALIDACAO_LATEX documenta 211. Nenhum deles foi alterado.
- Regras congeladas: unknown/nonmeasurable/peso ausente != zero; disponibilidade DISPONIVEL|EMPRESTADO indica ausência/presença de empréstimo ativo, não aptidão; conteudo_nominal é original do fabricante/rótulo; extravio não inventa peso_retorno; reencontro exige quarentena e não reabre empréstimo; Q06=max(0,peso_saida-peso_retorno), tara posterior não reescreve histórico; mesma chave+ator+payload canônico produz mesmo resultado, divergência rejeitada; estoque mínimo Especificação×Almoxarifado, escassez qtd_aptos<limite; timezone America/Sao_Paulo.

## 3. Branch atual
`feat/formal-spec-cue-alloy`. Confirmada antes de qualquer escrita; HEAD inicial EVIDENCE_HEAD. Não criar outra branch.

## 4. Estrutura existente preservada
Inventário real realizado antes de criar specification/ ou tools/spec-doc/; Git inicialmente limpo:
- `frontend/` EXISTE (sem hífen; não há `front-end/`): UI Next/React/TypeScript e package.json próprios preservados; única correção posterior: remoção de prop não consumida em reagentes/page.tsx (d13d25d3).
- `functions/` EXISTE: backend Firebase/Cloud Functions TypeScript, testes Jest, package.json, assets e scripts preservados; única correção posterior: fixtures de roles.test.ts (d13d25d3). Nenhuma lógica de backend foi alterada.
- Raiz: README.md, firebase.json, firestore.rules, storage.rules, .firebaserc, flake.nix/lock preservados. Não existem package.json nem firestore.indexes.json na raiz; não foram inventados.
- documentation/: seções 1–12, archive, decisões e worklogs 3B preservados. main.tex recebeu somente input aditivo; main.pdf atualizado após build e inspeção. main.aux/log/toc históricos não foram sobrescritos.
- .gitignore recebeu apenas exclusões de tools/spec-doc/target e build/latex. .agents e .codex protegidos; frontend/AGENTS.md e os guias Next locais de TypeScript/componentes foram lidos antes da correção pontual da UI.
- Diff contra EVIDENCE_HEAD inicialmente vazio. Agora contém somente a prop removida e fixtures corrigidas em frontend/functions; Firebase/flake/worklogs 3B e lógica de backend continuam sem alterações.

## 5. Divisão de autoridade
- frontend: UI real.
- functions: backend real TypeScript/Firebase.
- Firestore: banco operacional real.
- CUE: estrutura/tipos/enums/nulabilidade da fatia migrada.
- Alloy: relações, invariantes e transição abstrata no scope declarado.
- Rust: transformação determinística, sem backend ou geração de aplicação.
- LaTeX: apresentação, rationale, UX e conteúdo humano preservado.
Baseline 3B continua normativo para todo conteúdo ainda não migrado.

## 6. Ambiente e ferramentas
Confirmados: CUE linguagem v0.17.1 (build devel), Alloy 6.2.0, cargo 1.97.0, rustc 1.97.1, rustfmt, Node v26.8.1, jq. Just 1.58.0 disponibilizado via Nix; latexmk 4.87/TeX Live Nix já existente. Python ausente. Docker não introduzido; flake da aplicação intacto.
Guia seguido: documentation/COMPILACAO_NIX_LCQUI.md.
Nesta máquina, comandos completos sem nova resolução Nix:
```sh
export CARGO_HOME=/tmp/lcqui-cargo
export PATH=/nix/store/z4czsax3mdyxx77mwb0yjarnzb1rip00-just-1.58.0/bin:/nix/store/hl0dgwqvnh7ls66xn4hmdxay7alrviy3-texlive-2025-r78234-final-env/bin:$PATH
just formal-check
```
Esses caminhos são evidência local, não contrato portável. Alternativa: `nix shell nixpkgs#texliveFull nixpkgs#just -c just formal-check`, mantendo CUE/Alloy/Node/Rust disponíveis. Cargo.lock versionado; dependências serde/serde_json/sha2 baixadas em /tmp/lcqui-cargo. Em máquina nova usar cargo fetch --locked antes de modo offline. Versões do gerador fixadas pelo lock; revisão do ambiente CI hospedado ainda não provisionada.
Sandbox: .git somente leitura exige escalonamento para commits; daemon Nix exige escalonamento; subprocessos Node (spawnSync cue) retornam EPERM no sandbox, wrapper executado escalonado; cargo fetch inicialmente falhou por DNS e foi repetido escalonado com sucesso. Nenhuma rejeição automática pendente.

## 7. Arquitetura formal
`specification/cue/domain/frasco.cue` contém descritores normativos #Enum/#Boolean. Eles geram #Frasco e metadados documentais, sem segundo schema. `docs/projection.cue` exporta ir concreto, com exemplo unificado a #Frasco.
`cue export` → build/spec-ir.json; Alloy CLI real → receipt temporário → build/formal-validation.json; Rust → documentation/generated/{entities,invariants} e MANIFEST.json; Formal-Spec-M0.tex integra fragmentos em main.tex → PDF.
A orquestração Node apenas executa ferramentas/normaliza resultados. Rust não gera Alloy nem TypeScript. Hash do IR vincula etapas, verificação de vocabulário reduz drift; não se afirma tradução ou equivalência semântica automática CUE/Alloy.

## 8. Milestones planejados
| Milestone | Escopo | Estado |
|---|---|---|
| M0 | Infraestrutura e fatia vertical | VALIDATED |
| M1 | Resumo_Reagente + Especificacao_Reagente | NOT_STARTED |
| M2 | Frasco completo | NOT_STARTED |
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
M0 VALIDATED. Pipeline CUE → IR → Alloy/resultados → Rust → .tex → LaTeX/PDF validado; as duas pendências preexistentes foram diagnosticadas e resolvidas no commit d13d25d3. TypeScript de frontend/functions e 12 testes de domínio passam. A aplicação existente continua nos mesmos diretórios; regras 3B e lógica de backend intactas. Essa validação cobre a fatia M0 e os checks descritos, não homologação ponta a ponta ou Firebase Emulator. M1 continua NOT_STARTED.

## 10. Trabalho concluído
- Inventário, estado inicial e commit exclusivo 672fc65a antes da camada formal.
- CUE: três campos (estado_fisico_frasco, disponibilidade, em_quarentena), schema fechado parcial, projeção concreta, 2 fixtures válidas e 5 inválidas.
- Alloy: INV-FRASCO-001/BloqueioFisico e INV-EMPRESTIMO-001/Unicidade, duas testemunhas, scopes explícitos.
- Wrapper tools/formal/check.mjs exige comandos/scopes/resultados esperados e normaliza receipt sem timestamps. Falhas preservam receipt em /tmp.
- Rust: módulos main/ir/latex/render/validation; escaping central para _ % & # $ { } ~ ^ e barra invertida; hashes SHA-256; saída ordenada; --check rejeita stale/arquivos extras.
- READMEs de todas as camadas e cinco knowledge docs; justfile com todos os comandos previstos mais rust-check.
- Integração LaTeX aditiva e main.pdf de 213 páginas revisado.
- Worklogs duráveis: documentation/worklogs/formal-spec/M0_VALIDATION.md e M0_BASELINE_DIAGNOSIS.md.
- APP-BASELINE-001/002 resolvidas por manutenção pontual em d13d25d3: uma prop não consumida removida; fixtures de duas regras distintas separadas, sem alterar autorização.

## 11. Trabalho em andamento
Fechamento do M0 concluído; nenhuma implementação de M1 iniciada nesta rodada. Preparando commit documental de fechamento e sincronização da branch. CI hospedada ainda não conectada; just formal-check é o gate local validado. Nenhum processo de validação pendente.

## 12. Próxima ação EXATA
Iniciar somente M1 na próxima rodada: confirmar branch/status/log e executar just formal-check com o ambiente da seção 6; ler as entidades Resumo_Reagente e Especificacao_Reagente na Section-4-Modelagem-Entidades-SQL-3FN.tex e respectivas projeções na Section-5-Notas-de-Mapeamento-para-Firestore.tex. Registrar no estado o recorte e as fontes antes de criar specification/cue/domain/resumo_reagente.cue e especificacao_reagente.cue. Derivar tipos/enums/nulabilidade do baseline, adicionar fixtures válidas/inválidas e planejar evolução compatível da projeção IR (hoje singular, versão 1) e do gerador. Executar cue fmt/vet antes do primeiro commit M1. Não modelar Frasco completo, Q06 ou outros milestones junto; qualquer inconsistência deve ser registrada como CONTRAEXEMPLO PÓS-3B antes de mudar regra.

## 13. Arquivos que devem ser lidos para continuar
1. Este arquivo, ponto único de retomada.
2. documentation/worklogs/formal-spec/M0_VALIDATION.md e specification/README.md.
3. specification/cue/domain/frasco.cue, docs/projection.cue, tests/.
4. specification/alloy/reagents/withdrawal.als e tools/formal/check.mjs.
5. tools/spec-doc/src/ e Cargo.toml/lock; justfile.
6. specification/knowledge/AI_HANDOFF.md e FORMAL_SPEC_ARCHITECTURE.md.
7. documentation/COMPILACAO_NIX_LCQUI.md, Formal-Spec-M0.tex.
8. Fonte semântica: Section-4-Modelagem-Entidades-SQL-3FN.tex (Frasco, linhas ~340–390) e Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/Section-10-Subsection-5-Fluxo-de-Reagentes.tex (retirada ~407–446). Seção 10.7 contém jobs, não retirada.
9. Para M1: documentation/Section-5-Notas-de-Mapeamento-para-Firestore.tex, junto das entidades correspondentes da Seção 4. O diagnóstico de aplicação está concluído em M0_BASELINE_DIAGNOSIS.md.

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
Não executar docs-generate antes do gate stale quando a intenção é detectar divergência. formal-check não regenera .tex; recalcula entradas, exige --check, compila e roda git diff generated.
Direto: `cd specification/cue && cue fmt ./... && cue vet ./... && cue export ./docs -e ir`.
Preservação:
```sh
git diff 9d97ed30 -- frontend functions
git diff 9d97ed30 --exit-code -- functions/src/auth.ts firebase.json firestore.rules storage.rules .firebaserc flake.nix flake.lock documentation/worklogs/consolidacao-gemini
functions/node_modules/.bin/tsc --noEmit -p functions/tsconfig.json
frontend/node_modules/.bin/tsc --noEmit --incremental false -p frontend/tsconfig.json
npm test --prefix functions -- --runInBand src/__tests__/domain
```
Todas essas verificações passaram após d13d25d3. O diff frontend/functions deve conter apenas as duas correções descritas na seção 16, até iniciar nova manutenção autorizada. `functions` build script usa `|| true`, por isso foi usado tsc direto, sem mascarar erro.
PDF: `just docs-build` grava build/latex/main.pdf; inspecionar log final e páginas alteradas antes de copiar para documentation/main.pdf. Build sozinho não homologa aplicação.

## 15. Validações já executadas
- CUE fmt/vet/export e todas as fixtures PASS.
- Alloy 6.2.0, SAT4J: BloqueioFisico e Unicidade UNSAT; Testemunha e DisponivelNaoApto SAT; scope 4, exatamente 2 Estado, bitwidth 4. Nenhum contraexemplo encontrado.
- Rust fmt/test (2 testes)/clippy --all-targets -D warnings PASS. Testes cobrem escaping e rejeição de hashes/resultados alterados.
- --check PASS; alteração deliberada em cópia /tmp detectada como stale; duas gerações em cópia /tmp comparadas recursivamente, bytes idênticos.
- just docs-generate, docs-check e formal-check PASS. Última mudança tipográfica validada depois com just docs-build.
- PDF final: exit 0, 213 páginas, zero erros/referências indefinidas, 21 Overfulls herdados (mesma quantidade do baseline), nenhum no trecho M0. Páginas 212–213 renderizadas com Poppler e inspecionadas após correção. Copiado para main.pdf somente depois.
- Retomada: falhas preexistentes reproduzidas antes das correções. Após correção: tsc functions PASS, tsc frontend PASS, Jest domain 2 suítes/12 testes PASS.
- just formal-check repetido na retomada: PASS após escalonamento conhecido para Node; CUE/Alloy/Rust/stale reexecutados. latexmk confirmou PDF atualizado (fontes LaTeX não mudaram, nenhuma recompilação ou nova cópia do PDF necessária).
- Diff de preservação: somente prop e fixtures reparadas; lógica de backend/configurações/worklogs 3B intactos; git diff --check PASS.

## 16. Contraexemplos / problemas encontrados
Nenhum CONTRAEXEMPLO PÓS-3B encontrado pelo Alloy. Se surgir, registrar antes de alterar regra: ID, assertion, scope, estado inicial/final, regra 3B, interpretação, classificação BUG_MODELO_FORMAL/TRADUCAO_INCORRETA/LACUNA_POS_3B/CONTRADICAO_REAL.
Problemas de implementação preexistentes RESOLVIDOS (não são contraexemplos formais):
- APP-BASELINE-001: frontend/src/app/reagentes/page.tsx:524, TS2322: prop tipoSubstanciaResumo não existe em ModalProps. Resolvido em d13d25d3 removendo somente a prop não declarada nem consumida. Typecheck PASS; nenhuma alteração no comportamento interno do modal.
- APP-BASELINE-002: roles.test.ts, caso Bolsista+Gestor sem Aluno, espera mensagem de incompatibilidade, recebe "Bolsista exige papel Aluno." em auth.ts:98. Resolvido em d13d25d3: casos sem Aluno preservados em teste específico; fixture Aluno+Bolsista+Gestor atinge a validação de incompatibilidade. Expectativas específicas e classe HttpsError mantidas; 12/12 testes passam. A função de autorização não foi modificada.
Problemas instrumentais resolvidos: alloy6 --help não existe (usar alloy6 help exec); Python ausente (Node usado); CUE extensão de definição fechada com & rejeitada (corrigido por embedding, sem mudar regra); caminho longo do manifest causou Overfull (corrigido e reinspecionado). Bloqueios de sandbox e respectivas soluções na seção 6.

## 17. Decisões tomadas nesta fase
- Preservar árvore real frontend/ e functions/; nunca inventar árvore idealizada.
- M0 é filtro físico necessário, não elegibilidade operacional completa. Validade, autorização, aceite, Q06, idempotência e concorrência Firestore fora do modelo.
- Coerência inicial é hipótese Alloy; coerência final é assertion, não fact. Estado abstrato não envolvido em transição não é certificado operacionalmente.
- EXTRAVIADO + DISPONIVEL é fixture válida e testemunha não apta; nenhuma regra de recuperação redefinida.
- Gerar apenas conteúdo mecânico; rationale escrito à mão no LaTeX. Templates simples em funções Rust, sem diretórios vazios.
- Resultados normalizados e generated versionados; target e build/latex ignorados. PDF humano com today não promete identidade binária entre datas/TeX diferentes; fragmentos/manifest são determinísticos.
- As duas falhas registradas receberam diagnóstico e correções pontuais em unidade separada (d13d25d3), sem redesign da aplicação, regra 3B ou alteração da lógica de autorização. Não ampliar esse reparo para uma reauditoria.

## 18. Itens ainda não migrados
Frasco completo, Firestore/projeções, contratos completos de retirada, demais domínios M1–M12, testes de ligação specification→Firebase Emulator e CI hospedada. Nenhuma aplicação TypeScript gerada/substituída. Documentação humana não foi desnormatizada em massa.

## 19. Commits desta fase
- 672fc65a — chore(spec): add formal specification state (somente estado, antes da camada).
- 0f679e33 — feat(spec): validate partial bottle model with CUE and Alloy.
- 2e5c8f79 — feat(spec-doc): generate deterministic bottle documentation.
- cbd0eba4 — docs(spec): integrate and validate M0 formal documentation.
- e95a42ab — chore(spec): save final handoff state (push anterior concluído).
- d13d25d3 — fix: resolve baseline typecheck and role test failures.
- Checkpoint de fechamento desta rodada: assunto `docs(spec): mark M0 validated and prepare M1 handoff`; resolver SHA por `git log -1 --format=%H --grep="mark M0 validated"` (um commit não contém seu próprio SHA).

## 20. Estado do Git
Após d13d25d3: árvore limpa, branch correta, um commit à frente de origin. Em seguida apenas estado e worklog M0 foram atualizados para fechamento documental. O checkpoint de assunto indicado na seção 19 será commitado e enviado a origin/feat/formal-spec-cue-alloy; confirmar o resultado por git status --short --branch e git log, sem presumir sucesso apenas deste registro pré-envio. Manter tudo commitado para retomada em outra máquina. Nenhum processo necessário em execução.

## 21. Como uma nova IA deve continuar
Ler este arquivo; confirmar status/log/branch; ler fontes indicadas; repetir gates mínimos e seguir seção 12. Não replanejar do zero nem reabrir 3B. Atualizar este arquivo após unidades pequenas, validações, descobertas, antes de tarefas longas e antes/depois de commits. Nunca descartar atualização pós-commit do estado. Usar NOT_STARTED/IN_PROGRESS/BLOCKED/IMPLEMENTED/VALIDATED; só VALIDATED conclui um escopo. Não marcar homologação operacional com testes falhando.

## 22. Definition of Done restante
Nenhum item obrigatório de M0 pendente no escopo validado. A fatia vertical, determinismo, rejeição de stale, PDF, continuidade e preservação arquitetural foram verificados; as duas pendências de checks da aplicação foram resolvidas. Permanecem para etapas futuras: M1–M12, CI hospedada e testes specification→Firebase Emulator. Não confundir fechamento do M0 com certificação integral da aplicação. Próxima unidade exata na seção 12; não iniciar outro milestone silenciosamente.
