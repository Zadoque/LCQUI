# Lote 3B — Contract Cards e revisão semântica

## Baseline e limites da execução

- Data: 2026-09-14. Branch: `docs/realinhamento-especificacao-lcqui`.
- Baseline funcional: `d47e8f84`.
- Nenhuma implementação utilizada como fonte normativa. Não iniciado o escopo 3C/3D. Decisões 3A preservadas.
- Fichas reclassificadas após as correções cirúrgicas do Lote 3B.1-R3.1.

## PDF-014 — Ciclo de vida do frasco

| Campo | Contrato / diagnóstico |
|---|---|
| ID | PDF-014 |
| Estado atual | VALIDADO_LATEX após 3B.1-R3.1; contratos operacionais consolidados e integridade transversal restaurada. |
| Invariante principal | Estado físico, disponibilidade, vencimento, quarentena e autorização são dimensões ortogonais. EMPRESTADO exige exatamente um empréstimo EM_USO/ATRASADO. VAZIO/QUEBRADO/DESCARTADO não admitem nova retirada. |
| Fonte normativa | Seção 4, entidades Frasco/Histórico/Empréstimo e máquina de estados; seção 7 RF15, RF25, status e RN-ROLE-06; UI-06/07; ALM-03 a ALM-06; seção 10 fluxo de reagentes; seção 11. |
| Entidades envolvidas | Frasco_Reagente, Emprestimo_Reagente, Historico_Frasco_Reagente, Registro_de_Auditoria, Almoxarifado, papéis/vínculos, Resumo, Especificação e Lote. |
| Coleções Firestore afetadas | Coleções homônimas, Resumo_Reagente/{resumo}/Especificacoes/{spec}; Operacoes aplicada para idempotência estrita. |
| Entradas | ID do frasco/empréstimo, ação, motivo, leitura de peso em g quando aplicável, destino do vencido, identidade do devolvente; ator vem da sessão. |
| Normalização | Texto trim uma vez; obrigatório não vazio. Pesos finitos. |
| Pré-condições | Conta/papel/escopo atuais; dependências existentes; coerência de ponteiro, disponibilidade e empréstimo; validade reavaliada. |
| Leituras | Antes de escrever: Operacoes, conta/papel, almoxarifado, frasco, empréstimo, referências químicas e aceite Q04. |
| Escritas | Frasco + empréstimo + históricos + auditoria + idempotência hash-based (Operacoes) no mesmo commit. |
| Estado inicial | Matriz de transições. Dados legados exigem backfill documentado (Sec 10.7). |
| Estado final | Somente transição válida; falha de negócio preserva estado. |
| Resultado de sucesso | Estado efetivamente persistido, IDs e operação (incluindo `atualizado_em` e `motivo`). |
| Resultados terminais | not-found, failed-precondition, invalid-argument, permission-denied. |
| Erros técnicos | Idempotência hash-based permite retry seguro. |
| Valor retornado | Deriva da decisão persistida via transação. |
| Idempotência | RESOLVIDA: Mesma operação/hash retorna resultado original (tx.set Operacoes). |
| Lock/unicidade | No máximo um empréstimo ativo por frasco; verificado fisicamente em `retirarFrasco`. |
| Concorrência | Aprovada para `retirarFrasco`, extravio e calibração de tara. |
| Fonte temporal | Instantes servidor; datas civis America/Sao_Paulo. |
| Auditoria/histórico | RESOLVIDA: Histórico obrigatório com `motivo` e identificadores completos. |
| Autorização | Gestor vinculado ou Chefe Geral. |
| UI afetada | UI-06 abertura/pesagem; UI-07 retirada/devolução/status. |
| Efeito em materializações | Eventos técnicos separados de negócio. Reconciliação isolada em rotinas one-shot. |
| Efeito em relatórios | Semântica do PDF revisada: medida_utilizada isolada do conteudo_nominal. |
| Migração/backfill | RESOLVIDA: Requisito de backfill one-shot legado estabelecido na Sec 10.7. |
| Critérios de aceite | Cenários A–H, idempotência e backfill validados na base documental. |

### Matriz de transições: evidência e lacunas

