import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFretboardStore } from '../state/fretboard-store';
import { useMetronomeStore } from '../state/metronome-store';

vi.mock('../audio', () => ({
  sampler: { isLoaded: () => true, playNote: vi.fn() },
  metronome: { start: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), setSubdivision: vi.fn(), onPulse: () => () => {} },
  sequencePlayer: { play: vi.fn(), stop: vi.fn(), onNoteChange: () => () => {} },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { useTimeline } from './useTimeline';

describe('useTimeline', () => {
  beforeEach(() => {
    useFretboardStore.setState({
      selectedNotes: [
        { string: 6, fret: 3 },
        { string: 1, fret: 5 },
      ],
    });
    useMetronomeStore.setState({
      subdivision: 'quarter',
      rhythmMode: 'note',
      subdivisionByString: { 1: 'quarter', 2: 'quarter', 3: 'quarter', 4: 'quarter', 5: 'quarter', 6: 'quarter' },
    });
  });

  it('spaces the selected notes by the global subdivision', () => {
    useMetronomeStore.setState({ subdivision: 'eighth' });

    const { result } = renderHook(() => useTimeline());

    expect(result.current.map((note) => note.startBeat)).toEqual([0, 0.5]);
  });

  it('uses the global figure for every note in note mode', () => {
    const { result } = renderHook(() => useTimeline());

    expect(result.current.map((note) => note.durationBeats)).toEqual([1, 1]);
  });

  it('resolves each note duration from its own string in string mode', () => {
    useMetronomeStore.setState({
      rhythmMode: 'string',
      subdivisionByString: { 1: 'sixteenth', 2: 'quarter', 3: 'quarter', 4: 'quarter', 5: 'quarter', 6: 'eighth' },
    });

    const { result } = renderHook(() => useTimeline());

    expect(result.current.map((note) => note.durationBeats)).toEqual([0.5, 0.25]);
    expect(result.current.map((note) => note.startBeat)).toEqual([0, 1]);
  });
});
