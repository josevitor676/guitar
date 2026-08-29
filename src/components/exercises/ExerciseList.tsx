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
            className="w-full rounded bg-neutral-800 px-3 py-2 text-left text-neutral-200 hover:bg-neutral-700"
          >
            <span className="mr-2 text-xs uppercase text-neutral-500">
              {CATEGORY_LABELS[exercise.category]}
            </span>
            {exercise.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
