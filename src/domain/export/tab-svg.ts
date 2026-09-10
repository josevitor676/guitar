import type { TabSheet, TabLayout, DrawItem } from './tab-layout';
import { layoutTabSheet, NOTES_PER_SYSTEM } from './tab-layout';

const INK = '#111111';
const PAPER = '#ffffff';
const FONT = 'DejaVu Sans, Arial, Helvetica, sans-serif';

/** SVG text is markup, so a title with a bracket in it would tear the document. */
function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function itemSvg(item: DrawItem): string {
  switch (item.kind) {
    case 'line': {
      const marker = 'string' in item ? ` data-string-line="${item.string}"` : '';
      return `<line${marker} x1="${item.x1}" y1="${item.y1}" x2="${item.x2}" y2="${item.y2}" stroke="${INK}" stroke-width="1.1" />`;
    }
    case 'erase':
      return `<rect x="${item.x}" y="${item.y}" width="${item.width}" height="${item.height}" fill="${PAPER}" />`;
    case 'text':
      return `<text x="${item.x}" y="${item.y}" text-anchor="${item.align === 'center' ? 'middle' : 'start'}" font-family="${FONT}" font-size="${item.size}"${item.bold ? ' font-weight="bold"' : ''} fill="${INK}">${escapeText(item.text)}</text>`;
  }
}

export function layoutToSvg(layout: TabLayout): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}">
<rect width="100%" height="100%" fill="${PAPER}" />
${layout.items.map(itemSvg).join('\n')}
</svg>`;
}

export function tabSheetSvg(sheet: TabSheet, perSystem: number = NOTES_PER_SYSTEM): string {
  return layoutToSvg(layoutTabSheet(sheet, perSystem));
}
