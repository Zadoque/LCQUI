# AVALIACAO_RESPOSTAS_FASE_3B1_R2

Data: 2026-09-14  
Branch: `docs/realinhamento-especificacao-lcqui`  
HEAD de entrada da rodada: `bed02aed8d89233cac41e89c13e8e376716503b0`  
Revisão de precisão: R2.1

## Resultado executivo

As respostas humanas de `DECISOES_DOCUMENTAIS_FASE_3B1_LCQUI.md` fecham as seis escolhas de domínio DDP-3B1-01 a DDP-3B1-06. Não foi encontrada nova escolha institucional genuína nem conflito entre decisões humanas sem precedência. Portanto, **não é aberta nova DDP**.

Nenhuma resposta deve ser aplicada literalmente: detalhes técnicos ainda precisam ser compatibilizados com o modelo normativo e com os achados de `da1bb4a5`. Em particular, esta revisão R2.1 corrige duas imprecisões do parecer anterior: (a) a situação de `disponibilidade` durante `EXTRAVIADO` não deve ser fechada pela invenção silenciosa de um novo enum nem por uma atribuição semanticamente enganosa; e (b) desativação lógica e exclusão física são operações distintas e não compartilham as mesmas precondições.

Princípios preservados: `desconhecido != zero`; `não mensurável != zero`; peso ausente não é peso 0; extravio não é descarte físico; `requer_descarte` precisa de semântica única; `specId` isolado não é presumido globalmente único; data institucional usa `America/Sao_Paulo`; retry não pode apagar interação do usuário; denormalização precisa de fonte canônica/reconciliação; Q06 não pode ser redesenhada silenciosamente.

---

# DDP-3B1-01 — Extravio recuperável e reencontro em quarentena

**DECISÃO HUMANA:** frasco extraviado pode ser reencontrado e voltar ao fluxo somente via quarentena. O empréstimo no qual ocorreu o extravio permanece `ENCERRADO_EXTRAORDINARIO` e não é reaberto.

**INTERPRETAÇÃO CORRETA:** `EXTRAVIADO` é condição física/operacional distinta de `DESCARTADO`. Enquanto extraviado, o frasco não está sob custódia e é obrigatoriamente inelegível para retirada e para o saldo disponível. Reencontro é novo fato auditável e não apaga o sinistro.

**VEREDITO:** `APROVADA_COM_AJUSTES`.

**CONFLITOS COM DECISÕES ANTERIORES:** nenhum no domínio. `peso_atual=0` para ausência e `disponibilidade=DISPONIVEL` entendida como “apto para retirada” são incompatíveis com a semântica já auditada.

**AJUSTES TÉCNICOS NECESSÁRIOS:**
- `EXTRAVIADO` deve ser excluído de toda consulta/predicado de elegibilidade operacional e de saldo disponível.
- O modelo atual de `disponibilidade` deve ser reavaliado antes da alteração normativa. Se o domínio vigente continuar apenas `DISPONIVEL|EMPRESTADO`, **não inventar `INDISPONIVEL` silenciosamente**.
- Antes de mudar o enum, rastrear todos os consumidores de `disponibilidade` nas Seções 4–11 e determinar seu significado canônico: (A) ocupação/vínculo de empréstimo ou (B) disponibilidade operacional. Se for (A), o bloqueio operacional pode derivar de `estado_fisico_frasco=EXTRAVIADO` somado ao predicado de elegibilidade; se for (B), o domínio precisa ser ampliado ou remodelado explicitamente. A escolha deve ser registrada como decisão técnica fundamentada e propagada de modo consistente; só abrir nova DDP se a leitura normativa revelar escolha institucional real impossível de derivar.
- Não alterar `peso_atual` para 0; preservar última medição válida/data ou ausência quando não existir medição confirmada.
- `REENCONTRADO_APOS_EXTRAVIO` é o fato histórico canônico. `reencontrado_em/por`, se mantidos no snapshot do frasco, são apenas projeções do último reencontro.
- Reencontro não apaga `ENCERRADO_EXTRAORDINARIO`, `EXTRAVIOU_EM_EMPRESTIMO`, motivo, ator, instante ou vínculo histórico.
- Reencontro atualiza estado físico observável (`ABERTO|FECHADO`), quarentena e evento em uma unidade atômica.

