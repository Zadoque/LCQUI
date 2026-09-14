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

## 10. Método obrigatório para verificar os achados do Gemini

O relatório do Gemini é um **atalho de investigação**, não um veredito. Para cada achado:

1. leia a alegação, as evidências e a correção sugerida reproduzidas abaixo;
2. localize o conteúdo pelo número de página indicado e, principalmente, pelo nome da seção, entidade, campo ou função — a paginação pode ter mudado;
3. abra os arquivos `.tex` que geram esses trechos;
4. verifique se a inconsistência ainda existe no HEAD atual;
5. confronte a sugestão com `MODIFICACOES_CONSOLIDADAS_LCQUI.md` e com as demais seções normativas;
6. classifique o item como `CONFIRMADO`, `PARCIALMENTE_CONFIRMADO`, `SUPERADO_NO_TEX`, `REJEITADO_POR_DECISAO` ou `DECISAO_NECESSARIA`;
7. registre evidências concretas na matriz de cobertura;
8. edite os `.tex` somente quando o resultado exigir correção ou reforço;
9. não use a implementação para confirmar ou negar a hipótese;
10. compile e valide antes de concluir o item.

A contagem apresentada pelo Gemini — 8 contradições, 9 lacunas, 8 riscos, 5 ambiguidades, 3 melhorias opcionais e 6 falsos positivos/diferenças intencionais — também é uma hipótese. Recalcule os totais depois da verificação.

---

## 11. Dossiê dos 25 achados do Gemini

### PDF-001 — Locks, versão e unicidade patrimonial

**O que o Gemini alegou:** em `responderRequisicaoEdicaoBem`, a comparação entre a versão atual e `versao_bem_origem` abortaria o fluxo antes da rejeição e da liberação do lock. Também não haveria garantia suficiente de que uma plaqueta já existente em `Bem_Patrimonial` não fosse aceita numa requisição de adição.

**Evidências indicadas:** página 158, Seção 10.2.6; página 19, Seção 4.12; página 46, Seção 5.6; fluxo de adição na página 160.

**Impacto indicado:** requisição presa indefinidamente e duplicação de número patrimonial.

**Correção sugerida pelo Gemini:** separar rejeição da validação de versão, liberar o lock em todos os desfechos e verificar a plaqueta existente.

**Verifique nos `.tex`:**

- se rejeitar uma requisição depende indevidamente da versão;
- se conflito possui estado final e política de liberação de lock;
- se todas as leituras transacionais precedem as escritas;
- se a unicidade concorrente é garantida por chave determinística, e não por consulta vulnerável a corrida;
- se adição e edição possuem critérios e históricos completos.

**Se confirmado:** consolidar o algoritmo normativo nas Seções 4, 5, 7, 8, 9, 10.8 e 11, incluindo backfill da chave de unicidade.

### PDF-002 — Revogação multi-role e vínculos de almoxarifado

**O que o Gemini alegou:** a revogação de `Gestor_Almoxarifado` deixaria vínculos órfãos em `Gestor_Almoxarifado_x_Almoxarifado`; revogar `Aluno` poderia deixar `Bolsista` sem o papel-base.

**Evidências indicadas:** página 136, Seção 10.2.2; página 100, RN-ROLE-05; página 12, Seção 3.6.

**Impacto indicado:** almoxarifado contabilizando gestor inexistente e violação da dependência `Bolsista -> Aluno`.

**Correção sugerida pelo Gemini:** excluir vínculos e revogar `Bolsista` em cascata.

**Verifique nos `.tex`:**

- regra do último gestor ativo;
- limpeza dos vínculos associativos;
- preservação de outros papéis;
- dependência entre Bolsista e Aluno;
- política normativa aprovada para combinação inválida: cascata automática ou rejeição com ordem segura.

**Atenção:** não aceite automaticamente a cascata proposta. Se a decisão consolidada exigir revogar primeiro `Bolsista` e rejeitar a retirada de `Aluno`, documente essa política. O importante é eliminar a combinação inválida e tornar o fluxo inequívoco.

### PDF-003 — Matrícula, espelhos, capacidade e convite

**O que o Gemini alegou:** o fluxo de ingresso por código não gravaria `Usuarios/{uid}/Turmas/{turmaId}`, não atualizaria `Turma.qtd_alunos` e dependeria de leitura O(N). O aceite de convite não validaria capacidade, turma arquivada, histórico nem metadados do espelho.

**Evidências indicadas:** páginas 164–165, Seção 10.2.6; página 83, Seção 5.11; página 79, Seção 5.9.1; página 176, Seção 10.3.1.

