# DECISOES\_DOCUMENTAIS\_FASE\_3B1\_LCQUI — Consolidação e Resoluções Técnicas Finais

Este documento formaliza as decisões arquiteturais, de integridade de dados e regras de domínio para as pendências da **Fase 3B.1 (DDP-3B1-01 a DDP-3B1-06)** do sistema do **LCQUI (Laboratório de Ciências Químicas da UENF)**.

As resoluções foram estabelecidas por uma banca multidisciplinar composta por:

- **Engenharia de Software Sênior & Arquitetura de Sistemas Distribuídos**  
- **Engenharia de Dados & Modelagem Relacional 3FN / NoSQL**  
- **Doutor em Química Analítica / Segurança de Reagentes**  
- **Gestão de Laboratório Universitário**  
- **Stakeholders do Sistema (Docência, Pesquisa e Administração UENF)**

---

## 1\. DDP-3B1-01 — Extravio: Ausência Recuperável com Reingresso em Quarentena

### 1.1 Deliberação Técnica e Justificativa de Domínio

* **Decisão Adotada:** **Alternativa 1 — Ausência Recuperável com Reingresso Obrigatório em Quarentena**.  
* **Fundamentação Multidisciplinar:**  
  * **Química & Segurança Operacional:** Um frasco extraviado que permaneceu fora do controle do almoxarifado pode ter sofrido exposição a intempéries, contaminação cruzada, violação de lacre ou degradação fotoquímica/térmica. Se reencontrado, ele **nunca pode voltar diretamente à disponibilidade de uso**. Ele deve ingressar compulsoriamente em **QUARENTENA**, exigindo inspeção organoléptica, verificação de massa em balança e laudo do gestor/químico responsável antes de eventual liberação ou encaminhamento para descarte.  
  * **Gestão Laboratorial & Patrimonial:** O frasco físico já possui etiqueta indelével com código de barras institucional (`LCQUI-N`) e frequentemente contém reagentes de alto valor financeiro ou controlados pela Polícia Federal e Exército. Considerar o frasco como definitivamente baixado ou "destruído" forçaria o descarte desnecessário de material reaproveitável ou induziria a criação de um código duplicado para a mesma embalagem. Tratar extravio como `DESCARTADO` violaria a verdade física dos fatos (o recipiente não foi descartado).  
  * **Engenharia de Software & Auditoria:** O empréstimo no qual o extravio ocorreu **permanece encerrado em definitivo** como `ENCERRADO_EXTRAORDINARIO` (a ocorrência histórica do sinistro não é apagada nem reaberta). O frasco físico transiciona para o novo estado canônico `EXTRAVIADO`. Caso seja reencontrado, o fluxo auditado de reingresso comuta o estado para `ABERTO` (ou `FECHADO`), atribui `em_quarentena = true` e registra o evento no histórico.

### 1.2 Modelagem de Dados

#### A. Modelo Relacional 3FN (PostgreSQL)

* **Tabela `Frasco_Reagente`:**  
  * Atualização do enum `estado_fisico_frasco`:  
    ALTER TYPE estado\_fisico\_frasco\_enum ADD VALUE 'EXTRAVIADO';  
  * Adição de colunas de rastreabilidade de recuperação:  
    * `reencontrado_em`: `TIMESTAMP NULL`  
    * `reencontrado_por`: `INTEGER FK(Usuario) NULL`  
* **Tabela `Historico_Frasco_Reagente`:**  
  * Inclusão dos tipos de evento no enum: `'EXTRAVIOU_EM_EMPRESTIMO'`, `'REENCONTRADO_APOS_EXTRAVIO'`.

#### B. Mapeamento Firestore (NoSQL)

* **No documento `Frasco_Reagente/{id}` ao constatar extravio:**  
  {  
  &nbsp;&nbsp;"estado\_fisico\_frasco": "EXTRAVIADO",  
  &nbsp;&nbsp;"disponibilidade": "DISPONIVEL",  
  &nbsp;&nbsp;"requer\_descarte": false,  
  &nbsp;&nbsp;"detalhe\_status": "Frasco extraviado durante empréstimo ID: emp\_789. Sinistro formalizado.",  
  &nbsp;&nbsp;"peso\_atual": 0.0  
  }  
