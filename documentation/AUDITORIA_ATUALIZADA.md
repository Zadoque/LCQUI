# Auditoria de alinhamento LCQUI

Revisão de 11/09/2026, por inspeção estática da documentação, funções, schemas, frontend e regras locais. Não representa auditoria de produção, execução de testes ou homologação. A matriz anterior usava nomes genéricos de funções/coleções e declarava validação sem evidência anexada; esta versão usa caminhos encontrados no repositório.

## Resultado

A documentação foi ampliada, mas o sistema continua **parcial em relação à especificação**. Não há base reproduzível para percentuais anteriores de 63%, 69% ou 72%. Também não se mantém a declaração de que segurança, domínio e multi-role estejam integralmente concluídos. A matriz registra RF01–RF25 e todos os grupos de fluxos sem confundir arquivo existente com validação.

## Achados verificáveis

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
| AUD-10 / média | `functions/src/schemas/usuarios.schema.ts`, turmas.schema.ts, posts.schema.ts | Campos condicionais/limites do LaTeX não são todos validados; matrícula e justificativa merecem revisão. `reagentes.ts` admite ganho de 2% e incrementa medida_usada com volume, enquanto o modelo a define em g; reconciliar Q06 e unidades | Schemas compartilham restrições UI/backend; erro por campo e testes negativos |
| AUD-11 / média | `functions/src/turmas.ts` | Existem ingresso, convite, adição e arquivamento; presença desses endpoints não comprova aceitação completa nem propagação integral dos espelhos | E2E de convite, capacidade/exceção, remoção, arquivo/restauração e token atualizado |
| AUD-12 / média | `functions/src/roteiros.ts` e `posts.ts` | Relação de compartilhamento, autoria, acesso após revogação e política de exclusão precisam fechamento | Resolver Q09/Q11 e testar download/anexo permitido e negado |
| AUD-13 / média | `functions/src/relatorios.ts`; `frontend/src/lib/pdf.ts` | Transporte atual é base64, enquanto exemplos antigos do LaTeX usavam Storage | Documentação atual distingue transporte; testar memória, limites, filtros e unidades |
| AUD-14 / média | `frontend/src/components/reagentes/ModalEtiquetasReagentes.tsx`; `functions/src/relatorios.ts` | Código de etiquetas existe; planejamento de protótipo não prova conformidade física/escopo de toda a aplicação | Casos de offset, limite, deduplicação, escopo e leitura real do Code 128 |
| AUD-15 / média | Seção 6 e funções exportadas em `functions/src/index.ts` | Materializações documentadas não são, só por isso, jobs implantados/validados | Inventário de produtores, idempotência, reconciliação e cobertura por período |
| AUD-16 / média | `flake.nix`; `COMPILACAO_NIX_LCQUI.md` | Flake atual não fornece TeX Live apesar da premissa do guia antigo | Instrução de compilação documental corrigida, saída isolada |

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
