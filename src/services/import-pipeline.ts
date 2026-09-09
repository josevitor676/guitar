import type { FretPosition } from '../domain/music-theory/tuning';
import { detectTabSystems } from '../domain/import/staff-detection';
import { positionsFromTokens } from '../domain/import/tab-parser';
import { rasterizeFile } from './rasterize';
import { recognizeDigits } from './ocr';
import { toGrayImage } from './grayscale';

export const NO_TAB_FOUND_MESSAGE =
  'Não encontrei uma tablatura nesse arquivo. Tente uma imagem mais nítida, ' +
  'com as seis linhas da tablatura retas e bem visíveis.';

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
 * Pages are concatenated in order, so a multi-page PDF reads as one sequence,
 * exactly as a student would play it.
 */
export async function importTabFromFile(
  file: File,
  onProgress?: ProgressReporter,
): Promise<FretPosition[]> {
  onProgress?.({ label: 'Preparando o arquivo', fraction: 0 });
  const pages = await rasterizeFile(file);

  const positions: FretPosition[] = [];

  for (const [index, canvas] of pages.entries()) {
    const pageLabel = pages.length > 1 ? ` (página ${index + 1} de ${pages.length})` : '';
    onProgress?.({ label: `Lendo a tablatura${pageLabel}`, fraction: index / pages.length });

    const systems = detectTabSystems(grayFromCanvas(canvas));
    if (systems.length === 0) continue;

    const tokens = await recognizeDigits(canvas, (fraction) =>
      onProgress?.({
        label: `Lendo a tablatura${pageLabel}`,
        fraction: (index + fraction) / pages.length,
      }),
    );

    positions.push(...positionsFromTokens(tokens, systems));
  }

  if (positions.length === 0) throw new Error(NO_TAB_FOUND_MESSAGE);

  onProgress?.({ label: 'Pronto', fraction: 1 });
  return positions;
}
