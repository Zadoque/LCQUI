# PLANO_INCREMENTAL — Consolidação Gemini Spark × LaTeX LCQUI

> Cada ID é avaliado **exclusivamente** pelo estado documental do HEAD `e7b0bfe9`.
> Classificação da `AUDITORIA_GEMINI_VALIDADA_LCQUI.md` não prevalece aqui.
> Categorias: LACUNA_DOCUMENTAL | CONTRADICAO_DOCUMENTAL | COBERTURA_FRAGMENTADA | DECISAO_PENDENTE | JA_CONSOLIDADO | SUGESTAO_REJEITADA

---

## PDF-001 — Locks, versão e unicidade patrimonial

| Campo | Conteúdo |
|---|---|
| ID | PDF-001 |
| Problema no PDF | A rejeição de uma requisição de edição de bem patrimonial dependeria da verificação de versão, podendo travar locks; unicidade da plaqueta vulnerável a corrida |
| Categoria documental | COBERTURA_FRAGMENTADA — Section-10-Subsection-8 descreve o fluxo, mas o algoritmo normativo de liberação de lock em todos os desfechos (incluindo rejeição sem verificação de versão) e a chave determinística de unicidade (Chaves_Unicas) não estão completamente explícitos |
| Decisão normativa aplicável | RF10 (impedimento de requisição duplicada), RF11 (aprovação/rejeição), MODIFICACOES_CONSOLIDADAS §5.4 (verificação de plaqueta em Chaves_Unicas) |
| Seções afetadas | 4 (Bem_Patrimonial, Requisicao_Edicao), 5 (Locks_Requisicao_Patrimonio, Chaves_Unicas), 7 (RF10, RF11, invariantes), 9 (fluxo 9.2.x), 10.8 (contratos), 11 (matriz autorizativa) |
| Arquivos .tex | Section-4-Modelagem-Entidades-SQL-3FN.tex, Section-5-Notas-de-Mapeamento-para-Firestore.tex, Section-7-Requisitos-e-Regras-de-Negocio.tex, Section-9-Exemplos-de-fluxos.tex, Section-10-Subsection-8-Fluxo-de-Bens-Patrimoniais.tex |
| Ação documental | Consolidar: (a) algoritmo normativo de rejeição sem dependência de versão; (b) lock liberado em todos os desfechos; (c) Chaves_Unicas como mecanismo de unicidade concorrente; (d) backfill exigido |
| Dependências | nenhuma |
| Critérios de aceite | Rejeição possível sem verificar versão; conflito de versão documentado sem lock irrecuperável; unicidade garantida por Chaves_Unicas documentado em Seções 4 e 5 |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-002 — Revogação multi-role e vínculos de almoxarifado

| Campo | Conteúdo |
|---|---|
| ID | PDF-002 |
| Problema no PDF | Revogação de Gestor_Almoxarifado deixaria vínculos órfãos; revogar Aluno com Bolsista ativo |
| Categoria documental | JA_CONSOLIDADO — Section-3 (Seção 3.6 / RN-ROLE-*) e Section-10-Subsection-4 já documentam: limpeza de vínculos em cascata, proteção do último gestor, dependência Bolsista→Aluno (revogar Aluno com Bolsista ativo é rejeitado com mensagem de ordem segura) |
| Decisão normativa aplicável | MODIFICACOES_CONSOLIDADAS §7.6 (DP-C01), Section-3-Stakeholders.tex §Bolsista |
| Seções afetadas | verificar coerência em Seções 3, 7, 10.4 — não duplicar |
| Arquivos .tex | Section-10-Subsection-4-Revogacao-de-Papel.tex (verificar cobertura) |
| Ação documental | Verificar que o texto normativo da Seção 10.4 cobre: ordem segura de revogação, proteção do último gestor e limpeza de vínculos. Se cobertura completa → registrar JA_CONSOLIDADO. Se faltam critérios de aceite → inserir |
| Dependências | nenhuma |
| Critérios de aceite | Contrato proíbe remoção de Aluno enquanto Bolsista ativo; último gestor protegido; vínculos removidos em cascata quando Gestor_Almoxarifado revogado |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-003 — Matrícula, espelhos, capacidade e convite

| Campo | Conteúdo |
|---|---|
| ID | PDF-003 |
| Problema no PDF | Aceite de convite não valida capacidade, turma arquivada, histórico; espelhos incompletos |
| Categoria documental | COBERTURA_FRAGMENTADA — ingresso por código está documentado; aceite de convite carece de contrato completo na Seção 10 |
| Decisão normativa aplicável | RF17, RF18; MODIFICACOES_CONSOLIDADAS §5.2 (espelhamento atômico, contador transacional), §7.8 (convite in-place) |
| Seções afetadas | 4 (Convite_Aluno, Turma), 5 (espelhos, dicionário), 7 (RF17, RF18), 8 (UI-10), 9 (fluxo ingresso), 10.10 (contratos transversais), 11 |
| Arquivos .tex | Section-10-Subsection-10-Consolidacao-do-planejamento.tex (criar/completar aceitarConviteAluno) |
| Ação documental | Documentar contrato aceitarConviteAluno na Seção 10.10 cobrindo: validação de turma arquivada, capacidade, histórico, espelhos, idempotência, convite excepcional com justificativa |
| Dependências | nenhuma |
| Critérios de aceite | Contrato inclui: destinatário esperado, expiração, estado, turma arquivada, capacidade, flag excepcional, justificativa, espelhos, histórico, idempotência |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-004 — Notificação à Chefia no autoatendimento Q14

