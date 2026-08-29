import { useNotePlayback } from '../../hooks/useNotePlayback';

export function PlayButton() {
  const { play, stop, isPlaying } = useNotePlayback();

  return (
    <button
      type="button"
      onClick={() => (isPlaying ? stop() : play())}
      className="rounded bg-amber-400 px-4 py-2 font-semibold tracking-wide text-zinc-900 transition-all duration-200 hover:bg-amber-300 active:scale-95"
    >
      {isPlaying ? 'Parar' : 'Play'}
    </button>
  );
}
