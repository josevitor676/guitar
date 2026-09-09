import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useExerciseStore } from '../../state/exercise-store';
import { useFretboardStore } from '../../state/fretboard-store';
import { EXERCISE_CATALOG } from '../../domain/exercises/exercise-catalog';
import { ExerciseList } from './ExerciseList';

describe('ExerciseList', () => {
  beforeEach(() => {
    useExerciseStore.setState({ activeExerciseId: null });
    useFretboardStore.setState({ selectedNotes: [] });
  });

  it('renders every exercise name from the catalog', () => {
    render(<ExerciseList />);
    for (const exercise of EXERCISE_CATALOG) {
      expect(screen.getByText(exercise.name)).toBeInTheDocument();
    }
  });

  it('loads the exercise into the fretboard when clicked', () => {
    render(<ExerciseList />);
    const [first] = EXERCISE_CATALOG;
    fireEvent.click(screen.getByText(first.name));
    expect(useFretboardStore.getState().selectedNotes).toEqual(first.positions);
    expect(useExerciseStore.getState().activeExerciseId).toBe(first.id);
  });

  it('marks the active exercise with the accent border', () => {
    render(<ExerciseList />);
    const [first] = EXERCISE_CATALOG;

    const button = screen.getByText(first.name).closest('button');

    expect(button?.className).toContain('border-white/[0.06]');
    fireEvent.click(screen.getByText(first.name));
    expect(screen.getByText(first.name).closest('button')?.className).toContain('border-accent');
  });
});
