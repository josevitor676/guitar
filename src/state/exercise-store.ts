import { create } from 'zustand';
import { EXERCISE_CATALOG } from '../domain/exercises/exercise-catalog';
import type { Exercise, UserExercise } from '../domain/exercises/exercise.types';
import { loadUserExercises, saveUserExercises } from './exercise-library';
import { useFretboardStore } from './fretboard-store';
import { useMetronomeStore } from './metronome-store';
import { useUiStore } from './ui-store';
import { useSpeedTrainerStore } from './speed-trainer-store';

interface ExerciseState {
  activeExerciseId: string | null;
  userExercises: UserExercise[];
  selectExercise: (id: string) => void;
  /** Puts the exercise away and empties the neck it was loaded onto. */
  leaveExercise: () => void;
  saveCurrentSelection: (name: string) => UserExercise | null;
  /** Writes what is on the neck over the student's exercise that is open. */
  updateActiveUserExercise: () => UserExercise | null;
  deleteUserExercise: (id: string) => void;
  hydrateUserExercises: () => void;
}

/** An exercise by id, from the fixed catalogue or the student's own library. */
export function findExercise(id: string | null, userExercises: UserExercise[]): Exercise | undefined {
  if (!id) return undefined;
  return EXERCISE_CATALOG.find((item) => item.id === id) ?? userExercises.find((item) => item.id === id);
}

function isUserExercise(exercise: Exercise): exercise is UserExercise {
  return exercise.category === 'meu';
}

function hasArticulations(exercise: Exercise): boolean {
  return exercise.positions.some((position) => position.articulation !== undefined);
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  activeExerciseId: null,
  userExercises: [],

  hydrateUserExercises: () => set({ userExercises: loadUserExercises() }),

  selectExercise: (id) => {
    const exercise: Exercise | undefined =
      EXERCISE_CATALOG.find((item) => item.id === id) ?? get().userExercises.find((item) => item.id === id);
    if (!exercise) return;

    // loadSequence widens the visible fret range on its own.
    useFretboardStore.getState().loadSequence(exercise.positions);

    // The grid reorders along the neck and so drops slurs. An exercise built
    // around a technique would then play as plain picked notes with nothing to
    // say why, so it opens on the timeline, where its order and slurs survive.
    if (hasArticulations(exercise)) {
      useUiStore.getState().setFretboardView('timeline');
    }

    // A student exercise carries the tempo and feel it was saved with.
    if (isUserExercise(exercise)) {
      useMetronomeStore.getState().setBpm(exercise.bpm);
      useMetronomeStore.getState().setSubdivision(exercise.subdivision);
    }

    // The last climb's result belongs to the exercise it was played on.
    useSpeedTrainerStore.setState({ lastResult: null });
    set({ activeExerciseId: id });
  },

  leaveExercise: () => {
    // Free practice is the student's own scratch space: there is no exercise
    // to leave, and clearing it would throw away work they meant to keep.
    if (!get().activeExerciseId) return;
    useFretboardStore.getState().clearSelection();
    useSpeedTrainerStore.setState({ lastResult: null });
    set({ activeExerciseId: null });
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

  updateActiveUserExercise: () => {
    const { activeExerciseId, userExercises } = get();
    const existing = userExercises.find((item) => item.id === activeExerciseId);
    const positions = useFretboardStore.getState().selectedNotes;
    // The catalogue belongs to the app. A change to one of those has to become
    // an exercise of the student's own, which is what saving under a name does.
    if (!existing || positions.length === 0) return null;

    const { bpm, subdivision } = useMetronomeStore.getState();
    const updated: UserExercise = { ...existing, positions: [...positions], bpm, subdivision };
    const library = userExercises.map((item) => (item.id === updated.id ? updated : item));
    saveUserExercises(library);
    set({ userExercises: library });

    return updated;
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
