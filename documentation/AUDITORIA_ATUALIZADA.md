# Auditoria de alinhamento LCQUI

Revisão de 13/09/2026 (rodada de realinhamento por blocos A–D). Inclui todos os achados da revisão anterior (11/09/2026) e os novos achados desta rodada, por inspeção estática dos arquivos `.tex`, `.md` e do código do repositório. Não representa auditoria de produção nem execução de testes.

## Resultado geral

A especificação apresenta consistência interna elevada no modelo 3FN (Seção 4) e no dicionário físico (Seção 5.9). Os principais focos de risco residem em: (1) divergências entre os exemplos de código da Seção 10 e as resoluções de Q06 do `MODIFICACOES_CONSOLIDADAS_LCQUI.md`; (2) campos especificados em `MODIFICACOES_CONSOLIDADAS_LCQUI.md` ausentes do modelo 3FN e do dicionário 5.9; (3) coleções de controle de concorrência (`Controle_Papeis/singleton`, `Operacoes`, `Chaves_Unicas`) descritas no dicionário mas ausentes das Security Rules; (4) achados de caminho (AUD-07/08) ainda não migrados no código. Todos os 25 RF e 15 RN-ROLE permanecem PARCIAL.

## Achados verificáveis — revisão anterior (11/09/2026)

| ID / prioridade | Evidência local | Diferença para a especificação | Critério de correção |
|---|---|---|---|
| AUD-01 / alta | `firestore.rules`, matches Turma, Alunos, Posts e Comentarios | Leitura aceita qualquer autenticado; UI-10/11 exige vínculo/propriedade | Testes de Rules negam turma de terceiro e permitem membros atuais |
| AUD-02 / alta | `firestore.rules`, Bem_Patrimonial, requisições, locks e Usuarios | Escritas diretas permitidas a determinados papéis podem contornar validação/auditoria das Functions | Negar mutações diretas de domínio e testar caminho servidor |
| AUD-03 / alta | `firestore.rules`, Emprestimo_Reagente e Historico_Frasco_Reagente | Qualquer autenticado pode ler movimentações; catálogo não requer identidade do retirante | Limitar por retirante/almoxarifado/chefia e fornecer projeção de disponibilidade |
| AUD-04 / alta | `storage.rules`, roteiros e baixas_patrimoniais | Leitura por qualquer autenticado e exclusão de comprovantes pelo proprietário autorizado | Validar vínculo de roteiro e preservar documento de baixa referenciado |
| AUD-05 / alta | `functions/src/auth.ts`; `frontend/src/contexts/AuthContext.tsx` | Claims são lidas do token; frontend considera ativo todo usuário com roles. Atualizar claims não invalida por si só token emitido | Controle de conta ativa/versão, sincronização recuperável e teste de token antigo |
| AUD-06 / alta | `functions/src/usuarios.ts`, concessão/revogação | Operações em vários passos de Firestore/Auth; não demonstram atomicidade global de último responsável | Transação com controles compartilhados e reconciliação Auth, testes concorrentes |
| AUD-07 / alta | `functions/src/reagentes_base.ts` cria em Resumo_Reagente/id/Especificacoes; `functions/src/relatorios.ts` busca Especificacao_Reagente raiz | Caminhos incompatíveis; Rules só descrevem raiz | Migrar/compatibilizar leitores, escritor e Rules ao caminho canônico, sem cópia divergente |
| AUD-08 / média | `functions/src/patrimonio.ts`; `functions/src/relatorios.ts` | Histórico patrimonial raiz difere do alvo Bem_Patrimonial/id/Historico | Migração explícita e consulta collection-group com escopo/índices, preservando eventos |
| AUD-09 / alta | `functions/src/patrimonio.ts`, limparLocksOrfaos | Limpeza de lock exige verificar requisição vinculada, não somente idade | Pendência antiga mantém lock; órfão real pode ser reconciliado |
| AUD-10 / média | `functions/src/schemas/usuarios.schema.ts`, turmas.schema.ts, posts.schema.ts | Campos condicionais/limites do LaTeX não são todos validados; matrícula e justificativa merecem revisão. `reagentes.ts` admite ganho de 2% e incrementa medida_usada com volume, enquanto o modelo a define em g; reconciliar Q06 e unidades | Schemas compartilhados restrições UI/backend; erro por campo e testes negativos |
| AUD-11 / média | `functions/src/turmas.ts` | Existem ingresso, convite, adição e arquivamento; presença desses endpoints não comprova aceitação completa nem propagação integral dos espelhos | E2E de convite, capacidade/exceção, remoção, arquivo/restauração e token atualizado |
| AUD-12 / média | `functions/src/roteiros.ts` e `posts.ts` | Relação de compartilhamento, autoria, acesso após revogação e política de exclusão precisam fechamento | Resolver Q09/Q11 e testar download/anexo permitido e negado |
| AUD-13 / média | `functions/src/relatorios.ts`; `frontend/src/lib/pdf.ts` | Transporte atual é base64, enquanto exemplos antigos do LaTeX usavam Storage | Documentação atual distingue transporte; testar memória, limites, filtros e unidades |
| AUD-14 / média | `frontend/src/components/reagentes/ModalEtiquetasReagentes.tsx`; `functions/src/relatorios.ts` | Código de etiquetas existe; planejamento de protótipo não prova conformidade física/escopo de toda a aplicação | Casos de offset, limite, deduplicação, escopo e leitura real do Code 128 |
| AUD-15 / média | Seção 6 e funções exportadas em `functions/src/index.ts` | Materializações documentadas não são, só por isso, jobs implantados/validados | Inventário de produtores, idempotência, reconciliação e cobertura por período |
| AUD-16 / média | `flake.nix`; `COMPILACAO_NIX_LCQUI.md` | Flake atual não fornece TeX Live apesar da premissa do guia antigo | Instrução de compilação documental corrigida, saída isolada |

