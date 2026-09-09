import { useMemo } from 'react';
import { useFretboardStore } from '../state/fretboard-store';
import { useMetronomeStore } from '../state/metronome-store';
import { buildTimeline } from '../domain/playback/timeline-model';
import type { TimedNote } from '../domain/playback/timeline-model';

export function useTimeline(): TimedNote[] {
  const selectedNotes = useFretboardStore((state) => state.selectedNotes);
  const subdivision = useMetronomeStore((state) => state.subdivision);
  const rhythmMode = useMetronomeStore((state) => state.rhythmMode);
  const subdivisionByString = useMetronomeStore((state) => state.subdivisionByString);

  return useMemo(
    () =>
      buildTimeline(selectedNotes, subdivision, (position) =>
        rhythmMode === 'string' ? subdivisionByString[position.string] : subdivision,
      ),
    [selectedNotes, subdivision, rhythmMode, subdivisionByString],
  );
}
