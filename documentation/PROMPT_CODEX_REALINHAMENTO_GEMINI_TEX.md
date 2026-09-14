# Prompt operacional para o Codex — consolidação documental LCQUI após auditoria do Gemini Spark

> **Execute este documento como instrução de trabalho.**
>
> **Repositório:** `Zadoque/LCQUI`  
> **Branch obrigatória:** `docs/realinhamento-especificacao-lcqui`  
> **Arquivo principal:** `documentation/main.tex`  
> **Produto documental:** `documentation/main.pdf`  
> **Backlog de origem:** achados `PDF-001` a `PDF-025` do Gemini Spark e `EXTRA-001` a `EXTRA-003`.

---

## 1. Princípio não negociável desta fase

A documentação consolidada é a especificação que orientará a implementação futura. Portanto:

> **A implementação atual não é fonte da verdade para esta tarefa.**

Não use arquivos de código, frontend, schemas, testes, Security Rules, índices implantados ou comportamento observado do sistema para decidir o que a documentação deve exigir.

A direção correta é:

```text
decisões de domínio e requisitos
          ↓
documentação central consolidada em .tex
          ↓
main.pdf aprovado
          ↓
auditoria futura documentação × implementação
          ↓
fase posterior de desenvolvimento
```

É proibido inverter essa direção. Não documente um comportamento apenas porque ele existe no código. Não reduza, altere ou descarte um requisito porque a implementação atual ainda não o atende.

O Gemini Spark analisou somente `documentation/main.pdf`. Assim, quando ele identificou que um fluxo não estava tratado no PDF, isso deve ser avaliado como **lacuna ou ambiguidade da especificação**, independentemente de existir ou não alguma implementação atual com nome semelhante.

---

## 2. Objetivo

Consolidar a documentação normativa modular do LCQUI para que o conjunto dos arquivos `.tex` descreva de forma completa e coerente:

- papéis e responsabilidades;
- modelo lógico em 3FN;
- modelo físico planejado para o Firestore;
- invariantes e regras de negócio;
- telas e modais;
- fluxos ponta a ponta;
- contratos de backend planejados;
- transações, idempotência e auditoria;
- relatórios e materializações;
- matriz autorizativa;
- critérios de aceite;
- migrações e backfills exigidos pelo desenho;
- itens explicitamente postergados.

Corrija todos os achados válidos do Gemini na documentação central. Se um assunto já estiver corretamente consolidado no `.tex` atual, não o duplique: registre a cobertura e valide sua coerência transversal.

O resultado desta fase não deve afirmar que o sistema está implementado. Ele deve estabelecer com clareza **o que deverá ser implementado**.

---

## 3. Papéis que você deve assumir

Atue simultaneamente como:

1. **Arquiteto de Software Sênior**, definindo contratos, invariantes, atomicidade, idempotência e responsabilidades;
2. **Analista Sênior de Requisitos**, transformando observações da auditoria em requisitos verificáveis;
3. **Especialista em Modelagem de Dados**, preservando 3FN no modelo lógico e justificando projeções, snapshots e materializações no modelo físico;
4. **Especialista em Arquitetura Firebase/Firestore**, apenas para projetar corretamente transações, Rules, jobs, índices e caminhos futuros — nunca para copiar a implementação existente;
5. **Engenheiro de Segurança**, consolidando autorização por papel e escopo, preservação histórica e auditabilidade;
6. **Engenheiro de Documentação Técnica**, mantendo consistência entre entidades, dicionário físico, regras, UI, fluxos e contratos;
7. **Editor LaTeX**, responsável por modularidade, referências, tabelas legíveis e compilação;
8. **Revisor de Qualidade e Rastreabilidade**, garantindo que cada decisão apareça em todas as seções afetadas.

---

## 4. Limites de autorização

### Permitido

- ler e modificar a documentação;
- criar os arquivos de planejamento e validação definidos neste prompt;
- modificar `documentation/**/*.tex`;
- atualizar referências documentais em `README.md`;
- atualizar `documentation/PROMPT_CONTEXTO_IA.md` para refletir a hierarquia correta;
- atualizar `documentation/STATUS_ATUAL.md` somente com o estado documental;
- compilar e validar o LaTeX;
- substituir `documentation/main.pdf` somente após o build final aprovado;
- fazer commits incrementais na branch indicada.

