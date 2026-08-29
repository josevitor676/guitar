import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('tone', () => {
  return {
    start: vi.fn().mockResolvedValue(undefined),
  };
});

import { ensureAudioStarted } from './audio-context';
import * as Tone from 'tone';

const getToneMock = () => vi.mocked(Tone);

describe('ensureAudioStarted', () => {
  beforeEach(() => {
    getToneMock().start.mockClear();
  });

  it('calls Tone.start() the first time it is invoked', async () => {
    await ensureAudioStarted();
    expect(getToneMock().start).toHaveBeenCalledTimes(1);
  });
});
