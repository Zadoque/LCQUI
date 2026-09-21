Você está trabalhando no repositório:

`https://github.com/Zadoque/LCQUI`

Branch alvo:

`feat/formal-spec-cue-alloy`

A HEAD observada antes desta tarefa foi:

`25e3825f5045a328e59f17115f2dbbda0710fb26`

Essa SHA é apenas referência de entrada. Antes de modificar qualquer arquivo, confirme a HEAD real da branch e trabalhe sobre o estado atual dela.

# OBJETIVO

Incorporar de forma completa, coerente e transversal as decisões humanas consolidadas para:

* HQ-M2-004;
* HQ-M2-005;
* HQ-M2-006;
* HQ-M2-007;

incluindo uma mudança arquitetural importante em HQ-M2-006:

* eliminar snapshots diários de posição de estoque de reagentes;
* transformar `Resumo_Almoxarifado_Diario` e `Resumo_Reagente_Diario` em materializações exclusivamente de **FLOW**;
* abandonar uma materialized view persistente de estoque atual;
* usar `Frasco_Reagente` como autoridade do estado corrente;
* obter agregados atuais por `count()` / `sum()` server-side via backend;
* proteger essas consultas com Auth, RBAC, App Check, rate limit e cache lazy de curta duração;
* fazer o cache expirar por TTL máximo **ou por invalidação causada por mutações relevantes**;
* manter correções históricas dentro de um conjunto fechado de contratos, sem mecanismo genérico de replay até o presente.

Também deve ser reconciliado o fluxo de devolução quando uma medição real contradiz a tara armazenada. O sistema **nunca deve obrigar ou incentivar o gestor a alterar/falsificar o peso medido para que uma devolução seja aceita**.

A tarefa não é apenas editar `M2_HUMAN_QUESTIONS.md`. Você deve localizar e reconciliar **todas as ocorrências normativas, pseudocódigos, modelos, telas, relatórios, jobs, regras de negócio, mapeamentos Firestore, Security Rules e worklogs** afetados pelas decisões.

Não faça uma correção superficial.

---

# RESTRIÇÕES DE ESCOPO

## 1. NÃO iniciar M2.2

Esta tarefa é de resolução das perguntas humanas e reconciliação documental/formal anterior ao início de M2.2.

Não implemente o modelo Alloy M2.2 por iniciativa própria.

Se alguma consequência global/relacional pertencer corretamente ao M2.2:

* documente a decisão já tomada;
* registre a consequência como entrada futura para M2.2;
* não antecipe uma solução Alloy sem necessidade.

Preserve M0 e M1 como historicamente validados.

## 2. NÃO reabrir decisões humanas já tomadas

As decisões abaixo são normativas para esta tarefa.

Não transforme nenhuma delas novamente em pergunta aberta.

## 3. NÃO criar mecanismo de correção genérica

Não queremos suportar no LCQUI algo equivalente a:

```text
corrigir qualquer evento arbitrário
→ reconstruir toda a cadeia posterior
→ descobrir o estado atual
```

Correções suportadas devem permanecer em **conjunto fechado de contratos explícitos**, com efeitos conhecidos.

Não implementar event sourcing integral.

Não implementar replay histórico até o presente.

Não criar proveniência complexa apenas para permitir correções arbitrárias futuras.

## 4. NÃO criar materialized view persistente de estoque atual

Não criar entidades como:

```text
Resumo_Estoque_Atual
Estoque_Atual_Reagente
Snapshot_Estoque_Atual
```

ou equivalentes persistentes destinadas a permanecer sincronizadas com `Frasco_Reagente`.

O cache descrito posteriormente NÃO é uma autoridade de estoque e NÃO deve ser modelado como uma materialized view canônica.

---

# PARTE I — HQ-M2-004

## Cadastro de frasco FECHADO com conteúdo nominal desconhecido

Resolver HQ-M2-004 como `RESOLVED`.

### Decisão

É permitido:

```text
condicao_inicial_cadastro = FECHADO
conteudo_nominal = NULL
```

quando o conteúdo nominal for realmente desconhecido ou ilegível.

Nunca usar:

```text
conteudo_nominal = 0
```

para representar desconhecido.

Nesse caso:

```text
estado_fisico_frasco = FECHADO
peso_frasco_vazio = NULL
saldo_desconhecido = true
```

O fato de o frasco estar fisicamente fechado NÃO permite concluir automaticamente que sua quantidade remanescente é conhecida.

A regra antiga:

```text
FECHADO
→ saldo_desconhecido = false
```

não pode permanecer como implicação universal.

Deve passar a ser condicional.

Conceitualmente:

```text
FECHADO com dados quantitativos suficientes
→ saldo_desconhecido = false

FECHADO com conteudo_nominal desconhecido
e sem tara real conhecida
→ saldo_desconhecido = true
```

### Abertura posterior

Abrir o frasco NÃO resolve automaticamente o saldo desconhecido.

Uma pesagem bruta posterior também NÃO resolve sozinha o problema, porque:

```text
peso bruto = recipiente + conteúdo
```

e, sem tara real ou informação metrológica suficiente, não é possível separar as duas parcelas.

Portanto não escrever algo como:

```text
primeira abertura
→ saldo_desconhecido = false
```

nem:

```text
primeira pesagem
→ saldo_desconhecido = false
```

### Esgotamento

Quando o recipiente ficar efetivamente vazio e sua tara real for medida:

```text
peso_frasco_vazio = peso vazio real
estado_fisico_frasco = VAZIO
disponibilidade = INDISPONIVEL
saldo_desconhecido = false
saldo = 0
```

Essa continua sendo a forma normativa principal de conhecer a tara real de um recipiente cuja tara era desconhecida.

### Caso a tara real nunca chegue a ser conhecida

Um frasco cadastrado originalmente como:

```text
condicao_inicial_cadastro = FECHADO
conteudo_nominal = NULL
saldo_desconhecido = true
peso_frasco_vazio = NULL
```

não é obrigado a chegar ao estado `VAZIO` para que seu ciclo de vida possa continuar ou terminar.

Se ele nunca for efetivamente esvaziado e pesado vazio — por exemplo, porque:

* vencer e posteriormente for descartado;
* quebrar;
* for extraviado;
* permanecer em situação de descarte com conteúdo;
* sofrer outra transição já prevista no ciclo de vida antes de permitir obtenção de tara real;

ele deve seguir **o mesmo fluxo normativo que já existe para um frasco cadastrado `JA_ABERTO` cuja tara real nunca chegou a ser conhecida**.

Não criar um fluxo especial apenas porque sua condição inicial histórica era `FECHADO`.

Em particular:

* não inventar tara;
* não estimar tara para encerrar o ciclo de vida;
* não inventar saldo;
* não gravar `0` para representar quantidade desconhecida;
* não exigir uma pesagem vazia impossível apenas para satisfazer o schema;
* não bloquear descarte, quebra, extravio ou demais transições já permitidas a um `JA_ABERTO` sem tara real.

As transições devem respeitar exatamente a semântica já consolidada para `JA_ABERTO`.

Por exemplo:

```text
EXTRAVIADO
```

preserva o valor anterior de `saldo_desconhecido`, conforme a regra vigente.

Se posteriormente houver `REENCONTRO`, o desconhecimento continua conforme as regras normais enquanto não surgir informação metrológica suficiente.

