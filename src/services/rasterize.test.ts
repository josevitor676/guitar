import { describe, it, expect } from 'vitest';
import { rasterizeFile, UNSUPPORTED_FILE_MESSAGE } from './rasterize';

describe('rasterizeFile', () => {
  it('rejects a file type it cannot read, naming what is accepted', async () => {
    const file = new File(['corda 6 casa 3'], 'exercicio.txt', { type: 'text/plain' });

    await expect(rasterizeFile(file)).rejects.toThrow(UNSUPPORTED_FILE_MESSAGE);
  });

  it('names both accepted formats in the message, in Portuguese', () => {
    expect(UNSUPPORTED_FILE_MESSAGE).toMatch(/imagem/i);
    expect(UNSUPPORTED_FILE_MESSAGE).toMatch(/PDF/);
  });
});
