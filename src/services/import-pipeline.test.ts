import { describe, it, expect, vi, beforeEach } from 'vitest';

const { rasterizeFile, recognizeDigits } = vi.hoisted(() => ({
  rasterizeFile: vi.fn(),
  recognizeDigits: vi.fn(),
}));

vi.mock('./rasterize', async () => {
  const actual = await vi.importActual<typeof import('./rasterize')>('./rasterize');
  return { ...actual, rasterizeFile };
});
vi.mock('./ocr', () => ({ recognizeDigits }));

import { importTabFromFile, NO_TAB_FOUND_MESSAGE } from './import-pipeline';

/** A canvas stub whose pixels are a white page with six dark lines. */
function pageCanvas(width = 200, height = 120, lineYs = [20, 30, 40, 50, 60, 70]) {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (const y of lineYs) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      data[offset] = data[offset + 1] = data[offset + 2] = 0;
    }
  }
  return {
    width,
    height,
    getContext: () => ({ getImageData: () => ({ data, width, height }) }),
  } as unknown as HTMLCanvasElement;
}

const file = new File([''], 'exercicio.png', { type: 'image/png' });

describe('importTabFromFile', () => {
  beforeEach(() => {
    rasterizeFile.mockReset();
    recognizeDigits.mockReset();
  });

  it('turns the digits it reads into fret positions', async () => {
    rasterizeFile.mockResolvedValue([pageCanvas()]);
    recognizeDigits.mockResolvedValue([
      { text: '3', x: 10, y: 70 },
      { text: '5', x: 40, y: 70 },
    ]);

    const positions = await importTabFromFile(file);

    expect(positions).toEqual([
      { string: 6, fret: 3 },
      { string: 6, fret: 5 },
    ]);
  });

  it('concatenates pages in order, so a two-page PDF reads as one sequence', async () => {
    rasterizeFile.mockResolvedValue([pageCanvas(), pageCanvas()]);
    recognizeDigits
      .mockResolvedValueOnce([{ text: '1', x: 10, y: 20 }])
      .mockResolvedValueOnce([{ text: '2', x: 10, y: 20 }]);

    const positions = await importTabFromFile(file);

    expect(positions.map((p) => p.fret)).toEqual([1, 2]);
  });

  it('explains itself when the page holds no six-line system', async () => {
    rasterizeFile.mockResolvedValue([pageCanvas(200, 120, [20, 30, 40, 50, 60])]);
    recognizeDigits.mockResolvedValue([{ text: '3', x: 10, y: 40 }]);

    await expect(importTabFromFile(file)).rejects.toThrow(NO_TAB_FOUND_MESSAGE);
  });

  it('explains itself when a system is found but yields no readable fret number', async () => {
    rasterizeFile.mockResolvedValue([pageCanvas()]);
    recognizeDigits.mockResolvedValue([]);

    await expect(importTabFromFile(file)).rejects.toThrow(NO_TAB_FOUND_MESSAGE);
  });

  it('reports progress through rasterizing and reading', async () => {
    rasterizeFile.mockResolvedValue([pageCanvas()]);
    recognizeDigits.mockResolvedValue([{ text: '3', x: 10, y: 70 }]);
    const steps: string[] = [];

    await importTabFromFile(file, (step) => steps.push(step.label));

    expect(steps[0]).toMatch(/preparando/i);
    expect(steps.some((label) => /lendo a tablatura/i.test(label))).toBe(true);
  });
});
