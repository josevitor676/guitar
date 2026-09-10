import { describe, it, expect } from 'vitest';
import {
  isValidPosition,
  positionsEqual,
  orderAlongNeck,
  applyDirection,
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

  it('leaves a sequence with a repeated note in the order it was built', () => {
    const marked = [7, 5, 7, 5, 7].map((fret) => ({ string: 5 as const, fret }));

    expect(orderAlongNeck(marked).map((position) => position.fret)).toEqual([7, 5, 7, 5, 7]);
  });

  it('keeps the slurs of a sequence it does not reorder', () => {
    const marked = [
      { string: 5 as const, fret: 7 },
      { string: 5 as const, fret: 5, articulation: 'pullOff' as const },
      { string: 5 as const, fret: 7 },
    ];

    expect(orderAlongNeck(marked)[1].articulation).toBe('pullOff');
  });
});

describe('applyDirection', () => {
  const ascending = [
    { string: 6 as const, fret: 5 },
    { string: 6 as const, fret: 8 },
    { string: 5 as const, fret: 5 },
  ];

  it('leaves the sequence as it is when running from the sixth string to the first', () => {
    expect(applyDirection(ascending, 'sixthToFirst')).toEqual(ascending);
  });

  it('reverses the sequence when running from the first string to the sixth', () => {
    expect(applyDirection(ascending, 'firstToSixth').map((position) => position.fret)).toEqual([5, 8, 5]);
    expect(applyDirection(ascending, 'firstToSixth')[0]).toEqual({ string: 5, fret: 5 });
  });

  it('runs out and back, turning at the far end without repeating it', () => {
    const roundTrip = applyDirection(ascending, 'roundTrip');

    expect(roundTrip).toHaveLength(5);
    expect(roundTrip.map((position) => `${position.string}:${position.fret}`)).toEqual([
      '6:5',
      '6:8',
      '5:5',
      '6:8',
      '6:5',
    ]);
  });

  it('ends a round trip on the note it began with', () => {
    const roundTrip = applyDirection(ascending, 'roundTrip');

    expect(roundTrip[roundTrip.length - 1]).toEqual(ascending[0]);
  });

  it('does not double a single note into two', () => {
    const one = [{ string: 6 as const, fret: 5 }];

    expect(applyDirection(one, 'roundTrip')).toEqual(one);
  });

  it('handles an empty sequence in every direction', () => {
    for (const direction of ['sixthToFirst', 'firstToSixth', 'roundTrip'] as const) {
      expect(applyDirection([], direction)).toEqual([]);
    }
  });
});

describe('articulations under reordering', () => {
  const slurred = [
    { string: 6 as const, fret: 3 },
    { string: 6 as const, fret: 5, articulation: 'hammerOn' as const },
    { string: 5 as const, fret: 4 },
  ];

  it('drops articulations when the grid reorders along the neck', () => {
    // The neighbours a slur joined no longer sit next to each other.
    const reordered = orderAlongNeck([
      { string: 5, fret: 4 },
      { string: 6, fret: 3 },
      { string: 6, fret: 5, articulation: 'hammerOn' },
    ]);

    expect(reordered.every((position) => position.articulation === undefined)).toBe(true);
  });

  it('keeps articulations untouched running from the sixth string to the first', () => {
    expect(applyDirection(slurred, 'sixthToFirst')[1].articulation).toBe('hammerOn');
  });

  it('turns a hammer-on into a pull-off when the sequence is reversed', () => {
    const reversed = applyDirection(slurred, 'firstToSixth');

    // Reversed order is 5:4, 6:5, 6:3 — the slur now lands on the note reached.
    expect(reversed.map((p) => `${p.string}:${p.fret}`)).toEqual(['5:4', '6:5', '6:3']);
    expect(reversed[2].articulation).toBe('pullOff');
    expect(reversed[1].articulation).toBeUndefined();
  });

  it('never gives the first note an articulation, since nothing precedes it', () => {
    for (const direction of ['sixthToFirst', 'firstToSixth', 'roundTrip'] as const) {
      expect(applyDirection(slurred, direction)[0].articulation).toBeUndefined();
    }
  });

  it('slurs the return leg of a round trip the other way round', () => {
    const roundTrip = applyDirection(slurred, 'roundTrip');

    expect(roundTrip.map((p) => `${p.string}:${p.fret}`)).toEqual(['6:3', '6:5', '5:4', '6:5', '6:3']);
    expect(roundTrip[1].articulation).toBe('hammerOn');
    expect(roundTrip[4].articulation).toBe('pullOff');
  });
});
