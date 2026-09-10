import type { Subdivision } from '../../domain/music-theory/rhythm';
import { SUBDIVISION_LABELS } from '../../domain/music-theory/rhythm';
import { useMetronome } from '../../hooks/useMetronome';

export function MetronomeControls() {
  const { subdivision, setSubdivision } = useMetronome();

  return (
    <label className="flex items-center gap-2 text-sm text-text-secondary">
      Figura rítmica
      <select
        value={subdivision}
        onChange={(event) => setSubdivision(event.target.value as Subdivision)}
        className="rounded-full border border-edge bg-surface px-2 py-1 text-text-primary transition-all duration-200"
      >
        {Object.entries(SUBDIVISION_LABELS).map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
