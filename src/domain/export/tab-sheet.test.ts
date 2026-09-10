import { describe, it, expect } from 'vitest';
import { splitIntoSystems, tabSheetSvg, NOTES_PER_SYSTEM } from './tab-sheet';
import type { TabSheet } from './tab-sheet';

const sheet: TabSheet = {
  title: 'Célula 3-5-7 repetida',
  bpm: 120,
  subdivision: 'eighth',
  positions: [
    { string: 6, fret: 3 },
    { string: 6, fret: 5 },
    { string: 6, fret: 7 },
  ],
};

describe('splitIntoSystems', () => {
  it('keeps a short sequence on one line', () => {
    expect(splitIntoSystems(sheet.positions, 16)).toHaveLength(1);
  });

  it('wraps a long sequence instead of letting the sheet grow sideways forever', () => {
    const long = Array.from({ length: 40 }, () => ({ string: 6 as const, fret: 5 }));
    const systems = splitIntoSystems(long, 16);

    expect(systems.map((s) => s.length)).toEqual([16, 16, 8]);
  });

  it('returns nothing for an empty sequence rather than one blank line', () => {
    expect(splitIntoSystems([], 16)).toEqual([]);
  });
});

describe('tabSheetSvg', () => {
  it('is a self-contained SVG document', () => {
    const svg = tabSheetSvg(sheet);
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg.trimEnd()).toMatch(/<\/svg>$/);
  });

  it('prints every fret number', () => {
    const svg = tabSheetSvg(sheet);
    for (const fret of ['3', '5', '7']) {
      expect(svg).toContain(`>${fret}</text>`);
    }
  });

  it('carries the title and the tempo, without which the sheet cannot be played', () => {
    const svg = tabSheetSvg(sheet);
    expect(svg).toContain('Célula 3-5-7 repetida');
    expect(svg).toContain('120 BPM');
    expect(svg).toContain('Colcheia');
  });

  it('escapes a title that would otherwise break the document', () => {
    const svg = tabSheetSvg({ ...sheet, title: 'Riff <b> & "coisas"' });
    expect(svg).toContain('&lt;b&gt; &amp;');
    expect(svg).not.toContain('<b>');
  });

  it('draws six string lines per system, which is what makes it tablature', () => {
    const svg = tabSheetSvg(sheet);
    expect(svg.match(/data-string-line/g)).toHaveLength(6);
  });

  it('labels the strings so a reader knows which way up it is', () => {
    expect(tabSheetSvg(sheet)).toContain('>T</text>');
  });

  describe('articulations', () => {
    const withSlurs = (articulation: 'hammerOn' | 'pullOff' | 'slide' | 'bend', frets: number[]) =>
      tabSheetSvg({
        ...sheet,
        positions: [
          { string: 3, fret: frets[0] },
          { string: 3, fret: frets[1], articulation },
        ],
      });

    it('writes h for a hammer-on and p for a pull-off', () => {
      expect(withSlurs('hammerOn', [5, 7])).toContain('>h</text>');
      expect(withSlurs('pullOff', [7, 5])).toContain('>p</text>');
    });

    it('writes b for a bend', () => {
      expect(withSlurs('bend', [7, 9])).toContain('>b</text>');
    });

    // Tablature writes a slide by the direction it travels, and the two frets
    // already say which way that is.
    it('slants the slide the way it moves', () => {
      expect(withSlurs('slide', [5, 9])).toContain('>/</text>');
      expect(withSlurs('slide', [9, 5])).toContain('>\\</text>');
    });
  });

  it('wraps at the shared system length by default', () => {
    const long = Array.from({ length: NOTES_PER_SYSTEM + 1 }, () => ({ string: 6 as const, fret: 5 }));
    expect(tabSheetSvg({ ...sheet, positions: long }).match(/data-string-line/g)).toHaveLength(12);
  });
});
