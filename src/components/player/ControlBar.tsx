import { useState } from 'react';
import { Play, Square, RotateCcw, BookmarkPlus, Gauge, Download } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { Chip } from '../ui/Chip';
import { MetronomeControls } from '../metronome/MetronomeControls';
import { MetronomeIcon } from '../metronome/MetronomeIcon';
import { useNotePlayback } from '../../hooks/useNotePlayback';
import { useCountIn } from '../../hooks/useCountIn';
import { useMetronome } from '../../hooks/useMetronome';
import { useFretboardStore } from '../../state/fretboard-store';
import { useExerciseStore, findExercise } from '../../state/exercise-store';
import { canTranspose } from '../../domain/fretboard/transpose';
import { sequencesEqual } from '../../domain/fretboard/fretboard-model';
import { usePlaybackStore } from '../../state/playback-store';
import { useSpeedTrainerStore } from '../../state/speed-trainer-store';
import { useSpeedTrainer } from '../../hooks/useSpeedTrainer';
import { SpeedTrainerSettings } from './SpeedTrainerSettings';
import { usePlaybackSequence } from '../../hooks/usePlaybackSequence';
import { downloadTabImage, downloadTabPdf } from '../../services/tab-export';
import { useMetronomeStore } from '../../state/metronome-store';
import type { PlaybackDirection } from '../../domain/fretboard/fretboard-model';

