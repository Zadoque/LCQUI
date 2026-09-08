import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import PDFDocument from "pdfkit-table";
import { validarPermissao, validarGestorDoAlmoxarifado } from "./auth";
import { addHeader } from "./relatorios/pdfHeader";
import { addFooterAndHash } from "./relatorios/pdfFooter";
import { chunkArray } from "./utils/chunk";
import { FONTS } from "./relatorios/pdfStyles";
import * as bwipjs from "bwip-js";
async function buildPdfBuffer(doc: any, builderCallback: (doc: any) => Promise<void> | void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    doc.on('error', reject);
    
    try {
      const result = builderCallback(doc);
      if (result instanceof Promise) {
        result.then(() => doc.end()).catch((err: any) => reject(err));
      } else {
        doc.end();
      }
    } catch (e) {
      reject(e);
    }
  });
}

// -------------------------------------------------------------
// RELATÓRIOS ALMOXARIFADO
// -------------------------------------------------------------
interface FiltrosAlmoxarifado {
  idAlmoxarifado: string;
  mes: number;
  ano: number;
}

export const gerarRelatorioAlmoxarifado = onCall(async (request) => {
  const { idAlmoxarifado, mes, ano } = request.data as FiltrosAlmoxarifado;
  
  const hoje = new Date();
  if (ano > hoje.getFullYear()) {
    throw new Error("O ano do relatório não pode ser no futuro.");
  }
  if (ano === hoje.getFullYear() && mes > hoje.getMonth() + 1) {
    throw new Error("O mês do relatório não pode ser no futuro.");
  }

  validarPermissao(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
  await validarGestorDoAlmoxarifado(request.auth!.uid, request.auth!.token, idAlmoxarifado);

  // 1. Obter metadados do almoxarifado
  const almoxSnap = await admin.firestore().collection("Almoxarifado").doc(idAlmoxarifado).get();
  const almox = almoxSnap.data();
  const nomeAlmox = almox ? `${almox.nome_almoxarifado} (Prédio ${almox.predio}, Sala ${almox.sala})` : `Almoxarifado ID: ${idAlmoxarifado}`;

  const dataInicio = new Date(ano, mes - 1, 1);
  const dataFim = new Date(ano, mes, 0);
  dataFim.setHours(23, 59, 59, 999);

  // 2. Buscar dados operacionais
  const db = admin.firestore();
  
  const [devolucoesSnap, historicoSnap] = await Promise.all([
    db.collection("Emprestimo_Reagente")
      .where("id_almoxarifado", "==", idAlmoxarifado)
      .where("data_devolucao_efetuada", ">=", dataInicio)
      .where("data_devolucao_efetuada", "<=", dataFim)
      .get(),
      
    db.collection("Historico_Frasco_Reagente")
      .where("id_almoxarifado", "==", idAlmoxarifado)
      .where("timestamp", ">=", dataInicio)
      .where("timestamp", "<=", dataFim)
      .orderBy("timestamp", "asc")
      .get()
  ]);

  const devolucoes = devolucoesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const historicos = historicoSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

  // 3. Resolução de Entidades Otimizada (Prevenção de N+1)
  const frascoIds = new Set<string>();
  devolucoes.forEach(d => { if (d.id_frasco_reagente) frascoIds.add(d.id_frasco_reagente); });
  historicos.forEach(h => { if (h.id_frasco_reagente) frascoIds.add(h.id_frasco_reagente); });

  const frascosMap = new Map<string, any>();
  if (frascoIds.size > 0) {
    const frascoRefs = Array.from(frascoIds).map(id => db.collection("Frasco_Reagente").doc(id));
    const frascoChunks = chunkArray(frascoRefs, 200);
    const frascoSnapsNested = await Promise.all(frascoChunks.map(chunk => db.getAll(...chunk)));
    const frascoSnaps = frascoSnapsNested.flat();
    frascoSnaps.forEach(snap => { if (snap.exists) frascosMap.set(snap.id, snap.data()); });
  }

  const especIds = new Set<string>();
  frascosMap.forEach(f => {
    // Se o frasco tem id_lote, a especificação deveria vir do lote.
    // Para simplificar, assumimos que o frasco denormaliza id_especificacao_reagente
    if (f.id_especificacao_reagente) especIds.add(f.id_especificacao_reagente);
  });

  const especMap = new Map<string, any>();
  if (especIds.size > 0) {
    const especRefs = Array.from(especIds).map(id => db.collection("Especificacao_Reagente").doc(id));
    const especChunks = chunkArray(especRefs, 200);
    const especSnapsNested = await Promise.all(especChunks.map(chunk => db.getAll(...chunk)));
    const especSnaps = especSnapsNested.flat();
    especSnaps.forEach(snap => { if (snap.exists) especMap.set(snap.id, snap.data()); });
  }

  // 4. Agregar Totais
  let consumoMassaG = 0;
  let consumoVolumeMl = 0;

  devolucoes.forEach(d => {
    if (d.unidade_medida_utilizada === "g") consumoMassaG += (d.medida_utilizada || 0);
    else if (d.unidade_medida_utilizada === "ml") consumoVolumeMl += (d.medida_utilizada || 0);
    else if (d.unidade_medida_utilizada === "L") consumoVolumeMl += ((d.medida_utilizada || 0) * 1000);
  });

  const ocorrenciasCriticas = historicos.filter(h => 
    ["QUEBROU", "FOI_DESCARTADO", "ENTROU_EM_QUARENTENA", "VENCEU"].includes(h.tipo)
  );

  const movimentacoesControladas: any[] = [];
  historicos.forEach(h => {
    const frasco = frascosMap.get(h.id_frasco_reagente);
    if (frasco && frasco.id_especificacao_reagente) {
      const espec = especMap.get(frasco.id_especificacao_reagente);
      if (espec && (espec.eh_controlado_pf || espec.eh_controlado_eb)) {
        movimentacoesControladas.push({ h, frasco, espec });
      }
    }
  });

  // 5. Hash Canônico
  const canonicalString = [
    idAlmoxarifado,
    mes,
    ano,
    consumoMassaG.toFixed(3),
    consumoVolumeMl.toFixed(3),
    Array.from(frascoIds).sort().join(","),
    Date.now().toString()
  ].join("|");

  // 6. Gerar PDF
  const doc = new PDFDocument({ bufferPages: true, margin: 30, size: "A4" });
  
  const buffer = await buildPdfBuffer(doc, async (doc) => {
    addHeader(doc, "Relatório Mensal de Movimentação e Estoque", `${nomeAlmox}\nPeríodo de Referência: 01/${mes.toString().padStart(2, '0')}/${ano} a ${dataFim.getDate()}/${mes.toString().padStart(2, '0')}/${ano}`);

    // Quadro Resumo
    doc.font(FONTS.bold).fontSize(12).text("1. QUADRO RESUMO DE BALANÇO DE MASSA E VOLUME");
    doc.font(FONTS.regular).fontSize(10);
    doc.text(`Consumo Sólidos no Período (Massa): ${consumoMassaG.toFixed(3)} g`);
    doc.text(`Consumo Líquidos no Período (Volume): ${consumoVolumeMl.toFixed(3)} ml`);
    doc.moveDown();

    // Histórico Operacional
    doc.font(FONTS.bold).fontSize(12).text("2. REGISTRO DE MOVIMENTAÇÕES NO PERÍODO");
    doc.font(FONTS.regular).fontSize(10).moveDown(0.5);
    
    if (historicos.length > 0) {
      const tableArray = {
        headers: ["Data", "Código", "Ação", "Gestor", "Variação/Ajuste"],
        rows: historicos.map(h => {
          const frasco = frascosMap.get(h.id_frasco_reagente);
          const codigo = frasco ? frasco.codigo_frasco : "Desconhecido";
          const dataStr = h.timestamp.toDate().toLocaleDateString("pt-BR");
          const val = h.medida_ajustada != null ? `${h.medida_ajustada} ${h.unidade_medida_ajustada}` : "-";
          return [dataStr, codigo, h.tipo, h.id_gestor, val];
        }),
      };
      await doc.table(tableArray, { width: 535 });
    } else {
      doc.text("Nenhuma movimentação registrada no período.");
    }
    doc.moveDown();

    // Substâncias Controladas
    doc.font(FONTS.bold).fontSize(12).text("3. SESSÃO DE REAGENTES CONTROLADOS (POLÍCIA FEDERAL / EXÉRCITO)");
    doc.font(FONTS.regular).fontSize(10).moveDown(0.5);
    
    if (movimentacoesControladas.length > 0) {
      const tableArray = {
        headers: ["Data", "Reagente", "Especificação", "Ação", "Orgão"],
        rows: movimentacoesControladas.map(m => {
          const dataStr = m.h.timestamp.toDate().toLocaleDateString("pt-BR");
          const orgao = m.espec.eh_controlado_pf && m.espec.eh_controlado_eb ? "PF, EB" 
            : m.espec.eh_controlado_pf ? "PF" : "EB";
          return [dataStr, m.frasco.codigo_frasco, m.espec.descricao || "N/A", m.h.tipo, orgao];
        }),
      };
      await doc.table(tableArray, { width: 535 });
    } else {
      doc.text("Nenhuma substância controlada movimentada no período.");
    }
    doc.moveDown();

    // Ocorrências Críticas
    doc.font(FONTS.bold).fontSize(12).text("4. INCORPORAÇÕES, PERDAS E OCORRÊNCIAS");
    doc.font(FONTS.regular).fontSize(10).moveDown(0.5);
    if (ocorrenciasCriticas.length > 0) {
      const tableArray = {
        headers: ["Data", "Código", "Ocorrência"],
        rows: ocorrenciasCriticas.map(h => {
          const frasco = frascosMap.get(h.id_frasco_reagente);
          const codigo = frasco ? frasco.codigo_frasco : "Desconhecido";
          return [h.timestamp.toDate().toLocaleDateString("pt-BR"), codigo, h.tipo];
        }),
      };
      await doc.table(tableArray, { width: 535 });
    } else {
      doc.text("Nenhuma quebra, descarte ou quarentena registrada no período.");
    }
    
    // Adicionar rodapé em todas as páginas (hash canônico)
    addFooterAndHash(doc, canonicalString);
  });

  const fileName = `relatorios/almoxarifado_${idAlmoxarifado}_${mes}_${ano}_${Date.now()}.pdf`;
  const fileRef = admin.storage().bucket().file(fileName);
  await fileRef.save(buffer, { contentType: "application/pdf" });

  let url = "";
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    url = `http://127.0.0.1:9199/v0/b/${admin.storage().bucket().name}/o/${encodeURIComponent(fileName)}?alt=media`;
  } else {
    [url] = await fileRef.getSignedUrl({ action: "read", expires: Date.now() + 3600000 });
  }
  return { url };
});

