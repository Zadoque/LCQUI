# Documento de Decisão Técnica e Arquitetural (ADR)

## Sistema LCQUI (UENF) — Módulo de Impressão de Etiquetas e Ciclo de Vida de Frascos

---

### 1\. Contexto e Motivação Operacional

O **LCQUI (Laboratório de Ciências Químicas da UENF)** atende turmas de graduação, iniciação científica e pós-graduação. No cotidiano de bancada, a identificação física dos reagentes precisa conciliar rigor analítico, segurança química e limitações materiais reais de uma instituição pública:

1. **Mídia Física e Fixação:** Para minimizar custos operacionais, o laboratório utiliza **papel sulfite A4 comum (75 g/m²)** em vez de papel adesivo troquelado importado.  
2. **Plastificação Química Caseira (Método Durex):** Cada etiqueta recortada é envolvida por fita adesiva transparente larga (45 mm ou 50 mm). Essa fita protege o papel e a tinta contra respingos de solventes orgânicos, vapores de ácidos e umidade de geladeira/freezer.  
3. **Desacoplamento entre Etiquetagem e Cadastro:** A rotina do laboratório exige a capacidade de imprimir folhas de etiquetas virgens com antecedência (para ter à mão na gaveta) ou reimprimir etiquetas deterioradas de frascos já catalogados.

---

### 2\. Decisões de Arquitetura e Engenharia de Software

#### 2.1 Desacoplamento Total entre Mídia Física e Estado de Estoque

* **Premissa:** A impressão de etiquetas é uma **operação física de apoio**, utilitária e idempotente.  
* **Decisão:** A impressão de etiquetas virgens **não gera documentos em `Frasco_Reagente` e não avança o contador oficial de frascos cadastrados**. Caso uma folha impressa seja molhada, perdida ou amassada, nenhum identificador do sistema é queimado.  
* **Fonte Única da Verdade:** O código oficial `LCQUI-N` é gerado e consumido **exclusivamente no momento da persistência transacional do frasco no banco de dados**.

#### 2.2 Eliminação do Realtime Database (RTDB) e Adoção do Firestore Puro

* **Decisão (Princípio KISS):** A arquitetura híbrida anterior (Firestore \+ RTDB) foi descontinuada para evitar partições desnecessárias de infraestrutura, duplicidade de SDKs e regras de segurança.  
* **Mecanismo Singleton:** O sequenciamento atômico estrito (`LCQUI-1`, `LCQUI-2`...) é realizado via transação no Firestore (`runTransaction`) sobre o documento singleton `Contadores/codigo_frasco`.  
* **Throughput:** O limite do Firestore de 1 escrita por segundo por documento é mais do que suficiente para o processo manual de bancada (pesagem, identificação química e conferência levam entre 30 segundos e 2 minutos por frasco).  
* **Consumo de Cotas:** Cada cadastro consome exatamente **1 leitura e 2 escritas**. Mesmo um inventário de 1.500 frascos em um único dia consome apenas \~4.500 escritas e \~4.000 leituras, utilizando menos de **25% da cota gratuita diária** do plano Firebase Spark.

#### 2.3 Relação 1:1 Estrita na Reimpressão de Frascos Cadastrados

* **Decisão de Segurança Química:** Cada folha de reimpressão contém **1 única etiqueta centralizada** no rodapé (e não duas).  
* **Justificativa:** Ter duas etiquetas com o mesmo código `LCQUI-XX` em circulação na bancada cria o risco crítico de "clonagem acidental" — outro operador pode colar a etiqueta excedente em um frasco sem identificação, corrompendo a pesagem e gerando risco grave de acidentes com reagentes trocados.  
* **Limite Rígido:** A impressão de 2ª via é limitada a **no máximo 10 frascos por sessão**, forçando o gestor a conferir cada unidade individualmente.

---

### 3\. Mapeamento de Alterações na Documentação Técnica (`main.pdf`)

