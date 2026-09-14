# DECISOES\_DOCUMENTAIS\_LOTE\_3B\_LCQUI — Especificação Técnica Consolidada (Revisão Final)

Este documento consolida as decisões arquiteturais, de integridade de dados e regras de domínio do **Lote 3B** do sistema do **LCQUI (Laboratório de Ciências Químicas da UENF)**. Ele integra os ajustes de bancada, mitigações de concorrência em sistemas serverless e a **correção estrutural do controle de escassez de reagentes**.

---

## 1\. DDP-3B-01 — Quebra e Extravio Durante Empréstimo sem Medição Válida

### 1.1 Deliberação e Princípios de Bancada

* **Frasco Esgotado em Uso:** O esgotamento do reagente em aula prática ou pesquisa **exige a devolução física do recipiente ao almoxarifado**. O encerramento ocorre pelo fluxo regular de devolução (`DEVOLVIDO`), momento em que o gestor atesta o esvaziamento, pesa o frasco limpo e comuta o `estado_fisico_frasco` para `VAZIO`. Se a tara era desconhecida (`NULL`), a pesagem consolida o `peso_frasco_vazio`.  
* **Encerramento Extraordinário (Sem Devolução do Recipiente Íntegro):** Aplica-se exclusivamente quando o recipiente físico não pode retornar à bancada para pesagem:  
  1. `QUEBRA_ACIDENTAL`: Frasco de vidro rompido fisicamente na bancada/capela; resíduo neutralizado/recolhido e vidro descartado em caixa de perfurocortantes.  
  2. `EXTRAVIO_SINISTRO`: Frasco desaparecido, furtado ou extraviado.  
* **Eliminação de Enums Fictícios:** Ficam removidos `ESGOTOU_EM_EMPRESTIMO` e `ESGOTAMENTO_SEM_RETORNO`. Se o frasco não quebrou e não retornou, a classificação técnica e jurídica é `EXTRAVIO_SINISTRO`.

### 1.2 Modelagem de Dados

#### A. Modelo Relacional 3FN (PostgreSQL)

* **Tabela `Emprestimo_Reagente`:**  
  * `status`: `ENUM ('EM_USO', 'ATRASADO', 'DEVOLVIDO', 'DEVOLVIDO_COM_ATRASO', 'ENCERRADO_EXTRAORDINARIO')`  
  * `tipo_encerramento_excepcional`: `ENUM ('QUEBRA_ACIDENTAL', 'EXTRAVIO_SINISTRO') NULL`  
  * `peso_retorno`: `NUMERIC(10,3) NULL` (permanece `NULL` no encerramento extraordinário)  
  * `medida_utilizada`: `NUMERIC(10,3) NULL` (registrado como `0.0`, pois a perda por sinistro não é consumo didático)  
  * `massa_perda_estimada_g`: `NUMERIC(10,3) NULL` (se `peso_frasco_vazio` for conhecido: $\\max(0, \\text{peso\_saida} \- \\text{peso\_frasco\_vazio})$; se `peso_frasco_vazio` for `NULL`: adota `peso_saida` como teto referencial de perda)  
  * `motivo_encerramento_excepcional`: `TEXT NULL`  
  * `id_gestor_encerramento`: `INTEGER FK(Usuario) NULL`  
  * Constraint:  
    CHECK (  
    &nbsp;&nbsp;status \!= 'ENCERRADO\_EXTRAORDINARIO' OR (  
    &nbsp;&nbsp;&nbsp;&nbsp;tipo\_encerramento\_excepcional IN ('QUEBRA\_ACIDENTAL', 'EXTRAVIO\_SINISTRO') AND  
    &nbsp;&nbsp;&nbsp;&nbsp;motivo\_encerramento\_excepcional IS NOT NULL AND  
    &nbsp;&nbsp;&nbsp;&nbsp;id\_gestor\_encerramento IS NOT NULL AND  
    &nbsp;&nbsp;&nbsp;&nbsp;peso\_retorno IS NULL  
    &nbsp;&nbsp;)  
    );  
* **Tabela `Historico_Frasco_Reagente`:**  
  * Tipos de evento: `'QUEBROU_EM_EMPRESTIMO'`, `'EXTRAVIOU_EM_EMPRESTIMO'`.

#### B. Mapeamento Firestore (NoSQL)