### Proibido nesta fase

- usar `functions/src/**`, `frontend/**`, schemas, testes, `firestore.rules`, `storage.rules`, `firebase.json` ou artefatos compilados como fonte normativa;
- modificar código, frontend, schemas, testes, Rules, índices, configuração Firebase ou migrações;
- executar testes de implementação para decidir requisitos;
- fazer deploy, merge, migração ou alteração de dados;
- marcar requisito como implementado;
- remover requisito para adequá-lo ao código atual;
- declarar que a documentação reproduz a implementação;
- produzir estimativa de prontidão do software.

Se for necessário mencionar um futuro arquivo de implementação, faça isso somente como **destino previsto para a fase posterior**, sem inspecioná-lo ou modificá-lo agora.

---

## 5. Fontes documentais e hierarquia

Use a seguinte ordem:

1. instruções explícitas deste prompt;
2. decisões de domínio consolidadas em `documentation/MODIFICACOES_CONSOLIDADAS_LCQUI.md`;
3. regras normativas já coerentes nos arquivos `.tex`;
4. achados do relatório original do Gemini Spark como diagnóstico do `main.pdf`;
5. `documentation/AUDITORIA_GEMINI_VALIDADA_LCQUI.md` apenas como índice dos achados e das soluções propostas;
6. arquivos em `documentation/archive/**` apenas para rastrear a origem histórica de uma decisão já consolidada.

Restrições:

- a classificação existente em `AUDITORIA_GEMINI_VALIDADA_LCQUI.md` foi influenciada pela implementação e **não prevalece** nesta fase;
- expressões como “resolvido no código” não encerram uma lacuna do PDF;
- `documentation/MATRIZ_IMPLEMENTACAO_LCQUI.md` e testes não determinam a especificação;
- arquivos em `documentation/archive/**` não podem reabrir ou substituir decisões consolidadas;
- alternativas recomendadas em documentos históricos não são automaticamente decisões;
- em contradição documental sem decisão superior, crie uma decisão pendente; não escolha silenciosamente;
- corrija links ativos que ainda apontem para antigos caminhos de arquivos agora arquivados.

---

## 6. Arquivos que devem ser lidos

Leia integralmente, antes de editar:

- `documentation/main.tex`;
- `documentation/MODIFICACOES_CONSOLIDADAS_LCQUI.md`;
- `documentation/AUDITORIA_GEMINI_VALIDADA_LCQUI.md`;
- `documentation/STATUS_ATUAL.md`;
- `documentation/VALIDACAO_REALINHAMENTO_LCQUI.md`;
- `documentation/PROMPT_CONTEXTO_IA.md`;
- `documentation/COMPILACAO_NIX_LCQUI.md`;
- todos os arquivos `documentation/Section-*.tex`;
- todas as subseções em `documentation/Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/*.tex`.

Consulte `documentation/archive/**` somente quando um achado exigir descobrir a origem de uma decisão já referenciada. Registre no worklog que a consulta foi histórica.

Não leia a implementação para preencher lacunas documentais. Se o mesmo nome aparecer na auditoria e no código, isso será tratado apenas na fase posterior de implementação.

---

## 7. Arquivos de controle que devem ser criados primeiro

Antes da primeira alteração em um `.tex`, crie e faça commit de:

```text
documentation/worklogs/consolidacao-gemini/
├── PLANO_INCREMENTAL.md
├── CHECKPOINT.md
├── MATRIZ_COBERTURA_DOCUMENTAL.md
├── INCONSISTENCIAS_DOCUMENTAIS_NOVAS.md
├── DECISOES_DOCUMENTAIS_NECESSARIAS.md
└── VALIDACAO_LATEX.md
```

### 7.1 `PLANO_INCREMENTAL.md`

Inclua cada `PDF-001` a `PDF-025` e cada `EXTRA-001` a `EXTRA-003`.

