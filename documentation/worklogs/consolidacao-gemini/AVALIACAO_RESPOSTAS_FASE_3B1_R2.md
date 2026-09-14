# AVALIACAO_RESPOSTAS_FASE_3B1_R2

Data: 2026-09-14  
Branch: `docs/realinhamento-especificacao-lcqui`  
HEAD de entrada: `bed02aed8d89233cac41e89c13e8e376716503b0`

## Resultado executivo

As respostas humanas de `DECISOES_DOCUMENTAIS_FASE_3B1_LCQUI.md` fecham as seis escolhas de domínio DDP-3B1-01 a DDP-3B1-06. Não foi encontrada nova escolha institucional genuína nem conflito entre decisões humanas sem precedência. Portanto, **não é aberta nova DDP**.

Entretanto, nenhuma das seis respostas deve ser aplicada literalmente: todas contêm ao menos um detalhe técnico que precisa ser corrigido para preservar as decisões humanas já tomadas e os achados da auditoria de `da1bb4a5`.

Princípios preservados: `desconhecido != zero`; `não mensurável != zero`; peso ausente não é peso 0; extravio não é descarte físico; `requer_descarte` deve ter semântica única; `specId` isolado não é presumido globalmente único; data civil e agendamento usam `America/Sao_Paulo`; retry não pode apagar estado de leitura de notificação; denormalização exige fonte canônica e reconciliação; Q06 não é redesenhada silenciosamente.

---

# DDP-3B1-01 — Extravio recuperável e reencontro em quarentena

**DECISÃO HUMANA:** frasco extraviado pode ser reencontrado e voltar ao fluxo apenas via quarentena; o empréstimo que originou o extravio permanece `ENCERRADO_EXTRAORDINARIO` e não é reaberto.

**INTERPRETAÇÃO CORRETA:** `EXTRAVIADO` é condição física/operacional distinta de `DESCARTADO`. Enquanto extraviado, o frasco não está sob custódia e não pode ser elegível para retirada. Reencontro cria novo fato auditável e reintroduz o frasco em quarentena, sem apagar o sinistro anterior.

**VEREDITO:** `APROVADA_COM_AJUSTES`.

**CONFLITOS COM DECISÕES ANTERIORES:** nenhum no domínio. Os exemplos `disponibilidade=DISPONIVEL` durante extravio e `peso_atual=0` conflitam com semânticas já validadas e são rejeitados como materialização.

**AJUSTES TÉCNICOS NECESSÁRIOS:**
- `EXTRAVIADO` deve implicar inelegibilidade para retirada; não usar `DISPONIVEL` com o significado de “livre para retirada”.
- não alterar `peso_atual` para 0; preservar a última medição confirmada e sua data, ou manter valor ausente quando inexiste medição válida.
- `REENCONTRADO_APOS_EXTRAVIO` é evento canônico. `reencontrado_em/por`, se mantidos no snapshot do frasco, são projeções do último reencontro, não substitutos do histórico.
- reencontro não apaga `ENCERRADO_EXTRAORDINARIO`, `EXTRAVIOU_EM_EMPRESTIMO`, motivo, ator, instante nem vínculo histórico.
- no reencontro, estado físico observável (`ABERTO`/`FECHADO`) e `em_quarentena=true` são atualizados atomicamente com o evento.

**IMPACTO 3FN:** incluir `EXTRAVIADO` no domínio do estado; manter histórico de extravio/reencontro como fatos temporais; evitar duplicar fatos históricos como única fonte canônica no snapshot atual.

**IMPACTO FIRESTORE:** frasco extraviado permanece não consultável como estoque apto; reencontro exige transação/Cloud Function que valide estado anterior, registre evento e aplique quarentena.

**CONCORRÊNCIA / ATOMICIDADE:** transição `EXTRAVIADO -> ABERTO|FECHADO + em_quarentena=true + evento` deve ser uma unidade atômica; repetir a ação não pode gerar dois reencontros.

**IDEMPOTÊNCIA:** chave/condição por frasco + estado anterior + id da operação; segunda execução retorna o resultado já consolidado sem duplicar evento.

**SEGURANÇA:** somente gestor autorizado do almoxarifado pode registrar reencontro/liberação; Security Rules não autorizam cliente a contornar a função privilegiada.

**INTEGRIDADE E AUDITORIA:** histórico do sinistro é imutável; nenhum reencontro reabre o empréstimo encerrado.

**PERFORMANCE / CUSTO:** impacto baixo; uma escrita transacional e um evento por reencontro.

