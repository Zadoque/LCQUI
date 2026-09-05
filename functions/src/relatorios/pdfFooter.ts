import { COLORS, FONTS } from "./pdfStyles";
import * as crypto from "crypto";

/**
 * Aplica o rodapé em todas as páginas e calcula o hash.
 * Deve ser chamado APÓS o preenchimento de todas as tabelas e conteúdo,
 * porém ANTES do doc.end().
 * 
 * @param doc A instância do PDFDocument (deve ter { bufferPages: true })
 * @param payloadCanonico String determinística gerada com os dados críticos do relatório.
 */
export function addFooterAndHash(doc: any, payloadCanonico: string) {
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
       .strokeColor(COLORS.border)
       .lineWidth(1)
       .stroke();

    doc.font(FONTS.regular)
       .fontSize(8)
       .fillColor(COLORS.secondary);

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