* **Em `Emprestimo_Reagente/{id}`:**  
  {  
  &nbsp;&nbsp;"status": "ENCERRADO\_EXTRAORDINARIO",  
  &nbsp;&nbsp;"tipo\_encerramento\_excepcional": "QUEBRA\_ACIDENTAL",  
  &nbsp;&nbsp;"motivo\_encerramento\_excepcional": "Queda acidental na capela durante refluxo. Recipiente rompido.",  
  &nbsp;&nbsp;"id\_gestor\_encerramento": "uid\_gestor",  
  &nbsp;&nbsp;"data\_encerramento": "Timestamp",  
  &nbsp;&nbsp;"peso\_retorno": null,  
  &nbsp;&nbsp;"medida\_utilizada": 0.0,  
  &nbsp;&nbsp;"massa\_perda\_estimada\_g": 210.500  
  }  
* **Em `Frasco_Reagente/{id}`:**  
  * `disponibilidade`: `"DISPONIVEL"` (libera o vínculo com o portador)  
  * `estado_fisico_frasco`: `"QUEBRADO"` (ou `"DESCARTADO"` em caso de extravio com baixa imediata)  
  * `peso_atual`: `0.0`  
  * `requer_descarte`: `true`  
  * `detalhe_status`: `"Encerramento extraordinário (QUEBRA/EXTRAVIO) via Empréstimo {id}"`

---

## 2\. DDP-3B-02 — Quarentena de Frasco Emprestado

### 2.1 Deliberação e Princípios de Segurança Química

* **Decisão Adotada:** **A Quarentena pode ser aplicada imediatamente com o frasco emprestado, preservando o empréstimo ativo até o recolhimento físico.**  
* **Justificativa:** Em caso de risco (contaminação cruzada, degradação perigosa ou recall), a suspensão de uso deve ser imediata no sistema. Exigir devolução prévia deixaria o frasco sem alerta de segurança enquanto ainda está na bancada do professor.

### 2.2 Invariante de Devolução

* A rotina de devolução regular (`registrarDevolucao`) **NUNCA deve resetar a flag `em_quarentena` para `false`**.  
* Ao registrar o retorno de um frasco que entrou em quarentena durante o empréstimo:  
  * O empréstimo é encerrado (`status = 'DEVOLVIDO'`).  
  * O consumo parcial é calculado com o `peso_retorno`.  
  * `disponibilidade` comuta para `"DISPONIVEL"`.  
  * `em_quarentena` **permanece estritamente `true`**, impedindo que o frasco volte a circular até inspeção ou descarte técnico.

---

## 3\. DDP-3B-03 — Pendência de Descarte de Frasco Íntegro Não Vencido e Indexação

### 3.1 Deliberação e Integridade de Dados

* **Decisão Adotada:** **Permitir Marcação de Descarte Técnico Independente (sem falsear validade nem simular quebra física).**  
* **Justificativa:** Reagentes podem tornar-se inservíveis mesmo íntegros e dentro do prazo (contaminação visível, turvação, precipitação irreversível ou encerramento de pesquisas com compostos perigosos). Forçar alteração de validade para o passado configuraria falsidade cadastral em relatórios da Polícia Federal e do Exército Brasileiro.

### 3.2 Otimização NoSQL: Denormalização de `requer_descarte: boolean`

* Para evitar consultas compostas lentas e índices multidimensionais explosivos no Firestore, o modelo NoSQL mantém o campo indexável **`requer_descarte: boolean`** em `Frasco_Reagente`.  
* Atualizado pelo backend para `true` sempre que:  
  1. O frasco transiciona para `VAZIO` ou `QUEBRADO`;  
  2. O gestor aciona o descarte técnico (`pendente_descarte = true`);  
  3. O job diário ou transação detecta vencimento sem autorização didática (`vencido = true && !uso_vencido_autorizado && !em_quarentena`).  
* A tela de Alertas / Descartes do Gestor (UI-07) executa uma consulta simples e indexada:  
  query(  
  &nbsp;&nbsp;collection(db, "Frasco\_Reagente"),  
  &nbsp;&nbsp;where("id\_almoxarifado", "==", idAlmox),  
  &nbsp;&nbsp;where("requer\_descarte", "==", true)  
  )

---

## 4\. DDP-3B-04 — Ciclo de Vida do Cadastro (Wizard) e `localStorage`

### 4.1 Deliberação e Arquitetura Frontend / Backend

* **Decisão Adotada:** **Persistência de Rascunho Exclusiva no `localStorage` do Navegador. Nenhuma Entidade Incompleta é Salva no Banco de Dados.**  
* **Justificativa:** Submeter entidades parciais ou rascunhos no Firestore polui Security Rules, gera registros órfãos em caso de abandono e exige jobs de limpeza. O banco só recebe transações completas e validadas.

### 4.2 Mitigações para Terminais Compartilhados

