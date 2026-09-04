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
async function buildPdfBuffer(doc, docs, totalConsumo) {
    return new Promise((resolve) => {
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.text(`Total consumido: ${totalConsumo}`);
        doc.text(`Registros: ${docs.length}`);
        doc.end();
    });
}
async function buildPredioPdfBuffer(doc, docs, filtros) {
    return new Promise((resolve) => {
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.text(`Prédio: ${filtros.predio}`);
        doc.text(`Bens encontrados: ${docs.length}`);
        doc.end();
    });
}
async function buildPersonalizadoPdfBuffer(doc, docs, entidade) {
    return new Promise((resolve) => {
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.text(`Relatório Personalizado: ${entidade}`);
        doc.text(`Registros encontrados: ${docs.length}`);
        doc.end();
    });
}
exports.gerarRelatorioAlmoxarifado = (0, https_1.onCall)(async (request) => {
    const { idAlmoxarifado, mes, ano } = request.data;
    (0, auth_1.validarPermissao)(request, ["Chefe_Geral", "Gestor_Almoxarifado"]);
    await (0, auth_1.validarGestorDoAlmoxarifado)(request.auth.uid, request.auth.token, idAlmoxarifado);
    const dataInicio = new Date(ano, mes - 1, 1);
    const dataFim = new Date(ano, mes, 0);
    const devolucoesSnapshot = await admin.firestore().collection("Emprestimo_Reagente")
        .where("id_almoxarifado", "==", idAlmoxarifado)
        .where("data_devolucao_efetuada", ">=", dataInicio)
        .where("data_devolucao_efetuada", "<=", dataFim)
        .get();
    const volumeTotalConsumido = devolucoesSnapshot.docs.reduce((acc, doc) => acc + (doc.data().medida_utilizada || 0), 0);
    const historicoSnapshot = await admin.firestore().collection("Historico_Frasco_Reagente")
        .where("id_almoxarifado", "==", idAlmoxarifado)
        .where("timestamp", ">=", dataInicio)
        .where("timestamp", "<=", dataFim)
        .orderBy("timestamp", "asc").get();
    const doc = new pdfkit_table_1.default({ margin: 30, size: "A4" });
    const buffer = await buildPdfBuffer(doc, historicoSnapshot.docs, volumeTotalConsumido);
    const fileName = `relatorios/almoxarifado_${idAlmoxarifado}_${mes}_${ano}_${Date.now()}.pdf`;
    const fileRef = admin.storage().bucket().file(fileName);
    await fileRef.save(buffer, { contentType: "application/pdf" });
    const [url] = await fileRef.getSignedUrl({ action: "read", expires: Date.now() + 3600000 });
    return { url };
});
exports.gerarRelatorioBensPredio = (0, https_1.onCall)(async (request) => {
    const filtros = request.data;
    (0, auth_1.validarPermissao)(request, ["Chefe_Geral", "Gestor_Bens_Patrimoniais"]);
    let query = admin.firestore().collection("Bem_Patrimonial").where("predio", "==", filtros.predio);
    if (filtros.andar)
        query = query.where("andar", "==", filtros.andar);
    if (filtros.sala)
        query = query.where("sala", "==", filtros.sala);
    if (filtros.estadoConservacao)
        query = query.where("estado_conservacao", "==", filtros.estadoConservacao);
    if (filtros.status)
        query = query.where("status", "==", filtros.status);
    const bensSnapshot = await query.get();
    const doc = new pdfkit_table_1.default({ size: "A4" });
    const buffer = await buildPredioPdfBuffer(doc, bensSnapshot.docs, filtros);
    const fileRef = admin.storage().bucket().file(`relatorios/predio_${filtros.predio}_${Date.now()}.pdf`);
    await fileRef.save(buffer, { contentType: "application/pdf" });
    const [url] = await fileRef.getSignedUrl({ action: "read", expires: Date.now() + 3600000 });
    return { url };
});
exports.gerarRelatorioPersonalizado = (0, https_1.onCall)(async (request) => {
    const { dataInicio, dataFim, entidade, prediosSelecionados } = request.data;
    (0, auth_1.validarPermissao)(request, ["Chefe_Geral", "Gestor_Bens_Patrimoniais", "Gestor_Almoxarifado"]);
    const dataIniObj = new Date(dataInicio);
    const dataFimObj = new Date(dataFim);
    let snapshot;
    if (entidade === "Bens_Patrimoniais") {
        let query = admin.firestore().collection("Historico_Bem_Patrimonial")
            .where("timestamp", ">=", dataIniObj)
            .where("timestamp", "<=", dataFimObj);
        if (prediosSelecionados && prediosSelecionados.length > 0) {
            query = query.where("predio", "in", prediosSelecionados);
        }
        snapshot = await query.get();
    }
    else {
        snapshot = await admin.firestore().collection("Emprestimo_Reagente")
            .where("data_devolucao_efetuada", ">=", dataIniObj)
            .where("data_devolucao_efetuada", "<=", dataFimObj)
            .get();
    }
    const doc = new pdfkit_table_1.default({ layout: "landscape", size: "A4" });
    const buffer = await buildPersonalizadoPdfBuffer(doc, snapshot.docs, entidade);
    const fileRef = admin.storage().bucket().file(`relatorios/personalizado_${Date.now()}.pdf`);
    await fileRef.save(buffer, { contentType: "application/pdf" });
    const [url] = await fileRef.getSignedUrl({ action: "read", expires: Date.now() + 3600000 });
    return { url };
});
//# sourceMappingURL=relatorios.js.map