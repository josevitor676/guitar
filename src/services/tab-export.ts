import type { TabSheet } from '../domain/export/tab-layout';
import { tabSheetSvg } from '../domain/export/tab-svg';
import { tabSheetPdf } from '../domain/export/tab-pdf';
import { sheetFileName } from '../domain/export/file-name';

/** Printed sheets are read at arm's length; twice the layout size holds up. */
const PNG_SCALE = 2;

/**
 * Rasterises the sheet by handing the SVG to the browser's own renderer.
 *
 * The SVG goes in as a data URL rather than a blob URL because a blob URL
 * belongs to the page's origin, and an <img> loading one taints the canvas it
 * is drawn onto — which would make toBlob throw at the last step.
 */
async function svgToPng(svg: string, scale: number): Promise<Blob> {
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Não consegui desenhar a tablatura.'));
    element.src = source;
  });

  const canvas = document.createElement('canvas');
  canvas.width = image.width * scale;
  canvas.height = image.height * scale;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não consegui desenhar a tablatura.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Não consegui gerar a imagem.'))),
      'image/png',
    );
  });
}

function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadTabImage(sheet: TabSheet): Promise<void> {
  const blob = await svgToPng(tabSheetSvg(sheet), PNG_SCALE);
  saveBlob(blob, sheetFileName(sheet.title, 'png'));
}

export async function downloadTabPdf(sheet: TabSheet): Promise<void> {
  const bytes = tabSheetPdf(sheet);
  saveBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), sheetFileName(sheet.title, 'pdf'));
}
