# Auditoria de alinhamento LCQUI

Revisão de 13/09/2026 (rodada de realinhamento por blocos A–D). Inclui todos os achados da revisão anterior (11/09/2026) e os novos achados desta rodada, por inspeção estática dos arquivos `.tex`, `.md` e do código do repositório. Não representa auditoria de produção nem execução de testes.

## Estados dos achados

`ABERTO`: lacuna constatada; `DECISAO_RESOLVIDA`: política decidida, sem prova de aplicação; `PLANEJADO`: correção descrita no plano; `APLICADO_DOCUMENTACAO`: alteração efetiva nos .tex; `IMPLEMENTADO_CODIGO`: mudança no código com evidência; `VALIDADO`: critérios de aceitação comprovados. Planejamento não é correção nem validação.

## Resultado geral

A especificação apresenta consistência interna elevada no modelo 3FN (Seção 4) e no dicionário físico (Seção 5.9). Os principais focos de risco residem em: (1) divergências entre os exemplos de código da Seção 10 e as resoluções de Q06 do `MODIFICACOES_CONSOLIDADAS_LCQUI.md`; (2) campos especificados em `MODIFICACOES_CONSOLIDADAS_LCQUI.md` ausentes do modelo 3FN e do dicionário 5.9; (3) coleções de controle de concorrência (`Controle_Papeis/singleton`, `Operacoes`, `Chaves_Unicas`) descritas no dicionário mas ausentes das Security Rules; (4) achados de caminho (AUD-07/08) ainda não migrados no código. Todos os 25 RF e 15 RN-ROLE permanecem PARCIAL.

## Achados verificáveis — revisão anterior (11/09/2026)

