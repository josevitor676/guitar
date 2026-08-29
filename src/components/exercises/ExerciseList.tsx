import { EXERCISE_CATALOG } from '../../domain/exercises/exercise-catalog';
import { useExerciseStore } from '../../state/exercise-store';

const CATEGORY_LABELS: Record<string, string> = {
  aquecimento: 'Aquecimento',
  digitacao: 'Digitação',
  escala: 'Escala',
  arpejo: 'Arpejo',
};

export function ExerciseList() {
  const activeExerciseId = useExerciseStore((state) => state.activeExerciseId);
  const selectExercise = useExerciseStore((state) => state.selectExercise);

  return (
    <ul className="flex flex-col gap-2">
      {EXERCISE_CATALOG.map((exercise) => (
        <li key={exercise.id}>
          <button
            type="button"
            onClick={() => selectExercise(exercise.id)}
            aria-pressed={exercise.id === activeExerciseId}
            className={[
              'w-full rounded border bg-card px-3 py-3 text-left transition-all duration-200',
              exercise.id === activeExerciseId ? 'border-white/30' : 'border-white/10 hover:border-white/20',
            ].join(' ')}
          >
            <span className="block text-xs uppercase tracking-wide text-text-secondary">
              {CATEGORY_LABELS[exercise.category]}
            </span>
            <span className="mt-1 block text-sm font-semibold text-text-primary">{exercise.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
