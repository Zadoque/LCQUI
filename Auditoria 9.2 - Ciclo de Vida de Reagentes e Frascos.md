\# AUDITORIA 9.2 — Consolidação Metrológica, Correção de Regressões e Fechamento do Ciclo de Vida de Reagentes e Frascos

\*\*Projeto LCQUI — Laboratório de Ciências Químicas da UENF\*\*&nbsp;&nbsp;

\*\*Data de Emissão:\*\* 20 de setembro de 2026&nbsp;&nbsp;

\*\*Autor:\*\* Auditoria Técnica Especializada em Metrologia e Sistemas Formais&nbsp;&nbsp;

\*\*Status:\*\* ESPECIFICAÇÃO DE IMPLEMENTAÇÃO E FECHAMENTO NORMATIVO&nbsp;&nbsp;

&nbsp;

\---

&nbsp;

\#\# 1\. SUMÁRIO EXECUTIVO E NARRATIVA EVOLUTIVA (9 → 9.1 → 9.2)

&nbsp;

A evolução do controle metrológico e ciclo de vida de reagentes e frascos no documento \`main.pdf\` seguiu três marcos fundamentais:

&nbsp;

\#\#\# 1.1 Auditoria 9 (Diagnóstico das Quebras Críticas Iniciais)

A Auditoria 9 identificou vulnerabilidades estruturais severas que inviabilizavam a operação em laboratório:

1\. \*\*Rollbacks e Deadlocks:\*\* A devolução abaixo da tara sem confirmação prévia e o ganho anômalo de massa disparavam \`HttpsError\`, abortando transações via rollback do Firestore. O empréstimo ficava indefinidamente em \`EM\_USO\` e o frasco em \`EMPRESTADO\`, impedindo a retenção física de insumos contaminados ou a homologação de tara.

2\. \*\*Inexistência de Rotinas Terminais:\*\* Inexistia função de backend (\`descartarFrasco\`) para efetivar o estado \`DESCARTADO\`, deixando frascos vazios presos no inventário.

3\. \*\*Fragilidade Pós-Extravio:\*\* O reencontro de frascos extraviados restaurava a disponibilidade como \`DISPONIVEL\` sem reavaliar a validade efetiva, arriscando disponibilizar reagentes degradados.

4\. \*\*Dessincronia Estrutural:\*\* O enum \`tipo\` em \`Historico\_Frasco\_Reagente\` possuía apenas 11 valores na Seção 5 contra 17 na Seção 4; a perda por evaporação não era consolidada nas tabelas de almoxarifado; e a métrica de "saldo desconhecido" não possuía suporte documental.

&nbsp;

\#\#\# 1.2 Auditoria 9.1 (A Intervenção Emergencial e Efeitos Colaterais)

A Auditoria 9.1 aplicou um pacote emergencial de 10 correções (Commits \`a8bc3d29\` a \`8d92cbe3\`):

\- Eliminou o rollback no ganho anômalo, instituindo o status \`DEVOLVIDO\_COM\_ANOMALIA\` e o envio compulsório para quarentena;

\- Implementou a atualização da tara real na devolução quando confirmado o esgotamento;

\- Criou a Cloud Function \`descartarFrasco\` com bloqueio para frascos emprestados;

\- Normalizou o payload de cadastro de fechados para \`conteudoNominal\`;

\- Expandiu o enum da Seção 5 para 17 valores e adicionou campos de evaporação e saldo desconhecido nas tabelas materializadas.

&nbsp;

\*\*No entanto, a velocidade da implementação introduziu novas falhas e regressões:\*\*

\- \*\*Regressão de Dead Code:\*\* No reencontro pós-extravio, tentou-se recalcular a validade se o frasco estivesse fechado, mas o teste lógico incluiu \`frasco.estado\_fisico\_frasco \=== "FECHADO"\` logo após exigir que o frasco fosse \`EXTRAVIADO\`. Essa condição nunca é satisfeita, mantendo a validade sem recálculo.

\- \*\*Subnotificação de Consumo:\*\* A tara do frasco foi atualizada para a tara real aferida, mas a fórmula de cálculo do consumo do empréstimo continuou subtraindo a tara nominal antiga, gerando um descompasso contábil onde massa de reagente consumida desaparece dos registros.

\- \*\*Contaminação de Flags:\*\* O aviso de higroscopia na devolução continuou sendo disparado para frascos não-higroscópicos e para anomalias retidas.

\- \*\*Inconsistência de Máquina de Estados:\*\* \`descartarFrasco\` não resetou a flag \`em\_quarentena\`, perpetuando frascos descartados nas consultas de bancada.

\- \*\*Bypass Indevido de TCR:\*\* Para contornar a rigidez no balcão, introduziu-se \`tcrFisicoAssinado\`, violando a regra fundamental de que o gestor jamais atesta ciência de risco por terceiros.

\- \*\*Contaminação Dimensional em Relatórios:\*\* A rotina D-0 do relatório mensal acumulou perdas evaporativas de líquidos em gramas diretamente na variável de sólidos.

\- \*\*Campos Órfãos na Camada Base:\*\* Criou-se a coluna agregada \`qtd\_frascos\_saldo\_desconhecido\` nas views diárias, mas esqueceu-se de incluir a propriedade booleana \`saldo\_desconhecido\` na entidade \`Frasco\_Reagente\` e na função \`cadastrarFrascoAberto\`.

&nbsp;

\#\#\# 1.3 Auditoria 9.2 (Consolidação Resolutiva Definitiva)

A presente Auditoria 9.2 realiza a depuração exaustiva de todo o pipeline metrológico, matemático, textual e formal. Seu objetivo é eliminar o dead code, restaurar a conservação de massa nos cálculos de balança, fechar os estados ortogonais sem vazamentos de flags, harmonizar as especificações LaTeX com o TypeScript e blindar as regras de auditoria institucional e segurança química.

&nbsp;

\---

&nbsp;

\#\# 2\. PLANO DE AÇÃO DETALHADO E JUSTIFICATIVAS NORMATIVAS

&nbsp;

\#\#\# ITEM 1 \[MET-01\]: Conservação Estrita de Massa no Esgotamento e Desbloqueio Operacional

\* \*\*Fundamentação Normativa no PDF:\*\*

&nbsp;&nbsp;\- \*\*Seção 4.44 (Regra Q06, p. 44–45):\*\* \*"Retorno abaixo da tara (peso\_retorno \< peso\_vazio): diferença até 5 g com confirmarEsgotamento \= true permite devolução para VAZIO/INDISPONIVEL... nesse caso a massa consumida é todo o saldo restante, max(0, peso\_saida \- peso\_vazio)... atualiza peso\_frasco\_vazio e peso\_atual para o valor aferido... eliminando o resíduo metrológico e homologando a tara real do recipiente."\*

&nbsp;&nbsp;\- \*\*Seção 7.2.14 (p. 100–101):\*\* \*"O consumo é documentado precisamente na tabela Emprestimo\_Reagente como Volume\_utilizado \= max(0, Peso\_saida \- Peso\_retorno) / Densidade."\*

\* \*\*Diagnóstico do Resíduo da 9.1:\*\*

&nbsp;&nbsp;A Auditoria 9.1 homologou a tara (\`peso\_frasco\_vazio: dados.pesoRetorno\` e \`peso\_atual: dados.pesoRetorno\`), mas manteve na linha 169 de \`registrarDevolucao\`:

&nbsp;&nbsp;\`if (esgotado) pesoConsumido \= Math.max(0, emprestimo.peso\_saida \- frasco.peso\_frasco\_vazio);\`

&nbsp;&nbsp;Se P\_saida \= 150 g, P\_vazio\_cadastral \= 120 g e P\_retorno \= 117 g, o consumo calculado é 150 \- 120 \= 30 g, omitindo 3 g de reagente que de fato saíram do frasco (150 \- 117 \= 33 g).

\* \*\*Decisão e Correção na 9.2:\*\*

&nbsp;&nbsp;1\. \*\*Código (\`functions/\`):\*\* O consumo real do empréstimo em esgotamento deve computar a diferença direta até a tara real aferida:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\`\`\`typescript

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;if (esgotado) {

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;// A tara real aferida no retorno comprova que o conteúdo remanescente chegou a zero.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;// Q06/7.2.14: no esgotamento todo o saldo restante foi consumido; não subtrair evaporação aqui.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;pesoConsumido \= Math.max(0, emprestimo.peso\_saida \- dados.pesoRetorno);

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\`\`\`

&nbsp;&nbsp;2\. \*\*Texto do PDF (Seção 4.44 Q06 e Seção 7.2.14):\*\* Harmonizar o texto para especificar que, ao homologar a tara real no esgotamento, a massa consumida registrada no empréstimo é P\_saida \- P\_retorno, enquanto o ajuste patrimonial da tara histórica é lançado no histórico do frasco sob o tipo \`FICOU\_VAZIO\`.

&nbsp;

\---

&nbsp;

\#\#\# ITEM 2 \[MET-02\]: Blindagem da Flag de Higroscopia e Registro de Quarentena

\* \*\*Fundamentação Normativa no PDF:\*\*

&nbsp;&nbsp;\- \*\*Seção 4.44 (Regra Q06, p. 44–45):\*\* \*"Ganho dentro da tolerância preserva peso físico real, consumo zero e evento AJUSTE/ganho\_massa\_higroscopia restrito estritamente a frascos com eh\_higroscopico \= true; é terminantemente proibido registrar tal evento para frascos não-higroscópicos ou com ganhos fora da tolerância legal."\*

&nbsp;&nbsp;\- \*\*Seção 4.43.5 (Invariantes, p. 42–43):\*\* \*"QUARENTENA: Exige detalhe de motivo e bloqueia nova retirada."\*

\* \*\*Diagnóstico do Resíduo da 9.1:\*\*

&nbsp;&nbsp;A Auditoria 9.1 substituiu o erro por \`reterPorAnomalia \= true\`, mas em \`registrarDevolucao\` manteve:

&nbsp;&nbsp;\`const avisoHigroscopico \= dados.pesoRetorno \> emprestimo.peso\_saida;\`

&nbsp;&nbsp;\`...(avisoHigroscopico && { aviso: "higroscopico\_suspeito" })\`

&nbsp;&nbsp;Isso faz com que um frasco comum (não-higroscópico) que sofreu adulteração grosseira receba um rótulo de "higroscopia", e omite o registro do evento \`ENTROU\_EM\_QUARENTENA\` em \`Historico\_Frasco\_Reagente\`.

\* \*\*Decisão e Correção na 9.2:\*\*

&nbsp;&nbsp;1\. \*\*Código (\`functions/\`):\*\* Vincular o aviso de higroscopia à natureza química do frasco e à faixa de tolerância legítima:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\`\`\`typescript

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const ganhoMassa \= dados.pesoRetorno \> emprestimo.peso\_saida;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const avisoHigroscopico \= ganhoMassa && frasco.eh\_higroscopico \=== true && \!reterPorAnomalia;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\`\`\`

&nbsp;&nbsp;2\. \*\*Auditoria no Histórico:\*\* Se \`reterPorAnomalia \=== true\`, gravar compulsoriamente o evento \`ENTROU\_EM\_QUARENTENA\`:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\`\`\`typescript

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;if (reterPorAnomalia) {

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tx.set(admin.firestore().collection("Historico\_Frasco\_Reagente").doc(), {

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;id\_frasco\_reagente: frascoRef.id,

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;id\_almoxarifado: frasco.id\_almoxarifado,

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;id\_gestor: request.auth\!.uid,

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;id\_emprestimo\_reagente: emprestimoRef.id,

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tipo: "ENTROU\_EM\_QUARENTENA",

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;motivo: "Retido na devolução: Ganho de massa (" \+ (dados.pesoRetorno \- emprestimo.peso\_saida) \+ "g) excedeu a tolerância legal Q06.",

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;timestamp: admin.firestore.FieldValue.serverTimestamp(),

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;});

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\`\`\`

&nbsp;

\---

&nbsp;

\#\#\# ITEM 3 \[MET-03\]: Dessincronização Textual de Sólidos Fechados na Regra 7.2.14

\* \*\*Fundamentação Normativa no PDF:\*\*

&nbsp;&nbsp;\- \*\*Seção 4.16 e 4.43.4 (Regras Químicas, p. 23, 42):\*\* \*"A unidade operacional é derivada de Resumo\_Reagente.estado\_fisico: SOLIDO usa g e LIQUIDO usa mL... Densidade é obrigatória e positiva para LIQUIDO e pode ser NULL para SOLIDO."\*

&nbsp;&nbsp;\- \*\*Seção 4.21 (p. 28–29):\*\* \*"conteudo\_nominal representa o conteúdo declarado no cadastro: para líquidos, é o volume nominal em mL; para sólidos, é a massa nominal em g."\*

&nbsp;&nbsp;\- \*\*Seção 8.5 (Dashboard Gestor, p. 114–115):\*\* \*"sólido \-\> exige peso total e massa nominal do rótulo (fechado)..."\*

\* \*\*Diagnóstico do Resíduo da 9.1:\*\*

&nbsp;&nbsp;A Auditoria 9.1 corrigiu o DTO da Cloud Function para \`conteudoNominal: number\`. Porém, o texto da \*\*Seção 7.2.14 (Item 1, p. 100)\*\* permaneceu redigido como:

&nbsp;&nbsp;\*\`Peso\_vazio \= Peso\_total \- (Volume\_nominal \* Densidade)\`\*, omitindo a fórmula de sólidos e condicionando erroneamente todo cadastro de frasco fechado a volume e densidade.

\* \*\*Decisão e Correção na 9.2:\*\*

&nbsp;&nbsp;Reescrever explicitamente os Itens 1 a 3 da Seção 7.2.14 no LaTeX (a bifurcação SÓLIDO/LÍQUIDO vale para frascos fechados e abertos):

&nbsp;&nbsp;\`\`\`latex

&nbsp;&nbsp;\\\\textbf{1. Cadastro de Frasco Fechado:}

&nbsp;&nbsp;O usuário informa o Peso Total medido na balança e o Conteúdo Nominal do rótulo.

&nbsp;&nbsp;\\\\begin{itemize}

&nbsp;&nbsp;&nbsp;&nbsp;\\\\item Reagente Líquido ($mL$): $Peso\_{vazio} \= Peso\_{total} \- (Volume\_{nominal} \\\\times Densidade)$

&nbsp;&nbsp;&nbsp;&nbsp;\\\\item Reagente Sólido ($g$): $Peso\_{vazio} \= Peso\_{total} \- Massa\_{nominal}$

&nbsp;&nbsp;\\\\end{itemize}

&nbsp;&nbsp;\\\\textbf{2. Cadastro de Frasco já Aberto (Opção A --- Conhece a tara):}

&nbsp;&nbsp;O usuário informa o Peso do Frasco Vazio e o Peso Total atual na balança.

&nbsp;&nbsp;\\\\begin{itemize}

&nbsp;&nbsp;&nbsp;&nbsp;\\\\item Reagente Líquido ($mL$): $Volume\_{atual} \= \\\\frac{Peso\_{total} \- Peso\_{vazio}}{Densidade}$

&nbsp;&nbsp;&nbsp;&nbsp;\\\\item Reagente Sólido ($g$): $Massa\_{atual} \= Peso\_{total} \- Peso\_{vazio}$

&nbsp;&nbsp;\\\\end{itemize}

&nbsp;&nbsp;\\\\textbf{3. Cadastro de Frasco já Aberto (Opção B --- Conhece o conteúdo atual):}

&nbsp;&nbsp;O usuário informa o conteúdo atual visual e o Peso Total na balança.

&nbsp;&nbsp;\\\\begin{itemize}

&nbsp;&nbsp;&nbsp;&nbsp;\\\\item Reagente Líquido ($mL$): $Peso\_{vazio} \= Peso\_{total} \- (Volume\_{atual} \\\\times Densidade)$

&nbsp;&nbsp;&nbsp;&nbsp;\\\\item Reagente Sólido ($g$): $Peso\_{vazio} \= Peso\_{total} \- Massa\_{atual}$

&nbsp;&nbsp;\\\\end{itemize}

&nbsp;&nbsp;\`\`\`

&nbsp;

\---

&nbsp;

\#\#\# ITEM 4 \[MET-04\]: Correção do Dead Code no Reencontro Pós-Extravio

\* \*\*Fundamentação Normativa no PDF:\*\*

&nbsp;&nbsp;\- \*\*Seção 4.21 (Frasco Reagente, p. 28):\*\* Dimensões ortogonais: \`estado\_fisico\_frasco\` (\`FECHADO, ABERTO, VAZIO, QUEBRADO, DESCARTADO, EXTRAVIADO\`), \`disponibilidade\` e \`em\_quarentena\`.

&nbsp;&nbsp;\- \*\*Seção 9.7.28 (Fluxo ALM-06, p. 136–137):\*\* \*"Em caso de reencontro, o frasco retorna como ABERTO ou FECHADO (conforme constatado), porém obrigatoriamente com em\_quarentena \= true."\*

&nbsp;&nbsp;\- \*\*Seção 10.6 (Validação Síncrona de Validade, p. 181) e Seção 4.21:\*\* Abertura de frasco exige recálculo da validade efetiva: min(validade\_fechado, abertura \+ validade\_apos\_aberto\_dias). O campo \`abertura\_historica\_desconhecida\` distingue frasco aberto com data desconhecida de frasco originalmente fechado, impedindo a fabricação da data de abertura (Q05).

\* \*\*Diagnóstico do Resíduo da 9.1:\*\*

&nbsp;&nbsp;No arquivo \`Section-10-Subsection-5-Fluxo-de-Reagentes.tex\`, o código de \`registrarExtravioOuReencontro\` (p. 175–176) contém:

&nbsp;&nbsp;\`\`\`typescript

&nbsp;&nbsp;if (frasco.estado\_fisico\_frasco \!== "EXTRAVIADO")

&nbsp;&nbsp;&nbsp;&nbsp;throw new HttpsError("failed-precondition", "Frasco não está extraviado.");

&nbsp;&nbsp;...

&nbsp;&nbsp;if (dados.estadoConstatadoAoReencontrar \=== "ABERTO" && frasco.estado\_fisico\_frasco \=== "FECHADO") {

&nbsp;&nbsp;&nbsp;&nbsp;validadeCalculada \= calcularValidadeEfetivaNaAbertura(frasco, agora);

&nbsp;&nbsp;&nbsp;&nbsp;dataAberturaCalculada \= DateTime.fromJSDate(agora, { zone: "America/Sao\_Paulo" }).toISODate();

&nbsp;&nbsp;}

&nbsp;&nbsp;\`\`\`

&nbsp;&nbsp;Como o frasco comprovadamente tem \`estado\_fisico\_frasco \=== "EXTRAVIADO"\`, a condição \`frasco.estado\_fisico\_frasco \=== "FECHADO"\` \*\*nunca será verdadeira\*\*. Trata-se de um \*\*Dead Code\*\* introduzido pela 9.1 que impede a aplicação da regra de validade pós-abertura.

\* \*\*Decisão e Correção na 9.2:\*\*

&nbsp;&nbsp;Utilizar o histórico ou a ausência de \`data\_abertura\` para detectar se o frasco era originalmente fechado:

&nbsp;&nbsp;\`\`\`typescript

&nbsp;&nbsp;// Só era originalmente FECHADO se nunca houve abertura; data ausente com abertura_historica_desconhecida=true não autoriza fabricá-la.

&nbsp;&nbsp;const eraFechadoAntes \= frasco.data\_abertura \== null && frasco.abertura\_historica\_desconhecida \!== true;

&nbsp;&nbsp;if (dados.estadoConstatadoAoReencontrar \=== "ABERTO" && eraFechadoAntes) {

&nbsp;&nbsp;&nbsp;&nbsp;validadeCalculada \= calcularValidadeEfetivaNaAbertura(frasco, agora);

&nbsp;&nbsp;&nbsp;&nbsp;dataAberturaCalculada \= DateTime.fromJSDate(agora, { zone: "America/Sao\_Paulo" }).toISODate();

&nbsp;&nbsp;}

&nbsp;&nbsp;\`\`\`

&nbsp;

\---

&nbsp;

\#\#\# ITEM 5 \[MET-05\]: Limpeza de Quarentena e Terminalidade em Descarte Institucional

\* \*\*Fundamentação Normativa no PDF:\*\*

&nbsp;&nbsp;\- \*\*Seção 4.43.5 (Invariantes, p. 42–43):\*\* \*"DESCARTADO: É terminal; não retorna a DISPONIVEL."\*

&nbsp;&nbsp;\- \*\*Seção 7.2.1 (Status, p. 96):\*\* \*"Um frasco no estado de quarentena pode ser descartado ou voltar ao estado disponível..."\*

&nbsp;&nbsp;\- \*\*Seção 7.2.20 (p. 103):\*\* Permite descarte de frascos VAZIOS, QUEBRADOS ou VENCIDOS pendentes de descarte.

\* \*\*Diagnóstico do Resíduo da 9.1:\*\*

&nbsp;&nbsp;A função \`descartarFrasco\` criada no commit \`48063c0c\` executa:

&nbsp;&nbsp;\`\`\`typescript

&nbsp;&nbsp;tx.update(frascoRef, {

&nbsp;&nbsp;&nbsp;&nbsp;estado\_fisico\_frasco: "DESCARTADO",

&nbsp;&nbsp;&nbsp;&nbsp;disponibilidade: "INDISPONIVEL",

&nbsp;&nbsp;&nbsp;&nbsp;detalhe\_status: "Frasco descartado institucionalmente: " \+ dados.motivo,

&nbsp;&nbsp;});

&nbsp;&nbsp;\`\`\`

&nbsp;&nbsp;A flag \`em\_quarentena\` permanece intocada. Se o frasco foi retido em quarentena antes do descarte, ele continua com \`em\_quarentena: true\`, gerando falso-positivo nas contagens de itens retidos em bancada.

\* \*\*Decisão e Correção na 9.2:\*\*

&nbsp;&nbsp;Resetar expressamente a flag \`em\_quarentena\`:

&nbsp;&nbsp;\`\`\`typescript

&nbsp;&nbsp;tx.update(frascoRef, {

&nbsp;&nbsp;&nbsp;&nbsp;estado\_fisico\_frasco: "DESCARTADO",

&nbsp;&nbsp;&nbsp;&nbsp;disponibilidade: "INDISPONIVEL",

&nbsp;&nbsp;&nbsp;&nbsp;em\_quarentena: false, // Descarte conclui e extingue o estado de quarentena

&nbsp;&nbsp;&nbsp;&nbsp;detalhe\_status: "Frasco descartado institucionalmente: " \+ dados.motivo,

&nbsp;&nbsp;});

&nbsp;&nbsp;\`\`\`

&nbsp;

\---

&nbsp;

\#\#\# ITEM 6 \[MET-06\]: Revogação do Bypass de Balcão (\`tcrFisicoAssinado\`) e Conformidade com Q04/Q14

\* \*\*Fundamentação Normativa no PDF:\*\*

&nbsp;&nbsp;\- \*\*Seção 4.44 (Regras Q04 e Q14, p. 45):\*\* \*"O backend valida aceite vinculado ao frasco, finalidade e operação, NUNCA declaração do gestor em nome de terceiro. Sem essas condições, rejeitar."\*

&nbsp;&nbsp;\- \*\*Seção 7.6 / Q04 e Q14 (p. 109):\*\* \*"Para PESQUISA\_TCC\_POS ou ESTUDO\_DEGRADACAO\_RESIDUOS com frasco vencido... obter aceite em sessão autenticada do retirante... backend valida versão vigente, identidade e vínculo do aceite ao frasco... Sem substituir regras institucionais de segurança química."\*

\* \*\*Diagnóstico do Resíduo da 9.1:\*\*

&nbsp;&nbsp;A Auditoria 9.1 adicionou no código de \`registrarRetirada\`:

&nbsp;&nbsp;\`\`\`typescript

&nbsp;&nbsp;if (dados.tcrFisicoAssinado) {

&nbsp;&nbsp;&nbsp;&nbsp;if (\!dados.idTermoUpload) throw new HttpsError("invalid-argument", "O termo físico assinado exige o id do upload.");

&nbsp;&nbsp;} else {

&nbsp;&nbsp;&nbsp;&nbsp;aceite \= await validarAceiteTcrTx(tx, dados.idAceiteTcr, ...);

&nbsp;&nbsp;}

&nbsp;&nbsp;\`\`\`

&nbsp;&nbsp;Isso criou uma brecha que permite ao operador burlar a autenticação do retirante passando qualquer string como \`idTermoUpload\`.

\* \*\*Decisão e Correção na 9.2:\*\*

&nbsp;&nbsp;1\. \*\*Remoção do Bypass Unilateral:\*\* Excluir o parâmetro \`tcrFisicoAssinado\` da chamada de balcão.

&nbsp;&nbsp;2\. \*\*Fluxo Rastreável Homologado:\*\* Caso o laboratório utilize termo físico em papel, o documento digitalizado deve ser submetido com upload prévio auditado, gerando um registro assinado que vincule o UID do tomador antes da liberação, ou a retirada presencial deve exigir que o pesquisador confirme o aceite em seu próprio smartphone/interface no momento do atendimento.

&nbsp;

\---

&nbsp;

\#\#\# ITEM 7 \[MET-07\]: Emissão Obrigatória de Eventos de Domínio no Histórico

\* \*\*Fundamentação Normativa no PDF:\*\*

&nbsp;&nbsp;\- \*\*Seção 4.22 e Seção 5.9.1 (p. 29, 66):\*\* Especificação formal dos 17 tipos de eventos em \`Historico\_Frasco\_Reagente\`.

&nbsp;&nbsp;\- \*\*Seção 7.1 (RF25, p. 96):\*\* \*"O sistema deve manter dados históricos e de auditoria sem apagar fatos relevantes."\*

\* \*\*Diagnóstico do Resíduo da 9.1:\*\*

&nbsp;&nbsp;A Auditoria 9.1 atualizou a documentação da Seção 5.9.1 para listar os 17 tipos de enums, mas não fez as Cloud Functions emitirem os eventos:

&nbsp;&nbsp;\- \`registrarAberturaFrasco\`: Não grava documento algum em \`Historico\_Frasco\_Reagente\`.

&nbsp;&nbsp;\- \`registrarDevolucao\`: Ao mandar frasco vencido para quarentena ou pendência de descarte, emite apenas \`tipo: "ENTROU"\`.

\* \*\*Decisão e Correção na 9.2:\*\*

&nbsp;&nbsp;Inserir a escrita transacional de histórico em \`registrarAberturaFrasco\` (cobrindo os três destinos pós-vencimento) e complementar \`registrarDevolucao\`: 

&nbsp;&nbsp;\`\`\`typescript

&nbsp;&nbsp;// Em registrarAberturaFrasco:

&nbsp;&nbsp;tx.set(admin.firestore().collection("Historico\_Frasco\_Reagente").doc(), {

&nbsp;&nbsp;&nbsp;&nbsp;id\_frasco\_reagente: frascoRef.id,

&nbsp;&nbsp;&nbsp;&nbsp;id\_almoxarifado: frasco.id\_almoxarifado,

&nbsp;&nbsp;&nbsp;&nbsp;id\_gestor: request.auth\!.uid,

&nbsp;&nbsp;&nbsp;&nbsp;tipo: \!venceu ? "AJUSTE" : (dados.destinoSeVencerNaAbertura \=== "QUARENTENA" ? "ENTROU\_EM\_QUARENTENA" : (dados.destinoSeVencerNaAbertura \=== "DISPONIVEL" ? "USO\_VENCIDO\_AUTORIZADO" : "PENDENTE\_DE\_DESCARTE")),

&nbsp;&nbsp;&nbsp;&nbsp;...(venceu ? {} : { campo\_ajustado: "data\_abertura" }),

&nbsp;&nbsp;&nbsp;&nbsp;motivo: "Primeira abertura física do recipiente.",

&nbsp;&nbsp;&nbsp;&nbsp;timestamp: admin.firestore.FieldValue.serverTimestamp(),

&nbsp;&nbsp;});

&nbsp;&nbsp;\`\`\`

&nbsp;

\---

&nbsp;

\#\#\# ITEM 8 \[MET-08\]: Segregação Dimensional de Evaporação nos Relatórios D-0

\* \*\*Fundamentação Normativa no PDF:\*\*

&nbsp;&nbsp;\- \*\*Seção 6.2 (p. 91):\*\* \*"Separação Física Rigorosa: Massa (g) vs Volume (ml)... Para eliminar distorções métricas em sólidos com densidade desconhecida ou nula, as colunas agregadas de saldo e consumo são formalmente segregadas nas duas dimensões físicas fundamentais."\*

&nbsp;&nbsp;\- \*\*Seção 5.9.1 (p. 80):\*\* \`volume\_evaporado\_no\_dia\_ml\` (líquidos) e \`massa\_evaporada\_no\_dia\_g\` (sólidos).

\* \*\*Diagnóstico do Resíduo da 9.1:\*\*

&nbsp;&nbsp;Em \`gerarRelatorioAlmoxarifado\` (p. 211), o bloco de agregação em tempo real do dia atual (D-0) executa:

&nbsp;&nbsp;\`\`\`typescript

&nbsp;&nbsp;devolucoesHojeSnap.docs.forEach(doc \=\> {

&nbsp;&nbsp;&nbsp;&nbsp;const d \= doc.data();

&nbsp;&nbsp;&nbsp;&nbsp;if (d.unidade\_medida\_utilizada \=== "ml") totalVolumeUsado \+= d.medida\_utilizada || 0;

&nbsp;&nbsp;&nbsp;&nbsp;else if (d.unidade\_medida\_utilizada \=== "g") totalMassaUsada \+= d.medida\_utilizada || 0;

&nbsp;&nbsp;&nbsp;&nbsp;totalMassaEvaporada \+= d.peso\_perda\_evaporacao || 0; // ERRO: Soma perda de líquidos na massa de sólidos

&nbsp;&nbsp;});

&nbsp;&nbsp;\`\`\`

\* \*\*Decisão e Correção na 9.2:\*\*

&nbsp;&nbsp;1\. Corrigir o cálculo em D-0 para converter a massa evaporada de líquidos via densidade e alimentar a variável correspondente:

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\`\`\`typescript

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;if (d.unidade\_medida\_utilizada \=== "ml") {

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;totalVolumeUsado \+= d.medida\_utilizada || 0;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const dens \= d.densidade\_aplicada;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;if (\!Number.isFinite(dens) || dens \<= 0) throw new HttpsError("failed-precondition", "Densidade histórica aplicada ausente; não converter evaporação com fator arbitrário.");

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;totalVolumeEvaporado \+= (d.peso\_perda\_evaporacao || 0\) / dens;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;} else {

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;totalMassaUsada \+= d.medida\_utilizada || 0;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;totalMassaEvaporada \+= d.peso\_perda\_evaporacao || 0;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\`\`\`

&nbsp;&nbsp;2\. Modelar \`densidade\_aplicada\` como snapshot histórico obrigatório para líquidos: incluir na Seção 4.23 (Emprestimo\_Reagente) e no dicionário físico da Seção 5.9.1. Sem esse campo o D-0 não converte massa em volume de forma rastreável, e um default arbitrário (1.0) produziria volume errado.

&nbsp;&nbsp;3\. Harmonizar a tabela relacional 3FN da Seção 6.2 para incluir as colunas \`volume\_evaporado\_no\_dia\_ml\` e \`massa\_evaporada\_no\_dia\_g\`.

&nbsp;&nbsp;4\. Atualizar a definição de \`volume\_evaporado\_no\_dia\_ml\` na Seção 5.9.1 para explicitar a conversão \`peso\_perda\_evaporacao / densidade\_aplicada\`, alinhando a semântica da métrica ao cálculo do D-0.

&nbsp;

\---

&nbsp;

\#\#\# ITEM 9 \[MET-09\]: Fechamento do Modelo Formal Alloy M0 contra Estados Espúrios (RETIRADO)

\* \*\*Fundamentação Normativa no PDF:\*\*

&nbsp;&nbsp;\- \*\*Seção 4.43.5 (Invariantes da Máquina de Estados, p. 42–43):\*\* \`EXTRAVIADO\`, \`VAZIO\`, \`QUEBRADO\` e \`DESCARTADO\` exigem compulsoriamente \`disponibilidade \= INDISPONIVEL\`.

&nbsp;&nbsp;\- \*\*Seção 13 (Camada Formal M0, p. 239):\*\* \*"WIT-DISPONIBILIDADE-001 IndisponivelNaoApto: SAT. As buscas de testemunha exigem uma retirada possível e um frasco não apto."\*

\* \*\*Diagnóstico Revisado:\*\*

&nbsp;&nbsp;O diagnóstico de "resíduo da 9.1" não procede. O invariante já está formalizado em \`specification/alloy/reagents/withdrawal.als\`: o predicado \`coerente\` (linhas 17–21) força \`disponibilidade \= INDISPONIVEL\` sempre que o frasco estiver em \`VAZIO \+ QUEBRADO \+ DESCARTADO \+ EXTRAVIADO\` ou em quarentena, e é pré-condição de \`retirar\` e pós-condição verificada por \`check Unicidade\`.

&nbsp;&nbsp;A testemunha \`IndisponivelNaoApto\` exige \`EXTRAVIADO\` e \`INDISPONIVEL\`, não \`EXTRAVIADO\` e \`DISPONIVEL\`. O artefato \`documentation/generated/invariants/retirar\_frasco.tex\` registra \`IndisponivelNaoApto: SAT\`, o que evidencia que a coerência se sustenta; o worklog \`documentation/worklogs/formal-spec/M0\_INDISPONIVEL\_VALIDATION.md\` documenta a troca de \`DisponivelNaoApto\` por \`IndisponivelNaoApto\` exatamente para evidenciar que \`INDISPONIVEL\` impede a disponibilidade.

&nbsp;&nbsp;Além disso, a asserção proposta \`InvarianteDisponibilidadeConsistente\` é redundante: reproduz a condição já embutida em \`coerente\`. Os caminhos citados também estão errados: não existe \`infra\_m0.als\` (o modelo é \`specification/alloy/reagents/withdrawal.als\`) nem \`Section-13-Camada-Formal-M0.tex\` (a seção formal M0 é \`documentation/Formal-Spec-M0.tex\`).

\* \*\*Decisão:\*\*

&nbsp;&nbsp;Item retirado da Auditoria 9.2. Nenhuma alteração em \`withdrawal.als\` ou em \`Formal-Spec-M0.tex\`.

&nbsp;

\---

&nbsp;

\#\#\# ITEM 10 \[MET-10\]: Modelagem Físico-Conceitual de Frascos com "Saldo Desconhecido"

\* \*\*Fundamentação Normativa no PDF:\*\*

&nbsp;&nbsp;\- \*\*Seção 4.24 (Métricas Agregadas, p. 32):\*\* Enumera \`qtd\_frascos\_saldo\_desconhecido\`.

&nbsp;&nbsp;\- \*\*Seção 6.3 (p. 92–93):\*\* \*"Saldos Desconhecidos: Se o saldo de um frasco é desconhecido (ex.: frasco aberto sem peso\_atual preciso registrado), ele não deve ser somado como zero (0) nos agregados totais de volume ou massa... devem ser segregados na camada de agregação."\*

&nbsp;&nbsp;\- \*\*Seção 8.8.6 (UI-06, p. 120):\*\* \*"Se o saldo inicial atual for desconhecido, não inventar quantidade atual."\*

\* \*\*Diagnóstico do Resíduo da 9.1:\*\*

&nbsp;&nbsp;A Auditoria 9.1 criou os campos de contagem nas tabelas de resumo (Seções 5.9.1 e 6.3), mas a entidade \`Frasco\_Reagente\` (Seção 4.21 e 5.9.1) \*\*não possui\*\* o campo \`saldo\_desconhecido: boolean\`, e a função \`cadastrarFrascoAberto\` (p. 155–159) obriga a informar \`pesoFrascoVazioInformado\`, \`volumeAtualEstimado\` ou \`massaAtualEstimada\`, impedindo o registro de frascos com saldo não quantificado.

\* \*\*Decisão e Correção na 9.2:\*\*

&nbsp;&nbsp;1\. \*\*Schema (\`Frasco\_Reagente\`):\*\* Adicionar formalmente \`saldo\_desconhecido: boolean DEFAULT FALSE, NOT NULL\`.

&nbsp;&nbsp;2\. \*\*Cadastro (\`cadastrarFrascoAberto\`):\*\* Permitir a modalidade \`SALDO\_DESCONHECIDO\`, admitindo \`peso\_frasco\_vazio: null\` e marcando \`saldo\_desconhecido: true\`.

&nbsp;&nbsp;3\. \*\*Jobs Agendados de Agregação:\*\* Isolar os frascos com \`saldo\_desconhecido \=== true\`, somando-os exclusivamente na coluna \`qtd\_frascos\_saldo\_desconhecido\` e excluindo-os dos somatórios \`volume\_total\_disponivel\_aferido\_ml\` e \`massa\_total\_disponivel\_aferida\_g\`.

&nbsp;

\---

&nbsp;

\#\# 3\. QUADRO RESUMO DAS ALTERAÇÕES E DIRETÓRIOS ALVO

&nbsp;

| ID | Componente Afetado | Arquivo Fonte no Repositório | Ação Requerida |

|---|---|---|---|

| \*\*MET-01\*\* | Cálculo de Devolução | \`Section-10-Subsection-5-Fluxo-de-Reagentes.tex\` | \`pesoConsumido \= peso\_saida \- dados.pesoRetorno\` no esgotamento |

| \*\*MET-02\*\* | Tolerância Q06 | \`Section-10-Subsection-5-Fluxo-de-Reagentes.tex\` | Isolar \`avisoHigroscopico\` e emitir \`ENTROU\_EM\_QUARENTENA\` |

| \*\*MET-03\*\* | Regras de Frasco Fechado e Aberto | \`Section-7-Requisitos-e-Regras-de-Negocio.tex\` | Descrever fórmulas de sólidos nos itens 1 a 3 da Seção 7.2.14 |

| \*\*MET-04\*\* | Reencontro pós-extravio | \`Section-10-Subsection-5-Fluxo-de-Reagentes.tex\` | Remover dead code; testar \`data\_abertura \== null && abertura\_historica\_desconhecida \!== true\` |

| \*\*MET-05\*\* | Função de Descarte | \`Section-10-Subsection-5-Fluxo-de-Reagentes.tex\` | Resetar \`em\_quarentena: false\` em \`descartarFrasco\` |

| \*\*MET-06\*\* | Autorização Q04 | \`Section-10-Subsection-5-Fluxo-de-Reagentes.tex\` | Revogar bypass \`tcrFisicoAssinado\` sem termo verificado |

| \*\*MET-07\*\* | Histórico de Frascos | \`Section-10-Subsection-5-Fluxo-de-Reagentes.tex\` | Emitir eventos de abertura e destino de vencidos |

| \*\*MET-08\*\* | Relatório Almoxarifado | \`Section-10-Subsection-9-Relatorios-em-PDF.tex\`, \`Section-4\`, \`Section-5\`, \`Section-6\` | Corrigir D-0; modelar \`densidade\_aplicada\` (4.23/5.9.1); colunas na Seção 6.2 |

| \*\*MET-09\*\* | Prova Formal M0 | Não aplicável | ITEM RETIRADO: invariante já existe em \`specification/alloy/reagents/withdrawal.als\` |

| \*\*MET-10\*\* | Saldo Desconhecido | \`Section-4\`, \`Section-5\`, \`Section-10\` | Criar flag \`saldo\_desconhecido\` e modalidade em frasco aberto |

&nbsp;

\---

\*\*Homologação Técnica:\*\* Auditoria 9.2 pronta para aplicação em código e recompilação do \`main.pdf\`.

&nbsp;