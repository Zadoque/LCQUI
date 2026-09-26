# Matriz de implementação LCQUI — auditoria normativa

## Metodologia

- **Data da auditoria:** 26/09/2026.
- **Branch e base:** `audit/implementation-matrix`, derivada de `dev` em `5cf48ed82872db2edb661171b9413fe2db63256d`.
- **Oráculo normativo:** fontes `.tex` correntes compostas por `documentation/main.tex`, com ênfase nas Seções 5–11 e em `Formal-Spec-M0.tex` a `Formal-Spec-M13.tex`. CUE, Alloy, artefatos gerados e worklogs M0–M13 foram usados para confirmar shapes, invariantes e rationale. A matriz arquivada de 13/09/2026 foi usada somente para descobrir caminhos.
- **Objeto auditado:** `frontend/**`, `functions/**`, `firestore.rules`, `storage.rules`, `firebase.json`, índices e seeds disponíveis. Testes existentes foram lidos como evidência auxiliar; não foram tratados como prova de conformidade.
- **Precedência:** texto normativo corrente → contrato formal executável → worklogs → implementação/testes. A Seção 12 foi tratada como futuro/pós-V1.
- **Estados:** `NÃO IMPLEMENTADO` indica ausência de mecanismo funcional relevante; `DIVERGENTE` indica implementação relacionada que deixa de cumprir ao menos uma obrigação aplicável; `NÃO DIVERGENTE` seria usado apenas se nenhuma divergência fosse encontrada em todas as obrigações examinadas da feature.
- **Limitação:** esta é uma auditoria estática. Não é homologação, prova E2E, certificação de implantação, validação de dados legados ou garantia de comportamento concorrente real.
- **Regra de completude:** todas as linhas abaixo foram auditadas (`SIM`). Nenhuma conclusão foi inferida somente da existência de código, teste ou compilação.

## Sumário calculado

<!-- MATRIX_COUNTS_START -->

| Medida | Total |
|---|---:|
| Total de features | 70 |
| Auditadas | 70 |
| Não auditadas | 0 |
| DIVERGENTE | 52 |
| NÃO DIVERGENTE | 1 |
| NÃO IMPLEMENTADO | 17 |

<!-- MATRIX_COUNTS_END -->

## Matriz principal

Abreviações: `S5`–`S11` = seções normativas; `UI-n` = contrato de tela; `COM/CHE/PRO/ALU/BOL/ALM/PAT` = fluxos da Seção 9; `M-n` = milestone formal. “Teste futuro” descreve a classe mínima esperada para a próxima fase, não autoriza sua criação nesta rodada.

### Identidade, papéis e cadastros básicos

