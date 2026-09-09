import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFretboardStore } from '../state/fretboard-store';
import { useMetronomeStore } from '../state/metronome-store';
import { usePlaybackStore } from '../state/playback-store';
import { useUiStore } from '../state/ui-store';
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

  it('plays the timeline in the exact click order, without deduping repeated note names', async () => {
    useUiStore.setState({ fretboardView: 'timeline' });
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

  it('plays the grid along the neck, starting on the lowest string however it was clicked', async () => {
    useUiStore.setState({ fretboardView: 'grid' });
    useFretboardStore.setState({
      selectedNotes: [
        { string: 5, fret: 3 },
        { string: 6, fret: 1 },
      ],
    });

    const { result } = renderHook(() => useNotePlayback());
    await act(async () => {
      await result.current.play();
    });

    const [notes] = play.mock.calls[0];
    const neckOrder = [
      { string: 6, fret: 1 } as FretPosition,
      { string: 5, fret: 3 } as FretPosition,
    ].map((position) => getNoteAt(STANDARD_TUNING, position).frequency);
    expect(notes.map((note: { frequency: number }) => note.frequency)).toEqual(neckOrder);
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

  it('mutes the notes while the metronome leads, so the click is not muddied', async () => {
    useMetronomeStore.setState({ isPlaying: true });
    useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 3 }] });

    const { result } = renderHook(() => useNotePlayback());
    await act(async () => {
      await result.current.play();
    });

    expect(play.mock.calls[0][3]).toMatchObject({ silent: true });
  });

  it('sounds the notes when the metronome is off', async () => {
    useMetronomeStore.setState({ isPlaying: false });
    useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 3 }] });

    const { result } = renderHook(() => useNotePlayback());
    await act(async () => {
      await result.current.play();
    });

    expect(play.mock.calls[0][3]).toMatchObject({ silent: false });
  });

  it('marks a slurred note to sound softer than the picked note before it', async () => {
    useMetronomeStore.setState({ isPlaying: false });
    useUiStore.setState({ fretboardView: 'timeline' });
    useFretboardStore.setState({
      selectedNotes: [
        { string: 6, fret: 3 },
        { string: 6, fret: 5, articulation: 'hammerOn' },
      ],
    });

    const { result } = renderHook(() => useNotePlayback());
    await act(async () => {
      await result.current.play();
    });

    const [notes] = play.mock.calls[0];
    expect(notes[0].velocity).toBe(1);
    expect(notes[1].velocity).toBeLessThan(notes[0].velocity);
  });

  it('gives a bent note the pitch it travels from and a slower glide than a slide', async () => {
    useMetronomeStore.setState({ isPlaying: false, bpm: 60, subdivision: 'quarter' });
    useUiStore.setState({ fretboardView: 'timeline' });
    useFretboardStore.setState({
      selectedNotes: [
        { string: 6, fret: 7 },
        { string: 6, fret: 9, articulation: 'bend' },
        { string: 6, fret: 5 },
        { string: 6, fret: 9, articulation: 'slide' },
      ],
    });

    const { result } = renderHook(() => useNotePlayback());
    await act(async () => {
      await result.current.play();
    });

    const [notes] = play.mock.calls[0];
    expect(notes[0].glide).toBeUndefined();
    expect(notes[1].glide.fromHz).toBeCloseTo(notes[0].frequency, 5);
    expect(notes[3].glide.seconds).toBeLessThan(notes[1].glide.seconds);
  });

  it('never glides the first note, which has no pitch to travel from', async () => {
    useMetronomeStore.setState({ isPlaying: false });
    useUiStore.setState({ fretboardView: 'timeline' });
    useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 9, articulation: 'slide' }] });

    const { result } = renderHook(() => useNotePlayback());
    await act(async () => {
      await result.current.play();
    });

    expect(play.mock.calls[0][0][0].glide).toBeUndefined();
  });
});