| Campo | Conteúdo |
|---|---|
| ID | identificador |
| problema no PDF | ausência, ambiguidade ou contradição |
| decisão normativa aplicável | regra que deve prevalecer |
| seções afetadas | 3FN, Firestore, RN, UI, fluxo, contrato, segurança etc. |
| arquivos `.tex` | caminhos exatos |
| ação documental | inserir, corrigir, remover duplicidade ou criar referência |
| dependências | outro ID/decisão |
| critérios de aceite | verificações objetivas |
| estado | PENDENTE, EM_ANDAMENTO, APLICADO_TEX, VALIDADO_LATEX ou BLOQUEADO |
| commit | SHA do lote |

Não use estados relacionados a implementação.

### 7.2 `CHECKPOINT.md`

Mantenha no topo:

- branch e HEAD inicial;
- HEAD atual;
- último commit concluído;
- lote atual;
- último arquivo editado;
- alterações ainda não compiladas;
- último build e resultado;
- próxima ação exata;
- decisões bloqueadoras;
- IDs concluídos e pendentes.

Atualize-o antes e depois de cada lote. Se a quota estiver terminando, interrompa novas edições, atualize o checkpoint e faça commit do progresso coerente.

### 7.3 `MATRIZ_COBERTURA_DOCUMENTAL.md`

Para cada requisito/achado, registre onde ele aparece:

| ID | Decisão | Modelo 3FN | Firestore | RN/RF | UI | Fluxo | Contrato técnico | Segurança | Critério de aceite | Estado |
|---|---|---|---|---|---|---|---|---|---|---|

Use caminhos, rótulos, subseções e identificadores reais. “Mencionado” não significa “coberto”: o contrato precisa ser suficiente para orientar implementação.

### 7.4 `INCONSISTENCIAS_DOCUMENTAIS_NOVAS.md`

Crie IDs `INC-DOC-001`, `INC-DOC-002` etc. Para cada inconsistência:

- enunciado;
- documentos/trechos conflitantes;
- impacto;
- decisão superior existente, se houver;
- solução documental proposta;
- arquivos `.tex` afetados;
- necessidade ou não de decisão humana;
- prioridade;
- estado.

Este arquivo trata conflitos **entre requisitos e documentos**, não falhas da implementação.

### 7.5 `DECISOES_DOCUMENTAIS_NECESSARIAS.md`

Somente para escolhas que não possam ser derivadas das decisões vigentes:

- contexto;
- alternativas mutuamente exclusivas;
- impactos;
- recomendação técnica fundamentada;
- pergunta objetiva ao responsável;
- IDs bloqueados;
- arquivos que dependem da decisão.

Se não houver decisões, mantenha “Nenhuma decisão documental pendente”.

### 7.6 `VALIDACAO_LATEX.md`

Para cada lote:

- data/hora;
- commit;
- comando;
- exit code;
- páginas;
- erros;
- referências indefinidas;
- avisos novos e preexistentes;
- `git diff --check`;
- páginas inspecionadas;
- observações.

Não reutilize um build anterior para validar alterações novas.

---

## 8. Classificação exclusivamente documental

Classifique cada achado usando uma destas categorias:

### `LACUNA_DOCUMENTAL`

A regra necessária não aparece ou não é suficiente para orientar a implementação.

### `CONTRADICAO_DOCUMENTAL`

Duas partes da documentação definem comportamentos incompatíveis.

### `COBERTURA_FRAGMENTADA`

O conceito aparece em algum lugar, mas falta propagá-lo para modelo, regra, UI, fluxo, segurança ou critério de aceite.

### `DECISAO_PENDENTE`

Há alternativas reais e nenhuma decisão vigente permite escolher.

### `JA_CONSOLIDADO`

O contrato já está completo e coerente transversalmente. Registre evidência e não duplique.

### `SUGESTAO_REJEITADA`

A proposta do Gemini conflita com decisão de domínio vigente. Garanta que a decisão correta esteja explícita no PDF.

Não use categorias como “resolvido no código”, “runtime correto” ou “implementação parcial”.

---

## 9. Responsabilidade de cada arquivo LaTeX

