# **Relatório de Auditoria Metrológica, Estrutural e Análise de Deadlocks — LCQUI**

Este parecer técnico analisa as contradições lógico-matemáticas, incompatibilidades de tipos e becos sem saída operacionais identificados a partir do confronto rigoroso entre o modelo de dados formal (Seção 4), o dicionário NoSQL/regras de negócio (Seções 5, 7 e 8\) e as implementações em TypeScript das Cloud Functions (Seção 10).

## **BATERIA 1: Simulação Numérica de Balança e Tolerância Q06**

### **Caso Numérico A: Esgotamento abaixo da tara**

> * **Condições Iniciais:** $P\_{\\text{vazio}} \= 120\\text{ g}$, $P\_{\\text{saida}} \= 150\\text{ g}$, $P\_{\\text{retorno}} \= 117\\text{ g}$.  
> * **Execução linha a linha em registrarDevolucao (Seção 10.2.3, p. 166–167):**  
  1. perdaEvaporacao \= 0\.  
  2. pesoConsumido \= Math.max(0, 150 \- 117 \- 0\) \= 33 g.  
  3. diferencaTara \= frasco.peso\_frasco\_vazio \- dados.pesoRetorno \= 120 \- 117 \= 3 g.  
  4. Como diferencaTara \> 0 && diferencaTara \<= 5:  
     * **Cenário A.1 (confirmarEsgotamento \=== true):**  
       * esgotado \= true.  
       * Reatribuição: pesoConsumido \= Math.max(0, 150 \- 120\) \= 30 g (e não $33\\text{ g}$).  
       * volumeUtilizado: se sólido, $30\\text{ g}$; se líquido com densidade $\\rho$, $30/\\rho\\text{ mL}$.  
       * peso\_atual gravado no frasco: frasco.peso\_frasco\_vazio ($120\\text{ g}$), normalizando o resíduo físico real.  
       * medida\_usada incrementado com: pesoConsumido ($30\\text{ g}$).  
       * O empréstimo recebe peso\_retorno \= 117 g e medida\_utilizada \= 30 ($30\\text{ g}$ ou $30/\\rho\\text{ mL}$).  
     * **Cenário A.2 (confirmarEsgotamento \=== false ou omitido):**  
       * esgotado \= false.  
       * Linha 166: if (diferencaTara \> 0 && \!esgotado) avalia como true.  
       * Lança HttpsError("failed-precondition", "Requer recalibrarTaraFrascoEsgotado...").  
> * **Análise do Beco sem Saída (Deadlock):**  
>   Ao lançar HttpsError, a transação do Firestore sofre **rollback integral**.  
>   A mensagem de erro aponta para recalibrarTaraFrascoEsgotado. Todavia, ao inspecionar o código de recalibrarTaraFrascoEsgotado (p. 173–174), essa função **apenas atualiza a tara** (peso\_frasco\_vazio \= peso\_vazio\_real) e registra um histórico AJUSTE. Ela **não encerra o empréstimo** nem altera disponibilidade ou peso\_atual.  
>   Para concluir a devolução, o operador precisa chamar registrarDevolucao novamente. Se ele não souber que deve enviar confirmarEsgotamento: true ou se a interface do balcão não apresentar o modal de esgotamento ao receber o erro failed-precondition, o empréstimo permanece permanentemente em EM\_USO ou ATRASADO.

### **Caso Numérico B: Ganho Anômalo de Massa**

> * **Condições Iniciais:** $P\_{\\text{saida}} \= 200\\text{ g}$, $P\_{\\text{retorno}} \= 203\\text{ g}$, não-higroscópico (eh\_higroscopico \= false).  
> * **Cálculo de Tolerância Q06:**  
>   $$\\Delta\_{\\text{max}} \= \\max(1,0\\text{ g};\\ 0,005 \\times 200\\text{ g}) \= \\max(1,0;\\ 1,0) \= 1,0\\text{ g}$$  
>   $$\\text{Limite máximo permitido} \= P\_{\\text{saida}} \+ \\Delta\_{\\text{max}} \= 201,0\\text{ g}$$  
> * **Execução em registrarDevolucao (p. 167):**  
>   Como $P\_{\\text{retorno}} \= 203\\text{ g} \> 201\\text{ g}$:  
>   TypeScript  
>   if (dados.pesoRetorno \> limiteMaxRetorno) {  
>   &nbsp;&nbsp;throw new HttpsError("invalid-argument", "Ganho de massa excede tolerância Q06...");  
>   }