// -------------------------------------------------------------
// RELATÓRIOS BENS PATRIMONIAIS
// -------------------------------------------------------------
interface FiltrosPredio {
  predio?: string;
  mes?: number;
  ano?: number;
  andar?: string;
  sala?: string;
  estadoConservacao?: string;
  status?: string;
}

export const gerarRelatorioBensPredio = onCall(async (request) => {
  const filtros = request.data as FiltrosPredio;
  validarPermissao(request, ["Chefe_Geral", "Gestor_Bens_Patrimoniais"]);

  let query: admin.firestore.Query = admin.firestore().collection("Bem_Patrimonial");
  if (filtros.predio) query = query.where("predio", "==", filtros.predio);
  if (filtros.andar) query = query.where("andar", "==", filtros.andar);
  if (filtros.sala) query = query.where("sala", "==", filtros.sala);
  if (filtros.estadoConservacao) query = query.where("estado_conservacao", "==", filtros.estadoConservacao);
  if (filtros.status) query = query.where("status", "==", filtros.status);

  const bensSnapshot = await query.get();
  const bens = bensSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

  const canonicalString = [
    filtros.predio || "ALL",
    filtros.status || "ALL",
    bens.map(b => b.id).sort().join(","),
    Date.now().toString()
  ].join("|");

  const doc = new PDFDocument({ bufferPages: true, size: "A4", layout: "landscape", margin: 30 });
  
  const buffer = await buildPdfBuffer(doc, async (doc) => {
    let subtitulo = "";
    if (filtros.predio) subtitulo += `Prédio: ${filtros.predio} `;
    if (filtros.status) subtitulo += `| Status: ${filtros.status}`;
    
    addHeader(doc, "Relatório de Bens Patrimoniais", subtitulo);

    if (bens.length > 0) {
      const tableArray = {
        title: "Bens Encontrados",
        headers: ["Patrimônio", "Equipamento", "Prédio", "Sala", "Status", "Responsável (SEI)"],
        rows: bens.map(b => [
          b.numero_patrimonio,
          b.nome_equipamento,
          b.predio || "-",
          b.sala || "-",
          b.status,
          b.nome_responsavel_sei
        ]),
      };
      await doc.table(tableArray, { width: 750 });
    } else {
      doc.text("Nenhum bem patrimonial encontrado com os filtros selecionados.");
    }
    
    addFooterAndHash(doc, canonicalString);
  });

  const fileName = `relatorios/bens_${Date.now()}.pdf`;
  const fileRef = admin.storage().bucket().file(fileName);
  await fileRef.save(buffer, { contentType: "application/pdf" });

  let url = "";
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    url = `http://127.0.0.1:9199/v0/b/${admin.storage().bucket().name}/o/${encodeURIComponent(fileName)}?alt=media`;
  } else {
    [url] = await fileRef.getSignedUrl({ action: "read", expires: Date.now() + 3600000 });
  }
  return { url };
});

