import { describe, it, expect } from 'vitest';
import { SUBDIVISION_DURATIONS } from './rhythm';

describe('SUBDIVISION_DURATIONS', () => {
  it('maps every subdivision to a Tone.js notation string', () => {
    expect(SUBDIVISION_DURATIONS.quarter).toBe('4n');
    expect(SUBDIVISION_DURATIONS.eighth).toBe('8n');
    expect(SUBDIVISION_DURATIONS.triplet).toBe('8t');
    expect(SUBDIVISION_DURATIONS.sixteenth).toBe('16n');
  });
});
