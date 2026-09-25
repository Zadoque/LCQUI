# Perguntas humanas M2

Decorrentes da reconciliação documental M2.1b (pós-decisões humanas tomadas
após M2.1a). Todas as sete perguntas abaixo estão RESOLVED. HQ-M2-004..007 foram
respondidas pela consolidação humana de 21/09/2026 e incorporadas às fontes
LaTeX publicadas no commit b5d3f099. Este registro foi atualizado posteriormente
por solicitação explícita do usuário. Nenhuma resposta foi inferida.

Fonte das respostas: [Consolidação das decisões humanas M2 e simplificação da arquitetura de estoque](<../../archive/formal-spec/Consolidação das decisões humanas M2 e simplificação da arquitetura de estoque.md>).
RESOLVED indica decisão de domínio consolidada documentalmente; não atesta
implementação no backend nem cobertura pelos modelos formais. No momento da
consolidação destas decisões, M2.2 ainda não havia sido iniciado; consultar
`FORMAL_SPEC_STATE.md` para o estado formal corrente.

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
- **EMENDA PRÉ-M8 (HQ-PRE-M8-001, decisão humana autorizada):** a formulação anterior “Estados VAZIO, QUEBRADO e DESCARTADO não permanecem com desconhecido” está **SUPERSEDIDA**: confundia estado físico com conhecimento metrológico. VAZIO confirmado resolve desconhecimento pela rota metrológica válida; QUEBRADO, DESCARTADO, EXTRAVIADO e QUARENTENA preservam a flag anterior. Quebra e descarte não são medição nem justificam fabricar quantidade zero/tara/pesagem. DESCARTADO permanece terminal operacionalmente.
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
Consequências relacionais são entradas futuras. No momento da consolidação
destas decisões, M2.2 ainda não havia sido iniciado; consultar
`FORMAL_SPEC_STATE.md` para o estado corrente.

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

## HQ-M2-008 — Descarte de frasco em quarentena

Status: RESOLVED (Alternativa B homologada)

Descoberta durante:
Auditoria independente pré-M2.4

Impacto primário: M2 (Alloy `aptoParaDescarte`) / M5 (quarentena/descarte).

Contexto:
A Seção 7 afirma que um frasco em quarentena pode ser descartado ou voltar ao
disponível (Seção 7, ~linha 52), mas a regra fechada de `descartarFrasco` aceita
apenas VAZIO, QUEBRADO ou (vencido e sem uso autorizado), sempre com
`disponibilidade != EMPRESTADO` (Seção 7, ~linha 192). A decisão de quarentena
`PENDENTE_DE_DESCARTE` em `resolverQuarentenaFrasco` apenas grava
`em_quarentena = false`, `disponibilidade = INDISPONIVEL` e `detalhe_status`
textual; não produz estado que `descartarFrasco` reconheça. Além disso,
`PENDENTE_DE_DESCARTE` também é derivado de `VENCIDO + uso_vencido_autorizado =
false` (Seção 4, tabela da máquina de estados) e existe como tipo de evento
(`Historico_Frasco_Reagente.tipo`), não como campo persistido.

Fontes:
- Section-7-Requisitos-e-Regras-de-Negocio.tex (linha ~52; linha ~192).
- Section-4-Modelagem-Entidades-SQL-3FN.tex (máquina de estados ~855-863;
  enum de histórico ~423-430).
- Section-8-Descricao-das-telas-Dashboards.tex (UI-07, ~232/285).
- Section-9-Exemplos-de-fluxos.tex (ALM-06, ~210).
- Section-10-.../Section-10-Subsection-5-Fluxo-de-Reagentes.tex
  (`resolverQuarentenaFrasco` ~1196-1269; `descartarFrasco` ~1043-1112).
- specification/alloy/reagents/bottle_state.als (`aptoParaDescarte`, M2.2).

Estado/cenário:
```text
estado_fisico_frasco = ABERTO
vencido = false
em_quarentena = true
disponibilidade = INDISPONIVEL
motivo = contaminação confirmada
gestor decide DESCARTAR
```
Não existe caminho documental que chegue a `DESCARTADO` nesse cenário, embora a
Seção 7 diga que quarentena pode ser descartada.

Alternativa A:
`em_quarentena = true` passa a habilitar descarte diretamente.

