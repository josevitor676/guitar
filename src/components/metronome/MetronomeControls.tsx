import type { Subdivision } from '../../domain/music-theory/rhythm';
import { useMetronome } from '../../hooks/useMetronome';

const SUBDIVISION_LABELS: Record<Subdivision, string> = {
  quarter: 'Semínima',
  eighth: 'Colcheia',
  triplet: 'Tercina',
  sixteenth: 'Semicolcheia',
};

export function MetronomeControls() {
  const { bpm, subdivision, isPlaying, setBpm, setSubdivision, start, stop } = useMetronome();

  return (
    <div className="flex items-center gap-4 text-neutral-200">
      <button type="button" onClick={() => setBpm(bpm - 5)} className="rounded bg-neutral-800 px-3 py-1">
        -
      </button>
      <span>{bpm} BPM</span>
      <button type="button" onClick={() => setBpm(bpm + 5)} className="rounded bg-neutral-800 px-3 py-1">
        +
      </button>

      <label className="flex items-center gap-2">
        Figura rítmica
        <select
          value={subdivision}
          onChange={(event) => setSubdivision(event.target.value as Subdivision)}
          className="rounded bg-neutral-800 px-2 py-1"
        >
          {Object.entries(SUBDIVISION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => (isPlaying ? stop() : start())}
        className="rounded bg-amber-500 px-3 py-1 text-neutral-900"
      >
        {isPlaying ? 'Parar' : 'Iniciar'} metrônomo
      </button>
    </div>
  );
}
