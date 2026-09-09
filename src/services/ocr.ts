import type { OcrToken } from '../domain/import/image.types';

export type DigitReader = (canvas: HTMLCanvasElement) => Promise<OcrToken[]>;

export interface TabReaders {
  /** Reads a crop as a fret number. */
  readDigits: DigitReader;
  /**
   * Reads a crop holding a slur letter *and its neighbouring digits*, which is
   * the only way Tesseract recognises the letter at all.
   */
  readSlurInContext: DigitReader;
}

/**
 * Runs `use` with a reader that recognizes fret numbers, then disposes the
 * engine. The reader is reusable: a page holds several tablature systems and
 * each is read separately, and spinning up a worker per strip would dominate
 * the running time.
 */
export async function withDigitReader<T>(use: (readers: TabReaders) => Promise<T>): Promise<T> {
  // Loaded on demand: Tesseract and its language data are large, and a student
  // who never imports a file should never pay for them.
  const { createWorker, PSM } = await import('tesseract.js');

  const worker = await createWorker('eng');
  try {
    const recognizeWith = async (whitelist: string, canvas: HTMLCanvasElement) => {
      await worker.setParameters({
        tessedit_char_whitelist: whitelist,
        // Every image handed to these readers is one mark, already cropped to
        // its own box. SPARSE_TEXT hunts for scattered text across a page and
        // returns nothing for a lone character; SINGLE_WORD reads the crop as
        // the one word it is, which keeps a two-digit fret like "12" intact
        // where SINGLE_CHAR would truncate it.
        tessedit_pageseg_mode: PSM.SINGLE_WORD,
        // Without a declared resolution Tesseract guesses one from the content,
        // and on a mostly blank tablature crop it guesses badly.
        user_defined_dpi: '300',
      });

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
    };

    return await use({
      readDigits: (canvas) => recognizeWith('0123456789', canvas),
      // Kept to its own pass: letters in the digit whitelist cost accuracy on
      // the numbers, and the numbers are what must not be wrong. This pass runs
      // only on the handful of crops the digit pass could not read.
      readSlurInContext: (canvas) => recognizeWith('0123456789hpbs/\\', canvas),
    });
  } finally {
    await worker.terminate();
  }
}
