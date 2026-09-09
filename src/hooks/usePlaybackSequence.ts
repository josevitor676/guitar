import { useMemo } from 'react';
import type { FretPosition } from '../domain/music-theory/tuning';
import { orderAlongNeck } from '../domain/fretboard/fretboard-model';
import { useFretboardStore } from '../state/fretboard-store';
import { useUiStore } from '../state/ui-store';

/**
 * The selected notes in the order they will be played.
 *
 * Which order that is depends on the view. The grid is a map of the neck with
 * no time axis, so it plays along the neck: lowest string first, each string
 * from the nut up. The timeline's horizontal axis is time itself, so there the
 * order the student marked the notes in *is* the sequence.
 */
export function usePlaybackSequence(): FretPosition[] {
  const selectedNotes = useFretboardStore((state) => state.selectedNotes);
  const fretboardView = useUiStore((state) => state.fretboardView);

  return useMemo(
    () => (fretboardView === 'grid' ? orderAlongNeck(selectedNotes) : selectedNotes),
    [selectedNotes, fretboardView],
  );
}
