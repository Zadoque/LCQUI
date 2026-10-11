# LCQUI — Laboratório de Ciências Químicas Integrado

Sistema **em desenvolvimento** para a gestão integrada de um laboratório de
ciências químicas: inventário e almoxarifado de reagentes, controle de lotes e
frascos, bens patrimoniais, empréstimos e devoluções, além da gestão acadêmica
de professores, turmas, alunos, roteiros de experimentos e comunicação interna.

O projeto separa explicitamente dois planos:

- uma **especificação formal** de domínio, encerrada e validada dentro dos
  limites declarados da camada formal (M0–M13);
- uma **implementação** Firebase/Next.js que ainda **não** foi reconciliada de
  forma sistemática contra essa especificação.

O README é a porta de entrada. A documentação normativa é a autoridade sobre o
comportamento esperado.

---

## Visão geral

O LCQUI pretende cobrir, de ponta a ponta, o ciclo operacional e acadêmico de um
laboratório químico: entrada e catalogação de reagentes, rastreio de frascos e
saldos, empréstimos e devoluções com metrologia, extravio, reencontro e
quarentena, escassez de estoque com notificações, patrimônio com baixa
ritualizada, autorização por papéis/vínculos e o fluxo acadêmico (turmas,
matrícula, posts, roteiros e notificações).

## Objetivos e domínios

- **Reagentes e estoque:** catálogo de resumo/especificação, frascos, lotes,
  validade, saldos aferidos, escassez e cache de dashboard.
- **Movimentação:** empréstimo, retirada, devolução, tara e metrologia
  quantitativa (Q06), extravio, reencontro e quarentena.
- **Patrimônio:** bens, plaqueta permanente, máquina de estados de conservação
  e baixa com lastro documental.
- **Idempotência:** identidade de comando, retry sem dupla aplicação e
  deduplicação de eventos/notificações.
- **Autorização:** papéis, vínculos canônicos, versão de autorização e
  revalidação no commit.
- **Acadêmico:** turmas e matrícula, convites, posts/comentários com
  moderação, roteiros de experimento com Storage e notificação unificada.

## Estado atual do projeto

Existe uma distinção deliberada entre **especificação** e **implementação**.

**Especificação formal — concluída (M0–M13).**

- O gate de encerramento global resultou **PASS**; **M13 = VALIDATED** e
  **HQs M13 = 0**. Não existe M14.
- O registro canônico do fechamento é
  [`documentation/worklogs/formal-spec/GLOBAL_FORMAL_CLOSURE.md`](documentation/worklogs/formal-spec/GLOBAL_FORMAL_CLOSURE.md).
- A evidência formal é **bounded** e **abstrata**. Ela **não** certifica
  Firebase, Firestore/Storage Rules, Auth, o backend `functions/`, o
  `frontend/`, Storage real, relógio de produção, paginação/concorrência real
  nem entrega externa.

**Implementação — em reconciliação contínua.**

- A matriz corrente registra a situação de cada fatia e deve ser lida junto
  com a evidência de backend, Rules e Playwright correspondente.
- A cobertura local usa o Firebase Emulator Suite. Ela não homologa produção:
  Scheduler, URLs/Storage publicados, índices compostos efetivamente
  publicados e provedores externos continuam dependentes de deploy.
- Portanto, este repositório não deve ser lido como um sistema homologado ou
  integralmente certificado em produção.

## Arquitetura

Três planos convivem no mesmo repositório:

1. **Aplicação:** `frontend/` (Next.js/React) e `functions/` (Cloud Functions),
   com Firestore, Auth, Storage e Security Rules (`firestore.rules`,
   `storage.rules`).
2. **Especificação formal:** `specification/` (CUE e Alloy) mais o gerador
   determinístico em Rust em `tools/spec-doc/`, cujos artefatos de evidência
   ficam em `build/` e `documentation/generated/`.
3. **Documentação humana:** LaTeX em `documentation/`, consolidada em
   `documentation/main.tex` → `documentation/main.pdf`.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4,
  `lucide-react`, `next-themes`, SDK `firebase` 12.
- **Backend:** Firebase Cloud Functions, `firebase-admin` 12,
  `firebase-functions` 5, `zod` 4, `pdfkit`/`pdfkit-table` e `bwip-js` para
  relatórios e etiquetas. Engine Node 20.
- **Testes:** Jest 29 + `ts-jest` e `@firebase/rules-unit-testing` no backend
  (`functions/`), além de Playwright Test em `frontend/e2e/specs/`.
- **Emuladores:** Firebase Local Emulator Suite (Auth, Functions, Firestore,
  Storage, UI).

## Especificação e métodos formais

A camada formal é **aditiva** à aplicação: ela descreve o domínio, não substitui
o código. Cada ferramenta tem um papel delimitado:

- **CUE** — estrutura, tipos, enums, nulabilidade e fixtures contratuais.
- **Alloy** — invariantes, relações, estados e transições abstratas, em escopo
  declarado (*bounded*).
- **Rust** — validação/reprodutibilidade da evidência e geração determinística
  dos fragmentos.
- **LaTeX/PDF** — especificação humana consolidada, com rationale, UX e
  contratos.

Os receipts de evidência (`build/formal-validation*.json`) vinculam entradas,
modelos e resultados a hashes, e os validadores Rust rejeitam adulteração.

> Importante: a especificação formal **não** prova Firebase, Firestore Rules,
> Storage Rules, Auth, concorrência real, serviços externos nem homologa a
> aplicação em produção.

## Organização da documentação