| ID / prioridade | Evidência local | Diferença para a especificação | Critério de correção |
|---|---|---|---|
| AUD-01 / alta — **ABERTO** | `firestore.rules`, matches Turma, Alunos, Posts e Comentarios | Leitura aceita qualquer autenticado; UI-10/11 exige vínculo/propriedade | Testes de Rules negam turma de terceiro e permitem membros atuais |
| AUD-02 / alta — **ABERTO** | `firestore.rules`, Bem_Patrimonial, requisições, locks e Usuarios | Escritas diretas permitidas a determinados papéis podem contornar validação/auditoria das Functions | Negar mutações diretas de domínio e testar caminho servidor |
| AUD-03 / alta — **ABERTO** | `firestore.rules`, Emprestimo_Reagente e Historico_Frasco_Reagente | Qualquer autenticado pode ler movimentações; catálogo não requer identidade do retirante | Limitar por retirante/almoxarifado/chefia e fornecer projeção de disponibilidade |
| AUD-04 / alta — **ABERTO** | `storage.rules`, roteiros e baixas_patrimoniais | Leitura por qualquer autenticado e exclusão de comprovantes pelo proprietário autorizado | Validar vínculo de roteiro e preservar documento de baixa referenciado |
| AUD-05 / alta — **PLANEJADO** | `functions/src/auth.ts`; `frontend/src/contexts/AuthContext.tsx` | Claims são lidas do token; frontend considera ativo todo usuário com roles. Atualizar claims não invalida por si só token emitido | Controle de conta ativa/versão, sincronização recuperável e teste de token antigo |
| AUD-06 / alta — **ABERTO** | `functions/src/usuarios.ts`, concessão/revogação | Operações em vários passos de Firestore/Auth; não demonstram atomicidade global de último responsável | Transação com controles compartilhados e reconciliação Auth, testes concorrentes |
| AUD-07 / alta — **ABERTO** | `functions/src/reagentes_base.ts` cria em Resumo_Reagente/id/Especificacoes; `functions/src/relatorios.ts` busca Especificacao_Reagente raiz | Caminhos incompatíveis; Rules só descrevem raiz | Migrar/compatibilizar leitores, escritor e Rules ao caminho canônico, sem cópia divergente |
| AUD-08 / média — **ABERTO** | `functions/src/patrimonio.ts`; `functions/src/relatorios.ts` | Histórico patrimonial raiz difere do alvo Bem_Patrimonial/id/Historico | Migração explícita e consulta collection-group com escopo/índices, preservando eventos |
| AUD-09 / alta — **ABERTO** | `functions/src/patrimonio.ts`, limparLocksOrfaos | Limpeza de lock exige verificar requisição vinculada, não somente idade | Pendência antiga mantém lock; órfão real pode ser reconciliado |
| AUD-10 / média — **ABERTO** | `functions/src/schemas/usuarios.schema.ts`, turmas.schema.ts, posts.schema.ts | Campos condicionais/limites do LaTeX não são todos validados; matrícula e justificativa merecem revisão. `reagentes.ts` admite ganho de 2% e incrementa medida_usada com volume, enquanto o modelo a define em g; reconciliar Q06 e unidades | Schemas compartilhados restrições UI/backend; erro por campo e testes negativos |
| AUD-11 / média — **ABERTO** | `functions/src/turmas.ts` | Existem ingresso, convite, adição e arquivamento; presença desses endpoints não comprova aceitação completa nem propagação integral dos espelhos | E2E de convite, capacidade/exceção, remoção, arquivo/restauração e token atualizado |
| AUD-12 / média — **ABERTO** | `functions/src/roteiros.ts` e `posts.ts` | Relação de compartilhamento, autoria, acesso após revogação e política de exclusão precisam fechamento | Resolver Q09/Q11 e testar download/anexo permitido e negado |
| AUD-13 / média — **ABERTO** | `functions/src/relatorios.ts`; `frontend/src/lib/pdf.ts` | Transporte atual é base64, enquanto exemplos antigos do LaTeX usavam Storage | Documentação atual distingue transporte; testar memória, limites, filtros e unidades |
| AUD-14 / média — **ABERTO** | `frontend/src/components/reagentes/ModalEtiquetasReagentes.tsx`; `functions/src/relatorios.ts` | Código de etiquetas existe; planejamento de protótipo não prova conformidade física/escopo de toda a aplicação | Casos de offset, limite, deduplicação, escopo e leitura real do Code 128 |
| AUD-15 / média — **ABERTO** | Seção 6 e funções exportadas em `functions/src/index.ts` | Materializações documentadas não são, só por isso, jobs implantados/validados | Inventário de produtores, idempotência, reconciliação e cobertura por período |
| AUD-16 / média — **ABERTO** | `flake.nix`; `COMPILACAO_NIX_LCQUI.md` | Flake atual não fornece TeX Live apesar da premissa do guia antigo | Instrução de compilação documental corrigida, saída isolada |

## Achados novos — Bloco A (Química e Almoxarifado)

