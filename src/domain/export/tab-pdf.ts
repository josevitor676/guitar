import type { TabSheet, TabLayout, DrawItem } from './tab-layout';
import { layoutTabSheet, NOTES_PER_SYSTEM } from './tab-layout';

/**
 * The sheet as a real PDF, drawn with the format's own line and text
 * operators rather than as an embedded picture.
 *
 * Rasterising would have been less code, but a tablature sheet is lines and
 * digits — exactly what PDF draws natively — and a student printing it wants
 * it crisp. Vector output also keeps the file at a few kilobytes.
 */

/** Helvetica's digits are all this wide, in thousandths of the font size. */
const DIGIT_WIDTH = 0.556;
const FONT_REGULAR = 'F1';
const FONT_BOLD = 'F2';

/** Inside a PDF string, these three characters would end or escape it. */
function escapeString(text: string): string {
  return text.replace(/[\\()]/g, (character) => `\\${character}`);
}

/**
 * Rough enough to centre digits exactly, which is all that is centred here.
 * Everything else on the sheet is left-aligned, where width does not matter.
 */
function textWidth(text: string, size: number): number {
  return text.length * DIGIT_WIDTH * size;
}

function itemOperators(item: DrawItem, height: number): string {
  // PDF measures from the bottom of the page; the layout measures from the top.
  const flip = (y: number) => height - y;

  switch (item.kind) {
    case 'line':
      return `${item.x1} ${flip(item.y1)} m\n${item.x2} ${flip(item.y2)} l\nS`;
    case 'erase':
      return `1 1 1 rg\n${item.x} ${flip(item.y + item.height)} ${item.width} ${item.height} re\nf\n0 0 0 rg`;
    case 'text': {
      const x = item.align === 'center' ? item.x - textWidth(item.text, item.size) / 2 : item.x;
      const font = item.bold ? FONT_BOLD : FONT_REGULAR;
      return `BT\n/${font} ${item.size} Tf\n${x} ${flip(item.y)} Td\n(${escapeString(item.text)}) Tj\nET`;
    }
  }
}

function contentStream(layout: TabLayout): string {
  return ['0 0 0 RG', '1.1 w', ...layout.items.map((item) => itemOperators(item, layout.height))].join(
    '\n',
  );
}

/**
 * Helvetica is a built-in PDF font read as WinAnsi, which is Latin-1. The
 * app's own text is Portuguese, so the accents matter; anything outside that
 * range becomes a question mark rather than a corrupt file.
 */
function toLatin1(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    bytes[i] = code <= 0xff ? code : 0x3f;
  }
  return bytes;
}

export function layoutToPdf(layout: TabLayout): Uint8Array {
  const content = contentStream(layout);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${layout.width} ${layout.height}] ` +
      `/Resources << /Font << /${FONT_REGULAR} 5 0 R /${FONT_BOLD} 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${toLatin1(content).length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];

  let file = '%PDF-1.4\n';
  // Every object's byte offset goes in the cross-reference table, and a reader
  // that finds the wrong offset there refuses the file outright.
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(toLatin1(file).length);
    file += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = toLatin1(file).length;
  const pad = (offset: number) => String(offset).padStart(10, '0');
  file += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  file += offsets.map((offset) => `${pad(offset)} 00000 n \n`).join('');
  file += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return toLatin1(file);
}

export function tabSheetPdf(sheet: TabSheet, perSystem: number = NOTES_PER_SYSTEM): Uint8Array {
  return layoutToPdf(layoutTabSheet(sheet, perSystem));
}
