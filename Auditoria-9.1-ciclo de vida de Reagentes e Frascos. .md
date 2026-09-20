Abaixo está o **Planejamento de Engenharia e Especificação de Mudanças** estruturado para aplicar no documento main.pdf. O plano corrige de forma definitiva as contradições matemáticas, incompatibilidades de tipagem, falhas de matriz ortogonal e deadlocks de processo identificados.

# **PLANO DE AÇÃO: REFATORAÇÃO E SANEAMENTO DO main.pdf**

&nbsp;

&nbsp;

&nbsp;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;MAPEAMENTO GERAL DE MUDANÇAS  
&nbsp;┌───────────────────────────┬───────────────────────────────────────────────────────────┐  
&nbsp;│ Seção do Documento        │ Problemas Tratados                                        │  
&nbsp;├───────────────────────────┼───────────────────────────────────────────────────────────┤  
&nbsp;│ 4.43.5, 4.44, 7.2.14, 7.3 │ MET-01 (Tara), MET-02 (Ganho Anômalo), MET-04 (Obrig.)    │  
&nbsp;│ 5.9.1, 6.2                │ MET-07 (Enum tipo), MET-08 (Evaporação Almoxarifado)      │  
&nbsp;│ 7.2.20, 8.8.7             │ MET-05 (Descarte de Vencidos)                             │  
&nbsp;│ 10.2.3                    │ MET-01, MET-02, MET-03, MET-04, MET-05, MET-06 (Funções)  │  
&nbsp;│ 10.2.7                    │ MET-08, MET-09 (Relatórios & Materializações)             │  
&nbsp;│ 13 (Camada M0)            │ MET-10 (Invariante Alloy M0)                              │  
&nbsp;└───────────────────────────┴───────────────────────────────────────────────────────────┘

## **1\. Alterações nas Regras de Negócio e Modelagem Conceitual**

### **1.1 Seção 4.43.5 (Página 43\) e Seção 7.2.14 (Página 101\) — Ganho Anômalo de Massa**

> * **Onde mudar:** Seção 4.43.5 (Invariantes do frasco) e Seção 7.2.14 (Tolerância de Devolução).  
> * **Texto Atual:** *"Um ganho de massa acima dessa tolerância bloqueia a devolução por anomalia..."* / *"ganho acima da tolerância bloqueia."*  
> * **Nova Redação:***"Um ganho de massa acima da tolerância Q06 ($P\_{\\text{retorno}} \> P\_{\\text{saida}} \+ \\Delta\_{\\max}$) não aborta a operação via rollback (evitando que o frasco permaneça retido nominalmente sob custódia do usuário). O sistema conclui a devolução em modalidade extraordinária: o empréstimo transiciona para DEVOLVIDO\_COM\_ANOMALIA, e o frasco transiciona compulsoriamente para disponibilidade \= 'INDISPONIVEL' e em\_quarentena \= true, com detalhe\_status registrando suspeita de contaminação/adulteração. É terminantemente proibido registrar evento de higroscopia para frascos não-higroscópicos ou com ganhos fora da tolerância legal."*

### **1.2 Seção 4.44 (Páginas 44–45) e Seção 7.2.14 (Páginas 100–101) — Retorno Abaixo da Tara**

> * **Onde mudar:** Seção 4.44 (Regra Q06) e Seção 7.2.14 (Item 4).  
> * **Texto Atual:** "preservar a leitura bruta no empréstimo e normalizar o peso de estoque à tara". Permite ambiguidade sobre a reescrita da tara nominal.  
> * **Nova Redação:***"No retorno abaixo da tara ($P_{\text{retorno}} < P_{\text{vazio}}$) em até 5 g com confirmarEsgotamento = true, o consumo útil é calculado como todo o saldo restante ($\max(0, P_{\text{saida}} - P_{\text{vazio}})$). O esgotamento homologa a tara real do recipiente e calibra o estoque para saldo zero. O sistema atualiza os campos peso\_frasco\_vazio e peso\_atual com o peso aferido na devolução ($P_{\text{retorno}}$), eliminando o resíduo metrológico e ajustando a tara do fabricante."*

### **1.3 Seção 7.2.20 (Páginas 102–103) — Elegibilidade para Descarte Institucional**