| Campo | Conteúdo |
|---|---|
| ID | PDF-004 |
| Problema no PDF | Notificacao.papel_destinatario não inclui Chefe_Geral; tipo não inclui AUTO_ATENDIMENTO; regra Q14 incompleta na Seção 10 |
| Categoria documental | COBERTURA_FRAGMENTADA — Q14 está em MODIFICACOES_CONSOLIDADAS §4.Q14 mas os enums e o contrato completo na Seção 10 ainda não refletem Chefe_Geral como destinatário explícito e AUTO_ATENDIMENTO como tipo |
| Decisão normativa aplicável | MODIFICACOES_CONSOLIDADAS §4.Q14, §7.Q12 (Bolsista no enum) |
| Seções afetadas | 4 (Notificacao), 5 (dicionário Notificacao), 7 (regra Q14), 10.5 (fluxo retirada) |
| Arquivos .tex | Section-4-Modelagem-Entidades-SQL-3FN.tex, Section-5-Notas-de-Mapeamento-para-Firestore.tex, Section-10-Subsection-5-Fluxo-de-Reagentes.tex |
| Ação documental | Adicionar Chefe_Geral ao enum papel_destinatario; adicionar AUTO_ATENDIMENTO ao enum tipo; completar contrato Q14 no fluxo de retirada (único gestor ativo + justificativa + notificação Chefia + auditoria) |
| Dependências | EXTRA-002 (Q14 não encerra apenas com enum) |
| Critérios de aceite | Enum inclui Chefe_Geral e AUTO_ATENDIMENTO; fluxo de retirada Q14 documentado com validação de único gestor, justificativa e notificação obrigatória à Chefia |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-005 — Coleções ausentes da matriz de Security Rules

| Campo | Conteúdo |
|---|---|
| ID | PDF-005 |
| Problema no PDF | Deny-all não declararia leitura para várias coleções essenciais |
| Categoria documental | COBERTURA_FRAGMENTADA — Section-11 lista várias coleções mas faltam: Convite_Aluno, Resumo_*_Diario e especificações aninhadas (Resumo_Reagente/{id}/Especificacoes) |
| Decisão normativa aplicável | MODIFICACOES_CONSOLIDADAS §6.4; Section-11 atual |
| Seções afetadas | 11 (Security Rules) |
| Arquivos .tex | Section-11-Regras-de-Seguranca-do-Firestore-Security-Rules.tex |
| Ação documental | Adicionar à tabela de regras: (a) Resumo_Reagente/{id}/Especificacoes; (b) Convite_Aluno com leitura restrita e escrita negada ao cliente; (c) Resumo_Almoxarifado_Diario, Resumo_Reagente_Diario, Resumo_Bem_Patrimonial_Diario por papel autorizado |
| Dependências | EXTRA-001 (caminho de Especificacoes) |
| Critérios de aceite | Matriz cobre coleções listadas; leitura por papel correto; escrita do backend negada ao cliente |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-006 — Relatório patrimonial mensal usando estado atual

| Campo | Conteúdo |
|---|---|
| ID | PDF-006 |
| Problema no PDF | gerarRelatorioBensPredio recebe mês/ano mas especificação consultaria estado atual |
| Categoria documental | LACUNA_DOCUMENTAL — Section-10-Subsection-9 descreve o contrato do relatório mas não especifica que deve usar fonte histórica (Resumo_Bem_Patrimonial_Diario ou Historico_Bem_Patrimonial) para reconstruir localização no período |
| Decisão normativa aplicável | RF24 (relatórios por período); Seção 6 (materializações históricas) |
| Seções afetadas | 6 (Resumo_Bem_Patrimonial_Diario), 9 (fluxo 9.2.4), 10.9 (contratos de relatórios) |
| Arquivos .tex | Section-10-Subsection-9-Relatorios-em-PDF.tex, Section-6-Materialized-Views.tex |
| Ação documental | Especificar que gerarRelatorioBensPredio usa fonte histórica (materialização ou histórico imutável), não estado atual; documentar reconstrução de localização no corte temporal; ou, se o requisito for relatório atual, remover parâmetros de período e ajustar UI/nomenclatura explicitamente |
| Dependências | DDP-001 se a decisão não puder ser derivada da documentação existente |
| Critérios de aceite | Contrato indica fonte histórica para relatório com parâmetro de período; localização/situação de fevereiro não usa estado de julho |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-007 — Dois mecanismos de propagação de nome

