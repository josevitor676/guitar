import type { Exercise } from './exercise.types';
import type { StringNumber } from '../music-theory/tuning';
import type { Articulation } from '../music-theory/articulation';
import { STANDARD_TUNING } from '../music-theory/tuning';
import { SCALE_PATTERNS, ARPEGGIO_PATTERNS, generatePositionsForPattern } from '../music-theory/scales-arpeggios';

/**
 * Builds a drill that repeats one two-note figure across several strings.
 *
 * Every technique exercise below has the same shape — pick a note, reach the
 * next one with the technique, move to the next string — because that is how
 * these are practised: one movement, repeated, until the hand owns it.
 */
function acrossStrings(
  strings: StringNumber[],
  from: number,
  to: number,
  articulation: Articulation,
) {
  return strings.flatMap((string) => [
    { string, fret: from },
    { string, fret: to, articulation },
  ]);
}

const LOW_TO_HIGH: StringNumber[] = [6, 5, 4, 3, 2, 1];
const HIGH_TO_LOW: StringNumber[] = [1, 2, 3, 4, 5, 6];

export const EXERCISE_CATALOG: Exercise[] = [
  {
    id: 'warmup-1234-low-e',
    name: 'Aquecimento 1-2-3-4 (corda 6)',
    category: 'aquecimento',
    positions: [
      { string: 6, fret: 1 },
      { string: 6, fret: 2 },
      { string: 6, fret: 3 },
      { string: 6, fret: 4 },
    ],
  },
  {
    id: 'fingering-diagonal-6-4',
    name: 'Digitação diagonal (corda 6 à 4)',
    category: 'digitacao',
    positions: [
      { string: 6, fret: 1 },
      { string: 5, fret: 2 },
      { string: 4, fret: 3 },
    ],
  },
  {
    id: 'scale-c-major-open-position',
    name: 'Escala Maior de Dó (posição aberta)',
    category: 'escala',
    positions: generatePositionsForPattern(STANDARD_TUNING, 'C', SCALE_PATTERNS.major, {
      minFret: 1,
      maxFret: 4,
    }),
  },
  {
    id: 'arpeggio-c-major-open-position',
    name: 'Arpejo Maior de Dó (posição aberta)',
    category: 'arpejo',
    positions: generatePositionsForPattern(STANDARD_TUNING, 'C', ARPEGGIO_PATTERNS.majorTriad, {
      minFret: 1,
      maxFret: 4,
    }),
  },
  {
    id: 'technique-hammer-on-ladder',
    name: 'Hammer-on em todas as cordas',
    category: 'tecnica',
    // Pick the 5th fret, hammer the 7th with the ring finger, string by string.
    positions: acrossStrings(LOW_TO_HIGH, 5, 7, 'hammerOn'),
  },
  {
    id: 'technique-pull-off-ladder',
    name: 'Pull-off em todas as cordas',
    category: 'tecnica',
    // The mirror of the hammer drill: fret both notes, pick the 7th, pull to the 5th.
    positions: acrossStrings(HIGH_TO_LOW, 7, 5, 'pullOff'),
  },
  {
    id: 'technique-slide-shift',
    name: 'Slide subindo e descendo o braço',
    category: 'tecnica',
    // Long shifts, which is what a slide is for: it carries the hand to a new position.
    positions: [
      { string: 3, fret: 5 },
      { string: 3, fret: 9, articulation: 'slide' },
      { string: 3, fret: 9 },
      { string: 3, fret: 5, articulation: 'slide' },
      { string: 2, fret: 7 },
      { string: 2, fret: 12, articulation: 'slide' },
      { string: 2, fret: 12 },
      { string: 2, fret: 7, articulation: 'slide' },
    ],
  },
  {
    id: 'technique-whole-step-bend',
    name: 'Bend de um tom nas cordas agudas',
    category: 'tecnica',
    // Two frets is a whole step, bent on the strings where bends actually live.
    positions: [
      { string: 2, fret: 8 },
      { string: 2, fret: 10, articulation: 'bend' },
      { string: 1, fret: 7 },
      { string: 1, fret: 9, articulation: 'bend' },
      { string: 2, fret: 10 },
      { string: 2, fret: 12, articulation: 'bend' },
      { string: 1, fret: 9 },
      { string: 1, fret: 11, articulation: 'bend' },
    ],
  },
];
