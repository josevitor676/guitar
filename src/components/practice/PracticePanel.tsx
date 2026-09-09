import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Fretboard } from '../fretboard/Fretboard';
import { TimelineRoll } from '../fretboard/TimelineRoll';
import { FretRangeControl } from '../fretboard/FretRangeControl';
import { PulseIndicator } from '../metronome/PulseIndicator';
import { ControlBar } from '../player/ControlBar';
import { useFretboardSelection } from '../../hooks/useFretboardSelection';
import { useNotePlayback } from '../../hooks/useNotePlayback';
import { useMetronome } from '../../hooks/useMetronome';
import { useTimeline } from '../../hooks/useTimeline';
import { useUiStore } from '../../state/ui-store';
import type { FretboardView } from '../../state/ui-store';

const VIEW_LABELS: { id: FretboardView; label: string }[] = [
  { id: 'grid', label: 'Braço' },
  { id: 'timeline', label: 'Linha do tempo' },
];

export function PracticePanel() {
  const { minFret, maxFret, setFretRange } = useFretboardSelection();
  const { currentIndex } = useNotePlayback();
  const { isPlaying, currentPulse } = useMetronome();
  const timeline = useTimeline();
  const fretboardView = useUiStore((state) => state.fretboardView);
  const setFretboardView = useUiStore((state) => state.setFretboardView);

  const total = timeline.length;
  const played = currentIndex === null ? 0 : currentIndex + 1;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-surface p-1 text-xs font-medium">
          {VIEW_LABELS.map((view) => (
            <button
              key={view.id}
              type="button"
              aria-pressed={fretboardView === view.id}
              onClick={() => setFretboardView(view.id)}
              className={`rounded-full px-3 py-1 transition-all duration-200 ${
                fretboardView === view.id ? 'bg-accent text-body' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {fretboardView === 'grid' && (
            <FretRangeControl minFret={minFret} maxFret={maxFret} onChange={setFretRange} />
          )}
          <PulseIndicator currentPulse={currentPulse} isPlaying={isPlaying} />
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 text-xs text-text-secondary">
        <span className="whitespace-nowrap">
          {currentIndex === null ? `${total} notas` : `nota ${played} / ${total}`}
        </span>
        <ProgressBar value={played} max={total} label="Progresso da sequência" />
      </div>

      {fretboardView === 'grid' ? (
        <Fretboard currentIndex={currentIndex} />
      ) : (
        <TimelineRoll timeline={timeline} currentIndex={currentIndex} />
      )}

      <div className="mt-6">
        <ControlBar />
      </div>
    </Card>
  );
}
