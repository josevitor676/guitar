import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';
import { useExerciseStore } from '../../state/exercise-store';
import { usePlaybackStore } from '../../state/playback-store';
import { useSpeedTrainerStore } from '../../state/speed-trainer-store';
import { EXERCISE_CATALOG } from '../../domain/exercises/exercise-catalog';

const { metronome, sequencePlayer, noteListeners } = vi.hoisted(() => {
  const noteListeners = new Set<(index: number) => void>();
  return {
    noteListeners,
    metronome: { start: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), setSubdivision: vi.fn(), onPulse: () => () => {} },
    sequencePlayer: {
      play: vi.fn(),
      stop: vi.fn(),
      setBpm: vi.fn(),
      onNoteChange: (listener: (index: number) => void) => {
        noteListeners.add(listener);
        return () => noteListeners.delete(listener);
      },
    },
  };
});

const tabExport = vi.hoisted(() => ({
  downloadTabImage: vi.fn().mockResolvedValue(undefined),
  downloadTabPdf: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../services/tab-export', () => tabExport);

vi.mock('../../audio', () => ({
  sampler: { isLoaded: () => true, playNote: vi.fn() },
  metronome,
  sequencePlayer,
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

/** Drives the player's note callback, which is how a loop is detected. */
function playNotes(...indices: number[]) {
  act(() => {
    indices.forEach((index) => noteListeners.forEach((listener) => listener(index)));
  });
}

import { ControlBar } from './ControlBar';

describe('ControlBar', () => {
  beforeEach(() => {
    useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 1 }] });
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter', isPlaying: false, enabled: false });
    useExerciseStore.setState({ activeExerciseId: null, userExercises: [] });
    usePlaybackStore.setState({ isPlaying: false, currentIndex: null, direction: 'sixthToFirst' });
    localStorage.clear();
    useSpeedTrainerStore.setState({
      enabled: false,
      training: { startBpm: 80, stepBpm: 5, loopsPerStep: 2, targetBpm: 90 },
      session: null,
      records: {},
    });
    metronome.start.mockClear();
    metronome.stop.mockClear();
    tabExport.downloadTabImage.mockClear();
    tabExport.downloadTabPdf.mockClear();
    sequencePlayer.play.mockClear();
    sequencePlayer.setBpm.mockClear();
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

  describe('the speed trainer', () => {
    const startTraining = async () => {
      fireEvent.click(screen.getByRole('button', { name: /come[cç]ar/i }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000);
      });
    };

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('stays out of the way until the student asks for it', () => {
      render(<ControlBar />);
      expect(screen.queryByLabelText(/subir a cada/i)).not.toBeInTheDocument();
    });

    it('opens its settings when switched on', () => {
      render(<ControlBar />);

      fireEvent.click(screen.getByRole('button', { name: /treinador de velocidade/i }));

      expect(screen.getByLabelText(/come[cç]ar em/i)).toHaveValue(80);
      expect(screen.getByLabelText(/at[ée]/i)).toHaveValue(90);
    });

    it('starts playback at the training tempo, not at whatever the BPM was', async () => {
      useMetronomeStore.setState({ bpm: 130 });
      useSpeedTrainerStore.setState({ enabled: true });
      render(<ControlBar />);

      await startTraining();

      expect(useMetronomeStore.getState().bpm).toBe(80);
      expect(sequencePlayer.play).toHaveBeenCalledWith(
        expect.anything(), 80, expect.anything(), expect.anything(),
      );
    });

    it('raises the tempo once the quota of loops is played, without restarting', async () => {
      useSpeedTrainerStore.setState({ enabled: true });
      render(<ControlBar />);
      await startTraining();

      playNotes(0, 1, 0, 1, 0);

      expect(useSpeedTrainerStore.getState().session).toMatchObject({ bpm: 85 });
      expect(sequencePlayer.setBpm).toHaveBeenCalledWith(85);
      expect(sequencePlayer.play).toHaveBeenCalledTimes(1);
    });

    it('freezes the climb where it is when the student holds', async () => {
      useSpeedTrainerStore.setState({ enabled: true });
      render(<ControlBar />);
      await startTraining();

      fireEvent.click(screen.getByRole('button', { name: /segurar aqui/i }));
      playNotes(0, 1, 0, 1, 0);

      expect(useSpeedTrainerStore.getState().session).toMatchObject({ bpm: 80, held: true });
    });

    it('stops on its own once the target has been played', async () => {
      useSpeedTrainerStore.setState({
        enabled: true,
        training: { startBpm: 80, stepBpm: 10, loopsPerStep: 1, targetBpm: 90 },
      });
      render(<ControlBar />);
      await startTraining();

      playNotes(0, 1, 0, 1, 0);

      expect(sequencePlayer.stop).toHaveBeenCalled();
      expect(usePlaybackStore.getState().isPlaying).toBe(false);
    });

    it('shows the record for the exercise, and offers to start from it', () => {
      useExerciseStore.setState({ activeExerciseId: 'repeat-three-note-cell' });
      useSpeedTrainerStore.setState({ enabled: true, records: { 'repeat-three-note-cell': 125 } });
      render(<ControlBar />);

      expect(screen.getByText(/seu recorde/i)).toHaveTextContent('125 BPM');

      fireEvent.click(screen.getByRole('button', { name: /come[cç]ar dele/i }));

      expect(useSpeedTrainerStore.getState().training).toMatchObject({
        startBpm: 125,
        targetBpm: 125,
      });
    });

    it('offers no record for free practice, which has no exercise open', () => {
      useSpeedTrainerStore.setState({ enabled: true, records: { 'repeat-three-note-cell': 125 } });
      render(<ControlBar />);

      expect(screen.queryByText(/seu recorde/i)).not.toBeInTheDocument();
    });

    it('keeps the tempo reached as the record for the exercise being practised', async () => {
      useExerciseStore.setState({ activeExerciseId: 'repeat-three-note-cell' });
      useSpeedTrainerStore.setState({ enabled: true });
      render(<ControlBar />);
      await startTraining();
      playNotes(0, 1, 0, 1, 0);

      fireEvent.click(screen.getByRole('button', { name: /parar/i }));

      expect(useSpeedTrainerStore.getState().records['repeat-three-note-cell']).toBe(85);
    });
  });

  describe('taking the tablature out', () => {
    it('offers nothing to download while there is no sequence', () => {
      useFretboardStore.setState({ selectedNotes: [] });
      render(<ControlBar />);

      expect(screen.getByRole('button', { name: /baixar tablatura/i })).toBeDisabled();
    });

    it('offers the two printable formats', () => {
      render(<ControlBar />);

      fireEvent.click(screen.getByRole('button', { name: /baixar tablatura/i }));

      expect(screen.getByRole('button', { name: /imagem/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^pdf$/i })).toBeInTheDocument();
    });

    it('sends the sequence, the tempo and the figure, since a sheet without them cannot be played', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 3 }, { string: 6, fret: 5 }] });
      useMetronomeStore.setState({ bpm: 96, subdivision: 'sixteenth' });
      render(<ControlBar />);

      fireEvent.click(screen.getByRole('button', { name: /baixar tablatura/i }));
      fireEvent.click(screen.getByRole('button', { name: /^pdf$/i }));

      expect(tabExport.downloadTabPdf).toHaveBeenCalledWith({
        title: 'Sequência livre',
        bpm: 96,
        subdivision: 'sixteenth',
        positions: [{ string: 6, fret: 3 }, { string: 6, fret: 5 }],
      });
    });

    it('titles the sheet with the exercise being practised', () => {
      useExerciseStore.setState({ activeExerciseId: 'repeat-three-note-cell' });
      render(<ControlBar />);

      fireEvent.click(screen.getByRole('button', { name: /baixar tablatura/i }));
      fireEvent.click(screen.getByRole('button', { name: /imagem/i }));

      expect(tabExport.downloadTabImage).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Célula 3-5-7 repetida' }),
      );
    });

    it('closes the menu once a format is chosen', () => {
      render(<ControlBar />);

      fireEvent.click(screen.getByRole('button', { name: /baixar tablatura/i }));
      fireEvent.click(screen.getByRole('button', { name: /^pdf$/i }));

      expect(screen.queryByRole('button', { name: /^pdf$/i })).not.toBeInTheDocument();
    });
  });

  describe('moving an exercise along the neck', () => {
    const shiftUp = () => fireEvent.click(screen.getByRole('button', { name: /uma casa para frente/i }));

    it('moves every note of the sequence one fret', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 3 }, { string: 5, fret: 5 }] });
      render(<ControlBar />);

      shiftUp();

      expect(useFretboardStore.getState().selectedNotes.map((n) => n.fret)).toEqual([4, 6]);
    });

    it('will not move a sequence off the end of the neck', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 1, fret: 24 }] });
      render(<ControlBar />);

      expect(screen.getByRole('button', { name: /uma casa para frente/i })).toBeDisabled();
    });

    it('says nothing while the neck still matches the exercise', () => {
      useExerciseStore.setState({ activeExerciseId: 'warmup-1234-low-e' });
      useFretboardStore.setState({
        selectedNotes: EXERCISE_CATALOG.find((e) => e.id === 'warmup-1234-low-e')!.positions,
      });
      render(<ControlBar />);

      expect(screen.queryByText(/exerc[ií]cio alterado/i)).not.toBeInTheDocument();
    });

    it('offers to keep the change once the exercise has been moved', () => {
      const exercise = EXERCISE_CATALOG.find((e) => e.id === 'warmup-1234-low-e')!;
      useExerciseStore.setState({ activeExerciseId: exercise.id });
      useFretboardStore.setState({ selectedNotes: exercise.positions });
      render(<ControlBar />);

      shiftUp();

      expect(screen.getByText(/exerc[ií]cio alterado/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /salvar como novo/i })).toBeInTheDocument();
    });

    // The catalogue is the app's. A student's change to one becomes theirs.
    it('does not offer to overwrite a catalogue exercise', () => {
      const exercise = EXERCISE_CATALOG.find((e) => e.id === 'warmup-1234-low-e')!;
      useExerciseStore.setState({ activeExerciseId: exercise.id });
      useFretboardStore.setState({ selectedNotes: exercise.positions });
      render(<ControlBar />);

      shiftUp();

      expect(screen.queryByRole('button', { name: /salvar altera[cç][õo]es/i })).not.toBeInTheDocument();
    });

    it('overwrites the student’s own exercise in place', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 3 }] });
      const saved = useExerciseStore.getState().saveCurrentSelection('Exercício X')!;
      render(<ControlBar />);

      shiftUp();
      fireEvent.click(screen.getByRole('button', { name: /salvar altera[cç][õo]es/i }));

      expect(
        useExerciseStore.getState().userExercises.find((e) => e.id === saved.id)!.positions[0].fret,
      ).toBe(4);
      expect(screen.queryByText(/exerc[ií]cio alterado/i)).not.toBeInTheDocument();
    });

    it('puts the exercise back the way it was on undo', () => {
      const exercise = EXERCISE_CATALOG.find((e) => e.id === 'warmup-1234-low-e')!;
      useExerciseStore.setState({ activeExerciseId: exercise.id });
      useFretboardStore.setState({ selectedNotes: exercise.positions });
      render(<ControlBar />);

      shiftUp();
      fireEvent.click(screen.getByRole('button', { name: /desfazer/i }));

      expect(useFretboardStore.getState().selectedNotes.map((n) => n.fret)).toEqual(
        exercise.positions.map((p) => p.fret),
      );
    });

    it('says nothing in free practice, where there is no exercise to change', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 3 }] });
      render(<ControlBar />);

      shiftUp();

      expect(screen.queryByText(/exerc[ií]cio alterado/i)).not.toBeInTheDocument();
    });
  });
});