> * **Análise do Beco sem Saída e Falsa Promessa de Quarentena:**  
>   A Seção 7.2.14 e a Seção 7.2.20 prometem que anomalias em devoluções levam o frasco à quarentena ou recusa rastreada. Entretanto, ao disparar throw new HttpsError("invalid-argument"), o Firestore **aborta a transação sem gravar nenhuma alteração**.  
  * O documento Emprestimo\_Reagente permanece com status EM\_USO (ou ATRASADO).  
  * O documento Frasco\_Reagente permanece com disponibilidade EMPRESTADO e em\_quarentena \= false.  
  * **Consequência no laboratório:** O frasco físico está fisicamente na bancada do almoxarifado (adulterado ou contaminado), mas o sistema o mantém sob custódia e posse nominal do professor/bolsista, impedindo qualquer ação de quarentena, descarte ou perícia no sistema.

### **Caso Numérico C: Sólido Fechado e Nomenclatura Dimensional**

> * **Código de cadastrarFrascoFechado (p. 149–152):**  
>   A interface recebe:  
>   TypeScript  
>   interface CadastroFrascoFechado {  
>   &nbsp;&nbsp;volumeNominal?: number;  
>   &nbsp;&nbsp;pesoTotal: number;  
>   &nbsp;&nbsp;// ...  
>   }

>   E na linha de cálculo da tara (p. 151):  
>   TypeScript  
>   if (dados.volumeNominal \!= null) {  
>   &nbsp;&nbsp;if (estadoFisico \=== "LIQUIDO") {  
>   &nbsp;&nbsp;&nbsp;&nbsp;pesoVazio \= dados.pesoTotal \- (dados.volumeNominal \* densidade);  
>   &nbsp;&nbsp;} else {  
>   &nbsp;&nbsp;&nbsp;&nbsp;pesoVazio \= dados.pesoTotal \- dados.volumeNominal; // \<--- SÓLIDO  
>   &nbsp;&nbsp;}  
>   }

> * **Análise Dimensional e Semântica:**  
>   Para um sólido, o valor no rótulo impresso é uma **massa** ($m\_{\\text{nominal}}$ em gramas), e não um volume. O código reutiliza a variável volumeNominal subtraindo-a diretamente de pesoTotal em gramas:  
>   $$P\_{\\text{vazio}} \= P\_{\\text{total}} \- m\_{\\text{nominal}}$$  
>   Embora dimensionalmente a subtração resulte em $\[g\] \- \[g\] \= \[g\]$, a interface e o payload trafegam o dado sob a chave volumeNominal. Na Seção 4.21 (p. 28–29), o campo canônico do banco foi renomeado para conteudo\_nominal exatamente para abranger massa ou volume; no entanto, a assinatura da API na Seção 10.2.3 permaneceu acoplada à terminologia volumétrica volumeNominal.

## **BATERIA 2: Matriz de Estados Ortogonais do Frasco**

### **1\. Reencontro pós-extravio e Verificação de Validade**

> * **Código em registrarExtravioOuReencontro (p. 172–173):**  
>   TypeScript  
>   tx.update(frascoRef, {  
>   &nbsp;&nbsp;estado\_fisico\_frasco: dados.estadoConstatadoAoReencontrar,  
>   &nbsp;&nbsp;disponibilidade: "DISPONIVEL",  
>   &nbsp;&nbsp;em\_quarentena: true,  
>   &nbsp;&nbsp;detalhe\_status: "Reencontrado \- aguardando análise: " \+ dados.motivo,  
>   });

> * **Vulnerabilidade Identificada:**  
>   O código **não lê validade\_efetiva** nem recalcula a flag booleana vencido.  
>   Se o frasco extraviou em janeiro com validade para março e foi reencontrado em agosto:  
  1. A flag vencido permanece com o valor antigo (false).  
  2. A disponibilidade é setada diretamente para "DISPONIVEL".  
  3. Embora em\_quarentena \= true bloqueie temporariamente a retirada, quando o gestor liberar o frasco da quarentena, o frasco estará imediatamente disponível sem passar pelo rito de autorização de uso de vencidos (Q04 / Seção 7.2.20), violando a invariante de segurança metrológica.

### **2\. Descarte de Frasco Vazio: Ausência de Endpoint de Backend**

