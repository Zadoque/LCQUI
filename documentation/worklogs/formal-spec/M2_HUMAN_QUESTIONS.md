# Perguntas humanas M2

Decorrentes da reconciliação documental M2.1b (pós-decisões humanas tomadas
após M2.1a). Todas as sete perguntas abaixo estão RESOLVED. HQ-M2-004..007 foram
respondidas pela consolidação humana de 21/09/2026 e incorporadas às fontes
LaTeX publicadas no commit b5d3f099. Este registro foi atualizado posteriormente
por solicitação explícita do usuário. Nenhuma resposta foi inferida.

Fonte das respostas: [Consolidação das decisões humanas M2 e simplificação da arquitetura de estoque](<../../archive/formal-spec/Consolidação das decisões humanas M2 e simplificação da arquitetura de estoque.md>).
RESOLVED indica decisão de domínio consolidada documentalmente; não atesta
implementação no backend nem cobertura pelos modelos formais. M2.2 NÃO iniciado.

Decisões já confirmadas, não reabrir: DEC-M2-HUMAN-001 permite lote NULL com
especificação conhecida; DEC-M2-HUMAN-002 exige mínimo 20 após trim somente
para justificativa humana obrigatória. Fontes referem-se aos HEADs M2.0–M2.1a;
âncoras identificam os trechos mesmo após harmonização. S10 =
documentation/Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/.

## HQ-M2-001 — Estados com abertura histórica desconhecida

Status: RESOLVED (decisão humana incorporada em M2.1b)

Escopo: ciclo de vida de abertura_historica_desconhecida.
Fonte: S5, item abertura_historica_desconhecida; S10/S5 cadastrarFrascoAberto
e registrarExtravioOuReencontro.

Decisão humana:
- `abertura_historica_desconhecida` é uma flag HISTÓRICA.
- Quando true: `data_abertura = NULL`.
- O estado físico atual nunca é FECHADO quando a flag é true.
- A flag é PRESERVADA mesmo que o estado atual mude depois para
  VAZIO, QUEBRADO, DESCARTADO ou EXTRAVIADO.
- Significado: sabemos que o recipiente já havia sido aberto, mas não sabemos
  em que data ocorreu a primeira abertura. Uma transição posterior não torna a
  data conhecida.

Consequência documental: removida a fabricação de `data_abertura` no reencontro;
quando um frasco historicamente fechado é reencontrado aberto sem data
determinável, marca-se a flag e `data_abertura = NULL` (ver HQ-M2-002/validade).

## HQ-M2-002 — Ciclo de vida de saldo desconhecido

Status: RESOLVED (decisão humana incorporada em M2.1b)

Escopo: saldo_desconhecido em cadastro, pesagem, esgotamento e mudanças de estado.
Fonte: S5, item saldo_desconhecido; S10/S5 cadastrarFrascoAberto,
registrarDevolucao e descartarFrasco.

Decisão humana:
- `saldo_desconhecido` representa desconhecimento ATUAL da quantidade remanescente.
  Não é flag histórica.
- Frasco cadastrado JA_ABERTO inicia com `saldo_desconhecido = true`.
- Conforme HQ-M2-004, FECHADO inicia com saldo conhecido somente quando há
  dados quantitativos suficientes. Com conteúdo nominal desconhecido e sem
  tara, inicia com `true`; abertura ou pesagem bruta isolada não mudam isso.
- Recipiente efetivamente esvaziado e com tara real medida passa a `false`.
- Estados VAZIO, QUEBRADO e DESCARTADO não permanecem com desconhecido.
- EXTRAVIADO preserva o valor anterior (extravio não cria conhecimento nem
  desconhecimento novo do saldo).
- Quarentena também não altera a flag por si só.

Consequência documental: cadastro aberto grava `true`; esgotamento confirmado
grava `false`; extravio/requarentena e quarentena preservam.

## HQ-M2-003 — Quais motivos são justificativas humanas obrigatórias?

Status: RESOLVED (lista fechada incorporada em M2.1b)

A regra `trim(texto).length >= 20` é obrigatória SOMENTE para os contratos
humanos enumerados:

