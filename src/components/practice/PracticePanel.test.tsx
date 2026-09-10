import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';
import { usePlaybackStore } from '../../state/playback-store';
import { useUiStore } from '../../state/ui-store';
import { useExerciseStore } from '../../state/exercise-store';

vi.mock('../../audio', () => ({
  sampler: { isLoaded: () => true, playNote: vi.fn() },
  metronome: { start: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), setSubdivision: vi.fn(), onPulse: () => () => {} },
  sequencePlayer: { play: vi.fn(), stop: vi.fn(), onNoteChange: () => () => {} },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { PracticePanel } from './PracticePanel';

describe('PracticePanel', () => {
  beforeEach(() => {
    useFretboardStore.setState({
      minFret: 1,
      maxFret: 7,
      selectedNotes: [
        { string: 6, fret: 3 },
        { string: 6, fret: 5 },
      ],
    });
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter', isPlaying: false });
    usePlaybackStore.setState({ currentIndex: null, isPlaying: false });
    useUiStore.setState({ fretboardView: 'grid' });
  });

  it('shows the fret grid by default', () => {
    render(<PracticePanel />);

    expect(screen.getAllByRole('button', { name: /corda \d, casa \d+/ }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('timeline-playhead')).not.toBeInTheDocument();
  });

  it('swaps the grid for the timeline roll when the view changes', () => {
    render(<PracticePanel />);

    fireEvent.click(screen.getByRole('button', { name: /linha do tempo/i }));

    expect(screen.getByTestId('timeline-playhead')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /corda \d, casa \d+/ })).not.toBeInTheDocument();
  });

  it('reports the total note count while stopped', () => {
    render(<PracticePanel />);

    const bar = screen.getByRole('progressbar', { name: /progresso/i });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '2');
    expect(screen.getByText(/2 notas/i)).toBeInTheDocument();
  });

  it('counts the note being played, one-based, while running', () => {
    usePlaybackStore.setState({ currentIndex: 1, isPlaying: true });

    render(<PracticePanel />);

    expect(screen.getByRole('progressbar', { name: /progresso/i })).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByText(/nota 2 \/ 2/i)).toBeInTheDocument();
  });

  it('renders the control bar', () => {
    render(<PracticePanel />);
    expect(screen.getByRole('button', { name: /come[cç]ar/i })).toBeInTheDocument();
  });

  describe('the exercise instructions', () => {
    it('shows them on the exercises tab', () => {
      useUiStore.setState({ activeTab: 'exercises' });
      useExerciseStore.setState({ activeExerciseId: 'technique-hammer-on-ladder' });

      render(<PracticePanel />);

      expect(screen.getByTestId('exercise-how-to')).toBeInTheDocument();
    });

    it('leaves them behind on the practice tab, where no exercise is open', () => {
      useUiStore.setState({ activeTab: 'practice' });
      useExerciseStore.setState({ activeExerciseId: 'technique-hammer-on-ladder' });

      render(<PracticePanel />);

      expect(screen.queryByTestId('exercise-how-to')).not.toBeInTheDocument();
    });

    it('shows nothing for an exercise that has no instructions', () => {
      useUiStore.setState({ activeTab: 'exercises' });
      useExerciseStore.setState({ activeExerciseId: 'warmup-1234-low-e' });

      render(<PracticePanel />);

      expect(screen.queryByTestId('exercise-how-to')).not.toBeInTheDocument();
    });
  });
});
