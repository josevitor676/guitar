import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { EXERCISE_CATALOG } from '../../domain/exercises/exercise-catalog';
import type { Exercise, UserExercise } from '../../domain/exercises/exercise.types';
import { useExerciseStore } from '../../state/exercise-store';

const CATEGORY_LABELS: Record<string, string> = {
  aquecimento: 'Aquecimento',
  repeticao: 'Notas repetidas',
  digitacao: 'Digitação',
  escala: 'Escala',
  arpejo: 'Arpejo',
  tecnica: 'Técnica',
  meu: 'Meu exercício',
};

interface ExerciseCardProps {
  exercise: Exercise;
  active: boolean;
  onSelect: () => void;
  meta?: string;
  onDelete?: () => void;
}

function ExerciseCard({ exercise, active, onSelect, meta, onDelete }: ExerciseCardProps) {
  // Deleting is destructive, so the button asks once before it acts.
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={[
          'w-full rounded-2xl border bg-card px-3 py-3 pr-10 text-left transition-all duration-200',
          active ? 'border-accent bg-accent-dim' : 'border-white/[0.06] hover:border-white/20',
        ].join(' ')}
      >
        <span className="block text-xs uppercase tracking-wide text-text-secondary">
          {CATEGORY_LABELS[exercise.category]}
        </span>
        <span className="mt-1 block text-sm font-semibold text-text-primary">{exercise.name}</span>
        {meta && <span className="mt-1 block text-xs text-text-secondary">{meta}</span>}
      </button>

      {onDelete && (
        <button
          type="button"
          aria-label={confirming ? `Confirmar remoção de ${exercise.name}` : `Remover ${exercise.name}`}
          title={confirming ? 'Confirmar remoção' : 'Remover'}
          onMouseLeave={() => setConfirming(false)}
          onClick={() => {
            if (confirming) {
              onDelete();
              setConfirming(false);
              return;
            }
            setConfirming(true);
          }}
          className={`absolute right-2 top-2 rounded-full px-2 py-1 text-xs transition-all duration-200 ${
            confirming ? 'bg-accent text-body' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {confirming ? 'Confirmar?' : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}

export function ExerciseList() {
  const activeExerciseId = useExerciseStore((state) => state.activeExerciseId);
  const selectExercise = useExerciseStore((state) => state.selectExercise);
  const userExercises = useExerciseStore((state) => state.userExercises);
  const deleteUserExercise = useExerciseStore((state) => state.deleteUserExercise);

  return (
    <div className="flex flex-col gap-6">
      {userExercises.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Meus exercícios
          </h3>
          <ul className="flex flex-col gap-2">
            {userExercises.map((exercise: UserExercise) => (
              <li key={exercise.id}>
                <ExerciseCard
                  exercise={exercise}
                  active={exercise.id === activeExerciseId}
                  onSelect={() => selectExercise(exercise.id)}
                  meta={`${exercise.positions.length} notas · ${exercise.bpm} BPM`}
                  onDelete={() => deleteUserExercise(exercise.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        {userExercises.length > 0 && (
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Catálogo</h3>
        )}
        <ul className="flex flex-col gap-2">
          {EXERCISE_CATALOG.map((exercise) => (
            <li key={exercise.id}>
              <ExerciseCard
                exercise={exercise}
                active={exercise.id === activeExerciseId}
                onSelect={() => selectExercise(exercise.id)}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
