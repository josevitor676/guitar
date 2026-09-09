import { describe, it, expect } from 'vitest';
import {
  isValidPosition,
  positionsEqual,
  orderAlongNeck,
  fretSpanForWidth,
  windowStartToReveal,
  MAX_VISIBLE_FRETS,
  MIN_VISIBLE_FRETS,
} from './fretboard-model';

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

describe('fretSpanForWidth', () => {
  const CELL = 56;
  const LABEL = 40;

  it('shows twelve frets once the neck has room for them', () => {
    expect(fretSpanForWidth(LABEL + CELL * 12, CELL, LABEL)).toBe(12);
  });

  it('never shows more than twelve, however wide the screen gets', () => {
    expect(fretSpanForWidth(4000, CELL, LABEL)).toBe(MAX_VISIBLE_FRETS);
  });

  it('shows only what fits on a narrower screen', () => {
    expect(fretSpanForWidth(LABEL + CELL * 7, CELL, LABEL)).toBe(7);
  });

  it('drops a fret rather than cutting one in half', () => {
    expect(fretSpanForWidth(LABEL + CELL * 7 + CELL / 2, CELL, LABEL)).toBe(7);
  });

  it('keeps a usable neck on a very small screen', () => {
    expect(fretSpanForWidth(80, CELL, LABEL)).toBe(MIN_VISIBLE_FRETS);
  });

  it('falls back to the full span when the width is not measurable yet', () => {
    expect(fretSpanForWidth(0, CELL, LABEL)).toBe(MAX_VISIBLE_FRETS);
  });
});

describe('windowStartToReveal', () => {
  it('leaves the window alone when the sequence already fits inside it', () => {
    expect(windowStartToReveal([{ string: 6, fret: 3 }], 1, 7)).toBe(1);
  });

  it('slides up to a sequence that sits past the window', () => {
    expect(windowStartToReveal([{ string: 6, fret: 9 }, { string: 5, fret: 12 }], 1, 7)).toBe(9);
  });

  it('slides back down to a sequence below the window', () => {
    expect(windowStartToReveal([{ string: 6, fret: 2 }], 8, 7)).toBe(2);
  });

  it('starts at the beginning of a sequence too long to fit', () => {
    expect(windowStartToReveal([{ string: 6, fret: 3 }, { string: 1, fret: 19 }], 1, 7)).toBe(3);
  });

  it('never starts below the first fret, since fret 0 is the open string', () => {
    expect(windowStartToReveal([{ string: 6, fret: 0 }], 5, 7)).toBe(1);
  });

  it('leaves the window alone for an empty sequence', () => {
    expect(windowStartToReveal([], 4, 7)).toBe(4);
  });
});

describe('orderAlongNeck', () => {
  it('starts on the lowest string, whatever order the notes were marked in', () => {
    const marked = [
      { string: 5 as const, fret: 3 },
      { string: 6 as const, fret: 1 },
    ];

    expect(orderAlongNeck(marked)).toEqual([
      { string: 6, fret: 1 },
      { string: 5, fret: 3 },
    ]);
  });

  it('walks each string from the lowest fret upward', () => {
    const marked = [
      { string: 6 as const, fret: 7 },
      { string: 6 as const, fret: 3 },
      { string: 6 as const, fret: 5 },
    ];

    expect(orderAlongNeck(marked).map((position) => position.fret)).toEqual([3, 5, 7]);
  });

  it('finishes a string before moving to the next one', () => {
    const marked = [
      { string: 5 as const, fret: 2 },
      { string: 6 as const, fret: 9 },
      { string: 5 as const, fret: 4 },
      { string: 6 as const, fret: 1 },
    ];

    expect(orderAlongNeck(marked)).toEqual([
      { string: 6, fret: 1 },
      { string: 6, fret: 9 },
      { string: 5, fret: 2 },
      { string: 5, fret: 4 },
    ]);
  });

  it('leaves the caller\'s array untouched', () => {
    const marked = [
      { string: 5 as const, fret: 3 },
      { string: 6 as const, fret: 1 },
    ];

    orderAlongNeck(marked);

    expect(marked[0]).toEqual({ string: 5, fret: 3 });
  });

  it('handles an empty selection', () => {
    expect(orderAlongNeck([])).toEqual([]);
  });
});
