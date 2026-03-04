import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';

const PAPER_WIDTH_PX = 816;   // 8.5 inches × 96 dpi (US Letter)
const LETTER_W_MM   = 215.9;  // 8.5 in → mm
const LETTER_H_MM   = 279.4;  // 11 in → mm

/**
 * Renders `element` at a fixed 816 px (letter-paper) width in an off-screen
 * container, waits for reflow, then exports as a properly-sized PDF.
 */
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  // 1. Off-screen wrapper — absolute (not fixed) so scrollHeight works correctly
  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
    position: 'absolute',
    top: '-9999px',
    left: '0',
    width: `${PAPER_WIDTH_PX}px`,
    background: 'white',
  });

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
    // 2. Wait for the browser to reflow the cloned element at 816 px
    await new Promise<void>((resolve) => setTimeout(resolve, 150));

    const contentHeight = wrapper.scrollHeight;
    if (contentHeight === 0) {
      throw new Error('Menu content could not be measured (height is 0).');
    }

    // 3. Capture with explicit dimensions so html-to-image never guesses size
    const canvas = await toCanvas(wrapper, {
      pixelRatio: 2,
      width: PAPER_WIDTH_PX,
      height: contentHeight,
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

    // 4. Multi-page letter PDF
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

    // 5. iOS Safari: open blob URL in new tab (no <a download> support)
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