> * **Matriz de Estados (Seções 4.21, 4.43.5 e 7.2.20):**  
>   Um frasco cujo conteúdo foi esgotado na devolução transita para estado\_fisico\_frasco \= 'VAZIO' e disponibilidade \= 'INDISPONIVEL', sendo exibido no dashboard como "Pendente de Descarte".  
> * **Lacuna no Código TypeScript (Seção 10):**  
>   Não existe nenhuma Cloud Function implementada para efetivar a transição de VAZIO para DESCARTADO.  
  * As funções disponíveis na Seção 10 são: cadastrarFrasco\*, registrarAberturaFrasco, registrarRetirada, registrarDevolucao, registrarExtravioOuReencontro, recalibrarTaraFrascoEsgotado, registrarPesagemRotina.  
  * Não há descartarFrasco ou registrarDescarte.  
  * **Consequência:** Como as regras do Firestore (Seção 11\) definem allow write: if false para a coleção Frasco\_Reagente, o operador não possui meio técnico de transitar o frasco para o estado terminal DESCARTADO. O item permanece indefinidamente como VAZIO no estoque.

### **3\. Frasco Vencido no Balcão e Bloqueio sem TCR**

> * **Código em registrarRetirada (p. 163–164):**  
>   TypeScript  
>   const excepcional \= frascoVencido || frasco.validade\_desconhecida;  
>   const pesquisa \= \["PESQUISA\_TCC\_POS", "ESTUDO\_DEGRADACAO\_RESIDUOS"\].includes(finalidade);  
>   const aceite \= excepcional && pesquisa  
>   &nbsp;&nbsp;? await validarAceiteTcrTx(tx, dados.idAceiteTcr, { ... }) : null;

>   E a regra de negócio associada (p. 45, 108):"Para vencido ou validade desconhecida liberado com termo nas finalidades PESQUISA\_TCC\_POS ou ESTUDO\_DEGRADACAO\_RESIDUOS, exigir justificativa metodológica... UID autenticado do retirante que aceitou... O backend valida aceite vinculado ao frasco... Sem essas condições, rejeitar."  
> * **Análise Operacional de Bypass:**  
>   O sistema **não oferece mecanismo de bypass ou override para o gestor**. Se o pesquisador estiver presente fisicamente no balcão e não tiver assinado digitalmente o TCR em sua própria sessão web prévia, a transação aborta via validarAceiteTcrTx. Não há flag de exceção presencial (por exemplo, assinatura física com upload de termo digitalizado). O gestor fica impossibilitado de liberar o insumo.

## **BATERIA 3: Alinhamento Estrutural 3FN × NoSQL**

### **1\. Divergência de Enums em Historico\_Frasco\_Reagente.tipo**

Comparando a especificação SQL (Seção 4.22, p. 29–30), o Dicionário NoSQL (Seção 5.9.1, p. 65–66) e os Códigos TypeScript (Seção 10.2.3):

| Valor do Enum | Seção 4.22 (SQL 3FN) | Seção 5.9.1 (NoSQL) | Seção 10 (TypeScript) | Status da Coerência |
| :---- | :---- | :---- | :---- | :---- |
| CADASTRO | Presente | Omitido no texto da p. 66 | Usado nas p. 153, 158 | Inconsistência documental |
| SAIU | Presente | Omitido no texto da p. 66 | Usado na p. 165 | Inconsistência documental |
| ENTROU | Presente | Omitido no texto da p. 66 | Usado na p. 169 | Inconsistência documental |
| FICOU\_VAZIO | Presente | Omitido no texto da p. 66 | Usado na p. 169 | Inconsistência documental |
| QUEBROU | Presente | Omitido no texto da p. 66 | Não implementado | Inconsistência estrutural |
| FOI\_DESCARTADO | Presente | Omitido no texto da p. 66 | Não implementado | Inconsistência estrutural |
| VENCEU | Presente | Omitido no texto da p. 66 | Usado na p. 178 | Inconsistência documental |
| INVENTARIO\_ROTINA | Presente | Omitido no texto da p. 66 | Usado na p. 222 | Inconsistência documental |
| EVAPORACAO | Presente | Omitido no texto da p. 66 | Não usado (usa AJUSTE) | Contradição de especificação |
| AJUSTE | Presente | Omitido no texto da p. 66 | Usado nas p. 169, 174 | Inconsistência documental |
| CONCLUSAO | Presente | Omitido no texto da p. 66 | Não utilizado | Tipo órfão no 3FN |
| ENTROU\_EM\_QUARENTENA | Presente | Omitido no texto da p. 66 | Não utilizado | Tipo órfão no 3FN |
| LIBERADO\_QUARENTENA | Presente | Omitido no texto da p. 66 | Não utilizado | Tipo órfão no 3FN |
| PENDENTE\_DE\_DESCARTE | Presente | Omitido no texto da p. 66 | Não utilizado | Tipo órfão no 3FN |
| USO\_VENCIDO\_AUTORIZADO | Presente | Omitido no texto da p. 66 | Não utilizado | Tipo órfão no 3FN |
| EXTRAVIO | Presente | Omitido no texto da p. 66 | Usado na p. 172 | Inconsistência documental |
| REENCONTRO | Presente | Omitido no texto da p. 66 | Usado na p. 173 | Inconsistência documental |

