import { useMemo } from 'react';
import { useMetronomeStore } from '../state/metronome-store';
import { usePlaybackSequence } from './usePlaybackSequence';
import { buildTimeline } from '../domain/playback/timeline-model';
import type { TimedNote } from '../domain/playback/timeline-model';

export function useTimeline(): TimedNote[] {
  const sequence = usePlaybackSequence();
  const subdivision = useMetronomeStore((state) => state.subdivision);

  return useMemo(
    () => buildTimeline(sequence, subdivision, () => subdivision),
    [sequence, subdivision],
  );
}