1. **Namespacing por UID:**  
   const STORAGE\_KEY \= \`lcqui\_draft\_wizard\_${auth.currentUser.uid}\_${tipoEntidade}\`;  
2. **TTL e Expiração de Rascunhos:** Descarte automático no frontend se o rascunho tiver mais de 24 horas.  
3. **UX de Retomada e Limpeza:** Banner com opções explícitas de `[Restaurar dados]` ou `[Descartar rascunho]`.  
4. **Limpeza pós-commit:** Executa `localStorage.removeItem(STORAGE_KEY)` após o retorno de sucesso do backend.

---

## 5\. Regra Fechada para Frascos Abertos: `peso_frasco_vazio = NULL`

### 5.1 O Problema Técnico do Baseline (páginas 142 a 146\)

No planejamento anterior, a função `cadastrarFrascoAberto` forçava o gestor a informar a tara (`CONHECE_TARA`) ou estimar volume/massa (`ESTIMA_VOLUME`/`ESTIMA_MASSA`) para derivar um `pesoVazio` artificial. Essa imposição causava:

1. Risco de acidentes e contaminação por incentivar o operador a retirar reagentes para pesar recipientes;  
2. Contradição com o modelo 3FN da Seção 4.20, que define `peso_frasco_vazio NUMERIC(10,3) NULL`.

### 5.2 Contrato Oficial de Frasco Aberto no Cadastro

* **Cadastro:** O gestor apenas pesa o frasco bruto como está na balança:  
  * `peso_no_cadastrado = pesoTotalBalanca`  
  * `peso_atual = pesoTotalBalanca`  
  * **`peso_frasco_vazio = NULL`** (estritamente nulo).  
  * `conteudo_nominal = NULL` (saldo inicial líquido de frasco aberto é desconhecido).  
* **Consumo Diferencial Independente de Tara:** $$\\Delta m \= \\max(0, \\text{peso\_saida} \- \\text{peso\_retorno})$$ $$\\text{Volume consumido (líquidos)} \= \\frac{\\Delta m}{\\text{densidade}}$$ O cálculo do consumo em cada empréstimo depende exclusivamente da diferença de leituras brutas da balança, funcionando com precisão analítica sem demandar tara.

### 5.3 Mitigações de Engenharia

1. **Métricas Agregadas Diárias:** As métricas gravimétricas/volumétricas `massa_total_disponivel_g` e `volume_total_disponivel_ml` computam **apenas frascos cuja tara é conhecida** (frascos fechados ou frascos abertos com tara consolidada -- Ou seja, após ficar como Vazio, quando o reagente acaba por conta dos imprestimos). Para frascos abertos com tara `NULL`, o estoque é auditado via **contagem física de unidades (headcount de frascos)**.  
2. **Detecção Manual de Esgotamento na Devolução (`declararEsgotado`):**  
   * A interface de devolução (UI-07) e a Cloud Function `registrarDevolucao` passam a exigir o parâmetro: `declararEsgotado: boolean`.  
   * Se o gestor atestar que o conteúdo terminou (`declararEsgotado === true`):  
     * Se `peso_frasco_vazio === null`: atribui `peso_frasco_vazio = pesoRetorno` (a pesagem do retorno consolida a tara real do recipiente esgotado);  
     * Atualiza `estado_fisico_frasco = 'VAZIO'`;  
     * Atualiza `requer_descarte = true`.  
3. **Bypass da Regra Q06:**  
   if (frasco.peso\_frasco\_vazio \!= null && dados.pesoRetorno \< frasco.peso\_frasco\_vazio) {  
   &nbsp;&nbsp;throw new HttpsError("failed-precondition", "Retorno abaixo da tara cadastrada. Acionar fluxo Q06.");  
   }  
4. **Descarte Prematuro:** Em caso de quebra, vencimento ou quarentena antes do esgotamento, `peso_frasco_vazio` **permanecerá `NULL` permanentemente** no histórico, sem corrupção das tabelas ou dos relatórios de auditoria.

---

## 6\. Desacoplamento da Escassez: Migração para `Especificacao_Reagente`

### 6.1 Diagnóstico da Falha do Baseline

No modelo anterior, `qtd_em_que_e_considerado_escasso` existia exclusivamente em `Resumo_Reagente`.

* **Cenário de Falha:** Um `Resumo_Reagente` (ex: "Ácido Clorídrico") com limiar 4 frascos possui:  
  * 0 frascos de *HCl 37% P.A.* (esgotado);  
  * 5 frascos de *HCl 10% Técnico*;  
  * 1 frasco de *HCl 0,1 mol/L volumétrico*.  
* O sistema contabilizava $0 \+ 5 \+ 1 \= 6 \\ge 4$ frascos e **não emitia alerta**, deixando pesquisas e aulas sem o reagente nobre concentrado. Em química, especificações não são fungíveis entre si.

### 6.2 Correção Estrutural

#### A. Modelo Relacional 3FN (PostgreSQL)

1. **Remover** `qtd_em_que_e_considerado_escasso` da tabela `Resumo_Reagente`.  
2. **Adicionar** na tabela `Especificacao_Reagente`:  
   * `qtd_em_que_e_considerado_escasso`: `INTEGER DEFAULT 1 NOT NULL CHECK (qtd_em_que_e_considerado_escasso >= 0)`

#### B. Mapeamento Firestore (NoSQL)

* No documento `Resumo_Reagente/{resumoId}/Especificacoes/{especId}`:  
  {  
  &nbsp;&nbsp;"descricao": "Ácido Clorídrico 37% P.A.",  
  &nbsp;&nbsp;"grau\_pureza": "P.A.",  
  &nbsp;&nbsp;"qtd\_em\_que\_e\_considerado\_escasso": 3  
  }

#### C. Job Agendado de Escassez (`verificarEscassezReagentes`)

O job deixa de avaliar o agrupador geral e passa a auditar cada especificação ativa dentro de cada almoxarifado:

export const verificarEscassezReagentes \= onSchedule("every day 04:00", async () \=\> {

&nbsp;&nbsp;const hoje \= new Date().toISOString().slice(0, 10);

&nbsp;&nbsp;

&nbsp;&nbsp;const especificacoesSnap \= await admin.firestore().collectionGroup("Especificacoes").get();

&nbsp;&nbsp;const almoxarifadosSnap \= await admin.firestore().collection("Almoxarifado").where("ativo", "==", true).get();

&nbsp;

&nbsp;&nbsp;const writer \= admin.firestore().bulkWriter();

&nbsp;

&nbsp;&nbsp;for (const almoxDoc of almoxarifadosSnap.docs) {

&nbsp;&nbsp;&nbsp;&nbsp;const idAlmox \= almoxDoc.id;

&nbsp;

&nbsp;&nbsp;&nbsp;&nbsp;const vinculosGestores \= await admin.firestore().collection("Gestor\_Almoxarifado\_x\_Almoxarifado")

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.where("id\_almoxarifado", "==", idAlmox)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.get();

&nbsp;&nbsp;&nbsp;&nbsp;const gestoresUids \= vinculosGestores.docs.map(d \=\> d.data().id\_gestor\_almoxarifado);

&nbsp;

&nbsp;&nbsp;&nbsp;&nbsp;if (gestoresUids.length \=== 0\) continue;

&nbsp;

&nbsp;&nbsp;&nbsp;&nbsp;for (const especDoc of especificacoesSnap.docs) {

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const especData \= especDoc.data();

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const limiar \= especData.qtd\_em\_que\_e\_considerado\_escasso ?? 1;

&nbsp;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;// Contagem discriminada por especificação e almoxarifado

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const frascosCount \= await admin.firestore().collection("Frasco\_Reagente")

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.where("id\_especificacao\_reagente", "==", especDoc.id)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.where("id\_almoxarifado", "==", idAlmox)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.where("disponibilidade", "==", "DISPONIVEL")

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.where("estado\_fisico\_frasco", "in", \["FECHADO", "ABERTO"\])

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.where("requer\_descarte", "==", false)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.where("em\_quarentena", "==", false)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.count().get();

&nbsp;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const qtdDisponivel \= frascosCount.data().count;

&nbsp;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;if (qtdDisponivel \< limiar) {

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;for (const uid of gestoresUids) {

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const notifId \= \`escassez\_${especDoc.id}\_${idAlmox}\_${hoje}\_${uid}\`;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;const notifRef \= admin.firestore().collection("Usuarios").doc(uid)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.collection("Notificacoes").doc(notifId);

&nbsp;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;writer.set(notifRef, {

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;id\_destinatario: uid,

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;papel\_destinatario: "Gestor\_Almoxarifado",

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;tipo: "REAGENTE\_ESCASSO",

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;id\_alvo: especDoc.id,

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;entidade\_alvo: "Especificacao\_Reagente",

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;id\_almoxarifado: idAlmox,

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;quantidade: qtdDisponivel,

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;limiar\_configurado: limiar,

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;detalhe: \`${especData.descricao} com estoque crítico no almoxarifado (${qtdDisponivel} restante(s); mínimo: ${limiar}).\`,

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

#### D. Ajustes de Interface

* **UI-05 (Wizard):** Campo de escassez alocado na Etapa 2 (Especificação do Reagente).  
* **UI-07 (Alertas):** Exibição discriminada por especificação e almoxarifado, indicando nome comercial, grau de pureza e concentração.

---

*Documento canônico atualizado do LCQUI / UENF.*

&nbsp;