| Arquivo | Conteúdo normativo |
|---|---|
| `Section-1-Introducao.tex` | objetivo, escopo e natureza da especificação |
| `Section-2-Como-vai-ser-o-Sistema.tex` | visão funcional e limites |
| `Section-3-Stakeholders.tex` | papéis canônicos, responsabilidades e escopos |
| `Section-4-Modelagem-Entidades-SQL-3FN.tex` | entidades, atributos, cardinalidades e dependências |
| `Section-5-Notas-de-Mapeamento-para-Firestore.tex` | coleções planejadas, subcoleções, documentos, IDs, snapshots e índices |
| `Section-6-Materialized-Views.tex` | materializações, fontes, período, idempotência e reconstrução |
| `Section-7-Requisitos-e-Regras-de-Negocio.tex` | RF, RN, invariantes e critérios |
| `Section-8-Descricao-das-telas-Dashboards.tex` | telas, modais, campos, permissões, estados, erros e acessibilidade |
| `Section-9-Exemplos-de-fluxos.tex` | fluxos ponta a ponta, sucesso, falhas e efeitos |
| `Section-10-Subsection-3-Funcoes-de-Apoio-Autorizacao.tex` | contrato planejado de autorização |
| `Section-10-Subsection-4-Revogacao-de-Papel.tex` | contrato de concessão/revogação |
| `Section-10-Subsection-5-Fluxo-de-Reagentes.tex` | contratos de lotes, frascos, retirada, devolução, Q06 e Q14 |
| `Section-10-Subsection-7-Jobs-Agendados.tex` | contratos de jobs, alertas e materializações |
| `Section-10-Subsection-8-Fluxo-de-Bens-Patrimoniais.tex` | requisições, locks, versões, unicidade e histórico |
| `Section-10-Subsection-9-Relatorios-em-PDF.tex` | contratos de relatórios e fontes históricas |
| `Section-10-Subsection-10-Consolidacao-do-planejamento.tex` | contratos transversais sem subseção própria |
| `Section-11-Regras-de-Seguranca-do-Firestore-Security-Rules.tex` | matriz autorizativa planejada |
| `Section-12-Implementacoes-em-Estudo-para-Versoes-Futuras.tex` | itens formalmente fora da V1 |

`documentation/main.tex` deve permanecer como orquestrador modular.

---

## 10. Achados que devem ser consolidados

A tabela define o conteúdo normativo mínimo. Verifique onde já existe, elimine contradições e complete todas as seções afetadas.