Estados terminais como:

```text
QUEBRADO
DESCARTADO
```

devem seguir a semântica já definida no projeto para `JA_ABERTO` sem tara conhecida. Não criar uma segunda regra específica para o caso `FECHADO + conteudo_nominal=NULL`.

O princípio normativo é:

```text
condicao_inicial_cadastro
= fato histórico imutável

saldo_desconhecido
= estado metrológico atual
```

Portanto, dois frascos com origens históricas diferentes podem seguir o mesmo fluxo operacional quando se encontram na mesma situação metrológica atual.

### Reconciliação necessária

Procure em toda a documentação por regras como:

```text
FECHADO exige conteudo_nominal > 0
FECHADO sempre inicia saldo_desconhecido=false
FECHADO sempre possui tara derivada
FECHADO precisa obter tara real antes de descarte/quebra/extravio
```

e reconcilie.

Não deixe uma tabela de regra de negócio contradizer o texto narrativo.

---

# PARTE II — HQ-M2-005

## Eliminar completamente o limiar fixo de 5 g

Resolver HQ-M2-005 como `RESOLVED`.

### Decisão

O limiar fixo de:

```text
5 g
```

deve ser eliminado completamente da semântica normativa de devolução/esgotamento.

Não mantê-lo:

* como definição de frasco vazio;
* como tolerância secundária;
* como regra de justificativa;
* como regra de exceção;
* como fallback.

### Q06 permanece

Continuam válidas as tolerâncias dinâmicas Q06.

Reagente normal:

```text
max(1 g, 0,005 × peso_saida)
```

Reagente higroscópico:

```text
max(2 g, 0,02 × peso_saida)
```

Essas tolerâncias possuem finalidade própria de detecção/tratamento de anomalias na relação entre:

```text
peso_retorno
versus
peso_saida
```

Elas NÃO são substitutas conceituais de uma antiga regra de:

```text
peso_retorno
versus
tara
```

---

# PARTE II-A — DEVOLUÇÃO COM PESO ABAIXO DA TARA

A documentação atual não deve continuar com uma regra que simplesmente rejeite a devolução usando `failed-precondition` quando o gestor informa um peso real abaixo da tara armazenada.

Isso criaria um problema operacional grave:

```text
o gestor mediu X
↓
o sistema se recusa a aceitar X
↓
para devolver o frasco, o gestor é incentivado a informar Y
```

Esse comportamento é proibido.

O sistema deve preservar a medição observada e tratar a contradição metrológica explicitamente.

## 1. O peso medido é um fato e deve ser registrado

Se o gestor realmente mediu:

```text
peso_retorno = X
```

o sistema deve permitir registrar exatamente `X`.

Nunca exigir que:

```text
peso_retorno >= peso_frasco_vazio
```

como condição para aceitar a informação física observada.

Nunca orientar a interface a:

* arredondar;
* aumentar;
* substituir;
* corrigir silenciosamente;

o peso informado apenas para passar por uma validação.

---

# 2. Separar devolução física de consistência metrológica

A devolução física de um frasco e a validação metrológica de seus dados são conceitos diferentes.

Se o usuário trouxe fisicamente o frasco de volta ao laboratório:

```text
a custódia do usuário termina
```

mesmo que:

```text
peso_retorno
```

contradiga algum dado metrológico previamente persistido.

Portanto, uma anomalia de peso não deve manter artificialmente o empréstimo como:

```text
EM_USO
```

quando o frasco já foi efetivamente devolvido.

O sistema deve conseguir representar:

```text
frasco fisicamente devolvido
+
anomalia metrológica pendente
```

---

# 3. Antes de aplicar a regra, distinguir tara REAL de referência teórica

A documentação já estabelece que uma tara derivada inicialmente de:

```text
peso bruto inicial - conteúdo nominal
```

não é uma medição física definitiva da embalagem vazia.

É uma referência/valor teórico.

Portanto:

```text
tara de referência
```

NÃO pode ser tratada como limite físico absoluto equivalente a:

```text
tara real medida com recipiente vazio
```

Audite o modelo atual.

Se `peso_frasco_vazio` estiver sendo utilizado simultaneamente para:

```text
tara teórica/de referência
```

e:

```text
tara real medida
```

essa ambiguidade deve ser eliminada ou possuir proveniência explícita suficiente para distinguir as duas semânticas.

Antes de criar novos campos, procure se essa proveniência já existe.

Se não existir e for indispensável, introduza a representação mínima necessária, por exemplo um discriminador/origem equivalente a:

```text
origem_tara =
    REFERENCIA_TEORICA
    MEDIDA_REAL
```

ou solução semanticamente equivalente adequada ao modelo atual.

Não crie estrutura adicional se o modelo já distingue corretamente essas situações.

Regra fundamental:

```text
tara teórica/de referência
≠
tara real confirmada
```

Um retorno abaixo de uma tara meramente teórica pode indicar simplesmente que a estimativa inicial era imprecisa.

---

# 4. Caso A — gestor confirma explicitamente que o frasco ficou vazio

Se:

```text
confirmarEsgotamento = true
```

a devolução é aceita normalmente.

O valor medido é persistido.

Se não havia tara real anterior, ou havia somente referência teórica:

```text
peso_frasco_vazio = peso_retorno
origem_tara = MEDIDA_REAL
peso_atual = peso_retorno
estado_fisico_frasco = VAZIO
disponibilidade = INDISPONIVEL
saldo_desconhecido = false
saldo = 0
```

O fato de o novo peso estar abaixo da antiga referência teórica não bloqueia a operação.

A nova medição vazia é evidência física superior à referência calculada.

## Tara real anterior já existente

Se já existia uma tara previamente medida como REAL e uma nova pesagem do recipiente explicitamente confirmado vazio divergir de forma incompatível:

* aceitar a devolução;
* registrar a nova medição;
* deixar o frasco `VAZIO`;
* deixá-lo `INDISPONIVEL`;
* manter `saldo = 0`, pois o esgotamento foi explicitamente confirmado;
* registrar a discrepância metrológica;
* não substituir silenciosamente uma tara real anterior sem seguir o contrato já existente de recalibração/correção de tara real.

Se `recalibrarTaraFrascoEsgotado` já for o contrato normativo para substituir uma tara real:

* reutilizá-lo;
* exigir sua justificativa humana conforme a lista fechada vigente;
* preservar auditoria da tara anterior e da nova tara.

A devolução física não depende de a recalibração ser concluída no mesmo instante.

---

# 5. Caso B — gestor NÃO confirma esgotamento e o retorno fica abaixo de uma tara REAL conhecida

Se:

```text
confirmarEsgotamento = false
```

e houver uma tara realmente medida/confirmada tal que:

```text
peso_retorno < tara_real
```

o sistema NÃO deve rejeitar o fato físico informado.

Deve:

1. persistir `peso_retorno` exatamente como informado;
2. registrar que o frasco foi fisicamente devolvido;
3. encerrar a custódia/empréstimo do usuário;
4. registrar uma anomalia metrológica explícita;
5. impedir que o frasco volte silenciosamente ao estoque utilizável;
6. exigir resolução da anomalia antes de nova retirada.

Use uma representação já existente se houver.

Por exemplo, se o modelo já suporta:

```text
DEVOLVIDO_COM_ANOMALIA
```

reutilize esse conceito em vez de criar um status redundante.

Se houver classificação de anomalia, use algo semanticamente equivalente a:

```text
RETORNO_ABAIXO_TARA_REAL
```

Não invente um novo enum se uma representação existente consegue expressar a mesma semântica de forma inequívoca.

---

# 6. Estado operacional durante a anomalia

O frasco devolvido com essa inconsistência não deve ficar:

```text
DISPONIVEL
```

para nova retirada.

Ele deve ficar bloqueado operacionalmente.

Se o modelo vigente utiliza quarentena para esse tipo de bloqueio metrológico, pode-se representar:

```text
em_quarentena = true
disponibilidade = INDISPONIVEL
```

com motivo automático do sistema equivalente a:

```text
"Inconsistência metrológica: peso de retorno abaixo da tara real registrada."
```

Esse motivo automático NÃO é justificativa humana e não está sujeito automaticamente ao requisito `trim >= 20` destinado a ações humanas manuais.

Se a arquitetura já possuir conceito melhor de pendência metrológica/indisponibilidade, reutilize-o.

Não criar novo mecanismo paralelo sem necessidade.

---

# 7. Peso atual e saldo durante a anomalia

A medição observada deve permanecer registrada.

Se `peso_atual` representa a última pesagem física observada, ele pode ser atualizado para:

```text
peso_atual = peso_retorno
```

mas não utilizar automaticamente a contradição para produzir:

```text
saldo negativo
```

nem um saldo artificialmente conhecido.

Enquanto a inconsistência não estiver resolvida:

```text
saldo_desconhecido = true
```

quando não houver base metrológica suficiente para um saldo confiável.

Campos derivados equivalentes a:

```text
saldo_aferido_g
saldo_aferido_ml
```

devem ficar `NULL`/indisponíveis enquanto a medição não puder produzir um saldo fisicamente consistente.

Nunca persistir:

```text
saldo < 0
```

como quantidade química disponível.

---

# 8. Consumo e relatório enquanto a devolução está em anomalia

Preservar sempre os dados brutos:

```text
peso_saida
peso_retorno
timestamp
```

Entretanto, se a própria medição de retorno está marcada como metrologicamente inconsistente, não transformar silenciosamente um resultado potencialmente inválido em consumo definitivo de relatório.

O modelo deve distinguir, usando a estrutura existente ou a extensão mínima necessária, entre:

```text
medição bruta observada
```

e:

```text
consumo quantitativo validado/final
```

Enquanto a anomalia estiver pendente:

* o empréstimo não permanece artificialmente `EM_USO`;
* o frasco está fisicamente devolvido;
* a medição fica preservada;
* o consumo final pode permanecer pendente/não confirmado;
* os resumos FLOW não devem contabilizar como consumo definitivo um valor que o próprio sistema classificou como metrologicamente inconsistente.

Após resolução, a informação efetiva deve ser atribuída à data do fato histórico correspondente.

Se a resolução posterior alterar o consumo do dia original:

```text
reprocessar somente a(s) data(s) FLOW diretamente afetada(s)
```

conforme HQ-M2-006.

---

# 9. Formas de resolver a anomalia

O fluxo deve oferecer formas legítimas de resolução sem obrigar alteração falsa do peso.

Pelo menos:

### a. Repetir pesagem

O gestor pode pesar novamente o mesmo frasco.

A medição original permanece no histórico.

Se a nova medição for válida:

```text
resolver anomalia
→ atualizar estado corrente com a medição válida
→ finalizar dados quantitativos aplicáveis
```

Não apagar a medição anterior.

### b. Confirmar esgotamento

Após inspeção, o gestor pode concluir legitimamente:

```text
o frasco realmente ficou vazio
```

Nesse caso aplicar o fluxo explícito de esgotamento/tara real.

Não converter automaticamente uma anomalia em esgotamento sem confirmação humana.

### c. Resolver discrepância de tara real

Se o recipiente estiver efetivamente vazio e houver evidência de que a tara real anterior estava incorreta ou deixou de representar corretamente o recipiente, usar o contrato auditável de:

```text
recalibrarTaraFrascoEsgotado
```

ou equivalente já definido.

Não permitir recalibração de tara com recipiente contendo reagente.

### d. Outro erro administrativo explicitamente suportado

Se a investigação revelar, por exemplo, associação incorreta de operação/frascos e já existir correção fechada para esse caso, utilizar esse contrato.

Não criar `undo universal`.

---

# 10. A interface deve explicar a situação

A UI não deve exibir apenas:

```text
"peso inválido"
```

e impedir continuação.

Deve explicar de forma equivalente:

```text
O peso informado está abaixo da tara real registrada para este frasco.

A medição será preservada.
A devolução física pode ser concluída, mas o frasco ficará indisponível
até que a inconsistência metrológica seja resolvida.

Opções:
- repetir pesagem;
- confirmar que o frasco ficou vazio;
- concluir devolução com anomalia para análise.
```

Não use texto que incentive o usuário a digitar um peso diferente daquele exibido pela balança.

---

# 11. Invariante fundamental

O sistema deve preservar:

```text
verdade observacional
>
conveniência de validação
```

Isto é:

```text
uma medição fisicamente observada não é descartada
apenas porque contradiz um dado previamente armazenado.
```

A contradição deve gerar:

```text
anomalia explícita
+
bloqueio operacional seguro
+
auditoria
+
fluxo de resolução
```

e não:

```text
negação da devolução
```

ou:

```text
incentivo a falsificar o peso
```

---

# PARTE III — HQ-M2-007

## Pesagem de rotina

Resolver HQ-M2-007 como `RESOLVED`.

### Decisão

`registrarPesagemRotina` NÃO pertence à lista fechada de operações que exigem justificativa humana com:

```text
trim >= 20
```

Uma pesagem ordinária de inventário não deve obrigar o gestor a inventar um texto humano de 20 caracteres.

### Semântica

A operação pode possuir:

```text
observacao?: string
```

humana e opcional.

Se o contrato atual utiliza:

```text
motivo
```

por compatibilidade, pode mantê-lo, desde que a documentação deixe inequívoco que:

```text
motivo da pesagem de rotina
≠ justificativa humana obrigatória
```

Na ausência de observação humana, o backend pode persistir descrição automática/canônica do evento, por exemplo:

```text
"Pesagem periódica de inventário de rotina"
```

Não representar esse texto automático como se tivesse sido escrito pelo gestor.

### Exceções

Se durante uma pesagem surgir necessidade de executar uma operação distinta, como:

* colocar em quarentena;
* recalibrar tara real;
* fazer uma correção metrológica que pertença à lista fechada;
* realizar outra ação que normativamente exige justificativa;

o contrato específico dessa segunda operação continua exigindo sua justificativa humana correspondente.

---

# PARTE IV — HQ-M2-006

Esta é a maior mudança da tarefa.

Resolver HQ-M2-006 como `RESOLVED`.

A solução anterior baseada em reconstrução de snapshot de fim de dia por replay NÃO será adotada.

---

# 1. PRINCÍPIO FUNDAMENTAL: FLOW ≠ STOCK

Passam a existir duas responsabilidades claramente separadas.

## Estado atual / STOCK