| Campo | Conteúdo |
|---|---|
| ID | PDF-007 |
| Problema no PDF | Coexistem batch() único e BulkWriter como mecanismos de propagação de nome de bem |
| Categoria documental | CONTRADICAO_DOCUMENTAL — Section-10-Subsection-8 descreve dois mecanismos concorrentes; especificação não pode manter dois contratos simultâneos |
| Decisão normativa aplicável | MODIFICACOES_CONSOLIDADAS §5.5 (chunks de 400), mas não escolhe BulkWriter explicitamente |
| Seções afetadas | 10.8 (fan-out de nome) |
| Arquivos .tex | Section-10-Subsection-8-Fluxo-de-Bens-Patrimoniais.tex |
| Ação documental | Escolher UM mecanismo oficial: trigger com chunks de 400 (já decisão §5.5) ou BulkWriter. Registrar o escolhido; remover/marcar obsoleto o concorrente. Se não houver decisão suficiente → criar DDP |
| Dependências | PDF-017 (onLocalAtualizado usa chunks de 400 — coerência) |
| Critérios de aceite | Seção 10.8 descreve apenas um mecanismo de fan-out; limite de 500 não é excedido conforme o mecanismo escolhido |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-008 — Índices ausentes para relatórios

| Campo | Conteúdo |
|---|---|
| ID | PDF-008 |
| Problema no PDF | Consultas compostas de relatório (id_almoxarifado + data) sem índice no catálogo |
| Categoria documental | LACUNA_DOCUMENTAL — Section-5 (Seção 5.8) não lista índices compostos necessários para queries de Emprestimo_Reagente e Historico_Frasco_Reagente usadas nos relatórios |
| Decisão normativa aplicável | RF24; Seção 5.8 atual |
| Seções afetadas | 5 (Seção 5.8 — catálogo de índices) |
| Arquivos .tex | Section-5-Notas-de-Mapeamento-para-Firestore.tex |
| Ação documental | Adicionar à Seção 5.8 os índices compostos necessários para queries normativas: Emprestimo_Reagente (id_almoxarifado, data_devolucao_efetuada), Historico_Frasco_Reagente (id_almoxarifado, timestamp); somente índices com query normativa correspondente |
| Dependências | nenhuma |
| Critérios de aceite | Seção 5.8 lista os índices compostos necessários; nenhum índice especulativo sem query correspondente |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-009 — Contratos de posts e comentários ausentes

| Campo | Conteúdo |
|---|---|
| ID | PDF-009 |
| Problema no PDF | Seção 10 não especifica criação, edição ou moderação de posts/comentários |
| Categoria documental | COBERTURA_FRAGMENTADA — RF19, RF20, Q11, Q13 estão documentados em Seções 4/7/8, mas a Seção 10 não formaliza contratos de editarPost, editarComentario, moderarComentario |
| Decisão normativa aplicável | RF19, RF20, Q11, Q13; MODIFICACOES_CONSOLIDADAS §4.Q11, §4.Q13, §7.7 (DP-C02) |
| Seções afetadas | 4 (Post, Comentario, historico), 5 (caminhos Posts/Comentarios), 7 (RF19, RF20), 8 (UI-11), 9 (fluxo), 10.10 (contratos transversais), 11 |
| Arquivos .tex | Section-10-Subsection-10-Consolidacao-do-planejamento.tex, Section-4-Modelagem-Entidades-SQL-3FN.tex |
| Ação documental | Documentar contratos: editarPost (autoria, etiqueta editado, histórico), editarComentario (idem), moderarComentario (professor/Chefia, justificativa, tombstone, histórico, visibilidade diferenciada conforme DP-C02); referências cruzadas para Seções 4, 7, 8, 11 |
| Dependências | nenhuma |
| Critérios de aceite | Contratos completos (17 elementos da Seção 17 do prompt) para edição e moderação; soft-delete documentado; visibilidade diferenciada descrita |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-010 — Cadastro de almoxarifado sem contrato de backend

| Campo | Conteúdo |
|---|---|
| ID | PDF-010 |
| Problema no PDF | UI e fluxo CHE-03 descrevem criação de almoxarifado, mas Seção 10 não define o contrato |
| Categoria documental | LACUNA_DOCUMENTAL — contrato cadastrarAlmoxarifado ausente da Seção 10 |
| Decisão normativa aplicável | RF13; Section-3-Stakeholders §Chefe_Geral |
| Seções afetadas | 7 (RF13), 8 (UI CHE-03), 9 (fluxo), 10.10 (contratos transversais), 11 |
| Arquivos .tex | Section-10-Subsection-10-Consolidacao-do-planejamento.tex |
| Ação documental | Criar contrato cadastrarAlmoxarifado: Chefia ativa, dados obrigatórios, gestores elegíveis, ao menos um responsável, vínculos determinísticos, atomicidade, auditoria, estado inativo |
| Dependências | nenhuma |
| Critérios de aceite | Contrato completo com 17+ elementos; atomicidade e auditoria explícitas |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-011 — Materializações sem jobs de consolidação

