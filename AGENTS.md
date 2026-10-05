# LCQUI — instruções para coding agents

## Fonte de verdade

Use esta precedência:

1. `documentation/main.tex` e as Seções normativas correntes.
2. `specification/cue/**` e `specification/alloy/**`.
3. `documentation/worklogs/formal-spec/**` para rationale dos milestones M0–M13.
4. `documentation/MATRIZ_IMPLEMENTACAO_LCQUI.md`.
5. Código existente.

A implementação nunca sobrescreve silenciosamente a especificação. Se duas fontes normativas correntes forem realmente incompatíveis, pare e relate o conflito com referências exatas.

## Orquestração e delegação de modelos

1. **Delegação obrigatória e inegociável — sem exceção.** O orquestrador NUNCA edita arquivos, nunca executa comandos mutáveis e nunca realiza trabalho técnico diretamente. TODA ação — investigar, escolher, planejar, auditar, implementar, testar, commitar, publicar e atualizar documentação — é delegada a um subagente via Task. O orquestrador apenas opera a máquina de estados (DFA) abaixo.

2. **Rotação estrita e sem fallback.** Nunca reutilize o **mesmo modelo** em delegações consecutivas do mesmo papel, mesmo que ele seja o conhecido por estar funcionando. Nunca faça fallback para um **único** modelo; sempre varie entre os modelos vivos. Cada delegação deve usar uma variante `<papel>--<modelo>` cujo modelo seja diferente do usado na última delegação daquele papel.

3. **Quota/erro do provider.** Em `AccessDenied`/quota esgotada ou erro de `max_tokens` (ex.: `Range of max_tokens should be [1, N]`), troque **IMEDIATAMENTE** para OUTRO modelo e repita a MESMA delegação — o estado do DFA **não** muda. Nunca insista no modelo que falhou e nunca resolva o problema editando `opencode.json` em runtime.

4. **Toda delegação deve instruir explicitamente o subagente a:**
   - (a) trabalhar **no máximo 5 minutos** e retornar o que fez (mesmo que incompleto);
   - (b) **usar obrigatoriamente os LSPs disponíveis** (TypeScript, ESLint, Tailwind, texlab, nixd) para diagnóstico antes e durante a edição;
   - (c) manter escopo restrito ao entregue e fail-closed: se algo escapa ao escopo, parar e relatar;
   - (d) verificar cada passo com bash (`git branch --show-current`, `git diff --stat`, `tsc --noEmit`, testes) antes de retornar.
   - (e) **lembrar e respeitar a hierarquia de decisão** — **norma corrente (`documentation/main.tex` e Seções) > CUE + Alloy (`specification/cue/**`, `specification/alloy/**`) > implementação atual** — a implementação atual NUNCA sobrescreve a norma; em conflito, pare e reporte.

> **CHECKLIST MÍNIMO DE TODA DELEGAÇÃO (obrigatório):** todo prompt de Task DEVE conter, de forma explícita e literal: (1) a ordem de **delegar** o trabalho (o subagente executa; o orquestrador não); (2) a ordem de **usar obrigatoriamente os LSPs disponíveis** (TypeScript, ESLint, Tailwind, texlab, nixd) para diagnóstico antes e durante a edição; (3) o lembrete da **hierarquia de decisão**: norma corrente > CUE + Alloy > implementação atual. Delegação sem esses três itens é considerada inválida.

5. **Máximo 4 investigações read-only em paralelo**. **Um único escritor por vez.** Nunca delegue escrita concorrente ao mesmo workspace.

6. **⚠️ Modelos frequentemente relatam sucesso sem materializar as mudanças.** Verifique SEMPRE o estado real (git diff/rev-parse/ls-remote, leitura do arquivo, execução de testes) ANTES de aceitar o retorno do subagente como concluído.

