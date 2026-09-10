import { useSpeedTrainerStore } from '../../state/speed-trainer-store';
import { useExerciseStore } from '../../state/exercise-store';
import { isValidTraining } from '../../domain/practice/speed-trainer';
import type { Training } from '../../domain/practice/speed-trainer';

interface NumberFieldProps {
  label: string;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}

function NumberField({ label, value, suffix, onChange }: NumberFieldProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-text-secondary">
      {label}
      <input
        type="number"
        aria-label={label}
        value={value}
        min={1}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-20 rounded-full border border-edge bg-surface px-3 py-1.5 text-center text-sm text-text-primary tabular-nums"
      />
      {suffix}
    </label>
  );
}

/**
 * The climb, in the order it is spoken: start here, go up by this much, every
 * so many times round, until here.
 */
export function SpeedTrainerSettings() {
  const training = useSpeedTrainerStore((state) => state.training);
  const setTraining = useSpeedTrainerStore((state) => state.setTraining);
  const session = useSpeedTrainerStore((state) => state.session);
  const activeExerciseId = useExerciseStore((state) => state.activeExerciseId);
  const record = useSpeedTrainerStore((state) =>
    activeExerciseId ? state.records[activeExerciseId] : undefined,
  );

  const change = (patch: Partial<Training>) => setTraining({ ...training, ...patch });
  const impossible = !isValidTraining(training);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <NumberField label="Começar em" value={training.startBpm} suffix="BPM"
        onChange={(startBpm) => change({ startBpm })} />
      <NumberField label="Subir" value={training.stepBpm} suffix="BPM"
        onChange={(stepBpm) => change({ stepBpm })} />
      <NumberField label="A cada" value={training.loopsPerStep} suffix="voltas"
        onChange={(loopsPerStep) => change({ loopsPerStep })} />
      <NumberField label="Até" value={training.targetBpm} suffix="BPM"
        onChange={(targetBpm) => change({ targetBpm })} />

      {/*
        The record is offered rather than applied: starting again from where
        you got to last time is usually right, but not after a week off, and
        the app is in no position to know which.
      */}
      {record !== undefined && (
        <span className="flex items-center gap-2 text-sm text-text-secondary">
          Seu recorde: <strong className="text-text-primary tabular-nums">{record} BPM</strong>
          {training.startBpm !== record && (
            <button
              type="button"
              onClick={() =>
                setTraining({
                  ...training,
                  startBpm: record,
                  targetBpm: Math.max(training.targetBpm, record),
                })
              }
              className="rounded-full border border-edge bg-surface px-3 py-1 text-text-primary transition-all duration-200 hover:border-accent hover:text-accent"
            >
              Começar dele
            </button>
          )}
        </span>
      )}

      {impossible && (
        <p className="text-xs text-accent">
          O destino precisa ser igual ou maior que o começo, e os passos maiores que zero.
        </p>
      )}

      {session && !session.finished && !session.held && (
        <button
          type="button"
          onClick={() => useSpeedTrainerStore.getState().hold()}
          className="rounded-full border border-edge bg-surface px-3 py-1 text-xs text-text-primary transition-all duration-200 hover:border-accent hover:text-accent"
        >
          Segurar aqui
        </button>
      )}
    </div>
  );
}