> * **Onde mudar:** Seção 7.2.20 (Status, vencimento e descarte de frascos).  
> * **Nova Redação (Adicionar parágrafo normativo):***"A ação de descarte institucional (descartarFrasco) é permitida para: (1) frascos com estado físico VAZIO, (2) frascos QUEBRADO, e (3) frascos com vencido \= true e uso\_vencido\_autorizado \= false (situação de PENDENTE\_DE\_DESCARTE), mesmo que ainda possuam conteúdo químico remanescente nos estados ABERTO ou FECHADO, formalizando a baixa do passivo químico perigoso."*

### **1.4 Seção 7.3 (Página 104\) — Matriz de Obrigatoriedade de Frasco Fechado**

> * **Onde mudar:** Seção 7.3 (Matriz formal de obrigatoriedade).  
> * **Ajuste:** Na linha Frasco FECHADO, substituir a redação ambígua por:*"Frasco FECHADO: conteudo\_nominal obrigatório (\> 0), peso\_total obrigatório (\> 0); cálculo compulsório de peso\_frasco\_vazio no momento da inserção (rejeitando tara nula)."*

## **2\. Alinhamento Estrutural 3FN × NoSQL**

### **2.1 Seção 5.9.1 (Página 66\) — Dicionário de Dados do Firestore**

> * **Onde mudar:** Coleção Historico\_Frasco\_Reagente, propriedade tipo.  
> * **Ajuste:** Expandir a enumeração para espelhar integralmente os 17 valores da Seção 4.22:  
>   YAML  
>   tipo: ENUM \[  
>   &nbsp;&nbsp;CADASTRO, SAIU, ENTROU, AJUSTE, FICOU\_VAZIO, QUEBROU,&nbsp;  
>   &nbsp;&nbsp;FOI\_DESCARTADO, VENCEU, INVENTARIO\_ROTINA, EVAPORACAO,&nbsp;  
>   &nbsp;&nbsp;CONCLUSAO, ENTROU\_EM\_QUARENTENA, LIBERADO\_QUARENTENA,&nbsp;  
>   &nbsp;&nbsp;PENDENTE\_DE\_DESCARTE, USO\_VENCIDO\_AUTORIZADO, EXTRAVIO, REENCONTRO  
>   \]

### **2.2 Seções 5.9.1 (Página 78–79) e 6.2 (Páginas 89–90) — Resumo\_Almoxarifado\_Diario**

> * **Onde mudar:** Esquema da tabela relacional e documento NoSQL de Resumo\_Almoxarifado\_Diario.  
> * **Ajuste:** Inserir os dois campos de consolidação de perdas voláteis:  
>   SQL  
>   massa\_evaporada\_no\_dia\_g NUMERIC(12,2) DEFAULT 0, NOT NULL,  
>   volume\_evaporado\_no\_dia\_ml NUMERIC(12,2) DEFAULT 0, NOT NULL

## **3\. Refatoração das Cloud Functions TypeScript (Seção 10\)**

### **3.1 cadastrarFrascoFechado (Seção 10.2.3, Páginas 149 e 151\)**

> * **Mudanças:** Tornar conteudoNominal obrigatório e corrigir a mensagem de erro para reagentes sólidos.

&nbsp;

&nbsp;

&nbsp;

TypeScript

// 1\. Tipagem estrita na interface (Página 149\)  
interface CadastroFrascoFechado {  
&nbsp;&nbsp;idResumoReagente: string;  
&nbsp;&nbsp;idOperacao: string;  
&nbsp;&nbsp;idEspecificacaoReagente: string;  
&nbsp;&nbsp;idAlmoxarifado: string;  
&nbsp;&nbsp;idLote?: string;  
&nbsp;&nbsp;conteudoNominal: number; // OBRIGATÓRIO (MET-04)  
&nbsp;&nbsp;pesoTotal: number;  
&nbsp;&nbsp;validadeFechado?: string;  
&nbsp;&nbsp;validadeDesconhecida?: boolean;  
&nbsp;&nbsp;decisaoSeJaVencido?: "QUARENTENA" | "PENDENTE\_DE\_DESCARTE" | "DISPONIVEL";  
&nbsp;&nbsp;detalheStatus?: string;  
}

// 2\. Validação e cálculo sem menção indevida a densidade para sólidos (Página 151\)  
if (\!dados.conteudoNominal || dados.conteudoNominal \<= 0\) {  
&nbsp;&nbsp;throw new HttpsError("invalid-argument", "Frasco fechado exige conteúdo nominal positivo.");  
}

