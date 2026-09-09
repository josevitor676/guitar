import { useState } from 'react';
import { Play, Square, RotateCcw, Volume2, VolumeX, BookmarkPlus } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { Chip } from '../ui/Chip';
import { MetronomeControls } from '../metronome/MetronomeControls';
import { useNotePlayback } from '../../hooks/useNotePlayback';
import { useMetronome } from '../../hooks/useMetronome';
import { useFretboardStore } from '../../state/fretboard-store';
import { useExerciseStore } from '../../state/exercise-store';
import { usePlaybackStore } from '../../state/playback-store';
import type { PlaybackDirection } from '../../domain/fretboard/fretboard-model';

export function ControlBar() {
  const { play, stop, isPlaying } = useNotePlayback();
  const { bpm, setBpm, isPlaying: metronomeOn, start: startMetronome, stop: stopMetronome } = useMetronome();
  const clearSelection = useFretboardStore((state) => state.clearSelection);
  const hasSelection = useFretboardStore((state) => state.selectedNotes.length > 0);
  const saveCurrentSelection = useExerciseStore((state) => state.saveCurrentSelection);

  const direction = usePlaybackStore((state) => state.direction);
  const setDirection = usePlaybackStore((state) => state.setDirection);

  const [isNaming, setIsNaming] = useState(false);
  const [name, setName] = useState('');

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
    <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4">
      <div className="flex flex-wrap items-center gap-4">
      <IconButton
        label={isPlaying ? 'Parar' : 'Começar'}
        variant="primary"
        onClick={() => (isPlaying ? stop() : void play())}
      >
        {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </IconButton>

      <IconButton label="Limpar seleção" onClick={clearSelection}>
        <RotateCcw className="h-4 w-4" />
      </IconButton>

      <IconButton
        label={metronomeOn ? 'Desligar metrônomo' : 'Ligar metrônomo'}
        onClick={() => (metronomeOn ? stopMetronome() : void startMetronome())}
      >
        {metronomeOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
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
          className="rounded-full border border-white/[0.06] bg-surface px-2 py-1 text-text-primary transition-all duration-200"
        >
          <option value="up">Subindo</option>
          <option value="down">Descendo</option>
          <option value="upDown">Subindo e descendo</option>
        </select>
      </label>

      <MetronomeControls />
      </div>

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
            className="rounded-full border border-white/[0.06] bg-surface px-3 py-1 text-sm text-text-primary outline-none transition-all duration-200 focus:border-accent"
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
