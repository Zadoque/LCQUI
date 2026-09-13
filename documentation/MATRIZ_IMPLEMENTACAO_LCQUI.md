# Matriz de implementação e rastreabilidade LCQUI

Revisão: 11/09/2026. Referência funcional: LaTeX, seções 3, 5.9, 7, 8 e 9. Esta revisão é documental e de inspeção estática; não executou testes funcionais nem homologação. `PARCIAL` significa que há código relacionado, mas não há evidência suficiente de conformidade integral com os novos contratos. Existência de teste não significa aprovação nesta revisão. Nenhum item recebe `VALIDADO` sem execução identificada e aceite.

Os caminhos de frontend abreviados após ponto e vírgula pertencem à mesma árvore indicada. Testes abaixo são relativos a `functions/src/__tests__/`. Funções e coleções são nomes observados; diferenças para o alvo estão na auditoria.

## Requisitos RF01–RF25

| RF | Requisito | Tela/fluxo | Evidência estática | Função / dados | Teste relacionado existente | Lacuna principal | Estado |
|---|---|---|---|---|---|---|---|
| RF01 | Login e-mail/senha | UI-01 / COM-01 | `frontend/src/app/login/page.tsx; contexts/AuthContext.tsx` | `Firebase Auth / Usuarios` | `auth.test.ts` | Renovação, conta inativa e E2E | PARCIAL |
| RF02 | Login Google | UI-01 / COM-01 | `frontend/src/app/login/page.tsx` | `Firebase Auth / Usuarios` | `auth.test.ts` | E2E de conta sem papel e provedor | PARCIAL |
| RF03 | Recuperação de senha | UI-01 / COM-01 | `frontend/src/app/login/page.tsx` | `Firebase Auth` | `auth.test.ts` | Verificar UX genérica e fluxo do link | PARCIAL |
| RF04 | Multi-role | UI-02 / CHE-01–02 | `functions/src/auth.ts; usuarios.ts; domain/revogarPapel.ts` | `convidarUsuario; revogarUsuarioPapel / perfis` | `domain/roles.test.ts; domain/revogacao.test.ts` | RN-ROLE completas, atomicidade e versão de claims | PARCIAL |
| RF05 | Alternância de papel | UI-01 / COM-01 | `frontend/src/components/layout/Header.tsx; Sidebar.tsx` | `Apresentação cliente; sem endpoint switchRole confirmado` | `auth.test.ts` | Troca real de escopo, limpeza de cache e E2E | PARCIAL |
| RF06 | Cadastro/manutenção patrimonial | UI-09 / PAT-01 | `frontend/src/components/patrimonio/ModaisPatrimonio.tsx; functions/src/patrimonio.ts` | `Bem_Patrimonial; Resumo_Bem_Patrimonial` | `patrimonio.test.ts` | Unificar mutações servidor e campos obrigatórios | PARCIAL |
| RF07 | Histórico patrimonial | UI-04 / PAT-02 | `functions/src/patrimonio.ts; frontend/src/app/patrimonio/[id]/page.tsx` | `Historico_Bem_Patrimonial (raiz atual; alvo subcoleção)` | `patrimonio.test.ts` | Migrar caminho e preservar snapshots | PARCIAL |
| RF08 | Requisição de adição | UI-09 / PRO-10 | `functions/src/patrimonio.ts` | `criarRequisicaoAdicaoBem / Requisicao_Adicao_Bem_Patrimonial` | `patrimonio.test.ts` | Foto na aprovação, unicidade e Rules | PARCIAL |
| RF09 | Requisição de edição | UI-09 / PRO-10 | `functions/src/patrimonio.ts` | `criarRequisicaoEdicaoBem / Requisicao_Edicao_Bem_Patrimonial` | `patrimonio.test.ts` | Versão do bem e reclassificação | PARCIAL |
| RF10 | Uma edição pendente por bem | UI-09 / PAT-03 | `functions/src/patrimonio.ts` | `Locks_Requisicao_Patrimonio` | `patrimonio.test.ts` | Concorrência e limpeza sem expirar pendências | PARCIAL |
| RF11 | Responder requisição | UI-09 / PAT-03 | `functions/src/patrimonio.ts; frontend/src/app/patrimonio/requisicoes/page.tsx` | `responderRequisicaoAdicaoBem; responderRequisicaoEdicaoBem` | `patrimonio.test.ts` | Transação, resposta duplicada, justificativa | PARCIAL |
| RF12 | Baixa comprovada | UI-09 / PAT-04 | `frontend/src/components/patrimonio/ModaisPatrimonio.tsx; storage.rules` | `Bem_Patrimonial; baixas_patrimoniais no Storage` | `patrimonio.test.ts; security/storage.rules.test.ts` | Preservação de comprovante e E2E | PARCIAL |
| RF13 | Almoxarifados | UI-03 / CHE-03 | `firestore.rules; frontend/src/app/page.tsx` | `Almoxarifado; Gestor_Almoxarifado_x_Almoxarifado` | `domain/revogacao.test.ts` | Ativação com gestor e mutação exclusiva servidor | PARCIAL |
| RF14 | Gravimetria | UI-06 / ALM-02–05 | `functions/src/reagentes.ts; schemas/reagentes.schema.ts` | `cadastrarFrascoFechado; cadastrarFrascoAberto` | `reagentes.test.ts` | Caminho da especificação e Q06 | PARCIAL |
| RF15 | Movimentações e descarte | UI-07 / ALM-03–06 | `functions/src/reagentes.ts` | `registrarAberturaFrasco; registrarRetirada; registrarDevolucao` | `reagentes.test.ts` | Completar descarte, ajustes e idempotência | PARCIAL |
| RF16 | Consultas/filtros | UI-04 / ALU-04, PRO-09–10, PAT-02 | `frontend/src/app/reagentes/page.tsx; patrimonio/page.tsx` | `Catálogos; firestore.indexes.json` | `Segurança de consultas: a ampliar` | Paginação, consulta exata e escopo | PARCIAL |
| RF17 | Turma/capacidade | UI-10 / PRO-01 | `functions/src/turmas.ts` | `criarTurma / Turma` | `turmas.test.ts` | Campos, unicidade de código e contrato completo | PARCIAL |
| RF18 | Ingresso por código/convite | UI-10 / ALU-01, PRO-03 | `functions/src/turmas.ts` | `ingressarEmTurmaPorCodigo; convidarAluno; adicionarAlunoExistenteTurma` | `turmas.test.ts` | Aceitação completa, exceção nominal e Q02 | PARCIAL |
| RF19 | Posts | UI-11 / PRO-07 | `functions/src/posts.ts; frontend/src/components/turmas/FeedTurma.tsx` | `criarPost / Turma/id/Posts` | `Testes específicos de posts: a mapear` | Histórico, edição, limites e Rules | PARCIAL |
| RF20 | Comentários | UI-11 / ALU-03, PRO-08 | `functions/src/posts.ts; frontend/src/components/turmas/ComentariosPost.tsx` | `adicionarComentario / Posts/id/Comentarios` | `Testes específicos: a mapear` | Escopo de leitura, Q10/Q11 | PARCIAL |
| RF21 | Upload PDF | UI-11 / PRO-05 | `functions/src/roteiros.ts; storage.rules` | `registrarRoteiro / Roteiro_Experimento` | `roteiros.test.ts; security/storage.rules.test.ts` | Validar objeto e limitar leitura por acesso | PARCIAL |
| RF22 | Compartilhar roteiro | UI-11 / PRO-06 | `functions/src/roteiros.ts` | `compartilharRoteiro; descompartilharRoteiro` | `roteiros.test.ts` | Q09 e relação física consistente | PARCIAL |
| RF23 | Vincular roteiro à turma | UI-11 / PRO-07 | `functions/src/posts.ts` | `Post.id_roteiro_experimento` | `roteiros.test.ts (não prova E2E)` | Acesso do aluno e compartilhamento revogado | PARCIAL |
| RF24 | Relatórios | UI-12 / ALM-08, PAT-05 | `functions/src/relatorios.ts; frontend/src/lib/pdf.ts` | `gerarRelatorioAlmoxarifado; gerarRelatorioBensPredio; gerarRelatorioPersonalizado` | `relatorios.test.ts` | 31 dias, unidades, materializações e escopo | PARCIAL |
| RF25 | Preservação de fatos | UI-02, UI-07, UI-09–12 / CHE-02, PAT-04 | `functions/src/usuarios.ts; posts.ts; patrimonio.ts` | `Registro_de_Auditoria e históricos` | `domain/revogacao.test.ts; patrimonio.test.ts` | Retenção, exclusões, eventos e provas de ponta a ponta | PARCIAL |

