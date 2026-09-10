import { describe, it, expect } from 'vitest';
import { nearestSample, SAMPLE_NOTES } from './guitar-samples';

describe('nearestSample', () => {
  it('returns a recording that exists', () => {
    expect(SAMPLE_NOTES).toContain(nearestSample(200).note);
  });

  it('returns a recording at its own pitch', () => {
    // A2 is 110 Hz.
    const { note, rootHz } = nearestSample(110);
    expect(note).toBe('A2');
    expect(rootHz).toBeCloseTo(110, 0);
  });

  it('picks the recording nearest in pitch, not nearest in hertz', () => {
    // 320 Hz sits between D3 (147) and G3 (196) in hertz terms far from both,
    // but by ratio it is closest to C4 (262) rather than to E4 (330)... and E4
    // is in fact the nearer, which only a ratio comparison gets right.
    expect(nearestSample(320).note).toBe('E4');
  });

  it('never strays more than half an octave from the recording', () => {
    for (const hz of [85, 130, 175, 240, 310, 420, 560, 700]) {
      const { rootHz } = nearestSample(hz);
      expect(Math.abs(Math.log2(hz / rootHz))).toBeLessThan(0.5);
    }
  });

  it('handles a pitch below every recording without failing', () => {
    expect(nearestSample(60).note).toBe('E2');
  });
});