let pesoVazio: number;  
if (estadoFisico \=== "LIQUIDO") {  
&nbsp;&nbsp;if (\!densidade || densidade \<= 0\) throw new HttpsError("failed-precondition", "Líquido exige densidade positiva.");  
&nbsp;&nbsp;pesoVazio \= dados.pesoTotal \- (dados.conteudoNominal \* densidade);  
&nbsp;&nbsp;if (pesoVazio \<= 0\) throw new HttpsError("invalid-argument", "Peso total incompatível com o volume nominal para esta densidade.");  
} else {  
&nbsp;&nbsp;pesoVazio \= dados.pesoTotal \- dados.conteudoNominal;  
&nbsp;&nbsp;if (pesoVazio \<= 0\) throw new HttpsError("invalid-argument", "Peso total incompatível com a massa nominal informada.");  
}

### **3.2 registrarDevolucao (Seção 10.2.3, Páginas 167–170)**

> * **Mudanças:**  
  1. O código de esgotamento **NÃO DEVE SER ALTERADO**, garantindo que a tara seja sobrescrita pelo peso real (`peso_frasco_vazio: dados.pesoRetorno` e `peso_atual: dados.pesoRetorno`), corrigindo o resíduo metrológico.  
  2. Registrar ganho_massa_higroscopia apenas para itens comprovadamente higroscópicos e dentro da tolerância.  
  3. Emitir evento de anomalia quando houver retenção.
  4. Adicionar tratamento para frasco não-vazio com tara danificada, exigindo uma flag de exceção `recalibrarTaraParcial` com justificativa para impedir bloqueio definitivo no retorno abaixo da tara.

&nbsp;

&nbsp;

&nbsp;

TypeScript

// Substituição do bloco de validação de tara da Linha 167 (p. 167 do PDF):
const diferencaTara = frasco.peso_frasco_vazio == null ? 0 : frasco.peso_frasco_vazio - dados.pesoRetorno;

const esgotado = (diferencaTara > 0 && diferencaTara <= 5 && dados.confirmarEsgotamento === true) ||
                 (diferencaTara > 5 && dados.confirmarEsgotamento === true && dados.motivoRecalibracao != null);

const recalibracaoParcial = diferencaTara > 0 && !esgotado && 
                            dados.recalibrarTaraParcial === true && 
                            dados.motivoRecalibracao != null && 
                            dados.novoPesoVazioEstimado != null;

if (diferencaTara > 0 && !esgotado && !recalibracaoParcial) {
  throw new HttpsError("failed-precondition", "Retorno abaixo da tara exige confirmação de esgotamento ou parâmetros de recalibração parcial de recipiente.");
}

if (esgotado) {
  pesoConsumido = Math.max(0, emprestimo.peso_saida - frasco.peso_frasco_vazio);
} else if (recalibracaoParcial) {
  // Aplica nova tara estimada ao frasco mantendo-o ABERTO e calcula o consumo real com a nova base
  pesoConsumido = Math.max(0, emprestimo.peso_saida - dados.pesoRetorno - perdaEvaporacao);
}

// Páginas 168-169 (MANTIDO INALTERADO conforme MET-01)  
const atualizacaoFrasco: Record<string, unknown> = {  
  disponibilidade: esgotado || reterPorAnomalia ? "INDISPONIVEL" : "DISPONIVEL",  
  ...(esgotado && {  
    estado_fisico_frasco: "VAZIO",  
    peso_frasco_vazio: dados.pesoRetorno, // MET-01: Substitui a tara teórica pela tara real  
    peso_atual: dados.pesoRetorno  
  }),  
  ...(!esgotado && { 
    peso_atual: dados.pesoRetorno,
    ...(recalibracaoParcial && { peso_frasco_vazio: dados.novoPesoVazioEstimado }) // <--- SALVA A NOVA TARA
  }),  
  data_ultima_pesagem: admin.firestore.FieldValue.serverTimestamp(),  
  medida_usada: admin.firestore.FieldValue.increment(pesoConsumido),  
  vencido: frascoVencido,  
};