* **No documento `Frasco_Reagente/{id}` no momento do reencontro:**  
  {  
  &nbsp;&nbsp;"estado\_fisico\_frasco": "ABERTO",  
  &nbsp;&nbsp;"em\_quarentena": true,  
  &nbsp;&nbsp;"requer\_descarte": false,  
  &nbsp;&nbsp;"detalhe\_status": "Reencontrado no laboratório após extravio. Retido em quarentena para inspeção técnica.",  
  &nbsp;&nbsp;"peso\_atual": 432.100,  
  &nbsp;&nbsp;"data\_ultima\_pesagem": "Timestamp",  
  &nbsp;&nbsp;"reencontrado\_em": "Timestamp",  
  &nbsp;&nbsp;"reencontrado\_por": "uid\_gestor"  
  }

### 1.3 Interface e Fluxo de Reencontro (UI-07)

* Na aba de Alertas e Histórico de Frascos, o gestor localiza o item pelo código `LCQUI-N` e aciona a ação **"Registrar Reencontro de Frasco"**.  
* O modal solicita:  
  * Leitura da massa bruta na balança em gramas (`peso_atual`);  
  * Parecer inicial de integridade física da embalagem;  
  * Justificativa circunstanciada de onde o material foi localizado.  
* A Cloud Function `registrarReencontroFrasco` comuta o estado para `ABERTO`, fixa `em_quarentena = true`, grava o evento no histórico e direciona o item à fila de quarentena.

---

## 2\. DDP-3B1-02 — Limite de Confirmação do Wizard de Cadastro

### 2.1 Deliberação Técnica e Justificativa de Domínio

* **Decisão Adotada:** **Alternativa 2 — Confirmação Explícita por Entidade Completa e Autônoma**.  
* **Fundamentação Multidisciplinar:**  
  * **Gestão de Lab & Prática de Compras:** O processo de incorporação de reagentes no LCQUI muitas vezes ocorre em etapas assíncronas: o gestor cadastra o catálogo nominal (Resumo) e a fórmula comercial (Especificação) com base no catálogo do fornecedor ou edital licitatório; posteriormente lança a nota fiscal recebida (Lote); e só então realiza a pesagem individual e etiquetagem dos frascos físicos na bancada. Forçar uma transação monolítica que só confirme o catálogo junto ao frasco final obrigaria o gestor a cadastrar "frascos fictícios" para não perder a digitação.  
  * **Engenharia de Software & 3FN:** `Resumo_Reagente`, `Especificacao_Reagente` e `Lote` são entidades canônicas independentes no modelo relacional. Se uma etapa contiver todos os seus campos obrigatórios validados, ela **é uma entidade completa**. O botão de avanço é rotulado como **"Salvar \[Entidade\] e Continuar"**, retornando o ID persistido para o passo seguinte.  
  * **Regra de Mistura Química:** A única dependência de bloco obrigatória é que uma `Especificacao_Reagente` do tipo `MISTURA` deve ser persistida atomicamente junto com sua `Composicao_Reagente` ($\\ge 1$ componente).

### 2.2 Política de Cancelamento e Limpeza

* Caso o operador confirme o Resumo e a Especificação, mas feche o navegador antes de cadastrar o Lote ou os Frascos, os cadastros do catálogo **permanecem válidos e disponíveis** para uso futuro.  
* **Exclusão de Entidades Sem Frascos:**  
  * O campo `Especificacao_Reagente.ativo: boolean` permite desativação lógica.  
  * A exclusão física ou desativação de uma especificação ou lote é permitida estritamente se o total de frascos associados for zero: $$\\text{COUNT}(\\text{Frasco\_Reagente WHERE id\_especificacao} \= X) \= 0$$

---

## 3\. DDP-3B1-03 — Escopo de `localStorage` em Bancada Compartilhada

### 3.1 Deliberação Técnica e Justificativa de Segurança

* **Decisão Adotada:** **Alternativa 2 Harmonizada — Substituição expressa da restrição da UI-13 exclusivamente para rascunhos de wizards de catálogo de almoxarifado, preservando a proibição estrita de `localStorage` para tokens de autenticação, senhas e dados sensíveis de pessoas**.  
* **Fundamentação Multidisciplinar:**  
  * **Segurança (AppSec):** Dados de catálogo químico (nome de reagente, massa molecular, CAS, fabricante, fórmula) constituem informações operacionais públicas internas, sem risco à privacidade de indivíduos (LGPD) ou segurança de credenciais.  
  * **Gestão de Lab & UX de Bancada:** No almoxarifado do LCQUI, o computador de bancada é compartilhado entre estagiários e gestores. Perder dados longos de notas fiscais ou composição química por oscilação de rede ou recarregamento acidental era motivo de retrabalho constante.

### 3.2 Mitigações Técnicas Obrigatórias no Frontend