## Achados novos — Bloco A (Química e Almoxarifado)

| ID / prioridade | Evidência local | Diferença para a especificação | Critério de correção |
|---|---|---|---|
| AUD-17 / **crítica** | `Section-10`, listagem `registrarDevolucao`, linha ~498–502 | Fórmula de tolerância aplica margem plana de 2% (`peso_saida * 1.02`) para todos os casos. `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §2.2 define fórmula híbrida: `max(1g, 0,5% × peso_saida)` para não-higroscópicos e `max(2g, 2% × peso_saida)` para higroscópicos. O campo `eh_higroscopico` não é consultado no pseudocódigo da Seção 10. | Atualizar pseudocódigo da Seção 10 para refletir a fórmula aprovada em Q06; campo `eh_higroscopico` deve vir da cadeia Frasco→Especificacao→Resumo_Reagente; incluir tipo de evento `AJUSTE/ganho_massa_higroscopia` no histórico quando `peso_retorno > peso_saida` mas dentro da tolerância |
| AUD-18 / **crítica** | `Section-10`, `registrarDevolucao`, linha ~521 | `medida_usada: FieldValue.increment(volumeUtilizado)` — quando `estadoFisico === 'SOLIDO'`, `volumeUtilizado` equivale a `pesoConsumido` (g), mas `medida_usada` é definido no dicionário 5.9 como acumulado gravimétrico em g (correto). Contudo, o cálculo usa `densidade ? pesoConsumido/densidade : pesoConsumido`, o que acumula mL para líquidos em `medida_usada`, contradizendo a especificação que diz que `medida_usada` é sempre em g. O campo correto para acumulado em ml seria uma view materializada. | Reconciliar: `medida_usada` deve acumular sempre em g (conforme Seção 5.9 §Lote e Frasco e §Frasco_Reagente); o consumo em mL pertence apenas ao `Emprestimo_Reagente.medida_utilizada` e às views |
| AUD-19 / alta | `Section-4`, entidade `Resumo_Reagente`, linha ~209–217; `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §1.1 | `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §1.1 declara mover `estado_fisico` e `eh_higroscopico` para `Resumo_Reagente`. O modelo 3FN da Seção 4 **não** possui esses campos em `Resumo_Reagente`; `estado_fisico` permanece apenas em `Especificacao_Reagente`. Conflito de fontes de verdade: a decisão do `.md` não foi incorporada ao `.tex`. | Por regra de conflito do prompt, o `.md` é a diretriz de evolução. O `PLANO_ATUALIZACAO_TEX_LCQUI.md` deve registrar a adição de `estado_fisico` e `eh_higroscopico` à entidade `Resumo_Reagente` (Seção 4.14) e ao dicionário Seção 5.9 |
| AUD-20 / alta | `Section-5`, linha 93: `Resumo_Reagente` Denorm inclui `estados_fisicos` (array); `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §1.1 elimina esse array substituindo por escalar `estado_fisico` | A Seção 5 ainda menciona array `estados_fisicos` com `array-contains`, mas o `.md` resolve isso com escalar direto. Gera inconsistência no dicionário de Firestore e nas queries | Atualizar Seção 5 para remover `estados_fisicos` e documentar `estado_fisico` escalar como campo de `Resumo_Reagente` com filtro `==`; atualizar queries da Seção 5 §busca-textual correspondente |
| AUD-21 / alta | `Section-4`, entidade `Composicao_Reagente`, linha ~246–269; `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §Q03 | Q03 (MODIFICACOES) define campos separados `valor_min`, `valor_max`, `tipo_concentracao` e `notacao_original_fabricante` com tipos e nullability específicos. A entidade 3FN da Seção 4 ainda usa campos antigos `valor_composicao` (scalar), `tipo_concentracao` e `unidade` (texto livre para faixas). Modelo lógico incompleto. | Atualizar entidade `Composicao_Reagente` na Seção 4 para refletir Q03 (`valor_min NUMERIC NULL`, `valor_max NUMERIC NULL`, `notacao_original_fabricante VARCHAR(50) NULL`); dicionário 5.9 deve seguir |
| AUD-22 / média | `Section-4`, entidade `Frasco_Reagente`, linha ~316–365 | Campo `abertura_historica_desconhecida` mencionado em Q05 do `MODIFICACOES_CONSOLIDADAS_LCQUI.md` está ausente do modelo 3FN e do dicionário 5.9. Sem esse campo, não é possível distinguir frasco aberto com data desconhecida de frasco nunca aberto com `data_abertura = null`. | Adicionar `abertura_historica_desconhecida BOOLEAN DEFAULT FALSE NOT NULL` à entidade `Frasco_Reagente` na Seção 4 e ao dicionário 5.9 |
| AUD-23 / média | `Section-4`, entidade `Emprestimo_Reagente`, linha ~396–413 | Campo `auto_atendimento` mencionado em Q14 (`MODIFICACOES_CONSOLIDADAS_LCQUI.md`) está ausente do modelo 3FN e do dicionário 5.9. | Adicionar `auto_atendimento BOOLEAN DEFAULT FALSE NOT NULL` à entidade `Emprestimo_Reagente` e ao dicionário 5.9 |
| AUD-24 / média | `Section-7`, subseção obrigatoriedade, linha ~115–134 | Fórmula de consumo de empréstimo para devolução não menciona a invariante de não-negatividade de Q06 §2.1 (`consumo = max(0, peso_saida - peso_retorno)`). Coluna `medida_utilizada` da entidade não especifica este piso. | Adicionar nota de restrição não-negatividade à entidade `Emprestimo_Reagente` na Seção 4 (campo `medida_utilizada >= 0`) e à máquina de estados na Seção 4.36 |

## Achados novos — Bloco B (Patrimônio)

| ID / prioridade | Evidência local | Diferença para a especificação | Critério de correção |
|---|---|---|---|
| AUD-25 / **crítica** | `Section-10`, Seção 10.2.5 (reclassificação patrimonial); `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §5.3 | A resolução define que ao aprovar requisição de edição com novo nome, deve-se criar ou apontar para um novo `Resumo_Bem_Patrimonial` na mesma transação. Contudo, a entidade `Requisicao_Edicao_Bem_Patrimonial` (Seção 4) não possui campo `novo_id_resumo_bem_patrimonial`. O dicionário 5.9 menciona esse campo em Complementos Físicos (§Requisições) mas não na entidade 3FN. Risco de race condition na aprovação sem o campo FK. | Adicionar `novo_id_resumo_bem_patrimonial INTEGER FK NULL` à entidade 3FN `Requisicao_Edicao_Bem_Patrimonial` (Seção 4.9) e ao dicionário 5.9 correspondente |
| AUD-26 / alta | `Section-4`, entidade `Requisicao_Edicao_Bem_Patrimonial`, linha ~97–113 | Campo `versao_bem_origem` mencionado em §Requisições do dicionário 5.9 (Complementos Físicos) está ausente da entidade 3FN. Sem versionamento, a aprovação pode sobrescrever edição concorrente. | Adicionar `versao_bem_origem INTEGER NOT NULL` à entidade 3FN e verificar consistência no fluxo de aprovação (Seção 10.2.5) |
| AUD-27 / alta | `functions/src/patrimonio.ts`; `Section-5`, linha 86 (`Historico` como subcoleção) | Código atual registra histórico patrimonial em coleção raiz; alvo especificado é subcoleção `Bem_Patrimonial/{id}/Historico`. AUD-08 documentado anteriormente; sem migração concluída, relatórios patrimoniais leem dados inconsistentes. | Confirmar ou formalizar plano de migração em `PLANO_ATUALIZACAO_TEX_LCQUI.md`; collection-group permite consulta global enquanto migração não ocorre, mas índices precisam ser declarados |
| AUD-28 / média | `Section-4`, entidade `Bem_Patrimonial`, linha ~48–63 | Campo `ativo` (soft-delete) ausente do modelo 3FN, embora Q07 defina `ativo` para `Resumo_Reagente` e `Especificacao_Reagente`. Não está claro se patrimônio tem soft-delete ou apenas transições de status (`Ativo → Inservivel → Ja_dado_baixa`). | Esclarecer em `DUVIDAS_PENDENTES_LCQUI.md`: patrimônio precisa de flag `ativo` ou a máquina de status é suficiente? Decisão deve ser registrada em `MODIFICACOES_CONSOLIDADAS_LCQUI.md` antes de alterar o `.tex` |