#### 📄 Seção 4 — Modelagem Entidades SQL (3FN)

* **Subseção 4.13 (`Impressao_Etiqueta_Frasco`):**  
  * Remover o bloco *"Arquitetura Híbrida: Realtime Database como Microserviço de Sequenciamento"*.  
  * Definir que `Impressao_Etiqueta_Frasco` audita unicamente as sessões de geração de lotes virgens contínuos (`codigo_inicial` e `codigo_final`), sem vínculo de chave estrangeira com `Frasco_Reagente`.  
* **Subseção 4.41 (`Registro_de_Auditoria`):**  
  * Incluir a regra de que a reimpressão de frascos já cadastrados (avulsos) não usa a tabela `Impressao_Etiqueta_Frasco`. É auditada diretamente em `Registro_de_Auditoria` com `tipo_entidade_sofre_acao = 'FRASCO_REAGENTE'` e `acao = 'REIMPRESSAO_ETIQUETA'`.

#### 📄 Seção 5 — Notas de Mapeamento para Firestore

* **Nova Subseção 5.9: *Mecanismo de Sequenciamento Atômico via Documento Singleton (`Contadores`)*:**  
  * Explicar que a coleção `Contadores` não existe no modelo 3FN porque bancos relacionais possuem primitivas de `SEQUENCE`/`SERIAL`.  
  * Detalhar o documento `Contadores/codigo_frasco` com campo `{ valor_atual: number }`, operado atomicamente via `runTransaction`.  
* **Tabela 5.7 (Mapeamento de Coleções):**  
  * Atualizar a linha `Contador_Codigo_Frasco` para `Coleção raiz Contadores (DocId: codigo_frasco)`.  
  * Atualizar `Impressao_Etiqueta_Frasco` para contemplar o campo `tipo: "REIMPRESSAO_AVULSA"` e array `frascos_impressos: string[]` em cenários NoSQL.  
* **Nova Subseção 5.10: *Índices Compostos Obrigatórios*:**  
  * Declarar a obrigatoriedade de dois índices no Firestore:  
    1. `Historico_Frasco_Reagente`: `id_frasco_reagente (ASC)` \+ `timestamp (DESC)`.  
    2. `Emprestimo_Reagente`: `id_frasco_reagente (ASC)` \+ `data_retirada (DESC)`.

#### 📄 Seção 7 — Requisitos e Regras de Negócio

* **Regra 7.2.9 (Código do Frasco de Reagente):**  
  * O código `LCQUI-N` é gerado exclusivamente no momento do cadastro do frasco via transação. A impressão de etiquetas virgens prévias fornece identificadores sugeridos, mas não cria frascos no sistema.  
* **Nova Regra 7.2.21 (Segurança na Reimpressão de Cadastrados):**  
  * Teto máximo de 10 frascos por sessão.  
  * O documento gerado deve conter a Ficha de Conferência e Rastreabilidade completa (último peso gravimétrico, tomador do último empréstimo e histórico de 10 eventos) e 1 única etiqueta de reposição com nome impresso.

#### 📄 Seção 8 — Descrição das Telas (Dashboards)

* **Subseção 8.5 (Dashboard \- Gestor de Almoxarifado):**  
  * Modal "Imprimir Etiquetas" bifurcado em:  
    * **Aba 1 (Novos Frascos / Virgens):** Opções de range (a partir do último cadastrado, após última impressão ou personalizado) e Grid Visual de Offset 3×10 para escolha da célula inicial.  
    * **Aba 2 (Frascos Cadastrados / 2ª Via):** Busca por reagente/código, seleção de até 10 frascos e geração da Ficha de Conferência.  
  * Modal "Adicionar Frasco" (Sucesso):  
    * Exibe feedback: *"Frasco cadastrado sob o código LCQUI-XX (Reagente: YY, Data: DD/MM/AAAA). Localize a etiqueta física correspondente na folha de bancada, preencha os dados à caneta e aplique no frasco com fita adesiva."*