| ID | Domínio | Feature | Fonte normativa | Milestone(s) | Implementação encontrada | Auditado | Estado | Divergência / evidência | Testes existentes relacionados | Teste futuro necessário |
|---|---|---|---|---|---|---|---|---|---|---|
| IMP-AUTH-001 | Autenticação | Login por e-mail e senha | RF01; S8 UI-01; S9 COM-01 | M9 | `frontend/src/app/login/page.tsx`; `contexts/AuthContext.tsx` | SIM | DIVERGENTE | Não limita/normaliza e-mail como UI-01; conta com claim antiga pode ser tratada como ativa sem conferir `Usuarios.ativo`/versão; não há ação “Tentar novamente”. | `auth.test.ts` (helpers, não fluxo UI) | E2E Auth: sucesso, erro genérico, inativo, sem papel, rede |
| IMP-AUTH-002 | Autenticação | Login Google | RF02; S8 UI-01; S9 COM-01 | M9 | `login/page.tsx: handleGoogleLogin`; `AuthContext` | SIM | DIVERGENTE | Provedor existe, mas a montagem da sessão não aplica integralmente autoridade persistida/versão M9 nem distingue conta sem papel de inativa. | `auth.test.ts` (indireto) | E2E provedor + contas sem vínculo/inativas |
| IMP-AUTH-003 | Autenticação | Recuperação de senha | RF03; S8 UI-01; S9 COM-01 | — | `login/page.tsx: handleForgotPassword` | SIM | DIVERGENTE | Não aplica trim/limite do e-mail, não oferece retry de rede e apresenta confirmação/erro dependente da resposta em vez de confirmação uniforme. | nenhum específico | E2E enumeração, erro de rede e confirmação uniforme |
| IMP-AUTH-004 | Usuários/UI | Perfil, logout e alternância de papel | RF04–05; S8 UI-01/UI-13; S9 COM-01 | M9, M13 | `Header.tsx`; `Sidebar.tsx`; `ProtectedRoute.tsx` | SIM | DIVERGENTE | Header exibe todos os papéis, mas não há seletor de papel ativo, perfil editável/propagação nem descarte coordenado de listeners/URLs/dados ao trocar papel/sair. | nenhum específico | E2E troca de papel, sessão, perfil e limpeza de escopo |
| IMP-ROLE-001 | Papéis | Matriz multi-role e concessão | RF04; S7 M9; RN-ROLE-01/12/16; S8 UI-02 | M9 | `auth.ts: validarMatrizPapeis`; `usuarios.ts: convidarUsuario/alterarPapel` | SIM | DIVERGENTE | Invariantes principais existem, mas `idOperacao` é opcional/aleatório e o fluxo não cobre aceite de convite/autoatendimento; várias callables continuam confiando só em claims. | `domain/roles.test.ts`; `integration/usuarios.integration.test.ts` | Contrato transacional + concorrência + retry M7 |
| IMP-ROLE-002 | Papéis | Revogação e proteção dos últimos responsáveis | S7 RN-ROLE-02–15; S9 CHE-02; S10.4 | M7, M9 | `usuarios.ts: revogarUsuarioPapel/alterarPapel/reconciliarClaimsUsuario` | SIM | DIVERGENTE | Há contagem, auditoria e reconciliação, porém identidade M7 diverge do hash canônico; chamada inicia por claim e faltam garantias integrais de TOCTOU/revogação de sessão e retenção especificadas. | `domain/revogacao.test.ts`; integração de usuários | Emulator concorrente, claim obsoleta e retries compatíveis/incompatíveis |
| IMP-ROLE-003 | Autorização | Autorização persistida no commit | S7 M9; S10.2–10.4; S11 | M9 | `auth.ts: resolverAutoridadePersistidaTx/validarAutoridadePersistida` (fundação M9, etapa A); `usuarios.ts: alterarPapel/convidarUsuario/revogarUsuarioPapel` migrados; `auth.ts: validarPermissao` legado | SIM | DIVERGENTE | Fundação M9 backend criada e comprovada: a primitiva transacional relê `Usuarios/{uid}.ativo`, `versao_permissoes`, conjunto fechado de papéis e documento de papel com `id_usuario` do UID, e é aplicada no commit de `alterarPapel`/`convidarUsuario`/`revogarUsuarioPapel` (fecha TOCTOU nessas operações). Permanece divergente porque as demais callables (reagentes, patrimônio, turmas, posts, roteiros, notificações, relatórios, etiquetas) ainda usam `validarPermissao` JWT-only e escopo fora da transação. | `auth.test.ts` (parser/helpers legados); `integration/m9-backend-authority.integration.test.ts` (`TEST-INT-M9-AUTH-001–015`, `-OP-001–004`, PASS Node 20); `integration/usuarios.integration.test.ts` | Migrar cada domínio para a primitiva M9 transacional; matriz M9 completa de escopo/ownership e revogação entre leitura e commit nas demais callables |
| IMP-ROLE-004 | Papéis/UI | Gestão de usuários, vínculos e diretório mínimo | S7 M9/RN-ROLE; S8 UI-02; S9 CHE-01–04 | M9, M11 | `professores/page.tsx`; `alunos/page.tsx`; `usuarios.ts` | SIM | DIVERGENTE | Telas leem coleções administrativas inteiras, expõem campos acadêmicos, não implementam todos os tipos/vínculos/atividade e dependem de Rules incompatíveis com projeções mínimas. | integração de usuários; Rules | E2E por papel + endpoints de projeção mínima |
| IMP-BASE-001 | Almoxarifados | Criar, ativar e vincular gestores | RF13; S8 UI-03; S9 CHE-03 | M9 | Rules e leituras em telas; nenhum callable de almoxarifado | SIM | NÃO IMPLEMENTADO | Não há endpoint/fluxo funcional que imponha Local, estado ativo e ao menos um gestor para ativação. | revogação (apenas proteção indireta) | Contrato CRUD/vínculo, último gestor e concorrência |
| IMP-BASE-002 | Cadastros | Locais e propagação | S5; S8 UI-03 | M9, M10 | `patrimonio.ts: onLocalAtualizado`; leitura direta de `Local` | SIM | DIVERGENTE | Fan-out de projeção existe, mas não há criação/edição server-owned com unicidade normalizada, autoria e validação; Rules permitem escrita cliente a papéis. | patrimônio (indireto) | Unicidade concorrente + propagação sem alterar versão |
| IMP-BASE-003 | Cadastros | Matérias | S8 UI-03; S9 MAT-01 | M9, M11 | `materias.ts: criarMateria`; `NovaMateriaModal.tsx` | SIM | DIVERGENTE | Só cria; não há edição/propagação. Unicidade é consulta prévia não transacional e callable não revalida autoridade persistida. | `turmas.test.ts` (indireto) | Criação concorrente, edição e autorização M9 |
| IMP-BASE-004 | Pesquisa | Catálogo JSON de reagentes | S5 catálogo; S8 UI-04/UI-13; S10.5; S11 | M8, M9 | Frontend consulta diretamente `Resumo_Reagente` e subcoleções | SIM | NÃO IMPLEMENTADO | Não há produtor/estado versionado `Sistema_Catalogo_Reagentes`, objeto protegido no Storage ou atualização/subscrição por versão. | nenhum | Produtor, ACL, versão e busca client-side |

### Reagentes, frascos, metrologia e estoque