| ID | Conteúdo obrigatório na especificação | Alvos prováveis |
|---|---|---|
| PDF-001 | edição patrimonial transacional; `versao_bem_origem`; todas as leituras antes das escritas; rejeição sem deadlock; política de conflito; liberação de lock; histórico; unicidade concorrente da plaqueta por chave determinística; backfill | 4, 5, 7, 8, 9, 10.8, 11 |
| PDF-003 | contrato único de matrícula para código, adição nominal e convite; capacidade; turma arquivada; espelhos; histórico; exceção nominal justificada; idempotência | 4, 5, 7, 8, 9, 10.10, 11 |
| PDF-004 | Q14: autoatendimento somente quando o destinatário for o único gestor ativo do almoxarifado; justificativa; notificação idempotente à Chefia; auditoria; enums necessários | 3, 4, 5, 7, 8, 9, 10.5, 10.7, 11 |
| PDF-005 | matriz de segurança para convites, materializações e especificações aninhadas; escrita crítica exclusivamente pelo backend planejado quando houver invariantes | 3, 5, 7, 9, 10.3, 11 |
| PDF-006 | relatório patrimonial mensal reconstruído por fatos históricos do período, incluindo localização e situação no corte; parâmetros temporais não podem ser decorativos | 4, 5, 6, 7, 8, 9, 10.9 |
| PDF-007 | um único mecanismo normativo de propagação de nome; fan-out limitado e idempotente; eliminar algoritmos concorrentes | 5, 6, 7, 10.7/10.8 |
| PDF-008 | catálogo de índices exigidos pelas consultas planejadas; índices compostos e collection-group; configuração declarativa como requisito de implementação | 5, 7, 10.9, 11 |
| PDF-009 | edição e moderação de posts/comentários; justificativa; histórico; tombstone/soft-delete; preservação do conteúdo original; autorização | 3, 4, 5, 7, 8, 9, 10.10, 11 |
| PDF-010 | contrato de `cadastrarAlmoxarifado`: Chefia ativa, validação de gestores, vínculos determinísticos, atomicidade e auditoria | 3, 4, 5, 7, 8, 9, 10.10, 11 |
| PDF-011 | jobs para resumos diários/mensais: timezone, IDs determinísticos, idempotência, reprocessamento, backfill, reconciliação, telemetria e autorização | 5, 6, 7, 9, 10.7, 11 |
| PDF-012 | `Lote.id_resumo_reagente`; caminho físico único `Resumo_Reagente/{idResumo}/Especificacoes/{idEspecificacao}`; compatibilidade; migração e backfill planejados | 4, 5, 7, 8, 9, 10.5, 10.9, 11 |
| PDF-013 | remoção de aluno: remover vínculo da turma e espelho do usuário; histórico; contador; autorização; idempotência; comportamento para repetição | 4, 5, 7, 8, 9, 10.10, 11 |
| PDF-014 | contratos server-side planejados para descarte, quebra, vazio e quarentena; transições permitidas; vínculo do gestor; histórico; auditoria; bloqueios | 3, 4, 5, 7, 8, 9, 10.5, 11 |
| PDF-015 | datas civis interpretadas em `America/Sao_Paulo` e depois convertidas para instante/Timestamp; relatórios, jobs, validade, retirada e devolução | 4, 5, 6, 7, 8, 9, 10.5, 10.6, 10.7, 10.9 |
| PDF-016 | triggers de contagem idempotentes por `event.id`/ledger ou recomputação; mudança de lote; reconciliação de drift | 5, 6, 7, 10.7 |
| PDF-017 | fan-out de atualização de local em chunks seguros ou mecanismo oficial decidido no PDF-007; proibir batch ilimitado | 5, 6, 7, 10.8 |
| PDF-018 | singleton de código de frasco como decisão sujeita a benchmark; p50/p95/p99, retries, throughput e falhas; não fixar “1–5 writes/s” sem medição | 5, 7, 10.5, 10.10 |
| PDF-020 | diferenciar janela aceita de claims para leituras e revalidação persistida para mutações críticas; descrever revogação sem prometer efeito instantâneo impossível | 3, 5, 7, 8, 9, 10.3, 10.4, 11 |
| PDF-023 | escassez por `(id_resumo_reagente, id_almoxarifado)`; destinatários ativos e vinculados; notificação idempotente com unidade, data e UID | 3, 5, 6, 7, 8, 9, 10.7 |
| PDF-025 | Q06: tolerância normal `max(1,0 g; 0,5% × peso_saida)`; higroscópica `max(2,0 g; 2,0% × peso_saida)`; consumo zero e `AJUSTE` dentro da tolerância; bloqueio acima; snapshot físico | 4, 5, 7, 8, 9, 10.5 |

### Achados adicionais

| ID | Consolidação |
|---|---|
| EXTRA-001 | procurar globalmente `Especificacao_Reagente`; distinguir entidade lógica de caminho físico; o caminho físico planejado é aninhado |
| EXTRA-002 | PDF-004 não termina com inclusão de enum; Q14 precisa do fluxo operacional completo |
| EXTRA-003 | V1 usa `SOLIDO` e `LIQUIDO`; `GASOSO` deve aparecer somente como item futuro se essa decisão consolidada continuar vigente; não confundir estado físico e natureza química |

---

## 11. Achados de controle

Estes pontos não devem receber a solução originalmente sugerida pelo Gemini, mas a decisão correta deve estar inequívoca no PDF:

| ID | Decisão normativa |
|---|---|
| PDF-002 | revogação de papel segue a matriz multi-role; não criar cascata automática que mantenha `Bolsista` sem `Aluno`; descrever ordem segura, último responsável, preservação da conta e auditoria |
| PDF-019 | etiqueta virgem não reserva identificador oficial; o código oficial nasce na transação de cadastro físico |
| PDF-021 | UI-05 é o contrato do assistente “Novo Reagente”; não reintroduzir formulário plano legado |
| PDF-022 | natureza química: `ORGANICO`, `INORGANICO`, `ELEMENTO`, `HIBRIDO`; não reintroduzir “Complexo/Biológico” |
| PDF-024 | campo canônico `qtd_frascos_adicionados`; eliminar grafias inválidas |