## Achados novos — Bloco C (Acadêmico, Turmas e Roteiros)

| ID / prioridade | Evidência local | Diferença para a especificação | Critério de correção |
|---|---|---|---|
| AUD-29 / **crítica** | `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §3.1 (snapshot `roteiro_anexo` embutido no Post); `Section-4`, entidade `Post`, linha ~627–635; `Section-5`, dicionário §Post | O snapshot `roteiro_anexo` (com `id_roteiro`, `nome_arquivo`, `tamanho_bytes`, `storage_path`) definido no MODIFICACOES para permitir download por alunos sem acesso à coleção raiz está **ausente** da entidade 3FN e do dicionário 5.9. A entidade `Post` só tem `id_roteiro_experimento` (FK nullable). | Adicionar campo `roteiro_anexo` (map/object) ao dicionário 5.9 §Post com os subcampos definidos; registrar no `PLANO_ATUALIZACAO_TEX_LCQUI.md` como adição ao documento Post sem alterar o modelo 3FN (é exclusivamente denormalização Firestore) |
| AUD-30 / alta | `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §3.2 (ACL `professores_compartilhados` no Roteiro); `Section-5`, linha 110 (`Roteiro_Professor_Compartilhado` como coleção raiz) | A resolução elimina a coleção `Roteiro_Professor_Compartilhado` do Firestore, substituindo-a por array ACL no documento `Roteiro_Experimento`. Contudo, a Seção 5 (tabela de mapeamento, linha 110) ainda lista `Roteiro_Professor_Compartilhado` como coleção raiz ativa. Conflito direto de arquitetura Firestore. | Atualizar Seção 5 para remover `Roteiro_Professor_Compartilhado` da tabela de mapeamento e adicionar campo `professores_compartilhados` ao §Roteiro_Experimento do dicionário 5.9; atualizar Security Rule correspondente |
| AUD-31 / alta | `Section-4`, entidade `Comentario`, linha ~638–644; `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §Q11 | Q11 define campos `moderado BOOLEAN` e `motivo_moderacao TEXT` no comentário. Esses campos estão ausentes da entidade 3FN e do dicionário 5.9. | Adicionar `moderado BOOLEAN DEFAULT FALSE NOT NULL` e `motivo_moderacao TEXT NULL` à entidade `Comentario` (Seção 4.39) e ao dicionário 5.9 §Comentario |
| AUD-32 / alta | `Section-4`, entidade `Convite_Aluno`, linha ~545–562; `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §Q02 | Q02 define campo `token_hash` (link assinado criptograficamente) e chave determinística `convite_${turmaId||'global'}_${hashEmail}`. A entidade 3FN não possui `token_hash`. O dicionário 5.9 menciona `token_hash` em §Convite (Complementos Físicos) mas não na entidade 3FN. | Adicionar `token_hash VARCHAR(100) NOT NULL` à entidade 3FN `Convite_Aluno` e formalizar a regra de chave determinística em Seção 4 |
| AUD-33 / média | `Section-7`, linha ~149–161 (Multi-role permitidos); `Section-3`, §Bolsista, linha 99 | Seção 7 lista "Aluno que é Gestor de Almoxarifado" como combinação permitida. Seção 3 §Bolsista linha 99 diz "É mutuamente exclusivo com o papel de Gestor de Almoxarifado". Seção 7 linha 160 confirma que "Aluno que é Bolsista não pode ser Gestor de Almoxarifado". Há ambiguidade: Aluno sem Bolsista pode ser Gestor_Almoxarifado? | Confirmar/clarificar regra: Aluno puro (sem Bolsista) + Gestor_Almoxarifado — é permitido? Registrar decisão em `MODIFICACOES_CONSOLIDADAS_LCQUI.md` e `DUVIDAS_PENDENTES_LCQUI.md` |
| AUD-34 / média | `Section-4`, entidade `Notificacao`, linha ~564–602; `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §Q12 | Q12 adiciona `Bolsista` ao enum `papel_destinatario` de `Notificacao`. A entidade 3FN nas linhas 568–573 lista apenas `Aluno, Professor, Gestor_Bens_Patrimoniais, Gestor_Almoxarifado` — sem `Bolsista`. | Adicionar `Bolsista` ao enum `papel_destinatario` na entidade 3FN e no dicionário 5.9 §Notificacao |

## Achados novos — Bloco D (Governança, Multi-Role e Infra)

| ID / prioridade | Evidência local | Diferença para a especificação | Critério de correção |
|---|---|---|---|
| AUD-35 / **crítica** | `firestore.rules`; `Section-5`, dicionário §Controle_Papeis | `Controle_Papeis/singleton` (usado para garantir atomicidade de último chefe/gestor patrimonial) está ausente das Security Rules. Escritas diretas permitem burlar a proteção do último responsável via cliente. | Adicionar match explícito em `firestore.rules` negando escritas/leituras diretas de clientes em `Controle_Papeis`; apenas Functions no contexto admin devem acessar |
| AUD-36 / **crítica** | `firestore.rules`; `Section-5`, dicionário §Operacoes | Coleção `Operacoes` (idempotência de operações críticas) e `Chaves_Unicas` (unicidade técnica) não têm regras declaradas. Ausência de rule ≠ deny-all quando deny-all raiz não está configurado corretamente. | Adicionar regras explícitas negando leitura/escrita direta de cliente em `Operacoes` e `Chaves_Unicas`; testar que emulador rejeita acesso direto |
| AUD-37 / alta | `functions/src/usuarios.ts` (convidarUsuario, cadastrarUsuario); `Section-7` RN-ROLE-01 | RN-ROLE-01 (Chefe_Geral é exclusivo) deve ser verificada no momento da concessão de qualquer papel. Não há evidência de que a função de concessão verifique se o usuário alvo já possui `Chefe_Geral` antes de adicionar outro papel, ou se o usuário a receber `Chefe_Geral` já possui outros papéis. | Adicionar verificação explícita de exclusividade de `Chefe_Geral` na função de concessão de papel (antes e depois da operação) e cobrir com testes negativos |
| AUD-38 / alta | `Section-10`, `validarPermissao` (linha ~60–67); `functions/src/auth.ts` | A função `validarPermissao` usa apenas Custom Claims (`resolverPapeisDoToken`) sem verificar `Usuarios/{uid}.ativo`. Usuário com conta desativada mas token válido (dentro de 1h) pode chamar Cloud Functions. `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §5.1 exige verificação de `Usuarios/{uid}.ativo` no banco para invalidar sessões revogadas. | Adicionar leitura de `Usuarios/{uid}.ativo` ao início das Cloud Functions críticas (ou implementar middleware compartilhado) com cache de curta duração para reduzir custo |