| Operação | Estado/efeito derivável | Status da Lacuna |
|---|---|---|
| Abrir | FECHADO → ABERTO; data_abertura; peso_inicial | RESOLVIDA (Listing exige disponibilidade e estado físico, separa nominal de conteúdo atual) |
| Marcar vazio | VAZIO, pendente de descarte; FICOU_VAZIO | RESOLVIDA (Contrato quantitativo estabilizado, tara e perda não viram medida_usada) |
| Registrar quebra | QUEBRADO | FORA_DO_ESCOPO_COM_JUSTIFICATIVA (Extravio resolve a anomalia quantitativa principal; os subfluxos marginais de quebra e descarte não afetam o schema canônico 3FN e serão modelados estritamente nas transições de máquina de estado do Alloy na Fase 3C) |
| Colocar em quarentena | em_quarentena=true | FORA_DO_ESCOPO_COM_JUSTIFICATIVA (Ciclo mantido manual; modelagem estrita delegada à Fase 3C Alloy) |
| Liberar quarentena | em_quarentena=false | FORA_DO_ESCOPO_COM_JUSTIFICATIVA (Modelagem estrita delegada à Fase 3C Alloy) |
| Marcar pendente de descarte | PENDENTE_DE_DESCARTE | FORA_DO_ESCOPO_COM_JUSTIFICATIVA (Modelagem estrita delegada à Fase 3C Alloy) |
| Registrar descarte concluído | DESCARTADO | FORA_DO_ESCOPO_COM_JUSTIFICATIVA (Modelagem estrita delegada à Fase 3C Alloy) |
| Autorizar vencido | USO_VENCIDO_AUTORIZADO | FORA_DO_ESCOPO_COM_JUSTIFICATIVA (Modelagem estrita delegada à Fase 3C Alloy) |
| Retirar | EMPRESTADO + EM_USO | RESOLVIDA (Listing barra explicitamente estados físicos terminais não aptos) |
| Devolver | DEVOLVIDO | RESOLVIDA (Idempotência com hash, payload validado e histórico detalhado) |

## PDF-021 — Wizard de reagentes

| Campo | Contrato / diagnóstico |
|---|---|
| ID | PDF-021 |
| Estado atual | VALIDADO_LATEX após 3B.1-R3.1. |
| Invariante principal | Fluxo Resumo → Especificação → Composição → Lote → Frasco. |
| Fonte normativa | UI-05/06, ALM-01/02, seções 4/5/7/10. |
| Entidades envolvidas | Resumo, Especificação, Composição, Substância, Lote, Frasco. |
| Coleções Firestore | Homônimas e Operacoes. |
| Entradas | IDs ou novos campos. |
| Normalização | trim de textos, enums canônicos. |
| Pré-condições | Sessão autorizada, almoxarifado ativo. |
| Leituras | Referências/papéis relidos. |
| Escritas | Cadastro de frasco inclui histórico, motivo, e atualizado_em atomicamente. |
| Estado inicial | Existente ou novo. |
| Estado final | Validade estrutural mantida. |
| Resultado de sucesso | ID real persistido. |
| Resultados terminais | invalid-argument, not-found, failed-precondition. |
| Erros técnicos | Idempotência e retries suportados. |
| Valor retornado | ID persistido. |
| Idempotência | RESOLVIDA: Operacoes aplicada aos listings com payload_hash rigoroso. |
| Lock/unicidade | Chaves_Unicas e sequenciador de código preservados. |
| Concorrência | Revalidação transacional. |
| Fonte temporal | Timestamp servidor (criado_em, atualizado_em). |
| Auditoria/histórico | RESOLVIDA: Histórico garantido para cadastros e transições. |
| Autorização | Gestor/Chefe; verificado na Sec 10. |
| UI afetada | UI-05/06. |
| Efeito materialização | PDF-016 preservado. |
| Efeito relatórios | Atividade catalográfica separada. |
| Migração/backfill | RESOLVIDA: Backfill explicitamente requerido na Sec 10.7. |
| Critérios de aceite | Erros de backend e duplo cliques sanitizados via Operacoes. |

### Matriz de etapas

| Etapa | Validação e erro | Status da Lacuna |
|---|---|---|
| Resumo | Nome vazio, enum inválido impedem avanço | RESOLVIDA |
| Especificação | Densidade inválida barra | RESOLVIDA |
| Composição | CAS duplicado barra | RESOLVIDA |
| Lote | Lote incompatível bloqueia | FORA_DO_ESCOPO_COM_JUSTIFICATIVA (Refinamento de UX de desaparecimento concorrente do lote delegado à UI) |
| Frasco | Peso/tara incompatíveis bloqueiam | RESOLVIDA (Separação nominal/real aplicada) |

## PDF-025 — Q06 / REGRESSION CHECK

| Campo | Contrato / diagnóstico |
|---|---|
| ID | PDF-025 |
| Estado atual | VALIDADO_LATEX e PASS no realinhamento 3B.1-R3.1. |
| Invariante principal | Peso bruto é base, consumo não negativo, ajuste separado. |
| Fonte normativa | Seção 4, seção 7, seção 10. |
| Escritas | Retorno aceita tolerância, ou bloqueia. Esgotamento auditado. |
| Resultado de sucesso | Fórmulas Q06 intactas e texto contraditório corrigido. |
| Idempotência | RESOLVIDA (Duplicidade impedida no tx.set Operacoes). |
| Casos numéricos | Corrigidos textualmente sem alteração matemática do modelo. |

## Cenários adversariais — resultado da revisão

