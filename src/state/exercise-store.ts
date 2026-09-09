import { create } from 'zustand';
import { EXERCISE_CATALOG } from '../domain/exercises/exercise-catalog';
import type { Exercise, UserExercise } from '../domain/exercises/exercise.types';
import { loadUserExercises, saveUserExercises } from './exercise-library';
import { useFretboardStore } from './fretboard-store';
import { useMetronomeStore } from './metronome-store';

interface ExerciseState {
  activeExerciseId: string | null;
  userExercises: UserExercise[];
  selectExercise: (id: string) => void;
  saveCurrentSelection: (name: string) => UserExercise | null;
  deleteUserExercise: (id: string) => void;
  hydrateUserExercises: () => void;
}

/** Widens the visible fret range just enough to show every position of an exercise. */
function revealPositions(exercise: Exercise): void {
  const frets = exercise.positions.map((position) => position.fret);
  const exerciseMinFret = Math.max(1, Math.min(...frets));
  const exerciseMaxFret = Math.max(...frets);
  const { minFret, maxFret } = useFretboardStore.getState();

  if (exerciseMinFret < minFret || exerciseMaxFret > maxFret) {
    useFretboardStore
      .getState()
      .setFretRange(Math.max(1, Math.min(minFret, exerciseMinFret)), Math.max(maxFret, exerciseMaxFret));
  }
}

function isUserExercise(exercise: Exercise): exercise is UserExercise {
  return exercise.category === 'meu';
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  activeExerciseId: null,
  userExercises: [],

  hydrateUserExercises: () => set({ userExercises: loadUserExercises() }),

  selectExercise: (id) => {
    const exercise: Exercise | undefined =
      EXERCISE_CATALOG.find((item) => item.id === id) ?? get().userExercises.find((item) => item.id === id);
    if (!exercise) return;

    useFretboardStore.getState().loadSequence(exercise.positions);
    revealPositions(exercise);

    // A student exercise carries the tempo and feel it was saved with.
    if (isUserExercise(exercise)) {
      useMetronomeStore.getState().setBpm(exercise.bpm);
      useMetronomeStore.getState().setSubdivision(exercise.subdivision);
    }

    set({ activeExerciseId: id });
  },

  saveCurrentSelection: (name) => {
    const trimmedName = name.trim();
    const positions = useFretboardStore.getState().selectedNotes;
    if (trimmedName.length === 0 || positions.length === 0) return null;

    const { bpm, subdivision } = useMetronomeStore.getState();
    const createdAt = Date.now();
    const exercise: UserExercise = {
      // The random suffix keeps two saves in the same millisecond distinct.
      id: `user-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName,
      category: 'meu',
      bpm,
      subdivision,
      createdAt,
      positions: [...positions],
    };

    const userExercises = [exercise, ...get().userExercises];
    saveUserExercises(userExercises);
    set({ userExercises, activeExerciseId: exercise.id });

    return exercise;
  },

  deleteUserExercise: (id) => {
    const userExercises = get().userExercises.filter((item) => item.id !== id);
    saveUserExercises(userExercises);
    set({
      userExercises,
      activeExerciseId: get().activeExerciseId === id ? null : get().activeExerciseId,
    });
  },
}));