**Conflito Grave:** Na Seção 5.9.1 (p. 66), a descrição do campo tipo em Historico\_Frasco\_Reagente diz apenas *"Valor de tipo, validado pelo formulário e pelo servidor conforme regras do domínio"*, omitindo a enumeração formal presente na Seção 4.22. Além disso, quando há perda por evaporação registrada em registrarDevolucao, o código grava tipo AJUSTE com campo\_ajustado: 'ganho\_massa\_higroscopia' ou ignora a perda por evaporação no histórico, nunca emitindo o tipo EVAPORACAO definido na Seção 4.22.

### **2\. Campo peso\_perda\_evaporacao em Emprestimo\_Reagente**

> * **Definição SQL (Seção 4.23, p. 31):**  
>   peso\_perda\_evaporacao NUMERIC(10,3) DEFAULT 0, NOT NULL.  
> * **Definição NoSQL (Seção 5.9.1, p. 67):**  
>   peso\_perda\_evaporacao number; O. Perda em g registrada separadamente de consumo: não inferir arbitrariamente.  
> * **Alimentação na Devolução (Seção 10.2.3, p. 166, 168):**  
>   O parâmetro dados.pesoPerdaEvaporacao é recebido opcionalmente e salvo no empréstimo (peso\_perda\_evaporacao: dados.pesoPerdaEvaporacao || 0).  
> * **Impacto nas Tabelas Materializadas (Seções 6.2 e 6.3):**  
  * Na Seção 6.2 (Resumo\_Almoxarifado\_Diario, p. 89–90), **não existem colunas de evaporação** (apenas volume\_utilizado\_no\_dia\_ml e massa\_utilizada\_no\_dia\_g). Toda a perda por evaporação desaparece do balanço do almoxarifado.  
  * Na Seção 6.3 (Resumo\_Reagente\_Diario, p. 92), existem as colunas volume\_evaporado\_no\_dia\_ml e massa\_evaporada\_no\_dia\_g. No entanto, na Seção 10, o job agendado de materialização diária não lê o campo peso\_perda\_evaporacao de Emprestimo\_Reagente, gerando resumos diários com valores de evaporação zerados (0.00).

### **3\. Camadas Formais M0 e M1 (Seções 13 e 14\) vs Seções 4 e 10**

> * **Disponibilidade e Retirada no M0 (Seção 13, p. 232–233):**  
>   O modelo Alloy verifica apenas o predicado estático:  
>   Snippet de código  
>   disponibilidade \= DISPONIVEL && em\_quarentena \= false && estado\_fisico in {FECHADO, ABERTO}

>   O M0 valida formalmente que frascos extraviados, vazios, quebrados ou descartados tornam-se inaptos. Entretanto, o modelo M0 **abstrai completamente a data de validade** e o **TCR**. Na Seção 10.2.3, um frasco com disponibilidade \= DISPONIVEL é barrado se vencido \= true e uso\_vencido\_autorizado \= false. O modelo formal M0 prova segurança apenas sobre o subconjunto de variáveis físicas, não cobrindo a máquina de estados real do software.  
> * **Catálogo no M1 (Seção 14, p. 234–235):**  
>   Na Seção 14, CUE modela densidade em Especificacao\_Reagente como NUMERIC(8,4) em $g/\\text{mL}$. Mas em Resumo\_Reagente (p. 234), estado\_fisico aceita apenas SOLIDO e LIQUIDO. Isso confirma a expulsão de GASOSO da V1 (Seção 4.18 e 12). Todavia, na Seção 14 (p. 235), unidade\_de\_medida na especificação é descrita como derivada ($g$ ou $mL$), enquanto no código TypeScript de cadastrarFrascoFechado (p. 152), o frasco não armazena a unidade, confiando na cadeia de referências em tempo de execução, gerando risco de leituras adicionais (N+1) no Firestore.

