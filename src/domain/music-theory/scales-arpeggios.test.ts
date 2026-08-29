import { describe, it, expect } from 'vitest';
import { SCALE_PATTERNS, ARPEGGIO_PATTERNS, generatePositionsForPattern } from './scales-arpeggios';
import { STANDARD_TUNING } from './tuning';
import { getNoteAt } from './notes';

describe('SCALE_PATTERNS', () => {
  it('defines the major scale as whole/half step intervals from the root', () => {
    expect(SCALE_PATTERNS.major).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });
});

describe('ARPEGGIO_PATTERNS', () => {
  it('defines the major triad as root, third, fifth', () => {
    expect(ARPEGGIO_PATTERNS.majorTriad).toEqual([0, 4, 7]);
  });
});

describe('generatePositionsForPattern', () => {
  it('only returns positions within the given fret range', () => {
    const positions = generatePositionsForPattern(STANDARD_TUNING, 'C', SCALE_PATTERNS.major, {
      minFret: 0,
      maxFret: 3,
    });
    expect(positions.every((p) => p.fret >= 0 && p.fret <= 3)).toBe(true);
    expect(positions.length).toBeGreaterThan(0);
  });

  it('every returned position actually belongs to the C major scale', () => {
    const positions = generatePositionsForPattern(STANDARD_TUNING, 'C', SCALE_PATTERNS.major, {
      minFret: 0,
      maxFret: 3,
    });
    const majorPitchClasses = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    for (const position of positions) {
      const note = getNoteAt(STANDARD_TUNING, position);
      expect(majorPitchClasses).toContain(note.pitchClass);
    }
  });

  it('includes the open low-E string when it matches the pattern', () => {
    const positions = generatePositionsForPattern(STANDARD_TUNING, 'E', SCALE_PATTERNS.major, {
      minFret: 0,
      maxFret: 0,
    });
    expect(positions).toContainEqual({ string: 6, fret: 0 });
    expect(positions).toContainEqual({ string: 1, fret: 0 });
  });
});