export function ControlBar() {
  const { play, stop, isPlaying } = useNotePlayback();
  const { bpm, setBpm, enabled: metronomeArmed, setEnabled: setMetronomeArmed } = useMetronome();
  const countIn = useCountIn(bpm);
  const clearSelection = useFretboardStore((state) => state.clearSelection);
  const hasSelection = useFretboardStore((state) => state.selectedNotes.length > 0);
  const saveCurrentSelection = useExerciseStore((state) => state.saveCurrentSelection);

  const trainerOn = useSpeedTrainerStore((state) => state.enabled);
  const setTrainerOn = useSpeedTrainerStore((state) => state.setEnabled);
  const activeExerciseId = useExerciseStore((state) => state.activeExerciseId);
  const selectExercise = useExerciseStore((state) => state.selectExercise);

  const direction = usePlaybackStore((state) => state.direction);
  const setDirection = usePlaybackStore((state) => state.setDirection);

  const [isDownloading, setIsDownloading] = useState(false);
  const [isNaming, setIsNaming] = useState(false);
  const [name, setName] = useState('');

  // Stopping ends the training session too, which is where the tempo reached
  // becomes the record for the exercise.
  const stopEverything = () => {
    stop();
    countIn.clear();
    useSpeedTrainerStore.getState().endSession(activeExerciseId);
  };
  useSpeedTrainer({ stop: stopEverything });

  // The sheet prints what would be played, direction and all — it is meant to
  // be handed to someone who will play it, not to describe the neck.
  const sequence = usePlaybackSequence();
  const userExercises = useExerciseStore((state) => state.userExercises);
  const selectedNotes = useFretboardStore((state) => state.selectedNotes);
  const transposeSelection = useFretboardStore((state) => state.transposeSelection);

  // Whether the neck still holds what the exercise was saved with. Comparing
  // is better than tracking a flag: the flag would have to be cleared from
  // every path that changes notes, and one missed path leaves a false alarm
  // on screen for good.
  const openExercise = findExercise(activeExerciseId, userExercises);
  const changed = !!openExercise && !sequencesEqual(openExercise.positions, selectedNotes);
  const isOwn = openExercise?.category === 'meu';
  const subdivision = useMetronomeStore((state) => state.subdivision);

  const download = (save: (sheet: {
    title: string;
    bpm: number;
    subdivision: typeof subdivision;
    positions: typeof sequence;
  }) => Promise<void>) => {
    setIsDownloading(false);
    void save({
      title: findExercise(activeExerciseId, userExercises)?.name ?? 'Sequência livre',
      bpm,
      subdivision,
      positions: sequence,
    });
  };

  const closeForm = () => {
    setIsNaming(false);
    setName('');
  };

  // saveCurrentSelection returns null for a blank name or an empty selection;
  // in that case the form stays open so the student can correct it.
  const submitName = () => {
    if (saveCurrentSelection(name)) closeForm();
  };

  return (
    // The bar used to sit at the foot of the card, where a rule separated it
    // from the neck. It now sits inline in the toolbar row, so that rule
    // would be a line with nothing on either side of it.
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
      <IconButton
        label={isPlaying ? 'Parar' : 'Começar'}
        variant="primary"
        onClick={() => {
          if (isPlaying) {
            stopEverything();
            return;
          }
          // Playback is already scheduled to begin after the count; this shows it.
          countIn.start();
          if (!trainerOn) return void play();

          // The trainer chooses the tempo, so the session opens first and its
          // starting tempo is handed straight to playback.
          const { training, startSession } = useSpeedTrainerStore.getState();
          startSession();
          void play(training.startBpm);
        }}
      >
        {countIn.count !== null ? (
          <span data-testid="count-in" className="text-sm font-bold">
            {countIn.count}
          </span>
        ) : isPlaying ? (
          <Square className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </IconButton>

      <IconButton label="Limpar seleção" onClick={clearSelection}>
        <RotateCcw className="h-4 w-4" />
      </IconButton>

      <IconButton
        label={metronomeArmed ? 'Desligar metrônomo' : 'Ligar metrônomo'}
        onClick={() => setMetronomeArmed(!metronomeArmed)}
        active={metronomeArmed}
      >
        <MetronomeIcon />
      </IconButton>

      <Chip>
        <button
          type="button"
          aria-label="Diminuir BPM"
          onClick={() => setBpm(bpm - 5)}
          className="text-text-primary transition-all duration-200 hover:opacity-70"
        >
          −
        </button>
        <span className="text-text-primary">{bpm} BPM</span>
        <button
          type="button"
          aria-label="Aumentar BPM"
          onClick={() => setBpm(bpm + 5)}
          className="text-text-primary transition-all duration-200 hover:opacity-70"
        >
          +
        </button>
      </Chip>

      <IconButton
        label="Treinador de velocidade"
        onClick={() => setTrainerOn(!trainerOn)}
        active={trainerOn}
      >
        <Gauge className="h-4 w-4" />
      </IconButton>

      <Chip>
        <button
          type="button"
          aria-label="Uma casa para trás"
          disabled={!canTranspose(selectedNotes, -1)}
          onClick={() => transposeSelection(-1)}
          className="text-text-primary transition-all duration-200 hover:opacity-70 disabled:opacity-30"
        >
          −
        </button>
        <span className="text-text-secondary">casa</span>
        <button
          type="button"
          aria-label="Uma casa para frente"
          disabled={!canTranspose(selectedNotes, 1)}
          onClick={() => transposeSelection(1)}
          className="text-text-primary transition-all duration-200 hover:opacity-70 disabled:opacity-30"
        >
          +
        </button>
      </Chip>

      <IconButton
        label="Baixar tablatura"
        onClick={() => setIsDownloading(!isDownloading)}
        active={isDownloading}
        disabled={!hasSelection}
      >
        <Download className="h-4 w-4" />
      </IconButton>

      <IconButton
        label="Salvar sequência"
        onClick={() => setIsNaming(true)}
        disabled={!hasSelection}
      >
        <BookmarkPlus className="h-4 w-4" />
      </IconButton>

      <label className="flex items-center gap-2 text-sm text-text-secondary">
        Direção
        <select
          value={direction}
          onChange={(event) => setDirection(event.target.value as PlaybackDirection)}
          className="rounded-full border border-edge bg-surface px-2 py-1 text-text-primary transition-all duration-200"
        >
          <option value="sixthToFirst">Descendo</option>
          <option value="firstToSixth">Subindo</option>
          <option value="roundTrip">Descendo e subindo</option>
        </select>
      </label>

      <MetronomeControls />
      </div>

      {trainerOn && <SpeedTrainerSettings />}

      {/*
        Moving an exercise along the neck leaves the library's copy behind, so
        the student is asked what to do with the version in front of them. A
        catalogue exercise is the app's, so the only way to keep a change to
        one is to make it an exercise of their own.
      */}
      {changed && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
          Exercício alterado.
          {isOwn && (
            <button
              type="button"
              onClick={() => useExerciseStore.getState().updateActiveUserExercise()}
              className="rounded-full border border-accent bg-accent-dim px-3 py-1 text-text-primary transition-all duration-200 hover:bg-accent hover:text-body"
            >
              Salvar alterações
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsNaming(true)}
            className="rounded-full border border-edge bg-surface px-3 py-1 text-text-primary transition-all duration-200 hover:border-accent hover:text-accent"
          >
            Salvar como novo
          </button>
          <button
            type="button"
            onClick={() => activeExerciseId && selectExercise(activeExerciseId)}
            className="rounded-full border border-edge bg-surface px-3 py-1 text-text-primary transition-all duration-200 hover:border-accent hover:text-accent"
          >
            Desfazer
          </button>
        </div>
      )}

      {isDownloading && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
          Baixar como
          <button
            type="button"
            onClick={() => download(downloadTabImage)}
            className="rounded-full border border-edge bg-surface px-3 py-1 text-text-primary transition-all duration-200 hover:border-accent hover:text-accent"
          >
            Imagem (PNG)
          </button>
          <button
            type="button"
            onClick={() => download(downloadTabPdf)}
            className="rounded-full border border-edge bg-surface px-3 py-1 text-text-primary transition-all duration-200 hover:border-accent hover:text-accent"
          >
            PDF
          </button>
          <span>A folha sai com o andamento e a figura rítmica, para poder ser tocada depois.</span>
        </div>
      )}

      {isNaming && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submitName();
          }}
        >
          <label htmlFor="exercise-name" className="text-xs text-text-secondary">
            Nome do exercício
          </label>
          <input
            id="exercise-name"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            className="rounded-full border border-edge bg-surface px-3 py-1 text-sm text-text-primary outline-none transition-all duration-200 focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-body transition-all duration-200 hover:bg-accent-soft"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={closeForm}
            className="rounded-full px-3 py-1 text-xs text-text-secondary transition-all duration-200 hover:text-text-primary"
          >
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}
