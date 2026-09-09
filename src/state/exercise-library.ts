import type { UserExercise } from '../domain/exercises/exercise.types';
import type { FretPosition } from '../domain/music-theory/tuning';
import { SUBDIVISION_DURATIONS } from '../domain/music-theory/rhythm';

export const EXERCISES_STORAGE_KEY = 'guitar-teacher:exercises';

function isValidPosition(value: unknown): value is FretPosition {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.string === 'number' &&
    Number.isInteger(candidate.string) &&
    candidate.string >= 1 &&
    candidate.string <= 6 &&
    typeof candidate.fret === 'number' &&
    Number.isInteger(candidate.fret) &&
    candidate.fret >= 0
  );
}

function isValidUserExercise(value: unknown): value is UserExercise {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.trim().length > 0 &&
    typeof candidate.name === 'string' &&
    candidate.name.trim().length > 0 &&
    candidate.category === 'meu' &&
    typeof candidate.bpm === 'number' &&
    Number.isFinite(candidate.bpm) &&
    typeof candidate.subdivision === 'string' &&
    candidate.subdivision in SUBDIVISION_DURATIONS &&
    typeof candidate.createdAt === 'number' &&
    Number.isFinite(candidate.createdAt) &&
    Array.isArray(candidate.positions) &&
    candidate.positions.length > 0 &&
    candidate.positions.every(isValidPosition)
  );
}

/**
 * Reads the student's library, dropping any record that no longer validates.
 * One corrupt entry must not cost the student the rest of their exercises.
 */
export function loadUserExercises(): UserExercise[] {
  const raw = localStorage.getItem(EXERCISES_STORAGE_KEY);
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(isValidUserExercise);
}

export function saveUserExercises(exercises: UserExercise[]): void {
  localStorage.setItem(EXERCISES_STORAGE_KEY, JSON.stringify(exercises));
}
