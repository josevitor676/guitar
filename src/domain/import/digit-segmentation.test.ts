import { describe, it, expect } from 'vitest';
import { findDigitBoxes, scaleForBox, mergeBoxes, boxesShareRow } from './digit-segmentation';
import type { GrayImage, TabSystem } from './image.types';

const WIDTH = 400;
const HEIGHT = 260;
const LINE_YS = [60, 86, 112, 138, 164, 190];
const system: TabSystem = { lineYs: LINE_YS, top: 47, bottom: 203 };

function blankPage(): GrayImage {
  return { data: new Uint8ClampedArray(WIDTH * HEIGHT).fill(255), width: WIDTH, height: HEIGHT };
}

function drawRect(image: GrayImage, x0: number, y0: number, w: number, h: number, value = 0) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) image.data[y * WIDTH + x] = value;
  }
}

/** The six tablature lines, each two pixels thick. */
function withTabLines(image: GrayImage) {
  for (const y of LINE_YS) drawRect(image, 0, y, WIDTH, 2);
  return image;
}

/** A digit-sized blob centered on a string line, as engraved tab prints it. */
function drawDigit(image: GrayImage, centerX: number, lineIndex: number, width = 12) {
  const centerY = LINE_YS[lineIndex] + 1;
  drawRect(image, centerX - Math.floor(width / 2), centerY - 8, width, 16);
}

describe('findDigitBoxes', () => {
  it('finds nothing on a page that holds only the tablature lines', () => {
    expect(findDigitBoxes(withTabLines(blankPage()), system)).toEqual([]);
  });

  it('finds one box per digit, however far apart they sit', () => {
    const image = withTabLines(blankPage());
    drawDigit(image, 40, 0);
    drawDigit(image, 200, 0);
    drawDigit(image, 360, 0);

    const boxes = findDigitBoxes(image, system);

    expect(boxes).toHaveLength(3);
    expect(boxes.map((b) => Math.round((b.x0 + b.x1) / 2))).toEqual([40, 200, 360]);
  });

  it('centers each box on the line its digit belongs to', () => {
    const image = withTabLines(blankPage());
    drawDigit(image, 40, 3);

    const [box] = findDigitBoxes(image, system);

    expect(Math.round((box.y0 + box.y1) / 2)).toBeCloseTo(LINE_YS[3] + 1, 0);
  });

  it('joins the two marks of a two-digit fret into one box', () => {
    const image = withTabLines(blankPage());
    // "1" and "2" printed side by side with a 3px gap, as one number.
    drawDigit(image, 100, 2, 8);
    drawDigit(image, 111, 2, 8);

    const boxes = findDigitBoxes(image, system);

    expect(boxes).toHaveLength(1);
    expect(boxes[0].x1 - boxes[0].x0).toBeGreaterThan(15);
  });

  it('keeps two separate notes separate, even on the same line', () => {
    const image = withTabLines(blankPage());
    drawDigit(image, 100, 2);
    drawDigit(image, 140, 2);

    expect(findDigitBoxes(image, system)).toHaveLength(2);
  });

  it('never joins marks that sit on different strings', () => {
    const image = withTabLines(blankPage());
    drawDigit(image, 100, 1);
    drawDigit(image, 104, 4);

    expect(findDigitBoxes(image, system)).toHaveLength(2);
  });

  it('discards a speck of dust too small to be a digit', () => {
    const image = withTabLines(blankPage());
    drawRect(image, 200, LINE_YS[2] - 1, 2, 2);

    expect(findDigitBoxes(image, system)).toEqual([]);
  });

  it('discards a blob far too tall to be a digit, such as a bar line', () => {
    const image = withTabLines(blankPage());
    drawRect(image, 200, 55, 3, 140);

    expect(findDigitBoxes(image, system)).toEqual([]);
  });

  it('ignores ink above the system entirely, such as a triplet mark over the staff', () => {
    const image = withTabLines(blankPage());
    // Sits at y=20..34, well clear of the capture band that starts at y=47.
    drawRect(image, 100, 20, 10, 14);

    expect(findDigitBoxes(image, system)).toEqual([]);
  });

  it('reads digits left to right', () => {
    const image = withTabLines(blankPage());
    drawDigit(image, 300, 1);
    drawDigit(image, 60, 4);
    drawDigit(image, 180, 2);

    const boxes = findDigitBoxes(image, system);

    expect(boxes.map((b) => Math.round((b.x0 + b.x1) / 2))).toEqual([60, 180, 300]);
  });

  it('still finds a digit whose ink touches the line it sits on', () => {
    const image = withTabLines(blankPage());
    // Drawn without clearing the line behind it, so blob and line connect.
    drawDigit(image, 150, 2);

    expect(findDigitBoxes(image, system)).toHaveLength(1);
  });
});

describe('scaleForBox', () => {
  const box = (height: number) => ({ x0: 0, y0: 0, x1: 10, y1: height });

  it('enlarges a small digit until it reaches the target height', () => {
    expect(scaleForBox(box(20), 100)).toBeCloseTo(5, 5);
  });

  it('shrinks a digit that is already larger than the target', () => {
    expect(scaleForBox(box(200), 100)).toBeCloseTo(1, 5);
  });

  it('normalizes digits from differently scaled sources to the same height', () => {
    const fromImage = scaleForBox(box(16), 110) * 16;
    const fromPdfRenderedAtTwice = scaleForBox(box(32), 110) * 32;

    expect(fromImage).toBeCloseTo(fromPdfRenderedAtTwice, 5);
  });

  it('never scales beyond the clamped range', () => {
    expect(scaleForBox(box(1), 100)).toBeLessThanOrEqual(10);
    expect(scaleForBox(box(10_000), 100)).toBeGreaterThanOrEqual(1);
  });

  it('falls back to the minimum for a degenerate zero-height box', () => {
    expect(scaleForBox(box(0), 100)).toBeGreaterThan(0);
  });
});

describe('mergeBoxes', () => {
  it('spans every box it is given', () => {
    const merged = mergeBoxes([
      { x0: 10, y0: 20, x1: 20, y1: 36 },
      { x0: 30, y0: 18, x1: 38, y1: 34 },
      { x0: 46, y0: 21, x1: 56, y1: 37 },
    ]);

    expect(merged).toEqual({ x0: 10, y0: 18, x1: 56, y1: 37 });
  });

  it('returns the box itself when given only one', () => {
    const only = { x0: 4, y0: 5, x1: 9, y1: 12 };

    expect(mergeBoxes([only])).toEqual(only);
  });
});

describe('boxesShareRow', () => {
  it('is true for marks printed on the same string', () => {
    expect(boxesShareRow({ x0: 0, y0: 20, x1: 8, y1: 36 }, { x0: 20, y0: 22, x1: 28, y1: 38 })).toBe(true);
  });

  it('is false for marks on different strings', () => {
    expect(boxesShareRow({ x0: 0, y0: 20, x1: 8, y1: 34 }, { x0: 20, y0: 60, x1: 28, y1: 74 })).toBe(false);
  });
});
