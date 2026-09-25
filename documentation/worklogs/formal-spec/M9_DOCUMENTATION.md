# M9 — Autorização / usuários (documentação)

Estado: DOCUMENTATION_VALIDATED. Rodada exclusivamente documental; não cria
CUE, IR, Alloy, receipt, validator Rust, fragmentos gerados ou capítulo formal
M9.

## 1. Entrada, branch e baseline

- Branch confirmada: `feat/formal-spec-cue-alloy`.
- HEAD de entrada: `db5d2db6804b2e8fd8f142b2084cff207333555e`.
- HEAD da consolidação documental: `dd5024ebd8987a65e18888a6508a79ef54e16431`
  (`docs(m9): consolidate authorization contract`).
- Árvore de entrada: limpa.
- `just formal-check` sem PATH Nix: exit 127 (binário `just` ausente).
- Gate oficial com PATH Nix e CARGO_HOME: PASS; 21 testes Rust, clippy e 8
  testes Node passaram; a primeira execução sandbox falhou em
  `spawnSync cue EPERM`, e a execução autorizada fora do sandbox concluiu a
  cadeia. M0--M8 não regrediram.

## 2. Fontes lidas e mapa de impacto

Foram lidos integralmente os estados, STATUS_ATUAL, M5--M8 documental e
executável, arquitetura formal, Seções 3--12, subseções 10.2--10.11,
firestore.rules, storage.rules, firebase.json, functions, frontend e testes de
auth/roles/rules. Busca global incluiu role, papel, usuário, uid, claims, auth,
autorização, gestor, professor, aluno, chefe, ativo, revogação, vínculo,
almoxarifado, patrimônio e ownership.

Impactados documentalmente: Seções 3, 4, 5, 7, 8, 9, 10.3, 10.4, 11 e 12.
A Seção 7/M9 passa a ser autoridade única; as demais a referenciam.

## 3. Contratos herdados

- M5: RBAC nunca libera transição de extravio, reencontro ou quarentena
  proibida.
- M6: administração não cria correção metrológica genérica.
- M7: identidade continua (uid, tipo_operacao, payload_hash); retry não cria
  efeito novo.
- M8: App Check, Auth, RBAC/escopo, rate limit e cache/agregação preservam a
  ordem, inclusive cache hit; cache, estoques configurados e notificações são
  server-owned.

## 4. Modelo final

RBAC + vínculo/escopo persistido + ownership. Papéis fechados: Chefe_Geral,
Gestor_Almoxarifado, Gestor_Bens_Patrimoniais, Professor, Aluno e Bolsista.
Usuário ativo, papéis persistidos, vínculo N:N de almoxarifado, ownership de
turma/roteiro/requisição e matrícula canônica são autoridades. Custom Claims
são projeção de transporte/UI/Rules, não autoridade isolada.

Decisão: podeExecutar(uid, operacao, recurso, estadoAtual). Falha fechada para
conta, papel, versão, vínculo, ownership ou recurso ausente/inválido. Mutação
crítica lê todos esses elementos dentro da transação que escreve o efeito.

## 5. Revogação, claims e TOCTOU

Papel, vínculo ou conta alterado incrementa versao_permissoes no mesmo commit,
marca claims_pendentes e depois reconcilia Firebase Auth. Claim nova só entra
em token novo; refresh/revoke de sessão é complementar. Rules de leitura
direta exigem token-versão, Usuário ativo e relação atual. Backend crítico
consulta a autoridade persistida em transação. Transação reexecutada por
mudança de documento reavalia autorização; commit depois de revogação é negado.
Retry M7 concluído retorna somente receipt já existente ao mesmo UID.

## 6. Security Rules x backend

Rules protegem SDK cliente; Admin SDK as ignora. Portanto Rules negam escrita
direta server-owned e backend aplica matriz M9, domínio e transação. UI não é
controle. Jobs/triggers usam IAM mínimo, entrada server-owned, deduplicação M7
e revalidação de destinatários.

## 7. Findings

