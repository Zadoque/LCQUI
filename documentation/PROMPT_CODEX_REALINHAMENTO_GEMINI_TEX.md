# Prompt operacional para o Codex — realinhamento da documentação LCQUI após auditoria do Gemini Spark

> **Executar este documento como instrução de trabalho.**
>
> **Repositório:** `Zadoque/LCQUI`  
> **Branch obrigatória:** `docs/realinhamento-especificacao-lcqui`  
> **HEAD observado na criação deste prompt:** `880d0328aa9a6ec8fdb677e0ca8115e0060ec1d6`  
> **Escopo primário:** documentação central modular em `documentation/**/*.tex` e PDF compilado `documentation/main.pdf`  
> **Auditoria de entrada:** `documentation/AUDITORIA_GEMINI_VALIDADA_LCQUI.md`, derivada dos achados `PDF-001` a `PDF-025` do Gemini Spark.

---

## 1. Contexto indispensável

O Gemini Spark auditou **somente o arquivo compilado `documentation/main.pdf`**. Portanto, a ausência de um comportamento no PDF é uma lacuna documental mesmo quando esse comportamento já está implementado em arquivos como `functions/src/usuarios.ts`, `functions/src/turmas.ts` ou outros módulos.

A tarefa desta rodada não é reavaliar o produto apenas pelo código nem implementar indiscriminadamente tudo o que o Gemini sugeriu. A tarefa é:

1. verificar, no HEAD atual, cada achado do Gemini que foi considerado válido ou parcialmente válido;
2. consultar o código real apenas como evidência do comportamento existente;
3. corrigir a especificação central nos arquivos `.tex`;
4. registrar separadamente qualquer divergência de implementação encontrada;
5. recompilar e validar `documentation/main.pdf`;
6. trabalhar em incrementos pequenos e persistentes, para que uma interrupção ou término de quota não apague o progresso.

A auditoria validada foi escrita sobre um HEAD anterior. Ela é o **backlog inicial**, não prova de que a lacuna continua igual no HEAD atual. Revalide antes de editar e não duplique conteúdo que já tenha sido incorporado.

---

## 2. Papéis que você deve assumir

Atue simultaneamente como:

1. **Arquiteto de Software Sênior**, responsável por preservar decisões de domínio, invariantes, limites transacionais, idempotência e coerência entre modelo lógico e modelo físico;
2. **Engenheiro Firebase/Firestore Sênior**, capaz de interpretar Cloud Functions, transações, Security Rules, índices, jobs agendados, Custom Claims e caminhos reais de coleções;
3. **Analista de Requisitos e Rastreabilidade**, ligando cada correção a RF, RN, UI, fluxo, entidade, coleção, função e critério de aceite;
4. **Engenheiro de Documentação Técnica**, responsável por transformar o comportamento real e o comportamento normativo em uma especificação inequívoca;
5. **Editor LaTeX**, responsável por alterações modulares, referências consistentes, tabelas legíveis e compilação reproduzível;
6. **Revisor de Qualidade**, responsável por distinguir implementação comprovada, requisito planejado, divergência de código, decisão de produto e falso positivo.

Não escreva como comentarista genérico. Produza contratos técnicos precisos, com entradas, atores, pré-condições, autorização, leituras, escritas, atomicidade, falhas, efeitos, auditoria e critérios de aceite.

---

## 3. Limites de autorização desta execução

### 3.1 Permitido

- ler todo o repositório;
- modificar `documentation/**/*.tex`;
- recompilar e, somente após validação final, atualizar `documentation/main.pdf`;
- criar os arquivos de planejamento, checkpoint, inconsistências e validação definidos neste prompt;
- atualizar `documentation/MATRIZ_IMPLEMENTACAO_LCQUI.md`, `documentation/STATUS_ATUAL.md`, `documentation/PROMPT_CONTEXTO_IA.md` e links documentais do `README.md`, desde que o conteúdo continue factual;
- fazer commits incrementais na branch indicada.

### 3.2 Não permitido nesta rodada

