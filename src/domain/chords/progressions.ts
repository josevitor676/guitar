const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export type Mode = 'major' | 'minor';

export interface Key {
  tonic: string;
  mode: Mode;
}

export interface DegreeChord {
  /** The roman numeral, cased as harmony writes it: IV major, iv minor. */
  degree: string;
  root: string;
  symbol: string;
  intervals: number[];
}

export interface Progression {
  name: string;
  degrees: string[];
  chords: DegreeChord[];
}

const MAJOR_DEGREES: { degree: string; semitone: number; symbol: string; intervals: number[] }[] = [
  { degree: 'I', semitone: 0, symbol: '', intervals: [0, 4, 7] },
  { degree: 'ii', semitone: 2, symbol: 'm', intervals: [0, 3, 7] },
  { degree: 'iii', semitone: 4, symbol: 'm', intervals: [0, 3, 7] },
  { degree: 'IV', semitone: 5, symbol: '', intervals: [0, 4, 7] },
  { degree: 'V', semitone: 7, symbol: '', intervals: [0, 4, 7] },
  { degree: 'vi', semitone: 9, symbol: 'm', intervals: [0, 3, 7] },
  { degree: 'vii°', semitone: 11, symbol: 'dim', intervals: [0, 3, 6] },
];

const MINOR_DEGREES: typeof MAJOR_DEGREES = [
  { degree: 'i', semitone: 0, symbol: 'm', intervals: [0, 3, 7] },
  { degree: 'ii°', semitone: 2, symbol: 'dim', intervals: [0, 3, 6] },
  { degree: 'III', semitone: 3, symbol: '', intervals: [0, 4, 7] },
  { degree: 'iv', semitone: 5, symbol: 'm', intervals: [0, 3, 7] },
  { degree: 'v', semitone: 7, symbol: 'm', intervals: [0, 3, 7] },
  { degree: 'VI', semitone: 8, symbol: '', intervals: [0, 4, 7] },
  { degree: 'VII', semitone: 10, symbol: '', intervals: [0, 4, 7] },
];

const MAJOR_LIKE = new Set(['', 'maj7', '6', 'add9', 'sus2', 'sus4', '5']);
const MINOR_LIKE = new Set(['m', 'm7', 'm6', 'mMaj7']);
/** A dominant does not sit still: it is the V of the key a fourth above it. */
const DOMINANT_LIKE = new Set(['7', '9', '7sus4']);

const NAMED_PROGRESSIONS: Record<Mode, { name: string; degrees: string[] }[]> = {
  major: [
    { name: 'Pop', degrees: ['I', 'V', 'vi', 'IV'] },
    { name: 'Rock e blues', degrees: ['I', 'IV', 'V'] },
    { name: 'Jazz', degrees: ['ii', 'V', 'I'] },
    { name: 'Sentimental', degrees: ['vi', 'IV', 'I', 'V'] },
  ],
  minor: [
    { name: 'Menor clássica', degrees: ['i', 'iv', 'v'] },
    { name: 'Pop menor', degrees: ['i', 'VI', 'III', 'VII'] },
    { name: 'Andaluza', degrees: ['i', 'VII', 'VI', 'V'] },
  ],
};

function semitoneOf(pitchClass: string): number {
  return PITCH_CLASSES.indexOf(pitchClass);
}

/**
 * The key a chord most naturally belongs to.
 *
 * A major chord is read as the home of its own key, a minor chord as the home
 * of its minor key, and a dominant seventh as the V of the key a fourth above:
 * G7 is not the home of anything, it is the chord that wants to become C.
 * Diminished and augmented chords belong to no key firmly enough to guess.
 */
export function keyForChord(root: string, symbol: string): Key | null {
  const rootSemitone = semitoneOf(root);
  if (rootSemitone < 0) return null;

  if (MAJOR_LIKE.has(symbol)) return { tonic: root, mode: 'major' };
  if (MINOR_LIKE.has(symbol)) return { tonic: root, mode: 'minor' };
  if (DOMINANT_LIKE.has(symbol)) return { tonic: PITCH_CLASSES[(rootSemitone + 5) % 12], mode: 'major' };

  return null;
}

/** The seven chords built on the notes of a key. */
export function diatonicChords({ tonic, mode }: Key): DegreeChord[] {
  const tonicSemitone = semitoneOf(tonic);
  const degrees = mode === 'major' ? MAJOR_DEGREES : MINOR_DEGREES;

  return degrees.map((degree) => ({
    degree: degree.degree,
    root: PITCH_CLASSES[(tonicSemitone + degree.semitone) % 12],
    symbol: degree.symbol,
    intervals: degree.intervals,
  }));
}

/** Progressions that actually get played, written out in the key's own chords. */
export function progressionsFor(key: Key): Progression[] {
  const chords = diatonicChords(key);
  const byDegree = new Map(chords.map((chord) => [chord.degree, chord]));

  return NAMED_PROGRESSIONS[key.mode]
    .map((progression) => ({
      ...progression,
      chords: progression.degrees.map((degree) => byDegree.get(degree)).filter((chord): chord is DegreeChord => !!chord),
    }))
    .filter((progression) => progression.chords.length === progression.degrees.length);
}
