# LCQUI — instruções para coding agents

## Fonte de verdade

Use esta precedência:

1. `documentation/main.tex` e as Seções normativas correntes.
2. `specification/cue/**` e `specification/alloy/**`.
3. `documentation/worklogs/formal-spec/**` para rationale dos milestones M0–M13.
4. `documentation/MATRIZ_IMPLEMENTACAO_LCQUI.md`.
5. Código existente.

A implementação nunca sobrescreve silenciosamente a especificação. Se duas fontes normativas correntes forem realmente incompatíveis, pare e relate o conflito com referências exatas.

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