Alternativa B:
Quarentena exige a decisão humana `PENDENTE_DE_DESCARTE`, e só então o descarte
é permitido (a decisão precisa ser um estado persistido que `descartar` aceite).

Alternativa C:
Introduzir um estado/campo estruturado explícito `PENDENTE_DE_DESCARTE`,
independente de `vencido`, `em_quarentena` e `detalhe_status` textual.

Consequências:
- A e B poderiam ser modeladas com `em_quarentena` (já presente nas 29 colunas),
  mas exigem alterar `aptoParaDescarte` e a assinatura de estado do Alloy M2.2,
  reabrindo M2.2 e revalidando M2.3.
- C exige nova coluna persistida em `Frasco_Reagente` (29 → 30), reabrindo
  M2.1d, depois M2.2 e M2.3.
- Qualquer alternativa altera a semântica de descarte já validada em M2.2.

Impacto formal:
- CUE: SIM em C (nova coluna); NÃO em A/B (`em_quarentena` já existe).
- Alloy: SIM em A/B/C (`aptoParaDescarte` e/ou assinatura de `Estado`).
- IR/M2.3: SIM (ficaria stale após a correção).
- milestone futuro: M5; e M2.1d/M2.2/M2.3 se a opção formal mudar.

Parte bloqueada:
Modelagem formal de descarte em quarentena (M5) e a reconciliação de M2.

Decisão humana (homologada): Alternativa B.

Semântica normativa:
Um frasco em quarentena NÃO pode ser descartado diretamente. O gestor deve
primeiro encerrar formalmente a quarentena com a decisão humana
`PENDENTE_DE_DESCARTE`, com laudo/justificativa humana obrigatória. Somente após
essa decisão estruturada o descarte institucional pode ocorrer.

```text
QUARENTENA --decisão humana PENDENTE_DE_DESCARTE--> autorização operacional
           --descartarFrasco--> DESCARTADO
```

Não existe `QUARENTENA --> DESCARTADO` direto.

Consequências:
- nenhuma nova coluna em `Frasco_Reagente`; M2.1d permanece com 29 colunas;
- a decisão `PENDENTE_DE_DESCARTE` ganha representação operacional estruturada
  server-owned (projeção auxiliar, não coluna SQL/3FN nem histórico);
- Alloy M2.2 precisa ser reconciliado (`emQuarentena` + autorização técnica);
- M2.3 precisará ser revalidado.

As alternativas A e C permanecem registradas acima como histórico.

## HQ-M2-009 — Encerramento da pendência metrológica e resolução pós-devolução anômala

Status: RESOLVED (Alternativa A homologada)

Descoberta durante:
Auditoria independente pré-M2.4

Impacto primário: M6 (Q06/tara) / M4 (retirada/devolução).

Contexto:
`registrarDevolucao` cria pendência em anomalia: `status =
DEVOLVIDO_COM_ANOMALIA`, `consumo_validado = false`, `anomalia_metrologica`,
`peso_retorno_efetivo = null`, `id_resolucao_metrologica = null`, frasco em
quarentena/INDISPONIVEL. `resolverQuarentenaFrasco` bloqueia
`VOLTAR_A_DISPONIVEL` enquanto `existePendenciaMetrologicaTx` for verdadeiro.
A narrativa da Seção 10 descreve quatro caminhos de resolução (repetir pesagem;
confirmar esgotamento após inspeção; recalibrar tara real; erro administrativo
suportado) e afirma que a resolução grava evento AJUSTE e referencia
`id_resolucao_metrologica`, sem apagar `peso_retorno`. (Nota posterior: a quarta
rota — erro administrativo como resolução metrológica — foi **supersedida por
HQ-M6-001**; o contrato normativo corrente possui três rotas metrológicas e a V1
não possui correção administrativa metrológica.) Porém:
- nenhum pseudocódigo define `existePendenciaMetrologicaTx` nem sua condição;
- nenhuma operação define `consumo_validado = true` ou
  `id_resolucao_metrologica` não nulo;
- `recalibrarTaraFrascoEsgotado` exige `estado_fisico_frasco = VAZIO` e não
  encerra `consumo_validado`;
- `registrarPesagemRotina` declara explicitamente que não resolve pendência
  automaticamente;
- `corrigirOperacao` cobre apenas retirante.

