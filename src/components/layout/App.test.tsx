import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';

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
  });

  it('renders the fretboard, play button, metronome controls and exercise list together', () => {
    render(<App />);
    expect(screen.getAllByRole('button', { name: /corda \d, casa \d+/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByText(/BPM/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /exerc[ií]cios/i })).toBeInTheDocument();
  });
});
