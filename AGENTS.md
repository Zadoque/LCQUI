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

1. **O orquestrador nunca edita arquivos nem executa trabalho técnico diretamente.** Toda edição e toda execução de código são delegadas exclusivamente a um modelo (subagente) via Task. O orquestrador apenas planeja, distribui e revisa.

2. **Rotação de modelos obrigatória.** Nunca use o mesmo modelo em delegações consecutivas do mesmo papel; espalhe as delegações entre os modelos vivos disponíveis. Se uma delegação receber `AccessDenied` ou quota esgotada, troque imediatamente de modelo antes de tentar novamente — nunca insista no mesmo modelo que falhou.

3. **Toda delegação deve instruir explicitamente:**
   - (a) trabalhar **no máximo 5 minutos** e retornar o que fez (mesmo que incompleto);
   - (b) **usar obrigatoriamente os LSPs disponíveis** (TypeScript, ESLint, Tailwind, Rust, texlab, nixd) para diagnóstico antes e durante a edição;
   - (c) manter escopo restrito ao entregue e fail-closed: se algo escapa ao escopo, parar e relatar.

4. **Máximo 4 investigações somente-leitura em paralelo**; **um único escritor por vez**. Nunca delegue escrita concorrente ao mesmo workspace.

5. **Modelos vivos atuais** (provider `bailian-payg`, conforme `opencode.json`): `glm-5.1`, `qwq-plus`, `qvq-max`. Ajuste `max_tokens` ≤ 8192 quando necessário. Variantes de agente seguem o formato `<papel>--<modelo>` (ex.: `lcqui-writer--qwq-plus`, `lcqui-writer--qvq-max`).

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