| ID | Domínio | Feature | Fonte normativa | Milestone(s) | Implementação encontrada | Auditado | Estado | Divergência / evidência | Testes existentes relacionados | Teste futuro necessário |
|---|---|---|---|---|---|---|---|---|---|---|
| IMP-REAG-001 | Reagentes | Substância, resumo, especificação e composição | S5; RF14; S7 campos; S8 UI-05; S9 ALM-01 | M1, M2 | `reagentes_base.ts`; schemas; `ModaisReagentes.tsx` | SIM | DIVERGENTE | Shapes divergem: higroscopicidade ausente; CAS sem dígito/unicidade; composição usa valor único em vez de faixa/notação; escopo/atividade do gestor não são relidos. | `reagentes.test.ts` (densidade) | Fixtures CUE + integração de referências/unicidade |
| IMP-REAG-002 | Lotes | Cadastro e unicidade de lote | S5; S8 UI-05; S9 ALM-01 | M2 | `reagentes_base.ts: cadastrarLote` | SIM | DIVERGENTE | Consulta de duplicidade não cria chave/lock canônico; não valida datas/limites integrais e mistura subcoleção de especificação com referências raiz usadas em outros módulos. | `relatorios.test.ts` textual | Concorrência, datas e integridade de referência |
| IMP-FRASC-001 | Frascos | Cadastro fechado e código atômico | RF14–15; S5 contador; S7; S8 UI-06 | M2, M7, M9 | `reagentes.ts: cadastrarFrascoFechado`; contador singleton | SIM | DIVERGENTE | Código é transacional, mas nominal não pode ser desconhecido; não cria histórico/auditoria/receipt M7; validações de almox ativo, localização e autorização ficam fora da transação; pendência de descarte não é estruturada. | `reagentes.test.ts` | Cadastro completo, contenção do contador e retry |
| IMP-FRASC-002 | Frascos | Cadastro já aberto | S7 condição inicial; S8 UI-06 | M2, M6 | `cadastrarFrascoAberto`; schema | SIM | DIVERGENTE | Implementa `CONHECE_TARA/ESTIMA_VOLUME/ESTIMA_MASSA`, expressamente proibidos; fabrica abertura atual, calcula tara e saldo onde o contrato exige desconhecidos. | `reagentes.test.ts` | Casos CUE de saldo/tara/abertura desconhecidos |
| IMP-FRASC-003 | Abertura | Abertura e validade efetiva | S7 validade; S8 UI-06/07; S10.6 | M2, M7 | `registrarAberturaFrasco`; `calcularValidadeEfetivaNaAbertura` | SIM | DIVERGENTE | Recalcula validade, mas não há idempotência/histórico/auditoria; decisão de pendência não gera projeção; autorização/escopo não são lidos atomicamente. | `reagentes.test.ts` | Datas-limite, retry e concorrência |
| IMP-RET-001 | Retirada | Retirada exclusiva | RF15; S7 retirada; S8 UI-07; S9 ALM-04 | M3, M4, M7, M9 | `reagentes.ts: registrarRetirada`; modal | SIM | DIVERGENTE | Exclusão por disponibilidade existe, porém destinatário é verificado fora da transação e sem ativo; finalidade enum diverge; não fixa densidade/tara histórica, não valida prazo e não implementa M7/TOCTOU. | `reagentes.test.ts` | Duas retiradas concorrentes, revogação e retry |
| IMP-DEV-001 | Devolução | Devolução e consumo metrológico | RF14–15; S7 Q06; S8 UI-07/UI-17/UI-18 | M4, M6, M7 | `reagentes.ts: registrarDevolucao`; modal | SIM | DIVERGENTE | Usa margem fixa de 2%, `max(0)` e densidade corrente; não preserva snapshot metrológico, dupla digitação, esgotamento explícito ou consumo pendente; I/O externo ocorre dentro da transação. | `reagentes.test.ts` | Matriz Q06, tara real, anomalia e resolução |
| IMP-MET-001 | Metrologia | Pendência e resolução metrológica tipada | S7 M6; S8 UI-17/UI-18; S9 HQ-M2-005 | M6 | nenhum endpoint/estado correspondente | SIM | NÃO IMPLEMENTADO | Não existem pendência quantitativa nem rotas `REPETIR_PESAGEM`, `CONFIRMAR_ESGOTAMENTO` e `RECALIBRAR_TARA_REAL`. | nenhum | Máquina M6 + concorrência e histórico |
| IMP-MET-002 | Metrologia | Pesagem de rotina/ajuste | RF15; S7 Q06; S8 UI-06/ALM-03 | M6, M7 | somente campos de peso em devolução | SIM | NÃO IMPLEMENTADO | Não existe operação funcional de nova pesagem com motivo, diferença, disponibilidade, tara e histórico próprios. | nenhum | Contrato de pesagem e rejeição de tara incompatível |
| IMP-M5-001 | Extravio | Registrar extravio | S7 M5; S8 UI-16; S9 ALM-06 | M5, M7, M9 | nenhum símbolo/endpoint | SIM | NÃO IMPLEMENTADO | Ausentes localização `EXTRAVIADO`, encerramento extraordinário do empréstimo e histórico atômico. | nenhum | Transições M5, empréstimo ativo e retry |
| IMP-M5-002 | Reencontro | Registrar reencontro | S7 M5; S8 UI-16; S9 ALM-06 | M5, M6 | nenhum símbolo/endpoint | SIM | NÃO IMPLEMENTADO | Ausentes estados constatados, restrições físicas e entrada obrigatória em quarentena. | nenhum | Matriz de estados constatados e casos quantitativos |
| IMP-M5-003 | Quarentena | Entrada, decisão de saída e autorização de descarte | S7 regra geral/M5; S8 UI-14 | M5, M7 | booleanos em cadastro/abertura/devolução | SIM | DIVERGENTE | Há bloqueio de retirada, mas motivo mínimo não é imposto e não existem operações de entrada/saída nem `Pendencias_Descarte_Frasco`; devolução pode limpar quarentena diretamente. | `reagentes.test.ts` | Máquina M5 completa e trilha imutável |
| IMP-TERM-001 | Frascos | Vazio, quebra e descarte terminal | RF15; S7; S8 UI-07; S9 ALM-06 | M2, M5, M6 | nenhum endpoint; relatórios apenas leem tipos históricos | SIM | NÃO IMPLEMENTADO | Não há operações funcionais, encerramento ordenado de empréstimo, confirmação física ou retenção terminal. | nenhum | Estados terminais + metrologia + auditoria |
| IMP-IDEM-001 | Idempotência | Receipt e retry universal de mutações críticas | S7 M7; S10.10 | M7 | `usuarios.ts: Operacoes` somente para papel | SIM | DIVERGENTE | Cobertura restrita a papéis; hash é `JSON.stringify(dados)` e não canonicalização normativa; `idOperacao` opcional gera UUID novo, e demais domínios não possuem receipt. | integração de usuários | Vetores M7 em todas as mutações críticas |
| IMP-STOCK-001 | Estoque | Estoque atual e aptidão única | S6 estoque atual; S7 M8; S8 UI-04/UI-19 | M8 | frontend agrega consultas a lotes/frascos | SIM | DIVERGENTE | Não há endpoint agregado protegido; UI não aplica integralmente localização, pendência metrológica e saldo desconhecido, e expõe documentos completos. | nenhum | Aptidão M8 e segregação g/mL/desconhecido |
| IMP-STOCK-002 | Escassez | Configuração e alerta de escassez | S6; S7 M8; S8 UI-19; S10.7 | M8, M13 | campo legado `qtd_em_que_e_considerado_escasso` no resumo | SIM | NÃO IMPLEMENTADO | Não há configuração por almox/resumo/especificação, comparação estrita, job nem deduplicação diária por gestor vinculado. | nenhum | Limite igual/menor, silenciado e fan-out |
| IMP-CACHE-001 | Materializações | Cache do dashboard, geração e rate limit | S6; S7 M8; S11 | M8, M9 | nenhuma coleção/função `Sistema_Cache_Dashboard` ou rate limit | SIM | NÃO IMPLEMENTADO | Ausentes cache de 30 s, geração/invalidação atômica e limite 5/min/UID. | nenhum | Corrida invalidação/publicação e escopo por UID |
| IMP-MVIEW-001 | Materializações | Resumos diários/mensais e lote materializado | S5–S6; S10.7 | M8, M10 | consumidores em relatórios; nenhum produtor agendado/trigger | SIM | NÃO IMPLEMENTADO | As coleções são referenciadas em testes/documentação, mas não há produção funcional das materializações. | `relatorios.test.ts` (asserções textuais) | Trigger/job, reprocessamento e data-alvo |

