# Perguntas humanas M2

Decisões já confirmadas, não reabrir: DEC-M2-HUMAN-001 permite lote NULL com
especificação conhecida; DEC-M2-HUMAN-002 exige mínimo 20 após trim somente
para justificativa humana obrigatória. Nenhuma resposta abaixo foi inferida.
Fontes referem-se ao HEAD de entrada ce299d42; âncoras identificam os trechos
mesmo após harmonização. S10 = documentation/Section-10-Tecnologia-e-Relatorios-Vercel-Firebase/.

## HQ-M2-001 — Estados com abertura histórica desconhecida

Status: OPEN

Escopo: ciclo de vida de abertura_historica_desconhecida.
Fonte exata: documentation/Section-5-Notas-de-Mapeamento-para-Firestore.tex,
item abertura_historica_desconhecida; S10/Section-10-Subsection-5-Fluxo-de-Reagentes.tex,
cadastrarFrascoAberto e registrarExtravioOuReencontro.

Fato conhecido: true implica data_abertura=null. Cadastro aberto grava ABERTO
inicialmente; o recipiente pode passar por outras transições depois.

Ponto que NÃO está definido: conjunto exato de estados atuais compatíveis com
“estado coerente com abertura anterior” e preservação/limpeza da flag.

Pergunta ao humano: quando abertura_historica_desconhecida=true, quais estados
atuais são permitidos: FECHADO, ABERTO, VAZIO, QUEBRADO, DESCARTADO, EXTRAVIADO?
Para cada transição, a flag deve ser preservada ou limpa?

Alternativas possíveis:
A) Flag histórica preservada; humano deve enumerar os estados permitidos.
B) Flag limitada a estados atuais determinados; humano deve enumerá-los e indicar quando limpar.
C) Política por transição, com tabela explícita fornecida pelo humano.
Outra) Descrever a política desejada.

Impacto:
- CUE: só data null está implementado; não restringir estados sem resposta.
- Alloy: não introduzir fatos sobre estados desta flag sem decisão.
- Backend/Firestore: determina persistência/limpeza da flag nas transições.
- documentação: completar o significado de “coerente”.

Bloqueia:
- M2.1a? Não, registro da pergunta é parte do checkpoint.
- M2.2? A decisão de início aguarda respostas/revisão; não modelar esta flag por inferência.
- fechamento M2? Resolver ou delimitar explicitamente o escopo com o humano.

Decisão:
PENDENTE — NÃO IMPLEMENTAR.

## HQ-M2-002 — Ciclo de vida de saldo desconhecido

Status: OPEN

Escopo: saldo_desconhecido em pesagem e mudanças de estado.
Fonte exata: documentation/Section-5-Notas-de-Mapeamento-para-Firestore.tex,
item saldo_desconhecido; S10/Section-10-Subsection-5-Fluxo-de-Reagentes.tex,
cadastrarFrascoAberto (SALDO_DESCONHECIDO), registrarDevolucao e descartarFrasco;
S10/Section-10-Subsection-11-Funcoes-Academicas-e-Pesagem.tex, registrarPesagemRotina.

Fato conhecido: cadastro na modalidade SALDO_DESCONHECIDO grava true e estado
inicial ABERTO; saldos desconhecidos não entram nos totais aferidos.

Ponto que NÃO está definido: ciclo de vida completo da flag após o cadastro.

Pergunta ao humano:
1. Pesagem posterior que determina o saldo deve obrigatoriamente limpar a flag?
2. Ao passar a VAZIO, deve virar false?
3. Em QUEBRADO, deve ser preservada ou limpa?
4. Em EXTRAVIADO, deve ser preservada?
5. Em DESCARTADO, permanece como informação histórica ou vira false?
6. true exige estado atual ABERTO ou representa saldo ainda não quantificado?

Alternativas possíveis:
A) Indicador de desconhecimento atual, com transições de limpeza enumeradas pelo humano.
B) Indicador histórico preservado, com semântica de consulta definida pelo humano.
C) Política distinta para cada uma das seis situações acima.
Outra) Descrever explicitamente cada caso.

Impacto:
- CUE: manter somente boolean obrigatório até definição de implicações locais.
- Alloy: não inferir transições de flag.
- Backend/Firestore: atualização da flag e agregados depende da resposta.
- documentação: completar regra operacional sem equivaler desconhecido a zero/null.

Bloqueia:
- M2.1a? Não.
- M2.2? Decidir início apenas após respostas/revisão; nenhuma regra de saldo presumida.
- fechamento M2? Resolver ou delimitar explicitamente com o humano.

Decisão:
PENDENTE — NÃO IMPLEMENTAR.

## HQ-M2-003 — Quais motivos são justificativas humanas obrigatórias?

Status: OPEN

