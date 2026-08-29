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

  it('applies the gothic dark theme to the document root', () => {
    render(<App />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('renders the practice tab by default with the fretboard, play button, and metronome controls', () => {
    render(<App />);
    expect(screen.getAllByRole('button', { name: /corda \d, casa \d+/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByText(/BPM/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /exerc[ií]cios/i })).not.toBeInTheDocument();
  });

  it('shows the exercise list and fretboard together after selecting Exercícios in the sidebar', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Exercícios' }));
    expect(screen.getByRole('heading', { name: /exerc[ií]cios/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /corda \d, casa \d+/ }).length).toBeGreaterThan(0);
  });
});
