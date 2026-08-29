import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFretboardStore } from '../state/fretboard-store';
import { useMetronomeStore } from '../state/metronome-store';

const { play, stop, onNoteChange, ensureAudioStarted } = vi.hoisted(() => ({
  play: vi.fn(),
  stop: vi.fn(),
  onNoteChange: vi.fn(),
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../audio', () => ({
  sequencePlayer: { play, stop, onNoteChange: (cb: (i: number) => void) => onNoteChange(cb) },
  ensureAudioStarted,
}));

import { useNotePlayback } from './useNotePlayback';

describe('useNotePlayback', () => {
  beforeEach(() => {
    useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 0 }, { string: 5, fret: 2 }] });
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter' });
    play.mockClear();
    stop.mockClear();
    onNoteChange.mockClear();
  });

  it('converts selected positions to notes and calls sequencePlayer.play with bpm/subdivision', async () => {
    const { result } = renderHook(() => useNotePlayback());

    await act(async () => {
      await result.current.play();
    });

    expect(play).toHaveBeenCalledTimes(1);
    const [notes, bpm, subdivision] = play.mock.calls[0];
    expect(notes).toHaveLength(2);
    expect(bpm).toBe(100);
    expect(subdivision).toBe('quarter');
  });

  it('calls sequencePlayer.stop on stop()', () => {
    const { result } = renderHook(() => useNotePlayback());
    act(() => {
      result.current.stop();
    });
    expect(stop).toHaveBeenCalled();
  });
});
