import { describe, it, expect } from 'vitest';
import { EXERCISE_CATALOG } from './exercise-catalog';
import { isValidPosition } from '../fretboard/fretboard-model';

describe('EXERCISE_CATALOG', () => {
  it('has at least one exercise per required category', () => {
    const categories = new Set(EXERCISE_CATALOG.map((exercise) => exercise.category));
    expect(categories).toEqual(new Set(['aquecimento', 'digitacao', 'escala', 'arpejo']));
  });

  it('has unique ids', () => {
    const ids = EXERCISE_CATALOG.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has only structurally valid fret positions (any fret 0-24, any string 1-6)', () => {
    for (const exercise of EXERCISE_CATALOG) {
      for (const position of exercise.positions) {
        expect(isValidPosition(position, { minFret: 0, maxFret: 24 })).toBe(true);
      }
    }
  });

  it('has a non-empty positions sequence for every exercise', () => {
    for (const exercise of EXERCISE_CATALOG) {
      expect(exercise.positions.length).toBeGreaterThan(0);
    }
  });

  it('never includes fret 0 (open string) positions', () => {
    for (const exercise of EXERCISE_CATALOG) {
      expect(exercise.positions.every((position) => position.fret >= 1)).toBe(true);
    }
  });
});
