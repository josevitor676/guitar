import { useMemo } from 'react';
import { useFretboardStore } from '../state/fretboard-store';
import { useMetronomeStore } from '../state/metronome-store';
import { buildTimeline } from '../domain/playback/timeline-model';
import type { TimedNote } from '../domain/playback/timeline-model';

export function useTimeline(): TimedNote[] {
  const selectedNotes = useFretboardStore((state) => state.selectedNotes);
  const subdivision = useMetronomeStore((state) => state.subdivision);

  return useMemo(
    () => buildTimeline(selectedNotes, subdivision, () => subdivision),
    [selectedNotes, subdivision],
  );
}