**IMPACTO 3FN:** adicionar `EXTRAVIADO` ao domínio do estado físico; história de extravio/reencontro permanece canônica no histórico; qualquer alteração no domínio de `disponibilidade` só ocorre após o checkpoint semântico acima.

**IMPACTO FIRESTORE:** consultas de estoque apto sempre excluem `EXTRAVIADO`; reencontro é operação server-side/transacional. Não usar campo denormalizado isolado para contradizer o estado físico.

**CONCORRÊNCIA / ATOMICIDADE:** encerramento extraordinário + estado de extravio devem ser consistentes; reencontro atualiza snapshot + histórico atomicamente. Dois reencontros concorrentes não podem criar dois fatos válidos.

**IDEMPOTÊNCIA:** command/idempotency key ou precondição de estado anterior; retry retorna resultado consolidado sem novo evento.

**SEGURANÇA:** somente papel autorizado do almoxarifado registra reencontro/liberação; cliente não contorna backend privilegiado.

**INTEGRIDADE E AUDITORIA:** sinistro e empréstimo extraordinariamente encerrado são imutáveis; reencontro é evento posterior.

**PERFORMANCE / CUSTO:** baixo impacto por operação; índices somente para consultas reais.

**UI/UX:** extraviado nunca aparece como “disponível para retirada”; reencontrado aparece em quarentena até liberação.

**MATERIALIZAÇÕES / RELATÓRIOS:** contagens de extraviado, quarentena e estoque apto são distintas.

**MIGRAÇÃO / BACKFILL:** não converter `DESCARTADO` histórico em `EXTRAVIADO` sem evidência inequívoca.

**ARQUIVOS AFETADOS:** Seções 4–11, Fluxo de Reagentes, Relatórios, Consolidação e Contract Cards.

---

# DDP-3B1-02 — Limite de confirmação do wizard

**DECISÃO HUMANA:** Resumo, Especificação válida (com composição obrigatória quando mistura) e Lote podem existir como entidades completas e reutilizáveis antes do frasco.

**INTERPRETAÇÃO CORRETA:** “Salvar [Entidade] e continuar” confirma uma entidade completa. Cancelar etapas posteriores não apaga entidades já confirmadas. Desativação lógica e exclusão física devem ser tratadas separadamente.

**VEREDITO:** `APROVADA_COM_AJUSTES`.

**CONFLITOS COM DECISÕES ANTERIORES:** nenhum. `COUNT(frascos)==0` é insuficiente como autorização geral de exclusão e não é precondição universal para desativação lógica.

**AJUSTES TÉCNICOS NECESSÁRIOS:**
- **Desativação lógica (`ativo=false`)**: preserva a entidade e suas referências históricas. Pode ocorrer mesmo quando existem referências anteriores, desde que o contrato impeça novos usos incompatíveis e preserve leitura/relatórios/auditoria. Não exigir ausência de todas as referências históricas como condição para desativar.
- **Exclusão física**: somente quando não houver referências impeditivas canônicas/históricas e quando o domínio permitir apagar o registro. Verificar frascos, lotes, composição, estoque mínimo, histórico, notificações/referências e demais FKs/refs relevantes.
- Não usar `COUNT(frascos)==0` como única condição de exclusão.
- Não executar “consulta e depois delete” sujeito a TOCTOU; exclusão física precisa de transação/precondição/lock ou ser simplesmente proibida quando a garantia não puder ser feita de forma robusta.
- Entidades desativadas permanecem resolvíveis por referências históricas e não somem de relatórios antigos.

**IMPACTO 3FN:** entidades continuam independentes; composição de mistura é dependência obrigatória da Especificação. `ativo` representa ciclo de vida operacional, não inexistência histórica.

**IMPACTO FIRESTORE:** criação por entidade completa; retomada por IDs confirmados. Desativação é update autorizado; exclusão física, quando existir, é operação privilegiada com checagem integral de referências e concorrência.

**CONCORRÊNCIA / ATOMICIDADE:** criação concorrente de nova referência deve ser compatível com `ativo=false`; exclusão física não pode sofrer TOCTOU. Regras/backend devem impedir novas associações a entidade inativa quando o contrato assim exigir.

**IDEMPOTÊNCIA:** salvar etapa deve evitar duplicação; desativar uma entidade já inativa é operação idempotente; delete retry deve ter precondição apropriada.