- alterar `functions/src/**`, `frontend/**`, `firestore.rules`, `storage.rules`, `firebase.json`, schemas, testes, migrações ou dados remotos;
- fazer deploy;
- executar migração remota;
- criar PR ou fazer merge;
- mudar decisões de domínio aprovadas;
- declarar que algo está implementado apenas porque foi especificado no LaTeX;
- reescrever a documentação normativa para esconder um bug do código.

Quando uma correção de código, Rules, índice, teste ou migração for necessária, descreva-a em `INCONSISTENCIAS_NOVAS.md` com uma solução proposta, mas não a implemente sem nova autorização.

---

## 4. Hierarquia de fontes

Use esta ordem para resolver conflitos:

1. decisões consolidadas vigentes em `documentation/MODIFICACOES_CONSOLIDADAS_LCQUI.md`;
2. regras e contratos normativos coerentes das Seções 3, 4, 5, 6, 7, 8, 9 e 11;
3. evidência do comportamento implantável em `functions/src/**`, schemas, Rules, configuração, frontend e testes;
4. `documentation/AUDITORIA_GEMINI_VALIDADA_LCQUI.md` como backlog validado;
5. arquivos em `documentation/archive/**` apenas como memória histórica.

Regras adicionais:

- arquivos em `documentation/archive/**` não são fontes normativas;
- exemplos da Seção 10 não prevalecem sobre decisões de domínio vigentes;
- teste existente não prova comportamento aprovado sem inspeção;
- documentação de comportamento esperado não prova implementação;
- se o código divergir de uma decisão normativa vigente, preserve a decisão e registre a divergência;
- se duas fontes normativas vigentes se contradisserem e não houver decisão fechada, não invente uma. Registre em `DECISOES_NECESSARIAS.md`.

Antes de iniciar as correções, ajuste referências ativas que ainda apontem para os caminhos antigos de arquivos arquivados, especialmente em `README.md` e `documentation/PROMPT_CONTEXTO_IA.md`.

---

## 5. Arquivos que devem ser criados antes da primeira alteração em LaTeX

Crie e faça um primeiro commit contendo:

```text
documentation/worklogs/realinhamento-gemini/
├── PLANO_INCREMENTAL.md
├── CHECKPOINT.md
├── INCONSISTENCIAS_NOVAS.md
├── DECISOES_NECESSARIAS.md
└── VALIDACAO.md
```

### 5.1 `PLANO_INCREMENTAL.md`

Deve conter uma linha para cada `PDF-001` a `PDF-025` e `EXTRA-001` a `EXTRA-003`, com:

| Campo | Conteúdo |
|---|---|
| ID | Identificador da auditoria |
| Situação no HEAD | ausente, parcial, contraditório, já coberto ou rejeitado |
| Categoria | documental implementado, contrato planejado, divergência código-documento, decisão ou falso positivo |
| Arquivos de evidência | código/Rules/testes consultados |
| Arquivos `.tex` alvo | arquivos que serão editados |
| Ação exata | o que inserir, substituir, remover ou referenciar |
| Critério de aceite | prova documental e de build |
| Estado | PENDENTE, EM_ANDAMENTO, APLICADO_TEX, VALIDADO_BUILD ou BLOQUEADO |
| Commit | SHA após concluir o item/lote |

Não marque nenhum item como concluído no arquivo inicial.

### 5.2 `CHECKPOINT.md`

Deve ser a fonte curta para retomada após interrupção. Mantenha no topo:

- branch;
- HEAD de início e HEAD atual;
- último commit concluído;
- lote atual;
- último arquivo editado;
- último build executado e resultado;
- próxima ação exata;
- arquivos com alterações ainda não validadas;
- bloqueios;
- itens concluídos, pendentes e deliberadamente não alterados.

Atualize-o **antes e depois de cada lote**.

### 5.3 `INCONSISTENCIAS_NOVAS.md`

Registre somente problemas novos ou divergências que exijam trabalho fora do escopo documental. Use IDs sequenciais `INC-GEM-001`, `INC-GEM-002` etc. Cada registro deve conter:

- resumo;
- evidência com caminhos e símbolos;
- requisito/decisão afetado;
- impacto;
- solução proposta;
- arquivos que precisariam ser alterados;
- testes/migração necessários;
- prioridade;
- estado: PROPOSTA, DECISAO_NECESSARIA ou FORA_DE_ESCOPO.

