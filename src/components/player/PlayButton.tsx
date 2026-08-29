import { Play, Square } from 'lucide-react';
import { useNotePlayback } from '../../hooks/useNotePlayback';

export function PlayButton() {
  const { play, stop, isPlaying } = useNotePlayback();

  return (
    <button
      type="button"
      onClick={() => (isPlaying ? stop() : play())}
      className="flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm font-semibold text-body transition-all duration-200 hover:opacity-90 active:scale-95"
    >
      {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      {isPlaying ? 'Parar' : 'Começar'}
    </button>
  );
}