**UI/UX:** aba de extraviados pode oferecer “Registrar reencontro”; após registro, item aparece em quarentena e não em disponíveis.

**MATERIALIZAÇÕES / RELATÓRIOS:** extraviados e quarentena devem ser categorias distintas; relatórios históricos mantêm o sinistro mesmo após reencontro.

**MIGRAÇÃO / BACKFILL:** não converter `DESCARTADO` histórico em `EXTRAVIADO` sem evidência; somente registros comprovadamente classificados de forma antiga e inequívoca podem ser migrados.

**ARQUIVOS AFETADOS:** Seções 4–11, Fluxo de Reagentes, Relatórios, Consolidação e Contract Cards.

---

# DDP-3B1-02 — Limite de confirmação do wizard

**DECISÃO HUMANA:** Resumo, Especificação válida (com composição atômica quando mistura) e Lote podem existir como entidades completas e reutilizáveis antes do frasco.

**INTERPRETAÇÃO CORRETA:** “Salvar entidade e continuar” é confirmação explícita de entidade completa; avanço puramente visual não é commit implícito. Cancelar o restante não apaga entidades já confirmadas.

**VEREDITO:** `APROVADA_COM_AJUSTES`.

**CONFLITOS COM DECISÕES ANTERIORES:** nenhum. A regra proposta `COUNT(frascos)==0` é insuficiente como política geral de exclusão/desativação e não deve ser adotada isoladamente.

**AJUSTES TÉCNICOS NECESSÁRIOS:**
- excluir/desativar requer ausência de referências impeditivas, não apenas ausência de frascos; verificar composição, lote, histórico, configuração de estoque mínimo, notificações/referências materializadas e demais FKs/refs canônicas.
- preferir desativação lógica quando houver histórico/referências auditáveis.
- não executar padrão “consultar count e depois excluir” fora de transação/controle de concorrência.

**IMPACTO 3FN:** entidades continuam independentes; composição de mistura permanece dependência obrigatória da Especificação.

**IMPACTO FIRESTORE:** criação de cada entidade completa é operação independente; retomada referencia IDs confirmados. Exclusão física só com precondição transacional segura e sem referências impeditivas.

**CONCORRÊNCIA / ATOMICIDADE:** impedir TOCTOU entre `count==0` e criação concorrente de frasco/referência; usar transação, versão/lock lógico ou política de desativação que seja segura sob concorrência.

**IDEMPOTÊNCIA:** salvar etapa deve aceitar idempotency key ou reaproveitar entidade confirmada sem duplicação.

**SEGURANÇA:** somente papéis autorizados criam/desativam catálogo; cliente não executa cascade destrutivo.

**INTEGRIDADE E AUDITORIA:** entidades usadas historicamente não são apagadas de modo a quebrar relatórios ou eventos.

**PERFORMANCE / CUSTO:** retomada por IDs evita recriação; evitar cascatas/consultas globais desnecessárias.

**UI/UX:** diferenciar “Salvar [Entidade] e continuar” de “Próximo”; mostrar claramente quando a entidade já foi persistida.

**MATERIALIZAÇÕES / RELATÓRIOS:** referências históricas devem continuar resolvíveis mesmo após desativação.

**MIGRAÇÃO / BACKFILL:** nenhum backfill obrigatório; revisar órfãos/incompletos legados separadamente.

**ARQUIVOS AFETADOS:** Seções 4, 5, 7, 8, 9, 10/Fluxo, 10/Consolidação, 11 e Contract Cards.

---

# DDP-3B1-03 — localStorage em bancada compartilhada

**DECISÃO HUMANA:** a restrição anterior da UI-13 é substituída exclusivamente para rascunhos de catálogo; tokens, senhas e dados pessoais sensíveis continuam proibidos no `localStorage`.

**INTERPRETAÇÃO CORRETA:** persistência local em bancada compartilhada é decisão aceita com risco residual explícito. UID no nome da chave é organização, não isolamento de segurança.

**VEREDITO:** `APROVADA_COM_AJUSTES`.

**CONFLITOS COM DECISÕES ANTERIORES:** a resposta humana resolve expressamente o conflito com UI-13; a UI-13 deve ser atualizada apenas nessa exceção.