### Patrimônio

| ID | Domínio | Feature | Fonte normativa | Milestone(s) | Implementação encontrada | Auditado | Estado | Divergência / evidência | Testes existentes relacionados | Teste futuro necessário |
|---|---|---|---|---|---|---|---|---|---|---|
| IMP-PAT-001 | Patrimônio | Cadastro/manutenção de resumo e bem | RF06; S5; S7 M10; S8 UI-09; S9 PAT-01 | M10 | aprovação via callable; telas patrimoniais | SIM | DIVERGENTE | Não há mutação canônica completa; faltam versão inicial/incremento, enums/limites e foto validada; Rules permitem escrita direta fora das callables. | `patrimonio.test.ts` | Lifecycle M10 + versão otimista + M9 |
| IMP-PAT-002 | Patrimônio | Plaqueta canônica e unicidade permanente | S5; S7 M10; S8 UI-09 | M10 | consulta prévia + lock textual em `patrimonio.ts` | SIM | DIVERGENTE | Não normaliza trim/uppercase, não cria `Chaves_Unicas`, não relê reserva permanente na aprovação e baixa poderia reutilizar plaqueta. | `patrimonio.test.ts` | Corrida adição/aprovação e não reuso após baixa |
| IMP-PAT-003 | Requisições | Requisição de adição e lock | RF08/RF10; S7 M10; S8 UI-09; S9 PRO-10/PAT-03 | M7, M10 | `criarRequisicaoAdicaoBem` | SIM | DIVERGENTE | Lock não tem tipo/requisição/chave normalizada; foto não é validada; pré-checagem fica fora da transação; sem versão/idempotência. | `patrimonio.test.ts` | Duas propostas equivalentes e lock íntegro |
| IMP-PAT-004 | Requisições | Requisição de edição, versão e reclassificação | RF09–11; S5/S7 M10; S8 UI-09 | M7, M10 | `criar/responderRequisicaoEdicaoBem` | SIM | DIVERGENTE | Não guarda `versao_origem`; aprovação aceita lock ausente, altera `nome_equipamento` diretamente e não reclassifica o resumo nem gera versão/histórico. | `patrimonio.test.ts` | Conflito de versão, lock ausente e reclassificação |
| IMP-PAT-005 | Patrimônio | Histórico auditável e fan-out derivado | RF07/RF25; S5/S7 M10 | M10 | triggers de nome/local; coleção raiz esperada por UI/relatório | SIM | DIVERGENTE | Fan-out existe, mas cadastro/edição/baixa não produzem exatamente um evento no caminho normativo; modelo raiz/subcoleção é inconsistente. | `patrimonio.test.ts` (notificações, não histórico) | Evento único por mutação; fan-out sem evento/versão |
| IMP-PAT-006 | Patrimônio | Baixa patrimonial comprovada | RF12; S7 M10; S8 UI-09; S9 PAT-04 | M7, M9, M10 | campo/status na UI; pasta em `storage.rules` | SIM | NÃO IMPLEMENTADO | Não existe callable `registrarBaixaBemPatrimonial`; UI propõe status por edição comum. Falta rito Inservível→Baixa, PDF verificado/fixado, versão e histórico. | Storage Rules (upload isolado) | Rito completo, binário, geração e terminalidade |

### Turmas, posts e roteiros

