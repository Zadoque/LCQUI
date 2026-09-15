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
- `frontend/` EXISTE (sem hífen; não há `front-end/`): UI Next/React/TypeScript e package.json próprios, preservados integralmente.
- `functions/` EXISTE: backend Firebase/Cloud Functions TypeScript, testes Jest, package.json, assets e scripts, preservados integralmente.
- Raiz: README.md, firebase.json, firestore.rules, storage.rules, .firebaserc, flake.nix/lock preservados. Não existem package.json nem firestore.indexes.json na raiz; não foram inventados.
- documentation/: seções 1–12, archive, decisões e worklogs 3B preservados. main.tex recebeu somente input aditivo; main.pdf atualizado após build e inspeção. main.aux/log/toc históricos não foram sobrescritos.
- .gitignore recebeu apenas exclusões de tools/spec-doc/target e build/latex. .agents e .codex protegidos; frontend/AGENTS.md não se aplica à camada formal e UI não foi editada.
- Diff contra EVIDENCE_HEAD de frontend/functions/Firebase/flake/worklogs 3B: vazio, confirmado.

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
| M0 | Infraestrutura e fatia vertical | IMPLEMENTED; pipeline formal VALIDATED; ressalva operacional abaixo |
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
M0 IMPLEMENTED. Pipeline CUE → IR → Alloy/resultados → Rust → .tex → LaTeX/PDF VALIDATED. Não declarar M0 integralmente VALIDATED sob o critério estrito de aplicação funcional: há duas falhas preexistentes de verificação da aplicação (seção 16), mantida intacta. Nenhuma regressão de código introduzida. Não avançar M1 silenciosamente.

## 10. Trabalho concluído
- Inventário, estado inicial e commit exclusivo 672fc65a antes da camada formal.
- CUE: três campos (estado_fisico_frasco, disponibilidade, em_quarentena), schema fechado parcial, projeção concreta, 2 fixtures válidas e 5 inválidas.
- Alloy: INV-FRASCO-001/BloqueioFisico e INV-EMPRESTIMO-001/Unicidade, duas testemunhas, scopes explícitos.
- Wrapper tools/formal/check.mjs exige comandos/scopes/resultados esperados e normaliza receipt sem timestamps. Falhas preservam receipt em /tmp.
- Rust: módulos main/ir/latex/render/validation; escaping central para _ % & # $ { } ~ ^ e barra invertida; hashes SHA-256; saída ordenada; --check rejeita stale/arquivos extras.
- READMEs de todas as camadas e cinco knowledge docs; justfile com todos os comandos previstos mais rust-check.
- Integração LaTeX aditiva e main.pdf de 213 páginas revisado.
- Worklog durável: documentation/worklogs/formal-spec/M0_VALIDATION.md.

## 11. Trabalho em andamento
Fechamento documental e commit final de integração. Não há processo de build necessário pendente. CI hospedada não conectada; o gate local just formal-check está executável e validado em ambiente provisionado. A homologação operacional completa da aplicação não foi afirmada.

## 12. Próxima ação EXATA
Na retomada, confirmar branch/status/log, executar `just formal-check` com o ambiente da seção 6. Antes de marcar M0 integralmente VALIDATED ou iniciar M1, reproduzir as duas falhas preexistentes com os comandos da seção 14 e ler `frontend/src/app/reagentes/page.tsx:524`, a interface ModalProps correspondente (localizar `rg -n 'interface ModalProps|tipoSubstanciaResumo' frontend/src`) e `functions/src/__tests__/domain/roles.test.ts` junto de `functions/src/auth.ts:96`. Preparar diagnóstico separado dessas falhas; não alterar regra 3B, não reescrever UI/backend nem mascarar teste para obter PASS. Definir tratamento das pendências fora da fatia formal antes de declarar aplicação completamente validada. Não repetir auditoria documental inteira.

