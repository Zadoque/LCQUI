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
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFooterAndHash = addFooterAndHash;
const pdfStyles_1 = require("./pdfStyles");
const crypto = __importStar(require("crypto"));
/**
 * Aplica o rodapé em todas as páginas e calcula o hash.
 * Deve ser chamado APÓS o preenchimento de todas as tabelas e conteúdo,
 * porém ANTES do doc.end().
 *
 * @param doc A instância do PDFDocument (deve ter { bufferPages: true })
 * @param payloadCanonico String determinística gerada com os dados críticos do relatório.
 */
function addFooterAndHash(doc, payloadCanonico) {
    // 1. Gera o hash do payload canônico para garantir integridade contábil
    const hash = crypto.createHash("sha256").update(payloadCanonico).digest("hex");
    const shortHash = hash.substring(0, 16).toUpperCase();
    // 2. Itera sobre as páginas armazenadas no buffer
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        // Configura a margem inferior para o rodapé
        const bottomY = doc.page.height - 50;
        // Linha separadora do rodapé
        doc.moveTo(30, bottomY - 10)
            .lineTo(doc.page.width - 30, bottomY - 10)
            .strokeColor(pdfStyles_1.COLORS.border)
            .lineWidth(1)
            .stroke();
        doc.font(pdfStyles_1.FONTS.regular)
            .fontSize(8)
            .fillColor(pdfStyles_1.COLORS.secondary);
        // Texto de Autenticidade (Esquerda)
        doc.text(`Cód. Autenticidade: ${shortHash}`, 30, bottomY, {
            align: 'left',
            width: 200
        });
        // Assinaturas (Centro) - opcional para impressão
        doc.text(`_________________________________`, 0, bottomY - 5, { align: 'center' });
        doc.text(`Assinatura do Responsável`, 0, bottomY + 5, { align: 'center' });
        // Paginação (Direita)
        doc.text(`Página ${i + 1} de ${range.count}`, doc.page.width - 150, bottomY, {
            align: 'right',
            width: 120
        });
    }
}
//# sourceMappingURL=pdfFooter.js.map