Não transforme proposta em fato e não edite código nesta rodada.

### 5.4 `DECISOES_NECESSARIAS.md`

Use somente quando existir ambiguidade normativa real. Para cada decisão:

- contexto;
- alternativas;
- impactos;
- recomendação técnica;
- pergunta objetiva ao responsável;
- trabalho bloqueado.

Se não houver decisões, mantenha o arquivo com “Nenhuma decisão pendente nesta rodada”.

### 5.5 `VALIDACAO.md`

Registre por lote:

- data/hora;
- commit;
- comando de compilação;
- exit code;
- páginas;
- erros;
- referências indefinidas;
- avisos novos e preexistentes;
- `git diff --check`;
- páginas inspecionadas visualmente;
- limitações.

Nunca reutilize resultado de build antigo como validação do lote atual.

---

## 6. Classificação obrigatória antes de editar

Para cada achado, use exatamente uma destas categorias:

### A. `DOC_AUSENTE_IMPLEMENTADO`

O código atual implementa o comportamento, mas o LaTeX não o especifica. Documente o contrato real com precisão e cite no worklog os arquivos/símbolos usados como evidência.

### B. `DOC_CONTRADIZ_IMPLEMENTACAO_VALIDA`

A decisão canônica e o código concordam, mas o LaTeX está antigo ou apresenta algoritmo concorrente. Corrija o LaTeX e remova a versão obsoleta.

### C. `CONTRATO_NORMATIVO_NAO_IMPLEMENTADO`

O achado é válido como requisito/arquitetura, mas o comportamento ainda não está implementado. Incorpore o contrato correto no LaTeX sem afirmar que já funciona e registre a lacuna de implementação em `INCONSISTENCIAS_NOVAS.md`.

### D. `CODIGO_DIVERGE_DA_DECISAO`

A documentação normativa vigente está correta e o código está errado ou incompleto. Não adapte a regra ao bug. Consolide a regra no LaTeX, registre a divergência e proponha a correção fora de escopo.

### E. `JA_COBERTO_NO_TEX_ATUAL`

O item já está completo no HEAD. Não duplique texto. Registre os trechos e referências no plano e marque como validado somente depois do build.

### F. `REJEITADO_OU_SUPERADO`

A sugestão conflita com decisão vigente ou já não se aplica. Não a implemente. Garanta apenas que o PDF deixe a decisão inequívoca.

---

## 7. Arquivos de implementação a consultar como evidência

### Identidade, autenticação e papéis

- `functions/src/usuarios.ts`
- `functions/src/auth.ts`
- `functions/src/domain/revogarPapel.ts`
- `functions/src/schemas/usuarios.schema.ts`
- `functions/src/__tests__/domain/roles.test.ts`
- `functions/src/__tests__/domain/revogacao.test.ts`
- `functions/src/__tests__/integration/usuarios.integration.test.ts`
- `firestore.rules`

### Turmas, convites, alunos, posts e comentários

- `functions/src/turmas.ts`
- `functions/src/posts.ts`
- `functions/src/schemas/turmas.schema.ts`
- `functions/src/schemas/posts.schema.ts`
- `functions/src/__tests__/turmas.test.ts`
- componentes e páginas em `frontend/src/components/turmas/**` e `frontend/src/app/turmas/**`
- `firestore.rules`

### Patrimônio

- `functions/src/patrimonio.ts`
- `functions/src/schemas/patrimonio.schema.ts`
- `functions/src/__tests__/patrimonio.test.ts`
- `frontend/src/components/patrimonio/**`
- `frontend/src/app/patrimonio/**`
- `firestore.rules`

### Reagentes, frascos, lotes e etiquetas

- `functions/src/reagentes.ts`
- `functions/src/reagentes_base.ts`
- `functions/src/schemas/reagentes.schema.ts`
- `functions/src/schemas/reagentes_base.schema.ts`
- `functions/src/__tests__/reagentes.test.ts`
- `frontend/src/components/reagentes/**`
- `frontend/src/app/reagentes/**`
- `firestore.rules`

### Relatórios, notificações, jobs e infraestrutura

