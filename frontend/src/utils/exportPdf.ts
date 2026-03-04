import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Captures an HTML element and exports it as a multi-page A4 PDF.
 * Uses scale: 2 for 2× resolution (looks sharp on retina / print).
 * On iOS Safari, opens the PDF in a new tab (download attr not supported).
 */
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,       // render cross-origin images even if canvas is tainted
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 15000,
  });

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error('Menu content could not be captured (canvas is empty).');
  }

  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;

  const imgWidthMm = A4_WIDTH_MM;
  const imgHeightMm = (canvas.height * A4_WIDTH_MM) / canvas.width;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Use PNG for lossless when allowTaint is on (toDataURL may throw for tainted canvas with jpeg)
  let imgData: string;
  try {
    imgData = canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    // Canvas tainted by cross-origin image — fall back to PNG (also tainted, will throw)
    // In that case we skip images via a second pass
    throw new Error(
      'A cross-origin image (e.g. logo) prevented PDF export. Try disabling the logo watermark.'
    );
  }

  let remainingHeight = imgHeightMm;
  let yOffset = 0;

  while (remainingHeight > 0) {
    pdf.addImage(imgData, 'JPEG', 0, yOffset, imgWidthMm, imgHeightMm);
    remainingHeight -= A4_HEIGHT_MM;
    if (remainingHeight > 0) {
      pdf.addPage();
      yOffset -= A4_HEIGHT_MM;
    }
  }

  // iOS Safari doesn't honour the <a download> attribute — open in new tab instead
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } else {
    pdf.save(filename);
  }
}
