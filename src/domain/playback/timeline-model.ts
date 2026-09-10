import type { FretPosition } from '../music-theory/tuning';
import type { Subdivision } from '../music-theory/rhythm';
import { SUBDIVISION_BEATS } from '../music-theory/rhythm';

export interface TimedNote {
  index: number;
  position: FretPosition;
  startBeat: number;
  durationBeats: number;
}

export function buildTimeline(
  positions: FretPosition[],
  spacing: Subdivision,
  durationFor: (position: FretPosition) => Subdivision,
): TimedNote[] {
  const spacingInBeats = SUBDIVISION_BEATS[spacing];

  return positions.map((position, index) => ({
    index,
    position,
    startBeat: index * spacingInBeats,
    durationBeats: SUBDIVISION_BEATS[durationFor(position)],
  }));
}

export function timelineLengthInBeats(timeline: TimedNote[]): number {
  return timeline.reduce((end, note) => Math.max(end, note.startBeat + note.durationBeats), 0);
}

/**
 * Whether a note falls on the head of a beat, which is where the metronome
 * clicks. With eighths every other note lands there; with quarters, all of
 * them.
 */
export function isOnBeatHead(note: TimedNote): boolean {
  return Math.abs(note.startBeat - Math.round(note.startBeat)) < 1e-6;
}

/**
 * The positions whose notes fall on a beat head, keyed as "string:fret".
 *
 * The grid has no time axis, so it cannot show *when* a note lands — but it can
 * mark *which* notes coincide with the click, which is what the student needs
 * to see while practising against a metronome. A position played more than once
 * counts if any of its turns falls on a beat.
 */
export function beatHeadPositionKeys(timeline: TimedNote[]): Set<string> {
  const keys = new Set<string>();

  for (const note of timeline) {
    if (isOnBeatHead(note)) keys.add(`${note.position.string}:${note.position.fret}`);
  }

  return keys;
}