- `functions/src/relatorios.ts`
- `functions/src/notificacoes.ts`
- `functions/src/schemas/relatorios.schema.ts`
- `functions/src/schemas/notificacoes.schema.ts`
- `functions/src/__tests__/relatorios.test.ts`
- `functions/src/__tests__/notificacoes.test.ts`
- `functions/src/index.ts`
- `frontend/src/lib/pdf.ts`
- `firebase.json`
- `firestore.rules`

Ignore `functions/lib/**` e `functions/node_modules/**` como fonte: são artefatos compilados/dependências. Não use logs de debug como evidência normativa.

---

## 8. Arquivos LaTeX principais e responsabilidade

| Arquivo | Responsabilidade |
|---|---|
| `Section-3-Stakeholders.tex` | papéis, escopos e responsabilidades |
| `Section-4-Modelagem-Entidades-SQL-3FN.tex` | entidades lógicas, atributos e dependências |
| `Section-5-Notas-de-Mapeamento-para-Firestore.tex` | caminhos físicos, documentos, subcoleções, IDs, índices e snapshots |
| `Section-6-Materialized-Views.tex` | materializações, periodicidade, idempotência e reconstrução |
| `Section-7-Requisitos-e-Regras-de-Negocio.tex` | RF, RN, invariantes e critérios |
| `Section-8-Descricao-das-telas-Dashboards.tex` | UX, modais, campos, ações, estados, mensagens e acessibilidade |
| `Section-9-Exemplos-de-fluxos.tex` | sequências ponta a ponta, sucessos, falhas e efeitos |
| `Section-10-Subsection-3-Funcoes-de-Apoio-Autorizacao.tex` | helpers de autorização |
| `Section-10-Subsection-4-Revogacao-de-Papel.tex` | concessão/revogação e preservação de vínculos |
| `Section-10-Subsection-5-Fluxo-de-Reagentes.tex` | lotes, frascos, retirada, devolução e Q06/Q14 |
| `Section-10-Subsection-7-Jobs-Agendados.tex` | jobs, notificações e materializações |
| `Section-10-Subsection-8-Fluxo-de-Bens-Patrimoniais.tex` | requisições, locks, versão, unicidade e histórico |
| `Section-10-Subsection-9-Relatorios-em-PDF.tex` | contratos de relatórios e fontes históricas |
| `Section-10-Subsection-10-Consolidacao-do-planejamento.tex` | contratos transversais ainda sem subseção própria |
| `Section-11-Regras-de-Seguranca-do-Firestore-Security-Rules.tex` | matriz autorizativa e caminhos de Rules |
| `Section-12-Implementacoes-em-Estudo-para-Versoes-Futuras.tex` | somente itens explicitamente postergados |

O arquivo `documentation/main.tex` deve continuar apenas como orquestrador modular. Não transforme `main.tex` em arquivo monolítico.

---

## 9. Backlog obrigatório dos achados válidos

Revalide todos no HEAD. A tabela abaixo define o foco documental mínimo, não autoriza alteração de código.

