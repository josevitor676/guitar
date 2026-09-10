import type { StringNumber } from '../music-theory/tuning';
import { ALL_STRINGS, isSounding } from './chord-voicing';
import type { ChordVoicing } from './chord-voicing';

export type Finger = 1 | 2 | 3 | 4;

export interface FingerPlacement {
  string: StringNumber;
  fret: number;
  finger: Finger;
}

export interface Barre {
  fret: number;
  /** The lowest-pitched string the bar covers. */
  fromString: StringNumber;
  toString: StringNumber;
  finger: Finger;
}

export interface FingeredChord {
  fingers: FingerPlacement[];
  barre: Barre | null;
}

interface FrettedNote {
  string: StringNumber;
  fret: number;
}

/**
 * Which finger holds each note, and whether the index finger bars.
 *
 * The rule is the one a hand follows: the lowest fret goes to the lowest
 * finger, and where two notes share a fret the nearer string to the floor is
 * taken first. Applied to the shapes everyone learns first, it reproduces the
 * fingerings they are taught, which is the test of whether a rule like this is
 * the real one or merely a plausible one.
 */
export function fingerChord(voicing: ChordVoicing): FingeredChord {
  const fretted: FrettedNote[] = ALL_STRINGS.flatMap((string) => {
    const play = voicing[string];
    return isSounding(play) && play > 0 ? [{ string, fret: play }] : [];
  });

  if (fretted.length === 0) return { fingers: [], barre: null };

  const lowestFret = Math.min(...fretted.map((note) => note.fret));
  const atLowest = fretted.filter((note) => note.fret === lowestFret);

  // One finger laid flat covers several strings at the same fret. That only
  // reads as a bar when more than one string needs it.
  const barre: Barre | null =
    atLowest.length >= 2
      ? {
          fret: lowestFret,
          fromString: Math.max(...atLowest.map((note) => note.string)) as StringNumber,
          toString: Math.min(...atLowest.map((note) => note.string)) as StringNumber,
          finger: 1,
        }
      : null;

  const byReach = (a: FrettedNote, b: FrettedNote) =>
    a.fret !== b.fret ? a.fret - b.fret : b.string - a.string;

  if (barre) {
    const above = fretted.filter((note) => note.fret > lowestFret).sort(byReach);

    return {
      barre,
      fingers: [
        ...atLowest.map((note) => ({ ...note, finger: 1 as Finger })),
        ...above.map((note, index) => ({ ...note, finger: Math.min(index + 2, 4) as Finger })),
      ],
    };
  }

  return {
    barre: null,
    fingers: [...fretted]
      .sort(byReach)
      .map((note, index) => ({ ...note, finger: Math.min(index + 1, 4) as Finger })),
  };
}
