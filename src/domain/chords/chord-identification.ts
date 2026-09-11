import type { Tuning } from '../music-theory/tuning';
import { getNoteAt } from '../music-theory/notes';
import { CHORD_QUALITIES } from './chord-formulas';
import { spell, accidentalFor } from '../music-theory/spelling';
import type { Accidental } from '../music-theory/spelling';
import { ALL_STRINGS, isSounding, type ChordVoicing } from './chord-voicing';

/**
 * A chord is written in the key it belongs to, and its own quality is the
 * best guide to which one: a minor third points at a minor key. That is what
 * decides Bb over A# — the B flat major chord lives in keys written with
 * flats, and no piece writes an A sharp major triad.
 */
function modeOf(intervals: number[]): 'major' | 'minor' {
  return intervals.includes(3) ? 'minor' : 'major';
}

export interface IdentifiedChord {
  root: string;
  /** What follows the root: "" for major, "m", "7"... */
  symbol: string;
  bass: string;
  isInversion: boolean;
  /** What the chord is called: "G", "Am7", "G/D". */
  displayName: string;
  /** How this chord writes its black keys, so the rest of the screen agrees. */
  accidental: Accidental;
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

      // The bass takes the chord's accidental too: writing Bb/D# would put
      // two different spellings in one name.
      const accidental = accidentalFor(root, modeOf(quality.intervals));
      const rootName = spell(root, accidental);
      const bassName = spell(bassSemitone, accidental);
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
          accidental,
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
