import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { TimelineRoll } from '../fretboard/TimelineRoll';
import type { FretPosition } from '../../domain/music-theory/tuning';
import { STANDARD_TUNING } from '../../domain/music-theory/tuning';
import { getNoteAt } from '../../domain/music-theory/notes';
import { buildTimeline } from '../../domain/playback/timeline-model';
import { importTabFromFile } from '../../services/import-pipeline';
import type { ImportProgress } from '../../services/import-pipeline';
import { useFretboardStore } from '../../state/fretboard-store';
import { useExerciseStore } from '../../state/exercise-store';
import { useUiStore } from '../../state/ui-store';

type Stage =
  | { kind: 'idle' }
  | { kind: 'working'; progress: ImportProgress }
  | { kind: 'reviewing' }
  | { kind: 'failed'; message: string };

export function ImportPanel() {
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [positions, setPositions] = useState<FretPosition[]>([]);
  const [name, setName] = useState('');

  const loadSequence = useFretboardStore((state) => state.loadSequence);
  const saveCurrentSelection = useExerciseStore((state) => state.saveCurrentSelection);
  const setActiveTab = useUiStore((state) => state.setActiveTab);

  const applyPositions = (next: FretPosition[]) => {
    setPositions(next);
    loadSequence(next);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setStage({ kind: 'working', progress: { label: 'Preparando o arquivo', fraction: 0 } });

    try {
      const found = await importTabFromFile(file, (progress) => setStage({ kind: 'working', progress }));
      applyPositions(found);
      setStage({ kind: 'reviewing' });
    } catch (error) {
      setStage({ kind: 'failed', message: error instanceof Error ? error.message : String(error) });
    }
  };

  const save = () => {
    // saveCurrentSelection returns null for a blank name, and the panel stays
    // put so the student can name the exercise before leaving.
    if (saveCurrentSelection(name)) setActiveTab('exercises');
  };

  const noteCountLabel = `${positions.length} ${positions.length === 1 ? 'nota encontrada' : 'notas encontradas'}`;

  return (
    <Card>
      <label
        htmlFor="tab-file"
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 px-6 py-10 text-center transition-all duration-200 hover:border-accent"
      >
        <Upload className="h-6 w-6 text-text-secondary" />
        <span className="text-sm font-semibold text-text-primary">
          Solte aqui a tablatura, ou clique para escolher
        </span>
        <span className="text-xs text-text-secondary">
          Uma imagem ou PDF do exercício. A pauta é ignorada — o que vale é a tablatura.
        </span>
      </label>
      <input
        id="tab-file"
        type="file"
        accept="image/*,application/pdf"
        aria-label="Arquivo da tablatura"
        className="sr-only"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {stage.kind === 'working' && (
        <div className="mt-6 flex flex-col gap-2">
          <span className="text-xs text-text-secondary">{stage.progress.label}...</span>
          <ProgressBar
            value={Math.round(stage.progress.fraction * 100)}
            max={100}
            label="Progresso da importação"
          />
        </div>
      )}

      {stage.kind === 'failed' && (
        <p role="alert" className="mt-6 text-sm text-text-primary">
          {stage.message}
        </p>
      )}

      {stage.kind === 'reviewing' && (
        <div className="mt-6 flex flex-col gap-4">
          <p className="text-sm font-semibold text-text-primary">{noteCountLabel}</p>

          <TimelineRoll timeline={buildTimeline(positions, 'quarter', () => 'quarter')} currentIndex={null} />

          <ul className="flex flex-wrap gap-2">
            {positions.map((position, index) => (
              <li key={`${position.string}-${position.fret}-${index}`}>
                <span className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-surface px-3 py-1 text-xs text-text-primary">
                  {position.fret} · corda {position.string} ·{' '}
                  {getNoteAt(STANDARD_TUNING, position).pitchClass}
                  <button
                    type="button"
                    aria-label={`Remover nota ${index + 1}`}
                    onClick={() => applyPositions(positions.filter((_, i) => i !== index))}
                    className="text-text-secondary transition-all duration-200 hover:text-accent"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="imported-name" className="text-xs text-text-secondary">
              Nome do exercício
            </label>
            <input
              id="imported-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-full border border-white/[0.06] bg-surface px-3 py-1 text-sm text-text-primary outline-none transition-all duration-200 focus:border-accent"
            />
            <button
              type="button"
              onClick={save}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-body transition-all duration-200 hover:bg-accent-soft"
            >
              Salvar exercício
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
