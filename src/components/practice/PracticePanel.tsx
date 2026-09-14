import { useRef } from 'react';
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
import { beatHeadPositionKeys } from '../../domain/playback/timeline-model';
import { useResponsiveFretSpan } from '../../hooks/useResponsiveFretSpan';
import { useUiStore } from '../../state/ui-store';
import { usePlaybackStore } from '../../state/playback-store';
import { useFretboardStore } from '../../state/fretboard-store';
import { useSpeedTrainerStore } from '../../state/speed-trainer-store';
import { loopsRemaining } from '../../domain/practice/speed-trainer';
import { useExerciseStore } from '../../state/exercise-store';
import { EXERCISE_CATALOG } from '../../domain/exercises/exercise-catalog';
import type { FretboardView } from '../../state/ui-store';

const VIEW_LABELS: { id: FretboardView; label: string }[] = [
  { id: 'grid', label: 'Braço' },
  { id: 'timeline', label: 'Linha do tempo' },
];

export function PracticePanel() {
  const { minFret, maxFret, setFretRange } = useFretboardSelection();
  const { currentIndex } = useNotePlayback();
  const { isPlaying, currentPulse, enabled: metronomeArmed } = useMetronome();
  const sequenceRunning = usePlaybackStore((state) => state.isPlaying);
  const direction = usePlaybackStore((state) => state.direction);
  const removeAt = useFretboardStore((state) => state.removeAt);
  const training = useSpeedTrainerStore((state) => state.training);
  const session = useSpeedTrainerStore((state) => state.session);
  const lastResult = useSpeedTrainerStore((state) => state.lastResult);
  const timeline = useTimeline();
  const fretboardView = useUiStore((state) => state.fretboardView);
  const setFretboardView = useUiStore((state) => state.setFretboardView);

  // The neck's own box is what decides how many frets fit, not the viewport:
  // on the Exercícios tab the exercise list shares the row with it.
  const activeTab = useUiStore((state) => state.activeTab);
  const activeExerciseId = useExerciseStore((state) => state.activeExerciseId);
  // Free practice keeps whatever sequence was loaded, but the exercise's
  // instructions belong to the exercise, not to the neck.
  const howTo =
    activeTab === 'exercises'
      ? EXERCISE_CATALOG.find((exercise) => exercise.id === activeExerciseId)?.howTo
      : undefined;

  const neckRef = useRef<HTMLDivElement>(null);
  useResponsiveFretSpan(neckRef);

  // Only while the metronome is armed: outside that the marks would mean nothing.
  const beatHeadKeys = metronomeArmed ? beatHeadPositionKeys(timeline) : undefined;

  // A note can only be removed by its place in the roll, and that place is
  // the place in the sequence only while the roll shows the sequence as it
  // was built. Played backwards or as a round trip, the roll is a rendering
  // of the sequence rather than the sequence itself, and clicking note three
  // would delete some other note.
  const showsBuiltOrder = direction === 'sixthToFirst';
  const editable = fretboardView === 'timeline' && !sequenceRunning && showsBuiltOrder;

  const total = timeline.length;
  const played = currentIndex === null ? 0 : currentIndex + 1;

  return (
    <Card>
      <div
        data-testid="practice-toolbar"
        className="mb-2 flex flex-wrap items-center justify-between gap-x-5 gap-y-2"
      >
        <div className="flex items-center gap-1 rounded-full border border-edge bg-surface p-1 text-xs font-medium">
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

        {/*
          The transport belongs beside the view switch rather than under the
          neck: with the roll and the neck stacked, anything below them sat off
          the bottom of the screen, and starting playback meant scrolling away
          from the thing being played.
        */}
        <ControlBar />

        <div className="flex items-center gap-4">
          <FretRangeControl minFret={minFret} maxFret={maxFret} onChange={setFretRange} />
          <PulseIndicator currentPulse={currentPulse} isPlaying={isPlaying} />
        </div>
      </div>

      {howTo && (
        <p
          data-testid="exercise-how-to"
          className="mb-4 rounded-2xl border border-edge bg-body px-4 py-3 text-sm leading-relaxed text-text-secondary"
        >
          {howTo}
        </p>
      )}

      {/*
        While the tempo is climbing, how far through the passage the student is
        matters less than how many times round they still owe at this speed —
        so the loop count takes the line, and the tempo sits beside it because
        it is the number that keeps moving.
      */}
      <div className="mb-1 flex items-center gap-3 text-xs text-text-secondary">
        {session ? (
          <span data-testid="trainer-readout" className="whitespace-nowrap">
            {session.held
              ? `segurando em ${session.bpm} BPM`
              : `volta ${session.loopsDone + 1} de ${training.loopsPerStep} · ${session.bpm} BPM`}
          </span>
        ) : (
          <span className="whitespace-nowrap">
            {currentIndex === null ? `${total} notas` : `nota ${played} / ${total}`}
          </span>
        )}
        {session && !session.held ? (
          <ProgressBar
            value={training.loopsPerStep - loopsRemaining(session, training)}
            max={training.loopsPerStep}
            label="Voltas até o próximo andamento"
          />
        ) : (
          <ProgressBar value={played} max={total} label="Progresso da sequência" />
        )}
      </div>

      {lastResult && (
        <p
          data-testid="trainer-result"
          className="mb-2 rounded-2xl border border-accent/40 bg-accent-dim px-4 py-2 text-xs text-text-primary"
        >
          Chegou a <strong>{lastResult.bpm} BPM</strong>. Começou em {lastResult.startBpm}.
        </p>
      )}

      <div ref={neckRef}>
        {fretboardView === 'grid' ? (
          <Fretboard currentIndex={currentIndex} beatHeadKeys={beatHeadKeys} />
        ) : (
          <>
            {/*
              The roll has strings and time but no fret axis, so it cannot say
              which fret a new note is on. The neck does, and here a click adds
              rather than toggles: that is what lets a riff come back to the
              same spot. It comes first because it is where the student acts —
              the roll below it is the result.
            */}
            <Fretboard currentIndex={currentIndex} mode="append" beatHeadKeys={beatHeadKeys} />

            <p className="mt-1 mb-1 text-xs text-text-secondary">
              {editable
                ? 'Clique no braço para acrescentar a nota no fim da sequência — a mesma casa pode ser clicada quantas vezes quiser. Clique numa nota da linha do tempo para removê-la.'
                : sequenceRunning
                  ? 'Pare a sequência para editá-la.'
                  : 'Volte a direção para Descendo para editar a sequência — nas outras, o rolo mostra a sequência tocada, não a que você montou.'}
            </p>

            <TimelineRoll
              timeline={timeline}
              currentIndex={currentIndex}
              metronomeOn={metronomeArmed}
              onRemoveNote={editable ? removeAt : undefined}
            />
          </>
        )}
      </div>
    </Card>
  );
}
