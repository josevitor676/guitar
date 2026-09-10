import { describe, it, expect } from 'vitest';
import { countInSeconds, countInOffsetBeats, COUNT_IN_BEATS } from './count-in';

describe('countInSeconds', () => {
  it('counts three beats at the tempo in force', () => {
    expect(countInSeconds(60)).toBeCloseTo(3, 5);
    expect(countInSeconds(120)).toBeCloseTo(1.5, 5);
  });

  it('takes longer at a slower tempo, which is the point of counting in', () => {
    expect(countInSeconds(40)).toBeGreaterThan(countInSeconds(200));
  });
});

describe('countInOffsetBeats', () => {
  it('counts whole beats, not the figure the exercise is written in', () => {
    // Three beats is three quarters, or six eighths, or twelve semiquavers.
    expect(countInOffsetBeats('quarter')).toBe(COUNT_IN_BEATS);
    expect(countInOffsetBeats('eighth')).toBe(6);
    expect(countInOffsetBeats('sixteenth')).toBe(12);
  });
});
