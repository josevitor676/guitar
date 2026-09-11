import { describe, it, expect } from 'vitest';
import { detectSkew, deskew, MAX_SKEW_DEGREES } from './deskew';
import type { GrayImage } from './image.types';

/** A sheet of six evenly spaced lines, drawn at the given tilt. */
function tiltedSheet(degrees: number, width = 400, height = 200): GrayImage {
  const data = new Uint8ClampedArray(width * height).fill(255);
  const slope = Math.tan((degrees * Math.PI) / 180);

  for (let line = 0; line < 6; line += 1) {
    const baseY = 50 + line * 18;
    for (let x = 0; x < width; x += 1) {
      const y = Math.round(baseY + (x - width / 2) * slope);
      if (y >= 0 && y < height) data[y * width + x] = 0;
    }
  }

  return { data, width, height };
}

describe('detectSkew', () => {
  // Exactly zero, not merely close: anything else turns a page that was
  // already square, and every turn costs a little sharpness.
  it('leaves a sheet that is already straight at exactly zero', () => {
    expect(detectSkew(tiltedSheet(0))).toBe(0);
  });

  it('measures a tilt to within a fifth of a degree', () => {
    for (const tilt of [-2.5, -1.6, 0.8, 1.6, 3]) {
      expect(detectSkew(tiltedSheet(tilt)), `${tilt}°`).toBeCloseTo(tilt, 0);
    }
  });

  // A page tilted further than this is not a photograph of a sheet that slipped;
  // guessing at it would risk locking onto something that is not a line at all.
  it('reports nothing for a tilt beyond what it searches', () => {
    expect(Math.abs(detectSkew(tiltedSheet(20)))).toBeLessThanOrEqual(MAX_SKEW_DEGREES);
  });

  it('finds nothing to straighten in a blank page', () => {
    const width = 100;
    const height = 100;
    expect(detectSkew({ data: new Uint8ClampedArray(width * height).fill(255), width, height })).toBe(0);
  });
});

describe('deskew', () => {
  function rowsWithInk(image: GrayImage): number {
    let rows = 0;
    for (let y = 0; y < image.height; y += 1) {
      let dark = 0;
      for (let x = 0; x < image.width; x += 1) if (image.data[y * image.width + x] < 128) dark += 1;
      // A line, rather than the odd stray pixel a rotation leaves behind.
      if (dark > image.width * 0.5) rows += 1;
    }
    return rows;
  }

  it('turns a tilted sheet into one whose lines sit on rows', () => {
    const tilted = tiltedSheet(1.6);
    expect(rowsWithInk(tilted)).toBe(0);

    expect(rowsWithInk(deskew(tilted, detectSkew(tilted)))).toBeGreaterThanOrEqual(6);
  });

  it('leaves a straight sheet as it found it', () => {
    const straight = tiltedSheet(0);
    expect(rowsWithInk(deskew(straight, 0))).toBe(rowsWithInk(straight));
  });

  it('keeps the page the same size', () => {
    const rotated = deskew(tiltedSheet(3), 3);
    expect(rotated.width).toBe(400);
    expect(rotated.height).toBe(200);
  });

  it('fills the corners the rotation empties with paper, not with ink', () => {
    const rotated = deskew(tiltedSheet(4), 4);
    expect(rotated.data[0]).toBe(255);
  });
});
