"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gerarPdfReimpressaoFrascos = exports.gerarPdfEtiquetasVirgens = exports.gerarRelatorioPersonalizado = exports.gerarRelatorioBensPredio = exports.gerarRelatorioAlmoxarifado = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const pdfkit_table_1 = __importDefault(require("pdfkit-table"));
const auth_1 = require("./auth");
const pdfHeader_1 = require("./relatorios/pdfHeader");
const pdfFooter_1 = require("./relatorios/pdfFooter");
const chunk_1 = require("./utils/chunk");
const pdfStyles_1 = require("./relatorios/pdfStyles");
const bwipjs = __importStar(require("bwip-js"));
async function buildPdfBuffer(doc, builderCallback) {
    return new Promise((resolve, reject) => {
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            resolve(Buffer.concat(buffers));
        });
        doc.on('error', reject);
        try {
            const result = builderCallback(doc);
            if (result instanceof Promise) {
                result.then(() => doc.end()).catch((err) => reject(err));
            }
            else {
                doc.end();
            }
        }
        catch (e) {
            reject(e);
        }
    });
}
exports.gerarRelatorioAlmoxarifado = (0, https_1.onCall)(async (request) => {
    const { idAlmoxarifado, mes, ano } = request.data;
    const hoje = new Date();
    if (ano > hoje.getFullYear()) {
        throw new Error("O ano do relatório não pode ser no futuro.");
    }
    if (ano === hoje.getFullYear() && mes > hoje.getMonth() + 1) {
        throw new Error("O mês do relatório não pode ser no futuro.");
    }
    (0, auth_1.validarPermissao)(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
    await (0, auth_1.validarGestorDoAlmoxarifado)(request.auth.uid, request.auth.token, idAlmoxarifado);
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
    const devolucoes = devolucoesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const historicos = historicoSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    // 3. Resolução de Entidades Otimizada (Prevenção de N+1)
    const frascoIds = new Set();
    devolucoes.forEach(d => { if (d.id_frasco_reagente)
        frascoIds.add(d.id_frasco_reagente); });
    historicos.forEach(h => { if (h.id_frasco_reagente)
        frascoIds.add(h.id_frasco_reagente); });
    const frascosMap = new Map();
    if (frascoIds.size > 0) {
        const frascoRefs = Array.from(frascoIds).map(id => db.collection("Frasco_Reagente").doc(id));
        const frascoChunks = (0, chunk_1.chunkArray)(frascoRefs, 200);
        const frascoSnapsNested = await Promise.all(frascoChunks.map(chunk => db.getAll(...chunk)));
        const frascoSnaps = frascoSnapsNested.flat();
        frascoSnaps.forEach(snap => { if (snap.exists)
            frascosMap.set(snap.id, snap.data()); });
    }
    const especIds = new Set();
    frascosMap.forEach(f => {
        // Se o frasco tem id_lote, a especificação deveria vir do lote.
        // Para simplificar, assumimos que o frasco denormaliza id_especificacao_reagente
        if (f.id_especificacao_reagente)
            especIds.add(f.id_especificacao_reagente);
    });
    const especMap = new Map();
    if (especIds.size > 0) {
        const especRefs = Array.from(especIds).map(id => db.collection("Especificacao_Reagente").doc(id));
        const especChunks = (0, chunk_1.chunkArray)(especRefs, 200);
        const especSnapsNested = await Promise.all(especChunks.map(chunk => db.getAll(...chunk)));
        const especSnaps = especSnapsNested.flat();
        especSnaps.forEach(snap => { if (snap.exists)
            especMap.set(snap.id, snap.data()); });
    }
    // 4. Agregar Totais
    let consumoMassaG = 0;
    let consumoVolumeMl = 0;
    devolucoes.forEach(d => {
        if (d.unidade_medida_utilizada === "g")
            consumoMassaG += (d.medida_utilizada || 0);
        else if (d.unidade_medida_utilizada === "ml")
            consumoVolumeMl += (d.medida_utilizada || 0);
        else if (d.unidade_medida_utilizada === "L")
            consumoVolumeMl += ((d.medida_utilizada || 0) * 1000);
    });
    const ocorrenciasCriticas = historicos.filter(h => ["QUEBROU", "FOI_DESCARTADO", "ENTROU_EM_QUARENTENA", "VENCEU"].includes(h.tipo));
    const movimentacoesControladas = [];
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
    const doc = new pdfkit_table_1.default({ bufferPages: true, margin: 30, size: "A4" });
    const buffer = await buildPdfBuffer(doc, async (doc) => {
        (0, pdfHeader_1.addHeader)(doc, "Relatório Mensal de Movimentação e Estoque", `${nomeAlmox}\nPeríodo de Referência: 01/${mes.toString().padStart(2, '0')}/${ano} a ${dataFim.getDate()}/${mes.toString().padStart(2, '0')}/${ano}`);
        // Quadro Resumo
        doc.font(pdfStyles_1.FONTS.bold).fontSize(12).text("1. QUADRO RESUMO DE BALANÇO DE MASSA E VOLUME");
        doc.font(pdfStyles_1.FONTS.regular).fontSize(10);
        doc.text(`Consumo Sólidos no Período (Massa): ${consumoMassaG.toFixed(3)} g`);
        doc.text(`Consumo Líquidos no Período (Volume): ${consumoVolumeMl.toFixed(3)} ml`);
        doc.moveDown();
        // Histórico Operacional
        doc.font(pdfStyles_1.FONTS.bold).fontSize(12).text("2. REGISTRO DE MOVIMENTAÇÕES NO PERÍODO");
        doc.font(pdfStyles_1.FONTS.regular).fontSize(10).moveDown(0.5);
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
        }
        else {
            doc.text("Nenhuma movimentação registrada no período.");
        }
        doc.moveDown();
        // Substâncias Controladas
        doc.font(pdfStyles_1.FONTS.bold).fontSize(12).text("3. SESSÃO DE REAGENTES CONTROLADOS (POLÍCIA FEDERAL / EXÉRCITO)");
        doc.font(pdfStyles_1.FONTS.regular).fontSize(10).moveDown(0.5);
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
        }
        else {
            doc.text("Nenhuma substância controlada movimentada no período.");
        }
        doc.moveDown();
        // Ocorrências Críticas
        doc.font(pdfStyles_1.FONTS.bold).fontSize(12).text("4. INCORPORAÇÕES, PERDAS E OCORRÊNCIAS");
        doc.font(pdfStyles_1.FONTS.regular).fontSize(10).moveDown(0.5);
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
        }
        else {
            doc.text("Nenhuma quebra, descarte ou quarentena registrada no período.");
        }
        // Adicionar rodapé em todas as páginas (hash canônico)
        (0, pdfFooter_1.addFooterAndHash)(doc, canonicalString);
    });
    const fileName = `relatorios/almoxarifado_${idAlmoxarifado}_${mes}_${ano}_${Date.now()}.pdf`;
    const fileRef = admin.storage().bucket().file(fileName);
    await fileRef.save(buffer, { contentType: "application/pdf" });
    let url = "";
    if (process.env.FUNCTIONS_EMULATOR === "true") {
        url = `http://127.0.0.1:9199/v0/b/${admin.storage().bucket().name}/o/${encodeURIComponent(fileName)}?alt=media`;
    }
    else {
        [url] = await fileRef.getSignedUrl({ action: "read", expires: Date.now() + 3600000 });
    }
    return { url };
});
exports.gerarRelatorioBensPredio = (0, https_1.onCall)(async (request) => {
    const filtros = request.data;
    (0, auth_1.validarPermissao)(request, ["Chefe_Geral", "Gestor_Bens_Patrimoniais"]);
    let query = admin.firestore().collection("Bem_Patrimonial");
    if (filtros.predio)
        query = query.where("predio", "==", filtros.predio);
    if (filtros.andar)
        query = query.where("andar", "==", filtros.andar);
    if (filtros.sala)
        query = query.where("sala", "==", filtros.sala);
    if (filtros.estadoConservacao)
        query = query.where("estado_conservacao", "==", filtros.estadoConservacao);
    if (filtros.status)
        query = query.where("status", "==", filtros.status);
    const bensSnapshot = await query.get();
    const bens = bensSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const canonicalString = [
        filtros.predio || "ALL",
        filtros.status || "ALL",
        bens.map(b => b.id).sort().join(","),
        Date.now().toString()
    ].join("|");
    const doc = new pdfkit_table_1.default({ bufferPages: true, size: "A4", layout: "landscape", margin: 30 });
    const buffer = await buildPdfBuffer(doc, async (doc) => {
        let subtitulo = "";
        if (filtros.predio)
            subtitulo += `Prédio: ${filtros.predio} `;
        if (filtros.status)
            subtitulo += `| Status: ${filtros.status}`;
        (0, pdfHeader_1.addHeader)(doc, "Relatório de Bens Patrimoniais", subtitulo);
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
        }
        else {
            doc.text("Nenhum bem patrimonial encontrado com os filtros selecionados.");
        }
        (0, pdfFooter_1.addFooterAndHash)(doc, canonicalString);
    });
    const fileName = `relatorios/bens_${Date.now()}.pdf`;
    const fileRef = admin.storage().bucket().file(fileName);
    await fileRef.save(buffer, { contentType: "application/pdf" });
    let url = "";
    if (process.env.FUNCTIONS_EMULATOR === "true") {
        url = `http://127.0.0.1:9199/v0/b/${admin.storage().bucket().name}/o/${encodeURIComponent(fileName)}?alt=media`;
    }
    else {
        [url] = await fileRef.getSignedUrl({ action: "read", expires: Date.now() + 3600000 });
    }
    return { url };
});
exports.gerarRelatorioPersonalizado = (0, https_1.onCall)(async (request) => {
    const { dataInicio, dataFim, entidade } = request.data;
    const dataIniObj = new Date(dataInicio);
    const dataFimObj = new Date(dataFim);
    dataFimObj.setHours(23, 59, 59, 999);
    const hoje = new Date();
    if (dataIniObj > hoje)
        throw new Error("A data inicial não pode ser no futuro.");
    if (dataFimObj > hoje)
        throw new Error("A data final não pode ser no futuro.");
    if (dataIniObj > dataFimObj)
        throw new Error("A data inicial não pode ser maior que a data final.");
    const diffTime = Math.abs(dataFimObj.getTime() - dataIniObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 31) {
        throw new Error("O período selecionado permite no máximo 31 dias corridos.");
    }
    (0, auth_1.validarPermissao)(request, ["Chefe_Geral", "Gestor_Bens_Patrimoniais", "Gestor_Almoxarifado"]);
    const doc = new pdfkit_table_1.default({ bufferPages: true, layout: "landscape", size: "A4", margin: 30 });
    let canonicalString = "";
    const buffer = await buildPdfBuffer(doc, async (doc) => {
        (0, pdfHeader_1.addHeader)(doc, `Relatório Personalizado: ${entidade.replace("_", " ")}`, `Período: ${dataIniObj.toLocaleDateString("pt-BR")} até ${dataFimObj.toLocaleDateString("pt-BR")}`);
        if (entidade === "Bens_Patrimoniais") {
            const snapshot = await admin.firestore().collection("Historico_Bem_Patrimonial")
                .where("timestamp", ">=", dataIniObj)
                .where("timestamp", "<=", dataFimObj)
                .get();
            const registros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
            }
            else {
                doc.text("Nenhum histórico encontrado no período.");
            }
        }
        else {
            // Reagentes - Devoluções
            const snapshot = await admin.firestore().collection("Emprestimo_Reagente")
                .where("data_devolucao_efetuada", ">=", dataIniObj)
                .where("data_devolucao_efetuada", "<=", dataFimObj)
                .get();
            const registros = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
            }
            else {
                doc.text("Nenhuma devolução de reagente registrada no período.");
            }
        }
        (0, pdfFooter_1.addFooterAndHash)(doc, canonicalString);
    });
    const fileName = `relatorios/personalizado_${Date.now()}.pdf`;
    const fileRef = admin.storage().bucket().file(fileName);
    await fileRef.save(buffer, { contentType: "application/pdf" });
    let url = "";
    if (process.env.FUNCTIONS_EMULATOR === "true") {
        url = `http://127.0.0.1:9199/v0/b/${admin.storage().bucket().name}/o/${encodeURIComponent(fileName)}?alt=media`;
    }
    else {
        [url] = await fileRef.getSignedUrl({ action: "read", expires: Date.now() + 3600000 });
    }
    return { url };
});
// Conversão mm -> pt (1 mm = 2.83465 pt)
const mmToPt = (mm) => mm * 2.83465;
// Grid de 3 colunas x 10 linhas em folha A4 (210 x 297 mm)
const GRID_A4_VIRGEM = {
    cols: 3,
    rows: 10,
    labelWidth: mmToPt(65.0),
    labelHeight: mmToPt(26.5),
    marginLeft: mmToPt(7.5),
    marginTop: mmToPt(16.0),
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
async function renderBarcodesGrid(doc, codigos, startRow, startCol) {
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
exports.gerarPdfEtiquetasVirgens = (0, https_1.onCall)(async (request) => {
    try {
        (0, auth_1.validarPermissao)(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
        const dados = request.data;
        const total = dados.codigoFinal - dados.codigoInicial + 1;
        if (total <= 0 || total > 50) {
            throw new https_1.HttpsError("invalid-argument", "O lote deve conter entre 1 e 50 etiquetas por impressão.");
        }
        await admin.firestore().collection("Impressao_Etiqueta_Frasco").add({
            gerado_em: firestore_1.FieldValue.serverTimestamp(),
            gerado_por: request.auth.uid,
            codigo_inicial: dados.codigoInicial,
            codigo_final: dados.codigoFinal,
        });
        const codigos = Array.from({ length: total }, (_, i) => `LCQUI-${dados.codigoInicial + i}`);
        const doc = new pdfkit_table_1.default({ size: "A4", margin: 0 });
        const buffer = await buildPdfBuffer(doc, async (d) => {
            await renderBarcodesGrid(d, codigos, dados.startRow || 1, dados.startCol || 1);
        });
        const fileName = `etiquetas/virgens_${dados.codigoInicial}_a_${dados.codigoFinal}_${Date.now()}.pdf`;
        const fileRef = admin.storage().bucket().file(fileName);
        await fileRef.save(buffer, { contentType: "application/pdf" });
        let url = "";
        if (process.env.FUNCTIONS_EMULATOR === "true") {
            url = `http://127.0.0.1:9199/v0/b/${admin.storage().bucket().name}/o/${encodeURIComponent(fileName)}?alt=media`;
        }
        else {
            [url] = await fileRef.getSignedUrl({ action: "read", expires: Date.now() + 3600000 });
        }
        return { url };
    }
    catch (error) {
        console.error("Erro em gerarPdfEtiquetasVirgens:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", `Erro interno na geração do PDF: ${error.message}`);
    }
});
async function desenharEtiquetaReposicao(doc, x, y, frasco) {
    const labelWidth = mmToPt(65.0);
    const labelHeight = mmToPt(26.5);
    const paddingX = mmToPt(2.5);
    const paddingY = mmToPt(2.0);
    const printableWidth = labelWidth - paddingX * 2;
    // Borda guia para corte
    doc.rect(x, y, labelWidth, labelHeight).lineWidth(0.5).strokeColor("#B0B0B0").stroke();
    // Linha 1: Código do frasco e Data de Cadastro original
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#000000");
    doc.text(frasco.codigo_frasco, x + paddingX, y + paddingY, {
        width: printableWidth * 0.55,
        align: "left",
        lineBreak: false,
    });
    doc.font("Helvetica").fontSize(6.5).fillColor("#555555");
    const dataFormatada = frasco.cadastrado_em || "__/__/____";
    doc.text(`Cad: ${dataFormatada}`, x + paddingX + printableWidth * 0.55, y + paddingY + 1.8, {
        width: printableWidth * 0.45,
        align: "right",
        lineBreak: false,
    });
    // Linha 2: Nome do Reagente / Concentração (já impresso)
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#111111");
    doc.text(frasco.nome_reagente, x + paddingX, y + paddingY + 12, {
        width: printableWidth,
        align: "center",
        lineBreak: false,
        ellipsis: true,
    });
    // Linha 3: Código de Barras Code 128
    const barcodeBuffer = await gerarBufferBarcode(frasco.codigo_frasco);
    const barcodeWidth = mmToPt(42);
    const barcodeHeight = mmToPt(7.5);
    const barcodeX = x + (labelWidth - barcodeWidth) / 2;
    const barcodeY = y + labelHeight - barcodeHeight - paddingY;
    doc.image(barcodeBuffer, barcodeX, barcodeY, {
        width: barcodeWidth,
        height: barcodeHeight,
    });
}
async function gerarBufferFichaConferencia(frascos) {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new pdfkit_table_1.default({
                size: "A4",
                margin: 36, // 0.5 polegada (~12.7mm)
                autoFirstPage: false,
            });
            const buffers = [];
            doc.on("data", (chunk) => buffers.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(buffers)));
            for (let i = 0; i < frascos.length; i++) {
                const frasco = frascos[i];
                doc.addPage({ size: "A4", margin: 36 });
                const margin = 36;
                const pageWidth = doc.page.width;
                const contentWidth = pageWidth - margin * 2;
                let y = margin;
                // 1. CABEÇALHO INSTITUCIONAL
                doc.font("Helvetica-Bold").fontSize(10).fillColor("#1A365D");
                doc.text("UENF - UNIVERSIDADE ESTADUAL DO NORTE FLUMINENSE DARCY RIBEIRO", margin, y, { align: "center" });
                y += 13;
                doc.font("Helvetica").fontSize(8.5).fillColor("#4A5568");
                doc.text("CCT | LCQUI - Laboratório de Ciências Químicas - Almoxarifado", margin, y, { align: "center" });
                y += 14;
                doc.rect(margin, y, contentWidth, 22).fillAndStroke("#EBF8FF", "#BEE3F8");
                doc.font("Helvetica-Bold").fontSize(11).fillColor("#2B6CB0");
                doc.text(`FICHA DE CONFERÊNCIA E REPOSIÇÃO - FRASCO: ${frasco.codigo_frasco}`, margin, y + 6, {
                    align: "center",
                    width: contentWidth,
                });
                y += 30;
                // 2. IDENTIFICAÇÃO DO REAGENTE E LOCALIZAÇÃO
                doc.rect(margin, y, contentWidth, 58).lineWidth(0.5).strokeColor("#CBD5E0").stroke();
                doc.font("Helvetica-Bold").fontSize(8).fillColor("#2D3748").text("DADOS CADASTRAIS DO ITEM", margin + 8, y + 6);
                const col1X = margin + 8;
                const col2X = margin + contentWidth * 0.52;
                doc.font("Helvetica-Bold").fontSize(8).fillColor("#4A5568");
                doc.text("Reagente: ", col1X, y + 20, { continued: true })
                    .font("Helvetica").fillColor("#1A202C").text(frasco.nome_reagente);
                doc.font("Helvetica-Bold").fillColor("#4A5568");
                doc.text("Especificação: ", col1X, y + 32, { continued: true })
                    .font("Helvetica").fillColor("#1A202C").text(frasco.especificacao || "Padrão");
                doc.font("Helvetica-Bold").fillColor("#4A5568");
                doc.text("Localização: ", col1X, y + 44, { continued: true })
                    .font("Helvetica").fillColor("#1A202C").text(frasco.localizacao || "Não informada");
                doc.font("Helvetica-Bold").fillColor("#4A5568");
                doc.text("Lote: ", col2X, y + 20, { continued: true })
                    .font("Helvetica").fillColor("#1A202C").text(frasco.numero_lote || "Sem Lote Vinculado");
                doc.font("Helvetica-Bold").fillColor("#4A5568");
                doc.text("Validade Efetiva: ", col2X, y + 32, { continued: true })
                    .font("Helvetica").fillColor("#1A202C").text(frasco.validade_efetiva || "Indeterminada");
                doc.font("Helvetica-Bold").fillColor("#4A5568");
                doc.text("Status Atual: ", col2X, y + 44, { continued: true })
                    .font("Helvetica").fillColor(frasco.status === "DISPONIVEL" ? "#22543D" : "#742A2A").text(frasco.status || "DISPONIVEL");
                y += 66;
                // 3. ESTADO GRAVIMÉTRICO & ÚLTIMO EMPRÉSTIMO
                const boxWidth = (contentWidth - 10) / 2;
                // Caixa Esquerda
                doc.rect(margin, y, boxWidth, 54).lineWidth(0.5).strokeColor("#CBD5E0").stroke();
                doc.font("Helvetica-Bold").fontSize(8).fillColor("#2D3748").text("CONTROLE GRAVIMÉTRICO (BALANÇA)", margin + 6, y + 6);
                doc.font("Helvetica-Bold").fontSize(8).fillColor("#4A5568");
                doc.text("Último Peso Medido: ", margin + 6, y + 20, { continued: true })
                    .font("Helvetica-Bold").fillColor("#2B6CB0").text(`${frasco.peso_atual} g`);
                doc.font("Helvetica-Bold").fillColor("#4A5568");
                doc.text("Peso Frasco Vazio (Tara): ", margin + 6, y + 32, { continued: true })
                    .font("Helvetica").fillColor("#1A202C").text(frasco.peso_frasco_vazio ? `${frasco.peso_frasco_vazio} g` : "Não registrado");
                doc.font("Helvetica-Bold").fillColor("#4A5568");
                doc.text("Conteúdo Declarado: ", margin + 6, y + 44, { continued: true })
                    .font("Helvetica").fillColor("#1A202C").text(`${frasco.conteudo_nominal} ${frasco.unidade_medida || "mL"}`);
                // Caixa Direita
                doc.rect(margin + boxWidth + 10, y, boxWidth, 54).lineWidth(0.5).strokeColor("#CBD5E0").stroke();
                doc.font("Helvetica-Bold").fontSize(8).fillColor("#2D3748").text("ÚLTIMO EMPRÉSTIMO REGISTRADO", margin + boxWidth + 16, y + 6);
                if (frasco.ultimo_emprestimo) {
                    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#4A5568");
                    doc.text("Tomador: ", margin + boxWidth + 16, y + 20, { continued: true })
                        .font("Helvetica").fillColor("#1A202C").text(frasco.ultimo_emprestimo.usuario);
                    doc.font("Helvetica-Bold").fillColor("#4A5568");
                    doc.text("Retirado em: ", margin + boxWidth + 16, y + 32, { continued: true })
                        .font("Helvetica").fillColor("#1A202C").text(frasco.ultimo_emprestimo.data_retirada);
                    doc.font("Helvetica-Bold").fillColor("#4A5568");
                    doc.text("Situação: ", margin + boxWidth + 16, y + 44, { continued: true })
                        .font("Helvetica-Bold").fillColor("#C53030").text(frasco.ultimo_emprestimo.status);
                }
                else {
                    doc.font("Helvetica-Oblique").fontSize(8).fillColor("#718096");
                    doc.text("Nenhum histórico de empréstimo anterior.", margin + boxWidth + 16, y + 25);
                }
                y += 62;
                // 4. TABELA DE HISTÓRICO
                doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#1A202C").text("HISTÓRICO RECENTE DO FRASCO (ÚLTIMAS 10 MOVIMENTAÇÕES)", margin, y);
                y += 12;
                const tableTop = y;
                const rowHeight = 15;
                const cData = { width: 90, align: "left" };
                const cEvento = { width: 110, align: "left" };
                const cGestor = { width: 120, align: "left" };
                const cPesoAnt = { width: 65, align: "right" };
                const cPesoNovo = { width: 65, align: "right" };
                const cAjuste = { width: 73, align: "right" };
                doc.rect(margin, tableTop, contentWidth, rowHeight).fill("#EDF2F7");
                let hX = margin + 4;
                doc.font("Helvetica-Bold").fontSize(7).fillColor("#2D3748");
                doc.text("Data / Hora", hX, tableTop + 4, { width: cData.width - 6, align: "left" });
                hX += cData.width;
                doc.text("Evento", hX, tableTop + 4, { width: cEvento.width - 6, align: "left" });
                hX += cEvento.width;
                doc.text("Gestor", hX, tableTop + 4, { width: cGestor.width - 6, align: "left" });
                hX += cGestor.width;
                doc.text("Peso Ant.", hX, tableTop + 4, { width: cPesoAnt.width - 6, align: "right" });
                hX += cPesoAnt.width;
                doc.text("Peso Novo", hX, tableTop + 4, { width: cPesoNovo.width - 6, align: "right" });
                hX += cPesoNovo.width;
                doc.text("Ajuste / Consumo", hX, tableTop + 4, { width: cAjuste.width - 6, align: "right" });
                y += rowHeight;
                const eventos = frasco.historico && frasco.historico.length > 0 ? frasco.historico.slice(0, 10) : [];
                if (eventos.length === 0) {
                    doc.rect(margin, y, contentWidth, 20).lineWidth(0.5).strokeColor("#E2E8F0").stroke();
                    doc.font("Helvetica-Oblique").fontSize(7.5).fillColor("#718096").text("Nenhuma movimentação registrada no histórico.", margin, y + 6, { align: "center", width: contentWidth });
                    y += 24;
                }
                else {
                    eventos.forEach((ev, idx) => {
                        const bg = idx % 2 === 0 ? "#FFFFFF" : "#F7FAFC";
                        doc.rect(margin, y, contentWidth, rowHeight).fill(bg);
                        let rowX = margin + 4;
                        doc.font("Helvetica").fontSize(6.8).fillColor("#1A202C");
                        doc.text(ev.timestamp || "-", rowX, y + 4, { width: cData.width - 6, align: "left" });
                        rowX += cData.width;
                        doc.font("Helvetica-Bold").fillColor(ev.tipo === "SAIU" ? "#C53030" : ev.tipo === "ENTROU" ? "#22543D" : "#2D3748");
                        doc.text(ev.tipo || "-", rowX, y + 4, { width: cEvento.width - 6, align: "left" });
                        rowX += cEvento.width;
                        doc.font("Helvetica").fillColor("#1A202C");
                        doc.text(ev.gestor || "Sistema", rowX, y + 4, { width: cGestor.width - 6, align: "left", ellipsis: true });
                        rowX += cGestor.width;
                        doc.text(ev.peso_anterior != null ? `${ev.peso_anterior}g` : "-", rowX, y + 4, { width: cPesoAnt.width - 6, align: "right" });
                        rowX += cPesoAnt.width;
                        doc.text(ev.peso_novo != null ? `${ev.peso_novo}g` : "-", rowX, y + 4, { width: cPesoNovo.width - 6, align: "right" });
                        rowX += cPesoNovo.width;
                        const consumoTexto = ev.medida_ajustada != null ? `${ev.medida_ajustada} ${ev.unidade || "mL"}` : "-";
                        doc.font("Helvetica-Bold").text(consumoTexto, rowX, y + 4, { width: cAjuste.width - 6, align: "right" });
                        y += rowHeight;
                    });
                }
                // 5. DIVISÓRIA DE CORTE & ETIQUETAS
                const bottomSectionY = doc.page.height - margin - mmToPt(38);
                doc.save();
                doc.dash(3, { space: 3 });
                doc.moveTo(margin, bottomSectionY - 14).lineTo(pageWidth - margin, bottomSectionY - 14).strokeColor("#718096").stroke();
                doc.restore();
                doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#718096");
                doc.text("✂  RECORTE A ETIQUETA DE REPOSIÇÃO ABAIXO E FIXE COM FITA ADESIVA TRANSPARENTE (DUREX)  ✂", margin, bottomSectionY - 10, {
                    align: "center",
                    width: contentWidth,
                });
                const etiquetaW = mmToPt(65.0);
                const xCentralizado = margin + (contentWidth - etiquetaW) / 2;
                await desenharEtiquetaReposicao(doc, xCentralizado, bottomSectionY + 4, frasco);
            }
            doc.end();
        }
        catch (err) {
            reject(err);
        }
    });
}
exports.gerarPdfReimpressaoFrascos = (0, https_1.onCall)(async (request) => {
    try {
        (0, auth_1.validarPermissao)(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
        const { frascoIds } = request.data;
        if (!frascoIds || frascoIds.length === 0 || frascoIds.length > 10) {
            throw new https_1.HttpsError("invalid-argument", "Selecione entre 1 e 10 frascos por sessão de reimpressão.");
        }
        const db = admin.firestore();
        const batch = db.batch();
        // Obter dados enriquecidos em paralelo
        const frascosData = await Promise.all(frascoIds.map(async (frascoId) => {
            const snap = await db.collection("Frasco_Reagente").doc(frascoId).get();
            if (!snap.exists)
                return null;
            const frasco = { id: snap.id, ...snap.data() };
            // Auditoria
            const auditRef = db.collection("Registro_de_Auditoria").doc();
            batch.set(auditRef, {
                id_usuario: request.auth.uid,
                acao: "REIMPRESSAO_ETIQUETA",
                tipo_entidade_sofre_acao: "FRASCO_REAGENTE",
                id_do_objeto_da_entidade: frascoId,
                acao_feita_em: firestore_1.FieldValue.serverTimestamp(),
                metadata: { motivo: "segunda_via_conferencia" },
            });
            // Se tiver lote, busca o numero_lote
            if (frasco.id_lote) {
                const loteSnap = await db.collection("Lote").doc(frasco.id_lote).get();
                if (loteSnap.exists) {
                    frasco.numero_lote = loteSnap.data()?.numero_lote;
                }
            }
            // Buscar Especificação (se aplicável, para o campo especificacao visual da ficha)
            if (frasco.id_especificacao_reagente || (frasco.id_lote && !frasco.id_especificacao_reagente)) {
                // A especificação é denormalizada no nome e unidade. O campo visual "especificação" pode exibir a descricao.
                // Opcional: ignorado por ora se não tivermos a descricao denormalizada, usamos "Padrão"
            }
            // Buscar Top 10 Históricos
            const histSnap = await db.collection("Historico_Frasco_Reagente")
                .where("id_frasco_reagente", "==", frascoId)
                .orderBy("timestamp", "desc")
                .limit(10)
                .get();
            frasco.historico = histSnap.docs.map(h => {
                const data = h.data();
                return {
                    ...data,
                    timestamp: data.timestamp ? data.timestamp.toDate().toLocaleString("pt-BR") : "-",
                };
            }).reverse();
            // Buscar último empréstimo
            const empSnap = await db.collection("Emprestimo_Reagente")
                .where("id_frasco_reagente", "==", frascoId)
                .orderBy("data_retirada", "desc")
                .limit(1)
                .get();
            if (!empSnap.empty) {
                const emp = empSnap.docs[0].data();
                frasco.ultimo_emprestimo = {
                    usuario: emp.nome_usuario_retirou || "Usuário não identificado",
                    data_retirada: emp.data_retirada ? emp.data_retirada.toDate().toLocaleString("pt-BR") : "-",
                    status: emp.status,
                };
            }
            // Preparação visual dos campos (fallback e data formatada)
            frasco.cadastrado_em = frasco.cadastrado_em ? frasco.cadastrado_em.toDate().toLocaleDateString("pt-BR") : "";
            if (frasco.validade_efetiva) {
                // No banco é um string "YYYY-MM-DD" se for date.
                // O SDK transforma Timestamp ou a string formatamos:
                if (frasco.validade_efetiva.toDate) {
                    frasco.validade_efetiva = frasco.validade_efetiva.toDate().toLocaleDateString("pt-BR");
                }
            }
            frasco.status = frasco.estado_fisico_frasco;
            frasco.localizacao = frasco.detalhe_local_armazenamento;
            return frasco;
        }));
        const validFrascos = frascosData.filter(f => f !== null);
        if (validFrascos.length === 0) {
            throw new https_1.HttpsError("not-found", "Nenhum dos frascos solicitados foi encontrado.");
        }
        await batch.commit();
        const buffer = await gerarBufferFichaConferencia(validFrascos);
        const fileName = `etiquetas/reimpressao_${Date.now()}.pdf`;
        const fileRef = admin.storage().bucket().file(fileName);
        await fileRef.save(buffer, { contentType: "application/pdf" });
        let url = "";
        if (process.env.FUNCTIONS_EMULATOR === "true") {
            url = `http://127.0.0.1:9199/v0/b/${admin.storage().bucket().name}/o/${encodeURIComponent(fileName)}?alt=media`;
        }
        else {
            [url] = await fileRef.getSignedUrl({ action: "read", expires: Date.now() + 3600000 });
        }
        return { url };
    }
    catch (error) {
        console.error("Erro em gerarPdfReimpressaoFrascos:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", `Erro interno na reimpressão: ${error.message}`);
    }
});
//# sourceMappingURL=relatorios.js.map