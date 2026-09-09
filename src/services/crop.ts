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
