import type { OcrToken } from '../domain/import/image.types';

export type DigitReader = (canvas: HTMLCanvasElement) => Promise<OcrToken[]>;

/**
 * Runs `use` with a reader that recognizes fret numbers, then disposes the
 * engine. The reader is reusable: a page holds several tablature systems and
 * each is read separately, and spinning up a worker per strip would dominate
 * the running time.
 */
export async function withDigitReader<T>(use: (read: DigitReader) => Promise<T>): Promise<T> {
  // Loaded on demand: Tesseract and its language data are large, and a student
  // who never imports a file should never pay for them.
  const { createWorker, PSM } = await import('tesseract.js');

  const worker = await createWorker('eng');
  try {
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789',
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      // Without a declared resolution Tesseract guesses one from the content,
      // and on a mostly blank tablature strip it guesses badly and drops digits.
      user_defined_dpi: '300',
    });

    return await use(async (canvas) => {
      const { data } = await worker.recognize(canvas, undefined, { blocks: true });
      const words = (data.blocks ?? []).flatMap((block) =>
        block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words)),
      );

      return words
        .map((word) => ({
          text: word.text.trim(),
          x: (word.bbox.x0 + word.bbox.x1) / 2,
          y: (word.bbox.y0 + word.bbox.y1) / 2,
        }))
        .filter((token) => token.text.length > 0);
    });
  } finally {
    await worker.terminate();
  }
}