## **BATERIA 4: Metrológica em Relatórios e Materializações**

### **1\. Frascos Abertos com Saldo Desconhecido nas Materializações**

> * **Contrato da Seção 6.3 (p. 92–93):**"Saldos Desconhecidos: Se o saldo de um frasco é desconhecido (ex.: frasco aberto sem peso\_atual preciso registrado), ele não deve ser somado como zero (0) nos agregados totais de volume ou massa, pois isso distorceria a realidade física. Esses frascos devem ser segregados na camada de agregação..."  
> * **Contradição com o Esquema Físico (Seções 5.9.1, 6.2 e 6.3):**  
>   Tanto Resumo\_Almoxarifado\_Diario (p. 78–79, 89–90) quanto Resumo\_Reagente\_Diario (p. 79–80, 92\) possuem apenas campos escalares unificados:  
>   volume\_total\_disponivel\_ml e massa\_total\_disponivel\_g.  
>   **Não existem colunas de segregação**, tais como:  
  * qtd\_frascos\_saldo\_desconhecido  
  * massa\_total\_estimada\_g vs massa\_total\_aferida\_g  
    Ao computar o saldo total em consultas analíticas, se o frasco foi cadastrado na opção B sem tara precisa e com peso desconhecido, ou o sistema soma $0\\text{ g}$ distorcendo a massa total para baixo, ou soma o peso bruto total ($P\_{\\text{conteudo}} \+ P\_{\\text{vidro}}$), distorcendo a massa para cima ao somar o peso do vidro como se fosse reagente.

### **2\. Conversão e Agregação em gerarRelatorioAlmoxarifado**

> * **Código em gerarRelatorioAlmoxarifado (Seção 10.2.7, p. 204):**  
>   TypeScript  
>   const consumoPorUnidade \= devolucoesSnapshot.docs.reduce((acc, doc) \=\> {  
>   &nbsp;&nbsp;const d \= doc.data();  
>   &nbsp;&nbsp;if (d.unidade\_medida\_utilizada \=== "ml") acc.ml \+= d.medida\_utilizada || 0;  
>   &nbsp;&nbsp;else if (d.unidade\_medida\_utilizada \=== "g") acc.g \+= d.medida\_utilizada || 0;  
>   &nbsp;&nbsp;return acc;  
>   }, { g: 0, ml: 0 });

> * **Análise Metrológica:**  
>   O código agrega estritamente:  
  * Consumos registrados em ml no acumulador acc.ml.  
  * Consumos registrados em g no acumulador acc.g.  
    Não há conversão indevida de sólidos para volume. Contudo, há uma falha de consistência histórica: o código confia cegamente na string unidade\_medida\_utilizada gravada no empréstimo. Se um empréstimo antigo teve medida\_utilizada gravada antes da definição de densidade ou com densidade errônea, a agregação somará grandezas físicas incompatíveis dentro do mesmo almoxarifado sem normalização por densidade da especificação.

# **RELATÓRIO CONSOLIDADO DE VULNERABILIDADES**

### **ID do Problema: MET-01**

> * **Localização Exata:** Página 166–167, Seção 10.2.3 (registrarDevolucao) em confronto com Página 100–101, Seção 7.2.14 e Página 173–174 (recalibrarTaraFrascoEsgotado).  
> * **Demonstração do Erro:**  
>   Na linha 166, se diferencaTara \> 0 && \!esgotado (ou seja, devolução abaixo da tara sem flag confirmarEsgotamento: true ou com diferença $\> 5\\text{ g}$), a função lança HttpsError("failed-precondition"). Isso gera o rollback total da transação.  
>   A mensagem orienta o uso de recalibrarTaraFrascoEsgotado. Porém, esta função apenas atualiza a tara do frasco; ela **não processa a devolução**. Quando o operador reexecuta a devolução, se o frasco estiver fisicamente vazio com diferença $\> 5\\text{ g}$ (ex: variação do lote do vidro do fabricante), o sistema rejeita repetidamente a devolução, criando um deadlock de balcão.  
> * **Cenário de Quebra:**  
>   O docente devolve um frasco de vidro pesado onde a tara original cadastrada foi estimada em $130\\text{ g}$, mas o frasco real vazio pesa $122\\text{ g}$ (diferença de $8\\text{ g}$). O frasco está limpo e seco na bancada. O gestor tenta dar devolução: o sistema acusa erro e faz rollback. O gestor executa a recalibração de tara para $122\\text{ g}$. Ao tentar devolver novamente pesando $122\\text{ g}$, a tara coincide, mas o consumo calculado não encerra o frasco como VAZIO automaticamente, a menos que uma nova pesagem seja forçada em zero líquido com parâmetros específicos, travando o atendimento.  
> * **Correção Concreta:**  
>   Permitir que a devolução ordinária aceite esgotamento justificado mesmo acima de $5\\text{ g}$ quando acompanhado de justificativa formal do gestor (motivoRecalibracao) e confirmação de esgotamento na mesma chamada atômica, eliminando a dependência de duas transações desconexas.

