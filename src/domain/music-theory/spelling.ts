/**
 * How a note is written down.
 *
 * The same key on the instrument is A# in one piece of music and Bb in
 * another, and which one is right is not a matter of taste: a key signature
 * uses each letter once, so in F major — one flat — the fourth degree has to
 * be Bb. Writing A# there would use A twice and skip B altogether.
 */
export type Accidental = 'sharp' | 'flat';

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
/** Where each letter sits before any accidental is applied. */
const LETTER_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function spell(semitone: number, accidental: Accidental): string {
  const index = ((semitone % 12) + 12) % 12;
  return (accidental === 'flat' ? FLAT_NAMES : SHARP_NAMES)[index];
}

/**
 * Reads a pitch class however it is written, including the spellings a
 * twelve-name table has no room for: E#, Cb, and the double accidentals a
 * remote key needs. Returns -1 when the text is not a note name at all.
 */
export function semitoneOfPitchClass(pitchClass: string): number {
  const match = /^([A-Ga-g])([#b]*)$/.exec(pitchClass);
  if (!match) return -1;

  const [, letter, accidentals] = match;
  const natural = LETTER_SEMITONES[LETTERS.indexOf(letter.toUpperCase())];
  const shift = [...accidentals].reduce((total, mark) => total + (mark === '#' ? 1 : -1), 0);

  return (((natural + shift) % 12) + 12) % 12;
}

/**
 * Which way the key signature writes its black keys, by tonic.
 *
 * Written out rather than derived from the circle of fifths, because the two
 * keys with six of each are settled by convention, not by counting: F# major
 * is how a guitarist writes it, and E flat minor is how everyone writes that,
 * even though the counting makes them ties.
 */
const MAJOR_ACCIDENTALS: Accidental[] = [
  /* C  */ 'sharp',
  /* Db */ 'flat',
  /* D  */ 'sharp',
  /* Eb */ 'flat',
  /* E  */ 'sharp',
  /* F  */ 'flat',
  /* F# */ 'sharp',
  /* G  */ 'sharp',
  /* Ab */ 'flat',
  /* A  */ 'sharp',
  /* Bb */ 'flat',
  /* B  */ 'sharp',
];

const MINOR_ACCIDENTALS: Accidental[] = [
  /* Cm  */ 'flat',
  /* C#m */ 'sharp',
  /* Dm  */ 'flat',
  /* Ebm */ 'flat',
  /* Em  */ 'sharp',
  /* Fm  */ 'flat',
  /* F#m */ 'sharp',
  /* Gm  */ 'flat',
  /* G#m */ 'sharp',
  /* Am  */ 'sharp',
  /* Bbm */ 'flat',
  /* Bm  */ 'sharp',
];

export function accidentalFor(tonicSemitone: number, mode: 'major' | 'minor'): Accidental {
  const index = ((tonicSemitone % 12) + 12) % 12;
  return mode === 'minor' ? MINOR_ACCIDENTALS[index] : MAJOR_ACCIDENTALS[index];
}

/**
 * The note a scale degree is written with, given the key's own tonic.
 *
 * A twelve-name table cannot do this. F sharp major runs F# G# A# B C# D# E#,
 * and E# is simply not in such a table — it would come back as F, which would
 * give the key two Fs and no E. The letter therefore comes from counting
 * degrees up the alphabet, and the accidental is whatever it takes to reach
 * the note from there, however many sharps or flats that is.
 *
 * `degreeIndex` is the step of the scale, counted from zero, not the number of
 * semitones: the second degree is 1 whether it lands a tone or a semitone up.
 */
export function spellDegree(tonic: string, degreeIndex: number, semitone: number): string {
  const letterIndex = LETTERS.indexOf(tonic[0].toUpperCase());
  if (letterIndex < 0) return spell(semitone, 'sharp');

  const letter = LETTERS[(letterIndex + degreeIndex) % 7];
  const natural = LETTER_SEMITONES[LETTERS.indexOf(letter)];

  // The shortest way round the octave: a note seven semitones above its own
  // letter is a flat below it, not eleven sharps above.
  let distance = (((semitone - natural) % 12) + 12) % 12;
  if (distance > 6) distance -= 12;

  return letter + (distance >= 0 ? '#'.repeat(distance) : 'b'.repeat(-distance));
}