// -------------------------------------------------------------
// RELATÓRIO GERAL E PERSONALIZADO
// -------------------------------------------------------------
interface FiltrosGeralEPersonalizado {
  dataInicio: string;
  dataFim: string;
  entidade: "Bens_Patrimoniais" | "Reagentes";
}

export const gerarRelatorioPersonalizado = onCall(async (request) => {
  const { dataInicio, dataFim, entidade } = request.data as FiltrosGeralEPersonalizado;
  
  const dataIniObj = new Date(dataInicio);
  const dataFimObj = new Date(dataFim);
  dataFimObj.setHours(23, 59, 59, 999);
  
  const hoje = new Date();
  if (dataIniObj > hoje) throw new Error("A data inicial não pode ser no futuro.");
  if (dataFimObj > hoje) throw new Error("A data final não pode ser no futuro.");
  if (dataIniObj > dataFimObj) throw new Error("A data inicial não pode ser maior que a data final.");
  
  const diffTime = Math.abs(dataFimObj.getTime() - dataIniObj.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  if (diffDays > 31) {
    throw new Error("O período selecionado permite no máximo 31 dias corridos.");
  }

  validarPermissao(request, ["Chefe_Geral", "Gestor_Bens_Patrimoniais", "Gestor_Almoxarifado"]);

  const doc = new PDFDocument({ bufferPages: true, layout: "landscape", size: "A4", margin: 30 });
  let canonicalString = "";
  
  const buffer = await buildPdfBuffer(doc, async (doc) => {
    addHeader(doc, `Relatório Personalizado: ${entidade.replace("_", " ")}`, `Período: ${dataIniObj.toLocaleDateString("pt-BR")} até ${dataFimObj.toLocaleDateString("pt-BR")}`);

    if (entidade === "Bens_Patrimoniais") {
      const snapshot = await admin.firestore().collection("Historico_Bem_Patrimonial")
        .where("timestamp", ">=", dataIniObj)
        .where("timestamp", "<=", dataFimObj)
        .get();
        
      const registros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      canonicalString = [entidade, dataInicio, dataFim, registros.map(r => r.id).sort().join(","), Date.now()].join("|");

      if (registros.length > 0) {
        const tableArray = {
          title: "Histórico de Patrimônio no Período",
          headers: ["Data", "Tipo de Ação", "Usuário ID"],
          rows: registros.map(r => [
            r.timestamp.toDate().toLocaleDateString("pt-BR"),
            r.tipo,
            r.id_usuario
          ]),
        };
        await doc.table(tableArray, { width: 700 });
      } else {
        doc.text("Nenhum histórico encontrado no período.");
      }

    } else {
      // Reagentes - Devoluções
      const snapshot = await admin.firestore().collection("Emprestimo_Reagente")
        .where("data_devolucao_efetuada", ">=", dataIniObj)
        .where("data_devolucao_efetuada", "<=", dataFimObj)
        .get();
        
      const registros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      canonicalString = [entidade, dataInicio, dataFim, registros.map(r => r.id).sort().join(","), Date.now()].join("|");

      if (registros.length > 0) {
        const tableArray = {
          title: "Empréstimos Concluídos no Período",
          headers: ["Data Devolução", "Retirante", "Consumo Lançado", "Finalidade", "Status"],
          rows: registros.map(r => [
            r.data_devolucao_efetuada.toDate().toLocaleDateString("pt-BR"),
            r.id_usuario_retirou,
            `${r.medida_utilizada || 0} ${r.unidade_medida_utilizada}`,
            r.finalidade_uso,
            r.status
          ]),
        };
        await doc.table(tableArray, { width: 750 });
      } else {
        doc.text("Nenhuma devolução de reagente registrada no período.");
      }
    }
    
    addFooterAndHash(doc, canonicalString);
  });

  const fileName = `relatorios/personalizado_${Date.now()}.pdf`;
  const fileRef = admin.storage().bucket().file(fileName);
  await fileRef.save(buffer, { contentType: "application/pdf" });
  
  let url = "";
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    url = `http://127.0.0.1:9199/v0/b/${admin.storage().bucket().name}/o/${encodeURIComponent(fileName)}?alt=media`;
  } else {
    [url] = await fileRef.getSignedUrl({ action: "read", expires: Date.now() + 3600000 });
  }
  return { url };
});