## Conciliações documentais realizadas (revisão 11/09/2026)

- Etiquetas: singleton existente `Contador_Codigo_Frasco/singleton`, sem reservar código ao imprimir; virgens em `Impressao_Etiqueta_Frasco`, segunda via em auditoria. Geometria A4, offset, limites e ficha incorporados ao LaTeX.
- Multi-role: RN-ROLE-01–15 incorporadas à seção 7; seção 8 descreve concessão/revogação e seção 9 os fluxos administrativos.
- Seção 5.9: campos lógicos, tipos Firestore, nulabilidade, fontes, projeções, metadados operacionais, vínculos, locks e materializações. `Turma` singular preserva caminho atual; `Usuarios/uid/Turmas` é espelho de leitura.
- Seção 8: expansão dos painéis com UI-01–13. Separação de conservação/status, resumo/especificação, massa/volume e permissão visual/autorização.
- Seção 9: ações por todos os papéis, com falhas/concorrência. Exemplo de período corrigido para no máximo 31 dias.
- Seções 10/11: fundamentos de transação, Auth/Storage, persistência, escopo e diferença entre hash e assinatura digital.

## Ordem de implementação resultante (atualizada)

1. **Crítico — autorização real**: AUD-01, AUD-02, AUD-03, AUD-35, AUD-36 (Rules e coleções de controle).
2. **Crítico — Q06 metrologia**: AUD-17, AUD-18 (fórmula híbrida de tolerância e unidade de `medida_usada`).
3. **Crítico — caminhos e migração**: AUD-07, AUD-08 (Especificacao subcoleção e Histórico patrimonial).
4. **Crítico — campos ausentes do modelo**: AUD-19, AUD-21, AUD-25, AUD-29, AUD-30 (estado_fisico/eh_higroscopico no Resumo, Q03 em Composicao, reclassificação patrimonial, snapshot Post, ACL Roteiro).
5. **Alta — completar entidades**: AUD-22, AUD-23, AUD-24, AUD-26, AUD-31, AUD-32, AUD-34 (campos faltantes no modelo e dicionário).
6. **Alta — concorrência e claims**: AUD-05, AUD-06, AUD-37, AUD-38.
7. **Alta — locks e integridade**: AUD-09, AUD-11, AUD-12.
8. **Média — schemas, testes, materializações**: AUD-10, AUD-13, AUD-14, AUD-15, AUD-27, AUD-28, AUD-33.
9. **Execução E2E e homologação**: somente após os itens acima.

