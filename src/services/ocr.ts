import type { OcrToken } from '../domain/import/image.types';

export type OcrProgress = (fraction: number) => void;

/**
 * Reads the fret numbers off a rendered page.
 *
 * Tesseract is restricted to digits and told to expect sparse text, which is
 * what a tablature is — scattered numbers, not prose. Everything else it might
 * hallucinate is filtered downstream by the parser's geometry checks.
 */
export async function recognizeDigits(
  canvas: HTMLCanvasElement,
  onProgress?: OcrProgress,
): Promise<OcrToken[]> {
  // Loaded on demand: Tesseract and its language data are large, and a student
  // who never imports a file should never pay for them.
  const { createWorker, PSM } = await import('tesseract.js');

  const worker = await createWorker('eng', undefined, {
    logger: (message) => {
      if (message.status === 'recognizing text' && onProgress) onProgress(message.progress);
    },
  });

  try {
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789',
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    });

    const { data } = await worker.recognize(canvas, undefined, { blocks: true });
    const words = (data.blocks ?? []).flatMap((block) =>
      block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words)),
    );

    return words.map((word) => ({
      text: word.text.trim(),
      x: (word.bbox.x0 + word.bbox.x1) / 2,
      y: (word.bbox.y0 + word.bbox.y1) / 2,
    }));
  } finally {
    await worker.terminate();
  }
}
