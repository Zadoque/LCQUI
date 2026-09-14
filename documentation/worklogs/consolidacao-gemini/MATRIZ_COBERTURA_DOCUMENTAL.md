# MATRIZ_COBERTURA_DOCUMENTAL — Consolidação Gemini Spark × LaTeX LCQUI

> Rastreabilidade de cada achado/requisito pelas seções do documento.
> "Mencionado" ≠ "coberto": o contrato precisa ser suficiente para orientar implementação.

| ID | Decisão/Achado | Modelo 3FN (S4) | Firestore (S5) | RN/RF (S7) | UI (S8) | Fluxo (S9) | Contrato técnico (S10) | Segurança (S11) | Critério de aceite | Estado |
|---|---|---|---|---|---|---|---|---|---|---|
| PDF-001 | Locks, versão, unicidade patrimonial | Bem_Patrimonial/Requisicao_Edicao (parcial) | Locks_Requisicao, Chaves_Unicas (parcial) | RF10, RF11 (presentes) | UI patrimonial (presente) | Fluxo PAT (parcial) | S10.8 (algoritmo completo com Chaves_Unicas) | Locks negados ao cliente (presente) | Presente | VALIDADO_LATEX |
| PDF-002 | Revogação multi-role | Gestor_x_Almoxarifado, Bolsista→Aluno (presentes) | vínculos (presentes) | RN-ROLE-* (presentes) | UI revogação (verificar) | Fluxo revogação (verificar) | S10.4 (completude checada) | (verificar) | Presente | VALIDADO_LATEX |
| PDF-003 | Matrícula, espelhos, convite | Convite_Aluno, Turma/Aluno (presentes) | espelhos (presentes) | RF17, RF18 (presentes) | UI-10 (presente) | Fluxo ingresso (parcial) | aceitarConviteAluno corrigido | (presente) | Presente | VALIDADO_LATEX |
| PDF-004 | Q14 notificação Chefia | Notificacao (presente) | dicionário Notificacao (verificar enums) | Q14 (MODIFICACOES §4.Q14) | UI ALM (verificar) | Fluxo retirada (parcial) | contrato Q14 incompleto | (presente) | Ausente | COBERTURA_FRAGMENTADA |
| PDF-005 | Security Rules coleções ausentes | — | Resumo_Reagente/{id}/Especificacoes, Convite_Aluno, Resumo_*_Diario | — | — | — | — | coleções faltantes em S11 | Ausente | COBERTURA_FRAGMENTADA |
| PDF-006 | Relatório patrimonial histórico | — | Resumo_Bem_Patrimonial_Diario (S6) | RF24 (presente) | UI patrimonial (verificar) | Fluxo 9.2.4 (verificar) | S10.9 (fonte histórica ausente) | — | Ausente | LACUNA_DOCUMENTAL |
| PDF-007 | Dois mecanismos propagação nome | — | Resumo_Bem_Patrimonial (presente) | — | — | — | S10.8 (apenas um mecanismo) | — | Presente | VALIDADO_LATEX |
| PDF-008 | Índices ausentes relatórios | — | S5.8 (incompleto) | RF24 (presente) | — | — | S10.9 (queries sem índice) | — | Ausente | LACUNA_DOCUMENTAL |
| PDF-009 | Contratos posts/comentários ausentes | Post, Comentario, histórico (S4) | S5 (caminhos) | RF19, RF20, Q11, Q13 (presentes) | UI-11 (presente) | Fluxo (parcial) | editarPost, editarComentario, moderarComentario ausentes | comentários moderados (S11) | Ausente | COBERTURA_FRAGMENTADA |
| PDF-010 | Cadastro almoxarifado sem contrato | Almoxarifado (presente) | Gestor_x_Almoxarifado (presente) | RF13 (presente) | UI CHE-03 (presente) | Fluxo CHE-03 (presente) | cadastrarAlmoxarifado ausente | — | Ausente | LACUNA_DOCUMENTAL |
| PDF-011 | Materializações sem jobs | Atividade_Gestor_*, Resumo_*_Diario (S6) | S5 (coleções) | — | — | — | S10.7 (jobs de materialização ausentes) | — | Ausente | LACUNA_DOCUMENTAL |
| PDF-012 | Lote sem id_resumo_reagente | Lote (campo ausente) | dicionário Lote (campo ausente) | invariante (ausente) | — | — | S10.5 (verificar) | — | Ausente | LACUNA_DOCUMENTAL |
| PDF-013 | removerAlunoTurma sem contrato | Turma/Aluno (S4) | espelhos (S5) | RF18, RF25 (presentes) | UI-10 (presente) | Fluxo PRO-04 (presente) | contrato formal ausente em S10 | — | Ausente | COBERTURA_FRAGMENTADA |
| PDF-014 | Descarte/quebra/quarentena sem contratos | máquina de estados (S7) | Frasco_Reagente (S5) | RF15 (presente) | UI ALM-06 (presente) | Fluxo (presente) | contratos ausentes em S10 | — | Ausente | LACUNA_DOCUMENTAL |
| PDF-015 | Timezone do servidor | — | Timestamps (S5) | invariante de data (parcial, S7) | — | — | S10.7 (uso de IANA resolvido) | — | Presente | VALIDADO_LATEX |
| PDF-016 | Triggers não idempotentes | Lote_Materializado (S6) | contadores (S5) | RN idempotência (ausente) | — | — | S10.7 (com deduplicação em Eventos_Processados) | — | Presente | VALIDADO_LATEX |
| PDF-017 | Batch acima do limite | — | S5 (denormalização local) | — | — | — | S10.8 (chunks ausentes) | — | Ausente | COBERTURA_FRAGMENTADA |
| PDF-018 | Singleton contenção | Contador_Codigo (S5.7) | S5.7 | S7 (sequência estrita) | — | — | benchmark não documentado | — | Ausente | DECISAO_PENDENTE |
| PDF-019 | Etiquetas virgens sem reserva | — | — | S7 (regra presente) | S8 (UI etiquetas, verificar) | — | S10 (verificar) | — | Verificar | SUGESTAO_REJEITADA |
| PDF-020 | Custom Claims / requerAtivo | — | Usuarios.ativo (S5) | DP-D01 (MODIFICACOES §7.9) | — | — | S10.3 (verificar lista de mutações) | — | Ausente | COBERTURA_FRAGMENTADA |
| PDF-021 | Modal vs assistente reagente | — | — | — | UI-05 (verificar) | — | — | — | Verificar | PENDENTE |
| PDF-022 | Natureza química enum | Resumo_Reagente (verificar) | S5 (verificar) | — | — | — | — | — | Verificar | PENDENTE |
| PDF-023 | Escassez por almoxarifado | — | S5 | RN (verificar) | — | — | S10.7 (job ausente) | — | Ausente | COBERTURA_FRAGMENTADA |
| PDF-024 | qtd_frascos_adicionados typo | S6 (verificar) | — | — | — | — | — | — | Verificar | PENDENTE |
| PDF-025 | Q06 fórmula canônica | Frasco_Reagente/eh_higroscopico (DP-A02) | S5.9 (verificar) | S7 (fórmula corrigida com tolerância) | — | — | S10.5 (híbrido) | — | Presente | VALIDADO_LATEX |
| EXTRA-001 | Caminho Especificacoes divergente | — | S5 (verificar) | — | — | — | — | S11 (verificar) | Ausente | PENDENTE |
| EXTRA-002 | Q14 operacional ausente | — | — | Q14 (MODIFICACOES) | — | — | S10.5 (verificar) | — | Ausente | PENDENTE |
| EXTRA-003 | GASOSO fora do escopo DP-A01 | S4 (verificar) | S5 (verificar) | DP-A01 (MODIFICACOES) | — | — | — | — | Ausente | PENDENTE |
| GEM-NOM-001 | conteudo_nominal/capacidade_nominal | S4 (verificar) | S5 (verificar) | — | — | — | S10.5 (verificar) | — | Ausente | PENDENTE |
| GEM-NOM-002 | Campo legado LEGADO NOT NULL | S6 (presente com anotação) | — | — | — | — | — | — | Verificar | PENDENTE |
| GEM-NOM-003 | data_devolucao_efetuada aliases | S4 (verificar) | S5 (verificar) | — | — | — | S10 (verificar) | — | Ausente | PENDENTE |
| GEM-NOM-004 | tipo_entidade_sofre_acao enum | S4 (verificar) | — | — | — | — | — | — | Ausente | PENDENTE |
| GEM-NOM-005 | _ frascos_adicionados typo | S6 (verificar) | — | — | — | — | — | — | Verificar | PENDENTE |