A autoridade é:

```text
Frasco_Reagente
```

Ele representa o estado corrente dos frascos.

## Histórico / FLOW

As fontes históricas, como:

```text
Historico_Frasco_Reagente
Emprestimo_Reagente
eventos de domínio aplicáveis
```

alimentam:

```text
Resumo_Almoxarifado_Diario
Resumo_Reagente_Diario
```

Esses dois resumos passam a representar **somente fatos ocorridos durante o dia civil**.

---

# 2. NOVA DEFINIÇÃO DOS RESUMOS DIÁRIOS

A regra passa a ser:

```text
Resumo_Diario(D)
=
f(eventos/fatos efetivos pertencentes ao dia civil D)
```

Nunca:

```text
Resumo_Diario(D)
=
Resumo_Diario(D-1) + Δ(D)
```

Nunca reconstruir uma posição acumulada de estoque apenas para preencher o resumo diário.

Nunca exigir replay de todos os eventos anteriores para calcular D.

Nunca depender de D-1 para materializar D.

---

# 3. REMOVER MÉTRICAS DE STOCK DE Resumo_Almoxarifado_Diario

Remover, onde existirem:

```text
qtd_frascos_fechados_no_fim_do_dia
qtd_frascos_abertos_no_fim_do_dia
qtd_frascos_emprestados_no_fim_do_dia
qtd_frascos_saldo_desconhecido
volume_total_disponivel_aferido_ml
massa_total_disponivel_aferida_g
```

Remover também:

```text
volume_total_usado_nos_frascos_devolvidos_durante_o_dia
```

caso ainda exista como campo legado/redundante.

Atenção:

esse último campo é removido por redundância/ambiguidade em relação às métricas atuais de consumo, NÃO porque seja uma métrica de STOCK.

---

# 4. MANTER MÉTRICAS FLOW DE Resumo_Almoxarifado_Diario

Preservar as métricas autocontidas no próprio dia, como aplicável ao modelo atual:

```text
qtd_frascos_cadastrados_fechados_durante_o_dia
qtd_frascos_cadastrados_abertos_durante_o_dia

qtd_frascos_emprestados_durante_o_dia
qtd_frascos_devolvidos_durante_o_dia

volume_utilizado_no_dia_ml
massa_utilizada_no_dia_g

volume_evaporado_no_dia_ml
massa_evaporada_no_dia_g
```

Não inventar novas métricas sem necessidade demonstrada.

Se alguma métrica FLOW adicional já possuir requisito real em relatório/UI, ela pode permanecer ou ser explicitada.

---

# 5. REMOVER MÉTRICAS DE STOCK DE Resumo_Reagente_Diario

Remover, onde existirem:

```text
qtd_frascos_fechados_disponiveis
qtd_frascos_abertos_disponiveis
qtd_frascos_em_uso
qtd_frascos_saldo_desconhecido
qtd_frascos_vazios
volume_total_disponivel_aferido_ml
massa_total_disponivel_aferida_g
```

`qtd_frascos_vazios` como posição acumulada deve desaparecer.

Isso não impede uma futura métrica FLOW semanticamente diferente como:

```text
qtd_frascos_que_ficaram_vazios_dia
```

desde que exista requisito real para ela.

Não crie essa métrica apenas porque ela é possível.

---

# 6. MANTER MÉTRICAS FLOW DE Resumo_Reagente_Diario

Preservar como aplicável:

```text
qtd_frascos_descartados_dia
qtd_frascos_extraviados_dia

volume_utilizado_no_dia_ml
massa_utilizada_no_dia_g

volume_evaporado_no_dia_ml
massa_evaporada_no_dia_g
```

Se a documentação efetivamente utilizar contadores de:

```text
qtd_retiradas_dia
qtd_devolucoes_dia
```

eles podem ser mantidos/adicionados como FLOW, mas não introduza campos sem consumidor/requisito identificável apenas para enriquecer o schema.

---

# 7. CONSEQUÊNCIA: ELIMINAR SNAPSHOT DE FIM DE DIA

Procure e remova/reformule textos que digam que o produtor diário deve reconstruir:

```text
estado efetivo às 23:59:59.999
snapshot de fim de dia
posição de estoque no corte
```

para os resumos de reagentes/almoxarifado.

Também remova a exigência de persistir snapshots mínimos de:

```text
estado_fisico_frasco
disponibilidade
em_quarentena
vencido
saldo_desconhecido
```

**quando essa exigência existir exclusivamente para reconstruir posição diária de estoque**.

Esses campos continuam existindo onde forem necessários ao domínio do frasco atual e à auditoria de operações específicas.

O que desaparece é a obrigação de duplicá-los historicamente apenas para permitir EOD replay.

---

# 8. REPROCESSAMENTO DE CORREÇÕES HISTÓRICAS

Uma correção histórica suportada deve reprocessar somente as datas civis diretamente afetadas.

Exemplo:

```text
evento originalmente atribuído a 20/09
continua pertencendo a 20/09
```

Resultado:

```text
reprocessar 20/09
```

Se uma correção suportada mover um fato de:

```text
20/09 → 21/09
```

então:

```text
reprocessar 20/09
reprocessar 21/09
```

e terminar.

Não existe:

```text
20/09
→ 21/09
→ 22/09
→ ...
→ hoje
```

Não existe cascata por posição acumulada.

Não existe critério de convergência entre dias.

Não existe dependência temporal linear.

---

# 9. JANELA TEMPORAL DOS RESUMOS FLOW

A data civil continua sendo interpretada em:

```text
America/Sao_Paulo
```

Quando houver pseudocódigo de consulta por Timestamp, preferir intervalo civil semiaberto:

```text
timestamp >= inicioDoDia(D)
timestamp < inicioDoDia(D + 1)
```

em vez de depender de:

```text
<= 23:59:59.999
```

Isso evita bordas artificiais de precisão.

A semântica continua sendo:

```text
todos os fatos pertencentes ao dia civil D
```

---

# 10. ESTOQUE ATUAL

Não criar materialized view persistente de estoque atual.

A autoridade é:

```text
Frasco_Reagente
```

As contagens atuais devem ser obtidas diretamente do estado corrente, por consultas agregadas Firestore server-side, como:

```text
count()
sum()
```

Exemplos conceituais:

```text
quantos FECHADOS
quantos ABERTOS
quantos EMPRESTADOS
quantos em quarentena
quantos com saldo_desconhecido
```

Não baixar todos os documentos para o navegador apenas para contá-los.

---

# 11. MASSA E VOLUME ATUAIS

Para métricas como:

```text
massa_total_disponivel_aferida_g
volume_total_disponivel_aferido_ml
```

o Firestore não deve ser tratado como se pudesse executar arbitrariamente uma expressão por documento, como:

```text
peso_atual - peso_frasco_vazio
```

ou:

```text
(peso_atual - peso_frasco_vazio) / densidade
```

durante um `sum()`.

Antes de criar novos campos, audite o modelo atual.

Se já existir um campo corrente, server-owned e semanticamente equivalente ao saldo aferido normalizado, reutilize-o.

Se não existir e ele for necessário para permitir `sum()` eficiente, introduza no próprio `Frasco_Reagente` campos derivados correntes semanticamente equivalentes a:

```text
saldo_aferido_g
saldo_aferido_ml
```