## Evidência de validação desta revisão

Inspeção estática dos arquivos `.tex` (Seções 3, 4, 5, 6, 7, 10), `.md` de controle e código referenciado. Compilação LaTeX não reexecutada nesta rodada (build anterior sem erros em 11/09/2026). Testes funcionais não executados. Não houve deploy, migração de dados nem alteração de Rules nesta tarefa.

## Referências

A propagação de claims depende de emissão/renovação de token: [Firebase — Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims). Transações exigem leituras antes das escritas e podem repetir callbacks: [Firebase — transações](https://firebase.google.com/docs/firestore/manage-data/transactions). Cache persistente requer considerar dispositivo confiável: [Firebase — acesso offline](https://firebase.google.com/docs/firestore/manage-data/enable-offline). As políticas específicas do LCQUI são decisões documentadas a partir desses fundamentos.


## Conciliações documentais realizadas

- Etiquetas: singleton existente `Contador_Codigo_Frasco/singleton`, sem reservar código ao imprimir; virgens em `Impressao_Etiqueta_Frasco`, segunda via em auditoria. Geometria A4, offset, limites e ficha incorporados ao LaTeX.
- Multi-role: RN-ROLE-01–15 incorporadas à seção 7; seção 8 descreve concessão/revogação e seção 9 os fluxos administrativos.
- Seção 5.9: campos lógicos, tipos Firestore, nulabilidade, fontes, projeções, metadados operacionais, vínculos, locks e materializações. `Turma` singular preserva caminho atual; `Usuarios/uid/Turmas` é espelho de leitura.
- Seção 8: expansão dos painéis com UI-01–13. Separação de conservação/status, resumo/especificação, massa/volume e permissão visual/autorização.
- Seção 9: ações por todos os papéis, com falhas/concorrência. Exemplo de período corrigido para no máximo 31 dias.
- Seções 10/11: fundamentos de transação, Auth/Storage, persistência, escopo e diferença entre hash e assinatura digital.

## Ordem de implementação resultante

1. Resolver decisões Q01–Q14 que condicionam regras de acesso, cálculo e retenção.
2. Corrigir AUD-01–07: autorização real e caminhos de dados, com migração revisável e testes negativos.
3. Fechar invariantes transacionais: papéis, frascos, matrícula, locks e resposta de requisições.
4. Implementar campos/UI faltantes nos contratos UI-01–13 e fluxos da seção 9.
5. Validar consultas, índices, cache, materializações e PDFs com dados representativos.
6. Executar testes de integração/E2E e homologação; somente então elevar estados na matriz.

## Evidência de validação desta revisão

A alteração é documental. Compilação LaTeX, verificação de referências e diff são os checks pertinentes; compilação concluída sem erros/referências indefinidas, PDF final de 164 páginas e diff documental sem erros de whitespace. Permanecem 19 avisos tipográficos de overflow, detalhados em STATUS_ATUAL.md. Suítes em `functions/src/__tests__/` foram inventariadas, mas não executadas nesta revisão. Resultados históricos do planejamento de etiquetas não são reutilizados como resultados atuais. Não houve deploy, migração de dados nem alteração de Rules nesta tarefa.

## Referências

A propagação de claims depende de emissão/renovação de token: [Firebase — Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims). Transações exigem leituras antes das escritas e podem repetir callbacks: [Firebase — transações](https://firebase.google.com/docs/firestore/manage-data/transactions). Cache persistente requer considerar dispositivo confiável: [Firebase — acesso offline](https://firebase.google.com/docs/firestore/manage-data/enable-offline). As políticas específicas do LCQUI são decisões documentadas a partir desses fundamentos.