**Impacto indicado:** aluno matriculado sem visualizar a turma, contadores divergentes e ingresso indevido em turma lotada/arquivada.

**Correção sugerida:** um contrato transacional único para ingresso por código, adição nominal e convite.

**Verifique nos `.tex`:**

- dois espelhos e metadados obrigatórios;
- contador transacional;
- prevenção de duplicidade;
- histórico;
- turma arquivada;
- capacidade e convite excepcional com `exceder_capacidade` e justificativa;
- reingresso após remoção somente por convite explícito;
- idempotência.

**Se confirmado:** consolidar nas Seções 4, 5, 7, 8, 9, 10.10 e 11.

### PDF-004 — Notificação à Chefia no autoatendimento Q14

**O que o Gemini alegou:** Q14 exige notificar a Chefia, mas `Notificacao.papel_destinatario` não incluiria `Chefe_Geral` e `tipo` não incluiria `AUTO_ATENDIMENTO`.

**Evidências indicadas:** página 35, Seção 4.36; página 70, Seção 5.9.1; página 44, Q14; página 149, contrato `registrarNotificacaoChefiaTx`.

**Impacto indicado:** documento de notificação incompatível com o próprio schema.

**Correção sugerida:** adicionar os valores aos enums.

**Verifique:** entidade lógica, dicionário Firestore, regras Q14, tela de notificações, fluxo de retirada, destinatários e matriz autorizativa.

**Se confirmado:** atualizar todas as representações; não concluir o item apenas com enum — verificar também o fluxo operacional completo em EXTRA-002.

### PDF-005 — Coleções ausentes da matriz de Security Rules

**O que o Gemini alegou:** a política deny-all não declararia leitura para `Substancia_Quimica`, `Materia`, `Local`, `Resumo_Bem_Patrimonial`, `Lote`, `Convite_Aluno`, `Historico_Frasco_Reagente` e `Resumo_*_Diario`.

**Evidências indicadas:** páginas 180–181, Seção 11.1; entidades/coleções nas páginas 21, 34, 36, 48, 49 e 84–88.

**Impacto indicado:** a arquitetura especificada produziria `permission-denied` em consultas essenciais.

**Correção sugerida:** declarar regras explícitas por coleção e papel.

**Verifique nos `.tex`:**

- inventário completo do dicionário físico versus matriz da Seção 11;
- leitura por papel e escopo;
- escrita direta negada quando o contrato exigir backend;
- subcoleções;
- convites;
- materializações;
- especificações aninhadas;
- históricos e auditoria.

**Se confirmado:** corrigir a especificação da Seção 11 e referências relacionadas. Não editar `firestore.rules` nesta fase.

### PDF-006 — Relatório patrimonial mensal usando estado atual

**O que o Gemini alegou:** `gerarRelatorioBensPredio` receberia mês/ano, mas a especificação consultaria somente o estado atual do bem.

**Evidências indicadas:** página 167, Seção 10.2.7; página 87, Seção 6.4; página 119, fluxo 9.2.4.

**Impacto indicado:** localização e situação históricas incorretas.

**Correção sugerida:** reconstruir pelo histórico/materialização diária.

**Verifique:** fonte temporal, corte civil, localização no período, bens transferidos/baixados, snapshots e parâmetros da UI.

**Se confirmado:** documentar relatório histórico verdadeiro. Se os requisitos realmente quiserem relatório atual, remover a aparência de período somente mediante decisão explícita.

### PDF-007 — Dois mecanismos de propagação de nome

**O que o Gemini alegou:** coexistiriam uma trigger com `batch()` e uma callable com `BulkWriter`.

**Evidências indicadas:** página 163, `onResumoBemPatrimonialNomeAtualizado`; página 174, `propagarNomeResumo`/M-10.

**Impacto indicado:** corrida, duplicidade e falha acima de 500 operações.

**Correção sugerida:** manter somente BulkWriter.

**Verifique:** quantos mecanismos oficiais aparecem, quem inicia o fluxo, limite, retry, idempotência e recuperação parcial.

**Atenção:** BulkWriter é proposta do Gemini, não decisão automática. Se nenhuma decisão vigente escolher BulkWriter ou chunks, registre decisão pendente e recomende uma alternativa. O PDF final não pode manter dois mecanismos concorrentes.

### PDF-008 — Índices ausentes para relatórios

**O que o Gemini alegou:** consultas combinando `id_almoxarifado` com `data_devolucao_efetuada` e com `timestamp` não estariam no catálogo de índices.