| ID | Categoria | Evidência / impacto | Proposta / estado |
|---|---|---|---|
| M9-F01 | CONTRADICAO_DOCUMENTAL | Seção 10.3 aceitava papéis só do JWT para mutações e apenas verificava ativo seletivamente. | Seção 7/M9 estabelece fonte persistida e Tx. RESOLVIDO documentalmente. |
| M9-F02 | LACUNA_DE_SEGURANCA | Claims antigas após revogação não eram tratadas como insuficientes universalmente. | Versão persistida, reconciliação e fail closed. RESOLVIDO documentalmente. |
| M9-F03 | LACUNA_DE_SEGURANCA | Checagem pré-transacional de gestor permitia TOCTOU. | Decisão transacional obrigatória. RESOLVIDO documentalmente. |
| M9-F04 | CONTRADICAO_DOCUMENTAL | Tabelas de Rules admitiam escrita/leituras amplas contra server-owned e ownership. | Erratum M9 na Seção 11. RESOLVIDO documentalmente. |
| M9-F05 | ERRO_MECANICO | Modelo 3FN Usuario omitia ativo, versao_permissoes e claims_pendentes já usados no Firestore. | Campos inseridos na Seção 4/5. RESOLVIDO. |
| M9-F06 | DIVERGENCIA_IMPLEMENTACAO | functions/src/auth.ts decide por claims; operações críticas consultam escopo antes de Tx e não exigem App Check. | Registrada; não alterada nesta rodada. DÍVIDA. |
| M9-F07 | DIVERGENCIA_IMPLEMENTACAO | firestore.rules permite escrita cliente de patrimônio, turmas, vínculos, locks e update/delete de notificações; várias leituras são amplas. | Registrada; não alterada. DÍVIDA. |
| M9-F08 | DIVERGENCIA_IMPLEMENTACAO | storage.rules usa claims/metadata e leitura autenticada ampla, sem estado atual/ownership canônico. | Registrada; não alterada. DÍVIDA. |
| M9-F09 | DIVERGENCIA_IMPLEMENTACAO | frontend infere ativo de claims e ProtectedRoute só protege UX. | Registrada; não alterada. DÍVIDA. |
| M9-F10 | DIVERGENCIA_IMPLEMENTACAO | usuarios.ts usa fallback randomUUID e identidade de Operacoes incompatível com M7; não revalida permissões na forma M9. | Registrada; não alterada. DÍVIDA. |

## 8. Matriz e regressão

A matriz rastreável está na Seção 7/M9. Os casos mínimos explicitados ali
cobrem todos os 22 cenários pedidos: autenticação/roles/ativo, escopos,
ownership acadêmico, Chefe, Rules/Admin SDK, revogação/TOCTOU, M7, M8,
notificações e barreiras M5/M6.

## 9. Human Questions

Nenhuma. Escopo global da Chefia e do Gestor Patrimonial, N:N de almoxarifado,
papéis e ownership já estavam decididos. Não foi inventado novo paradigma.

## 10. Fronteiras M10+

Não foi iniciado M10. Patrimônio continua usando seu escopo V1 global; qualquer
escopo patrimonial futuro exige decisão nova. A implementação, testes de Rules,
IAM, App Check, Storage e formalização executável de M9 ficam em rodadas
separadas.

## 11. Validação, PDF e auditorias

- Baseline: `just formal-check` oficial PASS (exit 0). A tentativa sem o PATH
  Nix deu exit 127 para `just`; a tentativa sandbox da cadeia deu EPERM ao
  iniciar CUE, e a execução oficial autorizada concluiu PASS.
- Fechamento: `git diff --check` PASS (exit 0); `cargo fmt --check` PASS
  (exit 0); `cargo test --locked` PASS (exit 0, 21 testes); `cargo clippy
  --all-targets -- -D warnings` PASS (exit 0). Uma repetição de
  `just formal-check` sem o diretório TeX no PATH falhou em `latexmk` ausente
  (exit 127) e não foi contada como gate. A execução oficial com os PATHs Nix
  de just e TeX completos passou (exit 0, 8 testes Node, Alloy, checagem
  documental, PDF e diff).
- `just docs-build` PASS (exit 0): `main.pdf` com 371 páginas, zero erros
  LaTeX e zero referências/citações indefinidas. Há 28 avisos Overfull
  herdados, todos fora dos trechos M9 alterados; nenhum novo Overfull M9.
- Inspeção visual por renderização: páginas 111--113 (fonte, matriz, claims e
  TOCTOU), 195 (erratum de autoridade), 319 (Rules) e 325 (fronteira futura).
  Sem corte, sobreposição ou referência quebrada nos trechos M9.
- Auditoria integral 1: reavaliou Seções 3--12, matriz, 3FN/Firestore e
  consistência com M5--M8; zero finding novo.
- Auditoria integral 2: reavaliou functions, frontend, Rules/Storage,
  Admin SDK, claims, revogação e TOCTOU; zero finding novo, divergências
  M9-F06--F10 permanecem corretamente classificadas como implementação.
- Auditoria integral 3: reavaliou fronteiras de sessão/retry M7/cache M8,
  ownership acadêmico, operações server-owned e fail closed; zero finding
  novo. Contador final: 3 auditorias integrais consecutivas limpas.

## 12. Estado e próxima ação

M0--M8 = VALIDATED; M9 = DOCUMENTATION_VALIDATED; M10+ = NOT_STARTED.
Próxima ação permitida: formalização executável de M9 em rodada separada
(CUE → IR → Alloy → receipt → Rust → LaTeX → PDF).