| ID | Domínio | Feature | Fonte normativa | Milestone(s) | Implementação encontrada | Auditado | Estado | Divergência / evidência | Testes existentes relacionados | Teste futuro necessário |
|---|---|---|---|---|---|---|---|---|---|---|
| IMP-ACAD-001 | Turmas | Criar turma e código único | RF17; S7 M11; S8 UI-10; S9 PRO-01 | M7, M9, M11 | `turmas.ts: criarTurma`; modal | SIM | DIVERGENTE | Código aleatório é consultado, mas não reservado por chave determinística; matéria/nome vêm do payload; M9/idempotência não são revalidados no commit. | `turmas.test.ts` | Colisão concorrente, ownership e retry |
| IMP-ACAD-002 | Matrícula | Ingresso por código e capacidade | RF18; RN-TUR-01; S9 ALU-01 | M7, M9, M11 | `ingressarEmTurmaPorCodigo` | SIM | DIVERGENTE | Transação protege contador, porém usa claim antiga, grava e-mail/matrícula no vínculo lido por colegas, não implementa exceção nominal e não é idempotente. | `turmas.test.ts` | Última vaga, replay, projeção mínima e remoção prévia |
| IMP-ACAD-003 | Matrícula | Inclusão e remoção pelo professor | S7 M11; S8 UI-10; S9 PRO-04 | M7, M9, M11 | `adicionarAlunoExistenteTurma`; `removerAlunoTurma` | SIM | DIVERGENTE | Espelho/histórico existem, mas dados sensíveis são copiados; falta contrato idempotente e revalidação persistida; operações concorrentes podem divergir contador/espelho. | `turmas.test.ts` | Inclusão/remoção concorrente e replay |
| IMP-ACAD-004 | Turmas | Arquivar e desarquivar | S7 M11/Q08; S8 UI-10; S9 PRO-02 | M7, M11, M13 | `arquivarTurma` | SIM | DIVERGENTE | Só arquiva; não desarquiva, não emite fan-out obrigatório e Rules ainda permitem update direto do professor. | `turmas.test.ts` | Duas direções, turma read-only e notificações |
| IMP-ACAD-005 | Convites | Criar/reenviar convite global ou de turma | RF18; S7 M11; S8 UI-10; S9 PRO-03 | M7, M11 | `convidarAluno` | SIM | DIVERGENTE | Grava e-mail em claro e não cria token/hash; ownership/status/capacidade não são validados; busca de matrícula considera convites não pendentes; sem reenvio/idempotência. | `turmas.test.ts` | Dois convites simultâneos, expiração e privacidade |
| IMP-ACAD-006 | Convites | Aceitar convite e concluir vínculo | S7 M11; S9 “Aceitação de convite”/ALU-01 | M7, M9, M11 | nenhum endpoint de aceite | SIM | NÃO IMPLEMENTADO | Ausente aceite por token/hash, matrícula, capacidade e criação atômica de vínculo/espelho/evento. | nenhum | Aceite, expiração, replay e última vaga |
| IMP-POST-001 | Posts | Criar/editar Post e anexar roteiro | RF19/RF23; S7 M12.1/12.2; S8 UI-11 | M7, M9, M11, M12 | `posts.ts: criarPost`; `FeedTurma.tsx` | SIM | DIVERGENTE | Não rejeita turma arquivada, não valida roteiro/publicabilidade/ACL/geração, não há edição/histórico/idempotência ou fan-out. | nenhum específico | Create/edit com vínculo, anexo e retry |
| IMP-POST-002 | Posts | Remoção lógica e histórico | RF25; S7 M12.1; S8 UI-11 | M12.1 | `posts.ts: excluirPost` | SIM | DIVERGENTE | Executa `tx.delete`; norma exige remoção lógica, preservação de documento/anexo e histórico imutável. | nenhum | Visibilidade por ator e preservação histórica |
| IMP-POST-003 | Comentários | Criar/editar comentário | RF20; S7 M12.1; S8 UI-11 | M7, M9, M11, M12.1 | `adicionarComentario`; leitura direta no frontend | SIM | DIVERGENTE | Não verifica Post/turma arquivada nem limites máximos; não há edição/histórico/idempotência/notificação; Rules/UI conflitam com endpoint filtrado obrigatório. | nenhum | Autoria, vínculo removido, arquivo e fan-out |
| IMP-POST-004 | Moderação | Moderar Post/comentário e máscara | S7 M12.1 Q10/Q11/Q13; S11 | M12.1 | exclusão física de comentário/Post | SIM | NÃO IMPLEMENTADO | Não há operação de moderação com motivo/histórico nem `listarComentariosPost` com projeções por autor/colega/auditor. | nenhum | Matriz de máscaras, Q13 e turma arquivada |
| IMP-ROT-001 | Roteiros/Storage | Upload, validação binária e publicabilidade | RF21; S7 M12.2; S8 UI-11; S11 | M7, M9, M12.2 | upload direto em `ProfessorModais.tsx`; `registrarRoteiro` aceita URL | SIM | DIVERGENTE | Frontend também grava Firestore diretamente; backend não inspeciona objeto/bytes/dono/tamanho/geração e não implementa PROVISÓRIO→VALIDADO→PUBLICÁVEL. | `roteiros.test.ts`; Storage Rules | Bytes PDF, geração imutável e reconciliação de órfão |
| IMP-ROT-002 | Compartilhamento | Compartilhar/revogar roteiro por UID | RF22; S7 M12.2 Q09; S9 PRO-06 | M7, M9, M12.2 | `compartilhar/descompartilharRoteiro` | SIM | DIVERGENTE | ACL é array de e-mails, sem relação única por UID/professor ativo/publicável; sem M7; schema e Rules esperam campos incompatíveis. | `roteiros.test.ts` | Concorrência, revogação e professor ativo |
| IMP-ROT-003 | Roteiros/Posts | Snapshot de anexo e histórico | RF23; RN-M13-08; S7 M12.2 | M12, M13 | apenas `id_roteiro_experimento` no Post | SIM | DIVERGENTE | Não persiste snapshot canônico com nome/tamanho/path/geração nem histórico de troca/desvínculo. | nenhum | Anexar/trocar/desvincular e remover Post |
| IMP-ROT-004 | Download | Emissão de URL curta autorizada | S7 M12.2; S8 UI-11; S9 downloads | M9, M11, M12.2, M13 | `pdf_url/file_url` permanente e `getDownloadURL` no cliente | SIM | NÃO IMPLEMENTADO | Não há endpoint que revalide proprietário/compartilhamento/Post/vínculo/Q13 e emita URL temporária ligada à geração. | nenhum | Professor, aluno/ex-aluno, Post removido, Q13 |
| IMP-ROT-005 | Storage | ACL de roteiro e imutabilidade do objeto | S7 M12.2; S11; `storage.rules` | M9, M12.2 | `storage.rules: /roteiros/**` | SIM | DIVERGENTE | Leitura é liberada a todo autenticado; update/delete dependem de metadata/claim, sem estado persistido/geração e permitem superfície incompatível com imutabilidade. | `security/storage.rules.test.ts` | ACL por recurso, token obsoleto e sobrescrita |

### Notificações, relatórios, etiquetas, Rules e UI

