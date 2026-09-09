import type { FretPosition } from '../domain/music-theory/tuning';
import type { OcrToken } from '../domain/import/image.types';
import { detectTabSystems } from '../domain/import/staff-detection';
import { positionsFromTokens } from '../domain/import/tab-parser';
import { bandForSystem, tokenToPageSpace } from '../domain/import/band';
import { rasterizeFile } from './rasterize';
import { withDigitReader } from './ocr';
import { cropBand } from './crop';
import { toGrayImage } from './grayscale';

export const NO_TAB_FOUND_MESSAGE =
  'Não encontrei uma tablatura nesse arquivo. Tente uma imagem mais nítida, ' +
  'com as seis linhas da tablatura retas e bem visíveis.';

export const DIGITS_UNREADABLE_MESSAGE =
  'Achei as linhas da tablatura, mas não consegui ler os números das casas. ' +
  'Tente uma imagem maior ou mais nítida — números pequenos ou poucos números ' +
  'soltos na página costumam não ser reconhecidos.';

/** Fret numbers are small; the OCR reads them far better enlarged. */
const OCR_SCALE = 3;

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
 * The OCR is pointed at one tablature system at a time rather than at the whole
 * page. Handed a full sheet, Tesseract's layout analysis discards most of the
 * fret numbers; handed a single cropped, enlarged system it reads them all. The
 * geometry needed for that crop is already known, since the systems have to be
 * located before the digits can be assigned to strings anyway.
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
      const systems = detectTabSystems(grayFromCanvas(canvas));
      systemsSeen += systems.length;

      const tokens: OcrToken[] = [];
      for (const [systemIndex, system] of systems.entries()) {
        onProgress?.({
          label: `Lendo a tablatura${pageLabel}`,
          fraction: (pageIndex + systemIndex / systems.length) / pages.length,
        });

        const band = bandForSystem(system, canvas.height, OCR_SCALE);
        const found = await read(cropBand(canvas, band));
        tokens.push(...found.map((token) => tokenToPageSpace(token, band)));
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
