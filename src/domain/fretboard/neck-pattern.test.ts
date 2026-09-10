import { describe, it, expect } from 'vitest';
import { extendedSequence, canExtend, canShrink } from './neck-pattern';
import type { FretPosition } from '../music-theory/tuning';

const base: FretPosition[] = [
  { string: 6, fret: 5 },
  { string: 5, fret: 7, articulation: 'hammerOn' },
];

describe('extendedSequence', () => {
  it('is just the pattern when nothing has been added', () => {
    expect(extendedSequence(base, 0)).toEqual(base);
  });

  // The shape is played through at one position, then through again a fret
  // further up — which is how a pattern is walked along the neck. Duplicating
  // each note in place would interleave the two positions instead.
  it('plays the whole shape again, one fret further up', () => {
    expect(extendedSequence(base, 1).map((p) => p.fret)).toEqual([5, 7, 6, 8]);
  });

  it('adds one more position for each extension', () => {
    expect(extendedSequence(base, 2).map((p) => p.fret)).toEqual([5, 7, 6, 8, 7, 9]);
  });

  it('stays on the same strings, since walking up is a fret move', () => {
    expect(extendedSequence(base, 1).map((p) => p.string)).toEqual([6, 5, 6, 5]);
  });

  it('carries the technique into every repetition', () => {
    expect(extendedSequence(base, 2).map((p) => p.articulation)).toEqual([
      undefined, 'hammerOn', undefined, 'hammerOn', undefined, 'hammerOn',
    ]);
  });

  it('leaves the pattern untouched', () => {
    extendedSequence(base, 3);
    expect(base[0].fret).toBe(5);
  });
});

describe('canExtend', () => {
  it('allows another repetition while it fits on the neck', () => {
    expect(canExtend(base, 0)).toBe(true);
  });

  it('refuses the repetition that would run off the end of the neck', () => {
    expect(canExtend([{ string: 1, fret: 24 }], 0)).toBe(false);
    // Already at 23 with one repetition; the next would land on 25.
    expect(canExtend([{ string: 1, fret: 23 }], 1)).toBe(false);
    expect(canExtend([{ string: 1, fret: 22 }], 1)).toBe(true);
  });

  it('refuses to extend nothing', () => {
    expect(canExtend([], 0)).toBe(false);
  });
});

describe('canShrink', () => {
  it('allows taking back a repetition that was added', () => {
    expect(canShrink(1)).toBe(true);
  });

  // The pattern itself is the exercise; removing it is what the clear button
  // is for, not the button that took repetitions away.
  it('refuses to eat into the pattern itself', () => {
    expect(canShrink(0)).toBe(false);
  });
});
