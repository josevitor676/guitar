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
              'w-full rounded border px-3 py-2 text-left font-medium tracking-wide transition-all duration-200',
              exercise.id === activeExerciseId
                ? 'border-amber-400/50 bg-zinc-800 text-zinc-100'
                : 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800',
            ].join(' ')}
          >
            <span className="mr-2 text-xs uppercase text-zinc-500">{CATEGORY_LABELS[exercise.category]}</span>
            {exercise.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