## 13. Arquivos que devem ser lidos para continuar
1. Este arquivo, ponto único de retomada.
2. documentation/worklogs/formal-spec/M0_VALIDATION.md e specification/README.md.
3. specification/cue/domain/frasco.cue, docs/projection.cue, tests/.
4. specification/alloy/reagents/withdrawal.als e tools/formal/check.mjs.
5. tools/spec-doc/src/ e Cargo.toml/lock; justfile.
6. specification/knowledge/AI_HANDOFF.md e FORMAL_SPEC_ARCHITECTURE.md.
7. documentation/COMPILACAO_NIX_LCQUI.md, Formal-Spec-M0.tex.
8. Fonte semântica: Section-4-Modelagem-Entidades-SQL-3FN.tex (Frasco, linhas ~340–390) e Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/Section-10-Subsection-5-Fluxo-de-Reagentes.tex (retirada ~407–446). Seção 10.7 contém jobs, não retirada.
9. Arquivos de diagnóstico da seção 12, se tratar a ressalva operacional.

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
git diff 9d97ed30 --exit-code -- frontend functions firebase.json firestore.rules storage.rules .firebaserc flake.nix flake.lock documentation/worklogs/consolidacao-gemini
functions/node_modules/.bin/tsc --noEmit -p functions/tsconfig.json
frontend/node_modules/.bin/tsc --noEmit --incremental false -p frontend/tsconfig.json
npm test --prefix functions -- --runInBand src/__tests__/domain
```
As duas últimas verificações têm falhas conhecidas (seção 16). `functions` build script usa `|| true`, por isso foi usado tsc direto, sem mascarar erro.
PDF: `just docs-build` grava build/latex/main.pdf; inspecionar log final e páginas alteradas antes de copiar para documentation/main.pdf. Build sozinho não homologa aplicação.

## 15. Validações já executadas
- CUE fmt/vet/export e todas as fixtures PASS.
- Alloy 6.2.0, SAT4J: BloqueioFisico e Unicidade UNSAT; Testemunha e DisponivelNaoApto SAT; scope 4, exatamente 2 Estado, bitwidth 4. Nenhum contraexemplo encontrado.
- Rust fmt/test (2 testes)/clippy --all-targets -D warnings PASS. Testes cobrem escaping e rejeição de hashes/resultados alterados.
- --check PASS; alteração deliberada em cópia /tmp detectada como stale; duas gerações em cópia /tmp comparadas recursivamente, bytes idênticos.
- just docs-generate, docs-check e formal-check PASS. Última mudança tipográfica validada depois com just docs-build.
- PDF final: exit 0, 213 páginas, zero erros/referências indefinidas, 21 Overfulls herdados (mesma quantidade do baseline), nenhum no trecho M0. Páginas 212–213 renderizadas com Poppler e inspecionadas após correção. Copiado para main.pdf somente depois.
- tsc functions PASS; tsc frontend FAIL preexistente; Jest domain 9/10 PASS (ver seção 16).
- Diff de preservação contra baseline vazio; git diff --check PASS.

## 16. Contraexemplos / problemas encontrados
Nenhum CONTRAEXEMPLO PÓS-3B encontrado pelo Alloy. Se surgir, registrar antes de alterar regra: ID, assertion, scope, estado inicial/final, regra 3B, interpretação, classificação BUG_MODELO_FORMAL/TRADUCAO_INCORRETA/LACUNA_POS_3B/CONTRADICAO_REAL.
Problemas de implementação preexistentes (não são contraexemplos formais):
- APP-BASELINE-001: frontend/src/app/reagentes/page.tsx:524, TS2322: prop tipoSubstanciaResumo não existe em ModalProps. Código idêntico ao baseline; não corrigido nesta fatia aditiva.
- APP-BASELINE-002: roles.test.ts, caso Bolsista+Gestor sem Aluno, espera mensagem de incompatibilidade, recebe "Bolsista exige papel Aluno." em auth.ts:98. 1/10 testes falha; revogação passa. Código/testes idênticos ao baseline; não modificar regra ou expectativa silenciosamente.
Problemas instrumentais resolvidos: alloy6 --help não existe (usar alloy6 help exec); Python ausente (Node usado); CUE extensão de definição fechada com & rejeitada (corrigido por embedding, sem mudar regra); caminho longo do manifest causou Overfull (corrigido e reinspecionado). Bloqueios de sandbox e respectivas soluções na seção 6.

## 17. Decisões tomadas nesta fase
- Preservar árvore real frontend/ e functions/; nunca inventar árvore idealizada.
- M0 é filtro físico necessário, não elegibilidade operacional completa. Validade, autorização, aceite, Q06, idempotência e concorrência Firestore fora do modelo.
- Coerência inicial é hipótese Alloy; coerência final é assertion, não fact. Estado abstrato não envolvido em transição não é certificado operacionalmente.
- EXTRAVIADO + DISPONIVEL é fixture válida e testemunha não apta; nenhuma regra de recuperação redefinida.
- Gerar apenas conteúdo mecânico; rationale escrito à mão no LaTeX. Templates simples em funções Rust, sem diretórios vazios.
- Resultados normalizados e generated versionados; target e build/latex ignorados. PDF humano com today não promete identidade binária entre datas/TeX diferentes; fragmentos/manifest são determinísticos.
- Não corrigir falhas preexistentes da aplicação sob pretexto de infraestrutura formal.

## 18. Itens ainda não migrados
Frasco completo, Firestore/projeções, contratos completos de retirada, demais domínios M1–M12, testes de ligação specification→Firebase Emulator e CI hospedada. Nenhuma aplicação TypeScript gerada/substituída. Documentação humana não foi desnormatizada em massa.

## 19. Commits desta fase
- 672fc65a — chore(spec): add formal specification state (somente estado, antes da camada).
- 0f679e33 — feat(spec): validate partial bottle model with CUE and Alloy.
- 2e5c8f79 — feat(spec-doc): generate deterministic bottle documentation.
- Próximo commit: docs(spec): integrate and validate M0 formal documentation. SHA será registrado após execução; um commit não pode conter o próprio SHA.

## 20. Estado do Git
Antes do commit final: somente estado, justfile, READMEs/knowledge, worklog formal, Formal-Spec-M0.tex e main.tex/main.pdf alterados/novos. Generated está commitado e sem diff após regeneração. Aplicação/configuração/worklogs 3B intactos. Conferir status após commit. Atualização pós-commit do próprio estado pode ficar pendente intencionalmente para registrar SHA sem recursão de commits.

## 21. Como uma nova IA deve continuar
Ler este arquivo; confirmar status/log/branch; ler fontes indicadas; repetir gates mínimos e seguir seção 12. Não replanejar do zero nem reabrir 3B. Atualizar este arquivo após unidades pequenas, validações, descobertas, antes de tarefas longas e antes/depois de commits. Nunca descartar atualização pós-commit do estado. Usar NOT_STARTED/IN_PROGRESS/BLOCKED/IMPLEMENTED/VALIDATED; só VALIDATED conclui um escopo. Não marcar homologação operacional com testes falhando.

## 22. Definition of Done restante
Pipeline vertical e preservação de arquivos foram validados. Para M0 integralmente VALIDATED sob o critério de aplicação funcional, falta resolver/aceitar explicitamente a separação das duas falhas preexistentes APP-BASELINE-001/002, sem regressão semântica e fora do escopo aditivo já concluído. Não alegar validação Firebase Emulator que não foi executada. CI hospedada e expansão de domínios são trabalho posterior, não implementados nesta sessão. Estado e evidências permitem retomada sem contexto da conversa.