| ID | Conteúdo que o PDF deve especificar | Alvos `.tex` prováveis |
|---|---|---|
| PDF-001 | fluxo patrimonial transacional; `versao_bem_origem`; leituras antes das escritas; rejeição sem deadlock; liberação de lock; histórico; unicidade concorrente de `numero_patrimonio` por chave determinística e backfill | 4, 5, 7, 9, 10.8, 11 |
| PDF-003 | contrato único de matrícula para código, adição nominal e convite; espelhos; capacidade; turma arquivada; exceção nominal justificada; idempotência; aceite de convite | 4, 5, 7, 8, 9, 10.10, 11 |
| PDF-004 | Q14: autoatendimento apenas pelo único gestor ativo, justificativa, notificação idempotente à Chefia e auditoria; enums `Chefe_Geral` e `AUTO_ATENDIMENTO` | 4, 5, 7, 8, 9, 10.5, 10.7, 11 |
| PDF-005 | matriz de Rules para convites, materializações e especificações aninhadas; escrita crítica somente via backend quando houver invariante | 5, 7, 9, 10.3, 11 |
| PDF-006 | relatório mensal patrimonial baseado em fatos históricos do período, incluindo prédio/sala/situação no corte; ou decisão explícita por relatório apenas atual, sem parâmetros temporais fictícios | 5, 6, 7, 8, 9, 10.9 |
| PDF-007 | um único mecanismo oficial de propagação de nome, limitado em lotes/BulkWriter; remover algoritmo documental concorrente e batch ilimitado | 5, 7, 10.7 ou 10.8 |
| PDF-008 | catálogo de índices realmente exigidos pelas consultas; índices compostos e collection-group; obrigação de configuração declarativa versionada sem inventar índices | 5, 7, 10.9, 11 |
| PDF-009 | edição de posts/comentários, moderação institucional com justificativa, histórico, soft-delete/tombstone e preservação do conteúdo anterior | 4, 5, 7, 8, 9, 10.10, 11 |
| PDF-010 | contrato formal de `cadastrarAlmoxarifado`: Chefe ativo, validação dos gestores, vínculos determinísticos, atomicidade, auditoria e bloqueio de escrita direta | 4, 5, 7, 8, 9, 10.10, 11 |
| PDF-011 | jobs implantáveis para resumos diários/mensais: timezone, IDs determinísticos, idempotência, backfill, reconciliação, telemetria e Rules | 5, 6, 7, 9, 10.7, 11 |
| PDF-012 | `Lote.id_resumo_reagente`; caminho físico único `Resumo_Reagente/{idResumo}/Especificacoes/{idEspecificacao}`; compatibilidade; migração/backfill | 4, 5, 7, 9, 10.5, 10.9, 11 |
| PDF-013 | contrato da função existente `removerAlunoTurma`: remoção dos dois vínculos, histórico, contador, autorização e idempotência; não criar fluxo paralelo | 5, 7, 8, 9, 10.10, 11 |
| PDF-014 | transições server-side de descarte, quebra, vazio e quarentena; estados permitidos; vínculo do gestor; histórico; auditoria; bloqueios posteriores | 4, 5, 7, 8, 9, 10.5, 11 |
| PDF-015 | datas civis sempre interpretadas em `America/Sao_Paulo`, depois convertidas para Timestamp/UTC; aplicação a relatórios, jobs, validade, retirada e devolução | 5, 6, 7, 9, 10.5, 10.6, 10.7, 10.9 |
| PDF-016 | triggers de contagem idempotentes por `event.id`/ledger ou recomputação; mudança de lote; reconciliação de drift | 5, 6, 7, 10.7 |
| PDF-017 | documentar que `onLocalAtualizado` usa chunks seguros; remover snippet de batch único; coordenar com a decisão do PDF-007 | 5, 7, 10.8 |
| PDF-018 | singleton de código de frasco como decisão a medir; benchmark p50/p95/p99, retries, throughput e falhas; não registrar o limite “1–5 writes/s” como fato | 5, 7, 10.5, 10.10 |
| PDF-020 | distinção entre janela aceita de claims para leituras e revalidação persistida de usuário/papel/vínculo nas mutações críticas; não prometer revogação instantânea geral | 3, 7, 9, 10.3, 10.4, 11 |
| PDF-023 | escassez por `(id_resumo_reagente, id_almoxarifado)`; destinatários ativos/vinculados; ID de notificação idempotente com unidade/data/UID | 5, 6, 7, 8, 9, 10.7 |
| PDF-025 | regra canônica Q06: `max(1 g, 0,5% × peso_saida)` normal e `max(2 g, 2% × peso_saida)` higroscópico; consumo zero + evento `AJUSTE` dentro da tolerância; bloqueio acima dela; snapshot físico | 4, 5, 7, 8, 9, 10.5 |

### Achados adicionais da validação

| ID | Conteúdo |
|---|---|
| EXTRA-001 | procurar globalmente `Especificacao_Reagente` e distinguir nome conceitual de caminho físico legado; o caminho físico canônico é aninhado |
| EXTRA-002 | não concluir PDF-004 apenas adicionando enum; Q14 exige regra operacional completa |
| EXTRA-003 | confirmar que V1 aceita somente `SOLIDO` e `LIQUIDO`; `GASOSO` pertence ao futuro se a decisão consolidada continuar vigente; não confundir estado físico com natureza química |

---

## 10. Itens de controle que não devem ser “corrigidos” como o Gemini sugeriu

