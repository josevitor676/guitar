import { Play, Square, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { Chip } from '../ui/Chip';
import { MetronomeControls } from '../metronome/MetronomeControls';
import { useNotePlayback } from '../../hooks/useNotePlayback';
import { useMetronome } from '../../hooks/useMetronome';
import { useFretboardStore } from '../../state/fretboard-store';

export function ControlBar() {
  const { play, stop, isPlaying } = useNotePlayback();
  const { bpm, setBpm, isPlaying: metronomeOn, start: startMetronome, stop: stopMetronome } = useMetronome();
  const clearSelection = useFretboardStore((state) => state.clearSelection);

  return (
    <div className="flex flex-wrap items-center gap-4 border-t border-white/[0.06] pt-4">
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

      <MetronomeControls />
    </div>
  );
}