| ID / prioridade | Evidência local | Diferença para a especificação | Critério de correção |
|---|---|---|---|
| AUD-17 / **crítica** — **PLANEJADO** | `Section-10`, listagem `registrarDevolucao`, linha ~498–502 | Fórmula de tolerância aplica margem plana de 2% para todos os casos vs. fórmula híbrida Q06 §2.2. Campo `eh_higroscopico` não consultado. | **Decisão (DP-A01+DP-A02)**: Snapshot `eh_higroscopico` denormalizado em `Frasco_Reagente` (P3-07). Atualizar pseudocódigo Seção 10 com fórmula híbrida, consumo=0 para ganho higroscópico e evento `AJUSTE/ganho_massa_higroscopia` (P1-03). MODIFICACOES §7.1–7.2. |
| AUD-18 / **crítica** — **PLANEJADO** | `Section-10`, `registrarDevolucao`, linha ~521 | `medida_usada` acumula mL para líquidos no pseudocódigo, mas o dicionário 5.9 define o campo como *sempre em gramas*. | **Decisão (§6.2)**: `medida_usada` acumula sempre `pesoConsumido` em g. Consumo em mL pertence exclusivamente a `Emprestimo_Reagente.medida_utilizada`. Correção planejada em P1-03. MODIFICACOES §6.2. |
| AUD-19 / alta — **PLANEJADO** | `Section-4`, entidade `Resumo_Reagente`, linha ~209–217 | `estado_fisico` e `eh_higroscopico` ausentes de `Resumo_Reagente` no LaTeX. | **Decisão (DP-A01)**: Mover ambos os campos para `Resumo_Reagente` (P3-02). Especificacao_Reagente remove o campo `estado_fisico`. MODIFICACOES §7.1. |
| AUD-20 / alta — **PLANEJADO** | `Section-5`, linha 93: array `estados_fisicos` com `array-contains` vs. escalar `estado_fisico` | Inconsistência entre Seção 5 e MODIFICACOES §1.1. | **Decisão (DP-A01)**: Remover `estados_fisicos`, usar `estado_fisico` escalar com filtro `==` (P3-03). MODIFICACOES §7.1. |
| AUD-21 / alta — **PLANEJADO** | `Section-4`, entidade `Composicao_Reagente`, linha ~246–269 | Campos `valor_composicao`/`unidade` vs. `valor_min`/`valor_max`/`notacao_original_fabricante` de Q03. | **Decisão (DP-A03)**: Substituir campos antigos por `valor_min NUMERIC NULL`, `valor_max NUMERIC NULL`, `notacao_original_fabricante VARCHAR(50) NULL` + `CHECK (valor_max IS NULL OR valor_min <= valor_max)` (P3-01). MODIFICACOES §7.3. |
| AUD-22 / média — **PLANEJADO** | `Section-4`, entidade `Frasco_Reagente`, linha ~316–365 | Campo `abertura_historica_desconhecida` mencionado em Q05 do `MODIFICACOES_CONSOLIDADAS_LCQUI.md` está ausente do modelo 3FN e do dicionário 5.9. Sem esse campo, não é possível distinguir frasco aberto com data desconhecida de frasco nunca aberto com `data_abertura = null`. | Adicionar `abertura_historica_desconhecida BOOLEAN DEFAULT FALSE NOT NULL` à entidade `Frasco_Reagente` na Seção 4 e ao dicionário 5.9 |
| AUD-23 / média — **PLANEJADO** | `Section-4`, entidade `Emprestimo_Reagente`, linha ~396–413 | Campo `auto_atendimento` mencionado em Q14 (`MODIFICACOES_CONSOLIDADAS_LCQUI.md`) está ausente do modelo 3FN e do dicionário 5.9. | Adicionar `auto_atendimento BOOLEAN DEFAULT FALSE NOT NULL` à entidade `Emprestimo_Reagente` e ao dicionário 5.9 |
| AUD-24 / média — **PLANEJADO** | `Section-7`, subseção obrigatoriedade, linha ~115–134 | Fórmula de consumo de empréstimo para devolução não menciona a invariante de não-negatividade de Q06 §2.1 (`consumo = max(0, peso_saida - peso_retorno)`). Coluna `medida_utilizada` da entidade não especifica este piso. | Adicionar nota de restrição não-negatividade à entidade `Emprestimo_Reagente` na Seção 4 (campo `medida_utilizada >= 0`) e à máquina de estados na Seção 4.36 |

## Achados novos — Bloco B (Patrimônio)

| ID / prioridade | Evidência local | Diferença para a especificação | Critério de correção |
|---|---|---|---|
| AUD-25 / **crítica** — **PLANEJADO** | `Requisicao_Edicao_Bem_Patrimonial` sem campo `novo_id_resumo_bem_patrimonial` no modelo 3FN; foto proposta NULL quando deveria ser NOT NULL. | Campo FK ausente do 3FN + nullability incorreta. | **Decisão (DP-B02)**: `photo_url_proposta TEXT NOT NULL` (P3-05). Adicionar campo `novo_id_resumo_bem_patrimonial` ao 3FN (P2-04). MODIFICACOES §7.5. |
| AUD-26 / alta — **PLANEJADO** | `Section-4`, entidade `Requisicao_Edicao_Bem_Patrimonial`, linha ~97–113 | Campo `versao_bem_origem` mencionado em §Requisições do dicionário 5.9 (Complementos Físicos) está ausente da entidade 3FN. Sem versionamento, a aprovação pode sobrescrever edição concorrente. | Adicionar `versao_bem_origem INTEGER NOT NULL` à entidade 3FN e verificar consistência no fluxo de aprovação (Seção 10.2.5) |
| AUD-27 / alta — **ABERTO** | `functions/src/patrimonio.ts`; `Section-5`, linha 86 (`Historico` como subcoleção) | Código atual registra histórico patrimonial em coleção raiz; alvo especificado é subcoleção `Bem_Patrimonial/{id}/Historico`. AUD-08 documentado anteriormente; sem migração concluída, relatórios patrimoniais leem dados inconsistentes. | Confirmar ou formalizar plano de migração em `PLANO_ATUALIZACAO_TEX_LCQUI.md`; collection-group permite consulta global enquanto migração não ocorre, mas índices precisam ser declarados |
| AUD-28 / média — **DECISAO_RESOLVIDA** | `Section-4`, entidade `Bem_Patrimonial` sem flag `ativo`. | Ambiguidade sobre soft-delete patrimonial. | **Decisão (DP-B01)**: Máquina de estados `Ativo → Inservivel → Ja_dado_baixa` é suficiente. Nenhuma alteração no LaTeX. P3-04 cancelado. MODIFICACOES §7.4. |

