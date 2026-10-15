# Estoque atual e notificações — cache, listeners e invalidação

## Norma aplicada

- Seção 8, UI-12/UI-13/UI-19 e seção de estoque atual: o estoque é uma
  fotografia agregada protegida, com instante do cálculo, limite por UID,
  cache somente dentro da validade informada pelo servidor e invalidação após
  mutação.
- O listener de notificações é limitado à caixa do UID autenticado. O estado
  vindo do cache local pode ser exibido offline, mas não deve permanecer como
  desatualizado depois que o Firestore confirmar a sincronização.

## Alterações

- `obterEstoqueAtual` agora devolve `calculado_em_ms` e `expira_em_ms`, tanto em
  cache hit quanto após uma agregação nova.
- As mutações de `Frasco_Reagente` invalidam, na mesma transação, o cache amplo
  do almoxarifado e o cache específico do resumo quando aplicável.
- O frontend mantém somente cache curto em memória, respeita a validade do
  servidor e o descarta após mutações confirmadas. O botão manual pode ignorar
  esse cache; a autorização, o rate limit e a fonte canônica continuam no
  backend.
- O listener de notificações usa `includeMetadataChanges: true`, separa erro
  de leitura do estado temporário `fromCache` e não transforma falha ao abrir
  uma notificação em falso aviso de dados desatualizados.

## Evidência

- `functions`: `estoque.test.ts` + `reagentes.test.ts`: **40/40** com o
  Emulator Suite.
- E2E estoque isolado: `28-cross-cutting-smoke.spec.ts`,
  `ROLE-003/CACHE-001-E2E-001`: **1/1**.
- E2E notificações: `15-notificacoes-page.spec.ts`,
  `UI-004-E2E-003`: **1/1**, sem aviso persistente após sincronização online.
- TypeScript frontend, lint frontend e build das Functions: verdes em Node.js
  20.19.6.

## Observação sobre o rate limit

A execução combinada de specs que reutiliza o mesmo UID pode atingir o limite
normativo de cinco chamadas por minuto e, corretamente, receber
`resource-exhausted`. O cenário de estoque foi repetido isoladamente com seed
limpo; não se aumentou o limite nem se mascarou o estado de rate limit.

## Auditoria complementar de consultas repetidas

Além do estoque e das notificações, a busca operacional repetia consultas em
aberturas sucessivas de modais e detalhes. Foram adicionados caches curtos,
deduplicação de promessas concorrentes, escopo por UID e invalidação após
mutação para:

- catálogo de reagentes e catálogo de substâncias;
- locais de retirada e almoxarifado vinculado ao gestor;
- lotes por especificação, frascos sem lote, frascos de um lote e frasco por
  código;
- pesquisa patrimonial repetida com os mesmos filtros;
- buscas administrativas por papéis e usuários elegíveis para retirada.

As consultas de papéis continuam sendo feitas por callable server-side. Não foi
criado listener direto de `Usuarios`, pois isso exporia uma coleção protegida e
contrariaria o contrato de UI-02/M9.

## Evidência E2E final

Executado com Node.js 20.19.6, `LCQUI_E2E_PROJECT_ID=lcqui-dev` e Firebase
Emulator Suite:

- `25-catalogo-reagentes.spec.ts` + `31-escassez.spec.ts`: **7/7**;
- `24-retirada.spec.ts`: **2/2**, incluindo prova de que a segunda busca do
  mesmo retirante e local não dispara nova callable;
- `30-metrologia-q06.spec.ts`: **3/3**;
- `15-notificacoes-page.spec.ts` + `28-cross-cutting-smoke.spec.ts`: **8/8**;
- `21-patrimonio-requisicoes.spec.ts` + `29-matriz-ui-smoke.spec.ts`: **14/14**;
- regressão final `25-catalogo-reagentes.spec.ts` + `24-retirada.spec.ts`:
  **8/8**.

Total desta rodada: **42 execuções E2E aprovadas**. A falha intermediária da
primeira execução de retirada foi corrigida: a API `FieldPath` precisava ser
importada de `firebase-admin/firestore` em vez de acessada por
`admin.firestore.FieldPath`.