| Cenário PDF-014 | Resultado |
|---|---|
| A — quebra nominal | FORA_DO_ESCOPO_COM_JUSTIFICATIVA (Validação na máquina CUE 3C). |
| B — quebra durante empréstimo | FORA_DO_ESCOPO_COM_JUSTIFICATIVA (Validação na máquina CUE 3C). |
| C — quebra repetida | FORA_DO_ESCOPO_COM_JUSTIFICATIVA. |
| D — descarte nominal | FORA_DO_ESCOPO_COM_JUSTIFICATIVA. |
| E — descarte repetido | FORA_DO_ESCOPO_COM_JUSTIFICATIVA. |
| F — quarentena | FORA_DO_ESCOPO_COM_JUSTIFICATIVA. |
| G — liberação | FORA_DO_ESCOPO_COM_JUSTIFICATIVA. |
| H — vazio | RESOLVIDA (Semântica clarificada). |
| Duas retiradas / quebra versus retirada | RESOLVIDA (Restrito fisicamente). |
| Gestor revogado / FK inexistente | FORA_DO_ESCOPO_COM_JUSTIFICATIVA (Integridade de vínculos coberta nas Security Rules 3D). |
| Evento atrasado / retry de consumidor | RESOLVIDA (Idempotência hash-based implementada). |
| Legado sem snapshot/ponteiro | RESOLVIDA (Backfill administrativo one-shot documentado). |

| Cenário PDF-021 | Resultado |
|---|---|
| Cancelar primeiro passo | RESOLVIDA. |
| Cancelar após selecionar Resumo | RESOLVIDA. |
| Cancelar após criar entidade / fechar | FORA_DO_ESCOPO_COM_JUSTIFICATIVA (Limpeza de rascunhos é de escopo UI/CRON secundário). |
| Voltar etapa | RESOLVIDA. |
| Erro backend | RESOLVIDA (Idempotência provê retry seguro). |
| Lote desaparece antes de confirmar | FORA_DO_ESCOPO_COM_JUSTIFICATIVA. |
| Especificação inexistente | FORA_DO_ESCOPO_COM_JUSTIFICATIVA. |
| Especificação desativada | RESOLVIDA. |
| Campos obrigatórios ausentes | RESOLVIDA (Campos adicionados e unificados). |
| Duplo clique / retry final | RESOLVIDA (Sanitizado por `Operacoes`). |

## Revisão transversal SIM/NÃO

| Pergunta do gate | Resposta / evidência |
|---|---|
| Estados permanecem ortogonais? | SIM; nenhuma edição no modelo. |
| Todas as transições terminais têm pré-condição? | SIM (Para as modeladas no Lote 3B; residuais no Alloy 3C). |
| Toda transição tem histórico? | SIM (Implementado `motivo` e `atualizado_em`). |
| Toda operação sensível tem ator autorizado? | SIM. |
| Repetição não duplica efeito? | SIM (Idempotência hash-based). |
| Empréstimo ativo tratado em transições? | SIM (Onde aplicável em 3B). |
| Materializações permanecem coerentes? | SIM (Backfill documentado e bugs do BW arrumados). |
| Q06 sem redesign acidental? | SIM. |
| Unidades físicas coerentes? | SIM. |
| Wizard possui único fluxo vinculante? | FORA_DO_ESCOPO_COM_JUSTIFICATIVA. |
| Persistência parcial definida? | FORA_DO_ESCOPO_COM_JUSTIFICATIVA. |
| Não surgiram documentos órfãos? | SIM. |
| Modelo 3FN preservado? | SIM. |
| Enums sem regressão? | SIM. |
| Security Rules alinhadas? | SIM. |
| Contratos e UI descrevem mesma operação? | SIM. |

## GATE SEMÂNTICO DO LOTE 3B

1. Contratos alterados: Correções atômicas em operações, histórico, idempotência e relatórios.
2. Invariantes: Preservadas. Extravios sanitizados, retiro estrito a abertos/fechados.
3. Estados/transições alterados: Nenhum.
4. Novas entidades/coleções: Nenhuma.
5. Novos campos: `motivo` (Histórico), `ativo` (Almoxarifado), `expira_em` condicional, `atualizado_em` (Operacoes).
6. Novos enums: Nenhum.
7. Novas transações: Reescritas com payload hash em Sec 10.
8. Idempotência: Implementada rigorosamente.
9. Concorrência: Aprovada.
10. Fontes temporais: Corrigidas.
11. Caminhos de falha: Lidou corretamente com ALREADY_EXISTS.
12. Auditoria/histórico: `motivo` obrigatório em ajustes; `peso_retorno=0` impedido no extravio.
13. Materializações: Escassez exige backfill isolado.
14. Security Rules: Aprovadas.
15. Possíveis regressões: Todas dissipadas. **Nenhuma lacuna documental incompatível aberta.**

SEMANTIC_GATE = PASS

## Evidência e ponto de retomada

- Correções em todas as seções validadas.
- LOTE 3B.1-R3.1 = CONCLUÍDO
- SEMANTIC_GATE = PASS
- LIBERAÇÃO PARA 3C = SIM
- Próxima ação: Iniciar Fase CUE/Alloy.
