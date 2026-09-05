import * as path from "path";
import * as fs from "fs";
import { COLORS, FONTS } from "./pdfStyles";

export function addHeader(doc: any, title: string, subtitle: string) {
  const logoPath = path.resolve(__dirname, "../../assets/logo-uenf.png");
  let hasLogo = false;

  if (fs.existsSync(logoPath)) {
    try {
      // Draw image
      doc.image(logoPath, 30, 30, { width: 60 });
      hasLogo = true;
    } catch (e) {
      console.error("Error drawing logo", e);
    }
  }

  // Draw header text
  const textX = hasLogo ? 100 : 30;
  
  doc.font(FONTS.bold)
     .fontSize(14)
     .fillColor(COLORS.primary)
     .text("UNIVERSIDADE ESTADUAL DO NORTE FLUMINENSE", textX, 35);
     
  doc.fontSize(12)
     .text("LABORATÓRIO DE CIÊNCIAS QUÍMICAS (LCQUI)", textX, 55);
     
  doc.fontSize(12)
     .fillColor(COLORS.secondary)
     .text(title.toUpperCase(), textX, 75);

  doc.moveDown(2);
  
  // Draw separator line
  doc.moveTo(30, 105)
     .lineTo(doc.page.width - 30, 105)
     .strokeColor(COLORS.primary)
     .lineWidth(2)
     .stroke();

  doc.moveDown();
  
  if (subtitle) {
    doc.font(FONTS.regular)
       .fontSize(10)
       .fillColor(COLORS.text)
       .text(subtitle, 30, 115, { align: 'left' });
    doc.moveDown(2);
  }
}
