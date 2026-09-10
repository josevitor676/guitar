import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';
import { useExerciseStore } from '../../state/exercise-store';
import { useUiStore } from '../../state/ui-store';

const { importTabFromFile } = vi.hoisted(() => ({ importTabFromFile: vi.fn() }));

vi.mock('../../services/import-pipeline', async () => {
  const actual = await vi.importActual<typeof import('../../services/import-pipeline')>(
    '../../services/import-pipeline',
  );
  return { ...actual, importTabFromFile };
});
vi.mock('../../audio', () => ({
  sampler: { isLoaded: () => true, playNote: vi.fn() },
  metronome: { start: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), setSubdivision: vi.fn(), onPulse: () => () => {} },
  sequencePlayer: { play: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), onNoteChange: () => () => {} },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { ImportPanel } from './ImportPanel';

const file = new File([''], 'czardas.png', { type: 'image/png' });

function dropFile() {
  const input = screen.getByLabelText(/arquivo da tablatura/i);
  fireEvent.change(input, { target: { files: [file] } });
}

describe('ImportPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    importTabFromFile.mockReset();
    useFretboardStore.setState({ selectedNotes: [], minFret: 1, maxFret: 7 });
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter' });
    useExerciseStore.setState({ activeExerciseId: null, userExercises: [] });
    useUiStore.setState({ activeTab: 'import', fretboardView: 'grid' });
  });

  it('starts by asking for a file, naming what it accepts', () => {
    render(<ImportPanel />);

    expect(screen.getByText(/imagem ou PDF/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /praticar agora/i })).not.toBeInTheDocument();
  });

  it('reports what it is doing while the file is processed', async () => {
    importTabFromFile.mockImplementation(async (_f: File, onProgress?: (p: unknown) => void) => {
      onProgress?.({ label: 'Lendo a tablatura', fraction: 0.5 });
      return [{ string: 6, fret: 3 }];
    });

    render(<ImportPanel />);
    dropFile();

    await waitFor(() => expect(screen.getByText(/3 · corda 6/i)).toBeInTheDocument());
  });

  it('lists the notes it extracted and loads them onto the fretboard', async () => {
    importTabFromFile.mockResolvedValue([
      { string: 6, fret: 3 },
      { string: 5, fret: 5 },
    ]);

    render(<ImportPanel />);
    dropFile();

    await waitFor(() => expect(screen.getByText(/2 notas encontradas/i)).toBeInTheDocument());
    expect(useFretboardStore.getState().selectedNotes).toEqual([
      { string: 6, fret: 3 },
      { string: 5, fret: 5 },
    ]);
  });

  it('lets the student remove a note the reader got wrong', async () => {
    importTabFromFile.mockResolvedValue([
      { string: 6, fret: 3 },
      { string: 5, fret: 5 },
    ]);

    render(<ImportPanel />);
    dropFile();
    await waitFor(() => expect(screen.getByText(/2 notas encontradas/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /remover nota 1/i }));

    expect(screen.getByText(/1 nota encontrada/i)).toBeInTheDocument();
    expect(useFretboardStore.getState().selectedNotes).toEqual([{ string: 5, fret: 5 }]);
  });

  it('shows the reason when no tablature could be read', async () => {
    importTabFromFile.mockRejectedValue(new Error('Não encontrei uma tablatura nesse arquivo.'));

    render(<ImportPanel />);
    dropFile();

    await waitFor(() =>
      expect(screen.getByText(/não encontrei uma tablatura/i)).toBeInTheDocument(),
    );
  });

  it('lets the student practice the imported sequence without saving it first', async () => {
    importTabFromFile.mockResolvedValue([
      { string: 6, fret: 3 },
      { string: 5, fret: 5 },
    ]);

    render(<ImportPanel />);
    dropFile();
    await waitFor(() => expect(screen.getByText(/2 notas encontradas/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /praticar agora/i }));

    expect(useUiStore.getState().activeTab).toBe('practice');
    expect(useFretboardStore.getState().selectedNotes).toEqual([
      { string: 6, fret: 3 },
      { string: 5, fret: 5 },
    ]);
    expect(useExerciseStore.getState().userExercises).toEqual([]);
  });

  it('offers practice without ever requiring a name', async () => {
    importTabFromFile.mockResolvedValue([{ string: 6, fret: 3 }]);

    render(<ImportPanel />);
    dropFile();
    await waitFor(() => expect(screen.getByText(/1 nota encontrada/i)).toBeInTheDocument());

    expect(screen.getByRole('button', { name: /praticar agora/i })).toBeEnabled();
  });

  it('marks saving as the optional step it is', async () => {
    importTabFromFile.mockResolvedValue([{ string: 6, fret: 3 }]);

    render(<ImportPanel />);
    dropFile();
    await waitFor(() => expect(screen.getByText(/1 nota encontrada/i)).toBeInTheDocument());

    expect(screen.getByText(/opcional/i)).toBeInTheDocument();
  });

  it('saves the reviewed sequence into the student library and opens the exercises tab', async () => {
    importTabFromFile.mockResolvedValue([{ string: 6, fret: 3 }]);

    render(<ImportPanel />);
    dropFile();
    await waitFor(() => expect(screen.getByText(/1 nota encontrada/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/nome do exerc[ií]cio/i), { target: { value: 'Czardas' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar na biblioteca/i }));

    expect(useExerciseStore.getState().userExercises.map((item) => item.name)).toEqual(['Czardas']);
    expect(useUiStore.getState().activeTab).toBe('exercises');
  });

  it('does not save a nameless exercise, and says so instead of failing silently', async () => {
    importTabFromFile.mockResolvedValue([{ string: 6, fret: 3 }]);

    render(<ImportPanel />);
    dropFile();
    await waitFor(() => expect(screen.getByText(/1 nota encontrada/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /salvar na biblioteca/i }));

    expect(useExerciseStore.getState().userExercises).toEqual([]);
    expect(useUiStore.getState().activeTab).toBe('import');
    expect(screen.getByText(/d[êe] um nome/i)).toBeInTheDocument();
  });
});
