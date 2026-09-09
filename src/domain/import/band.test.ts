import { describe, it, expect } from 'vitest';
import { bandForSystem, tokenToPageSpace } from './band';
import type { TabSystem } from './image.types';

const system: TabSystem = { lineYs: [220, 246, 272, 298, 324, 350], top: 207, bottom: 363 };

describe('bandForSystem', () => {
  it('covers the system from its top to its bottom', () => {
    const band = bandForSystem(system, 1000, 3);

    expect(band.top).toBe(207);
    expect(band.height).toBe(156);
    expect(band.scale).toBe(3);
  });

  it('never starts above the top of the page', () => {
    const atEdge: TabSystem = { lineYs: [4, 10, 16, 22, 28, 34], top: -2, bottom: 40 };

    expect(bandForSystem(atEdge, 1000, 3).top).toBe(0);
  });

  it('never reaches past the bottom of the page', () => {
    const band = bandForSystem(system, 300, 3);

    expect(band.top + band.height).toBeLessThanOrEqual(300);
  });
});

describe('tokenToPageSpace', () => {
  it('undoes the upscale and puts the token back where it sits on the page', () => {
    const band = bandForSystem(system, 1000, 3);

    // A digit drawn on the third line (y=272) lands at (272-207)*3 = 195 in the strip.
    const mapped = tokenToPageSpace({ text: '7', x: 300, y: 195 }, band);

    expect(mapped).toEqual({ text: '7', x: 100, y: 272 });
  });

  it('is the identity when the strip is neither cropped nor scaled', () => {
    const mapped = tokenToPageSpace({ text: '5', x: 40, y: 80 }, { top: 0, height: 500, scale: 1 });

    expect(mapped).toEqual({ text: '5', x: 40, y: 80 });
  });
});