// ============================================================================
// GERAÇÃO DE ETIQUETAS VIRGENS (NOVOS FRASCOS) - ABA 1
// ============================================================================
interface DadosEtiquetasVirgens {
  codigoInicial: number;
  codigoFinal: number;
  startRow?: number; // 1 a 10 (Grid A4)
  startCol?: number; // 1 a 3
}

// Conversão mm -> pt (1 mm = 2.83465 pt)
const mmToPt = (mm: number) => mm * 2.83465;

// Grid de 3 colunas x 10 linhas em folha A4 (210 x 297 mm)
const GRID_A4_VIRGEM = {
  cols: 3,
  rows: 10,
  labelWidth: mmToPt(65.0),
  labelHeight: mmToPt(26.5),
  marginLeft: mmToPt(7.5),
  marginTop: mmToPt(16.0),
};

async function gerarBufferBarcode(texto: string) {
  return await bwipjs.toBuffer({
    bcid: "code128",
    text: texto,
    scale: 2,
    height: 8.0,
    includetext: false,
    textxalign: "center",
  });
}

async function renderBarcodesGrid(doc: any, codigos: string[], startRow: number, startCol: number) {
  let slotAtual = (startRow - 1) * GRID_A4_VIRGEM.cols + (startCol - 1);

  for (const codigo of codigos) {
    if (slotAtual >= GRID_A4_VIRGEM.cols * GRID_A4_VIRGEM.rows) {
      doc.addPage({ size: "A4", margin: 0 });
      slotAtual = 0;
    }

    const r = Math.floor(slotAtual / GRID_A4_VIRGEM.cols);
    const c = slotAtual % GRID_A4_VIRGEM.cols;

    const x = GRID_A4_VIRGEM.marginLeft + c * GRID_A4_VIRGEM.labelWidth;
    const y = GRID_A4_VIRGEM.marginTop + r * GRID_A4_VIRGEM.labelHeight;

    // 1. LINHA DE GUIA DE CORTE (Cinza claro)
    doc
      .rect(x, y, GRID_A4_VIRGEM.labelWidth, GRID_A4_VIRGEM.labelHeight)
      .lineWidth(0.4)
      .strokeColor("#D5D5D5")
      .stroke();

    const paddingX = mmToPt(2.5);
    const paddingY = mmToPt(2.0);
    const printableWidth = GRID_A4_VIRGEM.labelWidth - paddingX * 2;

    // 2. LINHA 1 (TOPO): Código à esquerda e Data manual à direita
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#000000");
    doc.text(codigo, x + paddingX, y + paddingY, {
      width: printableWidth * 0.50,
      align: "left",
      lineBreak: false,
    });

    const larguraData = mmToPt(24);
    const xData = x + GRID_A4_VIRGEM.labelWidth - paddingX - larguraData;
    doc.font("Helvetica").fontSize(6.5).fillColor("#444444");
    doc.text("Cad: ___/___/___", xData, y + paddingY + 1.8, {
      width: larguraData,
      align: "right",
      lineBreak: false,
    });

    // 3. LINHA 2 (MEIO): Rótulo "Reagente:" e linha contínua para escrita
    const yReagente = y + paddingY + 12;
    doc.font("Helvetica-Bold").fontSize(7.0).fillColor("#333333");
    doc.text("Reagente:", x + paddingX, yReagente, {
      lineBreak: false,
    });

    const xInicioLinha = x + paddingX + mmToPt(14);
    const xFimLinha = x + GRID_A4_VIRGEM.labelWidth - paddingX;
    doc
      .moveTo(xInicioLinha, yReagente + 7.5)
      .lineTo(xFimLinha, yReagente + 7.5)
      .lineWidth(0.5)
      .strokeColor("#AAAAAA")
      .stroke();

    // 4. LINHA 3 (BASE): Código de Barras Code 128
    const barcodeBuffer = await gerarBufferBarcode(codigo);
    const barcodeWidth = mmToPt(42);
    const barcodeHeight = mmToPt(7.5);
    const barcodeX = x + (GRID_A4_VIRGEM.labelWidth - barcodeWidth) / 2;
    const barcodeY = y + GRID_A4_VIRGEM.labelHeight - barcodeHeight - paddingY;

    doc.image(barcodeBuffer, barcodeX, barcodeY, {
      width: barcodeWidth,
      height: barcodeHeight,
    });

    slotAtual++;
  }
}

