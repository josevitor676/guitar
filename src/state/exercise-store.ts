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
    const fretboardStore = useFretboardStore.getState();
    fretboardStore.loadSequence(exercise.positions);

    const exerciseFrets = exercise.positions.map((position) => position.fret);
    const exerciseMinFret = Math.max(1, Math.min(...exerciseFrets));
    const exerciseMaxFret = Math.max(...exerciseFrets);
    const { minFret, maxFret } = useFretboardStore.getState();
    if (exerciseMinFret < minFret || exerciseMaxFret > maxFret) {
      useFretboardStore
        .getState()
        .setFretRange(Math.max(1, Math.min(minFret, exerciseMinFret)), Math.max(maxFret, exerciseMaxFret));
    }

    set({ activeExerciseId: id });
  },
}));