## Achados novos — Bloco C (Acadêmico, Turmas e Roteiros)

| ID / prioridade | Evidência local | Diferença para a especificação | Critério de correção |
|---|---|---|---|
| AUD-29 / **crítica** — **PLANEJADO** | `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §3.1 (snapshot `roteiro_anexo` embutido no Post); `Section-4`, entidade `Post`, linha ~627–635; `Section-5`, dicionário §Post | O snapshot `roteiro_anexo` (com `id_roteiro`, `nome_arquivo`, `tamanho_bytes`, `storage_path`) definido no MODIFICACOES para permitir download por alunos sem acesso à coleção raiz está **ausente** da entidade 3FN e do dicionário 5.9. A entidade `Post` só tem `id_roteiro_experimento` (FK nullable). | Adicionar campo `roteiro_anexo` (map/object) ao dicionário 5.9 §Post com os subcampos definidos; registrar no `PLANO_ATUALIZACAO_TEX_LCQUI.md` como adição ao documento Post sem alterar o modelo 3FN (é exclusivamente denormalização Firestore) |
| AUD-30 / alta — **PLANEJADO** | `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §3.2 (ACL `professores_compartilhados` no Roteiro); `Section-5`, linha 110 (`Roteiro_Professor_Compartilhado` como coleção raiz) | A resolução elimina a coleção `Roteiro_Professor_Compartilhado` do Firestore, substituindo-a por array ACL no documento `Roteiro_Experimento`. Contudo, a Seção 5 (tabela de mapeamento, linha 110) ainda lista `Roteiro_Professor_Compartilhado` como coleção raiz ativa. Conflito direto de arquitetura Firestore. | Atualizar Seção 5 para remover `Roteiro_Professor_Compartilhado` da tabela de mapeamento e adicionar campo `professores_compartilhados` ao §Roteiro_Experimento do dicionário 5.9; atualizar Security Rule correspondente |
| AUD-31 / alta — **PLANEJADO** | `Section-4`, entidade `Comentario` sem campos de moderação. | `moderado`, `motivo_moderacao`, `moderado_por` ausentes. | **Decisão (DP-C02)**: Adicionar campos + regra de visibilidade por papel (P1-04, P3-08). Autor vê tarja; colegas veem aviso institucional. MODIFICACOES §7.7. |
| AUD-32 / alta — **PLANEJADO** | `Section-4`, entidade `Convite_Aluno` sem `token_hash` no 3FN. | Campo e chave determinística ausentes do modelo. | **Decisão (DP-C03)**: Substituição in-place (sem `revogado_em`). Adicionar `token_hash VARCHAR(100) NOT NULL` + `ultimo_reenvio_por INTEGER FK NULL` + regra de chave determinística (P1-05). MODIFICACOES §7.8. |
| AUD-33 / média — **PLANEJADO** | Ambiguidade Aluno puro + Gestor_Almoxarifado entre Seção 3 e Seção 7. | Seções contraditórias sobre SoD. | **Decisão (DP-C01)**: Aluno puro (sem Bolsista) + Gestor_Almoxarifado é COMPATÍVEL. SoD exclusivo: Bolsista ↔ Gestor_Almoxarifado. Harmonizar Seções 3.6 e 7.4 (P3-06). MODIFICACOES §7.6. |
| AUD-34 / média — **PLANEJADO** | `Section-4`, entidade `Notificacao`, linha ~564–602; `MODIFICACOES_CONSOLIDADAS_LCQUI.md` §Q12 | Q12 adiciona `Bolsista` ao enum `papel_destinatario` de `Notificacao`. A entidade 3FN nas linhas 568–573 lista apenas `Aluno, Professor, Gestor_Bens_Patrimoniais, Gestor_Almoxarifado` — sem `Bolsista`. | Adicionar `Bolsista` ao enum `papel_destinatario` na entidade 3FN e no dicionário 5.9 §Notificacao |

