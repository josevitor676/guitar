import { describe, it, expect } from 'vitest';
import { toGrayImage } from './grayscale';

function rgbaCanvasData(pixels: [number, number, number][]): ImageData {
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  });
  return { data, width: pixels.length, height: 1, colorSpace: 'srgb' } as ImageData;
}

describe('toGrayImage', () => {
  it('keeps white white and black black', () => {
    const gray = toGrayImage(rgbaCanvasData([[255, 255, 255], [0, 0, 0]]));

    expect(Array.from(gray.data)).toEqual([255, 0]);
  });

  it('weights green most heavily, as luminance perception does', () => {
    const gray = toGrayImage(rgbaCanvasData([[0, 255, 0], [0, 0, 255]]));

    expect(gray.data[0]).toBeGreaterThan(gray.data[1]);
  });

  it('carries the image dimensions through', () => {
    const gray = toGrayImage(rgbaCanvasData([[0, 0, 0], [0, 0, 0], [0, 0, 0]]));

    expect(gray.width).toBe(3);
    expect(gray.height).toBe(1);
  });
});
