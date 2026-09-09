/**
 * Abre um PDF gerado no backend a partir do seu conteúdo em Base64.
 * 
 * @param base64 String em base64 com o conteúdo do PDF.
 */
export function openPdfFromBase64(base64: string) {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([array], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
