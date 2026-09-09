import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFretboardStore } from '../state/fretboard-store';
import { useUiStore } from '../state/ui-store';
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
});