1. entrada manual em quarentena (`colocarFrascoEmQuarentena`);
2. saída/liberação de quarentena (`resolverQuarentenaFrasco`);
3. decisão de quarentena durante cadastro vencido;
4. decisão de quarentena na primeira abertura;
5. extravio;
6. reencontro;
7. descarte institucional;
8. recalibração de tara real (`recalibrarTaraFrascoEsgotado`);
9. autoatendimento, conforme regra já existente;
10. justificativa metodológica Q04/Q14, preservando também seu máximo específico
    já existente;
11. correção administrativa/operacional de ação do gestor (`corrigirOperacao`).

Não é regra genérica para toda string chamada `motivo`, `detalhe` ou
`observacao`. Mensagens automáticas continuam isentas. Não se impõe mínimo
global de 20 em `detalhe_status` persistido.

## HQ-M2-004 — Cadastro FECHADO com conteúdo nominal desconhecido

Status: RESOLVED (decisão humana consolidada em 21/09/2026)

Origem: esclarecer cadastro FECHADO quando o conteúdo nominal é desconhecido
ou ilegível. A antiga implicação universal FECHADO ⇒ saldo conhecido foi superada.

Decisão humana:

- Permitir `condicao_inicial_cadastro = FECHADO` com `conteudo_nominal = NULL`;
  nunca usar zero para representar desconhecido.
- Nesse cadastro: estado físico FECHADO, `peso_frasco_vazio = NULL`,
  `origem_tara = NULL` e `saldo_desconhecido = true`.
- Abertura ou primeira pesagem bruta não resolvem automaticamente o saldo.
- Ao esvaziar efetivamente e medir o recipiente vazio, aplicar o fluxo normal:
  tara real medida, VAZIO/INDISPONIVEL e saldo conhecido zero.
- Se nunca obtiver tara real, seguir exatamente o ciclo já definido para
  JA_ABERTO em situação metrológica equivalente, sem fluxo especial por origem.
  Quebra, descarte e extravio não exigem fabricar tara, saldo ou pesagem vazia.
- EXTRAVIADO preserva a flag; reencontro mantém desconhecimento enquanto não
  surgir informação suficiente. QUEBRADO/DESCARTADO seguem a semântica terminal
  já estabelecida, sem inventar quantidade química ou tara.
- Condição inicial é fato histórico imutável; saldo desconhecido é estado
  metrológico atual. Saldo conhecido de FECHADO depende de dados suficientes.

Fontes reconciliadas: Seções 4, 5, 7, 8 e S10/S5 (cadastros e ciclo de vida).

## HQ-M2-005 — Eliminação do limiar fixo e devolução com anomalia

Status: RESOLVED (decisão humana consolidada em 21/09/2026)

Origem: decidir se o antigo limiar de 5 g teria alguma função residual.

Decisão humana:

- Eliminar completamente os 5 g: não são definição de vazio, tolerância
  secundária, justificativa, exceção nem fallback.
- Preservar Q06 dinâmica: normal `max(1 g, 0,005 × peso_saida)`;
  higroscópico `max(2 g, 0,02 × peso_saida)`. Q06 compara retorno com saída;
  não substitui uma tolerância de retorno versus tara.
- Preservar exatamente o peso observado, inclusive abaixo da tara. Não rejeitar
  a devolução por essa contradição nem exigir alteração fictícia da leitura.
- Distinguir referência teórica de tara medida real por `origem_tara`.
  A referência derivada não constitui limite físico absoluto.
- Sem confirmação de vazio, retorno abaixo de tara real encerra custódia como
  `DEVOLVIDO_COM_ANOMALIA`, registra `RETORNO_ABAIXO_TARA_REAL` e mantém o
  frasco em quarentena/INDISPONIVEL até resolução. A medição permanece em
  `peso_atual`; saldo desconhecido e saldos derivados NULL evitam saldo negativo.
  O motivo automático não exige justificativa humana de 20 caracteres.
- Com vazio explicitamente confirmado, aplicar VAZIO/INDISPONIVEL e saldo zero.
  Sem tara real anterior, a medição vazia estabelece a tara real e pode substituir
  a referência teórica. Se já existe tara real divergente, preservá-la, registrar
  a discrepância e aceitar a devolução; sua substituição exige o contrato
  `recalibrarTaraFrascoEsgotado`, recipiente vazio e justificativa auditável.
- Enquanto quantitativamente inconsistente, consumo permanece não validado:
  `consumo_validado=false`, `medida_utilizada=NULL` e
  `peso_retorno_efetivo=NULL`. Não contabilizar consumo definitivo em FLOW.
