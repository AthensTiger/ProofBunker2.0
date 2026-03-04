import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Captures an HTML element and exports it as a multi-page A4 PDF.
 * Uses scale: 2 for 2× resolution (looks sharp on retina / print).
 */
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,          // allow cross-origin images (logos from R2)
    backgroundColor: '#ffffff',
    logging: false,
  });

  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;

  // Scale canvas to A4 width (in mm)
  const imgWidthMm = A4_WIDTH_MM;
  const imgHeightMm = (canvas.height * A4_WIDTH_MM) / canvas.width;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const imgData = canvas.toDataURL('image/jpeg', 0.92);

  let remainingHeight = imgHeightMm;
  let yOffset = 0; // position within the canvas image (negative = shifted up)

  while (remainingHeight > 0) {
    pdf.addImage(imgData, 'JPEG', 0, yOffset, imgWidthMm, imgHeightMm);
    remainingHeight -= A4_HEIGHT_MM;
    if (remainingHeight > 0) {
      pdf.addPage();
      yOffset -= A4_HEIGHT_MM;
    }
  }

  pdf.save(filename);
}