**AJUSTES TÉCNICOS NECESSÁRIOS:**
- whitelist de campos permitidos no rascunho; excluir tokens, senhas, PII, anexos/arquivos de nota fiscal e qualquer segredo.
- dados de nota fiscal/fornecedor só podem ser persistidos localmente quando reduzidos a campos de catálogo não sensíveis definidos na whitelist; não armazenar documento fiscal completo.
- ao autenticar/trocar usuário, nunca restaurar rascunho de UID diferente; oferecer descarte de chaves antigas.
- TTL é verificado na leitura/inicialização; não alegar que o navegador apagará sozinho em 24h.
- limpeza após sucesso, logout e troca de identidade; fechamento abrupto é coberto pelo TTL e pela confirmação explícita de restauração, não por promessa de expurgo imediato.
- tratar múltiplas abas com versão/timestamp para evitar sobrescrita silenciosa; última gravação deve ser detectável.
- XSS continua podendo ler `localStorage`; CSP, escape/sanitização e redução da superfície de scripts são controles complementares.

**IMPACTO 3FN / FIRESTORE:** nenhum dado incompleto é criado no banco.

**CONCORRÊNCIA / ATOMICIDADE:** controle de versão local por rascunho evita perda silenciosa entre abas.

**IDEMPOTÊNCIA:** restauração não deve persistir automaticamente; só repõe estado de formulário até nova confirmação explícita.

**SEGURANÇA:** risco residual documentado; `auth.uid` na chave não é fronteira de segurança.

**INTEGRIDADE E AUDITORIA:** rascunho local não integra trilha oficial até confirmação no servidor.

**PERFORMANCE / CUSTO:** reduz writes e retrabalho; custo Firestore zero enquanto rascunho.

**UI/UX:** banner Restaurar/Descartar; indicar idade do rascunho; não restaurar automaticamente em terminal compartilhado.

**MATERIALIZAÇÕES / RELATÓRIOS:** nenhum impacto antes da confirmação.

**MIGRAÇÃO / BACKFILL:** remover chaves antigas incompatíveis por versão de schema.

**ARQUIVOS AFETADOS:** UI-01/05/06/13, ALM-01/02, Consolidação, Segurança e Contract Cards.

---

# DDP-3B1-04 — Semântica de conteudo_nominal

**DECISÃO HUMANA:** `conteudo_nominal` é a quantidade original declarada no rótulo/fabricante; saldo atual de frasco aberto é conceito distinto e pode ser desconhecido.

**INTERPRETAÇÃO CORRETA:** nominal é atributo relativamente estável da embalagem/produto, não saldo restante. `NULL` significa nominal fisicamente desconhecido/ilegível, nunca saldo zero.

**VEREDITO:** `APROVADA_COM_AJUSTES`.

**CONFLITOS COM DECISÕES ANTERIORES:** resolve a ambiguidade encontrada na auditoria; usos antigos que tratavam nominal como saldo devem ser corrigidos.

**AJUSTES TÉCNICOS NECESSÁRIOS:**
- permitir `conteudo_nominal NULL` somente quando o valor original não é conhecido; se rótulo diz 500 mL, preservar 500 mL mesmo em frasco aberto.
- não derivar estoque disponível de frasco aberto a partir do nominal.
- `peso_frasco_vazio=NULL` e saldo desconhecido não anulam o nominal conhecido.
- relatórios devem distinguir nominal, medidas conhecidas e cobertura incompleta.

**IMPACTO 3FN:** dicionário do campo deve declarar a grandeza sem ambiguidade.

**IMPACTO FIRESTORE:** mesma semântica; evitar denormalizações chamadas “saldo” que copiem nominal.

**CONCORRÊNCIA / ATOMICIDADE:** sem requisito especial além das operações de pesagem já contratadas.

**IDEMPOTÊNCIA:** atualizações do cadastro não recalculam nominal a cada pesagem.

**SEGURANÇA:** sem impacto específico.

**INTEGRIDADE E AUDITORIA:** valores legados não devem ser reinterpretados automaticamente; proveniência deve ser preservada quando ambígua.

**PERFORMANCE / CUSTO:** nenhum impacto relevante.

**UI/UX:** rotular como “Conteúdo nominal do rótulo/fabricante”; saldo desconhecido é exibido como “desconhecido”, não `0`.

**MATERIALIZAÇÕES / RELATÓRIOS:** totais que dependem de saldo não usam nominal como substituto.

**MIGRAÇÃO / BACKFILL:** classificar legados por semântica comprovável; onde não for possível provar, não converter silenciosamente.

**ARQUIVOS AFETADOS:** Seções 4–10, relatórios e Contract Cards.

---

# DDP-3B1-05 — Limiar de escassez por Especificação × Almoxarifado

