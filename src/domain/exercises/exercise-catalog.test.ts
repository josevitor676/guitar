import { describe, it, expect } from 'vitest';
import { EXERCISE_CATALOG } from './exercise-catalog';
import { isValidPosition } from '../fretboard/fretboard-model';

describe('EXERCISE_CATALOG', () => {
  it('has at least one exercise per required category', () => {
    const categories = new Set(EXERCISE_CATALOG.map((exercise) => exercise.category));
    expect(categories).toEqual(new Set(['aquecimento', 'digitacao', 'escala', 'arpejo', 'tecnica']));
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

  it('covers each technique with an exercise of its own', () => {
    const byArticulation = new Set(
      EXERCISE_CATALOG.flatMap((exercise) =>
        exercise.positions.map((position) => position.articulation).filter(Boolean),
      ),
    );

    expect(byArticulation).toEqual(new Set(['hammerOn', 'pullOff', 'slide', 'bend']));
  });

  it('never opens a technique exercise on the articulated note, which has nothing to come from', () => {
    for (const exercise of EXERCISE_CATALOG) {
      expect(exercise.positions[0].articulation).toBeUndefined();
    }
  });

  it('keeps every slur on the same string as the note it is reached from', () => {
    for (const exercise of EXERCISE_CATALOG) {
      exercise.positions.forEach((position, index) => {
        if (!position.articulation) return;
        expect(position.string).toBe(exercise.positions[index - 1].string);
      });
    }
  });
});
