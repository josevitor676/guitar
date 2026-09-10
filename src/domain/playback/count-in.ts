import type { Subdivision } from '../music-theory/rhythm';
import { SUBDIVISION_BEATS } from '../music-theory/rhythm';

/** Beats counted aloud before the sequence starts. */
export const COUNT_IN_BEATS = 3;

/**
 * How long the count-in lasts, in seconds.
 *
 * It is counted in whole beats rather than in the chosen rhythmic figure: the
 * student counts "1, 2, 3" at the pulse, not in semiquavers, whatever the
 * exercise is written in.
 */
export function countInSeconds(bpm: number): number {
  return COUNT_IN_BEATS * (60 / bpm);
}

/** The beat the sequence begins on, once the count-in has been counted. */
export function countInOffsetBeats(spacing: Subdivision): number {
  return COUNT_IN_BEATS / SUBDIVISION_BEATS[spacing];
}