| ID | Domínio | Feature | Fonte normativa | Milestone(s) | Implementação encontrada | Auditado | Estado | Divergência / evidência | Testes existentes relacionados | Teste futuro necessário |
|---|---|---|---|---|---|---|---|---|---|---|
| IMP-NOTIF-001 | Notificações | Caixa única e sino por UID | S7 RN-M13-01; S8 UI-12; S9 M13 | M13 | subcoleção `Usuarios/uid/Notificacoes`; placeholders de UI | SIM | DIVERGENTE | Modelo de caminho existe, mas não há caixa funcional unificada; schema exclui Chefe e usa enum divergente; frontend não lista/navega/revalida alvos. | `notificacoes.test.ts` (marcação) | Caixa multi-role, Bolsista/Chefe e ACL atual |
| IMP-NOTIF-002 | Notificações | Marcar uma como lida | RN-M13-02 | M9, M13 | `marcarNotificacaoComoLida` | SIM | DIVERGENTE | Idempotência preserva instante, mas não valida usuário persistido ativo/versão; Rules permitem update/delete direto, contrariando server-owned. | `notificacoes.test.ts` | Dono/terceiro, token obsoleto e instante estável |
| IMP-NOTIF-003 | Notificações | Limpar todas por corte paginado | RN-M13-02; S9 M13 | M7, M13 | nenhum endpoint | SIM | NÃO IMPLEMENTADO | Ausentes paginação reentrante, corte estável e retry sem DELETE. | nenhum | Falha parcial, emissão concorrente e retomada |
| IMP-NOTIF-004 | Notificações | Expiração e conjunto ativo | RN-M13-03 | M13 | emissor fixa 30 dias para tudo | SIM | DIVERGENTE | Aplica prazo arbitrário universal; escassez deveria ter `null`; não há processamento/filtro que preserve fato expirado fora do ativo. | nenhum | Null, vencido, lido e janelas de devolução |
| IMP-NOTIF-005 | Notificações | Emissão, fan-out e deduplicação | RN-M13-05–07; obrigações V1 | M7, M8, M11–M13 | `adicionarNotificacaoTx` usado em patrimônio/roteiro/matrícula | SIM | DIVERGENTE | IDs aleatórios duplicam retries; enums/contexto divergem; faltam POST, COMENTARIO, jobs, arquivamento e autoatendimento; payload aceita mensagem livre. | roteiros/patrimônio/turmas (parcial) | Cada emissor V1, dedup por destinatário e erro não-code-6 |
| IMP-REP-001 | Relatórios | Relatório de almoxarifado por período | RF24; S6; S7 limites; S8 UI-12; S9 ALM-08 | M8, M9 | `relatorios.ts: gerarRelatorioAlmoxarifado/Personalizado` | SIM | DIVERGENTE | Lê fatos crus, caminhos de especificação inconsistentes, não usa materializações e autoriza por claim/vínculo fora de transação; hash inclui `Date.now()` e não é assinatura canônica reproduzível. | `relatorios.test.ts` (majoritariamente textual) | Escopo, 31 dias, unidades, N+1 e hash estável |
| IMP-REP-002 | Relatórios | Relatórios patrimoniais | RF16/RF24; S6; S8 UI-12; S9 PAT-04/05 | M9, M10 | `gerarRelatorioBensPredio/Personalizado`; modal | SIM | DIVERGENTE | Não usa snapshots/atividade materializada, histórico esperado diverge do modelo, e filtros/escopo/baixa comprovada são incompletos. | `relatorios.test.ts` | Mensal, inservíveis, comprovante e autorização |
| IMP-REP-003 | Relatórios | Transporte/URL temporária de relatório | S10.1/10.9/10.10; S8 UI-12 | M9 | callables retornam PDF inteiro em base64 | SIM | DIVERGENTE | Contrato prevê artefato/URL assinada curta e limites operacionais; implementação retorna buffer base64 síncrono e não aplica rate limit/App Check. | `relatorios.test.ts` textual contradiz o código | Tamanho, timeout, URL expirada e falha Storage |
| IMP-LABEL-001 | Etiquetas | Etiquetas virgens | S8 UI-08; S10.1/10.10; S9 ALM-07 | M7, M9 | `gerarPdfEtiquetasVirgens`; modal | SIM | DIVERGENTE | Gera grade/limite, mas não revalida vínculo de almox, idempotência ou origem segura do intervalo; registro não comprova impressão, e resposta é base64. | `relatorios.test.ts` textual | Geometria, offset, limites, origem e retry |
| IMP-LABEL-002 | Etiquetas | Segunda via e ficha por frasco | S7 reimpressão; S8 UI-08 | M7, M9 | `gerarPdfReimpressaoFrascos` | SIM | DIVERGENTE | Não valida almox de cada frasco, permite resultado parcial ao ignorar IDs ausentes, grava auditoria antes de concluir PDF e depende de campos inconsistentes. | `relatorios.test.ts` textual | Falha de um item, escopo misto, 10 eventos e retry |
| IMP-RULES-001 | Security Rules | Autoridade de usuário, versão e papéis | S7 M9; S11 | M9 | `firestore.rules`: `hasCurrentUser`, `hasRole` e matches das coleções de papel | SIM | NÃO DIVERGENTE | Exige usuário persistido ativo, versão inteira não negativa e corrente, claim de papel fechado e documento de papel com UID correspondente; claims antigas/inventadas falham fechado e a leitura de papéis respeita a superfície normativa. | `security/m9-authority.rules.test.ts` (`TEST-RULES-M9-001`–`014`); regressão Rules | Nenhum para o escopo auditado; manter regressão ao alterar M9 |
| IMP-RULES-002 | Security Rules | Escopo de reagentes/patrimônio e server-owned | S7 M9; S11 | M8–M10 | matches de domínio em `firestore.rules` | SIM | DIVERGENTE | Frasco/lote/contador são amplos; patrimônio e requisições permitem escrita direta; empréstimo ignora retirante/almox; coleções M8 e projeção de descarte nem aparecem. | Rules existentes validam permissões antigas | Matriz por coleção, vínculo e negação de writes |
| IMP-RULES-003 | Security Rules | ACL acadêmica, moderação e notificações | S7 M11–M13; S11 | M11–M13 | matches `Turma`, subcoleções e notificações | SIM | DIVERGENTE | Qualquer autenticado lê Turmas/Posts/Alunos; professor pode update direto; comentários são legíveis diretamente; destinatário pode update/delete notificação. | Rules existentes codificam alvo antigo | Dono/membro/ex-membro, máscara e server-owned |
| IMP-RULES-004 | Storage Rules | Ownership, tipo, tamanho e acesso por recurso | S7 M9/M12.2; S11 | M9, M10, M12.2 | `storage.rules` | SIM | DIVERGENTE | Todas as pastas permitem leitura a qualquer autenticado; claims não têm versão/estado; update/delete não validam objeto vinculado/imutabilidade; comprovante pode ser removido. | `security/storage.rules.test.ts` | Leitura por recurso, binário, geração e retenção |
| IMP-INDEX-001 | Firestore | Índices compostos obrigatórios | S5 índices; consultas S6/S8/S11 | M8–M13 | `firebase.json` sem configuração de índices; arquivo ausente | SIM | NÃO IMPLEMENTADO | Não existe `firestore.indexes.json` versionado/configurado para os índices normativos e queries existentes. | nenhum | Deploy emulator/index query smoke |
| IMP-UI-001 | Fluxos de UI | Reagentes e movimentações UI-04–08/14–19 | S8; S9 ALM-01–08/PRO-09/ALU-04 | M2–M8 | páginas/modais de reagentes | SIM | DIVERGENTE | Cadastro/retirada/devolução parciais; faltam catálogo versionado, pesagem, correção, M5/M6/M8, telas/rotas laterais apontam para páginas inexistentes e Aluno não recebe catálogo no header. | nenhum frontend | E2E por fluxo e estados de erro/carregamento |
| IMP-UI-002 | Fluxos de UI | Patrimônio UI-04/UI-09/UI-12 | S8; S9 PRO-10/PAT-01–05 | M10 | páginas/modal patrimônio | SIM | DIVERGENTE | UI usa callables para requisições, mas mistura baixa com edição de status, não cobre histórico/versão/foto comprovada e usa rotas laterais diferentes das páginas existentes. | nenhum frontend | E2E solicitação→decisão→histórico/baixa |
| IMP-UI-003 | Fluxos de UI | Acadêmico UI-10/UI-11 | S8; S9 PRO-01–08/ALU-01–03 | M11–M12 | páginas/componentes de turmas | SIM | DIVERGENTE | Há turmas/feed/modais, mas upload grava direto, comentários leem direto, faltam aceite, edição/moderação, ACL de roteiro/download e estados arquivados completos. | nenhum frontend | E2E convite/ingresso/Post/comentário/roteiro |
| IMP-UI-004 | Fluxos de UI | Notificações e dashboard UI-12/UI-13/UI-19 | S6/S8; S9 M13/COM-01 | M8, M13 | botões/placeholders e dashboards por papel | SIM | NÃO IMPLEMENTADO | Não há sino unificado, limpar tudo, deep link revalidado, cache protegido/estado desatualizado ou seletor de papel. | nenhum frontend | E2E caixa multi-role, cache e navegação negada |