6.1 **Handoff obrigatório e verificação sem partir do zero.** Toda delegação deve embutir um HANDOFF ESTRUTURADO do estado anterior — FEATURE_ID; LINHA_MATRIZ; FONTE_NORMATIVA; EVIDENCIA_CODIGO (arquivo:linha); decisões; REJEIÇÕES anteriores (para não repetir); suposições a verificar. O subagente NÃO deve começar do zero: deve VERIFICAR MATERIALMENTE (git/grep/leitura) cada afirmação do handoff antes de agir, sem confiar cegamente nem repartir do início. Cite apenas linhas verificadas; se não verificou, escreva "VERIFICAR". Ao fim de cada estado, produza um novo handoff para o próximo, preservando os anteriores. O orquestrador deve quebrar loops de seleção/plano fornecendo o ground-truth verificado (ex.: mapa de linhas produzido por `repo-explorer` read-only) quando os modelos errarem referências.

7. **Modelos vivos** (provider `bailian-payg`, conforme `opencode.json`): a lista é grande e vários modelos entram em quota/limite de `max_tokens` sem aviso. Não há modelo garantido: **rotacione sempre** e trate falha de modelo como evento de rotação (item 3), nunca como motivo para parar ou para escolher um único modelo. `qwen-plus` foi removido por quota esgotada.

## Máquina de estados (DFA) de implementação gradual

O orquestrador DEVE seguir esta máquina de estados **determinística** (DFA), delegando cada estado a um papel distinto. Nenhum estado é opcional e as transições são fixas.

| Estado | Papel (variante `<papel>--<modelo>`) | Ação delegada | Transição determinística |
|---|---|---|---|
| **q0 SELECT** | `matrix-selector` | Escolher a fatia que maximiza throughput na `documentation/MATRIZ_IMPLEMENTACAO_LCQUI.md` | → **q1** |
| **q1 AUDIT_SELECTION** | `selection-auditor` | Auditar adversarialmente a escolha | APROVADO → **q2**; REPROVADO → **q0** |
| **q2 PLAN** | `planner` | Planejar a modificação seguindo a norma | → **q3** |
| **q3 AUDIT_PLAN** | `plan-auditor` | Verificar se o plano segue a norma corrente | APROVADO → **q5**; REPROVADO → **q4** |
| **q4 CORRECT_PLAN** | `plan-corrector` | Corrigir o plano (sem editar código) | → **q3** |
| **q5 IMPLEMENT** | `lcqui-writer` | Implementar em incrementos ≤ 5 min | → **q6** |
| **q6 VERIFY** | `implementation-auditor` | Verificar materialização e conformidade | OK → **q7**; FALHA → **q5** |
| **q7 CREATE_TESTS** | `test-creator` | Escrever os testes derivados do contrato/norma (RED), apenas arquivos de teste | → **q7a** |
| **q7a AUDIT_TESTS** | `test-auditor` | Auditar adversarialmente a cobertura e o valor probatório dos testes | APROVADO → **q7c**; REPROVADO → **q7b** |
| **q7b CORRECT_TESTS** | `test-corrector` | Corrigir os testes reprovados (sem tocar produção) | → **q7a** |
| **q7c EXECUTE_TESTS** | `test-executor` | Executar Jest/Emulator/Rules/E2E e diagnosticar a camada da falha | VERDE → **q8**; FALHA (produção) → **q5**; FALHA (teste) → **q7b** |
| **q8 ADVANCE** | `lcqui-writer` | Atualizar a matriz e commitar | → **q0** (próxima fatia) |

- A variante concreta `<papel>--<modelo>` é escolhida a cada delegação respeitando a rotação estrita (item 2).
- `repo-explorer` e `visual-auditor` são apoio read-only usável em qualquer estado, também com rotação de modelo.
- O estado só avança quando a condição de transição for satisfeita **e** a materialização verificada (item 6).

## Branch e unidade de trabalho