Consequência: a pendência pode nunca ser encerrada por contrato executável, e a
resolução de quarentena por `VOLTAR_A_DISPONIVEL` permanece permanentemente
bloqueada; a rota `PENDENTE_DE_DESCARTE` recai em HQ-M2-008.

Fontes:
- Section-10-.../Section-10-Subsection-5-Fluxo-de-Reagentes.tex
  (`registrarDevolucao` ~557-770; `recalibrarTaraFrascoEsgotado` ~966-1035;
  `resolverQuarentenaFrasco` ~1196-1269; `corrigirOperacao` ~1281-1352;
  contrato de resolução ~1354-1373).
- Section-10-.../Section-10-Subsection-11-Funcoes-Academicas-e-Pesagem.tex
  (`registrarPesagemRotina` ~68-97).
- Section-4-Modelagem-Entidades-SQL-3FN.tex (Emprestimo_Reagente,
  `consumo_validado`/`id_resolucao_metrologica`, ~455-470).
- Section-5-Notas-de-Mapeamento-para-Firestore.tex (parágrafo "Extensões ...
  decisões M2 consolidadas").
- Section-7-Requisitos-e-Regras-de-Negocio.tex (~150).
- functions/src/reagentes.ts (implementação legada; sem os campos).

Estado/cenário:
```text
E0: empréstimo EM_USO
E1: devolução com anomalia -> DEVOLVIDO_COM_ANOMALIA, consumo_validado=false,
    id_resolucao_metrologica=null, frasco em quarentena/INDISPONIVEL
E2: inspeção posterior constata recipiente vazio
E3: tentativa de resolver quarentena -> bloqueada por pendência metrológica
```
Não existe contrato de pseudocódigo que leve de E2 a "pendência encerrada".

Alternativa A:
Endpoints tipados separados para cada caminho fechado (repetir pesagem;
confirmar esgotamento após inspeção; recalibrar tara; corrigir operação), cada um
encerrando a pendência conforme seu contrato.

Alternativa B:
Um único resolvedor metrológico fechado (dispatcher tipado) que despacha para os
caminhos enumerados, sem aceitar campo/valor arbitrário nem undo universal.

Alternativa C:
Ampliar uma operação existente (p.ex. `registrarPesagemRotina` ou
`recalibrarTaraFrascoEsgotado`) para também encerrar a pendência.

Consequências:
- A é mais explícita e preserva a lista fechada; cria mais endpoints e caminhos
  de idempotência.
- B concentra a lógica, mas exige cuidado para não virar "correção genérica"
  proibida (nada de campo+valor ou ação arbitrária).
- C contraria a decisão atual de que pesagem de rotina não resolve pendência e
  que a recalibração exige recipiente VAZIO; pode misturar contratos distintos.
- Todas exigem definir idempotência, TOCTOU, autoria, evento histórico, FLOW
  (reprocessar somente a data da devolução) e invalidação de cache apenas se
  houver efeito corrente.

Impacto formal:
- CUE: NÃO (não é campo de Frasco_Reagente; campos de metrologia pertencem a
  Emprestimo_Reagente).
- Alloy M2.2: NÃO (fora do recorte de Frasco_Reagente).
- IR/M2.3: NÃO diretamente.
- milestone futuro: M4/M6 (e dependência com M5 para saída de quarentena).

Parte bloqueada:
Fluxo de resolução de devolução anômala e encerramento da pendência
metrológica; saída de quarentena por `VOLTAR_A_DISPONIVEL`.

Decisão humana (homologada): Alternativa A.

Semântica normativa:
As formas de resolução da devolução anômala permanecem um conjunto FECHADO de
contratos tipados. Não existe `resolverPendenciaMetrologica` público nem
dispatcher genérico; cada resolução possui contrato próprio.

Caminhos preservados:
1. repetir pesagem;
2. confirmar esgotamento após inspeção;
3. recalibrar tara real, quando aplicável;
4. correção administrativa já explicitamente suportada.

Regras preservadas:
- não existe resolvedor público genérico;
- resoluções permanecem tipadas;
- pesagem ordinária não resolve pendência automaticamente;
- recalibração não fabrica evidência histórica;
- correção administrativa permanece conjunto fechado.

As alternativas B e C permanecem registradas acima como histórico.