## Achados de maior impacto

### Segurança e autorização

- As callables em geral autorizam pelo JWT antes da transação; M9 exige conta, versão, papel persistido, escopo/ownership e estado relidos na unidade de commit.
- `firestore.rules` e `storage.rules` implementam a política anterior: há leituras amplas e escritas diretas em patrimônio/turma/notificações que contradizem a Seção 11 e permitem contornar os backends server-owned.
- Diretórios de pessoas e vínculos acadêmicos expõem e-mail/matrícula onde a norma exige projeção mínima.

### Integridade, concorrência e dados

- Apenas mutações de papel têm uma forma parcial de receipt; M7 não cobre os demais fluxos críticos e a canonicalização normativa não é usada.
- Plaquetas, códigos de turma, lotes e locks não possuem todas as reservas/chaves canônicas exigidas; `Locks_Requisicao_Patrimonio` também é limpo por idade embora pendências não expirem por idade.
- Caminhos de Especificação e Histórico variam entre raiz e subcoleção, produzindo referências incompatíveis entre cadastro, devolução, relatório e Rules.
- Cadastro já aberto e devolução divergem materialmente do modelo metrológico fechado em M6.

### Ausência funcional

- Não há operações M5 completas, resolução M6, cache/escassez/materializações M8, baixa M10, aceite de convite M11, moderação M12.1, emissão de URL M12.2 ou “Limpar tudo” M13.
- Não há arquivo/configuração de índices compostos nem produtores dos resumos materializados consumidos conceitualmente por relatórios.

### Frontend e UX

- O frontend implementa partes dos painéis, mas ainda grava alguns recursos diretamente, depende das ACLs antigas e não possui vários fluxos normativos UI-12–UI-19.
- Não existe alternância real de papel ativo nem descarte coordenado do escopo anterior; algumas rotas exibidas no menu não têm página correspondente.

## Rastreabilidade e verificação de cobertura

### RF01–RF25

| Requisitos | Linhas correspondentes | Cobertura |
|---|---|---|
| RF01–RF05 | IMP-AUTH-001–004; IMP-ROLE-001–004 | Mapeados |
| RF06–RF12 | IMP-PAT-001–006; IMP-REP-002 | Mapeados |
| RF13–RF16 | IMP-BASE-001; IMP-REAG-001–002; IMP-FRASC-001–003; IMP-RET-001; IMP-DEV-001; IMP-UI-001/002 | Mapeados |
| RF17–RF20 | IMP-ACAD-001–006; IMP-POST-001–004 | Mapeados |
| RF21–RF23 | IMP-ROT-001–005; IMP-POST-001 | Mapeados |
| RF24–RF25 | IMP-REP-001–003; IMP-PAT-005; IMP-POST-002/004 | Mapeados |

### Regras, entidades, materializações e tecnologia