**SEGURANÇA:** papéis autorizados criam/desativam; cliente não executa cascade destrutivo.

**INTEGRIDADE E AUDITORIA:** histórico nunca quebra porque uma entidade foi desativada. Exclusão física não pode remover evidência necessária.

**PERFORMANCE / CUSTO:** desativação evita cascatas e consultas globais desnecessárias; exclusão física é excepcional.

**UI/UX:** distinguir “Salvar e continuar”, “Desativar” e eventual “Excluir definitivamente”; não apresentar as duas últimas como sinônimos.

**MATERIALIZAÇÕES / RELATÓRIOS:** entidade inativa deixa de aparecer como opção para novos vínculos, mas continua resolvendo fatos históricos.

**MIGRAÇÃO / BACKFILL:** auditar órfãos/incompletos legados sem inferir intenção; não apagar em massa.

**ARQUIVOS AFETADOS:** Seções 4, 5, 7, 8, 9, 10/Fluxo, 10/Consolidação, 11 e Contract Cards.

---

# DDP-3B1-03 — localStorage em bancada compartilhada

**DECISÃO HUMANA:** a restrição anterior da UI-13 é substituída exclusivamente para rascunhos de catálogo; credenciais, tokens, PII e dados sensíveis continuam proibidos em `localStorage`.

**INTERPRETAÇÃO CORRETA:** persistência local em bancada compartilhada é risco residual aceito. UID no nome da chave é organização, não isolamento de segurança.

**VEREDITO:** `APROVADA_COM_AJUSTES`.

**AJUSTES TÉCNICOS NECESSÁRIOS:** whitelist de campos; excluir tokens, PII, anexos/documento fiscal completo/segredos; nunca restaurar rascunho de UID diferente; TTL verificado na leitura/boot; limpeza em sucesso/logout/troca de identidade; schema version; controle de múltiplas abas; XSS/CSP/sanitização como controles complementares; restauração nunca persiste no servidor automaticamente.

**IMPACTO 3FN / FIRESTORE:** nenhum rascunho incompleto no banco.

**CONCORRÊNCIA / ATOMICIDADE:** versão/timestamp evita perda silenciosa entre abas.

**IDEMPOTÊNCIA:** restaurar só repõe formulário; confirmação no servidor continua explícita.

**SEGURANÇA:** `auth.uid` na chave não é fronteira de segurança.

**INTEGRIDADE E AUDITORIA:** rascunho local não pertence à trilha oficial.

**PERFORMANCE / CUSTO:** zero writes Firestore enquanto rascunho.

**UI/UX:** Restaurar/Descartar com idade do rascunho; não restaurar automaticamente em terminal compartilhado.

**MIGRAÇÃO / BACKFILL:** expurgar chaves antigas/incompatíveis por versão.

**ARQUIVOS AFETADOS:** UI-01/05/06/13, ALM-01/02, Consolidação, Segurança e Contract Cards.

---

# DDP-3B1-04 — Semântica de conteudo_nominal

**DECISÃO HUMANA:** `conteudo_nominal` é a quantidade original declarada no rótulo/fabricante; saldo atual/restante é conceito distinto e pode ser desconhecido.

**VEREDITO:** `APROVADA_COM_AJUSTES`.

**AJUSTES TÉCNICOS NECESSÁRIOS:** `NULL` somente quando nominal original é desconhecido/ilegível; preservar 500 mL do rótulo mesmo em frasco aberto; não usar nominal como saldo; tara/saldo desconhecidos não anulam nominal conhecido; UI, relatórios e materializações devem propagar a distinção; legados não são reinterpretados sem proveniência.

**IMPACTO 3FN/FIRESTORE:** dicionário sem ambiguidade e nenhuma projeção “saldo” derivada do nominal.

**CONCORRÊNCIA / IDEMPOTÊNCIA:** pesagens não recalculam nominal.

**INTEGRIDADE / RELATÓRIOS:** desconhecido não vira zero; agregados informam cobertura quando necessário.

**MIGRAÇÃO / BACKFILL:** somente conversão comprovável; sem inferência destrutiva.

**ARQUIVOS AFETADOS:** Seções 4–10, relatórios e Contract Cards.

---

# DDP-3B1-05 — Limiar por Especificação × Almoxarifado