## Achados novos — Bloco D (Governança, Multi-Role e Infra)

| ID / prioridade | Evidência local | Diferença para a especificação | Critério de correção |
|---|---|---|---|
| AUD-35 / baixa — **PLANEJADO** | `firestore.rules`, deny-all raiz | Controle_Papeis: nenhum allow alcança a coleção; clientes já não têm acesso direto. Hardening/documentação defensiva. | Adicionar deny explícito e testes de leitura/escrita autenticadas; Admin SDK permanece responsável |
| AUD-36 / baixa — **PLANEJADO** | `firestore.rules`, deny-all raiz | Operacoes e Chaves_Unicas: nenhum allow alcança a coleção; clientes já não têm acesso direto. Hardening/documentação defensiva. | Adicionar deny explícito e testes de leitura/escrita autenticadas; Admin SDK permanece responsável |
| AUD-37 / alta — **ABERTO** | `functions/src/usuarios.ts` (convidarUsuario, cadastrarUsuario); `Section-7` RN-ROLE-01 | RN-ROLE-01 (Chefe_Geral é exclusivo) deve ser verificada no momento da concessão de qualquer papel. auth.ts já valida exclusividade, mas usuarios.ts lê e grava fora de transação; revogação não valida ator contra alvo nem protege concorrência. | Adicionar verificação explícita de exclusividade de `Chefe_Geral` na função de concessão de papel (antes e depois da operação) e cobrir com testes negativos |
| AUD-38 / alta — **PLANEJADO** | `validarPermissao` sem verificação de `Usuarios/{uid}.ativo` nas Cloud Functions. | Token válido mas conta desativada pode executar mutações. | **Decisão (DP-D01)**: Parâmetro `requerAtivo: boolean` em `validarPermissao`; mutações de alto impacto passam `true` (1 leitura Firestore). Leituras confiam no JWT por até 1h (P3-09). MODIFICACOES §7.9. |

## Conciliações documentais realizadas (revisão 11/09/2026)

- Etiquetas: singleton existente `Contador_Codigo_Frasco/singleton`, sem reservar código ao imprimir; virgens em `Impressao_Etiqueta_Frasco`, segunda via em auditoria. Geometria A4, offset, limites e ficha incorporados ao LaTeX.
- Multi-role: RN-ROLE-01–15 incorporadas à seção 7; seção 8 descreve concessão/revogação e seção 9 os fluxos administrativos.
- Seção 5.9: campos lógicos, tipos Firestore, nulabilidade, fontes, projeções, metadados operacionais, vínculos, locks e materializações. `Turma` singular preserva caminho atual; `Usuarios/uid/Turmas` é espelho de leitura.
- Seção 8: expansão dos painéis com UI-01–13. Separação de conservação/status, resumo/especificação, massa/volume e permissão visual/autorização.
- Seção 9: ações por todos os papéis, com falhas/concorrência. Exemplo de período corrigido para no máximo 31 dias.
- Seções 10/11: fundamentos de transação, Auth/Storage, persistência, escopo e diferença entre hash e assinatura digital.

## Ordem de implementação resultante (atualizada)

