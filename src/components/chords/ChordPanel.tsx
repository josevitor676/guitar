import { useMemo } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { Card } from '../ui/Card';
import { IconButton } from '../ui/IconButton';
import { ChordNeck } from './ChordNeck';
import { ChordDiagram } from './ChordDiagram';
import { ChordProgressions } from './ChordProgressions';
import { STANDARD_TUNING } from '../../domain/music-theory/tuning';
import { identifyChord } from '../../domain/chords/chord-identification';
import { suggestVoicings } from '../../domain/chords/chord-voicing-generator';
import { voicingKey } from '../../domain/chords/chord-voicing';
import { fingerChord } from '../../domain/chords/chord-fingering';
import { useChordStore } from '../../state/chord-store';
import { useChordPlayback } from '../../hooks/useChordPlayback';

export function ChordPanel() {
  const voicing = useChordStore((state) => state.voicing);
  const toggleFret = useChordStore((state) => state.toggleFret);
  const setString = useChordStore((state) => state.setString);
  const loadVoicing = useChordStore((state) => state.loadVoicing);
  const clear = useChordStore((state) => state.clear);
  const { strum } = useChordPlayback();

  const chord = useMemo(() => identifyChord(voicing, STANDARD_TUNING), [voicing]);
  const suggestions = useMemo(
    () => (chord ? suggestVoicings({ root: chord.root, intervals: chord.intervals, tuning: STANDARD_TUNING }) : []),
    [chord],
  );

  const currentKey = voicingKey(voicing);
  const { barre } = useMemo(() => fingerChord(voicing), [voicing]);

  /** Builds a suggested chord on the neck by loading its plainest shape. */
  const buildChord = (root: string, intervals: number[]) => {
    const [best] = suggestVoicings({ root, intervals, tuning: STANDARD_TUNING, limit: 1 });
    if (best) loadVoicing(best);
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <Card className="lg:w-[640px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-secondary">Acorde montado</p>
            <p data-testid="chord-name" className="text-2xl font-bold text-accent">
              {chord?.displayName ?? '—'}
            </p>
            {chord?.isInversion && (
              <p className="text-xs text-text-secondary">
                Inversão de {chord.root}
                {chord.symbol}, com {chord.bass} no baixo
              </p>
            )}
            {barre && (
              <p data-testid="barre-hint" className="text-xs text-text-secondary">
                Pestana na casa {barre.fret}, com o indicador
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <IconButton label="Ouvir o acorde" variant="primary" onClick={() => void strum(voicing)}>
              <Play className="h-4 w-4" />
            </IconButton>
            <IconButton label="Limpar acorde" onClick={clear}>
              <RotateCcw className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        <ChordNeck
          voicing={voicing}
          onToggleFret={toggleFret}
          onToggleOpen={(string) => setString(string, voicing[string] === 0 ? 'muted' : 0)}
        />

        <p className="mt-3 text-xs text-text-secondary">
          Clique numa casa para pôr a nota naquela corda. O botão à esquerda alterna entre corda solta (○) e
          abafada (✕).
        </p>
      </Card>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Card>
          <p className="text-xs uppercase tracking-wide text-text-secondary">Outras formas de tocar</p>

          {!chord && (
            <p className="mt-4 text-sm text-text-secondary">
              Monte um acorde no braço e eu digo qual é, com outras posições para tocá-lo.
            </p>
          )}

          {chord && (
            <div className="subtle-scroll mt-4 grid max-h-[300px] grid-cols-2 gap-4 overflow-y-auto pr-1 sm:grid-cols-3">
              {suggestions.map((suggestion) => {
                const key = voicingKey(suggestion);
                const named = identifyChord(suggestion, STANDARD_TUNING);

                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={`Usar ${named?.displayName ?? chord.displayName} nesta posição`}
                    onClick={() => loadVoicing(suggestion)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all duration-200 ${
                      key === currentKey ? 'border-accent bg-accent-dim' : 'border-white/[0.06] hover:border-white/20'
                    }`}
                  >
                    <span className="text-sm font-semibold text-accent">{named?.displayName ?? chord.displayName}</span>
                    <ChordDiagram voicing={suggestion} />
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {chord && (
          <Card>
            <p className="mb-3 text-xs uppercase tracking-wide text-text-secondary">Vai bem com</p>
            <ChordProgressions chord={chord} onPick={(pick) => buildChord(pick.root, pick.intervals)} />
          </Card>
        )}
      </div>
    </div>
  );
}
