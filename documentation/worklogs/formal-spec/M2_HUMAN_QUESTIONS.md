# Perguntas humanas M2

Decorrentes da reconciliação documental M2.1b (pós-decisões humanas tomadas
após M2.1a). As decisões humanas foram incorporadas à documentação; perguntas
abaixo foram respondidas ou reapresentadas. Nenhuma resposta foi inferida.

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
- Frasco originalmente FECHADO e depois normalmente aberto usa `false`.
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

Status: OPEN

Origem: decisão D2 determina que `conteudo_nominal` pode ser NULL quando
desconhecido/ilegível e nunca 0 para representar desconhecido. A Seção 8 afirma
que a tara inicial de frasco FECHADO pode ser derivada do peso total e conteúdo
nominal "quando os dados necessários estiverem disponíveis". Não está definido
se um frasco FECHADO pode ser cadastrado com `conteudo_nominal = NULL` e, nesse
caso, qual a semântica de `peso_frasco_vazio` e de acompanhamento de saldo (a
decisão vigente mantém `saldo_desconhecido = false` para FECHADO).

Pergunta ao humano: frasco FECHADO pode ser cadastrado com conteúdo nominal
desconhecido? Se sim, inicia com `peso_frasco_vazio = NULL`? Mantém
`saldo_desconhecido = false` ou vira `true` até a primeira pesagem/abertura?

Decisão: PENDENTE — NÃO IMPLEMENTAR. Não bloqueia os pontos independentes da
reconciliação M2.1b.

## HQ-M2-005 — Retenção do limiar de 5 g abaixo da tara

Status: OPEN

Origem: D7 elimina o uso do limiar "diferença de até 5 g" como definição física
de esgotamento, mas admite mantê-lo para identificar anomalia ou exigir
justificativa, e manda registrar pergunta humana se a documentação não fornecer
suporte suficiente para alguma função específica desse limiar.

Pergunta ao humano: o limiar específico de 5 g abaixo da tara deve ser retido
como parâmetro de anomalia (com consequência/justificativa definidas) ou
eliminado por completo? As tolerâncias de Q06 já documentadas
(`max(1 g, 0,5%)` e `max(2 g, 2%)`) permanecem como sinal de anomalia.

Decisão: PENDENTE — NÃO IMPLEMENTAR. Não bloqueia os pontos independentes.

## HQ-M2-006 — Suficiência de replay para os resumos diários

Status: OPEN

Origem: D17 proíbe reconstruir o snapshot de fim de dia a partir do estado atual
e exige que eventos/histórico contenham informação suficiente para replay. A
auditoria documental não comprova que `Historico_Frasco_Reagente`,
`Emprestimo_Reagente`, eventos de domínio e `Registro_de_Auditoria` bastem para
reconstruir o estado efetivo no corte 23:59:59.999 sem consultar o documento
atual.

Pergunta ao humano: quais mutações devem emitir evento histórico persistido
(pesagem de rotina, correções compensatórias, ajustes administrativos) e se é
necessário persistir um snapshot mínimo de fim de dia das dimensões
`estado_fisico_frasco`, `disponibilidade`, `em_quarentena`, `vencido` e
`saldo_desconhecido`. Caso contrário, deve-se documentar explicitamente a lacuna
em vez de mascarar lendo o estado atual.

Decisão: PENDENTE — NÃO IMPLEMENTAR. Não bloqueia os pontos independentes.

## HQ-M2-007 — Pesagem de rotina

Status: OPEN

Origem: D10 exclui `registrarPesagemRotina` da lista fechada de justificativas
humanas obrigatórias e manda registrar pergunta humana se houver inconsistência
clara na documentação atual (o contrato recebe `motivo` string sem declarar
autoria humana obrigatória).

Pergunta ao humano: o `motivo` de `registrarPesagemRotina` é justificativa
humana obrigatória (sujeita a `trim >= 20`), observação humana opcional ou
mensagem automática suficiente?

Decisão: PENDENTE — NÃO IMPLEMENTAR.
