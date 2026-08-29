import { describe, it, expect } from 'vitest';
import { isValidPosition, positionsEqual } from './fretboard-model';

describe('isValidPosition', () => {
  it('accepts a position within string 1-6 and the given fret range', () => {
    expect(isValidPosition({ string: 6, fret: 3 }, { minFret: 0, maxFret: 24 })).toBe(true);
  });

  it('rejects a string number outside 1-6', () => {
    // @ts-expect-error testing runtime guard against invalid input
    expect(isValidPosition({ string: 7, fret: 3 }, { minFret: 0, maxFret: 24 })).toBe(false);
  });

  it('rejects a negative fret', () => {
    expect(isValidPosition({ string: 6, fret: -1 }, { minFret: 0, maxFret: 24 })).toBe(false);
  });

  it('rejects a fret above the configured maximum', () => {
    expect(isValidPosition({ string: 6, fret: 25 }, { minFret: 0, maxFret: 24 })).toBe(false);
  });
});

describe('positionsEqual', () => {
  it('returns true for identical string/fret pairs', () => {
    expect(positionsEqual({ string: 3, fret: 5 }, { string: 3, fret: 5 })).toBe(true);
  });

  it('returns false when string differs', () => {
    expect(positionsEqual({ string: 3, fret: 5 }, { string: 4, fret: 5 })).toBe(false);
  });

  it('returns false when fret differs', () => {
    expect(positionsEqual({ string: 3, fret: 5 }, { string: 3, fret: 6 })).toBe(false);
  });
});
