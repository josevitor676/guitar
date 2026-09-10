import type { StringNumber, Tuning } from '../music-theory/tuning';
import { getNoteAt } from '../music-theory/notes';
import { ALL_STRINGS, isSounding, voicingSpan, lowestFret, voicingKey } from './chord-voicing';
import type { ChordVoicing, StringPlay } from './chord-voicing';

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Four frets is what a hand covers without shifting. */
const WINDOW_FRETS = 4;
const HIGHEST_WINDOW_START = 12;
const MAX_MUTED = 2;

export interface VoicingSearch {
  root: string;
  intervals: number[];
  tuning: Tuning;
  limit?: number;
}

function semitoneOf(pitchClass: string): number {
  return PITCH_CLASSES.indexOf(pitchClass);
}

/** The frets on one string, inside a window, whose note belongs to the chord. */
function candidatesFor(
  string: StringNumber,
  tuning: Tuning,
  chordSemitones: Set<number>,
  windowStart: number,
): StringPlay[] {
  const options: StringPlay[] = ['muted'];
  // The open string is always reachable, whatever position the hand is in.
  const frets = windowStart === 0 ? [0, 1, 2, 3, 4] : [0, ...Array.from({ length: WINDOW_FRETS }, (_, i) => windowStart + i)];

  for (const fret of frets) {
    const semitone = getNoteAt(tuning, { string, fret }).midi % 12;
    if (chordSemitones.has(((semitone % 12) + 12) % 12)) options.push(fret);
  }

  return options;
}

/** True when a silent string sits between two sounding ones more than once. */
function hasAwkwardInnerMute(voicing: ChordVoicing): boolean {
  const plays = ALL_STRINGS.map((string) => voicing[string]);
  const first = plays.findIndex(isSounding);
  const last = plays.length - 1 - [...plays].reverse().findIndex(isSounding);

  let inner = 0;
  for (let i = first + 1; i < last; i += 1) {
    if (!isSounding(plays[i])) inner += 1;
  }
  return inner > 1;
}

/**
 * Playable ways to hold one chord along the neck.
 *
 * The search stays small because the candidates on each string are filtered by
 * the chord before they are combined: two or three frets per string rather than
 * every fret in the window.
 */
export function suggestVoicings({ root, intervals, tuning, limit = 12 }: VoicingSearch): ChordVoicing[] {
  const rootSemitone = semitoneOf(root);
  if (rootSemitone < 0) return [];

  const chordSemitones = new Set(intervals.map((interval) => (rootSemitone + interval) % 12));
  const required = intervals.map((interval) => (rootSemitone + interval) % 12);

  const found = new Map<string, { voicing: ChordVoicing; score: number }>();

  for (let windowStart = 0; windowStart <= HIGHEST_WINDOW_START; windowStart += 1) {
    const perString = ALL_STRINGS.map((string) => candidatesFor(string, tuning, chordSemitones, windowStart));

    const build = (index: number, partial: Partial<ChordVoicing>) => {
      if (index === ALL_STRINGS.length) {
        const voicing = partial as ChordVoicing;

        const sounding = ALL_STRINGS.filter((string) => isSounding(voicing[string]));
        if (sounding.length < 4) return;
        if (ALL_STRINGS.length - sounding.length > MAX_MUTED) return;
        if (voicingSpan(voicing) > WINDOW_FRETS - 1) return;
        if (hasAwkwardInnerMute(voicing)) return;

        // Every note of the chord has to be somewhere in the shape, or it is a
        // different chord wearing this one's name.
        const played = new Set(
          sounding.map((string) => {
            const fret = voicing[string] as number;
            return ((getNoteAt(tuning, { string, fret }).midi % 12) + 12) % 12;
          }),
        );
        if (!required.every((semitone) => played.has(semitone))) return;

        const bassString = sounding[0];
        const bassSemitone = ((getNoteAt(tuning, { string: bassString, fret: voicing[bassString] as number }).midi % 12) + 12) % 12;

        const score =
          (bassSemitone === rootSemitone ? 0 : 40) +
          (ALL_STRINGS.length - sounding.length) * 8 +
          (lowestFret(voicing) ?? 0) +
          voicingSpan(voicing);

        const key = voicingKey(voicing);
        const existing = found.get(key);
        if (!existing || score < existing.score) found.set(key, { voicing, score });
        return;
      }

      for (const play of perString[index]) {
        build(index + 1, { ...partial, [ALL_STRINGS[index]]: play });
      }
    };

    build(0, {});
  }

  return [...found.values()]
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((entry) => entry.voicing);
}
