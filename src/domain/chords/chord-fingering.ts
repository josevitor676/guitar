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
 * The bar the index finger lays, if the shape actually has one.
 *
 * Two notes sharing the lowest fret is not enough. A finger laid across the
 * neck stops every string it crosses, so a shape with an open string between
 * those two notes cannot be barred — the bar would silence the very string the
 * chord needs ringing. The open G is exactly that case: two notes at the third
 * fret with three open strings between them, and it is not a barre chord.
 */
function findBarre(voicing: ChordVoicing, atLowest: FrettedNote[], lowestFret: number): Barre | null {
  if (atLowest.length < 2) return null;

  const fromString = Math.max(...atLowest.map((note) => note.string)) as StringNumber;
  const toString = Math.min(...atLowest.map((note) => note.string)) as StringNumber;

  for (let string = toString + 1; string < fromString; string += 1) {
    const play = voicing[string as StringNumber];
    // Muted is fine under a bar; open is not, because the bar would stop it.
    if (isSounding(play) && play < lowestFret) return null;
  }

  return { fret: lowestFret, fromString, toString, finger: 1 };
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

  const barre = findBarre(voicing, atLowest, lowestFret);

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
