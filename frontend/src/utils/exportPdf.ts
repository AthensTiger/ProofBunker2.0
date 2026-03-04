import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';

// US Letter paper at 96 DPI screen resolution
const PAPER_WIDTH_PX = 816;   // 8.5 inches × 96 dpi
const LETTER_W_MM   = 215.9;  // 8.5 inches in mm
const LETTER_H_MM   = 279.4;  // 11 inches in mm

/**
 * Renders `element` into an off-screen 816 px-wide container (= letter paper
 * at 96 dpi), then exports as a properly-sized downloadable PDF.
 * Uses html-to-image (SVG foreignObject) so modern CSS (oklab, etc.) works.
 */
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  // 1. Build an off-screen wrapper fixed at letter-paper width
  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
    position: 'fixed',
    top: '0',
    left: '-9999px',
    width: `${PAPER_WIDTH_PX}px`,
    background: 'white',
    zIndex: '-9999',
  });

  // 2. Clone the menu element and strip screen-only visual treatments
  const clone = element.cloneNode(true) as HTMLElement;
  Object.assign(clone.style, {
    width: '100%',
    maxWidth: '100%',
    boxShadow: 'none',
    borderRadius: '0',
  });

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    // 3. Capture at 2× pixel ratio for crisp text (≈ 192 effective DPI)
    const canvas = await toCanvas(wrapper, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      // Skip cross-origin images (e.g. R2 logo watermark) to avoid canvas taint
      filter: (node) => {
        if (node instanceof HTMLImageElement) {
          try {
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

    // 4. Build multi-page letter PDF
    const imgHeightMm = (canvas.height * LETTER_W_MM) / canvas.width;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    let remaining = imgHeightMm;
    let yOffset = 0;
    while (remaining > 0) {
      pdf.addImage(imgData, 'JPEG', 0, yOffset, LETTER_W_MM, imgHeightMm);
      remaining -= LETTER_H_MM;
      if (remaining > 0) {
        pdf.addPage();
        yOffset -= LETTER_H_MM;
      }
    }

    // 5. Save — iOS Safari must open in new tab (no <a download> support)
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      window.open(URL.createObjectURL(pdf.output('blob')), '_blank');
    } else {
      pdf.save(filename);
    }
  } finally {
    document.body.removeChild(wrapper);
  }
}