1. **Namespacing por UID do Operador:**  
   const STORAGE\_KEY \= \`lcqui\_draft\_wizard\_${auth.currentUser.uid}\_${tipoEntidade}\`;  
2. **Limpeza Obrigatória no Logout (`COM-01`):** A rotina de logout do sistema executa a varredura e expurgo de todas as chaves `lcqui_draft_*` do navegador.  
3. **TTL de Expiração (24 horas):** O objeto persistido armazena `criado_em: number`. Rascunhos com mais de 24 horas são limpos automaticamente na inicialização.  
4. **Interface com Banner de Controle:** Ao abrir a tela com rascunho presente, o usuário visualiza: *`"Rascunho não finalizado encontrado. [Restaurar dados] [Descartar rascunho]"`*

---

## 4\. DDP-3B1-04 — Semântica de `conteudo_nominal` no Frasco Aberto

### 4.1 Deliberação Técnica e Metrologia Química

* **Decisão Adotada:** **Alternativa 1 — `conteudo_nominal` representa a quantidade original declarada no rótulo/fabricante (capacidade de fábrica). O saldo inicial de reagente restante é conceituado como DESCONHECIDO**.  
* **Fundamentação Multidisciplinar:**  
  * **Metrologia & Doutorado em Química:** No vocabulário internacional de metrologia e nas boas práticas de laboratório, "conteúdo nominal" (ou capacidade nominal) é o valor de especificação da embalagem impresso pelo fabricante (ex.: "Frasco de 500 mL", "Frasco de 1000 g"). Esse valor não muda quando a tampa é aberta e o selo rompido. O saldo restante de reagente é uma grandeza física completamente distinta.  
  * **Engenharia de Dados (3FN):** A coluna `Frasco_Reagente.conteudo_nominal NUMERIC(10,3)` é mantida com o valor original de fábrica (ex.: `500.000` mL). Caso um frasco muito antigo possua rótulo ilegível ou rasurado, o atributo admite `NULL` apenas como exceção física.  
  * **Engenharia de Software:** O sistema **não utiliza `conteudo_nominal` para calcular saldo disponível de frasco aberto**. O saldo líquido inicial de um frasco aberto no cadastro permanece **desconhecido** (pois `peso_frasco_vazio = NULL`). O consumo é apurado exclusivamente por diferença de balança ($\\Delta m$) em cada empréstimo.

---

## 5\. DDP-3B1-05 — Escassez: Limiar e Universo Monitorado

### 5.1 Deliberação Técnica e Eficiência Operacional

* **Decisão Adotada:** **Alternativa 3 — Limiar Configurado por Par Necessário (Especificação × Almoxarifado)**.  
* **Fundamentação Multidisciplinar:**  
  * **Química & Gestão de Almoxarifados:** O LCQUI atende a demandas didáticas (Graduação) e analíticas (Pós-Graduação/Pesquisa) com almoxarifados físicos distintos. Um reagente analítico de alta pureza (ex.: *Acetonitrila Grau HPLC*) é exclusivo do laboratório instrumental; o Almoxarifado Central de Graduação não precisa e não deve estocá-lo. Se o sistema monitorasse todas as especificações em todas as unidades (universo $A \\times E$), o almoxarifado didático sofreria de falsos alertas perpétuos de escassez para centenas de reagentes de pesquisa que nunca teve a intenção de estocar. Além disso, o consumo e o estoque mínimo variam por unidade (ex.: Almoxarifado Central consome 20 frascos/mês de Acetona; um setorial consome 1 frasco).  
  * **FinOps & Engenharia de Software:** Avaliar apenas os pares necessários $\\mathcal{O}(K)$ elimina consultas desnecessárias no Firestore, evita alertas espúrios e modela a regra de reposição em estrita conformidade com a Terceira Forma Normal.

### 5.2 Modelagem de Dados e Cloud Function

#### A. Modelo Relacional 3FN (PostgreSQL)

* **Tabela `Estoque_Minimo_Almoxarifado`:**  
  CREATE TABLE Estoque\_Minimo\_Almoxarifado (  
  &nbsp;&nbsp;id\_especificacao\_reagente INTEGER NOT NULL REFERENCES Especificacao\_Reagente(id),  
  &nbsp;&nbsp;id\_almoxarifado INTEGER NOT NULL REFERENCES Almoxarifado(id),  
  &nbsp;&nbsp;qtd\_limiar\_escassez INTEGER NOT NULL CHECK (qtd\_limiar\_escassez \>= 0),  
  &nbsp;&nbsp;notificacao\_ativa BOOLEAN DEFAULT TRUE NOT NULL,  
  &nbsp;&nbsp;PRIMARY KEY (id\_especificacao\_reagente, id\_almoxarifado)  
  );

#### B. Mapeamento Firestore (NoSQL)

* Subcoleção: `Almoxarifado/{idAlmox}/Estoques_Configurados/{especId}`:  
  {  
  &nbsp;&nbsp;"id\_resumo\_reagente": "resumo\_123",  
  &nbsp;&nbsp;"id\_especificacao\_reagente": "espec\_456",  
  &nbsp;&nbsp;"descricao\_especificacao": "Ácido Clorídrico 37% P.A.",  
  &nbsp;&nbsp;"qtd\_limiar\_escassez": 3,  
  &nbsp;&nbsp;"ativo": true  
  }

#### C. Job Agendado de Escassez (`verificarEscassezReagentes`)

O job audita exclusivamente os pares configurados ativos:

export const verificarEscassezReagentes \= onSchedule({

&nbsp;&nbsp;schedule: "every day 04:00",

&nbsp;&nbsp;timeZone: "America/Sao\_Paulo"

}, async () \=\> {

&nbsp;&nbsp;const hoje \= DateTime.now().setZone("America/Sao\_Paulo").toISODate();

&nbsp;&nbsp;const almoxarifadosSnap \= await admin.firestore().collection("Almoxarifado").where("ativo", "==", true).get();

&nbsp;&nbsp;const writer \= admin.firestore().bulkWriter();

&nbsp;

&nbsp;&nbsp;for (const almoxDoc of almoxarifadosSnap.docs) {

&nbsp;&nbsp;&nbsp;&nbsp;const idAlmox \= almoxDoc.id;

&nbsp;

&nbsp;&nbsp;&nbsp;&nbsp;// Gestores vinculados a este almoxarifado

&nbsp;&nbsp;&nbsp;&nbsp;const gestoresSnap \= await admin.firestore().collection("Gestor\_Almoxarifado\_x\_Almoxarifado")

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.where("id\_almoxarifado", "==", idAlmox).get();

&nbsp;&nbsp;&nbsp;&nbsp;const gestoresUids \= gestoresSnap.docs.map(d \=\> d.data().id\_gestor\_almoxarifado);

&nbsp;&nbsp;&nbsp;&nbsp;if (gestoresUids.length \=== 0\) continue;

&nbsp;

&nbsp;&nbsp;&nbsp;&nbsp;// Pares configurados

&nbsp;&nbsp;&nbsp;&nbsp;const configsSnap \= await almoxDoc.ref.collection("Estoques\_Configurados").where("ativo", "==", true).get();

&nbsp;

&nbsp;&nbsp;&nbsp;&nbsp;for (const configDoc of configsSnap.docs) {

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const { id\_especificacao\_reagente, qtd\_limiar\_escassez, descricao\_especificacao } \= configDoc.data();

&nbsp;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;// Contagem direta indexada

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const frascosCount \= await admin.firestore().collection("Frasco\_Reagente")

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.where("id\_almoxarifado", "==", idAlmox)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.where("id\_especificacao\_reagente", "==", id\_especificacao\_reagente)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.where("disponibilidade", "==", "DISPONIVEL")

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.where("estado\_fisico\_frasco", "in", \["FECHADO", "ABERTO"\])

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.where("requer\_descarte", "==", false)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.where("em\_quarentena", "==", false)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.count().get();

&nbsp;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const qtdDisponivel \= frascosCount.data().count;

&nbsp;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;if (qtdDisponivel \< qtd\_limiar\_escassez) {

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;for (const uid of gestoresUids) {

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const notifId \= \`escassez\_${id\_especificacao\_reagente}\_${idAlmox}\_${hoje}\_${uid}\`;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const notifRef \= admin.firestore().collection("Usuarios").doc(uid)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.collection("Notificacoes").doc(notifId);

&nbsp;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;writer.set(notifRef, {

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;id\_destinatario: uid,

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;papel\_destinatario: "Gestor\_Almoxarifado",

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tipo: "REAGENTE\_ESCASSO",

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;id\_alvo: id\_especificacao\_reagente,

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;entidade\_alvo: "Especificacao\_Reagente",

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;id\_almoxarifado: idAlmox,

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;quantidade: qtdDisponivel,

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;limiar\_configurado: qtd\_limiar\_escassez,

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;detalhe: \`${descricao\_especificacao} com estoque crítico (${qtdDisponivel} frasco(s); mínimo: ${qtd\_limiar\_escassez}).\`,

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;lida: false,

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;emitida\_em: admin.firestore.FieldValue.serverTimestamp(),

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;expira\_em: admin.firestore.Timestamp.fromMillis(Date.now() \+ 7 \* 86400000),

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}, { merge: false });

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;}

&nbsp;&nbsp;&nbsp;&nbsp;}

&nbsp;&nbsp;}

&nbsp;

&nbsp;&nbsp;await writer.close();

});

---

## 6\. DDP-3B1-06 — Retorno Esgotado e Pesagem após Higienização

### 6.1 Deliberação Técnica e Prática de Laboratório

* **Decisão Adotada:** **Alternativa 1 — O Peso de Retorno para Cálculo de Consumo é Medido no Balcão Imediatamente; a Higienização e Aferição de Tara Real são um Procedimento Técnico Apartado**.  
* **Fundamentação Multidisciplinar:**  
  * **Doutor em Química & Gestão de Lab:** Ao fim de um experimento, o frasco esgotado contém resíduos aderidos (filme líquido nas paredes, pó residual insolúvel ou vapores). O gestor **não pode interromper o balcão de atendimento** para lavar a vidraria com detergente neutro/ácido, enxaguar com água destilada, colocar na estufa a 100 °C por horas e deixar esfriar em dessecador antes de registrar a devolução. Além disso, o resíduo lavado não foi reagente aproveitado no experimento.  
  * **Engenharia de Software & Metrologia Q06:**  
    1. **Momento 1 — Devolução e Fechamento do Empréstimo:** O gestor pesa o frasco como ele foi devolvido na balança (`peso_retorno`). O consumo da aula é calculado rigorosamente pela regra Q06: $$\\text{Consumo}\_{\\text{didático}} \= \\max(0, \\text{peso\_saida} \- \\text{peso\_retorno})$$ O empréstimo comuta para `DEVOLVIDO` e o frasco para `estado_fisico_frasco = 'VAZIO'`.  
    2. **Momento 2 — Destinação do Recipiente / Tara Real Limpa:**  
       * Frascos descartáveis seguem diretamente para descarte químico/resíduo.  
       * Se o frasco for reaproveitado internamente pelo LCQUI para estocar novas soluções preparadas: após o protocolo de lavagem e secagem física em estufa, o gestor realiza a pesagem da vidraria limpa através da ação de bancada **"Aferir Tara Real Pós-Higienização"**. Esse valor consolida o atributo `peso_frasco_vazio` sob o evento auditado `'AJUSTE_TARA_POS_HIGIENIZACAO'`.

---

## 7\. Matriz de Síntese Operacional e Arquitetural

| Item | Decisão Aprovada | Estrutura de Banco (3FN / Firestore) | Impacto de UI / UX | Impacto em Cloud Functions / Regras |
| :---- | :---- | :---- | :---- | :---- |
| **DDP-3B1-01** | Extravio recuperável; reingresso em quarentena | Enum `estado_fisico_frasco` inclui `'EXTRAVIADO'`; campos `reencontrado_em`, `reencontrado_por` | Aba "Extraviados" na UI-07 com ação de registro de reencontro | Nova CF `registrarReencontroFrasco`: seta `ABERTO`, `em_quarentena = true` |
| **DDP-3B1-02** | Confirmação por entidade completa | Sem alteração estrutural; composição de mistura obrigatória na especificação | Botão "Salvar \[Entidade\] e Continuar"; cancelamento preserva catálogo | Exclusão de especificação permitida estritamente se `count(frascos) == 0` |
| **DDP-3B1-03** | `localStorage` restrito a wizards de catálogo | Nenhum no banco | Rascunho indexado por `auth.uid`, expiração 24h e limpeza no logout | UI-13 atualizada com exceção restrita e segura a dados de catálogo |
| **DDP-3B1-04** | `conteudo_nominal` \= capacidade do rótulo | Preserva capacidade original de fábrica; admite `NULL` para rótulo ilegível | Exibição de capacidade de fábrica na embalagem; saldo inicial desconhecido | Cálculos de consumo 100% diferenciais sem dependência da tara |
| **DDP-3B1-05** | Limiar por par configurado (Especificação × Almoxarifado) | Nova tabela associativa `Estoque_Minimo_Almoxarifado`; subcoleção em `Almoxarifado` | Configuração de ponto de pedido por unidade; eliminação de falsos alertas | Job de escassez restrito aos pares configurados $\\mathcal{O}(K)$ |
| **DDP-3B1-06** | Devolução imediata no balcão; tara limpa pós-lavagem apartada | Histórico com tipo de evento `'AJUSTE_TARA_POS_HIGIENIZACAO'` | UI-07 calcula consumo no ato; ação de calibração posterior para vidraria | Preservação total da fórmula Q06 sem introduzir procedimentos inseguros no balcão |

---

*Documento canônico aprovado para a Fase 3B.1 do LCQUI / UENF.*

&nbsp;