export const gerarPdfEtiquetasVirgens = onCall(async (request) => {
  try {
    validarPermissao(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
    const dados = request.data as DadosEtiquetasVirgens;

    const total = dados.codigoFinal - dados.codigoInicial + 1;
    if (total <= 0 || total > 50) {
      throw new HttpsError("invalid-argument", "O lote deve conter entre 1 e 50 etiquetas por impressão.");
    }

    await admin.firestore().collection("Impressao_Etiqueta_Frasco").add({
      gerado_em: FieldValue.serverTimestamp(),
      gerado_por: request.auth!.uid,
      codigo_inicial: dados.codigoInicial,
      codigo_final: dados.codigoFinal,
    });

    const codigos = Array.from({ length: total }, (_, i) => `LCQUI-${dados.codigoInicial + i}`);
    
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const buffer = await buildPdfBuffer(doc, async (d) => {
      await renderBarcodesGrid(d, codigos, dados.startRow || 1, dados.startCol || 1);
    });

    const fileName = `etiquetas/virgens_${dados.codigoInicial}_a_${dados.codigoFinal}_${Date.now()}.pdf`;
    const fileRef = admin.storage().bucket().file(fileName);
    await fileRef.save(buffer, { contentType: "application/pdf" });

    let url = "";
    if (process.env.FUNCTIONS_EMULATOR === "true") {
      url = `http://127.0.0.1:9199/v0/b/${admin.storage().bucket().name}/o/${encodeURIComponent(fileName)}?alt=media`;
    } else {
      [url] = await fileRef.getSignedUrl({ action: "read", expires: Date.now() + 3600000 });
    }
    return { url };
  } catch (error: any) {
    console.error("Erro em gerarPdfEtiquetasVirgens:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", `Erro interno na geração do PDF: ${error.message}`);
  }
});

// ============================================================================
// REIMPRESSÃO E FICHA DE CONFERÊNCIA (FRASCOS JÁ CADASTRADOS) - ABA 2
// ============================================================================
interface DadosReimpressao {
  frascoIds: string[]; // Máximo 10 frascos
}

export const gerarPdfReimpressaoFrascos = onCall(async (request) => {
  try {
    validarPermissao(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
    const { frascoIds } = request.data as DadosReimpressao;

    if (!frascoIds || frascoIds.length === 0 || frascoIds.length > 10) {
      throw new HttpsError("invalid-argument", "Selecione entre 1 e 10 frascos por sessão de reimpressão.");
    }

    // Auditing
    const batch = admin.firestore().batch();
    const db = admin.firestore();
    
    const frascosData: any[] = [];
    for (const frascoId of frascoIds) {
      const snap = await db.collection("Frasco_Reagente").doc(frascoId).get();
      if (snap.exists) frascosData.push({ id: snap.id, ...snap.data() });

      const auditRef = db.collection("Registro_de_Auditoria").doc();
      batch.set(auditRef, {
        id_usuario: request.auth!.uid,
        acao: "REIMPRESSAO_ETIQUETA",
        tipo_entidade_sofre_acao: "FRASCO_REAGENTE",
        id_do_objeto_da_entidade: frascoId,
        acao_feita_em: FieldValue.serverTimestamp(),
        metadata: { motivo: "segunda_via_conferencia" },
      });
    }
    await batch.commit();

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const buffer = await buildPdfBuffer(doc, async (d) => {
      for (let i = 0; i < frascosData.length; i++) {
        if (i > 0) d.addPage();
        const f = frascosData[i];
        d.fontSize(16).text("Ficha de Conferência e Rastreabilidade", { align: "center" });
        d.moveDown();
        d.fontSize(12).text(`Frasco ID: ${f.id}`);
        d.text(`Código LCQUI: ${f.codigo_frasco}`);
        d.text(`Conteúdo Nominal: ${f.conteudo_nominal}`);
        d.text(`Peso Atual: ${f.peso_atual}g`);
        d.text(`Estado Físico do Frasco: ${f.estado_fisico_frasco}`);
        d.text(`Disponibilidade: ${f.disponibilidade}`);
        d.text(`Vencido: ${f.vencido ? 'Sim' : 'Não'}`);
        
        d.moveDown(4);
        d.text("Etiqueta de Reposição:", { align: "center" });
        d.moveDown(1);
        
        const pngBuffer = await bwipjs.toBuffer({
          bcid: 'code128',
          text: f.codigo_frasco,
          scale: 3,
          height: 10,
          includetext: true,
          textxalign: 'center',
        });
        
        // Draw centered at the bottom
        d.image(pngBuffer, (d.page.width - 150) / 2, d.y, { width: 150 });
      }
    });

    const fileName = `etiquetas/reimpressao_${Date.now()}.pdf`;
    const fileRef = admin.storage().bucket().file(fileName);
    await fileRef.save(buffer, { contentType: "application/pdf" });

    let url = "";
    if (process.env.FUNCTIONS_EMULATOR === "true") {
      url = `http://127.0.0.1:9199/v0/b/${admin.storage().bucket().name}/o/${encodeURIComponent(fileName)}?alt=media`;
    } else {
      [url] = await fileRef.getSignedUrl({ action: "read", expires: Date.now() + 3600000 });
    }
    return { url };
  } catch (error: any) {
    console.error("Erro em gerarPdfReimpressaoFrascos:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", `Erro interno na reimpressão: ${error.message}`);
  }
});