Classifique como `JA_CONSOLIDADO` ou `SUGESTAO_REJEITADA`, nunca como “resolvido na implementação”.

---

## 12. Como tratar escolhas técnicas ainda abertas

Alguns achados oferecem alternativas, como:

- chunks versus BulkWriter;
- materialização por eventos versus recomputação;
- política de encerramento de lock após conflito;
- relatório patrimonial histórico versus relatório explicitamente atual.

Procedimento:

1. procure uma decisão vigente nos documentos normativos;
2. se existir, aplique-a coerentemente;
3. se não existir, registre em `DECISOES_DOCUMENTAIS_NECESSARIAS.md`;
4. apresente recomendação técnica e impactos;
5. marque apenas as partes dependentes como `BLOQUEADO`;
6. continue os itens independentes;
7. não escreva duas alternativas incompatíveis no texto normativo final.

Uma especificação consolidada escolhe um contrato. Alternativas podem aparecer na decisão pendente, não como dois mecanismos oficiais simultâneos.

---

## 13. Conteúdo mínimo de cada contrato

Sempre que aplicável, cada fluxo documentado deve conter:

1. objetivo;
2. atores e papéis;
3. escopo;
4. entradas e campos;
5. pré-condições;
6. validações;
7. autorização;
8. leituras planejadas;
9. ordem transacional;
10. documentos criados/atualizados;
11. IDs determinísticos;
12. estratégia de idempotência;
13. histórico e auditoria;
14. notificações;
15. falhas e estados de erro;
16. efeitos na interface;
17. regras de acesso;
18. migração/backfill;
19. critérios de aceite;
20. referências cruzadas para entidade, RN, UI e fluxo.

Não preencha a Seção 10 com grandes cópias de código. Use pseudocódigo normativo quando necessário.

---

## 14. Plano incremental obrigatório

### Fase 0 — preparação e baseline

1. confirmar branch e HEAD;
2. ler integralmente as fontes documentais;
3. criar os seis arquivos de controle;
4. corrigir links que ainda tratem arquivos arquivados como ativos;
5. compilar o baseline;
6. classificar os 28 IDs exclusivamente pelo estado documental;
7. fazer commit do plano e baseline.

### Fase 1 — fundamentos normativos

Consolidar primeiro:

- papéis e escopos na Seção 3;
- entidades e relações na Seção 4;
- caminhos e documentos na Seção 5;
- materializações na Seção 6;
- RF/RN e invariantes na Seção 7.

Não avance para snippets ou fluxos enquanto o modelo fundamental do lote estiver contraditório.

### Fase 2 — patrimônio

Tratar:

- PDF-001;
- PDF-006;
- PDF-017.

Atualizar todas as seções afetadas, compilar, registrar e commitar.

### Fase 3 — reagentes e almoxarifado

Tratar:

- PDF-004 + EXTRA-002;
- PDF-010;
- PDF-012 + EXTRA-001;
- PDF-014;
- PDF-018;
- PDF-019;
- PDF-021;
- PDF-022;
- PDF-024;
- PDF-025;
- EXTRA-003.

Separar Q06, Q14, etiquetas, natureza química e estado físico.

### Fase 4 — identidade e domínio acadêmico

Tratar:

- PDF-002;
- PDF-003;
- PDF-009;
- PDF-013;
- PDF-020.

Consolidar papéis, dados, UI, fluxos e matriz autorizativa sem consultar a implementação atual.

### Fase 5 — jobs, relatórios e requisitos transversais

Tratar:

- PDF-005;
- PDF-007;
- PDF-008;
- PDF-011;
- PDF-015;
- PDF-016;
- PDF-023.

Garantir coerência entre Seções 5, 6, 7, 9, 10 e 11.

### Fase 6 — consistência global

Executar buscas por:

- nomes duplicados de campos;
- caminhos físicos concorrentes;
- enums obsoletos;
- fórmulas divergentes;
- atores sem autorização;
- fluxos sem UI;
- UI sem fluxo;
- entidade sem mapeamento;
- regra sem critério de aceite;
- materialização sem fonte;
- relatório com parâmetro ignorado;
- item de V2 aparecendo como V1.