**Evidências indicadas:** página 46, Seção 5.8; página 166, `gerarRelatorioAlmoxarifado`.

**Impacto indicado:** consultas planejadas falhariam por índice ausente.

**Correção sugerida:** incluir índices compostos para `Emprestimo_Reagente` e `Historico_Frasco_Reagente`.

**Verifique:** todas as consultas descritas nas UIs, fluxos e relatórios contra a Seção 5.8, inclusive collection-group. Documente somente índices associados a consultas normativas existentes.

### PDF-009 — Contratos de posts e comentários ausentes

**O que o Gemini alegou:** a Seção 11 negaria escrita direta, mas a Seção 10 não especificaria criação, edição ou moderação de posts/comentários.

**Evidências indicadas:** página 180, Seção 11.1; Seção 10, páginas 132–179; UI-11.

**Impacto indicado:** telas acadêmicas sem caminho autorizado de escrita.

**Correção sugerida:** contratos `criarPost`, `editarPost`, `criarComentario` e `moderarComentario`.

**Verifique:** autoria, professor responsável, moderação excepcional da Chefia, justificativa, histórico, etiqueta “editado”, tombstone, conteúdo original e leitura por alunos.

**Se confirmado:** consolidar nas Seções 4, 5, 7, 8, 9, 10.10 e 11.

### PDF-010 — Cadastro de almoxarifado sem contrato de backend

**O que o Gemini alegou:** UI e fluxo CHE-03 descrevem criação/vinculação, mas a Seção 10 não define a operação.

**Evidências indicadas:** página 103, Seção 8.3.1; página 125, Seção 9.7.4; Seção 10.

**Impacto indicado:** payload, validação, atomicidade e vínculos ficam por inferência.

**Correção sugerida:** especificar `cadastrarAlmoxarifado`.

**Verifique:** Chefia ativa, dados obrigatórios, gestores elegíveis, ao menos um responsável, vínculos determinísticos, atomicidade, auditoria e estado inativo.

### PDF-011 — Materializações sem jobs de consolidação

**O que o Gemini alegou:** a Seção 6 define cinco materializações, enquanto a Seção 10 descreve somente jobs de vencimento e escassez.

**Evidências indicadas:** páginas 84–88, Seção 6; páginas 153–156, Seção 10.2.5.

**Impacto indicado:** resumos sem algoritmo, fonte ou periodicidade.

**Correção sugerida:** jobs noturnos para resumos de almoxarifado, reagente, patrimônio e atividade mensal.

**Verifique:** todas as materializações, horário, timezone, fonte, janela, ID, idempotência, retry, backfill, reconciliação e regras de acesso.

### PDF-012 — `Lote.id_resumo_reagente` omitido

**O que o Gemini alegou:** nota física exigiria `id_resumo_reagente`, mas o dicionário formal de `Lote` não o teria.

**Evidências indicadas:** página 60 e nota da página 79, Seção 5.9.1.

**Impacto indicado:** caminho completo da especificação ambíguo.

**Correção sugerida:** adicionar `id_resumo_reagente: string`.

**Verifique:** modelo 3FN, denormalização física, caminho `Resumo_Reagente/{idResumo}/Especificacoes/{idEspecificacao}`, compatibilidade lote–especificação e backfill.

### PDF-013 — Remoção de aluno sem contrato formal

**O que o Gemini alegou:** UI-10/PRO-04 descrevem remoção bidirecional, mas a Seção 10 não formaliza `removerAlunoTurma`.

**Evidências indicadas:** página 115, Seção 8.8.10; Seção 10; fluxo PRO-04.

**Impacto indicado:** operação dependente de inferência.

**Correção sugerida:** contrato com remoção dos dois espelhos, decremento e histórico.

**Verifique:** autorização, contador sem valor negativo, repetição idempotente, histórico, bloqueio de reingresso por código e convite explícito de retorno.

### PDF-014 — Descarte, quebra, vazio e quarentena sem contratos

**O que o Gemini alegou:** ações ALM-06 não possuem contratos completos na Seção 10.

**Evidências indicadas:** página 10, Seção 3.2; página 128, fluxo 9.7.28; Seção 10.

**Impacto indicado:** transições e autorizações não especificadas.

**Correção sugerida:** `registrarDescarteFrasco`, `registrarQuebraFrasco` e `alterarQuarentenaFrasco`.

**Verifique:** todos os estados canônicos, transições permitidas, esvaziamento, vínculo do gestor, justificativa, histórico, auditoria e operações bloqueadas depois da transição.

