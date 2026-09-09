import { describe, it, expect, vi, beforeEach } from 'vitest';

const { rasterizeFile, withDigitReader, read, readSlurs } = vi.hoisted(() => {
  const read = vi.fn();
  const readSlurs = vi.fn<(canvas: unknown) => Promise<{ text: string; x: number; y: number }[]>>();
  return {
    read,
    readSlurs,
    rasterizeFile: vi.fn(),
    withDigitReader: vi.fn(async (use: (r: unknown) => Promise<unknown>) =>
      use({ readDigits: read, readSlurInContext: readSlurs }),
    ),
  };
});

vi.mock('./rasterize', async () => {
  const actual = await vi.importActual<typeof import('./rasterize')>('./rasterize');
  return { ...actual, rasterizeFile };
});
vi.mock('./ocr', () => ({ withDigitReader }));
vi.mock('./crop', () => ({
  // The stub records the box it was asked for, so the pipeline's cropping is observable.
  cropDigit: (_page: unknown, box: { x0: number; y0: number; x1: number; y1: number }) => ({ __box: box }),
}));

import { importTabFromFile, NO_TAB_FOUND_MESSAGE, DIGITS_UNREADABLE_MESSAGE } from './import-pipeline';

/**
 * A canvas stub: a white page with six dark tablature lines, plus a digit-sized
 * blob of ink for each `digits` entry so the segmenter has something to find.
 */
function pageCanvas(
  width = 200,
  height = 120,
  lineYs = [20, 30, 40, 50, 60, 70],
  digits: { x: number; y: number }[] = [{ x: 30, y: 70 }],
) {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const ink = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const offset = (y * width + x) * 4;
    data[offset] = data[offset + 1] = data[offset + 2] = 0;
  };
  for (const y of lineYs) for (let x = 0; x < width; x += 1) ink(x, y);
  for (const digit of digits) {
    for (let dy = -3; dy <= 3; dy += 1) for (let dx = -2; dx <= 2; dx += 1) ink(digit.x + dx, digit.y + dy);
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
    readSlurs.mockReset();
    readSlurs.mockResolvedValue([]);

    withDigitReader.mockClear();
  });

  it('sends one tight crop per digit, not one image per system', async () => {
    // Two systems, each carrying two digits.
    rasterizeFile.mockResolvedValue([
      pageCanvas(
        200,
        320,
        [20, 30, 40, 50, 60, 70, 220, 230, 240, 250, 260, 270],
        [
          { x: 30, y: 70 },
          { x: 90, y: 70 },
          { x: 30, y: 270 },
          { x: 90, y: 270 },
        ],
      ),
    ]);
    read.mockResolvedValue([]);

    await importTabFromFile(file).catch(() => {});

    expect(read).toHaveBeenCalledTimes(4);
  });

  it('places each digit where its box sits on the page, not where the OCR reports it', async () => {
    rasterizeFile.mockResolvedValue([pageCanvas()]);
    // The reader returns a position inside the tiny crop; the pipeline must
    // ignore it and use the box the crop was cut from.
    read.mockResolvedValue([{ text: '3', x: 999, y: 999 }]);

    const positions = await importTabFromFile(file);

    expect(positions).toEqual([{ string: 6, fret: 3 }]);
  });

  it('concatenates pages in order, so a two-page PDF reads as one sequence', async () => {
    rasterizeFile.mockResolvedValue([pageCanvas(), pageCanvas()]);
    read
      .mockResolvedValueOnce([{ text: '1', x: 0, y: 0 }])
      .mockResolvedValueOnce([{ text: '2', x: 0, y: 0 }]);

    const positions = await importTabFromFile(file);

    expect(positions.map((p) => p.fret)).toEqual([1, 2]);
  });

  it('says no tablature was found when the page holds no six-line system', async () => {
    rasterizeFile.mockResolvedValue([pageCanvas(200, 120, [20, 30, 40, 50, 60], [])]);
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
    read.mockResolvedValue([{ text: '3', x: 0, y: 0 }]);
    const steps: string[] = [];

    await importTabFromFile(file, (step) => steps.push(step.label));

    expect(steps[0]).toMatch(/preparando/i);
    expect(steps.some((label) => /lendo a tablatura/i.test(label))).toBe(true);
  });

  it('only pays for the slur pass on crops the digit pass could not read', async () => {
    rasterizeFile.mockResolvedValue([
      pageCanvas(200, 120, [20, 30, 40, 50, 60, 70], [
        { x: 30, y: 70 },
        { x: 60, y: 70 },
        { x: 90, y: 70 },
      ]),
    ]);
    read
      .mockResolvedValueOnce([{ text: '3', x: 0, y: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ text: '5', x: 0, y: 0 }]);

    await importTabFromFile(file);

    expect(read).toHaveBeenCalledTimes(3);
    expect(readSlurs).toHaveBeenCalledTimes(1);
  });

  it('never asks for a slur on the first or last mark, which have no pair to sit between', async () => {
    rasterizeFile.mockResolvedValue([
      pageCanvas(200, 120, [20, 30, 40, 50, 60, 70], [
        { x: 30, y: 70 },
        { x: 60, y: 70 },
      ]),
    ]);
    read.mockResolvedValue([]);

    await importTabFromFile(file).catch(() => {});

    expect(readSlurs).not.toHaveBeenCalled();
  });

  it('turns a letter the slur pass reads into an articulation on the next note', async () => {
    rasterizeFile.mockResolvedValue([
      pageCanvas(200, 120, [20, 30, 40, 50, 60, 70], [
        { x: 30, y: 70 },
        { x: 60, y: 70 },
        { x: 90, y: 70 },
      ]),
    ]);
    read
      .mockResolvedValueOnce([{ text: '3', x: 0, y: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ text: '5', x: 0, y: 0 }]);
    // The context pass reads the whole run, letter and digits together.
    readSlurs.mockResolvedValue([{ text: '3h5', x: 0, y: 0 }]);

    const positions = await importTabFromFile(file);

    expect(positions).toEqual([
      { string: 6, fret: 3 },
      { string: 6, fret: 5, articulation: 'hammerOn' },
    ]);
  });
});
