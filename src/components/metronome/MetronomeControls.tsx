import type { Subdivision } from '../../domain/music-theory/rhythm';
import { useMetronome } from '../../hooks/useMetronome';

const SUBDIVISION_LABELS: Record<Subdivision, string> = {
  quarter: 'Semínima',
  eighth: 'Colcheia',
  triplet: 'Tercina',
  sixteenth: 'Semicolcheia',
};

export function MetronomeControls() {
  const { bpm, subdivision, setBpm, setSubdivision } = useMetronome();

  return (
    <div className="flex items-center gap-4 font-medium tracking-wide text-zinc-200">
      <button
        type="button"
        onClick={() => setBpm(bpm - 5)}
        className="rounded bg-zinc-800 px-3 py-1 transition-all duration-200 hover:bg-zinc-700 active:scale-95"
      >
        -
      </button>
      <span>{bpm} BPM</span>
      <button
        type="button"
        onClick={() => setBpm(bpm + 5)}
        className="rounded bg-zinc-800 px-3 py-1 transition-all duration-200 hover:bg-zinc-700 active:scale-95"
      >
        +
      </button>

      <label className="flex items-center gap-2">
        Figura rítmica
        <select
          value={subdivision}
          onChange={(event) => setSubdivision(event.target.value as Subdivision)}
          className="rounded bg-zinc-800 px-2 py-1 transition-all duration-200"
        >
          {Object.entries(SUBDIVISION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