### PDF-015 — Data civil dependente do timezone do servidor

**O que o Gemini alegou:** `parseDataCivil` usaria `new Date(ano, mes - 1, dia...)`, podendo interpretar UTC em vez de `America/Sao_Paulo`.

**Evidências indicadas:** página 173, M-12; página 151, devolução.

**Impacto indicado:** fim do prazo três horas antes no horário de Brasília.

**Correção sugerida:** offset explícito ou biblioteca IANA.

**Verifique:** datas sem hora, fronteiras de dia/mês, jobs, relatórios, validade, retirada/devolução e horário de verão histórico. Prefira contrato com timezone IANA; não fixe `-03:00` como regra universal sem justificar.

### PDF-016 — Triggers de contagem não idempotentes

**O que o Gemini alegou:** `FieldValue.increment(+1/-1)` em eventos reexecutáveis causaria drift.

**Evidências indicadas:** página 156, `onFrascoCriado`/`onFrascoRemovido`; página 84, `Lote_Materializado`.

**Impacto indicado:** contador permanentemente divergente.

**Correção sugerida:** deduplicação por `event.id` ou reconciliação determinística.

**Verifique:** retry, criação, remoção, mudança de lote, ledger, ID determinístico, recomputação e job de reconciliação.

### PDF-017 — Atualização de local acima do limite de batch

**O que o Gemini alegou:** `onLocalAtualizado` concentraria todas as atualizações num batch e falharia acima de 500.

**Evidências indicadas:** página 163 e denormalização da página 48.

**Impacto indicado:** localizações dessincronizadas e retentativas repetidas.

**Correção sugerida:** BulkWriter.

**Verifique:** cardinalidade ilimitada, paginação/chunks, idempotência, progresso parcial e coerência com PDF-007. Não aceite BulkWriter sem verificar se outra estratégia oficial já foi decidida.

### PDF-018 — Contenção no singleton de códigos

**O que o Gemini alegou:** toda criação de frasco transacionaria `Contador_Codigo_Frasco/singleton`, limitando cadastros concorrentes.

**Evidências indicadas:** página 46, Seção 5.7; página 134; páginas 139 e 143.

**Impacto indicado:** gargalo na carga inicial.

**Correção sugerida:** blocos reservados ou documentação de vazão.

**Verifique:** necessidade de sequência sem lacunas, volume esperado, plano de importação e tolerância a IDs não utilizados.

**Atenção:** as taxas “~1 escrita/s” e “1–5/s” não são fatos normativos. Exija benchmark antes de registrar limite. Blocos podem contrariar a decisão de evitar lacunas.

### PDF-019 — Reserva de códigos na impressão de etiquetas virgens

**O que o Gemini alegou:** intervalos fornecidos pelo cliente poderiam divergir do singleton.

**Evidências indicadas:** página 20, Seção 4.13; página 169, `gerarPdfEtiquetasVirgens`.

**Impacto indicado:** etiqueta impressa e código cadastrado diferentes.

**Correção sugerida:** reservar o contador antes da impressão.

**Verifique contra a decisão vigente:** etiqueta virgem é artefato gráfico sem reserva oficial, e o código nasce somente no cadastro físico? Se sim, rejeite a solução do Gemini e torne essa distinção inequívoca na UI, nos fluxos e no contrato de etiquetas.

### PDF-020 — Janela de Custom Claims após revogação

**O que o Gemini alegou:** claims podem permanecer em JWT por até cerca de uma hora; leituras diretas não verificariam `Usuarios.ativo`.

**Evidências indicadas:** páginas 132 e 134; página 181, DP-D01.

**Impacto indicado:** acesso temporário após desativação/revogação.

**Correção sugerida:** `requerAtivo` nas operações críticas e verificação de token revogado.

**Verifique:** diferença entre leitura e mutação, decisão DP-D01, revalidação de ator/destinatário, versão de permissões, renovação de token, logout forçado e limites que precisam ser assumidos explicitamente.

### PDF-021 — Formulário plano versus assistente de reagente

**O que o Gemini alegou:** Seção 8.5 descrevia modal único, enquanto UI-05 descrevia assistente em etapas.

**Evidências indicadas:** página 106, Seção 8.5; páginas 111–112, Seção 8.8.5.

**Impacto indicado:** dois contratos de UI.

**Correção sugerida:** declarar UI-05 como vinculante.