---

## Rastreabilidade dos RF com cobertura fragmentada (Seção 13 do prompt)

| RF | Entidade | Campos físicos | Regra | UI | Fluxo | Contrato técnico | Autorização | Histórico/Auditoria | Critérios de aceite | Estado |
|---|---|---|---|---|---|---|---|---|---|---|
| RF06 | Bem_Patrimonial (S4) | plaqueta, situacao, versao (verificar) | RF06 (S7) | UI patrimonial (S8) | Fluxo PAT (S9) | S10.8 (parcial) | S11 (presente) | Historico_Bem_Patrimonial (verificar) | Verificar | PENDENTE |
| RF13 | Almoxarifado (S4) | ativo, gestores (verificar) | RF13 (S7) | UI CHE-03 (S8) | Fluxo CHE-03 (S9) | cadastrarAlmoxarifado (ausente) | S11 (verificar) | Registro_de_Auditoria (verificar) | Ausente | COBERTURA_FRAGMENTADA |
| RF15 | Frasco_Reagente (S4) | estado, histórico (verificar) | RF15 (S7) | UI ALM-06 (S8) | Fluxo descarte/quebra (S9) | contratos (ausentes) | S11 (verificar) | Historico_Frasco_Reagente (verificar) | Ausente | COBERTURA_FRAGMENTADA |
| RF17 | Turma (S4) | capacidade, qtd_alunos (verificar) | RF17 (S7) | UI turma (S8) | Fluxo criação (S9) | S10.10 (verificar) | S11 (presente) | HistoricoAlunos (verificar) | Verificar | PENDENTE |
| RF18 | Turma/Aluno, Convite_Aluno (S4) | espelhos (verificar) | RF18 (S7) | UI-10 (S8) | Fluxo ingresso (S9) | aceitarConviteAluno (ausente) | S11 (parcial) | HistoricoAlunos (verificar) | Ausente para convite | COBERTURA_FRAGMENTADA |
| RF19 | Post (S4) | ativo, editado (verificar) | RF19 (S7) | UI-11 (S8) | Fluxo posts (S9) | editarPost (ausente) | S11 (presente) | Historico_Posts_Turma (verificar) | Ausente | COBERTURA_FRAGMENTADA |
| RF20 | Comentario (S4) | moderado, tombstone (verificar) | RF20, Q11 (S7) | UI-11 (S8) | Fluxo comentarios (S9) | editarComentario, moderarComentario (ausentes) | S11 (presente) | Historico_Comentario (verificar) | Ausente | COBERTURA_FRAGMENTADA |
| RF21 | Roteiro_Experimento (S4) | storage_path (verificar) | RF21 (S7) | UI roteiro (S8) | Fluxo upload (S9) | S10.10 (verificar) | S11 (presente) | (verificar) | Verificar | PENDENTE |
| RF22 | ACL professores_compartilhados | array ACL (S5, MODIFICACOES §3.2) | RF22 (S7) | UI compartilhar (S8) | Fluxo compartilhamento (S9) | S10.10 (verificar) | S11 (presente) | (verificar) | Verificar | PENDENTE |
