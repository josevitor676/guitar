import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';
import { useExerciseStore } from '../../state/exercise-store';

const { metronome } = vi.hoisted(() => ({
  metronome: { start: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), setSubdivision: vi.fn(), onPulse: () => () => {} },
}));

vi.mock('../../audio', () => ({
  sampler: { isLoaded: () => true, playNote: vi.fn() },
  metronome,
  sequencePlayer: { play: vi.fn(), stop: vi.fn(), onNoteChange: () => () => {} },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { ControlBar } from './ControlBar';

describe('ControlBar', () => {
  beforeEach(() => {
    useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 1 }] });
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter', isPlaying: false });
    useExerciseStore.setState({ activeExerciseId: null, userExercises: [] });
    localStorage.clear();
    metronome.start.mockClear();
    metronome.stop.mockClear();
  });

  it('empties the selection from the clear button', () => {
    render(<ControlBar />);

    fireEvent.click(screen.getByRole('button', { name: /limpar sele[cç][aã]o/i }));

    expect(useFretboardStore.getState().selectedNotes).toEqual([]);
  });

  it('starts the metronome, which no control did before', async () => {
    render(<ControlBar />);

    fireEvent.click(screen.getByRole('button', { name: /ligar metr[oô]nomo/i }));
    await vi.waitFor(() => expect(metronome.start).toHaveBeenCalledOnce());

    expect(useMetronomeStore.getState().isPlaying).toBe(true);
  });

  it('offers to stop the metronome once it is running', () => {
    useMetronomeStore.setState({ isPlaying: true });
    render(<ControlBar />);

    fireEvent.click(screen.getByRole('button', { name: /desligar metr[oô]nomo/i }));

    expect(metronome.stop).toHaveBeenCalledOnce();
    expect(useMetronomeStore.getState().isPlaying).toBe(false);
  });

  it('shows the current BPM', () => {
    render(<ControlBar />);
    expect(screen.getByText('100 BPM')).toBeInTheDocument();
  });

  it('steps the BPM in fives', () => {
    render(<ControlBar />);

    fireEvent.click(screen.getByRole('button', { name: /aumentar bpm/i }));
    expect(useMetronomeStore.getState().bpm).toBe(105);

    fireEvent.click(screen.getByRole('button', { name: /diminuir bpm/i }));
    expect(useMetronomeStore.getState().bpm).toBe(100);
  });

  it('keeps the rhythm figure control available', () => {
    render(<ControlBar />);

    expect(screen.getByLabelText(/figura r[ií]tmica/i)).toBeInTheDocument();
  });

  describe('saving the current sequence', () => {
    it('offers no save form until the student asks for one', () => {
      render(<ControlBar />);
      expect(screen.queryByLabelText(/nome do exerc[ií]cio/i)).not.toBeInTheDocument();
    });

    it('disables saving while nothing is selected', () => {
      useFretboardStore.setState({ selectedNotes: [] });
      render(<ControlBar />);

      expect(screen.getByRole('button', { name: /salvar sequ[eê]ncia/i })).toBeDisabled();
    });

    it('saves the sequence under the typed name', () => {
      render(<ControlBar />);

      fireEvent.click(screen.getByRole('button', { name: /salvar sequ[eê]ncia/i }));
      fireEvent.change(screen.getByLabelText(/nome do exerc[ií]cio/i), {
        target: { value: 'Aquecimento da manhã' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));

      expect(useExerciseStore.getState().userExercises.map((item) => item.name)).toEqual([
        'Aquecimento da manhã',
      ]);
    });

    it('closes the form once the exercise is saved', () => {
      render(<ControlBar />);

      fireEvent.click(screen.getByRole('button', { name: /salvar sequ[eê]ncia/i }));
      fireEvent.change(screen.getByLabelText(/nome do exerc[ií]cio/i), { target: { value: 'Meu' } });
      fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));

      expect(screen.queryByLabelText(/nome do exerc[ií]cio/i)).not.toBeInTheDocument();
    });

    it('keeps the form open and saves nothing when the name is blank', () => {
      render(<ControlBar />);

      fireEvent.click(screen.getByRole('button', { name: /salvar sequ[eê]ncia/i }));
      fireEvent.click(screen.getByRole('button', { name: /^salvar$/i }));

      expect(useExerciseStore.getState().userExercises).toEqual([]);
      expect(screen.getByLabelText(/nome do exerc[ií]cio/i)).toBeInTheDocument();
    });

    it('discards the form on cancel without saving', () => {
      render(<ControlBar />);

      fireEvent.click(screen.getByRole('button', { name: /salvar sequ[eê]ncia/i }));
      fireEvent.change(screen.getByLabelText(/nome do exerc[ií]cio/i), { target: { value: 'Meu' } });
      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

      expect(useExerciseStore.getState().userExercises).toEqual([]);
      expect(screen.queryByLabelText(/nome do exerc[ií]cio/i)).not.toBeInTheDocument();
    });
  });
});
