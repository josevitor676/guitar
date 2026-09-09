import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMetronomeStore } from '../state/metronome-store';

const { start, stop, setBpm, setSubdivision, onPulse, ensureAudioStarted } = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  setBpm: vi.fn(),
  setSubdivision: vi.fn(),
  onPulse: vi.fn(),
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../audio', () => ({
  metronome: { start, stop, setBpm, setSubdivision, onPulse: (cb: (i: number) => void) => onPulse(cb) },
  ensureAudioStarted,
}));

import { useMetronome } from './useMetronome';

describe('useMetronome', () => {
  beforeEach(() => {
    useMetronomeStore.setState({
      bpm: 100,
      subdivision: 'quarter',
      isPlaying: false,
      currentPulse: 0,
    });
    start.mockClear();
    stop.mockClear();
    setBpm.mockClear();
    setSubdivision.mockClear();
  });

  it('starts the audio engine metronome and flips the store to playing', async () => {
    const { result } = renderHook(() => useMetronome());

    await act(async () => {
      await result.current.start();
    });

    expect(ensureAudioStarted).toHaveBeenCalled();
    expect(start).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(true);
  });

  it('propagates setBpm to both the store and the audio engine', () => {
    const { result } = renderHook(() => useMetronome());
    act(() => {
      result.current.setBpm(140);
    });
    expect(result.current.bpm).toBe(140);
    expect(setBpm).toHaveBeenCalledWith(140);
  });

});
