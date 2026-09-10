/** A chord quality, written as the semitones it stacks above its root. */
export interface ChordQuality {
  /** What follows the root in the chord's name: "" for major, "m", "7"... */
  symbol: string;
  intervals: number[];
  /** The interval that gives the chord its colour, needed for it to be that chord. */
  defining: number[];
}

/**
 * Ordered from the plainest to the most decorated.
 *
 * Identification walks this list in order, so a triad is preferred over a
 * seventh chord that happens to fit the same notes. Reading E-G-B as an
 * incomplete Em7 rather than as Em would be technically possible and always
 * wrong.
 */
export const CHORD_QUALITIES: ChordQuality[] = [
  { symbol: '', intervals: [0, 4, 7], defining: [0, 4, 7] },
  { symbol: 'm', intervals: [0, 3, 7], defining: [0, 3, 7] },
  { symbol: 'dim', intervals: [0, 3, 6], defining: [0, 3, 6] },
  { symbol: 'aug', intervals: [0, 4, 8], defining: [0, 4, 8] },
  { symbol: 'sus2', intervals: [0, 2, 7], defining: [0, 2, 7] },
  { symbol: 'sus4', intervals: [0, 5, 7], defining: [0, 5, 7] },
  { symbol: '5', intervals: [0, 7], defining: [0, 7] },
  { symbol: '6', intervals: [0, 4, 7, 9], defining: [0, 4, 9] },
  { symbol: 'm6', intervals: [0, 3, 7, 9], defining: [0, 3, 9] },
  { symbol: '7', intervals: [0, 4, 7, 10], defining: [0, 4, 10] },
  { symbol: 'maj7', intervals: [0, 4, 7, 11], defining: [0, 4, 11] },
  { symbol: 'm7', intervals: [0, 3, 7, 10], defining: [0, 3, 10] },
  { symbol: 'mMaj7', intervals: [0, 3, 7, 11], defining: [0, 3, 11] },
  { symbol: 'm7b5', intervals: [0, 3, 6, 10], defining: [0, 3, 6, 10] },
  { symbol: 'dim7', intervals: [0, 3, 6, 9], defining: [0, 3, 6, 9] },
  { symbol: 'add9', intervals: [0, 2, 4, 7], defining: [0, 2, 4] },
  { symbol: '7sus4', intervals: [0, 5, 7, 10], defining: [0, 5, 10] },
  { symbol: '9', intervals: [0, 2, 4, 7, 10], defining: [0, 2, 4, 10] },
];
