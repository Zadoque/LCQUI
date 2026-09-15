# LCQUI — Formal Specification State

## 1. Propósito desta fase
Adicionar CUE + Alloy à aplicação existente e usar Rust exclusivamente para gerar documentação LaTeX determinística. Nesta sessão implementar somente M0, uma fatia parcial de Frasco_Reagente e elegibilidade de retirada. Não reiniciar auditoria nem migrar toda a aplicação.

## 2. Baseline congelado da Fase 3B
- FUNCTIONAL_SHA = db29ea2f17dc785fb0b44ffb3aec16db29c45e94
- EVIDENCE_HEAD = 9d97ed30b4e7b7805f3d71802816d5d16abc496e
- SEMANTIC_GATE = PASS; FASE 3B = ENCERRADA.
- Auditoria terminou nos worklogs abaixo, com liberação para CUE/Alloy. CHECKPOINT ainda cita 208 páginas; VALIDACAO_LATEX registra o build final db29ea2f com 211 páginas. Preservar ambos como evidência histórica.
- Regras congeladas: unknown/nonmeasurable/peso ausente != zero; disponibilidade DISPONIVEL|EMPRESTADO indica empréstimo, não aptidão; conteudo_nominal é original do fabricante; extravio não inventa peso_retorno; reencontro exige quarentena e não reabre empréstimo; Q06=max(0,peso_saida-peso_retorno), tara posterior não reescreve histórico; idempotência exige mesma chave+ator+payload canônico, divergência rejeitada; estoque mínimo Especificação×Almoxarifado, escassez qtd_aptos<limite; timezone America/Sao_Paulo.

## 3. Branch atual
`feat/formal-spec-cue-alloy`. Não criar outra branch. HEAD inicial: EVIDENCE_HEAD.

## 4. Estrutura existente preservada
Inventário real em 2026-09-15 (Git inicialmente limpo):
- `frontend/` EXISTE (não `front-end/`): Next/React, package.json, código e scripts preservados.
- `functions/` EXISTE: Firebase/Cloud Functions TypeScript, testes Jest, package.json, assets e scripts preservados.
- `documentation/`: main.tex/main.pdf, Sections 1–12, archive, worklogs/consolidacao-gemini, documentos de decisões: preservar. Integração LaTeX futura apenas aditiva.
- Raiz: README.md, firebase.json, firestore.rules, storage.rules, .firebaserc, flake.nix/lock, .gitignore: preservar.
- Não existem package.json nem firestore.indexes.json na raiz; não inventar substitutos.
- .agents/ e .codex/ são diretórios protegidos. frontend/AGENTS.md só se aplica à UI, que não será editada.

## 5. Divisão de autoridade
- frontend: UI real; functions: backend real; Firestore: banco operacional.
- CUE: estruturas, tipos, enums, nulabilidade e contratos estruturais.
- Alloy: invariantes, relações e comportamento abstrato, com verificação limitada ao scope informado.
- Rust: transformação determinística de IR/resultados em fragmentos .tex.
- LaTeX: apresentação humana, rationale, UX e documentação existente.

## 6. Ambiente e ferramentas
Confirmados no PATH: cue (build devel, linguagem v0.17.1), alloy6, cargo, rustc, rustfmt, jq. Versão Alloy esperada 6.2.0, ainda confirmar via CLI. just e latexmk ausentes do PATH. Baseline usa `nix shell nixpkgs#texliveFull -c latexmk`. Não introduzir Docker nem substituir versões arbitrariamente.

