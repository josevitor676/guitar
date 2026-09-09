import { useMemo } from 'react';
import type { FretPosition } from '../domain/music-theory/tuning';
import { orderAlongNeck, applyDirection } from '../domain/fretboard/fretboard-model';
import { useFretboardStore } from '../state/fretboard-store';
import { useUiStore } from '../state/ui-store';
import { usePlaybackStore } from '../state/playback-store';

/**
 * The selected notes in the order they will be played.
 *
 * Which order that is depends on the view. The grid is a map of the neck with
 * no time axis, so it plays along the neck: lowest string first, each string
 * from the nut up. The timeline's horizontal axis is time itself, so there the
 * order the student marked the notes in *is* the sequence.
 *
 * The practice direction is applied last, so a scale drilled up and down is one
 * sequence that turns at the top rather than two separate runs.
 */
export function usePlaybackSequence(): FretPosition[] {
  const selectedNotes = useFretboardStore((state) => state.selectedNotes);
  const fretboardView = useUiStore((state) => state.fretboardView);
  const direction = usePlaybackStore((state) => state.direction);

  return useMemo(() => {
    const ordered = fretboardView === 'grid' ? orderAlongNeck(selectedNotes) : selectedNotes;
    return applyDirection(ordered, direction);
  }, [selectedNotes, fretboardView, direction]);
}