**Verifique:** se o texto legado ainda existe. Se estiver superado, registre `SUPERADO_NO_TEX`; se permanecer, remova a ambiguidade sem reintroduzir formulário incompatível com a separação Resumo–Especificação–Composição.

### PDF-022 — Natureza química e rótulos

**O que o Gemini alegou:** coexistiriam “Híbrido”, “Complexo” ou “Biológico”, enquanto o banco teria `HIBRIDO`.

**Evidências indicadas:** página 23, Seção 4.16; página 58, Seção 5.9.1.

**Impacto indicado:** rótulos divergentes.

**Correção sugerida:** “Híbrido / Complexo”.

**Verifique contra a decisão consolidada:** valores canônicos e rótulos oficiais. Não reintroduza `Biológico` ou `Complexo` apenas por sugestão do Gemini se a decisão vigente for `ORGANICO`, `INORGANICO`, `ELEMENTO`, `HIBRIDO`.

### PDF-023 — Escassez calculada globalmente

**O que o Gemini alegou:** comentário e pseudocódigo do job usariam IDs diferentes, e a contagem seria global por resumo em vez de por almoxarifado.

**Evidências indicadas:** páginas 175–176, M-16.

**Impacto indicado:** gestores notificados sobre escassez de outra unidade.

**Correção sugerida:** calcular por `(id_resumo_reagente, id_almoxarifado)` e notificar apenas vinculados.

**Verifique:** limiar, unidade, gestor ativo, ID idempotente, data civil e diferença entre notificação por unidade e por usuário.

### PDF-024 — Erro em `qtd_frascos_adicionados`

**O que o Gemini alegou:** Seção 6.5 apresentava `_ frascos_adicionados`, enquanto o dicionário usava `qtd_frascos_adicionados`.

**Evidências indicadas:** página 88, Seção 6.5; página 78, Seção 5.9.1.

**Correção sugerida:** uniformizar o nome.

**Verifique:** se o erro já foi corrigido globalmente. Não faça edição duplicada; registre cobertura.

### PDF-025 — Tolerância Q06 baseada em massa líquida

**O que o Gemini alegou:** usar 2 g/2% do peso bruto poderia mascarar consumo em frascos com tara alta.

**Evidências indicadas:** página 43, Q06; páginas 150–151.

**Correção sugerida:** calcular por massa líquida.

**Verifique contra a decisão canônica:** a fórmula aprovada é baseada em `peso_saida` bruto? Se sim, classifique a sugestão como `REJEITADO_POR_DECISAO`. Preserve:

```text
normal: max(1,0 g; 0,5% × peso_saida)
higroscópico: max(2,0 g; 2,0% × peso_saida)
```

Garanta consumo zero e evento `AJUSTE` dentro da tolerância, bloqueio acima dela e snapshot físico. Só reabra a fórmula mediante decisão formal.

---

## 12. Inconsistências adicionais de nomenclatura encontradas pelo Gemini

Inclua estes itens na matriz com IDs `GEM-NOM-001` a `GEM-NOM-005`:

| ID | Alegação do Gemini | Evidências indicadas | Verificação exigida |
|---|---|---|---|
| GEM-NOM-001 | `conteudo_nominal` teria substituído `capacidade_nominal`, mas Seção 7.3 e payload documental ainda usariam `volumeNominal`/“capacidade nominal” | Seção 4.20, páginas 27–28; Seção 7.3, página 98; contrato de cadastro, página 137 | escolher e propagar nomenclatura canônica, distinguindo nome de campo e conceito físico |
| GEM-NOM-002 | `volume_total_usado_nos_frascos_devolvidos_durante_o_dia` estaria marcado como legado por misturar unidades, mas permaneceria NOT NULL na materialização e no dicionário | Seção 6.2, páginas 84–86; página 74 | remover contrato legado ou explicar substitutos separados em g e mL |
| GEM-NOM-003 | `data_devolucao_efetuada`, `dataDevolucao` e `data_devolucao` coexistiriam | Seção 4.22, página 30; Seção 10.2.7, página 165 | separar nome lógico, nome físico e payload somente se houver convenção explícita; eliminar aliases ambíguos |
| GEM-NOM-004 | enum `Registro_de_Auditoria.tipo_entidade_sofre_acao` teria convenção inconsistente, inclusive `FRASCO_REAGENTE` | Seção 4.41 e contrato de reimpressão, página 170 | definir um enum canônico único e aplicá-lo a modelo, dicionário e exemplos |
| GEM-NOM-005 | `_ frascos_adicionados` divergiria de `qtd_frascos_adicionados` | Seção 6.5 e Seção 5.9.1 | verificar junto ao PDF-024 e não duplicar correção |

