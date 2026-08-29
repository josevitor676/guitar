import { describe, it, expect, vi, beforeEach } from 'vitest';

const triggerAttackRelease = vi.fn();
let capturedOnload: (() => void) | undefined;

vi.mock('tone', () => {
  return {
    Sampler: function(options: { onload?: () => void }) {
      capturedOnload = options.onload;
      return {
        toDestination: vi.fn().mockReturnThis(),
        triggerAttackRelease,
      };
    },
  };
});

import { ToneNoteSampler } from './sampler';

describe('ToneNoteSampler', () => {
  beforeEach(() => {
    triggerAttackRelease.mockClear();
    capturedOnload = undefined;
  });

  it('is not loaded until the underlying Tone.Sampler fires onload', () => {
    const sampler = new ToneNoteSampler();
    expect(sampler.isLoaded()).toBe(false);
  });

  it('becomes loaded once the sample onload callback fires', () => {
    const sampler = new ToneNoteSampler();
    capturedOnload?.();
    expect(sampler.isLoaded()).toBe(true);
  });

  it('does not play a note before samples are loaded', () => {
    const sampler = new ToneNoteSampler();
    sampler.playNote(440, 0.5);
    expect(triggerAttackRelease).not.toHaveBeenCalled();
  });

  it('triggers the underlying sampler once loaded', () => {
    const sampler = new ToneNoteSampler();
    capturedOnload?.();
    sampler.playNote(440, 0.5);
    expect(triggerAttackRelease).toHaveBeenCalledWith(440, 0.5);
  });
});
