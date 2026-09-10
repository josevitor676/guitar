import type { IdentifiedChord } from '../../domain/chords/chord-identification';
import { keyForChord, diatonicChords, progressionsFor } from '../../domain/chords/progressions';
import type { DegreeChord } from '../../domain/chords/progressions';

interface ChordProgressionsProps {
  chord: IdentifiedChord;
  onPick: (chord: DegreeChord) => void;
}

/** Chords that live in the same key, and the progressions players actually use. */
export function ChordProgressions({ chord, onPick }: ChordProgressionsProps) {
  const key = keyForChord(chord.root, chord.symbol);

  if (!key) {
    return (
      <p className="text-sm text-text-secondary">
        {chord.displayName} não pertence firmemente a um tom — é um acorde de passagem, e sugerir uma
        progressão para ele seria chute.
      </p>
    );
  }

  const family = diatonicChords(key);
  const progressions = progressionsFor(key);
  const isCurrent = (candidate: DegreeChord) =>
    candidate.root === chord.root && candidate.symbol === chord.symbol;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs text-text-secondary">
          Tom de{' '}
          <strong className="text-text-primary">
            {key.tonic} {key.mode === 'major' ? 'maior' : 'menor'}
          </strong>
          {chord.symbol === '7' && ' — o acorde monta a chegada nesse tom'}
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {family.map((candidate) => (
            <button
              key={candidate.degree}
              type="button"
              onClick={() => onPick(candidate)}
              aria-label={`Montar ${candidate.root}${candidate.symbol}, grau ${candidate.degree}`}
              className={`flex flex-col items-center rounded-xl border px-3 py-1.5 transition-all duration-200 ${
                isCurrent(candidate)
                  ? 'border-accent bg-accent-dim'
                  : 'border-edge bg-surface hover:border-edge-strong'
              }`}
            >
              <span className="text-sm font-semibold text-text-primary">
                {candidate.root}
                {candidate.symbol}
              </span>
              <span className="text-[10px] text-text-secondary">{candidate.degree}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {progressions.map((progression) => (
          <div key={progression.name}>
            <p className="text-xs text-text-secondary">
              {progression.name} · {progression.degrees.join('–')}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {progression.chords.map((candidate, index) => (
                <span key={`${progression.name}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 && <span className="text-text-secondary">→</span>}
                  <button
                    type="button"
                    onClick={() => onPick(candidate)}
                    aria-label={`Montar ${candidate.root}${candidate.symbol} da progressão ${progression.name}`}
                    className={`rounded-lg border px-2.5 py-1 text-sm font-semibold transition-all duration-200 ${
                      isCurrent(candidate)
                        ? 'border-accent bg-accent-dim text-text-primary'
                        : 'border-edge bg-surface text-text-primary hover:border-edge-strong'
                    }`}
                  >
                    {candidate.root}
                    {candidate.symbol}
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
