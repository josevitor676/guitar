import { create } from 'zustand';
import { EXERCISE_CATALOG } from '../domain/exercises/exercise-catalog';
import { useFretboardStore } from './fretboard-store';

interface ExerciseState {
  activeExerciseId: string | null;
  selectExercise: (id: string) => void;
}

export const useExerciseStore = create<ExerciseState>((set) => ({
  activeExerciseId: null,
  selectExercise: (id) => {
    const exercise = EXERCISE_CATALOG.find((item) => item.id === id);
    if (!exercise) return;
    useFretboardStore.getState().loadSequence(exercise.positions);
    set({ activeExerciseId: id });
  },
}));
