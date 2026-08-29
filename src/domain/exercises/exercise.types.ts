import type { FretPosition } from '../music-theory/tuning';

export type ExerciseCategory = 'aquecimento' | 'digitacao' | 'escala' | 'arpejo';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  positions: FretPosition[];
}
