import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFretboardStore } from '../state/fretboard-store';

const { playNote, ensureAudioStarted } = vi.hoisted(() => ({
  playNote: vi.fn(),
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../audio', () => ({
  sampler: { isLoaded: () => true, playNote },
  ensureAudioStarted,
}));

import { useFretboardSelection } from './useFretboardSelection';

describe('useFretboardSelection', () => {
  beforeEach(() => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [] });
    playNote.mockClear();
    ensureAudioStarted.mockClear();
  });

  it('plays the note frequency and toggles the store entry on toggleNote', async () => {
    const { result } = renderHook(() => useFretboardSelection());

    await act(async () => {
      await result.current.toggleNote({ string: 6, fret: 0 });
    });

    expect(ensureAudioStarted).toHaveBeenCalled();
    expect(playNote).toHaveBeenCalledWith(expect.closeTo(82.41, 1), 0.5);
    expect(result.current.selectedNotes).toEqual([{ string: 6, fret: 0 }]);
  });
});