**DECISÃO HUMANA:** existe configuração explícita por par necessário Especificação × Almoxarifado; somente pares configurados compõem o universo monitorado.

**INTERPRETAÇÃO CORRETA:** configuração representa intenção de estocar naquela unidade. Limiar é propriedade da relação, não da Especificação global.

**VEREDITO:** `APROVADA_COM_AJUSTES`.

**CONFLITOS COM DECISÕES ANTERIORES:** nenhum. Pseudocódigo proposto repete erros técnicos rejeitados: `specId` isolado e sobrescrita destrutiva de notificações em retry.

**AJUSTES TÉCNICOS NECESSÁRIOS:**
- identidade canônica da especificação no Firestore é composta/não ambígua: `resumoId + specId` ou caminho completo; `specId` isolado só pode ser usado se contrato explícito de unicidade global vier a existir.
- documento de configuração deve armazenar `id_resumo_reagente` + `id_especificacao_reagente`; id do documento pode ser determinístico a partir da identidade composta sem colisão.
- `qtd_limiar_escassez=0` significa monitoramento configurado sem alerta para quantidades não negativas; manter `notificacao_ativa`/`ativo` com semântica clara.
- pares removidos/desativados deixam de gerar alertas; não apagar histórico de notificações.
- spec ou almoxarifado desativado suspende emissão; estoque zerado continua sendo contado como zero e deve alertar quando `0 < limiar`.
- job percorre K configurações ativas, filtra gestores/vínculos ativos, conta apenas frascos aptos segundo o contrato vigente e usa índices documentados.
- notifId determinístico inclui identidade completa da especificação, almoxarifado, data civil em `America/Sao_Paulo` e destinatário.
- criação é `create`/precondition-exists=false ou transação equivalente; retry que encontra documento existente não altera `lida`, `lida_em`, expiração ou interação do usuário.
- BulkWriter precisa registrar falhas por operação, retry seletivo e resumo auditável; `close()` sozinho não constitui prova documental de sucesso individual.

**IMPACTO 3FN:** tabela associativa com PK `(id_especificacao_reagente, id_almoxarifado)` é adequada no modelo relacional, onde o ID da Especificação é chave relacional canônica.

**IMPACTO FIRESTORE:** subcoleção por almoxarifado é válida, mas refs para Especificação usam identidade completa; campos denormalizados de descrição não são fonte canônica.

**CONCORRÊNCIA / ATOMICIDADE:** atualização da configuração pode correr com o job; cada execução lê snapshot coerente suficiente e a emissão é idempotente por chave determinística.

**IDEMPOTÊNCIA:** retry nunca ressuscita notificação lida nem renova notificação antiga; no máximo confirma a existência do evento daquele contexto/data.

**SEGURANÇA:** somente gestores autorizados configuram limiar da unidade; destinatários devem estar ativos e vinculados ativamente.

**INTEGRIDADE E AUDITORIA:** guardar identidade completa, quantidade observada, limiar e instante/competência da emissão.

**PERFORMANCE / CUSTO:** complexidade O(K) em pares configurados; ainda há uma agregação por par. Documentar custo e considerar materialização incremental somente se medição futura justificar.

**UI/UX:** configuração por unidade/especificação, inclusive limiar 0 com explicação de que desativa alerta quantitativo enquanto mantém o par configurado.

**MATERIALIZAÇÕES / RELATÓRIOS:** relatórios de escassez usam a mesma identidade e regra de elegibilidade do job.

**MIGRAÇÃO / BACKFILL:** não criar A×E. Backfill somente de pares já decididos/observáveis; valores default não são inventados para unidades sem configuração.

**ARQUIVOS AFETADOS:** Seções 4–11, Jobs, Relatórios, Consolidação e Contract Cards.

---

# DDP-3B1-06 — Retorno esgotado e tara após higienização

**DECISÃO HUMANA:** Momento 1 pesa o frasco devolvido antes da higienização e fecha o empréstimo/Q06; Momento 2, separado, pode aferir tara limpa após higienização quando o recipiente for reaproveitado.

**INTERPRETAÇÃO CORRETA:** massa removida na lavagem não integra consumo didático. A tara posterior é aferição técnica do recipiente, não peso de retorno do empréstimo encerrado.

**VEREDITO:** `APROVADA_COM_AJUSTES`.