com as seguintes propriedades:

* pertencem ao próprio documento canônico atual;
* NÃO formam uma materialized view separada;
* são calculados exclusivamente pelo backend;
* são atualizados junto com a operação que altera peso/tara/saldo;
* nunca são enviados pelo cliente como autoridade;
* devem respeitar `saldo_desconhecido`;
* não misturam g com mL;
* durante anomalia metrológica não resolvida, não representar um saldo negativo ou fictício.

Não adicione esses campos se o modelo atual já resolver o problema de maneira equivalente.

---

# PARTE V — ACESSO AO DASHBOARD DE ESTOQUE

As agregações atuais NÃO devem ser disparadas diretamente pelo browser contra o Firestore.

Fluxo normativo:

```text
Frontend
    ↓
backend / callable function
    ↓
Firebase Auth
    ↓
App Check
    ↓
RBAC / escopo
    ↓
rate limit
    ↓
cache
    ↓
count()/sum() somente se necessário
    ↓
Firestore
```

O backend decide se uma nova consulta física ao Firestore será executada.

---

# PARTE VI — RATE LIMIT

Decisão humana:

```text
máximo 5 solicitações por minuto por usuário
```

A identidade do limite deve ser:

```text
Firebase Auth UID
```

Não usar IP como identidade primária do limite, pois usuários legítimos podem compartilhar NAT/rede institucional.

A ordem de validação deve impedir que uma chamada inválida/abusiva execute agregações antes de ser rejeitada.

Conceitualmente:

```text
1. App Check
2. Auth
3. RBAC/escopo
4. rate limit por UID
5. cache
6. agregações somente em cache miss/inválido
```

Reconciliar essa ordem com a arquitetura real das callable functions do projeto.

---

# PARTE VII — CACHE DO DASHBOARD

Criar/documentar uma coleção interna de cache para os resultados agregados.

Nome recomendado:

```text
Sistema_Cache_Dashboard
```

Se já existir convenção equivalente melhor no projeto, adapte o nome mantendo a mesma semântica.

Esse cache é:

* efêmero;
* derivado;
* descartável;
* reconstruível;
* NÃO autoridade de estoque;
* NÃO materialized view canônica.

---

# 1. CACHE É LAZY / ON-DEMAND

A validade máxima é:

```text
30 segundos
```

MAS:

**30 segundos NÃO é periodicidade de execução.**

Não criar:

```text
job a cada 30 segundos
cron de cache
scheduler de atualização
```

A regra correta é:

```text
usuário consulta
    ↓
cache existe e está válido?
    ↓
sim → retornar
não → executar agregações e gravar novo cache
```

Se ninguém consultar a tela durante 8 horas:

```text
0 recálculos de dashboard causados pelo cache
```

---

# 2. VALIDADE = TTL MÁXIMO + INVALIDAÇÃO POR MUTAÇÃO

Um cache é válido somente quando:

```text
agora - calculado_em <= 30 segundos
```

E:

```text
nenhuma operação posterior relevante invalidou seu escopo
```

Portanto:

```text
cache deixa de ser válido no primeiro que ocorrer:

A. completar 30 segundos;

OU

B. ocorrer mutação que possa alterar alguma métrica contida naquele cache.
```

O cache não deve ser imediatamente recalculado após uma invalidação.

A mutação faz apenas:

```text
invalidar cache
```

O próximo acesso é que recalcula.

Assim:

```text
mutação às 10:00
cache invalidado
nenhum usuário abre dashboard até 15:00
→ nenhuma aggregation query entre 10:00 e 15:00
```

---

# 3. OPERAÇÕES QUE DEVEM INVALIDAR O CACHE

A invalidação deve ocorrer sempre que a contribuição atual do frasco para alguma métrica do dashboard puder mudar.

Enumerar e reconciliar pelo menos estas operações existentes/aplicáveis:

1. cadastro de frasco;
2. abertura de frasco;
3. retirada/empréstimo;
4. devolução normal;
5. devolução concluída com anomalia metrológica;
6. resolução posterior de anomalia metrológica;
7. confirmação de esgotamento / `FICOU_VAZIO`;
8. pesagem de rotina, quando alterar peso/saldo atual agregado;
9. registro de evaporação ou ajuste metrológico que altere saldo corrente;
10. recalibração/correção de tara real que altere saldo corrente;
11. quebra;
12. descarte;
13. extravio;
14. reencontro;
15. entrada em quarentena;
16. saída/liberação de quarentena;
17. decisão de pendência de descarte quando mudar disponibilidade/elegibilidade agregada;
18. vencimento ou decisão operacional associada ao vencimento, quando modificar alguma métrica apresentada no dashboard;
19. transferência entre almoxarifados, se esta operação existir;
20. alteração suportada da associação do frasco a reagente/resumo, se tal operação específica existir;
21. qualquer outra operação concreta já existente no domínio que altere um campo canônico usado direta ou indiretamente nas agregações atuais.

### Escopo de invalidação

Se uma operação afeta somente:

```text
ALMOX-A / REAGENTE-X
```

não invalide indiscriminadamente todos os caches do sistema.

Use o menor escopo seguro correspondente à chave de cache.

Se houver transferência:

```text
ALMOX-A → ALMOX-B
```

invalidar os escopos afetados de origem e destino.

Se houver mudança de reagente/resumo suportada:

```text
REAGENTE-X → REAGENTE-Y
```

invalidar os escopos antigo e novo.

---

# 4. OPERAÇÕES QUE NÃO INVALIDAM O CACHE

Não invalidar o cache por uma alteração puramente histórica/administrativa que não altere o estado corrente utilizado pelo dashboard.

Exemplos:

```text
correção do retirante de empréstimo antigo
correção do gestor/autoria histórica
alteração de motivo/observação histórica
metadado de auditoria
reprocessamento de Resumo_*_Diario
correção que modifica somente métricas FLOW históricas
```

Essas alterações podem exigir reprocessamento das datas FLOW correspondentes, mas não modificam automaticamente o estoque atual.

---

# 5. INVALIDAÇÃO ATÔMICA

Sempre que tecnicamente aplicável, a mutação canônica e a invalidação correspondente devem fazer parte da mesma unidade transacional.

Evitar:

```text
Frasco_Reagente atualizado
+
cache antigo ainda marcado como válido
```

Não é necessário recalcular o cache dentro da mesma transação.

A transação pode fazer:

```text
alterar estado canônico
+
invalidar/remover cache
```

e terminar.

---

# 6. CHAVE DO CACHE

O cache NÃO deve ser por usuário se vários usuários autorizados visualizam exatamente o mesmo resultado.

A chave deve ser derivada do escopo lógico da agregação.

Exemplo conceitual:

```text
ESTOQUE__{idAlmoxarifado}
```

ou, se necessário:

```text
ESTOQUE__{idAlmoxarifado}__{idResumoReagente}
```

Se filtros adicionais alteram o resultado:

* inclua-os deterministicamente na chave;
* normalize a chave;
* não permita que parâmetros irrelevantes criem infinitos caches distintos.

A autorização continua sendo validada por usuário no backend antes de retornar o cache.

Cache compartilhado NÃO significa autorização compartilhada.

---

# 7. CAMPOS DO CACHE

Documentar campos mínimos equivalentes a:

