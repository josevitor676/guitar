import type { OcrToken, TabSystem } from './image.types';

/** A horizontal slice of the page, upscaled, that is handed to the OCR engine. */
export interface Band {
  top: number;
  height: number;
  scale: number;
}

export function bandForSystem(system: TabSystem, pageHeight: number, scale: number): Band {
  const top = Math.max(0, Math.floor(system.top));
  const height = Math.min(pageHeight - top, Math.ceil(system.bottom - system.top));
  return { top, height, scale };
}

/** Maps a token read from a cropped, upscaled strip back onto the full page. */
export function tokenToPageSpace(token: OcrToken, band: Band): OcrToken {
  return {
    text: token.text,
    x: token.x / band.scale,
    y: token.y / band.scale + band.top,
  };
}
