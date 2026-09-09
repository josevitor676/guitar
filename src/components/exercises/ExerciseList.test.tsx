import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useExerciseStore } from '../../state/exercise-store';
import { useFretboardStore } from '../../state/fretboard-store';
import { EXERCISE_CATALOG } from '../../domain/exercises/exercise-catalog';
import { ExerciseList } from './ExerciseList';

describe('ExerciseList', () => {
  beforeEach(() => {
    localStorage.clear();
    useExerciseStore.setState({ activeExerciseId: null, userExercises: [] });
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

  describe('the student library section', () => {
    const myExercise = {
      id: 'user-1',
      name: 'Aquecimento da manhã',
      category: 'meu' as const,
      bpm: 76,
      subdivision: 'eighth' as const,
      createdAt: 1_700_000_000_000,
      positions: [{ string: 6 as const, fret: 3 }],
    };

    it('hides the section entirely while the library is empty', () => {
      render(<ExerciseList />);
      expect(screen.queryByText(/meus exerc[ií]cios/i)).not.toBeInTheDocument();
    });

    it('lists a saved exercise above the catalog, with its tempo', () => {
      useExerciseStore.setState({ userExercises: [myExercise] });
      render(<ExerciseList />);

      expect(screen.getByText(/meus exerc[ií]cios/i)).toBeInTheDocument();
      expect(screen.getByText('Aquecimento da manhã')).toBeInTheDocument();
      expect(screen.getByText(/76 BPM/)).toBeInTheDocument();
    });

    it('loads a saved exercise into the fretboard when clicked', () => {
      useExerciseStore.setState({ userExercises: [myExercise] });
      render(<ExerciseList />);

      fireEvent.click(screen.getByText('Aquecimento da manhã'));

      expect(useFretboardStore.getState().selectedNotes).toEqual(myExercise.positions);
    });

    it('asks for confirmation before removing, and removes on the second click', () => {
      useExerciseStore.setState({ userExercises: [myExercise] });
      render(<ExerciseList />);

      fireEvent.click(screen.getByRole('button', { name: /remover aquecimento da manhã/i }));
      expect(useExerciseStore.getState().userExercises).toHaveLength(1);

      fireEvent.click(screen.getByRole('button', { name: /confirmar remo[cç][aã]o/i }));
      expect(useExerciseStore.getState().userExercises).toEqual([]);
    });

    it('never puts a remove button on a catalog exercise', () => {
      render(<ExerciseList />);
      expect(screen.queryByRole('button', { name: /remover/i })).not.toBeInTheDocument();
    });
  });
});