- [`documentation/main.tex`](documentation/main.tex) — documento humano
  consolidado (Seções 1–12 + capítulos `Formal-Spec-M0..M13`).
- [`documentation/main.pdf`](documentation/main.pdf) — PDF compilado.
- [`documentation/STATUS_ATUAL.md`](documentation/STATUS_ATUAL.md) — status
  corrente e histórico por milestone.
- [`documentation/worklogs/formal-spec/`](documentation/worklogs/formal-spec/) —
  worklogs por fatia; o fechamento global está em
  [`GLOBAL_FORMAL_CLOSURE.md`](documentation/worklogs/formal-spec/GLOBAL_FORMAL_CLOSURE.md).
- [`FORMAL_SPEC_STATE.md`](FORMAL_SPEC_STATE.md) — ponto de retomada da
  especificação formal.
- [`specification/cue/`](specification/cue/) — contrato em CUE.
- [`specification/alloy/`](specification/alloy/) — modelos Alloy.
- `build/formal-validation*.json` — receipts de evidência.
- [`tools/spec-doc/`](tools/spec-doc/) — gerador/validadores em Rust.

> A matriz antiga de implementação foi movida para o arquivo histórico
> [`documentation/archive/pre-formal/MATRIZ_IMPLEMENTACAO_LCQUI_2026-09-13.md`](documentation/archive/pre-formal/MATRIZ_IMPLEMENTACAO_LCQUI_2026-09-13.md).
> A matriz corrente de implementação, baseada na especificação formal
> encerrada, está em
> [`documentation/MATRIZ_IMPLEMENTACAO_LCQUI.md`](documentation/MATRIZ_IMPLEMENTACAO_LCQUI.md).
> A matriz histórica acima não é a matriz normativa corrente.

## Implementação

**Já existe no repositório:** frontend Next.js, Cloud Functions, Security Rules
de Firestore e Storage, scripts de seed, suíte Jest de backend e suíte
Playwright E2E contra o Firebase Emulator Suite.

**Ainda será verificado/reconciliado em produção:** Scheduler, Storage/URLs
publicados, transporte/download publicado, índices compostos efetivamente
publicados e provedores externos. Nenhuma homologação é presumida.

## Testes

O repositório possui backend com Jest, Rules e integração no Firebase Emulator
Suite, além de E2E Playwright dirigidos pela UI real:

```bash
cd functions
npm test
```

Os testes de Rules (`functions/src/__tests__/security/`) usam
`@firebase/rules-unit-testing`. Os E2E usam Auth, Firestore, Functions e
Storage Emulator, com um worker por padrão para preservar o estado do seed.

Para executar a rodada de hardening que cobre lacunas simuláveis da matriz:

```bash
nix shell github:nixos/nixpkgs/nixos-25.05#nodejs_20 -c zsh -lc \
  'cd frontend && npm run test:e2e -- e2e/specs/32-simulator-hardening.spec.ts --workers=1'
```

A spec `32-simulator-hardening.spec.ts` cobre retry de recuperação de senha,
upload/remoção imediata de foto de perfil, lote inválido, notificações
operacionais e deep links, limpeza paginada acima de 100 itens e payload PDF
de relatório/etiquetas. As specs `29`, `30` e `31` cobrem os fluxos de UI,
Q06/metrologia e escassez, respectivamente.

Essa evidência local não substitui os testes pós-deploy de Scheduler,
transporte/download publicado, Storage publicado, índices compostos de
produção ou provedores externos.

## Como executar

Pré-requisitos: Node.js (engine 20 no backend), Java (JRE para os emuladores),
npm e Firebase CLI (`npm install -g firebase-tools`).

1. Instale as dependências:

   ```bash
   cd frontend && npm install
   cd ../functions && npm install && npm run build
   ```

2. Suba os emuladores do Firebase (Terminal 1):

   ```bash
   cd functions
   npx firebase emulators:start
   ```

   Firestore em `8080`, Auth em `9099`, Functions em `5001`, Storage em
   `9199`; UI em `http://localhost:4000`. O projeto padrão é `lcqui-uenf`.

3. Rode o frontend (Terminal 2):

   ```bash
   cd frontend
   npm run dev
   ```

   Acesse `http://localhost:3000`.

4. (Opcional) Popule os emuladores com o seed, em outro terminal:

   ```bash
   cd functions
   npx tsx scripts/seed.ts
   ```

Para ambientes NixOS, o repositório possui `flake.nix` voltado ao
desenvolvimento da aplicação (Docker CLI, Node, Python) — **não** inclui TeX
Live. Veja o guia de compilação para o ambiente de documentação.

## Como compilar a documentação

O guia completo (Nix, logs e inspeção) está em
[`documentation/COMPILACAO_NIX_LCQUI.md`](documentation/COMPILACAO_NIX_LCQUI.md).

Com CUE 0.17.1, Alloy 6.2.0, Node, Rust, `just` e TeX Live no `PATH`:

```bash
just docs-build     # compila documentation/main.tex em build/latex
just formal-check   # rust-check + docs-check + docs-build + gates de diffs
```

`just docs-generate` regenera os fragmentos `documentation/generated/` a partir
da especificação. Os fragmentos gerados são determinísticos e **não** devem ser
editados manualmente.

## Próximos gates

1. Executar a regressão backend/frontend e as specs E2E com Node.js 20.
2. Atualizar a matriz somente quando houver evidência correspondente ao
   contrato normativo.
3. Após deploy, executar os cenários que o Emulator Suite não consegue
   provar: Scheduler, Storage/URLs publicados, download/transporte, índices
   compostos de produção e provedores externos.