Mesmo não exigindo a solução original, revalide-os e garanta que o PDF atual deixe a decisão clara:

| ID | Decisão/controle |
|---|---|
| PDF-002 | revogação de papel já possui mecanismo; não criar cascata automática de `Aluno` mantendo `Bolsista`; documentar a ordem segura e a matriz de papéis |
| PDF-019 | etiqueta virgem não reserva identificador oficial; o código nasce no cadastro físico/transação |
| PDF-021 | UI-05 é o contrato normativo do assistente “Novo Reagente”; não reintroduzir formulário plano legado |
| PDF-022 | natureza química canônica: `ORGANICO`, `INORGANICO`, `ELEMENTO`, `HIBRIDO`; não reintroduzir “Complexo/Biológico” |
| PDF-024 | nome canônico `qtd_frascos_adicionados`; não reintroduzir campo com espaço/underscore incorreto |

Classifique cada um como `JA_COBERTO_NO_TEX_ATUAL` ou `REJEITADO_OU_SUPERADO`. Faça edição somente se a decisão ainda não estiver inequívoca.

---

## 11. Conteúdo mínimo de cada contrato inserido no LaTeX

Ao corrigir um ponto, não inclua apenas um parágrafo abstrato. Sempre que aplicável, documente:

1. ator e papel autorizado;
2. escopo institucional/almoxarifado/turma;
3. entrada e campos obrigatórios;
4. pré-condições;
5. validação server-side;
6. leituras necessárias;
7. ordem transacional;
8. documentos criados/atualizados;
9. ID determinístico ou estratégia de idempotência;
10. histórico e auditoria;
11. notificações;
12. falhas e mensagens esperadas;
13. efeitos na UI;
14. regras de acesso;
15. migração/backfill quando o modelo mudar;
16. critérios de aceite;
17. estado de implementação apenas no arquivo de rastreabilidade, nunca inferido.

Evite copiar grandes trechos de TypeScript para o PDF. Use pseudocódigo preciso quando ele esclarecer o contrato e mantenha o código real como evidência no worklog.

---

## 12. Execução incremental obrigatória

### Fase 0 — baseline e plano

1. confirmar branch e HEAD;
2. ler instruções `AGENTS.md` aplicáveis;
3. criar os cinco arquivos de worklog;
4. corrigir links ativos para arquivos movidos a `documentation/archive/`;
5. compilar o baseline conforme `documentation/COMPILACAO_NIX_LCQUI.md`;
6. preencher o plano com a situação atual dos 28 IDs;
7. fazer commit apenas do planejamento e baseline.

### Fase 1 — patrimônio e caminhos físicos críticos

Tratar, em pequenos lotes:

- PDF-001;
- PDF-005;
- PDF-012;
- EXTRA-001.

Após cada item ou lote de no máximo dois itens:

1. atualizar `CHECKPOINT.md`;
2. compilar em diretório temporário próprio;
3. executar `git diff --check`;
4. registrar validação;
5. fazer commit.

### Fase 2 — reagentes, metrologia e operações

Tratar:

- PDF-004 + EXTRA-002;
- PDF-014;
- PDF-015;
- PDF-025;
- EXTRA-003.

Não misture Q06, Q14 e gases em um texto único; são contratos diferentes.

### Fase 3 — identidade e domínio acadêmico

Tratar:

- PDF-002 como controle;
- PDF-003;
- PDF-009;
- PDF-010;
- PDF-013;
- PDF-020.

Consulte `usuarios.ts`, `turmas.ts` e `posts.ts` para documentar o que já existe sem duplicar funções.

### Fase 4 — jobs, relatórios, fan-out e desempenho

Tratar:

- PDF-006;
- PDF-007;
- PDF-008;
- PDF-011;
- PDF-016;
- PDF-017;
- PDF-018;
- PDF-023.

Não confunda “contrato especificado” com “job implantado”. Registre implementações ausentes fora do LaTeX.

### Fase 5 — controles restantes e consistência transversal

Revalidar:

- PDF-019;
- PDF-021;
- PDF-022;
- PDF-024.

Depois executar buscas globais por nomes, paths, enums e fórmulas concorrentes. Corrigir referências cruzadas e duplicidades.