#### 📄 Seção 10 — Tecnologia e Backend

* **Subseção 10.1 (Relatórios e PDFs):**  
  * Documentar a biblioteca `bwip-js` para geração de código de barras Code 128 em buffer nativo em memória.  
  * Especificar o padrão da folha A4: 3 colunas × 10 linhas, etiquetas de 65,0 mm × 26,5 mm, margens laterais de 7,5 mm e `gapX = gapY = 0` com linhas de corte cinza contínuas.  
* **Subseção 10.2.1 (Backend):**  
  * Substituir a rotina baseada em RTDB pela transação Firestore em `Contadores/codigo_frasco`.

#### 📄 Seção 11 — Regras de Segurança (Firestore Rules)

* Adicionar a regra:  
    
  match /Contadores/{documento} {  
    
    allow read: if request.auth \!= null;  
    
    allow write: if false; // Exclusivo de Cloud Functions via Admin SDK  
    
  }

---

### 4\. Módulos de Código Implementados

#### 4.1 Módulo: `gerar_pdf.js` (Etiquetas Virgens para Novos Frascos)

const PDFDocument \= require("pdfkit");

const bwipjs \= require("bwip-js");

const mmToPt \= (mm) \=\> mm \* 2.83465;

const GRID\_A4\_VIRGEM \= {

  cols: 3,

  rows: 10,

  labelWidth: mmToPt(65.0),   // 3 x 65mm \= 195mm

  labelHeight: mmToPt(26.5),  // 10 x 26.5mm \= 265mm

  marginLeft: mmToPt(7.5),    // 210mm \- 195mm \= 15mm (7.5mm em cada lado)

  marginTop: mmToPt(16.0),    // 297mm \- 265mm \= 32mm (16.0mm topo e base)

  gapX: 0,                    // Linha contínua de corte

  gapY: 0,

};

async function gerarBufferBarcode(texto) {

  return await bwipjs.toBuffer({

    bcid: "code128",

    text: texto,

    scale: 2,

    height: 8.0,

    includetext: false,

    textxalign: "center",

  });

}

