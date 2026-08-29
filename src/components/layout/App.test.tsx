import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';
import { useUiStore } from '../../state/ui-store';

vi.mock('../../audio', () => ({
  sampler: { isLoaded: () => true, playNote: vi.fn() },
  metronome: { start: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), setSubdivision: vi.fn(), onPulse: () => () => {} },
  sequencePlayer: { play: vi.fn(), stop: vi.fn(), onNoteChange: () => () => {} },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [] });
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter', isPlaying: false, currentPulse: 0 });
    useUiStore.setState({ activeTab: 'practice' });
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
    expect(screen.getByText('04')).toBeInTheDocument();
  });

  it('clamps a stale persisted minFret of 0 to 1 instead of restoring fret 0', () => {
    localStorage.setItem(
      'guitar-teacher:preferences',
      JSON.stringify({ bpm: 100, subdivision: 'quarter', minFret: 0, maxFret: 7 }),
    );

    render(<App />);

    expect(screen.queryByRole('button', { name: /casa 0$/ })).not.toBeInTheDocument();
  });

  it('clears the selected notes when Reiniciar is clicked', () => {
    useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 1 }] });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /reiniciar/i }));
    expect(useFretboardStore.getState().selectedNotes).toEqual([]);
  });
});