| Campo | Conteúdo |
|---|---|
| ID | PDF-011 |
| Problema no PDF | Seção 6 define materializações; Seção 10 descreve apenas jobs de vencimento/escassez |
| Categoria documental | LACUNA_DOCUMENTAL — Section-10-Subsection-7 não contém jobs para produzir Resumo_Almoxarifado_Diario, Resumo_Reagente_Diario, Resumo_Bem_Patrimonial_Diario, Atividade_Gestor_*_Mensal |
| Decisão normativa aplicável | Seção 6; RF24 |
| Seções afetadas | 6 (fonte das materializações), 7 (RN idempotência), 10.7 (jobs) |
| Arquivos .tex | Section-10-Subsection-7-Jobs-Agendados.tex |
| Ação documental | Adicionar à Seção 10.7 os contratos dos jobs de materialização: horário, timezone America/Sao_Paulo, fonte, janela, ID determinístico, idempotência, retry, backfill, reconciliação e regras de acesso para cada materialização |
| Dependências | PDF-015 (timezone) |
| Critérios de aceite | Cada materialização da Seção 6 tem job correspondente documentado na Seção 10.7 com todos os parâmetros normativos |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-012 — Lote.id_resumo_reagente omitido

| Campo | Conteúdo |
|---|---|
| ID | PDF-012 |
| Problema no PDF | id_resumo_reagente ausente do dicionário formal de Lote |
| Categoria documental | LACUNA_DOCUMENTAL — entidade Lote na Seção 4 e dicionário da Seção 5 não incluem id_resumo_reagente como campo obrigatório |
| Decisão normativa aplicável | EXTRA-001 (caminho físico de Especificacoes); modelo lógico 3FN |
| Seções afetadas | 4 (Lote), 5 (dicionário Lote e Especificacoes), 7 (invariante) |
| Arquivos .tex | Section-4-Modelagem-Entidades-SQL-3FN.tex, Section-5-Notas-de-Mapeamento-para-Firestore.tex |
| Ação documental | Adicionar id_resumo_reagente como campo NOT NULL ao modelo 3FN de Lote e ao dicionário físico; documentar compatibilidade Lote–Especificação; registrar backfill exigido |
| Dependências | EXTRA-001 |
| Critérios de aceite | id_resumo_reagente em Lote no modelo 3FN e dicionário Firestore; backfill documentado |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-013 — Remoção de aluno sem contrato formal

| Campo | Conteúdo |
|---|---|
| ID | PDF-013 |
| Problema no PDF | removerAlunoTurma não formalizado na Seção 10 |
| Categoria documental | COBERTURA_FRAGMENTADA — operação existe no domínio (RF18, Seção 8) mas contrato formal da Seção 10 está ausente |
| Decisão normativa aplicável | RF18, RF25; Section-7 (regra de exclusão de aluno) |
| Seções afetadas | 9 (fluxo PRO-04), 10.10 (contratos transversais) |
| Arquivos .tex | Section-10-Subsection-10-Consolidacao-do-planejamento.tex |
| Ação documental | Documentar contrato removerAlunoTurma: autorização, remoção dos dois espelhos, decremento sem valor negativo, histórico, bloqueio de reingresso por código, convite explícito para retorno, idempotência |
| Dependências | nenhuma |
| Critérios de aceite | Contrato completo com regra de bloqueio de reingresso e convite explícito |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-014 — Descarte, quebra, vazio e quarentena sem contratos

| Campo | Conteúdo |
|---|---|
| ID | PDF-014 |
| Problema no PDF | ALM-06 sem contratos completos na Seção 10 |
| Categoria documental | LACUNA_DOCUMENTAL — estados DESCARTADO, QUEBRADO, VAZIO, QUARENTENA mencionados em Seção 7 e UI, mas contratos transacionais ausentes na Seção 10 |
| Decisão normativa aplicável | RF15; Section-7 (máquina de estados de frasco) |
| Seções afetadas | 7 (transições de estado), 8 (UI ALM-06), 9 (fluxo), 10.5 e 10.10 (contratos) |
| Arquivos .tex | Section-10-Subsection-5-Fluxo-de-Reagentes.tex, Section-10-Subsection-10-Consolidacao-do-planejamento.tex |
| Ação documental | Documentar contratos: registrarDescarteFrasco, registrarQuebraFrasco, alterarQuarentenaFrasco — cada um com: validação de gestor e vínculo, estado atual, transição permitida, histórico, auditoria, operações bloqueadas pós-transição |
| Dependências | nenhuma |
| Critérios de aceite | Cada transição tem contrato com máquina de estados explícita; operações bloqueadas documentadas |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-015 — Data civil dependente do timezone do servidor