### Fase 6 — fechamento

1. atualizar matriz, status, checkpoint e validação;
2. compilar o documento completo em diretório novo;
3. exigir exit code 0;
4. verificar erros e referências indefinidas no log final;
5. executar `git diff --check`;
6. inspecionar visualmente todas as páginas alteradas;
7. copiar o PDF aprovado para `documentation/main.pdf`;
8. fazer commit final;
9. deixar `CHECKPOINT.md` com estado `CONCLUIDO` ou com a próxima ação exata se houver bloqueio.

---

## 13. Política de commits e retomada

Faça commits pequenos e temáticos. Sugestões:

```text
docs(gemini): create incremental realignment worklog
docs(gemini): align patrimonial transaction contracts
docs(gemini): unify reagent specification paths
docs(gemini): document Q06 and Q14 invariants
docs(gemini): align academic membership and moderation flows
docs(gemini): specify jobs reports and idempotency
docs(gemini): validate and rebuild central specification
```

Regras:

- não acumular todas as alterações em um único commit;
- não iniciar novo lote antes de registrar o anterior;
- se a quota estiver próxima do fim, pare de editar conteúdo, atualize o checkpoint, valide o que já estiver completo e faça commit;
- nunca deixar item marcado como `APLICADO_TEX` sem informar os arquivos realmente alterados;
- nunca marcar `VALIDADO_BUILD` sem build do commit/lote correspondente;
- em retomada, leia primeiro `CHECKPOINT.md`, depois `PLANO_INCREMENTAL.md`, e continue da “próxima ação exata”.

---

## 14. Compilação e qualidade

Siga `documentation/COMPILACAO_NIX_LCQUI.md`. Use diretórios temporários diferentes por lote. O padrão esperado é equivalente a:

```sh
nix shell nixpkgs#texliveFull -c latexmk   -cd -pdf -interaction=nonstopmode -halt-on-error   -outdir=/tmp/lcqui-tex-gemini-lote-N   documentation/main.tex
```

A validação exige:

- exit code 0;
- nenhum `LaTeX Error`;
- nenhuma referência indefinida no log final;
- nenhum problema em `git diff --check`;
- inspeção visual das páginas afetadas;
- comparação do número de páginas e registro de avisos;
- `documentation/main.pdf` atualizado somente no fechamento aprovado.

Avisos `Overfull` preexistentes não podem ser escondidos. Registre quais são antigos e quais foram introduzidos.

---

## 15. Definition of Done

A tarefa só está concluída quando:

- [ ] os 25 IDs do Gemini e os três EXTRAs foram revalidados no HEAD atual;
- [ ] todos os achados válidos estão representados corretamente nos arquivos `.tex`;
- [ ] funções já existentes, como fluxos em `usuarios.ts` e `turmas.ts`, aparecem no contrato central quando relevantes;
- [ ] nenhum falso positivo foi transformado em requisito;
- [ ] nenhuma divergência de código foi escondida por alteração normativa;
- [ ] todas as novas inconsistências possuem evidência e solução proposta;
- [ ] o plano e o checkpoint permitem retomada sem reler toda a sessão;
- [ ] a matriz distingue `APLICADO_DOCUMENTACAO`, `IMPLEMENTADO_CODIGO` e `VALIDADO`;
- [ ] o build final foi aprovado e registrado;
- [ ] `documentation/main.pdf` corresponde exatamente aos `.tex` finais;
- [ ] não houve alteração de código, Rules, deploy ou migração;
- [ ] o último commit contém documentação e rastreabilidade coerentes.

---

## 16. Relatório final esperado do Codex

Ao terminar, responda com:

1. HEAD inicial e final;
2. commits criados;
3. IDs corrigidos, já cobertos, rejeitados e bloqueados;
4. arquivos `.tex` alterados por ID;
5. novas inconsistências registradas;
6. decisões ainda necessárias;
7. resultado do build final;
8. número de páginas;
9. avisos remanescentes;
10. confirmação explícita de que nenhum código, Rules, deploy ou dado remoto foi alterado.

Se a execução terminar antes da conclusão, não produza um resumo vago. Atualize e aponte o `CHECKPOINT.md`, informando exatamente qual é a próxima ação.