| Fonte | Cobertura na matriz | Lacuna de cobertura |
|---|---|---|
| S5 — entidades/documentos, denormalizações, contador, índices | BASE, REAG/FRASC, PAT, ACAD, ROT, NOTIF, RULES e INDEX | Nenhuma fonte material omitida; campos muito finos foram agrupados na feature que os grava. |
| S6 — materializações, estoque e cache | IMP-STOCK-001/002; IMP-CACHE-001; IMP-MVIEW-001; relatórios | Nenhuma. |
| S7 — regras gerais, M9–M13, RN-ROLE e RN-TUR | ROLE; M5/MET/IDEM/STOCK; PAT; ACAD; POST/ROT; NOTIF | RN-ROLE-01–16 agrupadas por concessão/revogação/autorização; RN-M13-01–08 distribuídas em NOTIF/ROT. |
| S8 — UI-01–UI-19 | AUTH/ROLE/BASE e IMP-UI-001–004, com features de domínio | Nenhuma UI omitida; UI-14–19 aparecem nas linhas M5/MET/STOCK/UI. |
| S9 — fluxos e casos concorrentes | Linhas AUTH a UI; classes de teste futuro explicitam casos | Todos os grupos COM/CHE/MAT/PRO/ALU/BOL/ALM/PAT e blocos M11–M13 possuem correspondência. |
| S10 — confiança no servidor, jobs, relatórios, etiquetas | ROLE/RULES; MVIEW/STOCK; REP/LABEL | Nenhuma. |
| S11 — Firestore/Storage Rules | IMP-RULES-001–004 e linhas de domínio afetadas | Nenhum grupo relevante omitido. |

### Milestones M0–M13

| Milestone | Impacto de implementação rastreado |
|---|---|
| M0 | Infraestrutura formal é oráculo, sem feature de produto isolada. |
| M1–M4 | Catálogo, frasco, empréstimo, retirada e devolução: IMP-REAG-001/002, IMP-FRASC-001–003, IMP-RET-001, IMP-DEV-001. |
| M5–M6 | Extravio, reencontro, quarentena e metrologia: IMP-M5-001–003, IMP-MET-001/002. |
| M7 | IMP-IDEM-001 e todas as mutações críticas que o referenciam. |
| M8 | IMP-STOCK-001/002, IMP-CACHE-001, IMP-MVIEW-001. |
| M9 | IMP-ROLE-001–004, IMP-RULES-001–004 e autorização de cada domínio. |
| M10 | IMP-PAT-001–006. |
| M11 | IMP-ACAD-001–006. |
| M12.1 | IMP-POST-001–004. |
| M12.2/M12 | IMP-ROT-001–005 e IMP-POST-001. |
| M13 | IMP-NOTIF-001–005, IMP-ROT-003/004 e IMP-UI-004. |

### Fluxos da Seção 9

| Fluxos | Features correspondentes | Cobertura |
|---|---|---|
| COM-01 | IMP-AUTH-001–004 | Mapeado |
| CHE-01–05; MAT-01 | IMP-ROLE-001–004; IMP-BASE-001–003; PAT/REP/LABEL | Mapeados |
| PRO-01–10 | ACAD, POST, ROT, PAT-003/004 e REP/UI | Mapeados |
| ALU-01–04; BOL-01 | AUTH, ACAD-002/006, POST-003, ROT-004, NOTIF/UI | Mapeados |
| ALM-01–08 | REAG/FRASC/RET/DEV/M5/MET/STOCK/REP/LABEL/UI | Mapeados |
| PAT-01–05 | PAT-001–006; REP-002/003; UI-002 | Mapeados |
| Casos concorrentes M11 | ACAD-002/003/005/006 | Mapeados |
| Fluxos M12.1/M12.2 | POST-001–004; ROT-001–005 | Mapeados |
| Fluxos M13 | NOTIF-001–005; UI-004 | Mapeados |

Não foram encontrados conflitos entre fontes normativas correntes que exigissem `POTENCIAL_CONFLITO_NORMATIVO`. Não há linha com `Auditado = NÃO` e não há lacuna conhecida de cobertura nos agrupamentos exigidos. A ausência de uma linha `NÃO DIVERGENTE` é resultado da comparação obrigação por obrigação, não falta de auditoria.

## Fora do escopo V1 (Seção 12)

Não foram contabilizados como `NÃO IMPLEMENTADO`: evolução de autorização pós-V1, modelo operacional de gases, horários de turma, lotação física de professores, edição de Resumo/Especificação, correção auditável de validade, integração direta com balança e correção metrológica futura. A ausência dessas propostas não afeta os totais da tabela principal.

## Notas de evidência

1. Testes como `relatorios.test.ts` contêm várias verificações textuais de fonte; eles não demonstram o comportamento alegado. Por exemplo, o código retorna base64 embora o teste procure texto sobre URL assinada.
2. Os testes de Rules confirmam permissões do alvo anterior (por exemplo, qualquer autenticado listar turma/frasco e gestor escrever patrimônio); por isso sua aprovação não provaria a Seção 11 corrente.
3. Os caminhos foram registrados sem números de linha para preservar estabilidade. Símbolos foram incluídos quando distinguem a evidência relevante.

## Verificações estáticas executadas

Executadas uma vez em 26/09/2026, sem correções:

| Escopo | Comando | Resultado |
|---|---|---|
| Frontend | `npm run lint` | Falhou: 79 erros e 29 avisos, principalmente `no-explicit-any`, efeitos com atualização síncrona de estado e dependências de hooks. |
| Frontend | `npx --no-install tsc --noEmit` | Aprovado. |
| Backend | `npm run lint` | Não iniciou: `eslint: command not found` no ambiente/dependências locais. |
| Backend | `npm run build` | Aprovado; os artefatos `functions/lib/**` gerados pelo comando foram restaurados e não integram o diff. |

Esses resultados informam a auditabilidade da base, mas compilação ou lint não substituem a comparação normativa de nenhuma linha.