| Campo | Conteúdo |
|---|---|
| ID | PDF-015 |
| Problema no PDF | Datas civis podem ser interpretadas em UTC em vez de America/Sao_Paulo |
| Categoria documental | COBERTURA_FRAGMENTADA — Section-7 e Section-10 mencionam datas civis mas não especificam explicitamente que devem ser interpretadas em America/Sao_Paulo com biblioteca IANA |
| Decisão normativa aplicável | MODIFICACOES_CONSOLIDADAS §5.5 (timestamps normalizados para 23:59:59.999 -03:00) |
| Seções afetadas | 7 (invariante de data civil), 10 (contratos com datas: retirada, devolução, jobs, relatórios) |
| Arquivos .tex | Section-7-Requisitos-e-Regras-de-Negocio.tex, Section-10-Subsection-7-Jobs-Agendados.tex (pseudocódigo usa setHours sem IANA), Section-10-Subsection-5-Fluxo-de-Reagentes.tex |
| Ação documental | Adicionar invariante normativa: todas as datas civis devem ser interpretadas em America/Sao_Paulo via biblioteca IANA; corrigir pseudocódigo de inicioDoDiaInstitucional/fimDoDiaInstitucional que usa setHours sem timezone; não fixar -03:00 hard-coded |
| Dependências | nenhuma |
| Critérios de aceite | Invariante de timezone IANA explícita na Seção 7; pseudocódigo de jobs não usa Date.setHours sem timezone |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-016 — Triggers de contagem não idempotentes

| Campo | Conteúdo |
|---|---|
| ID | PDF-016 |
| Problema no PDF | FieldValue.increment em eventos reexecutáveis causa drift |
| Categoria documental | COBERTURA_FRAGMENTADA — Section-10-Subsection-7 documenta onFrascoCriado/onFrascoRemovido com increment sem deduplicação; invariante de idempotência ausente |
| Decisão normativa aplicável | Princípio geral de idempotência de contratos (Seção 17 do prompt) |
| Seções afetadas | 10.7 (triggers de contagem), 7 (RN de idempotência) |
| Arquivos .tex | Section-10-Subsection-7-Jobs-Agendados.tex |
| Ação documental | Adicionar à Seção 10.7 a invariante de deduplicação por event.id ou recomputação determinística; documentar job de reconciliação periódica; o pseudocódigo atual sem deduplicação deve ser substituído ou anotado como incompleto |
| Dependências | nenhuma |
| Critérios de aceite | Contrato de trigger inclui estratégia de deduplicação; job de reconciliação documentado |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-017 — Atualização de local acima do limite de batch

| Campo | Conteúdo |
|---|---|
| ID | PDF-017 |
| Problema no PDF | onLocalAtualizado usa batch único podendo exceder 500 |
| Categoria documental | COBERTURA_FRAGMENTADA — Section-10-Subsection-8 descreve propagação de local sem mencionar limite nem estratégia de chunks; MODIFICACOES_CONSOLIDADAS §5.5 menciona "blocos de 400" mas não especifica qual trigger aplica isso |
| Decisão normativa aplicável | MODIFICACOES_CONSOLIDADAS §5.5 (chunks de 400) |
| Seções afetadas | 10.8 (onLocalAtualizado) |
| Arquivos .tex | Section-10-Subsection-8-Fluxo-de-Bens-Patrimoniais.tex |
| Ação documental | Atualizar documentação de onLocalAtualizado para refletir chunk de 400; coerência com PDF-007 (mecanismo escolhido) |
| Dependências | PDF-007 (mecanismo único) |
| Critérios de aceite | onLocalAtualizado documentado com paginação/chunks; limite de 500 não excedido conforme contrato |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-018 — Contenção no singleton de códigos

| Campo | Conteúdo |
|---|---|
| ID | PDF-018 |
| Problema no PDF | Toda criação de frasco transaciona singleton, limitando concorrência |
| Categoria documental | DECISAO_PENDENTE (parcial) — Section-5-Seção 5.7 e Section-7 já documentam o singleton; a questão é: a limitação de vazão é aceitável para o volume esperado? Decisão técnica ainda não registrada |
| Decisão normativa aplicável | Section-7 (código LCQUI-N nasce na transação) |
| Seções afetadas | 5 (Contador_Codigo_Frasco), 10 (contratos de cadastro de frasco) |
| Arquivos .tex | Section-5-Notas-de-Mapeamento-para-Firestore.tex |
| Ação documental | Documentar explicitamente: o singleton garante sequência estrita; a limitação de vazão é aceitável para o volume esperado do LCQUI (não fixar limite numérico sem benchmark); registrar que alternativas (blocos reservados) só serão abertas após benchmark formal |
| Dependências | nenhuma (benchmark é ação futura, não documental) |
| Critérios de aceite | Seção 5 documenta o singleton e registra explicitamente que benchmark deve preceder qualquer mudança de design |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-019 — Reserva de códigos na impressão de etiquetas virgens

