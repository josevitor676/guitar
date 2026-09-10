import { describe, it, expect } from 'vitest';
import { tabSheetPdf } from './tab-pdf';
import type { TabSheet } from './tab-layout';

const sheet: TabSheet = {
  title: 'Célula 3-5-7 repetida',
  bpm: 120,
  subdivision: 'eighth',
  positions: [
    { string: 6, fret: 3 },
    { string: 6, fret: 5 },
    { string: 3, fret: 7, articulation: 'slide' },
  ],
};

const asText = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes);

describe('tabSheetPdf', () => {
  it('is a PDF a reader will open', () => {
    const text = asText(tabSheetPdf(sheet));
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('points startxref at the cross-reference table, or the file will not open', () => {
    const text = asText(tabSheetPdf(sheet));
    const offset = Number(text.slice(text.lastIndexOf('startxref') + 'startxref'.length).trim().split('\n')[0]);

    expect(text.slice(offset, offset + 4)).toBe('xref');
  });

  it('draws the sheet as vector text and lines, not as a picture of one', () => {
    const text = asText(tabSheetPdf(sheet));
    expect(text).toContain(' Tj');
    expect(text).toContain(' l\n');
    expect(text).not.toContain('/DCTDecode');
  });

  it('carries the accented title, which needs the Latin-1 encoding', () => {
    const text = asText(tabSheetPdf(sheet));
    expect(text).toContain('Célula 3-5-7 repetida');
    expect(text).toContain('/WinAnsiEncoding');
  });

  it('escapes a title containing brackets, which would end the string early', () => {
    const text = asText(tabSheetPdf({ ...sheet, title: 'Riff (parte 2) \\ fim' }));
    expect(text).toContain('Riff \\(parte 2\\) \\\\ fim');
  });

  it('sizes the page to the sheet, so nothing is cropped', () => {
    const text = asText(tabSheetPdf(sheet));
    expect(text).toMatch(/\/MediaBox \[0 0 \d+(\.\d+)? \d+(\.\d+)?\]/);
  });

  it('prints the fret numbers', () => {
    const text = asText(tabSheetPdf(sheet));
    for (const fret of ['(3)', '(5)', '(7)']) expect(text).toContain(fret);
  });
});
