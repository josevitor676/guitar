import { describe, it, expect } from 'vitest';
import { isValidPosition, positionsEqual, rangeToReveal } from './fretboard-model';

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

describe('rangeToReveal', () => {
  const current = { minFret: 1, maxFret: 7 };

  it('leaves the range alone when every position already fits', () => {
    expect(rangeToReveal([{ string: 6, fret: 3 }], current)).toEqual(current);
  });

  it('widens upward to reach a position past the last visible fret', () => {
    expect(rangeToReveal([{ string: 6, fret: 12 }], current)).toEqual({ minFret: 1, maxFret: 12 });
  });

  it('widens downward to reach a position below the first visible fret', () => {
    expect(rangeToReveal([{ string: 6, fret: 2 }], { minFret: 5, maxFret: 10 })).toEqual({
      minFret: 2,
      maxFret: 10,
    });
  });

  it('never reveals a fret below the first, since fret 0 is the open string', () => {
    expect(rangeToReveal([{ string: 6, fret: 0 }], current).minFret).toBe(1);
  });

  it('covers the whole span when positions fall on both sides', () => {
    expect(rangeToReveal([{ string: 6, fret: 2 }, { string: 1, fret: 14 }], { minFret: 5, maxFret: 10 })).toEqual({
      minFret: 2,
      maxFret: 14,
    });
  });

  it('leaves the range alone for an empty sequence', () => {
    expect(rangeToReveal([], current)).toEqual(current);
  });
});