| Campo | Conteúdo |
|---|---|
| ID | PDF-019 |
| Problema no PDF | Etiquetas virgens poderiam divergir do singleton |
| Categoria documental | SUGESTAO_REJEITADA — decisão explícita: etiqueta virgem não reserva código oficial; código nasce somente no cadastro físico |
| Decisão normativa aplicável | Section-7 "código LCQUI-N nasce na transação"; Section-3 §Gestor de Almoxarifado |
| Seções afetadas | verificar que UI e contrato de etiquetas virgens deixam claro que o identificador é sugestivo, não oficial |
| Arquivos .tex | Section-7-Requisitos-e-Regras-de-Negocio.tex (regra já existe), Section-8 (UI de etiquetas) |
| Ação documental | Verificar se a UI de etiquetas virgens e o contrato deixam inequívoco que o código impresso não é reservado; se ambiguidade residual → reforçar texto normativo |
| Dependências | nenhuma |
| Critérios de aceite | Seções 7 e 8 deixam claro que etiqueta virgem é artefato gráfico sem reserva; proposta do Gemini não reintroduzida |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-020 — Janela de Custom Claims após revogação

| Campo | Conteúdo |
|---|---|
| ID | PDF-020 |
| Problema no PDF | Claims podem permanecer em JWT por até 1h; mutações críticas não verificariam Usuarios.ativo |
| Categoria documental | COBERTURA_FRAGMENTADA — DP-D01 está resolvida e documentada, mas o contrato de validarPermissao na Seção 10 pode não listar explicitamente quais mutações requerem verificação de ativo |
| Decisão normativa aplicável | MODIFICACOES_CONSOLIDADAS §7.9 (DP-D01); Section-10-Subsection-3 |
| Seções afetadas | 10.3 (autorização), 10.5 (retirada, devolução), 10.8 (patrimônio), 10.4 (papéis) |
| Arquivos .tex | Section-10-Subsection-3-Funcoes-de-Apoio-Autorizacao.tex |
| Ação documental | Listar explicitamente no contrato de validarPermissao quais operações requerem requerAtivo=true (mutações de alto impacto: registrarRetirada, registrarDevolucao, responderRequisicao*, concederPapel, revogarPapel) e quais confiam no JWT |
| Dependências | nenhuma |
| Critérios de aceite | Seção 10.3 lista distingue operações com e sem verificação de ativo; conformidade com DP-D01 |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-021 — Formulário plano versus assistente de reagente

| Campo | Conteúdo |
|---|---|
| ID | PDF-021 |
| Problema no PDF | Seção 8.5 descrevia modal único vs UI-05 assistente em etapas |
| Categoria documental | JA_CONSOLIDADO — verificar nos .tex se a ambiguidade foi removida; UI-05 deve ser o contrato normativo |
| Decisão normativa aplicável | AUDITORIA_GEMINI_VALIDADA §PDF-021 (resolvido) |
| Seções afetadas | 8 (UI-05) |
| Arquivos .tex | Section-8-Descricao-das-telas-Dashboards.tex |
| Ação documental | Verificar texto da Seção 8.5 e UI-05 — se ambiguidade removida e UI-05 é inequívoco → JA_CONSOLIDADO; se texto legado permanece → remover |
| Dependências | nenhuma |
| Critérios de aceite | Apenas UI-05 (assistente em etapas) como contrato; formulário plano legado ausente |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-022 — Natureza química e rótulos

| Campo | Conteúdo |
|---|---|
| ID | PDF-022 |
| Problema no PDF | Coexistência de "Híbrido/Complexo/Biológico" vs HIBRIDO canônico |
| Categoria documental | JA_CONSOLIDADO — verificar enum nos .tex |
| Decisão normativa aplicável | Enum canônico: ORGANICO, INORGANICO, ELEMENTO, HIBRIDO |
| Seções afetadas | 4 (Resumo_Reagente), 5 (dicionário) |
| Arquivos .tex | Section-4-Modelagem-Entidades-SQL-3FN.tex |
| Ação documental | Verificar se apenas os 4 valores canônicos aparecem; se Biológico/Complexo ausentes → JA_CONSOLIDADO |
| Dependências | nenhuma |
| Critérios de aceite | Enum ORGANICO, INORGANICO, ELEMENTO, HIBRIDO; Biológico e Complexo ausentes |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-023 — Escassez calculada globalmente

| Campo | Conteúdo |
|---|---|
| ID | PDF-023 |
| Problema no PDF | Job de escassez usa IDs diferentes no comentário e no pseudocódigo; cálculo global em vez de por almoxarifado |
| Categoria documental | COBERTURA_FRAGMENTADA — Section-10-Subsection-7 não descreve job de escassez por almoxarifado; cálculo por (id_resumo_reagente, id_almoxarifado) ausente |
| Decisão normativa aplicável | RF24; Q14 (gestores vinculados à unidade) |
| Seções afetadas | 10.7 (jobs), 7 (RN de notificação por escassez) |
| Arquivos .tex | Section-10-Subsection-7-Jobs-Agendados.tex |
| Ação documental | Documentar job de escassez: cálculo por (id_resumo_reagente, id_almoxarifado), limiar aplicável, gestores ativos vinculados à unidade, ID idempotente com granularidade de almoxarifado, data civil America/Sao_Paulo |
| Dependências | PDF-015 (timezone) |
| Critérios de aceite | Job documentado com granularidade por almoxarifado; gestores notificados somente sobre sua unidade; ID idempotente correto |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-024 — Erro em qtd_frascos_adicionados

