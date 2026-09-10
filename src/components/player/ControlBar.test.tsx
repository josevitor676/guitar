import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';
import { useExerciseStore } from '../../state/exercise-store';
import { usePlaybackStore } from '../../state/playback-store';

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
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter', isPlaying: false, enabled: false });
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

  it('arms the metronome without sounding it, since the click belongs to playback', () => {
    render(<ControlBar />);

    fireEvent.click(screen.getByRole('button', { name: /ligar metr[oô]nomo/i }));

    expect(useMetronomeStore.getState().enabled).toBe(true);
    expect(metronome.start).not.toHaveBeenCalled();
  });

  it('disarms it again on a second press', () => {
    useMetronomeStore.setState({ enabled: true });
    render(<ControlBar />);

    fireEvent.click(screen.getByRole('button', { name: /desligar metr[oô]nomo/i }));

    expect(useMetronomeStore.getState().enabled).toBe(false);
  });

  it('shows the armed metronome filled, so the state is visible at a glance', () => {
    useMetronomeStore.setState({ enabled: true });
    render(<ControlBar />);

    expect(screen.getByRole('button', { name: /desligar metr[oô]nomo/i }).className).toContain('bg-accent');
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

  describe('counting in', () => {
    it('counts before the sequence starts, showing the beat on the button', () => {
      vi.useFakeTimers();
      useMetronomeStore.setState({ bpm: 60 });
      render(<ControlBar />);

      fireEvent.click(screen.getByRole('button', { name: /come[cç]ar/i }));
      expect(screen.getByTestId('count-in')).toHaveTextContent('1');

      act(() => void vi.advanceTimersByTime(1000));
      expect(screen.getByTestId('count-in')).toHaveTextContent('2');

      act(() => void vi.advanceTimersByTime(2000));
      expect(screen.queryByTestId('count-in')).not.toBeInTheDocument();
      vi.useRealTimers();
    });

    it('drops the count when playback is stopped part-way through it', () => {
      vi.useFakeTimers();
      useMetronomeStore.setState({ bpm: 60 });
      usePlaybackStore.setState({ isPlaying: true });
      render(<ControlBar />);

      fireEvent.click(screen.getByRole('button', { name: /parar/i }));

      expect(screen.queryByTestId('count-in')).not.toBeInTheDocument();
      vi.useRealTimers();
    });
  });
});
