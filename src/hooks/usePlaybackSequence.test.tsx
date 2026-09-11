import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFretboardStore } from '../state/fretboard-store';
import { useUiStore } from '../state/ui-store';
import { usePlaybackStore } from '../state/playback-store';
import { usePlaybackSequence } from './usePlaybackSequence';

const markedOutOfOrder = [
  { string: 5 as const, fret: 3 },
  { string: 6 as const, fret: 1 },
  { string: 6 as const, fret: 4 },
];

describe('usePlaybackSequence', () => {
  beforeEach(() => {
    useFretboardStore.setState({ selectedNotes: markedOutOfOrder });
    useUiStore.setState({ fretboardView: 'grid' });
    usePlaybackStore.setState({ direction: 'sixthToFirst' });
    useFretboardStore.setState({ patternBase: [], patternExtensions: 0 });
  });

  it('plays the grid along the neck, whatever order the notes were marked in', () => {
    const { result } = renderHook(() => usePlaybackSequence());

    expect(result.current).toEqual([
      { string: 6, fret: 1 },
      { string: 6, fret: 4 },
      { string: 5, fret: 3 },
    ]);
  });

  it('plays the timeline in the order the notes were marked', () => {
    useUiStore.setState({ fretboardView: 'timeline' });

    const { result } = renderHook(() => usePlaybackSequence());

    expect(result.current).toEqual(markedOutOfOrder);
  });

  it('is empty when nothing is selected', () => {
    useFretboardStore.setState({ selectedNotes: [] });

    expect(renderHook(() => usePlaybackSequence()).result.current).toEqual([]);
  });

  // A pattern walked up the neck is the same exercise played again in a new
  // position, so each position gets its own run through — its own turn at the
  // end when practising both ways. Applying the direction to the whole chain
  // instead would play every position out, then every position back, and the
  // first position would not come round again until the very end.
  describe('a pattern extended up the neck', () => {
    const base = [
      { string: 6 as const, fret: 5 },
      { string: 6 as const, fret: 7 },
    ];

    beforeEach(() => {
      useUiStore.setState({ fretboardView: 'timeline' });
      useFretboardStore.getState().loadSequence(base);
      useFretboardStore.getState().extendPattern(1);
    });

    const frets = () => renderHook(() => usePlaybackSequence()).result.current.map((p) => p.fret);

    it('plays each position through, going one way', () => {
      usePlaybackStore.setState({ direction: 'sixthToFirst' });

      expect(frets()).toEqual([5, 7, 6, 8]);
    });

    it('turns at the end of each position when practising both ways', () => {
      usePlaybackStore.setState({ direction: 'roundTrip' });

      expect(frets()).toEqual([5, 7, 5, 6, 8, 6]);
    });

    it('reverses each position when practising the other way', () => {
      usePlaybackStore.setState({ direction: 'firstToSixth' });

      expect(frets()).toEqual([7, 5, 8, 6]);
    });

    it('keeps the positions in the order they were added, whatever the direction', () => {
      usePlaybackStore.setState({ direction: 'firstToSixth' });

      // The second position still comes second: reversing is within a run,
      // not across the whole exercise.
      expect(frets().slice(2)).toEqual([8, 6]);
    });

    it('behaves exactly as before when nothing was added', () => {
      useFretboardStore.getState().extendPattern(-1);
      usePlaybackStore.setState({ direction: 'roundTrip' });

      expect(frets()).toEqual([5, 7, 5]);
    });
  });
});
