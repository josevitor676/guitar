import { describe, it, expect, beforeEach } from 'vitest';
import { useExerciseStore } from './exercise-store';
import { useFretboardStore } from './fretboard-store';
import { EXERCISE_CATALOG } from '../domain/exercises/exercise-catalog';

describe('useExerciseStore', () => {
  beforeEach(() => {
    useExerciseStore.setState({ activeExerciseId: null });
    useFretboardStore.setState({ selectedNotes: [], minFret: 1, maxFret: 7 });
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

  it('widens the visible fret range to cover an exercise whose positions fall outside the current range', () => {
    useFretboardStore.setState({ minFret: 5, maxFret: 10 });
    const exercise = EXERCISE_CATALOG.find((item) => item.id === 'warmup-1234-low-e')!;

    useExerciseStore.getState().selectExercise(exercise.id);

    const { minFret, maxFret } = useFretboardStore.getState();
    const frets = exercise.positions.map((position) => position.fret);
    expect(minFret).toBeLessThanOrEqual(Math.min(...frets));
    expect(maxFret).toBeGreaterThanOrEqual(Math.max(...frets));
  });

  it('never widens the visible range below fret 1', () => {
    useFretboardStore.setState({ minFret: 5, maxFret: 10 });
    const exercise = EXERCISE_CATALOG.find((item) => item.id === 'scale-c-major-open-position')!;

    useExerciseStore.getState().selectExercise(exercise.id);

    expect(useFretboardStore.getState().minFret).toBeGreaterThanOrEqual(1);
  });

  it('does nothing when selecting an unknown exercise id', () => {
    useExerciseStore.getState().selectExercise('does-not-exist');
    expect(useExerciseStore.getState().activeExerciseId).toBeNull();
    expect(useFretboardStore.getState().selectedNotes).toEqual([]);
  });
});