Atualizar a matriz de cobertura.

### Fase 7 — fechamento

1. atualizar `STATUS_ATUAL.md` apenas com estado documental;
2. manter `MATRIZ_IMPLEMENTACAO_LCQUI.md` sem elevar estados de código;
3. registrar no status que a próxima fase será a auditoria documentação × implementação;
4. compilar em diretório final novo;
5. exigir exit code 0;
6. verificar log e `git diff --check`;
7. inspecionar páginas alteradas;
8. substituir `documentation/main.pdf`;
9. atualizar checkpoint/validação;
10. fazer commit final.

---

## 15. Incrementos e proteção contra término de quota

Cada lote deve ser pequeno, coerente e retomável.

Antes de editar um lote:

- marque IDs como `EM_ANDAMENTO`;
- escreva a próxima ação no checkpoint;
- liste os arquivos que pretende alterar.

Depois do lote:

- atualize todas as referências transversais;
- compile;
- registre a validação;
- marque como `APLICADO_TEX` ou `VALIDADO_LATEX`;
- faça commit;
- escreva a próxima ação exata.

Se a quota estiver próxima do fim:

1. não inicie outro lote;
2. termine ou reverta apenas o fragmento documental incompleto;
3. atualize plano, matriz e checkpoint;
4. registre o último build realmente executado;
5. faça commit do estado coerente;
6. deixe instruções exatas de retomada.

Sugestões de commits:

```text
docs(gemini): create documentation consolidation worklog
docs(gemini): consolidate patrimonial specification
docs(gemini): consolidate reagent and warehouse contracts
docs(gemini): consolidate roles and academic flows
docs(gemini): consolidate jobs reports and security design
docs(gemini): validate and rebuild normative specification
```

---

## 16. Compilação

Siga `documentation/COMPILACAO_NIX_LCQUI.md`. Use diretório diferente por lote:

```sh
nix shell nixpkgs#texliveFull -c latexmk   -cd -pdf -interaction=nonstopmode -halt-on-error   -outdir=/tmp/lcqui-tex-consolidacao-lote-N   documentation/main.tex
```

Exija:

- exit code 0;
- nenhum `LaTeX Error`;
- nenhuma referência indefinida no log final;
- `git diff --check` limpo;
- inspeção visual das páginas modificadas;
- registro de avisos preexistentes e novos;
- atualização de `main.pdf` somente após a validação final.

Compilar prova integridade do documento, não implementação do sistema.

---

## 17. Definition of Done

A consolidação termina somente quando:

- [ ] os 25 achados e três EXTRAs foram avaliados sem usar a implementação;
- [ ] todos os achados válidos estão cobertos nos `.tex`;
- [ ] cada contrato aparece nas seções necessárias;
- [ ] não existem duas regras normativas incompatíveis;
- [ ] decisões ausentes estão registradas sem invenção silenciosa;
- [ ] itens rejeitados não foram reintroduzidos;
- [ ] a documentação distingue V1 e futuro;
- [ ] a matriz de cobertura está completa;
- [ ] o checkpoint permite retomada imediata;
- [ ] o build final foi aprovado;
- [ ] `main.pdf` corresponde aos `.tex` finais;
- [ ] nenhum arquivo de implementação foi usado como autoridade ou modificado;
- [ ] o status não afirma implementação;
- [ ] a próxima fase está explicitamente registrada como comparação da implementação com a especificação consolidada.

---

## 18. Relatório final esperado

Informe:

1. HEAD inicial e final;
2. commits;
3. IDs consolidados;
4. IDs já cobertos;
5. sugestões rejeitadas;
6. decisões pendentes;
7. inconsistências documentais novas;
8. arquivos `.tex` alterados por ID;
9. resultado do build e número de páginas;
10. avisos restantes;
11. confirmação de que a implementação não foi usada como fonte da verdade e não foi modificada;
12. indicação de que o `main.pdf` consolidado será a referência para a próxima fase de desenvolvimento.

Se a tarefa for interrompida, atualize `CHECKPOINT.md` e informe a próxima ação exata. Não entregue resumo genérico.