// Páginas 169-170: Registro de Histórico Saneado (MET-03)  
if (recalibracaoParcial) {
  tx.set(admin.firestore().collection("Historico_Frasco_Reagente").doc(), {
    id_frasco_reagente: frascoRef.id,
    id_almoxarifado: frasco.id_almoxarifado,
    id_gestor: request.auth!.uid,
    id_emprestimo_reagente: emprestimoRef.id,
    tipo: "AJUSTE",
    campo_ajustado: "recalibracao_tara_parcial",
    peso_anterior: frasco.peso_frasco_vazio,
    peso_novo: dados.novoPesoVazioEstimado,
    motivo: dados.motivoRecalibracao,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

if (avisoHigroscopico && \!reterPorAnomalia && frasco.eh\_higroscopico \=== true) {  
&nbsp;&nbsp;// Apenas se for de fato higroscópico e dentro do limite  
&nbsp;&nbsp;tx.set(admin.firestore().collection("Historico\_Frasco\_Reagente").doc(), {  
&nbsp;&nbsp;&nbsp;&nbsp;id\_frasco\_reagente: frascoRef.id,  
&nbsp;&nbsp;&nbsp;&nbsp;id\_almoxarifado: frasco.id\_almoxarifado,  
&nbsp;&nbsp;&nbsp;&nbsp;id\_gestor: request.auth\!.uid,  
&nbsp;&nbsp;&nbsp;&nbsp;id\_emprestimo\_reagente: emprestimoRef.id,  
&nbsp;&nbsp;&nbsp;&nbsp;tipo: "AJUSTE",  
&nbsp;&nbsp;&nbsp;&nbsp;campo\_ajustado: "ganho\_massa\_higroscopia",  
&nbsp;&nbsp;&nbsp;&nbsp;peso\_anterior: emprestimo.peso\_saida,  
&nbsp;&nbsp;&nbsp;&nbsp;peso\_novo: dados.pesoRetorno,  
&nbsp;&nbsp;&nbsp;&nbsp;medida\_ajustada: dados.pesoRetorno \- emprestimo.peso\_saida,  
&nbsp;&nbsp;&nbsp;&nbsp;unidade\_medida\_ajustada: "g",  
&nbsp;&nbsp;&nbsp;&nbsp;timestamp: admin.firestore.FieldValue.serverTimestamp(),  
&nbsp;&nbsp;});  
} else if (reterPorAnomalia) {  
&nbsp;&nbsp;// Registra o evento de anomalia grave no histórico  
&nbsp;&nbsp;tx.set(admin.firestore().collection("Historico\_Frasco\_Reagente").doc(), {  
&nbsp;&nbsp;&nbsp;&nbsp;id\_frasco\_reagente: frascoRef.id,  
&nbsp;&nbsp;&nbsp;&nbsp;id\_almoxarifado: frasco.id\_almoxarifado,  
&nbsp;&nbsp;&nbsp;&nbsp;id\_gestor: request.auth\!.uid,  
&nbsp;&nbsp;&nbsp;&nbsp;id\_emprestimo\_reagente: emprestimoRef.id,  
&nbsp;&nbsp;&nbsp;&nbsp;tipo: "ENTROU\_EM\_QUARENTENA",  
&nbsp;&nbsp;&nbsp;&nbsp;campo\_ajustado: "retencao\_por\_anomalia",  
&nbsp;&nbsp;&nbsp;&nbsp;peso\_anterior: emprestimo.peso\_saida,  
&nbsp;&nbsp;&nbsp;&nbsp;peso\_novo: dados.pesoRetorno,  
&nbsp;&nbsp;&nbsp;&nbsp;motivo: \`Ganho de massa anômalo (${dados.pesoRetorno \- emprestimo.peso\_saida} g) excedendo tolerância Q06.\`,  
&nbsp;&nbsp;&nbsp;&nbsp;timestamp: admin.firestore.FieldValue.serverTimestamp(),  
&nbsp;&nbsp;});  
}

### **3.3 registrarExtravioOuReencontro (Seção 10.2.3, Páginas 173–174)**

> * **Mudanças:**  
  1. Forçar disponibilidade \= 'INDISPONIVEL' em qualquer reencontro em quarentena.  
  2. Recalcular validade pós-abertura se o frasco era FECHADO e foi reencontrado ABERTO.

&nbsp;

&nbsp;

&nbsp;

TypeScript

// Página 173-174 (Ramo REENCONTRAR)  
const agora \= new Date();  
const { DateTime } \= require("luxon");

let validadeCalculada \= frasco.validade\_efetiva  
&nbsp;&nbsp;? (typeof frasco.validade\_efetiva.toDate \=== "function"  
&nbsp;&nbsp;&nbsp;&nbsp;? frasco.validade\_efetiva.toDate()  
&nbsp;&nbsp;&nbsp;&nbsp;: DateTime.fromISO(frasco.validade\_efetiva, { zone: "America/Sao\_Paulo" }).endOf("day").toJSDate())  
&nbsp;&nbsp;: null;

let dataAberturaCalculada \= frasco.data\_abertura ?? null;

// MET-06: Se era FECHADO e foi achado ABERTO, aciona a validade pós-abertura  
if (dados.estadoConstatadoAoReencontrar \=== "ABERTO" && frasco.estado\_fisico\_frasco \=== "FECHADO") {  
&nbsp;&nbsp;validadeCalculada \= calcularValidadeEfetivaNaAbertura(frasco, agora);  
&nbsp;&nbsp;dataAberturaCalculada \= DateTime.fromJSDate(agora, { zone: "America/Sao\_Paulo" }).toISODate();  
}

const venceuAgora \= Boolean(validadeCalculada && validadeCalculada \<= agora);  
const frascoVencido \= Boolean(frasco.vencido || venceuAgora);

tx.update(frascoRef, {  
&nbsp;&nbsp;estado\_fisico\_frasco: dados.estadoConstatadoAoReencontrar,  
&nbsp;&nbsp;disponibilidade: "INDISPONIVEL", // MET-06: Quarentena impõe compulsoriamente INDISPONIVEL  
&nbsp;&nbsp;em\_quarentena: true,  
&nbsp;&nbsp;data\_abertura: dataAberturaCalculada,  
&nbsp;&nbsp;validade\_efetiva: validadeCalculada ? DateTime.fromJSDate(validadeCalculada, { zone: "America/Sao\_Paulo" }).toISODate() : null,  
&nbsp;&nbsp;vencido: frascoVencido,  
&nbsp;&nbsp;detalhe\_status: \`Reencontrado em quarentena: ${dados.motivo}\`,  
});

### **3.4 descartarFrasco (Seção 10.2.3, Página 177\)**

> * **Mudanças:** Permitir descarte de frascos vencidos com descarte aprovado (PENDENTE\_DE\_DESCARTE).

&nbsp;

&nbsp;

&nbsp;

TypeScript

// Página 177 (MET-05)  
const aptoParaDescarte \= frasco.estado\_fisico\_frasco \=== "VAZIO" ||  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;frasco.estado\_fisico\_frasco \=== "QUEBRADO" ||  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(frasco.vencido \=== true && frasco.uso\_vencido\_autorizado \=== false);

if (frasco.disponibilidade === "EMPRESTADO") {
  throw new HttpsError("failed-precondition", "Frasco com empréstimo ativo não pode ser descartado. Registre a devolução ou encerramento extraordinário primeiro.");
}

if (\!aptoParaDescarte) {  
&nbsp;&nbsp;throw new HttpsError(  
&nbsp;&nbsp;&nbsp;&nbsp;"failed-precondition",  
&nbsp;&nbsp;&nbsp;&nbsp;"Apenas frascos vazios, quebrados ou vencidos aguardando descarte podem ser descartados institucionalmente."  
&nbsp;&nbsp;);  
}

tx.update(frascoRef, {  
&nbsp;&nbsp;estado\_fisico\_frasco: "DESCARTADO",  
&nbsp;&nbsp;disponibilidade: "INDISPONIVEL",  
&nbsp;&nbsp;em\_quarentena: false,  
&nbsp;&nbsp;detalhe\_status: "Frasco descartado institucionalmente: " \+ dados.motivo,  
});

### **3.5 gerarRelatorioAlmoxarifado (Seção 10.2.7, Página 207\)**

> * **Mudanças:** Acoplar a geração de relatórios à coleção Resumo\_Almoxarifado\_Diario (D-1) e realizar leitura incremental para o dia corrente (D-0), evitando ponto cego nas auditorias em tempo real.

&nbsp;

&nbsp;

&nbsp;

TypeScript

// Página 207 (MET-08 e MET-09)  
// 1\. Busca agregados diários materializados do mês (evita N+1 de empréstimos) e acopla movimentações do dia corrente.  
const hojeISO = DateTime.now().setZone("America/Sao_Paulo").toISODate();
const dataFimISO = DateTime.fromJSDate(dataFim).toISODate();

// Limita os resumos consolidados estritamente até ontem (D-1):
const dataLimiteResumo = dataFimISO >= hojeISO 
  ? DateTime.now().setZone("America/Sao_Paulo").minus({ days: 1 }).toISODate() 
  : dataFimISO;

const resumosDiariosSnap = await admin.firestore().collection("Resumo_Almoxarifado_Diario")
  .where("id_almoxarifado", "==", idAlmoxarifado)
  .where("data", ">=", DateTime.fromJSDate(dataInicio).toISODate())
  .where("data", "<=", dataLimiteResumo) // <--- Garante que D-0 nunca seja lido aqui
  .get();

let totalVolumeUsado = 0;
let totalMassaUsada = 0;
let totalVolumeEvaporado = 0;
let totalMassaEvaporada = 0;
let maxFrascosSaldoDesconhecido = 0;

resumosDiariosSnap.docs.forEach(doc => {
  const d = doc.data();
  totalVolumeUsado += d.volume_utilizado_no_dia_ml || 0;
  totalMassaUsada += d.massa_utilizada_no_dia_g || 0;
  totalVolumeEvaporado += d.volume_evaporado_no_dia_ml || 0;
  totalMassaEvaporada += d.massa_evaporada_no_dia_g || 0;
  maxFrascosSaldoDesconhecido = Math.max(maxFrascosSaldoDesconhecido, d.qtd_frascos_saldo_desconhecido || 0);
});

// Se o período filtrado abrange o dia corrente (D-0), soma o dia de hoje em tempo real (sem risco de duplicar):

if (dataFimISO >= hojeISO) {
  const inicioHoje = DateTime.now().setZone("America/Sao_Paulo").startOf("day").toJSDate();
  const fimHoje = DateTime.now().setZone("America/Sao_Paulo").endOf("day").toJSDate();

  const devolucoesHojeSnap = await admin.firestore().collection("Emprestimo_Reagente")
    .where("id_almoxarifado", "==", idAlmoxarifado)
    .where("data_devolucao_efetuada", ">=", inicioHoje)
    .where("data_devolucao_efetuada", "<=", fimHoje)
    .get();

  devolucoesHojeSnap.docs.forEach(doc => {
    const d = doc.data();
    if (d.unidade_medida_utilizada === "ml") totalVolumeUsado += d.medida_utilizada || 0;
    else if (d.unidade_medida_utilizada === "g") totalMassaUsada += d.medida_utilizada || 0;
    totalMassaEvaporada += d.peso_perda_evaporacao || 0;
  });
}

## **4. Correção da Prova Formal Alloy M0 (Seção 13, Página 235)**

> * **Onde mudar:** Nenhuma alteração exigida na infraestrutura formal (Seção 13).  
> * **Problema apontado anteriormente:** A testemunha WIT-DISPONIBILIDADE-001 admitiu um frasco EXTRAVIADO como DISPONIVEL (SAT).  
> * **Ação:** Nenhuma. A verificação a posteriori utilizando o predicado `coerente[s: Estado]` deve ser preservada. Adicionar um `fact` global anularia a capacidade do Alloy de testar possíveis defeitos de transição e tornaria a testemunha e os `assert`s tautológicos.  
> * **Resultado Esperado:** A verificação `run Testemunha` deve continuar retornando SAT para prover a vacuidade, e `check BloqueioFisico` deve provar que a coerência funciona. O paradigma do Alloy na Seção 13 permanece intocado.

## **5\. Roteiro de Verificação Pós-Edição**

> 1. **Simulação Numérica de Tara (Caso A):** Confirmar que o documento Frasco_Reagente atualiza `peso_frasco_vazio: 117` e `peso_atual: 117` e gera o histórico `FICOU_VAZIO` com tara nominal anterior de 120 g.  
> 2. **Simulação de Contaminação (Caso B):** Confirmar que devolução com 203 g grava status: "DEVOLVIDO\_COM\_ANOMALIA", frasco em quarentena e histórico ENTROU\_EM\_QUARENTENA (sem menção a higroscopia).  
> 3. **Descarte de Passivo Vencido:** Confirmar que chamar descartarFrasco para frasco com vencido: true, uso\_vencido\_autorizado: false e estado\_fisico\_frasco: "ABERTO" transiciona para DESCARTADO com sucesso.  
> 4. **Reencontro de Frasco Aberto:** Confirmar que ao reencontrar como ABERTO um frasco previamente FECHADO, a função calcula a data de abertura e a validade pós-abertura (validade\_apos\_aberto\_dias), aplicando disponibilidade: "INDISPONIVEL".