## 7. Arquitetura formal
Camada aditiva: specification/cue → projeção documental concreta → build/spec-ir.json; specification/alloy → build/formal-validation.json; tools/spec-doc (Rust) → documentation/generated/*.tex e MANIFEST.json → inputs em main.tex → PDF. CUE/Alloy não geram nem substituem TypeScript ou Firebase. Não criar diretórios vazios.

## 8. Milestones planejados
M0 infraestrutura e fatia vertical; M1 Resumo+Especificação; M2 Frasco completo; M3 Empréstimo; M4 retirada/devolução; M5 extravio/reencontro/quarentena; M6 Q06/tara; M7 idempotência; M8 estoque; M9 autorização; M10 patrimônio; M11 demais domínios; M12 integração/redução de duplicação. M1–M12 NOT_STARTED.

## 9. Milestone atual
M0 IN_PROGRESS. Só VALIDATED significa concluído.

## 10. Trabalho concluído
Inventário, confirmação da branch e leitura dos worklogs finais. Estado inicial criado antes de qualquer camada formal.

## 11. Trabalho em andamento
Bootstrap do estado e commit inicial exclusivamente deste arquivo.

## 12. Próxima ação EXATA
Após commit inicial deste arquivo, registrar SHA aqui; ler os campos de Frasco_Reagente e a pré-condição de retirada nas Seções 4 e 10.7; inspecionar CLI Alloy; criar schema parcial CUE derivado dessas fontes com exemplos válidos/inválidos e projeção documental concreta; executar cue fmt e cue vet e registrar resultados antes do próximo commit.

## 13. Arquivos que devem ser lidos para continuar
- Este arquivo (ponto único de retomada).
- documentation/worklogs/consolidacao-gemini/CHECKPOINT.md
- documentation/worklogs/consolidacao-gemini/VALIDACAO_LATEX.md
- documentation/worklogs/consolidacao-gemini/LOTE_3B_CONTRACT_CARDS.md
- documentation/Section-4-Modelagem-Entidades-SQL-3FN.tex
- documentation/Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/ (localizar seção 10.7 com rg --files)
- documentation/main.tex

## 14. Comandos de validação
Já disponíveis: `git branch --show-current`, `git status`, `git log --oneline -10`, `git diff --check`.
Gates formais ainda não criados. Antes de concluir: cue fmt/vet/export, Alloy check + testemunha não-vazia, cargo fmt/test/clippy, geração repetida idêntica, detecção de stale, latexmk e preservação dos caminhos existentes via git diff baseline.

## 15. Validações já executadas
Branch correta; git status limpo; git log confirma EVIDENCE_HEAD; diretórios reais inventariados; cue version executado. `alloy6 --help` rejeita opção e imprime uso: inspecionar subcomando help em seguida. Nenhum gate formal implementado ainda.

## 16. Contraexemplos / problemas encontrados
Nenhum contraexemplo encontrado. Qualquer inconsistência semântica futura deve ser registrada ANTES de alterar regra como CONTRAEXEMPLO PÓS-3B, incluindo ID/assertion/scope/estados/regra/interpretação e classificação BUG_MODELO_FORMAL, TRADUCAO_INCORRETA, LACUNA_POS_3B ou CONTRADICAO_REAL. Diferença de nome frontend/ e ferramentas ausentes são observações de inventário, não contradições de domínio.

## 17. Decisões tomadas nesta fase
Preservar árvore real. M0 modela fatia explicitamente parcial, sem reivindicar contrato completo de retirada nem prova da implementação Firebase. Não avançar M1 nesta sessão. Commits pequenos com estado atualizado antes/depois.

## 18. Itens ainda não migrados
Todos os domínios; toda implementação permanece no lugar. Nenhuma migração normativa efetuada.

## 19. Commits desta fase
672fc65a — chore(spec): add formal specification state (somente estado inicial).

### Atualização pós-commit / retomada da interrupção
Git limpo confirmado após commit inicial. Alloy 6.2.0 confirmado. O commit exigiu escalonamento (.git somente leitura). Solicitação Nix interrompida; guia `documentation/COMPILACAO_NIX_LCQUI.md` lido e caminho TeX Live existente confirmado (latexmk 4.87). Reutilizar PATH conforme guia. Python ausente; usar Node para automação auxiliar, Rust exclusivamente para renderização documental.

Escopo M0 refinado: três campos (estado físico, disponibilidade, quarentena), filtro físico de retirada e unicidade de empréstimo em transição abstrata. Não afirmar elegibilidade completa: validade, autorização, aceite e idempotência ficam fora deste modelo. Fonte correta do fluxo: Seção 10.5, não 10.7. Próxima unidade: CUE parcial, projeção concreta e fixtures, depois Alloy com testemunha SAT e assertions UNSAT. Nenhuma contradição de domínio encontrada.

## 20. Estado do Git
Antes do commit inicial: somente FORMAL_SPEC_STATE.md novo; baseline limpo. Confirmar novamente antes/depois de cada commit. Nunca incluir arquivos alheios.

## 21. Como uma nova IA deve continuar
Ler este arquivo, executar git status e git log --oneline -10, confirmar branch, ler fontes indicadas, repetir gates mínimos disponíveis e seguir seção 12. Não replanejar nem reabrir 3B. Atualizar este arquivo após unidades pequenas, validações, problemas e antes de tarefas longas/commits, e registrar SHA depois de cada commit.

## 22. Definition of Done restante
Todo pipeline M0 ainda pendente: CUE válido e fixtures negativas, IR concreto derivado, Alloy executado e resultados verificáveis, gerador Rust com escaping central e manifest SHA, inputs aditivos no LaTeX, PDF compilado/inspecionado, READMEs e knowledge docs, automação reprodutível e gates de stale, commits pequenos, aplicação preservada e validações reais registradas.

### Checkpoint M0 — CUE/Alloy implementados
- Novos arquivos: specification/cue/{cue.mod,domain,docs,tests}, specification/alloy/reagents/withdrawal.als, tools/formal/check.mjs, build/{spec-ir,formal-validation}.json.
- cue fmt, cue vet e export executados com sucesso. Fixtures incluem EXTRAVIADO + DISPONIVEL (estruturalmente válido), enum inválido, null e campo ausente.
- Alloy 6.2.0/SAT4J: BloqueioFisico e Unicidade UNSAT no scope 4, exatamente 2 Estado; Testemunha e DisponivelNaoApto SAT. Não é prova ilimitada nem teste Firebase.
- Node spawnSync foi bloqueado com EPERM pelo sandbox; validador executado com escalonamento. Cargo fetch também precisou escalonamento por DNS; dependências baixadas em /tmp/lcqui-cargo com Cargo.lock.
- tools/spec-doc está em bootstrap, ainda NÃO validado. Próxima ação exata: implementar leitor IR/resultados, escaping central, renderizador determinístico e manifest no Rust; testar escaping, entrada inválida e stale; só depois integrar LaTeX.
- Preparação do commit CUE/Alloy: git diff --check e resultados acima; milestone permanece IN_PROGRESS. Nenhuma regra 3B alterada.
