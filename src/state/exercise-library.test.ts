import { describe, it, expect, beforeEach } from 'vitest';
import { loadUserExercises, saveUserExercises, EXERCISES_STORAGE_KEY } from './exercise-library';
import type { UserExercise } from '../domain/exercises/exercise.types';

function makeExercise(overrides: Partial<UserExercise> = {}): UserExercise {
  return {
    id: 'user-1',
    name: 'Minha escala',
    category: 'meu',
    bpm: 90,
    subdivision: 'eighth',
    createdAt: 1_700_000_000_000,
    positions: [
      { string: 6, fret: 3 },
      { string: 5, fret: 5 },
    ],
    ...overrides,
  };
}

describe('exercise-library', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty library before anything is saved', () => {
    expect(loadUserExercises()).toEqual([]);
  });

  it('round-trips a saved exercise through localStorage', () => {
    const exercise = makeExercise();
    saveUserExercises([exercise]);
    expect(loadUserExercises()).toEqual([exercise]);
  });

  it('returns an empty library when the stored JSON is unreadable', () => {
    localStorage.setItem(EXERCISES_STORAGE_KEY, '{not json');
    expect(loadUserExercises()).toEqual([]);
  });

  it('returns an empty library when the stored root is not an array', () => {
    localStorage.setItem(EXERCISES_STORAGE_KEY, JSON.stringify({ id: 'user-1' }));
    expect(loadUserExercises()).toEqual([]);
  });

  it('drops a single corrupt record instead of the whole library', () => {
    const good = makeExercise({ id: 'user-good' });
    localStorage.setItem(EXERCISES_STORAGE_KEY, JSON.stringify([good, { id: 'user-bad' }]));

    expect(loadUserExercises()).toEqual([good]);
  });

  it('rejects an exercise with no positions', () => {
    saveUserExercises([makeExercise({ positions: [] })]);
    expect(loadUserExercises()).toEqual([]);
  });

  it('rejects positions outside the six strings', () => {
    saveUserExercises([makeExercise({ positions: [{ string: 9 as never, fret: 3 }] })]);
    expect(loadUserExercises()).toEqual([]);
  });

  it('rejects a negative fret', () => {
    saveUserExercises([makeExercise({ positions: [{ string: 6, fret: -1 }] })]);
    expect(loadUserExercises()).toEqual([]);
  });

  it('rejects an unknown rhythm figure', () => {
    saveUserExercises([makeExercise({ subdivision: 'whole' as never })]);
    expect(loadUserExercises()).toEqual([]);
  });

  it('rejects a blank name', () => {
    saveUserExercises([makeExercise({ name: '   ' })]);
    expect(loadUserExercises()).toEqual([]);
  });
});
