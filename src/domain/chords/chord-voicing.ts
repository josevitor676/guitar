import type { StringNumber } from '../music-theory/tuning';

/** What one string does in a chord: a fret number, 0 meaning open, or not played. */
export type StringPlay = number | 'muted';

/**
 * A chord as the hand holds it: every string has a state, always.
 *
 * A list of positions cannot say this. A string missing from such a list is
 * ambiguous — is it ringing open, or deliberately not played? In a chord that
 * is the difference between two different chords.
 */
export type ChordVoicing = Record<StringNumber, StringPlay>;

export const ALL_STRINGS: StringNumber[] = [6, 5, 4, 3, 2, 1];

export const SILENT_VOICING: ChordVoicing = { 6: 'muted', 5: 'muted', 4: 'muted', 3: 'muted', 2: 'muted', 1: 'muted' };

export function isSounding(play: StringPlay): play is number {
  return play !== 'muted';
}

/** How many frets the hand must span, ignoring open and muted strings. */
export function voicingSpan(voicing: ChordVoicing): number {
  const fretted = ALL_STRINGS.map((string) => voicing[string]).filter(
    (play): play is number => isSounding(play) && play > 0,
  );
  if (fretted.length === 0) return 0;
  return Math.max(...fretted) - Math.min(...fretted);
}

/** The lowest fretted fret, or null when the shape is all open strings. */
export function lowestFret(voicing: ChordVoicing): number | null {
  const fretted = ALL_STRINGS.map((string) => voicing[string]).filter(
    (play): play is number => isSounding(play) && play > 0,
  );
  return fretted.length === 0 ? null : Math.min(...fretted);
}

export function voicingKey(voicing: ChordVoicing): string {
  return ALL_STRINGS.map((string) => voicing[string]).join(',');
}
