import type { Tuning } from '../music-theory/tuning';
import { getNoteAt } from '../music-theory/notes';
import { CHORD_QUALITIES } from './chord-formulas';
import { ALL_STRINGS, isSounding, type ChordVoicing } from './chord-voicing';

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface IdentifiedChord {
  root: string;
  /** What follows the root: "" for major, "m", "7"... */
  symbol: string;
  bass: string;
  isInversion: boolean;
  /** What the chord is called: "G", "Am7", "G/D". */
  displayName: string;
  intervals: number[];
}

interface SoundingNote {
  midi: number;
  semitone: number;
}

function soundingNotes(voicing: ChordVoicing, tuning: Tuning): SoundingNote[] {
  return ALL_STRINGS.flatMap((string) => {
    const play = voicing[string];
    if (!isSounding(play)) return [];
    const midi = getNoteAt(tuning, { string, fret: play }).midi;
    return [{ midi, semitone: ((midi % 12) + 12) % 12 }];
  });
}

/**
 * Names the chord on the neck, or nothing when the notes do not make one.
 *
 * The root has to be among the notes played. A guitar can voice a chord with
 * its root left out, but allowing that here would make almost every shape
 * ambiguous: E-G-B-D would answer both Em7 and G6, and the app would have to
 * guess which the student meant.
 */
export function identifyChord(voicing: ChordVoicing, tuning: Tuning): IdentifiedChord | null {
  const notes = soundingNotes(voicing, tuning);
  if (notes.length < 3) return null;

  const semitones = new Set(notes.map((note) => note.semitone));
  const bassSemitone = notes.reduce((lowest, note) => (note.midi < lowest.midi ? note : lowest)).semitone;

  const candidates: { chord: IdentifiedChord; score: number }[] = [];

  CHORD_QUALITIES.forEach((quality, qualityIndex) => {
    for (const root of semitones) {
      const chordSemitones = new Set(quality.intervals.map((interval) => (root + interval) % 12));

      // Every note played has to belong to the chord: a note the name does not
      // account for means this is not that chord.
      const explainsEverything = [...semitones].every((semitone) => chordSemitones.has(semitone));
      const hasItsColour = quality.defining.every((interval) => semitones.has((root + interval) % 12));
      if (!explainsEverything || !hasItsColour) continue;

      const rootName = PITCH_CLASSES[root];
      const bassName = PITCH_CLASSES[bassSemitone];
      const isInversion = bassSemitone !== root;

      candidates.push({
        // The bass decides between readings of the same notes. A-C-E-G is both
        // Am7 and C6; played over an A it is an Am7, and calling it C6/A would
        // be technically true and useless. Among readings that agree on the
        // bass, the plainer chord wins.
        score: (isInversion ? 100 : 0) + qualityIndex,
        chord: {
          root: rootName,
          symbol: quality.symbol,
          bass: bassName,
          isInversion,
          displayName: `${rootName}${quality.symbol}${isInversion ? `/${bassName}` : ''}`,
          intervals: quality.intervals,
        },
      });
    }
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.score - b.score);
  return candidates[0].chord;
}