1. **Crítico — autorização real**: AUD-01, AUD-02, AUD-03 (Rules); AUD-35/36 são hardening de baixa prioridade.
2. **Crítico — Q06 metrologia**: AUD-17, AUD-18 (fórmula híbrida de tolerância e unidade de `medida_usada`).
3. **Crítico — caminhos e migração**: AUD-07, AUD-08 (Especificacao subcoleção e Histórico patrimonial).
4. **Crítico — campos ausentes do modelo**: AUD-19, AUD-21, AUD-25, AUD-29, AUD-30 (estado_fisico/eh_higroscopico no Resumo, Q03 em Composicao, reclassificação patrimonial, snapshot Post, ACL Roteiro).
5. **Alta — completar entidades**: AUD-22, AUD-23, AUD-24, AUD-26, AUD-31, AUD-32, AUD-34 (campos faltantes no modelo e dicionário).
6. **Alta — concorrência e claims**: AUD-05, AUD-06, AUD-37, AUD-38.
7. **Alta — locks e integridade**: AUD-09, AUD-11, AUD-12.
8. **Média — schemas, testes, materializações**: AUD-10, AUD-13, AUD-14, AUD-15, AUD-27, AUD-28, AUD-33.
9. **Execução E2E e homologação**: somente após os itens acima.

## Resolução das pendências — 13/09/2026 (rodada DP)

Todas as 10 dúvidas pendentes (DP-A01 a DP-D02) foram formalmente resolvidas. Tabela de rastreabilidade:

| DP | Decisão | AUD(s) afetados | Status |
|---|---|---|---|
| DP-A01 | `estado_fisico`/`eh_higroscopico` → `Resumo_Reagente` (Opção 2) | AUD-19, AUD-20 | PLANEJADO (P3-02, P3-03) |
| DP-A02 | Snapshot `eh_higroscopico` em `Frasco_Reagente` (Opção 2) | AUD-17 | PLANEJADO (P3-07, P1-03) |
| DP-A03 | Constraint `CHECK` formal (Opção 1) | AUD-21 | PLANEJADO (P3-01) |
| DP-B01 | Máquina de estados pura, sem `ativo` (Opção 1) | AUD-28 | DECISAO_RESOLVIDA |
| DP-B02 | Foto NOT NULL na submissão (Opção 1) | AUD-25 | PLANEJADO (P3-05) |
| DP-C01 | Aluno puro + Gestor_Almoxarifado compatíveis (Opção 1) | AUD-33 | PLANEJADO (P3-06) |
| DP-C02 | Autor vê tarja; colegas veem aviso (Opção 1) | AUD-31 | PLANEJADO (P1-04, P3-08) |
| DP-C03 | Substituição in-place sem `revogado_em` (Opção 1) | AUD-32 | PLANEJADO (P1-05) |
| DP-D01 | `requerAtivo` em mutações de alto impacto (Opção 2) | AUD-38, AUD-05 | PLANEJADO (P3-09) |
| DP-D02 | Retenção indefinida V1 (Opção 1) | — | DECISAO_RESOLVIDA — RF25 ratificado |

## Evidência de validação desta revisão

Inspeção estática dos arquivos `.tex` (Seções 3, 4, 5, 6, 7, 10), `.md` de controle e código referenciado. Compilação LaTeX não reexecutada nesta rodada (build anterior sem erros em 11/09/2026). Testes funcionais não executados. Não houve deploy, migração de dados nem alteração de código ou Rules nesta tarefa. Os arquivos `.tex` **não foram alterados** nesta rodada; todas as mudanças ficaram nos `.md` de controle. O `PLANO_ATUALIZACAO_TEX_LCQUI.md` lista 17 itens prontos para execução na próxima rodada.

## Referências

A propagação de claims depende de emissão/renovação de token: [Firebase — Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims). Transações exigem leituras antes das escritas e podem repetir callbacks: [Firebase — transações](https://firebase.google.com/docs/firestore/manage-data/transactions). Cache persistente requer considerar dispositivo confiável: [Firebase — acesso offline](https://firebase.google.com/docs/firestore/manage-data/enable-offline). As políticas específicas do LCQUI são decisões documentadas a partir desses fundamentos.
