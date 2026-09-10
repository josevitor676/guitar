import { describe, it, expect } from 'vitest';
import { suggestVoicings } from './chord-voicing-generator';
import { identifyChord } from './chord-identification';
import { voicingSpan, voicingKey, ALL_STRINGS, isSounding } from './chord-voicing';
import { STANDARD_TUNING } from '../music-theory/tuning';

const majorOf = (root: string) => suggestVoicings({ root, intervals: [0, 4, 7], tuning: STANDARD_TUNING });

describe('suggestVoicings', () => {
  it('finds ways to play a major chord', () => {
    expect(majorOf('G').length).toBeGreaterThan(4);
  });

  it('only suggests shapes that really are the chord', () => {
    for (const voicing of majorOf('G')) {
      expect(identifyChord(voicing, STANDARD_TUNING)?.root).toBe('G');
    }
  });

  it('never asks the hand to span more than four frets', () => {
    for (const voicing of majorOf('C')) {
      expect(voicingSpan(voicing)).toBeLessThanOrEqual(3);
    }
  });

  it('suggests no shape twice', () => {
    const keys = majorOf('A').map(voicingKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('offers the root in the bass before the inversions', () => {
    const [first] = majorOf('E');
    const lowest = ALL_STRINGS.find((string) => isSounding(first[string]))!;

    expect(identifyChord(first, STANDARD_TUNING)?.isInversion).toBe(false);
    expect(lowest).toBe(6);
  });

  it('finds the open shape for a chord that has one', () => {
    const keys = majorOf('E').map(voicingKey);
    // The open E: every string sounding, 0-2-2-1-0-0 read from the sixth.
    expect(keys).toContain('0,2,2,1,0,0');
  });

  it('sounds at least four strings, since a chord is not two notes', () => {
    for (const voicing of majorOf('D')) {
      const sounding = ALL_STRINGS.filter((string) => isSounding(voicing[string]));
      expect(sounding.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('handles minor and seventh chords too', () => {
    expect(suggestVoicings({ root: 'A', intervals: [0, 3, 7], tuning: STANDARD_TUNING }).length).toBeGreaterThan(3);
    expect(suggestVoicings({ root: 'D', intervals: [0, 4, 7, 10], tuning: STANDARD_TUNING }).length).toBeGreaterThan(3);
  });

  it('returns nothing for a root that is not a note', () => {
    expect(suggestVoicings({ root: 'H', intervals: [0, 4, 7], tuning: STANDARD_TUNING })).toEqual([]);
  });

  it('respects the limit it is given', () => {
    expect(suggestVoicings({ root: 'G', intervals: [0, 4, 7], tuning: STANDARD_TUNING, limit: 5 })).toHaveLength(5);
  });
});
