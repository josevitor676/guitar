import type { Band } from '../domain/import/band';

/**
 * Cuts one band out of the page and enlarges it.
 *
 * The enlargement matters: fret numbers are small, and Tesseract reads a
 * upscaled digit far more reliably than the original.
 */
export function cropBand(page: HTMLCanvasElement, band: Band): HTMLCanvasElement {
  const strip = document.createElement('canvas');
  strip.width = page.width * band.scale;
  strip.height = band.height * band.scale;

  const context = strip.getContext('2d');
  if (context) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, strip.width, strip.height);
    context.drawImage(page, 0, band.top, page.width, band.height, 0, 0, strip.width, strip.height);
  }

  return strip;
}

/**
 * Cuts one digit out of the page, enlarged and padded.
 *
 * The padding matters as much as the enlargement: Tesseract expects a margin
 * of quiet space around a character and reads a flush-cropped digit poorly.
 */
export function cropDigit(
  page: HTMLCanvasElement,
  box: { x0: number; y0: number; x1: number; y1: number },
  scale: number,
  padding: number,
): HTMLCanvasElement {
  const sourceWidth = box.x1 - box.x0;
  const sourceHeight = box.y1 - box.y0;

  const crop = document.createElement('canvas');
  crop.width = sourceWidth * scale + padding * 2;
  crop.height = sourceHeight * scale + padding * 2;

  const context = crop.getContext('2d');
  if (context) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, crop.width, crop.height);
    context.drawImage(
      page,
      box.x0,
      box.y0,
      sourceWidth,
      sourceHeight,
      padding,
      padding,
      sourceWidth * scale,
      sourceHeight * scale,
    );
  }

  return crop;
}