Procure também variantes com acento, maiúsculas/minúsculas, snake_case/camelCase e nomes legados. Não uniformize mecanicamente quando os nomes pertencerem a camadas diferentes; documente a transformação entre payload e persistência quando ela for intencional.

---

## 13. Lacunas de rastreabilidade RF indicadas pelo Gemini

O relatório classificou como parciais ou contraditórios, no documento auditado, os seguintes requisitos:

- RF06: cadastro e manutenção de bens patrimoniais;
- RF13: cadastro e gestão de almoxarifados;
- RF15: movimentações e descarte;
- RF17: criação de turmas com capacidade;
- RF18: ingresso por código e convite;
- RF19: publicação de posts;
- RF20: comentários e moderação;
- RF21: upload e metadados de roteiros;
- RF22: compartilhamento de roteiros.

Não copie essa classificação. Refaça a matriz documental no HEAD e verifique, para cada RF:

- entidade;
- campos físicos;
- regra;
- UI;
- fluxo;
- contrato técnico planejado;
- autorização;
- histórico/auditoria;
- critérios de aceite.

Se um RF não possuir uma dessas partes, registre `COBERTURA_FRAGMENTADA` e complete a documentação.

---

## 14. Cenários adversariais fornecidos pelo Gemini

Use estes cenários como testes de consistência da especificação. Para cada um, localize as regras que determinam univocamente o resultado:

| Cenário | Resultado documental que deve ser verificável |
|---|---|
| 1. duas requisições concorrentes para editar o mesmo bem | uma vence o lock; a outra falha sem duplicidade |
| 2. bem muda da Sala 101 para Sala 202 | estado atual muda e histórico preserva a localização anterior |
| 3. resumo patrimonial com 800 bens é renomeado | mecanismo único processa fan-out sem exceder limite |
| 4. frasco tenta usar lote de outra especificação | operação rejeitada sem criar frasco ou consumir código |
| 5. frasco antigo sem data de abertura | `data_abertura = null` e flag histórica, sem inventar data |
| 6. retirada de vencido sem autorização excepcional | bloqueio e nenhum empréstimo criado |
| 7. usuário Professor e Gestor tenta autoatendimento com outro gestor ativo | bloqueio conforme Q14 |
| 8. destinatário da retirada está desativado | bloqueio por estado persistido |
| 9. job diário é reexecutado | notificação idempotente, sem duplicidade |
| 10. turma cheia recebe convite excepcional | aceite só ocorre com exceção nominal e justificativa válidas |
| 11. aluno removido tenta retornar por código | bloqueio; retorno apenas por convite explícito |
| 12. Chefia modera turma alheia | intervenção excepcional com justificativa, tombstone e auditoria |
| 13. duas revogações concorrentes atingem o último gestor | almoxarifado não fica sem responsável |
| 14. relatório de fevereiro após transferência em julho | relatório histórico mostra a localização de fevereiro |
| 15. local associado a 600 bens é atualizado | fan-out não usa commit único acima do limite |

Se o resultado não puder ser derivado sem suposição, há lacuna documental.

---

## 15. Diferenças intencionais que o Gemini considerou legítimas

Verifique se continuam coerentes antes de preservá-las:

1. `letra_inicial` denormalizada no Firestore para consulta;
2. espelhamento `Turma/{id}/Alunos/{uid}` e `Usuarios/{uid}/Turmas/{id}`;
3. `id_especificacao_reagente` também no frasco mesmo quando há lote;
4. snapshot de prédio, andar e sala no histórico patrimonial;
5. array ACL `professores_compartilhados` no Firestore, mantendo a associação N:N no modelo lógico;
6. impressão de etiqueta virgem sem FK/reserva de código oficial.

Não “normalize” essas decisões apenas por duplicarem informação. Para cada uma, exija:

- fonte canônica;
- regra de sincronização;
- operação responsável;
- tratamento de falha;
- justificativa NoSQL ou histórica;
- critério de reconciliação quando aplicável.

Se a justificativa tiver desaparecido ou houver duas fontes canônicas, reclassifique como inconsistência documental.

---

## 16. Como tratar escolhas técnicas ainda abertas

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

## 17. Conteúdo mínimo de cada contrato

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

## 18. Plano incremental obrigatório

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

## 19. Incrementos e proteção contra término de quota

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

## 20. Compilação

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

## 21. Definition of Done

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

## 22. Relatório final esperado

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
