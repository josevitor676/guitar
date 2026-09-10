import { describe, it, expect } from 'vitest';
import { sheetFileName } from './file-name';

describe('sheetFileName', () => {
  it('turns a title into something a file system will take', () => {
    expect(sheetFileName('Célula 3-5-7 repetida', 'pdf')).toBe('celula-3-5-7-repetida.pdf');
  });

  it('strips the accents rather than leaving them to the download folder', () => {
    expect(sheetFileName('Ode à Alegria (tema)', 'png')).toBe('ode-a-alegria-tema.png');
  });

  it('collapses the punctuation a student types into single dashes', () => {
    expect(sheetFileName('Riff  //  parte 2!!', 'png')).toBe('riff-parte-2.png');
  });

  it('falls back to a name rather than producing a file called ".pdf"', () => {
    expect(sheetFileName('   ', 'pdf')).toBe('tablatura.pdf');
    expect(sheetFileName('***', 'pdf')).toBe('tablatura.pdf');
  });

  it('keeps a long title short enough for any file system', () => {
    const name = sheetFileName('a'.repeat(200), 'pdf');
    expect(name.length).toBeLessThanOrEqual(64);
  });
});