### **ID do Problema: MET-02**

> * **Localização Exata:** Página 167, Seção 10.2.3 (registrarDevolucao) em confronto com Página 100–101, Seção 7.2.14.  
> * **Demonstração do Erro:**  
>   Quando $P\_{\\text{retorno}} \> P\_{\\text{saida}} \+ \\Delta\_{\\text{max}}$, a Seção 7.2.14 estipula que a anomalia bloqueia a devolução ordinária, indicando suspeita de contaminação. No código, isso foi implementado como:  
>   TypeScript  
>   throw new HttpsError("invalid-argument", "Ganho de massa excede tolerância Q06...");

>   Ao lançar exceção em vez de registrar a devolução com anomalia, o Firestore desfaz as alterações. O frasco permanece no banco de dados como disponibilidade \= 'EMPRESTADO' sob a posse do usuário que o levou, em vez de ser retido no almoxarifado em quarentena com o empréstimo encerrado sob suspeita.  
> * **Cenário de Quebra:**  
>   Um aluno devolve um frasco de éter com peso superior à saída em $5\\text{ g}$ (adulterado com água na bancada). O gestor coloca o frasco na balança e clica em devolver. O sistema apresenta um alerta de erro vermelho na tela. O gestor retém o frasco físico para segurança química. Contudo, no sistema, o frasco continua constando como em posse do professor. Quando o prazo expirar, o professor receberá notificações falsas de empréstimo atrasado (ENTREGA\_ATRASADA), e o almoxarifado não poderá registrar a quarentena nem periciar o insumo no sistema.  
> * **Correção Concreta:**  
>   Substituir o lançamento de HttpsError por um fluxo de encerramento extraordinário com retenção:  
>   TypeScript  
>   if (dados.pesoRetorno \> limiteMaxRetorno) {  
>   &nbsp;&nbsp;tx.update(emprestimoRef, {  
>   &nbsp;&nbsp;&nbsp;&nbsp;status: "DEVOLVIDO\_COM\_ANOMALIA",  
>   &nbsp;&nbsp;&nbsp;&nbsp;peso\_retorno: dados.pesoRetorno,  
>   &nbsp;&nbsp;&nbsp;&nbsp;data\_devolucao\_efetuada: admin.firestore.FieldValue.serverTimestamp()  
>   &nbsp;&nbsp;});  
>   &nbsp;&nbsp;tx.update(frascoRef, {  
>   &nbsp;&nbsp;&nbsp;&nbsp;disponibilidade: "INDISPONIVEL",  
>   &nbsp;&nbsp;&nbsp;&nbsp;em\_quarentena: true,  
>   &nbsp;&nbsp;&nbsp;&nbsp;detalhe\_status: "Retido no retorno: Ganho de massa anômalo (" \+ (dados.pesoRetorno \- emprestimo.peso\_saida) \+ "g). Suspeita de contaminação."  
>   &nbsp;&nbsp;});  
>   &nbsp;&nbsp;// Gravar histórico correspondente e retornar sucesso operacional  
>   &nbsp;&nbsp;return { status: "RETIDO\_QUARENTENA\_ANOMALIA" };  
>   }

### **ID do Problema: MET-03**

> * **Localização Exata:** Página 151, Seção 10.2.3 (cadastrarFrascoFechado) em confronto com Página 28–29, Seção 4.21.  
> * **Demonstração do Erro:**  
>   Incompatibilidade de tipos conceituais e interface. O payload tipado em CadastroFrascoFechado exige a chave volumeNominal?: number. Para um reagente sólido (ex: Cloreto de Sódio), o operador preenche a massa de $500\\text{ g}$ no campo rotulado na interface como "Volume Nominal". O código executa:  
>   TypeScript  
>   pesoVazio \= dados.pesoTotal \- dados.volumeNominal;

