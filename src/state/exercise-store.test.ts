import { describe, it, expect, beforeEach } from 'vitest';
import { useExerciseStore } from './exercise-store';
import { useFretboardStore } from './fretboard-store';
import { EXERCISE_CATALOG } from '../domain/exercises/exercise-catalog';

describe('useExerciseStore', () => {
  beforeEach(() => {
    useExerciseStore.setState({ activeExerciseId: null });
    useFretboardStore.setState({ selectedNotes: [] });
  });

  it('starts with no active exercise', () => {
    expect(useExerciseStore.getState().activeExerciseId).toBeNull();
  });

  it('sets activeExerciseId when a known exercise is selected', () => {
    const [first] = EXERCISE_CATALOG;
    useExerciseStore.getState().selectExercise(first.id);
    expect(useExerciseStore.getState().activeExerciseId).toBe(first.id);
  });

  it('loads the exercise positions into the fretboard store', () => {
    const [first] = EXERCISE_CATALOG;
    useExerciseStore.getState().selectExercise(first.id);
    expect(useFretboardStore.getState().selectedNotes).toEqual(first.positions);
  });

  it('does nothing when selecting an unknown exercise id', () => {
    useExerciseStore.getState().selectExercise('does-not-exist');
    expect(useExerciseStore.getState().activeExerciseId).toBeNull();
    expect(useFretboardStore.getState().selectedNotes).toEqual([]);
  });
});