- Oferecer nova pesagem preservando a original, confirmação posterior de vazio,
  recalibração auditável de recipiente vazio ou correção administrativa já
  explicitamente suportada. Não criar undo universal nem recalibrar com produto.
- Resolução preserva autoria, instante e vínculo da medição efetiva. Consumo
  validado pertence à data da devolução física; reprocessar somente datas FLOW
  diretamente afetadas. Nova retirada exige resolução e aptidão operacional.

Fontes reconciliadas: Seções 4, 5, 7, 8, 9 e S10/S5, S10/S7 e S10/S9.

## HQ-M2-006 — Resumos FLOW-only e estoque atual sob demanda

Status: RESOLVED (decisão arquitetural humana consolidada em 21/09/2026)

Origem: suficiência dos históricos para reconstruir posição no fim do dia.
Essa necessidade foi superada: não persistir nem reconstruir STOCK diário
para os dois resumos de reagentes.

Decisão humana:

- `Resumo_Almoxarifado_Diario` e `Resumo_Reagente_Diario` materializam somente
  fatos FLOW do próprio dia civil. Campos de posição de estoque foram removidos;
  o campo legado de consumo sem unidade foi removido por redundância/ambiguidade.
- Usar intervalo semiaberto em America/Sao_Paulo. D-1 é apenas o alvo da execução
  normal, nunca uma dependência para calcular D. Não há snapshot de fim de dia,
  replay até hoje, cascata temporal ou critério de convergência entre dias.
- Correções permanecem compensatórias, auditáveis e em conjunto fechado.
  Reprocessar somente as datas diretamente afetadas, incluindo origem/destino
  se um contrato suportado mudar a atribuição temporal de um fato.
- Preservar snapshots históricos necessários aos fatos FLOW e à auditoria
  (pesos, unidade, densidade aplicada, identidades e resolução metrológica),
  sem duplicar dimensões somente para reconstruir posição diária.
- `Frasco_Reagente` é a autoridade corrente. Não criar materialized view
  persistente de estoque atual. Backend executa `count()/sum()` sobre frascos
  e saldos derivados server-owned no próprio documento canônico.
- Agregações atuais passam por App Check, Auth, RBAC/escopo e limite de
  5 solicitações por minuto por UID, inclusive em cache hit; IP não é identidade
  primária. Cliente não executa diretamente essas agregações.
- `Sistema_Cache_Dashboard` é efêmero, compartilhado por escopo autorizado,
  lazy e descartável. Validade máxima de 30 segundos ou invalidação anterior
  por mutação relevante. Sem scheduler de renovação nem recálculo obrigatório
  após invalidar; publicação verifica geração para não repor resultado obsoleto.
- Invalidar o menor escopo seguro junto à mutação corrente, inclusive devolução
  anômala e resolução com efeito atual. Correções exclusivamente históricas e
  reprocessamento FLOW não invalidam estoque atual.
- Rules documentais negam acesso cliente direto ao cache e limite internos.
  Frontend mantém cache curto, instante do cálculo e UX de atualização.
- Dashboard separa fotografia atual de movimentações/consumo históricos.
  Relatórios não dependem de STOCK diário nem tratam consumo pendente como final.
- Não estender esta decisão ao patrimônio: seus snapshots diários permanecem.

Fontes reconciliadas: Seções 5, 6, 8, 11 e S10/S5, S10/S7, S10/S9 e S10/S11.
Consequências relacionais são entradas futuras; M2.2 NÃO foi iniciado.

## HQ-M2-007 — Pesagem de rotina

Status: RESOLVED (decisão humana consolidada em 21/09/2026)

Origem: esclarecer autoria e obrigatoriedade do motivo em registrarPesagemRotina.

Decisão humana:

- `registrarPesagemRotina` não pertence à lista fechada de justificativas humanas
  obrigatórias; não exigir `trim >= 20` para uma pesagem ordinária.
- Observação humana é opcional. O nome `motivo` pode permanecer por compatibilidade,
  desde que não seja interpretado como justificativa humana obrigatória.
- Sem observação, backend pode registrar descrição canônica automática,
  identificada como produzida pelo sistema, nunca atribuída ao gestor.
- Quarentena manual, recalibração e outras ações especiais que surjam durante a
  pesagem são operações distintas e conservam seus contratos de justificativa.

Fontes reconciliadas: Seções 7, 8, S10/S5 e S10/S11.