>   Embora o valor numérico seja consistente, a modelagem de tipos viola a regra da Seção 4.21, que unificou o conceito sob conteudo\_nominal. Além disso, se o operador passar zero ou omitir o campo por se tratar de um sólido de peso desconhecido, pesoVazio é calculado como null, impedindo qualquer cálculo futuro de esgotamento.  
> * **Cenário de Quebra:**  
>   Ao integrar clientes de API externos ou formulários tipados em TypeScript, o envio de payloads para sólidos falha em validações de esquema que esperam massaNominal ou rejeitam unidades de volume ($mL$) associadas a sólidos.  
> * **Correção Concreta:**  
>   Renomear o parâmetro na interface CadastroFrascoFechado para conteudoNominal: number e tipar explicitamente a unidade associada de acordo com o estado físico do catálogo (g para sólido, mL para líquido).

### **ID do Problema: MET-04**

> * **Localização Exata:** Página 172–173, Seção 10.2.3 (registrarExtravioOuReencontro).  
> * **Demonstração do Erro:**  
>   Ação REENCONTRAR reabilita a disponibilidade do frasco diretamente para DISPONIVEL sem avaliar a data de validade efetiva:  
>   TypeScript  
>   tx.update(frascoRef, {  
>   &nbsp;&nbsp;estado\_fisico\_frasco: dados.estadoConstatadoAoReencontrar,  
>   &nbsp;&nbsp;disponibilidade: "DISPONIVEL",  
>   &nbsp;&nbsp;em\_quarentena: true,  
>   &nbsp;&nbsp;detalhe\_status: "Reencontrado \- aguardando análise: " \+ dados.motivo,  
>   });

>   O atributo vencido não é recalculado contra admin.firestore.Timestamp.now().  
> * **Cenário de Quebra:**  
>   Um frasco extravia em 2025 com validade para março de 2026\. Em setembro de 2026, ele é achado em um armário. O gestor executa REENCONTRAR. O frasco entra em quarentena, mas sua flag vencido permanece false. Quando o gestor clica em "Liberar da Quarentena", o frasco vai para a prateleira como ativo e válido. Uma aula prática retira o reagente acreditando que ele está no prazo, comprometendo a reprodutibilidade química dos experimentos.  
> * **Correção Concreta:**  
>   Incluir a reavaliação imediata de validade na transação de reencontro:  
>   TypeScript  
>   const agora \= new Date();  
>   const validadeEfetiva \= frasco.validade\_efetiva ? DateTime.fromISO(frasco.validade\_efetiva, { zone: "America/Sao\_Paulo" }).endOf("day").toJSDate() : null;  
>   const jaVencido \= Boolean(validadeEfetiva && validadeEfetiva \<= agora);

>   tx.update(frascoRef, {  
>   &nbsp;&nbsp;estado\_fisico\_frasco: dados.estadoConstatadoAoReencontrar,  
>   &nbsp;&nbsp;disponibilidade: jaVencido ? "INDISPONIVEL" : "DISPONIVEL",  
>   &nbsp;&nbsp;vencido: jaVencido,  
>   &nbsp;&nbsp;em\_quarentena: true,  
>   &nbsp;&nbsp;detalhe\_status: "Reencontrado (" \+ (jaVencido ? "VENCIDO" : "NO PRAZO") \+ ") \- em quarentena: " \+ dados.motivo,  
>   });

### **ID do Problema: MET-05**