| Campo | Conteúdo |
|---|---|
| ID | PDF-024 |
| Problema no PDF | Seção 6.5 apresentava "_ frascos_adicionados" vs "qtd_frascos_adicionados" |
| Categoria documental | JA_CONSOLIDADO — verificar se qtd_frascos_adicionados é o único nome nos .tex |
| Decisão normativa aplicável | Nomenclatura canônica: qtd_frascos_adicionados |
| Seções afetadas | 6 (Atividade_Gestor_Almoxarifado_Mensal) |
| Arquivos .tex | Section-6-Materialized-Views.tex |
| Ação documental | Verificar — se apenas qtd_frascos_adicionados → JA_CONSOLIDADO; não duplicar com GEM-NOM-005 |
| Dependências | GEM-NOM-005 (tratamento conjunto) |
| Critérios de aceite | Apenas qtd_frascos_adicionados nos .tex |
| Estado | PENDENTE |
| Commit | — |

---

## PDF-025 — Tolerância Q06 baseada em massa líquida

| Campo | Conteúdo |
|---|---|
| ID | PDF-025 |
| Problema no PDF | Sugestão de usar massa líquida para tolerância; implementação atual usa margem fixa |
| Categoria documental | COBERTURA_FRAGMENTADA — a fórmula canônica está em MODIFICACOES_CONSOLIDADAS §2.2 mas pode não estar completamente propagada para Seção 7 e fluxo de devolução |
| Decisão normativa aplicável | MODIFICACOES_CONSOLIDADAS §2.2 (fórmula híbrida Q06): normal: max(1g; 0,5%×peso_saida); higroscópico: max(2g; 2%×peso_saida); sugestão do Gemini (massa líquida) REJEITADA |
| Seções afetadas | 4 (Frasco_Reagente — snapshot eh_higroscopico via DP-A02), 5 (dicionário Frasco), 7 (regra Q06), 10.5 (contrato de devolução) |
| Arquivos .tex | Section-7-Requisitos-e-Regras-de-Negocio.tex, Section-10-Subsection-5-Fluxo-de-Reagentes.tex |
| Ação documental | Verificar se a fórmula canônica (peso_saida bruto) está na Seção 7 com ambas as faixas; verificar contrato de registrarDevolucao na Seção 10.5; rejeitar massa líquida explicitamente |
| Dependências | nenhuma |
| Critérios de aceite | Fórmula completa em Seção 7; contrato de devolução referencia a fórmula; evento AJUSTE documentado para ganho tolerado |
| Estado | PENDENTE |
| Commit | — |

---

## EXTRA-001 — Caminho físico de Especificacoes divergente

| Campo | Conteúdo |
|---|---|
| ID | EXTRA-001 |
| Problema | Referências a Especificacao_Reagente como coleção raiz vs Resumo_Reagente/{id}/Especificacoes |
| Categoria documental | CONTRADICAO_DOCUMENTAL — possíveis referências legadas de coleção raiz nos .tex vs caminho aninhado correto |
| Decisão normativa aplicável | MODIFICACOES_CONSOLIDADAS §6.1 (§3.2 — ACL); modelo físico: Resumo_Reagente/{id}/Especificacoes |
| Seções afetadas | 5 (dicionário, Seção 5.9), 11 (Security Rules) |
| Arquivos .tex | Section-5-Notas-de-Mapeamento-para-Firestore.tex, Section-11-Regras-de-Seguranca-do-Firestore-Security-Rules.tex |
| Ação documental | Buscar ocorrências de Especificacao_Reagente nos .tex; garantir que as referências físicas usem o caminho aninhado; remover/marcar legado qualquer referência de coleção raiz |
| Dependências | PDF-005, PDF-012 |
| Critérios de aceite | Nenhuma referência física ativa à coleção raiz Especificacao_Reagente nos .tex; caminho Resumo_Reagente/{id}/Especificacoes usado consistentemente |
| Estado | PENDENTE |
| Commit | — |

---

## EXTRA-002 — Q14 operacional ausente

| Campo | Conteúdo |
|---|---|
| ID | EXTRA-002 |
| Problema | PDF-004 não encerra apenas com enum; regra operacional de autoatendimento ausente no fluxo de retirada |
| Categoria documental | LACUNA_DOCUMENTAL — tratado junto ao PDF-004 |
| Decisão normativa aplicável | MODIFICACOES_CONSOLIDADAS §4.Q14 |
| Seções afetadas | 10.5 (fluxo retirada) |
| Arquivos .tex | Section-10-Subsection-5-Fluxo-de-Reagentes.tex |
| Ação documental | Garantir que registrarRetirada inclui verificação de único gestor ativo, justificativa, notificação Chefia e auditoria para caso Q14 |
| Dependências | PDF-004 |
| Critérios de aceite | Contrato de registrarRetirada completo para Q14 |
| Estado | PENDENTE |
| Commit | — |

---