- `dev` é a linha de integração da implementação; não altere `main` diretamente.
- Crie branches pequenas derivadas de `dev`.
- Trabalhe em uma ou poucas linhas fortemente relacionadas da matriz por vez. Não tente resolver as 70 features em uma sessão.
- Não mova o tag formal nem altere contratos formais durante uma correção de implementação.

## Derivação dos testes backend

Derive contratos de backend da combinação de CUE, Alloy, Seções normativas e divergência registrada na matriz.

- CUE fornece payloads válidos/inválidos, tipos, enums, nulabilidade e limites estruturais.
- Alloy fornece invariantes, witnesses positivos, estados/transições, concorrência e propriedades relacionais.
- Não converta `UNSAT` diretamente em “um teste”. Traduza a propriedade Alloy em cenários concretos, incluindo precondição, operação e estado esperado.
- Use Jest para lógica/callables, Firebase Emulator Suite para integração e `@firebase/rules-unit-testing` para Firestore/Storage Rules, conforme a camada.

## Frontend e E2E

Derive E2E principalmente de:

```text
Seção 9 — fluxo
+ Seção 8 — UI e estados
+ Seção 7 — resultado e regras
```

Não invente comportamento a partir do estado atual da interface. Playwright CLI serve à exploração e depuração; Playwright Test (`*.spec.ts`) serve a assertions permanentes e regressão automatizada. Um não substitui o outro.

A suíte E2E do LCQUI utiliza Playwright Test em conjunto com o Firebase Emulator Suite (auth, firestore, functions, storage) e depende do seed canônico em `functions/scripts/seed.ts`. Os testes estão localizados em `frontend/e2e/specs/*.spec.ts` e utilizam helpers específicos em `frontend/e2e/helpers/ui.ts` e `frontend/e2e/helpers/emulator.ts`.

### Execução dos testes E2E

Existem diferentes formas de executar os testes E2E:
- Emuladores + suíte completa: `cd frontend && npm run test:e2e:emulators` (sobe os emuladores, executa os testes e derruba os emuladores após o término)
- Com emuladores já ativos: `cd frontend && npm run test:e2e -- e2e/specs/05-posts.spec.ts --grep "POST-E2E-00[1-3]"`
- Recomendação: Rodar **de 3 em 3 testes** (por exemplo, `--grep "COMMENT-E2E-00[1-3]"`), não a suíte inteira de uma vez. Isso reduz o tempo de execução e ajuda a detectar deadlocks ou travamentos mais rapidamente.
- Os emuladores usam 1 worker do Playwright por padrão; evite paralelizar suites que compartilham o mesmo banco de dados para evitar conflitos.

### Montagem de roteiro manual a partir de testes que falharam

Quando ocorrem falhas nos testes E2E, siga o processo descrito em `documentation/GUIA_TESTES_E2E_E_ROTEIRO_MANUAL.md` para criar um roteiro manual de testes:
1. Liste os cenários E2E que não passaram
2. Para cada cenário, escreva: objetivo; pré-condições; passos numerados com os textos exatos de botões/campos e os logins; resultado esperado na tela; verificação opcional no Firestore Emulator UI
3. Inclua uma seção "Como reportar" com: o cenário específico, o passo que falhou, o que foi observado, o que era esperado e uma screenshot do problema

### Pitfalls comuns e lições aprendidas

1. **`prompt()`/`alert()` nativos quebram o Playwright.** Sempre prefira UI própria em vez de diálogos nativos do navegador.
2. **Race condition com callables.** Após operações que envolvem chamadas a funções Firebase, utilize `esperarCallable(page, "<nome>")` para garantir que a operação foi concluída antes de afirmar mudanças na interface.
3. **`getByText` pode casar com valor de `<textarea>`.** Não derive locators de texto que muda durante a edição. Use `data-testid` estáveis para garantir consistência dos testes.
4. **Locator derivado de texto mutável quebra.** Ao entrar em edição/moderação inline, o texto do comentário é substituído pelo formulário; `getByText(textoOriginal)` deixa de casar. A solução é escopar ao card do Post (`cartaoDoPost`) ou usar `data-testid` específicos.
5. **Truncamento do último post no feed.** Garanta que o layout da interface considere o header/barra do professor para que testes com múltiplos posts possam alcançar o último conteúdo.
6. **Textarea de comentário deve ter altura apropriada.** Utilize `min-h`, `max-h` e `overflow-y-auto` para garantir usabilidade com conteúdos longos.