```text
escopo
resultado agregado
calculado_em
versao_calculo
```

Não depender da remoção física do documento para saber se ele expirou.

Validade é determinada semanticamente por:

```text
calculado_em
+
estado de invalidação
```

Não usar Firestore TTL deletion como mecanismo de precisão de 30 segundos.

---

# 8. SEGURANÇA DA COLEÇÃO DE CACHE

A coleção de cache é interna ao sistema.

Clientes não devem ter leitura nem escrita direta.

Security Rules devem refletir semanticamente:

```text
match /Sistema_Cache_Dashboard/{document=**} {
    allow read, write: if false;
}
```

ou regra equivalente consistente com a estrutura efetiva do ruleset.

Backend autorizado usa Admin SDK/IAM.

Não criar exceção de leitura direta apenas para evitar passar pela callable function.

---

# 9. CACHE NO NAVEGADOR

Além do cache compartilhado no backend/Firestore, utilizar cache local de curta duração no frontend.

Validade:

```text
30 segundos
```

A interface deve poder mostrar algo semanticamente equivalente a:

```text
Atualizado há 18 segundos
[Atualizar]
```

O botão `Atualizar` não deve provocar nova consulta enquanto o TTL local ainda é válido, salvo se o fluxo existente tiver uma justificativa explícita diferente.

Quando o TTL local expirar, o botão pode solicitar novamente ao backend.

Mesmo assim:

**o backend permanece a autoridade.**

Desabilitar um botão no frontend não é controle de segurança.

Se o usuário manipular o frontend:

```text
backend
→ rate limit
→ cache compartilhado
```

continuam protegendo o Firestore.

---

# 10. NÃO IMPLEMENTAR INFRAESTRUTURA COMPLEXA DE CACHE STAMPEDE SEM NECESSIDADE

Pode ocorrer, raramente, algo como:

```text
cache expira
A consulta
B consulta quase simultaneamente
A e B observam miss
```

Com o número de usuários e a escala atual do LCQUI, não introduza Redis, distributed lock, sharded lock ou infraestrutura complexa apenas para evitar uma possível duplicação esporádica de agregação.

Se já existir mecanismo transacional simples compatível com a arquitetura, pode ser utilizado.

Caso contrário, documente a propriedade e mantenha a solução simples.

---

# PARTE VIII — DASHBOARD E UI

A documentação atual possui semântica em que o detalhe de reagente pode usar resumos diários para mostrar posição histórica de:

```text
saldo
fechados
abertos
em uso
```

Essa semântica deve ser alterada.

## Estado atual

O modo de estado atual pode exibir:

```text
saldo atual
fechados atuais
abertos atuais
emprestados atuais
quarentena atual
outras métricas atuais aplicáveis
```

obtidas a partir do estado corrente via endpoint agregado protegido.

## Período histórico

Um período histórico passa a significar:

```text
movimentações e consumo ocorridos no período
```

Exemplos:

```text
consumo
evaporação
cadastros
retiradas
devoluções
descartes
extravios
outros FLOW realmente documentados
```

Não apresentar:

```text
quantos frascos havia na prateleira às 23:59 de cada dia
```

porque essa série histórica de STOCK deixou de ser requisito/modelagem.

---

# PARTE IX — RELATÓRIOS PDF

Audite especialmente o relatório de almoxarifado/reagentes.

A documentação atual possui lógica que soma corretamente métricas FLOW, mas também pode conter uso residual de:

```text
qtd_frascos_saldo_desconhecido
```

ou outras métricas de posição.

Remover dependências de STOCK dos resumos diários.

Relatórios históricos de período devem utilizar:

```text
FLOW materializado
+
históricos/eventos quando necessários
```

Estado atual deve ser tratado separadamente como fotografia corrente, quando requerido.

Não misturar:

```text
fotografia atual
```

com:

```text
fluxo histórico do período
```

sem deixar a semântica explícita.

Devoluções com anomalia metrológica pendente não devem gerar consumo definitivo silenciosamente se o próprio sistema ainda considera a medição quantitativamente não resolvida.

---

# PARTE X — JOB consolidarResumosDiarios

Reescrever a semântica documental/pseudocódigo do produtor.

Ele continua podendo existir como:

```text
consolidarResumosDiarios(DATA_ALVO)
```

mas agora materializa somente FLOW.

Execução normal pode continuar no dia seguinte para consolidar D-1.

Porém:

```text
D-1
```

é somente o dia-alvo a processar, e NÃO uma dependência de dados de D-1 para calcular D.

A função deve consultar apenas as fontes necessárias para eventos/fatos pertencentes a `DATA_ALVO`.

Não reconstruir stock de fim do dia.

Não ler o estado corrente de `Frasco_Reagente` para inventar fatos históricos.

Não carregar snapshot do dia anterior.

Não propagar resultado para o dia seguinte.

---

# PARTE XI — HISTÓRICO NECESSÁRIO PARA FLOW

A remoção de STOCK dos resumos diários reduz a necessidade de snapshots históricos, mas não elimina a necessidade de histórico suficiente para calcular FLOW.

Todo fato que contribua para uma métrica diária deve possuir informação histórica imutável suficiente para ser agregado posteriormente.

Exemplo:

consumo de um empréstimo deve continuar possuindo, conforme o modelo:

```text
peso_saida
peso_retorno
medida_utilizada
unidade_medida_utilizada
densidade_aplicada quando necessária
peso_perda_evaporacao
data_devolucao_efetuada
id_almoxarifado
identidade do reagente necessária ao agrupamento
```

Não consultar um valor atual mutável para reconstruir um valor histórico que deveria ter sido snapshotado na operação.

A nova regra é:

```text
snapshot histórico somente quando necessário para preservar o fato FLOW/auditoria
```

e NÃO:

```text
snapshot de todas as dimensões atuais para reconstruir posição diária de estoque
```

Para devoluções com anomalia, preservar também informação suficiente para determinar:

* a medição original;
* a anomalia detectada;
* sua resolução;
* qual medição/decisão tornou-se efetiva para fins quantitativos;
* quais datas FLOW devem ser reprocessadas.

---

# PARTE XII — CORREÇÕES: CONJUNTO FECHADO

Preservar a decisão de não criar `undo universal`.

Correções são:

* compensatórias;
* auditáveis;
* vinculadas à operação original;
* realizadas apenas para casos explicitamente suportados;
* sem apagar o fato original.

Não criar uma API genérica que aceite:

```text
campo
valor_novo
```

para arbitrariamente alterar qualquer evento histórico.

Para cada correção suportada, seus efeitos devem ser conhecidos.

Exemplo:

```text
retirante histórico incorreto
```

pode afetar:

```text
histórico
relatórios de atividade
Resumo_Diario da(s) data(s) correspondente(s)
```

mas não deve automaticamente alterar:

```text
peso_atual
saldo atual
estado físico atual
disponibilidade atual
cache de estoque atual
```

Se houver uma operação específica de regularização corrente no domínio, trate-a como operação corrente própria, não como replay implícito de toda a história.

---

# PARTE XIII — CAMPOS/TERMOS QUE DEVEM SER PROCURADOS GLOBALMENTE

Faça busca global pelo menos por:

```text
qtd_frascos_fechados_no_fim_do_dia
qtd_frascos_abertos_no_fim_do_dia
qtd_frascos_emprestados_no_fim_do_dia
qtd_frascos_saldo_desconhecido

qtd_frascos_fechados_disponiveis
qtd_frascos_abertos_disponiveis
qtd_frascos_em_uso
qtd_frascos_vazios

volume_total_disponivel_aferido_ml
massa_total_disponivel_aferida_g

volume_total_usado_nos_frascos_devolvidos_durante_o_dia

23:59:59.999
snapshot
fim do dia
estado efetivo no corte
D-1
replay
estado anterior
estado posterior

5 g
5g

pesoRetorno < peso_frasco_vazio
peso_retorno < peso_frasco_vazio
failed-precondition
Retorno abaixo da tara

DEVOLVIDO_COM_ANOMALIA
confirmarEsgotamento
recalibrarTaraFrascoEsgotado
tara real
tara teórica
tara de referência

saldo_desconhecido = false
conteudo_nominal obrig
FECHADO

Resumo_Almoxarifado_Diario
Resumo_Reagente_Diario

materializa
período histórico
estado atual

count(
sum(
dashboard
cache
```

Não substitua cegamente ocorrências históricas ou explicações arquivadas.

Classifique cada ocorrência como:

* normativa atual;
* pseudocódigo atual;
* worklog histórico;
* arquivo de auditoria;
* exemplo legado explicitamente marcado;
* ocorrência sem impacto.

Só altere o que precisa refletir a nova decisão.

---

# PARTE XIV — ARQUIVOS/ÁREAS QUE DEVEM SER AUDITADOS

Não assuma que esta lista é exaustiva.

Descubra os caminhos reais na HEAD.

Audite pelo menos:

* `documentation/worklogs/formal-spec/M2_HUMAN_QUESTIONS.md`;
* estado/worklog formal de M2;
* Seção 4 — modelo 3FN;
* Seção 5 — mapeamento Firestore;
* Seção 6 — resumos/materializações;
* Seção 7 — requisitos e regras de negócio;
* Seção 8 — dashboards/telas;
* Seção 10 — fluxo de reagentes;
* Seção 10 — jobs agendados;
* Seção 10 — relatórios PDF;
* Seção 11 — Security Rules;
* pseudocódigos de Cloud Functions;
* dicionários de dados;
* tabelas de campos obrigatórios;
* matrizes de implementação/consistência que façam afirmações normativas;
* schemas/CUE de M2 se a nova decisão local os afetar;
* fixtures CUE de M2 correspondentes;
* qualquer implementação já existente cuja documentação seria tornada explicitamente contraditória.

Não use paths presumidos se a HEAD real os organizou de outra forma.

Descubra os arquivos.

---

# PARTE XV — CUE / FORMAL SPEC

Inspecione o estado atual de M2.1c.

Ajuste CUE somente se alguma decisão agora confirmada contradisser um constraint local já implementado.

Especial atenção à HQ-M2-004:

não pode existir constraint local equivalente a:

```text
condicao_inicial_cadastro == FECHADO
→ saldo_desconhecido == false
```

se essa dimensão já estiver modelada localmente.

Da mesma forma, não pode haver obrigatoriedade universal de:

```text
FECHADO → conteudo_nominal != NULL
```

se a decisão agora permite conteúdo nominal desconhecido.

Também não deve existir invariante que obrigue um frasco sem tara real a obtê-la antes de poder chegar às mesmas transições já permitidas a um `JA_ABERTO` sem tara.

Se `saldo_desconhecido` ou outras relações forem deliberadamente parte de M2.2 e ainda não estiverem no CUE local:

* não antecipe o modelo;
* atualize a documentação/worklog;
* registre a consequência para M2.2.

Não prejudique os gates já validados de M0/M1.

---

# PARTE XVI — M2_HUMAN_QUESTIONS.md

Atualizar:

```text
HQ-M2-004 → RESOLVED
HQ-M2-005 → RESOLVED
HQ-M2-006 → RESOLVED
HQ-M2-007 → RESOLVED
```

Substituir `PENDENTE — NÃO IMPLEMENTAR` pela decisão efetivamente tomada.

Registrar a essência de cada decisão de forma suficiente para que uma auditoria futura não precise reconstruí-la a partir de commits.

Em HQ-M2-004 registrar explicitamente que:

```text
FECHADO + conteudo_nominal=NULL
```

pode iniciar com saldo desconhecido e, se nunca obtiver tara real, segue o mesmo fluxo já definido para `JA_ABERTO` em situação metrológica equivalente.

Em HQ-M2-005 registrar também que a eliminação dos 5 g NÃO significa bloquear devoluções cuja medição contradiga a tara: essas medições são preservadas e tratadas como anomalia metrológica conforme o fluxo consolidado.

Em HQ-M2-006, deixar explícito que a pergunta original sobre snapshot de fim de dia foi superada por uma decisão arquitetural:

```text
não persistir/reconstruir STOCK diário
→ resumos de reagentes passam a FLOW-only
```

Portanto a necessidade que originava o replay de posição deixa de existir.

---

# PARTE XVII — ESTADO FORMAL / WORKLOG

Atualizar o arquivo de estado formal existente na branch.

Registrar:

* HEAD de entrada;
* arquivos alterados;
* decisões HQ-M2-004..007;
* mudança arquitetural FLOW-only;
* ausência de materialized view de estoque atual;
* estratégia `Frasco_Reagente + count()/sum()`;
* backend protegido;
* cache lazy de 30 s;
* invalidação por mutação;
* rate limit de 5/min/UID;
* novo fluxo de devolução com anomalia metrológica sem falsificação de peso;
* resultado dos gates;
* quaisquer consequências deferidas para M2.2.

Ao final, a próxima ação não deve continuar dizendo que essas HQs aguardam resposta humana.

---

# PARTE XVIII — NÃO ALTERAR O DOMÍNIO DE PATRIMÔNIO SEM ANÁLISE PRÓPRIA

A decisão FLOW-only desta tarefa aplica-se a:

```text
Resumo_Almoxarifado_Diario
Resumo_Reagente_Diario
```

no domínio de reagentes.

Não generalize automaticamente para:

```text
Resumo_Bem_Patrimonial_Diario
```

ou outros domínios.

Se patrimônio possui snapshots diários de posição, deixe-os intactos salvo contradição diretamente causada por esta tarefa.

---

# PARTE XIX — CRITÉRIOS DE ACEITAÇÃO

A tarefa só pode ser considerada concluída se todos os itens abaixo forem verdadeiros.

## HQ-M2-004

* FECHADO + `conteudo_nominal=NULL` é permitido;
* `peso_frasco_vazio=NULL`;
* `saldo_desconhecido=true` nesse caso;
* abertura/pesagem bruta não tornam o saldo automaticamente conhecido;
* se obtiver tara real ao esgotar, segue o fluxo normal de `VAZIO`;
* se nunca obtiver tara real, pode seguir o mesmo ciclo de vida já existente para `JA_ABERTO` sem tara real;
* quebra, descarte, extravio e outras transições não exigem fabricação de tara;
* nenhuma regra universal contraditória permanece.

## HQ-M2-005

