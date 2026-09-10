import type { FretPosition } from '../music-theory/tuning';
import type { Subdivision } from '../music-theory/rhythm';

export type ExerciseCategory =
  | 'aquecimento'
  | 'digitacao'
  | 'escala'
  | 'arpejo'
  | 'tecnica'
  /** Riffs and melodies that play the same spot more than once. */
  | 'repeticao'
  | 'meu';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  positions: FretPosition[];
  /** What the technique is and how the hand performs it. */
  howTo?: string;
}

/** An exercise the student built and saved, as opposed to one from the fixed catalog. */
export interface UserExercise extends Exercise {
  category: 'meu';
  bpm: number;
  subdivision: Subdivision;
  createdAt: number;
}
