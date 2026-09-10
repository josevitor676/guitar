import { describe, it, expect } from 'vitest';
import { canTranspose, transpose } from './transpose';
import type { FretPosition } from '../music-theory/tuning';

const riff: FretPosition[] = [
  { string: 6, fret: 3 },
  { string: 6, fret: 5, articulation: 'hammerOn' },
  { string: 5, fret: 7 },
];

describe('transpose', () => {
  it('moves every note the same number of frets, keeping the shape', () => {
    expect(transpose(riff, 1).map((position) => position.fret)).toEqual([4, 6, 8]);
  });

  it('moves back down again', () => {
    expect(transpose(riff, -2).map((position) => position.fret)).toEqual([1, 3, 5]);
  });

  it('stays on the same strings, since a fret shift is not a string shift', () => {
    expect(transpose(riff, 3).map((position) => position.string)).toEqual([6, 6, 5]);
  });

  // The technique belongs to the pair of notes, not to the frets they sit on.
  it('carries the articulations along', () => {
    expect(transpose(riff, 4)[1].articulation).toBe('hammerOn');
  });

  it('leaves the original untouched', () => {
    transpose(riff, 5);
    expect(riff[0].fret).toBe(3);
  });
});

describe('canTranspose', () => {
  it('allows a move that keeps every note on the neck', () => {
    expect(canTranspose(riff, 1)).toBe(true);
  });

  // Half a riff moved is not the riff: clamping the notes that would fall off
  // would silently change the intervals between them.
  it('refuses a move that would push any note past the last fret', () => {
    expect(canTranspose([{ string: 1, fret: 24 }], 1)).toBe(false);
  });

  it('refuses a move that would push any note below the nut', () => {
    expect(canTranspose(riff, -4)).toBe(false);
  });

  it('allows an open string to become a fretted note', () => {
    expect(canTranspose([{ string: 6, fret: 0 }], 1)).toBe(true);
  });

  it('refuses to move nothing, which would only look broken', () => {
    expect(canTranspose([], 1)).toBe(false);
  });
});