* regra fixa de 5 g eliminada;
* Q06 dinâmica preservada;
* esgotamento continua por confirmação explícita;
* devolução abaixo de tara não força alteração/falsificação do peso;
* devolução física pode ser concluída com anomalia;
* frasco inconsistente fica bloqueado para nova retirada;
* existe fluxo explícito de resolução;
* tara teórica não é tratada como tara real.

## HQ-M2-007

* pesagem ordinária não exige `trim >= 20`;
* observação humana é opcional;
* texto automático pode descrever o evento;
* operações especiais continuam usando seus próprios contratos de justificativa.

## HQ-M2-006

* resumos de reagente/almoxarifado são FLOW-only;
* campos de STOCK foram removidos;
* nenhum snapshot diário de estoque é necessário;
* nenhum replay D→hoje é necessário;
* correção reprocessa somente datas diretamente afetadas;
* `Frasco_Reagente` é autoridade atual;
* não existe materialized view persistente do estoque atual.

## Dashboard

* agregações atuais passam pelo backend;
* Auth aplicado;
* RBAC aplicado;
* App Check previsto/aplicado conforme arquitetura do projeto;
* rate limit = 5/min/UID;
* cache lazy;
* TTL máximo = 30 s;
* cache pode expirar antes por invalidação;
* cliente não lê/escreve diretamente a coleção interna de cache;
* frontend possui cache curto/UX de atualização;
* não existe scheduler de 30 s.

## Invalidação

* operações relevantes invalidam o menor escopo seguro;
* devolução com anomalia e sua resolução invalidam cache quando alteram o estado corrente;
* invalidação ocorre junto à mutação quando possível;
* não há recálculo imediato obrigatório;
* operações puramente históricas FLOW não invalidam estoque atual.

## UI/Relatórios

* período histórico não promete posição de estoque diária;
* estado atual e fluxo histórico estão semanticamente separados;
* PDF não depende de STOCK diário removido;
* medições anômalas não são silenciosamente transformadas em consumo definitivo.

---

# PARTE XX — VALIDAÇÃO TÉCNICA

Depois de implementar as alterações:

1. faça busca global por termos/semânticas antigas;
2. compile/valide LaTeX conforme o workflow real do repositório;
3. rode os gates formais existentes;
4. execute, conforme disponíveis na branch:

```bash
just spec-check
just spec-export
just alloy-check
git diff --check
```

5. rode testes adicionais diretamente afetados se houver;
6. não declare PASS se um comando não foi executado;
7. não silencie falhas preexistentes como se fossem causadas pela mudança;
8. diferencie:

   * falha nova;
   * falha preexistente;
   * ferramenta indisponível;
   * etapa não aplicável.

---

# PARTE XXI — AUDITORIA FINAL OBRIGATÓRIA

Depois das mudanças, faça uma auditoria completa de consistência.

Procure especificamente por contradições como:

```text
um arquivo diz FECHADO+NULL permitido
outro diz conteudo_nominal obrigatório;

um arquivo permite FECHADO sem tara
outro exige tara antes de descarte/quebra;

um arquivo diz FLOW-only
outro ainda exige snapshot 23:59;

um arquivo remove qtd_frascos_saldo_desconhecido diário
outro PDF ainda lê esse campo;

um arquivo diz backend-only
outro frontend ainda documenta query agregada direta;

um arquivo diz cache lazy
outro cria job de renovação;

um arquivo diz invalidação por mutação
outro promete validade incondicional de 30 s;

um arquivo diz 5 req/min/UID
outro usa IP como identidade principal;

um arquivo aceita peso real com anomalia
outro ainda usa failed-precondition e impede a devolução;

um arquivo distingue tara real de referência
outro trata tara derivada como limite físico absoluto;

um arquivo diz correção histórica não afeta estado atual
outro propaga replay até hoje.
```

Resolva essas contradições antes de finalizar.

---

# PARTE XXII — RELATÓRIO FINAL DO CODEX

Ao terminar, responda com um relatório objetivo contendo:

## 1. HEAD

```text
HEAD inicial:
HEAD final:
```

## 2. Arquivos alterados

Para cada arquivo:

```text
arquivo
→ motivo da alteração
```

## 3. HQs

```text
HQ-M2-004 → como foi resolvida
HQ-M2-005 → como foi resolvida
HQ-M2-006 → como foi resolvida
HQ-M2-007 → como foi resolvida
```

## 4. Arquitetura resultante

Explicar brevemente:

```text
Frasco_Reagente
→ estado atual

backend count()/sum()
→ dashboard atual

Historico/Emprestimo
→ Resumo_*_Diario FLOW-only

Sistema_Cache_Dashboard
→ cache efêmero lazy
```

## 5. Campos removidos

Listar exatamente os campos de STOCK removidos dos dois resumos.

## 6. Fluxo de devolução anômala

Informar:

* como peso abaixo da tara é registrado;
* como distingue tara real de referência;
* como a custódia física é encerrada;
* qual status/evento representa a anomalia;
* como o frasco fica impedido de nova retirada;
* como o saldo fica representado enquanto a anomalia não é resolvida;
* como ocorre nova pesagem;
* como ocorre confirmação posterior de esgotamento;
* como ocorre eventual recalibração de tara real;
* como os relatórios FLOW são reprocessados após resolução.

## 7. Cache

Informar:

* chave adotada;
* campos adotados;
* TTL;
* mecanismo de invalidação;
* operações que invalidam;
* Security Rules;
* rate limit.

## 8. CUE/Formal

Informar qualquer alteração formal feita ou explicitamente não necessária.

## 9. M2.2

Confirmar explicitamente:

```text
M2.2 NÃO foi iniciado nesta tarefa.
```

## 10. Validações

Apresentar cada comando/teste e resultado real.

## 11. Pendências reais

Somente listar pendências concretas ainda existentes.

Não criar novas “perguntas humanas” para decisões já resolvidas neste prompt.

Se surgir contradição genuinamente nova que não possa ser resolvida sem inventar uma regra de domínio, documente-a de forma precisa em vez de escolher silenciosamente.

---

# PRINCÍPIO FINAL

O desenho alvo é:

```text
                         ESTADO ATUAL
                              │
                       Frasco_Reagente
                       fonte canônica
                              │
                              ▼
                  Backend protegido
                count() / sum() sob demanda
                              │
                         cache lazy
                              │
                           Dashboard


                          HISTÓRICO
                              │
             Historico_Frasco / Emprestimo
                              │
                              ▼
              Resumo_Almoxarifado_Diario
                Resumo_Reagente_Diario
                              │
                         SOMENTE FLOW
                              │
                           Relatórios
```

Não voltar a introduzir acoplamento temporal D-1→D para manter posição diária de estoque.

Não criar infraestrutura de sincronização permanente quando uma consulta agregada server-side protegida resolve adequadamente a escala prevista do LCQUI.

Não rejeitar uma realidade física observada apenas para preservar uma invariante armazenada.

Quando:

```text
observação física
≠
estado metrológico esperado
```

o sistema deve preservar ambos:

```text
medição observada
+
registro explícito da inconsistência
```

e conduzir o frasco para um estado operacional seguro até a resolução.

Priorize:

```text
verdade dos dados observados
+
correção semântica
+
consistência documental
+
simplicidade arquitetural
+
auditabilidade
+
baixo acoplamento
```

sobre sofisticação desnecessária ou validações que incentivem o usuário a alterar dados reais.
