import { useNotePlayback } from '../../hooks/useNotePlayback';

export function PlayButton() {
  const { play, stop, isPlaying } = useNotePlayback();

  return (
    <button
      type="button"
      onClick={() => (isPlaying ? stop() : play())}
      className="rounded bg-emerald-500 px-4 py-2 font-semibold text-neutral-900"
    >
      {isPlaying ? 'Parar' : 'Play'}
    </button>
  );
}