Escopo: operações relacionadas a frascos encontradas na busca documental.
Fonte exata: tabela abaixo; S4 = documentation/Section-4-Modelagem-Entidades-SQL-3FN.tex;
S5 = documentation/Section-5-Notas-de-Mapeamento-para-Firestore.tex;
S7 = documentation/Section-7-Requisitos-e-Regras-de-Negocio.tex;
S10.5/6/9/10/11 = arquivos Section-10-Subsection correspondentes dentro de S10.
Arquivos archive/worklogs são evidência histórica, não contratos novos;
operações acadêmicas/patrimoniais sem relação com Frasco estão fora do recorte.

Fato conhecido: mínimo 20 após trim já decidido para entradas humanas obrigatórias.
A = claramente justificativa humana obrigatória; B = mensagem automática;
C = escopo ambíguo. Só A recebe a nova validação imediatamente.

| Operação/campo | Classe | Fonte exata e evidência |
|---|---|---|
| Cadastro fechado vencido / detalheStatus em QUARENTENA | A | S10.5 cadastrarFrascoFechado; S7 regra de quarentena; S5 detalhe_status |
| Cadastro aberto vencido / detalheStatus em QUARENTENA | A | S10.5 cadastrarFrascoAberto; mesmas regras |
| Abertura que vence / detalheStatus em QUARENTENA | A | S10.5 registrarAberturaFrasco, rejeição explícita quando falta detalhe |
| EXTRAVIAR e REENCONTRAR / motivo | A | S4 Histórico: exige justificativa explicitamente nesses eventos; S10.5 StatusExtraordinario |
| Recalibrar tara esgotada / motivo | A | S4 Histórico: ajustes manuais; S10.5 recalibrarTaraFrascoEsgotado |
| Recalibração parcial ou esgotamento com diferença >5g / motivoRecalibracao | A | S4 Q06: recalibração formal com justificativa; S10.5 registrarDevolucao |
| Pesquisa excepcional / justificativaMetodologica | A | S7 Q04/Q14; S5 justificativa_metodologica; S10.5 validarAceiteTcrTx; S10.10 contrato auxiliar. Limite 2000 preexistente, não novo limite geral |
| Autoatendimento / justificativaAutoAtendimento | A | S7 Q14 e S10.10 validarAutoAtendimentoTx exigem justificativa na condição já definida |
| Descarte institucional / motivo | C | S10.5 DescarteFrasco recebe string; S7 status/vencimento/descarte não explicita política de justificativa humana obrigatória |
| Pesagem de rotina / motivo | C | S10.11 registrarPesagemRotina recebe string; evento INVENTARIO_ROTINA não equivale automaticamente a ajuste manual |
| Entrada/saída manual de quarentena fora dos três fluxos acima | C | S11 regra transacional de Frasco exige motivo/autor, mas contrato de entrada e autoria do texto não discriminados |
| Segunda via de etiqueta / motivo | C | S5 complemento Etiquetas exige motivo na auditoria; S10.9 gera metadata motivo fixo segunda_via_conferencia; falta distinguir entrada humana adicional |
| Retenção por anomalia na devolução / detalhe_status e motivo do histórico | B | S10.5 registrarDevolucao gera mensagens internamente |
| Vencido devolvido com destino QUARENTENA / detalhe_status | B para texto atual; C para necessidade de entrada adicional | S10.5 registrarDevolucao gera mensagem fixa, não recebe detalheStatus |
| Primeira abertura / motivo no histórico | B | S10.5 registrarAberturaFrasco gera texto fixo |
| Pendente de descarte / detalhe_status de fallback | B | S10.5 cadastros/abertura/devolução geram mensagem fixa |
| detalheStatus opcional fora de QUARENTENA nos cadastros/abertura | C | S10.5 aceita texto opcional nos outros destinos; não declara justificativa obrigatória |

Ponto que NÃO está definido: obrigatoriedade/origem humana dos itens C. Não
usar o nome “motivo” nem string obrigatória na interface como resposta normativa.

Pergunta ao humano: para cada item C, o texto é justificativa humana obrigatória
(sujeita a >=20 após trim), observação humana opcional, ou mensagem automática
suficiente? Na devolução que escolhe QUARENTENA, exige também justificativa
humana além da mensagem automática? Quais entradas/saídas manuais de quarentena
precisam de contrato explícito?

Alternativas possíveis:
A) Indicar quais itens C são obrigatórios e sujeitos ao mínimo já decidido.
B) Indicar quais são opcionais e quais usam somente mensagem automática.
C) Fornecer tabela por operação/condição distinguindo ambos os casos.
Outra) Detalhar contratos específicos.

Impacto:
- CUE: linha persistida só exige detalhe não nulo em quarentena, sem mínimo global.
- Alloy: não inventar invariantes de autoria ou comprimento.
- Backend/Firestore: futura implementação dos contratos de entrada; aplicação não alterada nesta auditoria.
- documentação: completar itens C somente após resposta; mensagens B não são formulários.

Bloqueia:
- M2.1a? Não; itens A harmonizados, B preservados, C pendentes.
- M2.2? Início depende da revisão humana; não propagar itens C como fatos.
- fechamento M2? Resolver ou delimitar expressamente o que continuará fora do recorte.

Decisão:
PENDENTE — NÃO IMPLEMENTAR.
