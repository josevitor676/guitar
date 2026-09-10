import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';
import { useUiStore } from '../../state/ui-store';
import { useExerciseStore } from '../../state/exercise-store';
import { EXERCISE_CATALOG } from '../../domain/exercises/exercise-catalog';
import { saveUserExercises } from '../../state/exercise-library';

vi.mock('../../audio', () => ({
  sampler: { isLoaded: () => true, playNote: vi.fn() },
  metronome: { start: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), setSubdivision: vi.fn(), onPulse: () => () => {} },
  sequencePlayer: { play: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), onNoteChange: () => () => {} },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [] });
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter', isPlaying: false, currentPulse: 0 });
    useUiStore.setState({ activeTab: 'practice', fretboardView: 'grid' });
    useExerciseStore.setState({ activeExerciseId: null, userExercises: [] });
  });

  it('renders the practice tab by default with the fretboard, play button, and metronome controls', () => {
    render(<App />);
    expect(screen.getAllByRole('button', { name: /corda \d, casa \d+/ }).length).toBeGreaterThan(0);
    expect(screen.getByText(/BPM/)).toBeInTheDocument();
    expect(screen.queryByText(/continue sua evolu[cç][aã]o/i)).not.toBeInTheDocument();
  });

  it('shows the exercise list and fretboard together after switching to the exercises tab', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /exerc[ií]cios/i }));
    expect(screen.getByText(/continue sua evolu[cç][aã]o/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /corda \d, casa \d+/ }).length).toBeGreaterThan(0);
  });

  it('shows the exercise count badge on the Exercícios tab', () => {
    render(<App />);
    expect(screen.getByText(String(EXERCISE_CATALOG.length).padStart(2, '0'))).toBeInTheDocument();
  });

  it('clamps a stale persisted minFret of 0 to 1 instead of restoring fret 0', () => {
    localStorage.setItem(
      'guitar-teacher:preferences',
      JSON.stringify({ bpm: 100, subdivision: 'quarter', minFret: 0, maxFret: 7 }),
    );

    render(<App />);

    expect(screen.queryByRole('button', { name: /casa 0$/ })).not.toBeInTheDocument();
  });

  it('clears the selected notes from the practice panel', () => {
    useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 1 }] });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /limpar sele[cç][aã]o/i }));
    expect(useFretboardStore.getState().selectedNotes).toEqual([]);
  });

  it('shows one practice panel per tab, never two at once', () => {
    render(<App />);
    expect(screen.getAllByRole('button', { name: /come[cç]ar/i })).toHaveLength(1);

    fireEvent.click(screen.getByRole('tab', { name: /exerc[ií]cios/i }));
    expect(screen.getAllByRole('button', { name: /come[cç]ar/i })).toHaveLength(1);
  });

  it('hydrates the student library on mount and counts it in the tab badge', () => {
    saveUserExercises([
      {
        id: 'user-1',
        name: 'Meu aquecimento',
        category: 'meu',
        bpm: 80,
        subdivision: 'quarter',
        createdAt: 1_700_000_000_000,
        positions: [{ string: 6, fret: 3 }],
      },
    ]);

    render(<App />);

    expect(useExerciseStore.getState().userExercises).toHaveLength(1);
    // The badge counts the catalog and the student's library together.
    const total = EXERCISE_CATALOG.length + 1;
    expect(screen.getByText(String(total).padStart(2, '0'))).toBeInTheDocument();
  });

  it('opens the import tab and asks for a tablature file', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: /importar/i }));

    expect(screen.getByLabelText(/arquivo da tablatura/i)).toBeInTheDocument();
    expect(screen.queryByText(/explore o bra[cç]o/i)).not.toBeInTheDocument();
  });
});