async function gerarPdfEtiquetasNovosFrascos(frascos, startRow \= 1, startCol \= 1\) {

  return new Promise(async (resolve, reject) \=\> {

    try {

      const doc \= new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });

      const buffers \= \[\];

      doc.on("data", (chunk) \=\> buffers.push(chunk));

      doc.on("end", () \=\> resolve(Buffer.concat(buffers)));

      let slotAtual \= (startRow \- 1\) \* GRID\_A4\_VIRGEM.cols \+ (startCol \- 1);

      for (const item of frascos) {

        const codigo \= typeof item \=== "string" ? item : item.codigo;

        if (slotAtual \>= GRID\_A4\_VIRGEM.cols \* GRID\_A4\_VIRGEM.rows) {

          doc.addPage({ size: "A4", margin: 0 });

          slotAtual \= 0;

        }

        const r \= Math.floor(slotAtual / GRID\_A4\_VIRGEM.cols);

        const c \= slotAtual % GRID\_A4\_VIRGEM.cols;

        const x \= GRID\_A4\_VIRGEM.marginLeft \+ c \* GRID\_A4\_VIRGEM.labelWidth;

        const y \= GRID\_A4\_VIRGEM.marginTop \+ r \* GRID\_A4\_VIRGEM.labelHeight;

        // Borda guia de corte

        doc.rect(x, y, GRID\_A4\_VIRGEM.labelWidth, GRID\_A4\_VIRGEM.labelHeight)

          .lineWidth(0.4).strokeColor("\#D5D5D5").stroke();

        const paddingX \= mmToPt(2.5);

        const paddingY \= mmToPt(2.0);

        const printableWidth \= GRID\_A4\_VIRGEM.labelWidth \- paddingX \* 2;

        // Linha 1: Código e Data de Cadastro manual

        doc.font("Helvetica-Bold").fontSize(9.5).fillColor("\#000000");

        doc.text(codigo, x \+ paddingX, y \+ paddingY, {

          width: printableWidth \* 0.50,

          align: "left",

          lineBreak: false,

        });

        const larguraData \= mmToPt(24);

        const xData \= x \+ GRID\_A4\_VIRGEM.labelWidth \- paddingX \- larguraData;

        doc.font("Helvetica").fontSize(6.5).fillColor("\#444444");

        doc.text("Cad: \_\_\_/\_\_\_/\_\_\_", xData, y \+ paddingY \+ 1.8, {

          width: larguraData,

          align: "right",

          lineBreak: false,

        });

        // Linha 2: Reagente e linha de escrita manual

        const yReagente \= y \+ paddingY \+ 12;

        doc.font("Helvetica-Bold").fontSize(7.0).fillColor("\#333333");

        doc.text("Reagente:", x \+ paddingX, yReagente, { lineBreak: false });

        const xInicioLinha \= x \+ paddingX \+ mmToPt(14);

        const xFimLinha \= x \+ GRID\_A4\_VIRGEM.labelWidth \- paddingX;

        doc.moveTo(xInicioLinha, yReagente \+ 7.5)

          .lineTo(xFimLinha, yReagente \+ 7.5)

          .lineWidth(0.5).strokeColor("\#AAAAAA").stroke();

        // Linha 3: Código de Barras Code 128

        const barcodeBuffer \= await gerarBufferBarcode(codigo);

        const barcodeWidth \= mmToPt(42);

        const barcodeHeight \= mmToPt(7.5);

        const barcodeX \= x \+ (GRID\_A4\_VIRGEM.labelWidth \- barcodeWidth) / 2;

        const barcodeY \= y \+ GRID\_A4\_VIRGEM.labelHeight \- barcodeHeight \- paddingY;

        doc.image(barcodeBuffer, barcodeX, barcodeY, { width: barcodeWidth, height: barcodeHeight });

        slotAtual++;

      }

      doc.end();

    } catch (err) {

      reject(err);

    }

  });

}

module.exports \= { gerarPdfEtiquetasNovosFrascos };

---

#### 4.2 Módulo: `gerar_pdf_cadastrados.js` (Ficha de Conferência \+ 1 Etiqueta)

const PDFDocument \= require("pdfkit");

const bwipjs \= require("bwip-js");

const mmToPt \= (mm) \=\> mm \* 2.83465;

async function gerarBufferBarcode(texto) {

  return await bwipjs.toBuffer({

    bcid: "code128",

    text: texto,

    scale: 2,

    height: 8.0,

    includetext: false,

    textxalign: "center",

  });

}

