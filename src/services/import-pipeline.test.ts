import { describe, it, expect, vi, beforeEach } from 'vitest';

const { rasterizeFile, withDigitReader, read } = vi.hoisted(() => {
  const read = vi.fn();
  return {
    read,
    rasterizeFile: vi.fn(),
    withDigitReader: vi.fn(async (use: (r: unknown) => Promise<unknown>) => use(read)),
  };
});

vi.mock('./rasterize', async () => {
  const actual = await vi.importActual<typeof import('./rasterize')>('./rasterize');
  return { ...actual, rasterizeFile };
});
vi.mock('./ocr', () => ({ withDigitReader }));
vi.mock('./crop', () => ({
  // The stub records the band it was asked for, so the pipeline's cropping is observable.
  cropBand: (page: { width: number }, band: { top: number; height: number; scale: number }) => ({
    width: page.width * band.scale,
    height: band.height * band.scale,
    __band: band,
  }),
}));

import { importTabFromFile, NO_TAB_FOUND_MESSAGE, DIGITS_UNREADABLE_MESSAGE } from './import-pipeline';

/** A canvas stub whose pixels are a white page with six dark lines at y=20..70. */
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
    read.mockReset();
    withDigitReader.mockClear();
  });

  it('reads each tablature system from its own cropped strip, not the whole page', async () => {
    // Two systems on one page: y=20..70 and y=220..270.
    rasterizeFile.mockResolvedValue([
      pageCanvas(200, 320, [20, 30, 40, 50, 60, 70, 220, 230, 240, 250, 260, 270]),
    ]);
    read.mockResolvedValue([]);

    await importTabFromFile(file).catch(() => {});

    expect(read).toHaveBeenCalledTimes(2);
    const bands = read.mock.calls.map(([strip]) => (strip as { __band: { top: number } }).__band.top);
    expect(bands).toEqual([15, 215]);
  });

  it('puts tokens read from a strip back into page coordinates before parsing', async () => {
    rasterizeFile.mockResolvedValue([pageCanvas()]);
    // The strip starts at y=15 and is scaled 3x, so the bottom line (y=70)
    // sits at (70-15)*3 = 165 inside the strip.
    read.mockResolvedValue([{ text: '3', x: 30, y: 165 }]);

    const positions = await importTabFromFile(file);

    expect(positions).toEqual([{ string: 6, fret: 3 }]);
  });

  it('concatenates pages in order, so a two-page PDF reads as one sequence', async () => {
    rasterizeFile.mockResolvedValue([pageCanvas(), pageCanvas()]);
    read
      .mockResolvedValueOnce([{ text: '1', x: 30, y: 15 }])
      .mockResolvedValueOnce([{ text: '2', x: 30, y: 15 }]);

    const positions = await importTabFromFile(file);

    expect(positions.map((p) => p.fret)).toEqual([1, 2]);
  });

  it('says no tablature was found when the page holds no six-line system', async () => {
    rasterizeFile.mockResolvedValue([pageCanvas(200, 120, [20, 30, 40, 50, 60])]);
    read.mockResolvedValue([]);

    await expect(importTabFromFile(file)).rejects.toThrow(NO_TAB_FOUND_MESSAGE);
  });

  it('distinguishes finding the lines from being unable to read the numbers', async () => {
    rasterizeFile.mockResolvedValue([pageCanvas()]);
    read.mockResolvedValue([]);

    await expect(importTabFromFile(file)).rejects.toThrow(DIGITS_UNREADABLE_MESSAGE);
  });

  it('reports progress through preparing and reading', async () => {
    rasterizeFile.mockResolvedValue([pageCanvas()]);
    read.mockResolvedValue([{ text: '3', x: 30, y: 165 }]);
    const steps: string[] = [];

    await importTabFromFile(file, (step) => steps.push(step.label));

    expect(steps[0]).toMatch(/preparando/i);
    expect(steps.some((label) => /lendo a tablatura/i.test(label))).toBe(true);
  });
});
