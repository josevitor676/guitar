/** A single-channel grayscale image: one byte per pixel, 0 = black, 255 = white. */
export interface GrayImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * One tablature system: exactly six lines, ordered top to bottom, so
 * lineYs[0] is string 1 (the high E) and lineYs[5] is string 6.
 */
export interface TabSystem {
  lineYs: number[];
  top: number;
  bottom: number;
}

/** One word the OCR engine read, reduced to its text and the center of its box. */
export interface OcrToken {
  text: string;
  x: number;
  y: number;
}
