export const UNSUPPORTED_FILE_MESSAGE =
  'Formato não suportado. Envie uma imagem (PNG, JPG) ou um PDF da tablatura.';

/** A book-length PDF would freeze the tab; an exercise never runs this long. */
const MAX_PDF_PAGES = 5;
/** Rendering above the PDF's natural size gives the OCR sharper digits to read. */
const PDF_RENDER_SCALE = 2;

function canvasFromImage(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext('2d')?.drawImage(image, 0, 0);
  return canvas;
}

async function rasterizeImage(file: File): Promise<HTMLCanvasElement[]> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Não consegui abrir essa imagem.'));
      image.src = url;
    });
    return [canvasFromImage(image)];
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function rasterizePdf(file: File): Promise<HTMLCanvasElement[]> {
  // Loaded on demand so pdf.js never reaches the bundle of a student who
  // does not import files.
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const document_ = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pageCount = Math.min(document_.numPages, MAX_PDF_PAGES);
  const canvases: HTMLCanvasElement[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await document_.getPage(pageNumber);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext('2d');
    if (context) {
      await page.render({ canvas, canvasContext: context, viewport }).promise;
    }
    canvases.push(canvas);
  }

  return canvases;
}

/** Turns an uploaded exercise into one canvas per page, ready for OCR. */
export async function rasterizeFile(file: File): Promise<HTMLCanvasElement[]> {
  if (file.type.startsWith('image/')) return rasterizeImage(file);
  if (file.type === 'application/pdf') return rasterizePdf(file);
  throw new Error(UNSUPPORTED_FILE_MESSAGE);
}
