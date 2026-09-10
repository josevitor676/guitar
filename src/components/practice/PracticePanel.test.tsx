import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';
import { usePlaybackStore } from '../../state/playback-store';
import { useSpeedTrainerStore } from '../../state/speed-trainer-store';
import { useUiStore } from '../../state/ui-store';
import { useExerciseStore } from '../../state/exercise-store';

vi.mock('../../audio', () => ({
  sampler: { isLoaded: () => true, playNote: vi.fn() },
  metronome: { start: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), setSubdivision: vi.fn(), onPulse: () => () => {} },
  sequencePlayer: { play: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), onNoteChange: () => () => {} },
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
    // direction included: a round trip turns two marked notes into three
    // played ones, so leaving it set would follow a test into the next one.
    usePlaybackStore.setState({ currentIndex: null, isPlaying: false, direction: 'sixthToFirst' });
    useUiStore.setState({ fretboardView: 'grid' });
    useSpeedTrainerStore.setState({ session: null, lastResult: null });
  });

  it('shows the fret grid by default', () => {
    render(<PracticePanel />);

    expect(screen.getAllByRole('button', { name: /corda \d, casa \d+/ }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('timeline-playhead')).not.toBeInTheDocument();
  });

  it('keeps the neck under the roll when the view changes, so notes can still be added', () => {
    render(<PracticePanel />);

    fireEvent.click(screen.getByRole('button', { name: /linha do tempo/i }));

    expect(screen.getByTestId('timeline-playhead')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /corda \d, casa \d+/ }).length).toBeGreaterThan(0);
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

  describe('building a sequence on the timeline', () => {
    beforeEach(() => {
      useUiStore.setState({ fretboardView: 'timeline' });
      useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [] });
    });

    it('adds a note each time the neck is clicked, so a spot can repeat', async () => {
      render(<PracticePanel />);
      const cell = screen.getByRole('button', { name: /corda 5, casa 7/i });

      await act(async () => {
        fireEvent.click(cell);
      });
      await act(async () => {
        fireEvent.click(cell);
      });

      expect(useFretboardStore.getState().selectedNotes).toHaveLength(2);
    });

    it('removes the occurrence that was clicked, leaving its twin alone', () => {
      useFretboardStore.setState({
        selectedNotes: [7, 5, 7].map((fret) => ({ string: 5, fret })),
      });

      render(<PracticePanel />);
      fireEvent.click(screen.getByTestId('timeline-note-0'));

      expect(useFretboardStore.getState().selectedNotes.map((note) => note.fret)).toEqual([5, 7]);
    });

    it('locks the notes while the sequence is running, so it cannot change underfoot', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 5, fret: 7 }] });
      usePlaybackStore.setState({ isPlaying: true });

      render(<PracticePanel />);

      expect(screen.getByTestId('timeline-note-0').tagName).toBe('DIV');
    });

    it('locks them too when the roll is not showing the order they were built in', () => {
      useFretboardStore.setState({
        selectedNotes: [7, 5].map((fret) => ({ string: 5, fret })),
      });
      usePlaybackStore.setState({ direction: 'roundTrip' });

      render(<PracticePanel />);

      expect(screen.getByTestId('timeline-note-0').tagName).toBe('DIV');
    });

    it('offers the fret range control, since the riff may sit high up the neck', () => {
      render(<PracticePanel />);

      expect(screen.getByLabelText(/primeira casa vis[ií]vel/i)).toBeInTheDocument();
    });
  });

  describe('the layout', () => {
    const comesBefore = (first: Element, second: Element) =>
      !!(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

    it('puts the neck above the roll, since the neck is where the student acts', () => {
      useUiStore.setState({ fretboardView: 'timeline' });

      render(<PracticePanel />);

      const neck = screen.getByRole('button', { name: 'corda 6, casa 1' });
      const roll = screen.getByTestId('timeline-playhead');
      expect(comesBefore(neck, roll)).toBe(true);
    });

    it('keeps the transport on the same row as the fret range, not below the neck', () => {
      render(<PracticePanel />);

      const transport = screen.getByRole('button', { name: /come[cç]ar/i });
      const range = screen.getByLabelText(/primeira casa vis[ií]vel/i);
      expect(transport.closest('[data-testid="practice-toolbar"]')).toBe(
        range.closest('[data-testid="practice-toolbar"]'),
      );
      expect(transport.closest('[data-testid="practice-toolbar"]')).not.toBeNull();
    });
  });

  describe('while training speed', () => {
    it('counts the loops towards the next tempo instead of the notes', () => {
      useSpeedTrainerStore.setState({
        training: { startBpm: 80, stepBpm: 5, loopsPerStep: 4, targetBpm: 140 },
        session: { bpm: 95, loopsDone: 2, held: false, finished: false },
      });

      render(<PracticePanel />);

      expect(screen.getByTestId('trainer-readout')).toHaveTextContent('volta 3 de 4');
      expect(screen.getByTestId('trainer-readout')).toHaveTextContent('95 BPM');
    });

    it('says plainly that the climb is paused when the student held it', () => {
      useSpeedTrainerStore.setState({
        training: { startBpm: 80, stepBpm: 5, loopsPerStep: 4, targetBpm: 140 },
        session: { bpm: 95, loopsDone: 2, held: true, finished: false },
      });

      render(<PracticePanel />);

      expect(screen.getByTestId('trainer-readout')).toHaveTextContent(/segurando em 95 BPM/i);
    });

    it('reports where the climb ended once it is over', () => {
      useSpeedTrainerStore.setState({ session: null, lastResult: { startBpm: 80, bpm: 140 } });

      render(<PracticePanel />);

      expect(screen.getByTestId('trainer-result')).toHaveTextContent(/140 BPM/);
      expect(screen.getByTestId('trainer-result')).toHaveTextContent(/80/);
    });

    it('goes back to counting notes when no training is running', () => {
      render(<PracticePanel />);

      expect(screen.queryByTestId('trainer-readout')).not.toBeInTheDocument();
      expect(screen.getByText(/2 notas/i)).toBeInTheDocument();
    });
  });
});
