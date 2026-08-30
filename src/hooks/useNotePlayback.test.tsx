import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFretboardStore } from '../state/fretboard-store';
import { useMetronomeStore } from '../state/metronome-store';
import { usePlaybackStore } from '../state/playback-store';
import { getNoteAt } from '../domain/music-theory/notes';
import { STANDARD_TUNING, type FretPosition } from '../domain/music-theory/tuning';
import { SUBDIVISION_DURATIONS } from '../domain/music-theory/rhythm';

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
    useMetronomeStore.setState({
      bpm: 100,
      subdivision: 'quarter',
      rhythmMode: 'note',
      subdivisionByString: { 1: 'quarter', 2: 'quarter', 3: 'quarter', 4: 'quarter', 5: 'quarter', 6: 'quarter' },
    });
    usePlaybackStore.setState({ isPlaying: false, currentIndex: null });
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
    expect(notes[0].duration).toBe(SUBDIVISION_DURATIONS.quarter);
  });

  it('calls sequencePlayer.stop on stop()', () => {
    const { result } = renderHook(() => useNotePlayback());
    act(() => {
      result.current.stop();
    });
    expect(stop).toHaveBeenCalled();
  });

  it('shares currentIndex/isPlaying across independent hook instances, so stop() in one clears the highlight seen by the other', async () => {
    const a = renderHook(() => useNotePlayback());
    const b = renderHook(() => useNotePlayback());

    await act(async () => {
      await a.result.current.play();
    });

    act(() => {
      usePlaybackStore.getState().setCurrentIndex(1);
    });

    expect(a.result.current.currentIndex).toBe(1);
    expect(b.result.current.currentIndex).toBe(1);

    act(() => {
      b.result.current.stop();
    });

    expect(a.result.current.currentIndex).toBeNull();
    expect(a.result.current.isPlaying).toBe(false);
  });

  it('preserves the exact click order the user selected (F#, C, F#, G, C#, B), without sorting by string/fret and without deduping repeated note names', async () => {
    const clickOrder: FretPosition[] = [
      { string: 6, fret: 2 }, // F#2
      { string: 2, fret: 1 }, // C4
      { string: 1, fret: 2 }, // F#4 (same note name as the first, different position)
      { string: 1, fret: 3 }, // G4
      { string: 2, fret: 2 }, // C#4
      { string: 2, fret: 0 }, // B3
    ];
    useFretboardStore.setState({ selectedNotes: clickOrder });

    const { result } = renderHook(() => useNotePlayback());
    await act(async () => {
      await result.current.play();
    });

    const [notes] = play.mock.calls[0];
    const expectedFrequencies = clickOrder.map((position) => getNoteAt(STANDARD_TUNING, position).frequency);
    expect(notes.map((note: { frequency: number }) => note.frequency)).toEqual(expectedFrequencies);
  });

  it('resets currentIndex before starting a new sequence, clearing any stale highlight', async () => {
    usePlaybackStore.setState({ isPlaying: false, currentIndex: 3 });
    const { result } = renderHook(() => useNotePlayback());

    let indexDuringPlayCall: number | null = null;
    play.mockImplementationOnce(() => {
      indexDuringPlayCall = usePlaybackStore.getState().currentIndex;
    });

    await act(async () => {
      await result.current.play();
    });

    expect(indexDuringPlayCall).toBeNull();
  });

  it('uses the per-string subdivision duration when rhythmMode is "string"', async () => {
    useFretboardStore.setState({
      selectedNotes: [
        { string: 6, fret: 0 },
        { string: 1, fret: 0 },
      ],
    });
    useMetronomeStore.setState({
      bpm: 100,
      subdivision: 'quarter',
      rhythmMode: 'string',
      subdivisionByString: { 1: 'sixteenth', 2: 'quarter', 3: 'quarter', 4: 'quarter', 5: 'quarter', 6: 'eighth' },
    });

    const { result } = renderHook(() => useNotePlayback());
    await act(async () => {
      await result.current.play();
    });

    const [notes, , spacingSubdivision] = play.mock.calls[0];
    expect(notes[0].duration).toBe('8n');
    expect(notes[1].duration).toBe('16n');
    expect(spacingSubdivision).toBe('quarter');
  });
});