**CONFLITOS COM DECISÕES ANTERIORES:** nenhum no domínio. O enum novo `AJUSTE_TARA_POS_HIGIENIZACAO` é desnecessário se o evento canônico `AJUSTE` com `campo_ajustado=peso_frasco_vazio` já representa o fato.

**AJUSTES TÉCNICOS NECESSÁRIOS:**
- preservar Q06: `max(0, peso_saida - peso_retorno)` somente com duas leituras válidas do empréstimo.
- retorno esgotado ainda exige devolução física e `peso_retorno` real no balcão.
- tara pós-higienização nunca substitui `peso_retorno` no empréstimo já fechado.
- reutilizar evento canônico `AJUSTE` quando suficiente, com motivo `AFERICAO_TARA_POS_HIGIENIZACAO`, `campo_ajustado`, valor anterior/novo, ator e instante; criar enum novo só se o vocabulário atual não puder expressar o fato sem perda semântica.

**IMPACTO 3FN:** `peso_frasco_vazio` pode ser atualizado por aferição posterior; histórico registra mudança sem reescrever empréstimo.

**IMPACTO FIRESTORE:** atualização de tara e evento é atômica; empréstimo permanece imutável após fechamento, salvo mecanismo explícito de correção auditada já existente.

**CONCORRÊNCIA / ATOMICIDADE:** transação impede duas aferições concorrentes de sobrescreverem a trilha sem valor anterior correto.

**IDEMPOTÊNCIA:** operação identificada por id/chave de comando; retry não cria ajustes duplicados.

**SEGURANÇA:** apenas papel autorizado executa aferição de tara.

**INTEGRIDADE E AUDITORIA:** manter peso_saida, peso_retorno, consumo e tara posterior como fatos distintos com timestamps próprios.

**PERFORMANCE / CUSTO:** impacto mínimo.

**UI/UX:** fechamento do empréstimo termina no balcão; ação de aferição posterior fica separada e não bloqueia fila de devolução.

**MATERIALIZAÇÕES / RELATÓRIOS:** consumo usa somente medidas do empréstimo; relatórios de tara usam a aferição mais recente válida sem retroagir consumo.

**MIGRAÇÃO / BACKFILL:** não recalcular consumos passados com tara posteriormente aferida.

**ARQUIVOS AFETADOS:** Seções 4–10, UI-07, ALM-06, Fluxo de Reagentes, Relatórios e Contract Cards.

---

# GATE SEMÂNTICO — FECHAMENTO 3B.1 / RETOMADA 3B

DDP-3B1-01: APROVADA_COM_AJUSTES  
DDP-3B1-02: APROVADA_COM_AJUSTES  
DDP-3B1-03: APROVADA_COM_AJUSTES  
DDP-3B1-04: APROVADA_COM_AJUSTES  
DDP-3B1-05: APROVADA_COM_AJUSTES  
DDP-3B1-06: APROVADA_COM_AJUSTES

Decisões humanas preservadas: SIM  
Ajustes técnicos realizados no parecer: SIM  
Novas dúvidas: NENHUMA  
Conflitos humanos não resolvidos: NENHUM  
3FN: PASS com ajustes listados  
Firestore: PASS com identidade composta e fontes canônicas  
Identidade: PASS condicionado a `resumoId+specId`/path completo no Firestore  
NULL vs zero: PASS  
Concorrência: PASS condicionado a operações transacionais/precondições  
Atomicidade: PASS condicionado aos contratos acima  
Idempotência: PASS condicionado a create/precondition para notificação e command IDs nas operações mutáveis  
Segurança: PASS condicionado à whitelist de rascunhos e autorização server-side  
UI/UX: PASS com distinções explicitadas  
Auditoria: PASS  
Jobs: PASS com revisão do pseudocódigo  
Índices: DEVEM SER DOCUMENTADOS NA IMPLEMENTAÇÃO  
Materializações: PASS, sem transformar denormalização em fonte canônica  
Relatórios: PASS com desconhecido distinto de zero  
Migração/backfill: PASS sem inferência destrutiva  
Q06: PASS, preservada  
Regressões: nenhuma autorizada  
Decisões anteriores preservadas: SIM

`SEMANTIC_GATE = PASS`

## Conclusão

**FASE 3B.1 — RODADA 2: FECHADA PARA IMPLEMENTAÇÃO DOCUMENTAL.**

Este PASS autoriza criar o plano de implementação e retomar o Lote 3B. Ele não significa que o pseudocódigo ou os exemplos técnicos de `DECISOES_DOCUMENTAIS_FASE_3B1_LCQUI.md` foram aprovados literalmente.