## EXTRA-003 — estado_fisico = GASOSO

| Campo | Conteúdo |
|---|---|
| ID | EXTRA-003 |
| Problema | Schema permite GASOSO; DP-A01 limita a SOLIDO/LIQUIDO |
| Categoria documental | CONTRADICAO_DOCUMENTAL — verificar se GASOSO aparece nos .tex como valor permitido |
| Decisão normativa aplicável | MODIFICACOES_CONSOLIDADAS §7.1 (DP-A01): SOLIDO e LIQUIDO no Resumo_Reagente |
| Seções afetadas | 4 (Resumo_Reagente — estado_fisico), 5 (dicionário) |
| Arquivos .tex | Section-4-Modelagem-Entidades-SQL-3FN.tex, Section-5-Notas-de-Mapeamento-para-Firestore.tex |
| Ação documental | Verificar se GASOSO aparece como valor canônico nos .tex; se sim, remover e anotar que DP-A01 limita a SOLIDO/LIQUIDO; não misturar com PDF-022 (natureza química) |
| Dependências | nenhuma |
| Critérios de aceite | Enum estado_fisico nos .tex contém apenas SOLIDO e LIQUIDO; GASOSO ausente ou marcado explicitamente como fora do escopo V1 |
| Estado | PENDENTE |
| Commit | — |

---

## GEM-NOM-001 — conteudo_nominal vs capacidade_nominal vs volumeNominal

| Campo | Conteúdo |
|---|---|
| ID | GEM-NOM-001 |
| Problema | Coexistência de nomes para o mesmo conceito |
| Categoria documental | CONTRADICAO_DOCUMENTAL — verificar qual nome canônico prevalece nos .tex |
| Decisão normativa aplicável | MODIFICACOES_CONSOLIDADAS (verificar se há decisão explícita) |
| Seções afetadas | 4 (Frasco_Reagente), 5 (dicionário), 10.5 (contratos) |
| Arquivos .tex | Section-4-Modelagem-Entidades-SQL-3FN.tex, Section-5-Notas-de-Mapeamento-para-Firestore.tex |
| Ação documental | Escolher nome canônico; propagar; documentar transformação entre payload e persistência quando intencional |
| Dependências | nenhuma |
| Estado | PENDENTE |

---

## GEM-NOM-002 — volume_total_usado_nos_frascos_devolvidos LEGADO

| Campo | Conteúdo |
|---|---|
| ID | GEM-NOM-002 |
| Problema | Campo legado marcado como LEGADO mas ainda NOT NULL na materialização |
| Categoria documental | COBERTURA_FRAGMENTADA — Section-6 já documenta o campo como LEGADO N-07; verificar se há contradição com NOT NULL |
| Seções afetadas | 6 (Resumo_Almoxarifado_Diario) |
| Arquivos .tex | Section-6-Materialized-Views.tex |
| Ação documental | Verificar se a anotação LEGADO é suficiente; adicionar nota explicativa sobre coexistência com NOT NULL para compatibilidade histórica |
| Estado | PENDENTE |

---

## GEM-NOM-003 — data_devolucao_efetuada vs dataDevolucao vs data_devolucao

| Campo | Conteúdo |
|---|---|
| ID | GEM-NOM-003 |
| Problema | Três nomes coexistindo para o mesmo conceito |
| Categoria documental | CONTRADICAO_DOCUMENTAL — verificar qual nome lógico e físico é o canônico |
| Seções afetadas | 4 (Emprestimo_Reagente), 5 (dicionário), 10 (contratos) |
| Arquivos .tex | Section-4-Modelagem-Entidades-SQL-3FN.tex, Section-5-Notas-de-Mapeamento-para-Firestore.tex |
| Ação documental | Definir convenção: nome lógico 3FN, nome físico Firestore, payload — eliminar alias ambíguos; documentar transformação intencional se existir |
| Estado | PENDENTE |

---

## GEM-NOM-004 — enum tipo_entidade_sofre_acao inconsistente

| Campo | Conteúdo |
|---|---|
| ID | GEM-NOM-004 |
| Problema | Convenção inconsistente no enum, inclusive FRASCO_REAGENTE |
| Categoria documental | COBERTURA_FRAGMENTADA — verificar enum na Seção 4 |
| Seções afetadas | 4 (Registro_de_Auditoria) |
| Arquivos .tex | Section-4-Modelagem-Entidades-SQL-3FN.tex |
| Ação documental | Definir convenção única; listar todos os valores; aplicar em modelo, dicionário e exemplos |
| Estado | PENDENTE |

---

## GEM-NOM-005 — _ frascos_adicionados vs qtd_frascos_adicionados

| Campo | Conteúdo |
|---|---|
| ID | GEM-NOM-005 |
| Problema | Typo de campo |
| Categoria documental | JA_CONSOLIDADO — verificar junto ao PDF-024 |
| Seções afetadas | 6 (Atividade_Gestor_Almoxarifado_Mensal) |
| Ação documental | Verificar junto ao PDF-024 |
| Estado | PENDENTE |