> * **Localização Exata:** Páginas 102–103 (Seção 7.2.20), Página 120 (Seção 8.8.7) e Seção 10\.  
> * **Demonstração do Erro:**  
>   Inexistência de função executável no backend para o ciclo de descarte de frascos (descartarFrasco).  
>   A Seção 7.2.20 define a regra de descarte físico, e a Seção 4.43.5 estabelece o estado terminal DESCARTADO. No entanto, na Seção 10, **nenhuma Cloud Function foi implementada para alterar o estado do frasco para DESCARTADO**. Como o arquivo firestore.rules proíbe escritas diretas a partir do cliente (allow write: if false), é tecnicamente impossível para o frontend concluir o descarte de um frasco vazio ou quebrado.  
> * **Cenário de Quebra:**  
>   O almoxarifado acumula 50 frascos vazios que já foram coletados pela empresa de descarte de resíduos perigosos da UENF. O gestor acessa o sistema para dar baixa nos frascos e limpar a fila de "Pendentes de Descarte". Ao clicar no botão de descarte, o sistema não encontra um endpoint de backend correspondente para chamar ou a função não existe, mantendo os frascos permanentemente listados no inventário físico.  
> * **Correção Concreta:**  
>   Implementar na Seção 10.2 a Cloud Function transacional descartarFrasco:  
>   TypeScript  
>   export const descartarFrasco \= onCall(async (request) \=\> {  
>   &nbsp;&nbsp;await validarPermissao(request, \["Chefe\_Geral", "Gestor\_Almoxarifado"\], true);  
>   &nbsp;&nbsp;const { idFrasco, motivo, idOperacao } \= request.data;  
>   &nbsp;&nbsp;const frascoRef \= admin.firestore().collection("Frasco\_Reagente").doc(idFrasco);  
>   &nbsp;&nbsp;return admin.firestore().runTransaction(async (tx) \=\> {  
>   &nbsp;&nbsp;&nbsp;&nbsp;const snap \= await tx.get(frascoRef);  
>   &nbsp;&nbsp;&nbsp;&nbsp;if (\!snap.exists) throw new HttpsError("not-found", "Frasco não encontrado.");  
>   &nbsp;&nbsp;&nbsp;&nbsp;const frasco \= snap.data()\!;  
>   &nbsp;&nbsp;&nbsp;&nbsp;if (frasco.disponibilidade \=== "EMPRESTADO") {  
>   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;throw new HttpsError("failed-precondition", "Frasco emprestado não pode ser descartado.");  
>   &nbsp;&nbsp;&nbsp;&nbsp;}  
>   &nbsp;&nbsp;&nbsp;&nbsp;tx.update(frascoRef, {  
>   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;estado\_fisico\_frasco: "DESCARTADO",  
>   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;disponibilidade: "INDISPONIVEL",  
>   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;em\_quarentena: false,  
>   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;detalhe\_status: "Descartado: " \+ motivo  
>   &nbsp;&nbsp;&nbsp;&nbsp;});  
>   &nbsp;&nbsp;&nbsp;&nbsp;tx.set(admin.firestore().collection("Historico\_Frasco\_Reagente").doc(), {  
>   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;id\_frasco\_reagente: idFrasco,  
>   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;id\_almoxarifado: frasco.id\_almoxarifado,  
>   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;id\_gestor: request.auth\!.uid,  
>   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tipo: "FOI\_DESCARTADO",  
>   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;motivo,  
>   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;timestamp: admin.firestore.FieldValue.serverTimestamp()  
>   &nbsp;&nbsp;&nbsp;&nbsp;});  
>   &nbsp;&nbsp;&nbsp;&nbsp;return { status: "DESCARTADO" };  
>   &nbsp;&nbsp;});  
>   });

### **ID do Problema: MET-06**

> * **Localização Exata:** Páginas 79–80 (Seção 5.9.1) e Página 92 (Seção 6.3).  
> * **Demonstração do Erro:**  
>   Contradição direta entre a diretriz de agregação e a modelagem física de dados.  
>   O texto da Seção 6.3 proíbe expressamente somar frascos abertos com saldo desconhecido como zero nos agregados totais de volume ou massa. Contudo, o esquema documental de Resumo\_Reagente\_Diario e Resumo\_Almoxarifado\_Diario não possui nenhuma propriedade para armazenar a contagem de frascos com saldo desconhecido, nem propriedades segregadas para limites mínimos/máximos.  
> * **Cenário de Quebra:**  
>   O Gestor de Almoxarifado cadastra 5 frascos antigos de Ácido Sulfúrico abertos herdados de gestões anteriores, cujo saldo é desconhecido. Ao rodar o job noturno de materialização, o sistema calcula volume\_total\_disponivel\_ml somando 0 para esses 5 frascos. No dia seguinte, a Chefia emite o Relatório Geral e visualiza estoque zerado de ácido, solicitando compra desnecessária via licitação, quando existiam 5 frascos aptos para consumo didático no almoxarifado.  
> * **Correção Concreta:**  
>   Adicionar formalmente aos esquemas das tabelas materializadas (Seções 5.9.1, 6.2 e 6.3) as colunas:  
  * qtd\_frascos\_saldo\_desconhecido: number  
  * volume\_total\_disponivel\_aferido\_ml: number  
  * massa\_total\_disponivel\_aferida\_g: number  
    E explicitar nos relatórios impressos a nota: *"Estoque total: X mL aferidos \+ N frascos com saldo volumétrico a inventariar"*.