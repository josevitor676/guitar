import { useMemo } from 'react';
import type { FretPosition } from '../domain/music-theory/tuning';
import { orderAlongNeck, applyDirection } from '../domain/fretboard/fretboard-model';
import { patternBlocks } from '../domain/fretboard/neck-pattern';
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
 *
 * A pattern walked up the neck is the exception: it is the same exercise played
 * again in a new position, so each position gets its own run and its own turn.
 * Applying the direction to the whole chain would play every position out and
 * only then every position back, leaving the first one unheard again until the
 * very end.
 */
export function usePlaybackSequence(): FretPosition[] {
  const selectedNotes = useFretboardStore((state) => state.selectedNotes);
  const patternBase = useFretboardStore((state) => state.patternBase);
  const patternExtensions = useFretboardStore((state) => state.patternExtensions);
  const fretboardView = useUiStore((state) => state.fretboardView);
  const direction = usePlaybackStore((state) => state.direction);

  return useMemo(() => {
    // Without repetitions the notes on the neck are the sequence, whatever the
    // pattern bookkeeping happens to hold — an imported exercise never went
    // through it at all.
    const blocks =
      patternExtensions > 0 ? patternBlocks(patternBase, patternExtensions) : [selectedNotes];
    const ordered = fretboardView === 'grid' ? blocks.map(orderAlongNeck) : blocks;

    return ordered.flatMap((block) => applyDirection(block, direction));
  }, [selectedNotes, patternBase, patternExtensions, fretboardView, direction]);
}