## Regras e critérios de aceitação

| Regra | Fluxos | Dados / evidência | Critério ainda a verificar | Estado |
|---|---|---|---|---|
| RN-ROLE-01 | CHE-01/02; ALM-05 quando aplicável | `usuarios.ts`, `domain/revogarPapel.ts`, `auth.ts` | Chefe exclusivo; testar concorrência quando houver contagem | PARCIAL |
| RN-ROLE-02 | CHE-01/02; ALM-05 quando aplicável | `usuarios.ts`, `domain/revogarPapel.ts`, `auth.ts` | Não revogar outro Chefe; testar concorrência quando houver contagem | PARCIAL |
| RN-ROLE-03 | CHE-01/02; ALM-05 quando aplicável | `usuarios.ts`, `domain/revogarPapel.ts`, `auth.ts` | Autorrevogação conserva outro Chefe ativo; testar concorrência quando houver contagem | PARCIAL |
| RN-ROLE-04 | CHE-01/02; ALM-05 quando aplicável | `usuarios.ts`, `domain/revogarPapel.ts`, `auth.ts` | Última chefia removida desativa sem apagar; testar concorrência quando houver contagem | PARCIAL |
| RN-ROLE-05 | CHE-01/02; ALM-05 quando aplicável | `usuarios.ts`, `domain/revogarPapel.ts`, `auth.ts` | Cada almoxarifado ativo conserva gestor; testar concorrência quando houver contagem | PARCIAL |
| RN-ROLE-06 | CHE-01/02; ALM-05 quando aplicável | `usuarios.ts`, `domain/revogarPapel.ts`, `auth.ts` | Outro gestor vinculado pode receber devolução; testar concorrência quando houver contagem | PARCIAL |
| RN-ROLE-07 | CHE-01/02; ALM-05 quando aplicável | `usuarios.ts`, `domain/revogarPapel.ts`, `auth.ts` | Revogar gestor almoxarifado preserva outros papéis; testar concorrência quando houver contagem | PARCIAL |
| RN-ROLE-08 | CHE-01/02; ALM-05 quando aplicável | `usuarios.ts`, `domain/revogarPapel.ts`, `auth.ts` | Revogar gestor patrimônio preserva outros papéis; testar concorrência quando houver contagem | PARCIAL |
| RN-ROLE-09 | CHE-01/02; ALM-05 quando aplicável | `usuarios.ts`, `domain/revogarPapel.ts`, `auth.ts` | Não revogar último gestor patrimonial ativo; testar concorrência quando houver contagem | PARCIAL |
| RN-ROLE-10 | CHE-01/02; ALM-05 quando aplicável | `usuarios.ts`, `domain/revogarPapel.ts`, `auth.ts` | Último papel removido desativa conta; testar concorrência quando houver contagem | PARCIAL |
| RN-ROLE-11 | CHE-01/02; ALM-05 quando aplicável | `usuarios.ts`, `domain/revogarPapel.ts`, `auth.ts` | Histórico e identidade preservados; testar concorrência quando houver contagem | PARCIAL |
| RN-ROLE-12 | CHE-01/02; ALM-05 quando aplicável | `usuarios.ts`, `domain/revogarPapel.ts`, `auth.ts` | Multi-role altera só o papel escolhido; testar concorrência quando houver contagem | PARCIAL |
| RN-ROLE-13 | CHE-01/02; ALM-05 quando aplicável | `usuarios.ts`, `domain/revogarPapel.ts`, `auth.ts` | Conta sem papéis permanece armazenada; testar concorrência quando houver contagem | PARCIAL |
| RN-ROLE-14 | CHE-01/02; ALM-05 quando aplicável | `usuarios.ts`, `domain/revogarPapel.ts`, `auth.ts` | Claims recalculadas e token antigo bloqueado; testar concorrência quando houver contagem | PARCIAL |
| RN-ROLE-15 | CHE-01/02; ALM-05 quando aplicável | `usuarios.ts`, `domain/revogarPapel.ts`, `auth.ts` | Auditar concessão, revogação e rejeição com motivo; testar concorrência quando houver contagem | PARCIAL |
| RN-TUR-01 | ALU-01 / PRO-03 | Seções 5.9, 7 e 8 | Capacidade transacional; exceção nominal justificada; espelho consistente | PARCIAL |
| RN-QUIM-01 | ALM-02–05 | Seções 5.9, 7 e 8 | Densidade positiva, unidade coerente e tara válida | PARCIAL |
| RN-QUIM-02 | ALM-04–06 | Seções 5.9, 7 e 8 | Quarentena bloqueia retirada; vencido exige destino e ciência didática | PARCIAL |
| RN-ETQ-01 | ALM-07 | Seções 5.9, 7 e 8 | Virgens 1–50, offset válido, sem reserva; segunda via 1–10 distintas e uma etiqueta/ficha | PARCIAL |
| RN-REL-01 | ALM-08 / PAT-05 | Seções 5.9, 7 e 8 | Período até 31 dias, sem futuro, somente escopo autorizado, g/ml separados | PARCIAL |
| RN-INT-01 | PAT-03 | Seções 5.9, 7 e 8 | Lock e requisição atômicos, sem limpeza por idade de pendência | PARCIAL |
| RN-CACHE-01 | COM-01 | Seções 5.9, 7 e 8 | Cache por UID/escopo e descarte de dados na troca; sem autoridade em localStorage | PARCIAL |

