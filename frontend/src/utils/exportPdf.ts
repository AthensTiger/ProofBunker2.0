import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';

/**
 * Captures an HTML element and exports it as a multi-page A4 PDF.
 * Uses html-to-image (SVG foreignObject) which supports all modern CSS
 * including oklab/oklch colors used by Tailwind CSS v3+.
 */
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await toCanvas(element, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    // Skip cross-origin images that would taint the canvas
    filter: (node) => {
      if (node instanceof HTMLImageElement) {
        try {
          // Allow same-origin and data: images; skip cross-origin
          const url = new URL(node.src, window.location.href);
          return url.origin === window.location.origin || node.src.startsWith('data:');
        } catch {
          return false;
        }
      }
      return true;
    },
  });

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error('Menu content could not be captured (canvas is empty).');
  }

  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;

  const imgWidthMm = A4_WIDTH_MM;
  const imgHeightMm = (canvas.height * A4_WIDTH_MM) / canvas.width;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const imgData = canvas.toDataURL('image/jpeg', 0.92);

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
