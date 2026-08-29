import { describe, it, expect } from 'vitest';
import { getIntervalSemitones, getIntervalDegreeLabel } from './intervals';

describe('getIntervalSemitones', () => {
  it('returns 0 for the same note an octave apart', () => {
    expect(getIntervalSemitones(60, 72)).toBe(0);
  });

  it('returns 7 for a perfect fifth', () => {
    expect(getIntervalSemitones(60, 67)).toBe(7);
  });

  it('wraps negative differences into 0-11', () => {
    expect(getIntervalSemitones(67, 60)).toBe(5);
  });
});

describe('getIntervalDegreeLabel', () => {
  it('labels 0 semitones as the root (1)', () => {
    expect(getIntervalDegreeLabel(0)).toBe('1');
  });

  it('labels 4 semitones as a major third (3)', () => {
    expect(getIntervalDegreeLabel(4)).toBe('3');
  });

  it('labels 3 semitones as a minor third (b3)', () => {
    expect(getIntervalDegreeLabel(3)).toBe('b3');
  });

  it('labels 7 semitones as a perfect fifth (5)', () => {
    expect(getIntervalDegreeLabel(7)).toBe('5');
  });
});