**DECISÃO HUMANA:** existe configuração explícita por par necessário Especificação × Almoxarifado; somente pares configurados pertencem ao universo monitorado.

**VEREDITO:** `APROVADA_COM_AJUSTES`.

**AJUSTES TÉCNICOS NECESSÁRIOS:**
- identidade canônica Firestore não ambígua: `resumoId+specId` ou path/reference completo; `specId` isolado apenas se contrato explícito futuro garantir unicidade global.
- configuração armazena identidade completa; descrição é projeção.
- `qtd_limiar_escassez=0` é permitido e semanticamente explicado; `ativo/notificacao_ativa` possuem papéis distintos.
- par/spec/almoxarifado inativo suspende emissão; estoque zero continua zero real.
- job percorre K pares configurados; filtra gestores/vínculos ativos; usa índices correspondentes às queries reais.
- notifId determinístico inclui identidade completa, almoxarifado, data civil `America/Sao_Paulo` e destinatário.
- criação de notificação usa `create`/precondition `exists=false` ou transação equivalente; retry não altera `lida`, `lida_em`, `expira_em` ou interação do usuário.
- BulkWriter precisa capturar falhas por operação e retry seletivo.

**IMPACTO 3FN:** tabela associativa com PK composta no relacional; limiar não pertence à Especificação global.

**IMPACTO FIRESTORE:** subcoleção por almoxarifado é válida desde que identidade da Especificação seja completa.

**CONCORRÊNCIA / IDEMPOTÊNCIA:** execução repetida no mesmo contexto/data não produz efeito destrutivo.

**SEGURANÇA:** só gestores autorizados configuram a unidade; destinatários/vínculos ativos.

**PERFORMANCE / CUSTO:** melhora estrutural A×E -> K, sem alegar economia concreta sem medição; uma agregação por par ainda tem custo.

**MIGRAÇÃO / BACKFILL:** não criar A×E nem default inventado; só criar pares cuja intenção e limiar sejam demonstráveis.

**ARQUIVOS AFETADOS:** Seções 4–11, Jobs, Relatórios, Consolidação e Contract Cards.

---

# DDP-3B1-06 — Retorno esgotado e tara após higienização

**DECISÃO HUMANA:** `peso_retorno` antes da higienização fecha o empréstimo e Q06; tara limpa posterior é aferição técnica separada.

**VEREDITO:** `APROVADA_COM_AJUSTES`.

**AJUSTES TÉCNICOS NECESSÁRIOS:** preservar Q06 com duas leituras válidas; tara posterior nunca substitui `peso_retorno`; reutilizar `AJUSTE` + `campo_ajustado=peso_frasco_vazio` se o vocabulário existente for suficiente; atualização da tara + histórico é atômica; duas aferições concorrentes/retry não duplicam evento nem perdem valor anterior; somente papel autorizado executa.

**INTEGRIDADE E AUDITORIA:** `peso_saida`, `peso_retorno`, consumo e tara posterior são fatos distintos com instantes próprios.

**MATERIALIZAÇÕES / RELATÓRIOS:** tara posterior não recalcula consumo histórico.

**MIGRAÇÃO / BACKFILL:** sem recomputação retroativa de Q06.

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
Novas dúvidas de domínio: NENHUMA  
Conflitos humanos não resolvidos: NENHUM  
Checkpoint técnico obrigatório antes de editar DDP-3B1-01: semântica de `disponibilidade` rastreada transversalmente; não inventar enum silenciosamente  
Desativação lógica x exclusão física: contratos separados  
NULL vs zero: PASS  
Identidade Firestore: PASS com identidade não ambígua  
Concorrência/atomicidade/idempotência: PASS condicionado aos contratos acima  
Segurança: PASS condicionado às autorizações/whitelist  
Jobs: PASS com revisão do pseudocódigo  
Q06: PASS, preservada  
Decisões anteriores preservadas: SIM

`SEMANTIC_GATE = PASS`

## Conclusão

**FASE 3B.1 — RODADA 2 / REVISÃO R2.1: FECHADA PARA IMPLEMENTAÇÃO DOCUMENTAL.**

O PASS autoriza o plano e a retomada do Lote 3B. Não aprova literalmente pseudocódigo ou exemplos técnicos das respostas humanas. O checkpoint sobre a semântica de `disponibilidade` é uma verificação técnica pré-implementação e não constitui, por si só, nova DDP.