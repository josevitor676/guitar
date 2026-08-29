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
    <div className="flex items-center gap-4 text-sm text-text-secondary">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-surface px-3 py-1">
        <button
          type="button"
          onClick={() => setBpm(bpm - 5)}
          className="text-text-primary transition-all duration-200 hover:opacity-70"
        >
          -
        </button>
        <span className="text-text-primary">{bpm} BPM</span>
        <button
          type="button"
          onClick={() => setBpm(bpm + 5)}
          className="text-text-primary transition-all duration-200 hover:opacity-70"
        >
          +
        </button>
      </div>

      <label className="flex items-center gap-2">
        Figura rítmica
        <select
          value={subdivision}
          onChange={(event) => setSubdivision(event.target.value as Subdivision)}
          className="rounded-full border border-white/10 bg-surface px-2 py-1 text-text-primary transition-all duration-200"
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
