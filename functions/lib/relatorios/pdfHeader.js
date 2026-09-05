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
exports.addHeader = addHeader;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const pdfStyles_1 = require("./pdfStyles");
function addHeader(doc, title, subtitle) {
    const logoPath = path.resolve(__dirname, "../../assets/logo-uenf.png");
    let hasLogo = false;
    if (fs.existsSync(logoPath)) {
        try {
            // Draw image
            doc.image(logoPath, 30, 30, { width: 60 });
            hasLogo = true;
        }
        catch (e) {
            console.error("Error drawing logo", e);
        }
    }
    // Draw header text
    const textX = hasLogo ? 100 : 30;
    doc.font(pdfStyles_1.FONTS.bold)
        .fontSize(14)
        .fillColor(pdfStyles_1.COLORS.primary)
        .text("UNIVERSIDADE ESTADUAL DO NORTE FLUMINENSE", textX, 35);
    doc.fontSize(12)
        .text("LABORATÓRIO DE CIÊNCIAS QUÍMICAS (LCQUI)", textX, 55);
    doc.fontSize(12)
        .fillColor(pdfStyles_1.COLORS.secondary)
        .text(title.toUpperCase(), textX, 75);
    doc.moveDown(2);
    // Draw separator line
    doc.moveTo(30, 105)
        .lineTo(doc.page.width - 30, 105)
        .strokeColor(pdfStyles_1.COLORS.primary)
        .lineWidth(2)
        .stroke();
    doc.moveDown();
    if (subtitle) {
        doc.font(pdfStyles_1.FONTS.regular)
            .fontSize(10)
            .fillColor(pdfStyles_1.COLORS.text)
            .text(subtitle, 30, 115, { align: 'left' });
        doc.moveDown(2);
    }
}
//# sourceMappingURL=pdfHeader.js.map