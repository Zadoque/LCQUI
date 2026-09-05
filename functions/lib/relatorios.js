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
exports.gerarRelatorioPersonalizado = exports.gerarRelatorioBensPredio = exports.gerarRelatorioAlmoxarifado = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const pdfkit_table_1 = __importDefault(require("pdfkit-table"));
const auth_1 = require("./auth");
const pdfHeader_1 = require("./relatorios/pdfHeader");
const pdfFooter_1 = require("./relatorios/pdfFooter");
const chunk_1 = require("./utils/chunk");
const pdfStyles_1 = require("./relatorios/pdfStyles");
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
//# sourceMappingURL=relatorios.js.map