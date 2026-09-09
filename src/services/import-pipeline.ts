import type { FretPosition } from '../domain/music-theory/tuning';
import type { OcrToken } from '../domain/import/image.types';
import { detectTabSystems } from '../domain/import/staff-detection';
import { positionsFromTokens } from '../domain/import/tab-parser';
import { findDigitBoxes, scaleForBox } from '../domain/import/digit-segmentation';
import { rasterizeFile } from './rasterize';
import { withDigitReader } from './ocr';
import { cropDigit } from './crop';
import { toGrayImage } from './grayscale';

export const NO_TAB_FOUND_MESSAGE =
  'Não encontrei uma tablatura nesse arquivo. Tente uma imagem mais nítida, ' +
  'com as seis linhas da tablatura retas e bem visíveis.';

export const DIGITS_UNREADABLE_MESSAGE =
  'Achei as linhas da tablatura, mas não consegui ler os números das casas. ' +
  'Tente uma imagem maior ou mais nítida.';

/**
 * Every digit is resized to this height before recognition, so a page scanned
 * at one resolution and a PDF rasterized at another are read the same way.
 */
const OCR_TARGET_DIGIT_HEIGHT = 110;
/** Tesseract wants quiet space around a character, in output pixels. */
const OCR_PADDING = 24;

export interface ImportProgress {
  label: string;
  fraction: number;
}

type ProgressReporter = (progress: ImportProgress) => void;

function grayFromCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não consegui ler os pixels dessa página.');
  return toGrayImage(context.getImageData(0, 0, canvas.width, canvas.height));
}

/**
 * Reads an uploaded exercise into a playable sequence.
 *
 * Each fret number is located geometrically first and only then recognized, one
 * tight crop at a time. Handed a whole sheet — or even a whole tablature system
 * — Tesseract's layout analysis discards most of the digits, badly enough that
 * a sparse system reads as empty. Handed a single isolated digit it is
 * reliable. The geometry this needs is already on hand, since the systems must
 * be located before a digit can be assigned to a string at all.
 */
export async function importTabFromFile(
  file: File,
  onProgress?: ProgressReporter,
): Promise<FretPosition[]> {
  onProgress?.({ label: 'Preparando o arquivo', fraction: 0 });
  const pages = await rasterizeFile(file);

  const positions: FretPosition[] = [];
  let systemsSeen = 0;

  await withDigitReader(async (read) => {
    for (const [pageIndex, canvas] of pages.entries()) {
      const pageLabel = pages.length > 1 ? ` (página ${pageIndex + 1} de ${pages.length})` : '';
      const gray = grayFromCanvas(canvas);
      const systems = detectTabSystems(gray);
      systemsSeen += systems.length;

      const boxes = systems.flatMap((system) =>
        findDigitBoxes(gray, system).map((box) => ({ box, system })),
      );

      const tokens: OcrToken[] = [];
      for (const [boxIndex, { box }] of boxes.entries()) {
        onProgress?.({
          label: `Lendo a tablatura${pageLabel}`,
          fraction: (pageIndex + boxIndex / Math.max(1, boxes.length)) / pages.length,
        });

        const found = await read(
          cropDigit(canvas, box, scaleForBox(box, OCR_TARGET_DIGIT_HEIGHT), OCR_PADDING),
        );
        // The crop holds exactly one number, so its text is whatever came back,
        // and its position on the page is the box it was cut from.
        const text = found.map((token) => token.text).join('');
        if (text) {
          tokens.push({ text, x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 });
        }
      }

      positions.push(...positionsFromTokens(tokens, systems));
    }
  });

  if (positions.length === 0) {
    // Which failure it was matters to the student: a page with no tablature is
    // the wrong file, while unreadable digits is the same file, scanned better.
    throw new Error(systemsSeen === 0 ? NO_TAB_FOUND_MESSAGE : DIGITS_UNREADABLE_MESSAGE);
  }

  onProgress?.({ label: 'Pronto', fraction: 1 });
  return positions;
}
