import { describe, it, expect } from 'vitest';
import { SUBDIVISION_DURATIONS, SUBDIVISION_BEATS } from './rhythm';

describe('SUBDIVISION_DURATIONS', () => {
  it('maps every subdivision to a Tone.js notation string', () => {
    expect(SUBDIVISION_DURATIONS.quarter).toBe('4n');
    expect(SUBDIVISION_DURATIONS.eighth).toBe('8n');
    expect(SUBDIVISION_DURATIONS.triplet).toBe('8t');
    expect(SUBDIVISION_DURATIONS.sixteenth).toBe('16n');
  });
});

describe('SUBDIVISION_BEATS', () => {
  it('measures every subdivision in quarter-note beats', () => {
    expect(SUBDIVISION_BEATS.quarter).toBe(1);
    expect(SUBDIVISION_BEATS.eighth).toBe(0.5);
    expect(SUBDIVISION_BEATS.sixteenth).toBe(0.25);
  });

  it('makes three triplets fill exactly one beat', () => {
    expect(SUBDIVISION_BEATS.triplet * 3).toBeCloseTo(1, 10);
  });
});