Prefira usar `data-testid` para elementos que mudam de estado durante a interação, pois esses proporcionam maior estabilidade nos testes frente a mudanças de texto ou conteúdo dinâmico.

## Playwright local no NixOS

Use somente a instalação local versionada pelo projeto:

```bash
cd frontend
npm run pw -- --help
```

É proibido usar `npm install -g`, `npx playwright install` ou `npx playwright install --with-deps`. Os browsers vêm de `playwright-driver.browsers` pelo `PLAYWRIGHT_BROWSERS_PATH` configurado no Home Manager.

Para explorar:

```bash
npm run pw -- open http://localhost:3000
npm run pw -- snapshot
npm run pw -- close
```

Quando suportado, prefira sessão nomeada pela feature, por exemplo `-s=IMP-MET-001` ou `-s=IMP-PAT-006`. Não reutilize estado entre testes independentes sem intenção explícita. Encerre a sessão com `npm run pw -- close` ou o equivalente da versão instalada.

Para reduzir contexto, prefira snapshots focados/com profundidade limitada e os comandos `find`, `requests`, `console` e `generate-locator` quando disponíveis, em vez de repetir árvores completas. Consulte primeiro `npm run pw -- --help` e siga o README oficial do `playwright-cli` correspondente à versão instalada; as instruções empacotadas dessa versão ficam em `frontend/node_modules/playwright-core/lib/tools/cli-client/skill/SKILL.md`.

## Locators permanentes

Prefira, nesta ordem conforme a semântica:

- `getByRole`
- `getByLabel`
- `getByText` quando o texto for estável
- `getByTestId` quando necessário

Evite seletores CSS frágeis baseados na estrutura visual.

## Ciclo por feature

```text
contrato
→ teste backend RED
→ backend/Rules
→ backend GREEN
→ teste E2E RED
→ frontend
→ E2E GREEN
→ regressão relevante
→ atualizar matriz/documentação de testes
→ commit
```

Nem toda feature possui frontend; adapte o ciclo sem criar UI artificial.

## Critério de conclusão

Uma feature só muda de `DIVERGENTE` ou `NÃO IMPLEMENTADO` para `NÃO DIVERGENTE` quando todas as obrigações normativas foram revistas, backend e Rules aplicáveis foram testados, frontend e E2E aplicáveis foram aprovados e nenhuma divergência conhecida permanece. `NÃO DIVERGENTE` não significa homologação de produção.

Quando um teste falhar:

```text
diagnosticar a camada
→ corrigir a causa
→ executar o teste mínimo
→ executar a suíte da feature
→ executar regressão relevante
```

Não altere várias camadas simultaneamente antes de localizar a causa.

## Comandos canônicos de verificação

Execute a partir da raiz, usando somente dependências locais:

```bash
cd functions && npm run test:unit
cd functions && npm run test:integration
cd functions && npm run test:rules
cd functions && npm run test:emulator
cd functions && npm run build
cd functions && npm run lint
cd frontend && npx --no-install tsc --noEmit
cd frontend && npm run lint
```

`test:integration` e `test:rules` sobem e encerram somente os Emulators necessários; `test:emulator` executa ambas as suites e preserva o exit code. Os scripts terminados em `:suite` são internos e pressupõem Emulators já ativos.

Compile apenas o documento de verificação com:

```bash
nix shell nixpkgs#texliveFull -c \
  latexmk -cd -pdf -interaction=nonstopmode -halt-on-error \
  -outdir=/tmp/lcqui-testes-tex documentation/testes/main.tex
```
