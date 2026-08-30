import type { Subdivision } from '../../domain/music-theory/rhythm';
import type { StringNumber } from '../../domain/music-theory/tuning';
import { STANDARD_TUNING } from '../../domain/music-theory/tuning';
import { getPitchClass } from '../../domain/music-theory/notes';
import { useMetronome } from '../../hooks/useMetronome';

const SUBDIVISION_LABELS: Record<Subdivision, string> = {
  quarter: 'Semínima',
  eighth: 'Colcheia',
  triplet: 'Tercina',
  sixteenth: 'Semicolcheia',
};

const STRING_ORDER: StringNumber[] = [1, 2, 3, 4, 5, 6];

function SubdivisionSelect({ value, onChange }: { value: Subdivision; onChange: (value: Subdivision) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as Subdivision)}
      className="rounded-full border border-white/10 bg-surface px-2 py-1 text-text-primary transition-all duration-200"
    >
      {Object.entries(SUBDIVISION_LABELS).map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function MetronomeControls() {
  const {
    bpm,
    subdivision,
    rhythmMode,
    subdivisionByString,
    setBpm,
    setSubdivision,
    setRhythmMode,
    setStringSubdivision,
  } = useMetronome();

  return (
    <div className="flex flex-col gap-3 text-sm text-text-secondary">
      <div className="flex items-center gap-4">
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

        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-surface p-1">
          <button
            type="button"
            onClick={() => setRhythmMode('note')}
            aria-pressed={rhythmMode === 'note'}
            className={`rounded-full px-2 py-0.5 transition-all duration-200 ${
              rhythmMode === 'note' ? 'bg-white/10 text-text-primary' : 'text-text-secondary'
            }`}
          >
            Por nota
          </button>
          <button
            type="button"
            onClick={() => setRhythmMode('string')}
            aria-pressed={rhythmMode === 'string'}
            className={`rounded-full px-2 py-0.5 transition-all duration-200 ${
              rhythmMode === 'string' ? 'bg-white/10 text-text-primary' : 'text-text-secondary'
            }`}
          >
            Por corda
          </button>
        </div>
      </div>

      {rhythmMode === 'note' ? (
        <label className="flex items-center gap-2">
          Figura rítmica
          <SubdivisionSelect value={subdivision} onChange={setSubdivision} />
        </label>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {STRING_ORDER.map((string) => (
            <label key={string} className="flex items-center gap-1">
              {getPitchClass(STANDARD_TUNING[string])}
              <SubdivisionSelect
                value={subdivisionByString[string]}
                onChange={(value) => setStringSubdivision(string, value)}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
