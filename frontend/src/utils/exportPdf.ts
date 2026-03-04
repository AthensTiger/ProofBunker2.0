import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';

const PAPER_WIDTH_PX = 816;   // 8.5 in × 96 dpi (US Letter)
const LETTER_W_MM   = 215.9;  // 8.5 in → mm
const LETTER_H_MM   = 279.4;  // 11 in → mm

/**
 * Exports an HTML element as a letter-sized PDF.
 *
 * Temporarily forces the element to 816 px wide (= letter paper at 96 dpi)
 * so the two-column menu layout renders correctly regardless of device width,
 * then restores original styles immediately after capture.
 */
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  // Save inline styles we'll modify
  const saved = {
    width:        element.style.width,
    maxWidth:     element.style.maxWidth,
    boxShadow:    element.style.boxShadow,
    borderRadius: element.style.borderRadius,
  };

  // Force letter-paper width and strip screen-only decorations
  element.style.width        = `${PAPER_WIDTH_PX}px`;
  element.style.maxWidth     = `${PAPER_WIDTH_PX}px`;
  element.style.boxShadow    = 'none';
  element.style.borderRadius = '0';

  // Two rAF calls guarantee the browser has reflowed and painted at the new width
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );

  let dataUrl: string;
  try {
    dataUrl = await toJpeg(element, {
      quality: 0.92,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });
  } finally {
    // Restore original styles immediately so the flash is imperceptible
    element.style.width        = saved.width;
    element.style.maxWidth     = saved.maxWidth;
    element.style.boxShadow    = saved.boxShadow;
    element.style.borderRadius = saved.borderRadius;
  }

  // Load the JPEG to get its pixel dimensions
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload  = () => resolve(i);
    i.onerror = () => reject(new Error('Failed to load captured image.'));
    i.src = dataUrl;
  });

  const imgHeightMm = (img.naturalHeight * LETTER_W_MM) / img.naturalWidth;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  let remaining = imgHeightMm;
  let yOffset   = 0;
  while (remaining > 0) {
    pdf.addImage(dataUrl, 'JPEG', 0, yOffset, LETTER_W_MM, imgHeightMm);
    remaining -= LETTER_H_MM;
    if (remaining > 0) {
      pdf.addPage();
      yOffset -= LETTER_H_MM;
    }
  }

  // iOS Safari doesn't support <a download> — open blob URL in new tab
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    window.open(URL.createObjectURL(pdf.output('blob')), '_blank');
  } else {
    pdf.save(filename);
  }
}