## Cobertura dos fluxos da seção 9

A seção 9 define entradas, validação, persistência, falhas e retorno para cada ID abaixo. A implementação integral de cada grupo está **PARCIAL**; execução E2E nesta revisão: **não realizada**.

| Grupo | Ações rastreadas | Contratos |
|---|---|---|
| COM-01 | Login, recuperação, perfil, logout e troca de papel | UI-01/13 |
| CHE-01–05 | Pessoas, concessão/revogação, almoxarifados, gestores, consultas e gestão global | UI-02/03/04 |
| MAT-01 | Criar/editar matéria | UI-03 |
| PRO-01–10 | Turmas, convites, membros, roteiros, compartilhamento, posts, comentários, consultas e requisições | UI-04/09/10/11/12 |
| ALU-01–04 | Ingresso, turmas/colegas/PDF, comentários/notificações e catálogo | UI-04/10/11/12 |
| BOL-01 | Ações de Aluno e empréstimo como destinatário | UI-07/12 |
| ALM-01–08 | Catálogo químico, frascos, pesagem, retirada/retorno, alertas, etiquetas e relatórios | UI-04–08/12 |
| PAT-01–05 | Catálogo/bens, pesquisa/histórico, decisões, baixa e relatórios | UI-04/09/12 |

## Como atualizar os estados

Para concluir um item, registrar commit, comando/data/resultado dos testes pertinentes, caminhos reais de Rules/índices e evidência do fluxo UI. Testar autor autorizado e não autorizado, outro recurso/escopo, dados inválidos, repetição e concorrência quando aplicável. Homologação não é substituída por mocks. Decisões Q01–Q14 permanecem em [DUVIDAS_PENDENTES_LCQUI.md](DUVIDAS_PENDENTES_LCQUI.md).