async function desenharEtiquetaReposicao(doc, x, y, frasco) {

  const labelWidth \= mmToPt(65.0);

  const labelHeight \= mmToPt(26.5);

  const paddingX \= mmToPt(2.5);

  const paddingY \= mmToPt(2.0);

  const printableWidth \= labelWidth \- paddingX \* 2;

  doc.rect(x, y, labelWidth, labelHeight).lineWidth(0.5).strokeColor("\#B0B0B0").stroke();

  doc.font("Helvetica-Bold").fontSize(9.5).fillColor("\#000000");

  doc.text(frasco.codigo\_frasco, x \+ paddingX, y \+ paddingY, {

    width: printableWidth \* 0.55,

    align: "left",

    lineBreak: false,

  });

  doc.font("Helvetica").fontSize(6.5).fillColor("\#555555");

  const dataFormatada \= frasco.cadastrado\_em || "\_\_/\_\_/\_\_\_\_";

  doc.text(\`Cad: ${dataFormatada}\`, x \+ paddingX \+ printableWidth \* 0.55, y \+ paddingY \+ 1.8, {

    width: printableWidth \* 0.45,

    align: "right",

    lineBreak: false,

  });

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("\#111111");

  doc.text(frasco.nome\_reagente, x \+ paddingX, y \+ paddingY \+ 12, {

    width: printableWidth,

    align: "center",

    lineBreak: false,

    ellipsis: true,

  });

  const barcodeBuffer \= await gerarBufferBarcode(frasco.codigo\_frasco);

  const barcodeWidth \= mmToPt(42);

  const barcodeHeight \= mmToPt(7.5);

  const barcodeX \= x \+ (labelWidth \- barcodeWidth) / 2;

  const barcodeY \= y \+ labelHeight \- barcodeHeight \- paddingY;

  doc.image(barcodeBuffer, barcodeX, barcodeY, { width: barcodeWidth, height: barcodeHeight });

}

async function gerarPdfFrascosCadastrados(frascos) {

  return new Promise(async (resolve, reject) \=\> {

    try {

      if (\!Array.isArray(frascos) || frascos.length \=== 0\) {

        throw new Error("Nenhum frasco fornecido para geração do relatório.");

      }

      if (frascos.length \> 10\) {

        throw new Error("O limite máximo para reimpressão de frascos cadastrados é de 10 frascos por vez.");

      }

      const doc \= new PDFDocument({ size: "A4", margin: 36, autoFirstPage: false });

      const buffers \= \[\];

      doc.on("data", (chunk) \=\> buffers.push(chunk));

      doc.on("end", () \=\> resolve(Buffer.concat(buffers)));

      for (let i \= 0; i \< frascos.length; i++) {

        const frasco \= frascos\[i\];

        doc.addPage({ size: "A4", margin: 36 });

        const margin \= 36;

        const pageWidth \= doc.page.width;

        const contentWidth \= pageWidth \- margin \* 2;

        let y \= margin;

        // 1\. Cabeçalho

        doc.font("Helvetica-Bold").fontSize(10).fillColor("\#1A365D");

        doc.text("UENF \- UNIVERSIDADE ESTADUAL DO NORTE FLUMINENSE DARCY RIBEIRO", margin, y, { align: "center" });

        y \+= 13;

        doc.font("Helvetica").fontSize(8.5).fillColor("\#4A5568");

        doc.text("CCT | LCQUI \- Laboratório de Ciências Químicas \- Almoxarifado", margin, y, { align: "center" });

        y \+= 14;

        doc.rect(margin, y, contentWidth, 22).fillAndStroke("\#EBF8FF", "\#BEE3F8");

        doc.font("Helvetica-Bold").fontSize(11).fillColor("\#2B6CB0");

        doc.text(\`FICHA DE CONFERÊNCIA E REPOSIÇÃO \- FRASCO: ${frasco.codigo\_frasco}\`, margin, y \+ 6, {

          align: "center",

          width: contentWidth,

        });

        y \+= 30;

        // 2\. Identificação

        doc.rect(margin, y, contentWidth, 58).lineWidth(0.5).strokeColor("\#CBD5E0").stroke();

        doc.font("Helvetica-Bold").fontSize(8).fillColor("\#2D3748").text("DADOS CADASTRAIS DO ITEM", margin \+ 8, y \+ 6);

        const col1X \= margin \+ 8;

        const col2X \= margin \+ contentWidth \* 0.52;

        doc.font("Helvetica-Bold").fontSize(8).fillColor("\#4A5568");

        doc.text("Reagente: ", col1X, y \+ 20, { continued: true }).font("Helvetica").fillColor("\#1A202C").text(frasco.nome\_reagente);

        doc.font("Helvetica-Bold").fillColor("\#4A5568");

        doc.text("Especificação: ", col1X, y \+ 32, { continued: true }).font("Helvetica").fillColor("\#1A202C").text(frasco.especificacao || "Padrão");

        doc.font("Helvetica-Bold").fillColor("\#4A5568");

        doc.text("Localização: ", col1X, y \+ 44, { continued: true }).font("Helvetica").fillColor("\#1A202C").text(frasco.localizacao || "Não informada");

        doc.font("Helvetica-Bold").fillColor("\#4A5568");

        doc.text("Lote: ", col2X, y \+ 20, { continued: true }).font("Helvetica").fillColor("\#1A202C").text(frasco.numero\_lote || "Sem Lote Vinculado");

        doc.font("Helvetica-Bold").fillColor("\#4A5568");

        doc.text("Validade Efetiva: ", col2X, y \+ 32, { continued: true }).font("Helvetica").fillColor("\#1A202C").text(frasco.validade\_efetiva || "Indeterminada");

        doc.font("Helvetica-Bold").fillColor("\#4A5568");

        doc.text("Status Atual: ", col2X, y \+ 44, { continued: true }).font("Helvetica").fillColor(frasco.status \=== "DISPONIVEL" ? "\#22543D" : "\#742A2A").text(frasco.status || "DISPONIVEL");

        y \+= 66;

        // 3\. Gravimetria e Empréstimo

        const boxWidth \= (contentWidth \- 10\) / 2;

        doc.rect(margin, y, boxWidth, 54).lineWidth(0.5).strokeColor("\#CBD5E0").stroke();

        doc.font("Helvetica-Bold").fontSize(8).fillColor("\#2D3748").text("CONTROLE GRAVIMÉTRICO (BALANÇA)", margin \+ 6, y \+ 6);

        doc.font("Helvetica-Bold").fontSize(8).fillColor("\#4A5568");

        doc.text("Último Peso Medido: ", margin \+ 6, y \+ 20, { continued: true }).font("Helvetica-Bold").fillColor("\#2B6CB0").text(\`${frasco.peso\_atual} g\`);

        doc.font("Helvetica-Bold").fillColor("\#4A5568");

        doc.text("Peso Frasco Vazio (Tara): ", margin \+ 6, y \+ 32, { continued: true }).font("Helvetica").fillColor("\#1A202C").text(frasco.peso\_frasco\_vazio ? \`${frasco.peso\_frasco\_vazio} g\` : "Não registrado");

        doc.font("Helvetica-Bold").fillColor("\#4A5568");

        doc.text("Conteúdo Declarado: ", margin \+ 6, y \+ 44, { continued: true }).font("Helvetica").fillColor("\#1A202C").text(\`${frasco.conteudo\_nominal} ${frasco.unidade\_medida || "mL"}\`);

        doc.rect(margin \+ boxWidth \+ 10, y, boxWidth, 54).lineWidth(0.5).strokeColor("\#CBD5E0").stroke();

        doc.font("Helvetica-Bold").fontSize(8).fillColor("\#2D3748").text("ÚLTIMO EMPRÉSTIMO REGISTRADO", margin \+ boxWidth \+ 16, y \+ 6);

        if (frasco.ultimo\_emprestimo) {

          doc.font("Helvetica-Bold").fontSize(7.5).fillColor("\#4A5568");

          doc.text("Tomador: ", margin \+ boxWidth \+ 16, y \+ 20, { continued: true }).font("Helvetica").fillColor("\#1A202C").text(frasco.ultimo\_emprestimo.usuario);

          doc.font("Helvetica-Bold").fillColor("\#4A5568");

          doc.text("Retirado em: ", margin \+ boxWidth \+ 16, y \+ 32, { continued: true }).font("Helvetica").fillColor("\#1A202C").text(frasco.ultimo\_emprestimo.data\_retirada);

          doc.font("Helvetica-Bold").fillColor("\#4A5568");

          doc.text("Situação: ", margin \+ boxWidth \+ 16, y \+ 44, { continued: true }).font("Helvetica-Bold").fillColor("\#C53030").text(frasco.ultimo\_emprestimo.status);

        } else {

          doc.font("Helvetica-Oblique").fontSize(8).fillColor("\#718096").text("Nenhum histórico de empréstimo anterior.", margin \+ boxWidth \+ 16, y \+ 25);

        }

        y \+= 62;

        // 4\. Histórico Top 10

        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("\#1A202C").text("HISTÓRICO RECENTE DO FRASCO (ÚLTIMAS 10 MOVIMENTAÇÕES)", margin, y);

        y \+= 12;

        const tableTop \= y;

        const rowHeight \= 15;

        const cData \= { width: 90, align: "left" };

        const cEvento \= { width: 110, align: "left" };

        const cGestor \= { width: 120, align: "left" };

        const cPesoAnt \= { width: 65, align: "right" };

        const cPesoNovo \= { width: 65, align: "right" };

        const cAjuste \= { width: 73, align: "right" };

        doc.rect(margin, tableTop, contentWidth, rowHeight).fill("\#EDF2F7");

        let hX \= margin \+ 4;

        doc.font("Helvetica-Bold").fontSize(7).fillColor("\#2D3748");

        doc.text("Data / Hora", hX, tableTop \+ 4, { width: cData.width \- 6, align: cData.align }); hX \+= cData.width;

        doc.text("Evento", hX, tableTop \+ 4, { width: cEvento.width \- 6, align: cEvento.align }); hX \+= cEvento.width;

        doc.text("Gestor", hX, tableTop \+ 4, { width: cGestor.width \- 6, align: cGestor.align }); hX \+= cGestor.width;

        doc.text("Peso Ant.", hX, tableTop \+ 4, { width: cPesoAnt.width \- 6, align: cPesoAnt.align }); hX \+= cPesoAnt.width;

        doc.text("Peso Novo", hX, tableTop \+ 4, { width: cPesoNovo.width \- 6, align: cPesoNovo.align }); hX \+= cPesoNovo.width;

        doc.text("Ajuste / Consumo", hX, tableTop \+ 4, { width: cAjuste.width \- 6, align: cAjuste.align });

        y \+= rowHeight;

        const eventos \= frasco.historico && frasco.historico.length \> 0 ? frasco.historico.slice(0, 10\) : \[\];

        if (eventos.length \=== 0\) {

          doc.rect(margin, y, contentWidth, 20).lineWidth(0.5).strokeColor("\#E2E8F0").stroke();

          doc.font("Helvetica-Oblique").fontSize(7.5).fillColor("\#718096").text("Nenhuma movimentação registrada no histórico.", margin, y \+ 6, { align: "center", width: contentWidth });

          y \+= 24;

        } else {

          eventos.forEach((ev, idx) \=\> {

            const bg \= idx % 2 \=== 0 ? "\#FFFFFF" : "\#F7FAFC";

            doc.rect(margin, y, contentWidth, rowHeight).fill(bg);

            let rowX \= margin \+ 4;

            doc.font("Helvetica").fontSize(6.8).fillColor("\#1A202C");

            doc.text(ev.timestamp || "-", rowX, y \+ 4, { width: cData.width \- 6, align: cData.align }); rowX \+= cData.width;

            doc.font("Helvetica-Bold").fillColor(ev.tipo \=== "SAIU" ? "\#C53030" : ev.tipo \=== "ENTROU" ? "\#22543D" : "\#2D3748");

            doc.text(ev.tipo || "-", rowX, y \+ 4, { width: cEvento.width \- 6, align: cEvento.align }); rowX \+= cEvento.width;

            doc.font("Helvetica").fillColor("\#1A202C");

            doc.text(ev.gestor || "Sistema", rowX, y \+ 4, { width: cGestor.width \- 6, align: cGestor.align, ellipsis: true }); rowX \+= cGestor.width;

            doc.text(ev.peso\_anterior \!= null ? \`${ev.peso\_anterior}g\` : "-", rowX, y \+ 4, { width: cPesoAnt.width \- 6, align: cPesoAnt.align }); rowX \+= cPesoAnt.width;

            doc.text(ev.peso\_novo \!= null ? \`${ev.peso\_novo}g\` : "-", rowX, y \+ 4, { width: cPesoNovo.width \- 6, align: cPesoNovo.align }); rowX \+= cPesoNovo.width;

            const consumoTexto \= ev.medida\_ajustada \!= null ? \`${ev.medida\_ajustada} ${ev.unidade || "mL"}\` : "-";

            doc.font("Helvetica-Bold").text(consumoTexto, rowX, y \+ 4, { width: cAjuste.width \- 6, align: cAjuste.align });

            y \+= rowHeight;

          });

        }

        // 5\. Divisória e 1 Única Etiqueta Centralizada (Relação 1:1 Estrita)

        const bottomSectionY \= doc.page.height \- margin \- mmToPt(38);

        doc.save();

        doc.dash(3, { space: 3 });

        doc.moveTo(margin, bottomSectionY \- 14).lineTo(pageWidth \- margin, bottomSectionY \- 14).strokeColor("\#718096").stroke();

        doc.restore();

        doc.font("Helvetica-Bold").fontSize(7.5).fillColor("\#718096");

        doc.text("✂  RECORTE A ETIQUETA DE REPOSIÇÃO ABAIXO E FIXE COM FITA ADESIVA TRANSPARENTE (DUREX)  ✂", margin, bottomSectionY \- 10, {

          align: "center",

          width: contentWidth,

        });

        // 1 única etiqueta centralizada

        const etiquetaW \= mmToPt(65.0);

        const xCentralizado \= margin \+ (contentWidth \- etiquetaW) / 2;

        await desenharEtiquetaReposicao(doc, xCentralizado, bottomSectionY \+ 4, frasco);

      }

      doc.end();

    } catch (err) {

      reject(err);

    }

  });

}

module.exports \= { gerarPdfFrascosCadastrados };

---

### 5\. Resumo das Baterias de Teste Executadas

#### Testes de Etiquetas Virgens (`index.js` — 10 Casos)

* **Caso 1 (Coluna 3):** Validação de margem de 7,5 mm; o campo `Cad: ___/___/___` não sofreu corte na borda direita.  
* **Casos 2 e 3:** Teste de 1 frasco isolado e tira de 6 frascos no topo.  
* **Caso 4:** Teste de offset visual (iniciando em Linha 4, Coluna 2); primeiras posições preservadas em branco para reaproveitamento de folha.  
* **Caso 5:** Teste de estresse com códigos longos (`LCQUI-100005`); densidade do Code 128 comportou-se perfeitamente.  
* **Caso 7:** Offset na última célula da página 1 (Linha 10, Coluna 3); transbordo correto para o topo da página 2\.  
* **Caso 8:** Folha cheia (30 itens); gerou rigorosamente 1 página A4 sem criar página em branco extra.  
* **Caso 9:** Lote de 36 itens; distribuiu exatamente 30 itens na página 1 e 6 itens na página 2\.

#### Testes de Frascos Cadastrados (`testar_cadastrados.js` — 4 Casos)

* **Caso 1:** Frasco com histórico cheio de 10 movimentações e empréstimo ativo; tabela e etiqueta renderizadas em 1 página sem sobreposição.  
* **Caso 2:** Frasco recém-adicionado sem histórico e sem lote; tratamento gracioso de valores ausentes.  
* **Caso 3:** Multipage de 3 frascos cadastrados; gerou exatamente 3 páginas com fichas e etiquetas individuais.  
* **Caso 4:** Barreira de segurança com 11 frascos; barrou a execução com a mensagem esperada: *"O limite máximo para reimpressão de frascos cadastrados é de 10 frascos por vez."*

