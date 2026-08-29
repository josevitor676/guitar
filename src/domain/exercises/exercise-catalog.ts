import type { Exercise } from './exercise.types';
import { STANDARD_TUNING } from '../music-theory/tuning';
import { SCALE_PATTERNS, ARPEGGIO_PATTERNS, generatePositionsForPattern } from '../music-theory/scales-arpeggios';

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
      minFret: 0,
      maxFret: 3,
    }),
  },
  {
    id: 'arpeggio-c-major-open-position',
    name: 'Arpejo Maior de Dó (posição aberta)',
    category: 'arpejo',
    positions: generatePositionsForPattern(STANDARD_TUNING, 'C', ARPEGGIO_PATTERNS.majorTriad, {
      minFret: 0,
      maxFret: 3,
    }),
  },
];
