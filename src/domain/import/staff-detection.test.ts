import { describe, it, expect } from 'vitest';
import { detectTabSystems } from './staff-detection';
import type { GrayImage } from './image.types';

const WIDTH = 200;

/** Builds a white page with dark horizontal lines at the given rows. */
function pageWithLines(height: number, lines: { y: number; thickness?: number }[]): GrayImage {
  const data = new Uint8ClampedArray(WIDTH * height).fill(255);
  for (const { y, thickness = 1 } of lines) {
    for (let row = y; row < y + thickness; row += 1) {
      for (let x = 0; x < WIDTH; x += 1) data[row * WIDTH + x] = 0;
    }
  }
  return { data, width: WIDTH, height };
}

function evenlySpaced(firstY: number, count: number, gap: number) {
  return Array.from({ length: count }, (_, i) => ({ y: firstY + i * gap }));
}

describe('detectTabSystems', () => {
  it('finds nothing on a blank page', () => {
    expect(detectTabSystems(pageWithLines(100, []))).toEqual([]);
  });

  it('reads six evenly spaced lines as one tab system, top line first', () => {
    const systems = detectTabSystems(pageWithLines(120, evenlySpaced(20, 6, 10)));

    expect(systems).toHaveLength(1);
    expect(systems[0].lineYs).toEqual([20, 30, 40, 50, 60, 70]);
  });

  it('discards a five-line group, which is the musical staff and not tablature', () => {
    expect(detectTabSystems(pageWithLines(120, evenlySpaced(20, 5, 10)))).toEqual([]);
  });

  it('keeps only the tablature when a staff sits above it on the same page', () => {
    const staff = evenlySpaced(20, 5, 8);
    const tab = evenlySpaced(120, 6, 10);

    const systems = detectTabSystems(pageWithLines(220, [...staff, ...tab]));

    expect(systems).toHaveLength(1);
    expect(systems[0].lineYs).toEqual([120, 130, 140, 150, 160, 170]);
  });

  it('reads two stacked tablatures as two systems, in page order', () => {
    const first = evenlySpaced(20, 6, 10);
    const second = evenlySpaced(200, 6, 10);

    const systems = detectTabSystems(pageWithLines(300, [...first, ...second]));

    expect(systems).toHaveLength(2);
    expect(systems[0].lineYs[0]).toBe(20);
    expect(systems[1].lineYs[0]).toBe(200);
  });

  it('treats a three-pixel-thick printed line as one line, not three', () => {
    const thick = evenlySpaced(20, 6, 12).map((line) => ({ ...line, thickness: 3 }));

    const systems = detectTabSystems(pageWithLines(140, thick));

    expect(systems).toHaveLength(1);
    expect(systems[0].lineYs).toHaveLength(6);
  });

  it('gives the system a capture band that reaches past the outer lines', () => {
    const [system] = detectTabSystems(pageWithLines(160, evenlySpaced(40, 6, 10)));

    expect(system.top).toBeLessThan(40);
    expect(system.bottom).toBeGreaterThan(90);
  });

  it('ignores short dark marks that are not full-width lines', () => {
    const image = pageWithLines(120, evenlySpaced(20, 6, 10));
    // A note head: dark, but only a few pixels wide.
    for (let x = 10; x < 18; x += 1) image.data[100 * WIDTH + x] = 0;

    expect(detectTabSystems(image)[0].lineYs).toHaveLength(6);
  });
});
