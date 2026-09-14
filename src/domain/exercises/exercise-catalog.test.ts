import { describe, it, expect } from 'vitest';
import { EXERCISE_CATALOG } from './exercise-catalog';
import { isValidPosition } from '../fretboard/fretboard-model';

describe('EXERCISE_CATALOG', () => {
  it('has at least one exercise per required category', () => {
    const categories = new Set(EXERCISE_CATALOG.map((exercise) => exercise.category));
    expect(categories).toEqual(
      new Set(['aquecimento', 'digitacao', 'escala', 'arpejo', 'tecnica', 'repeticao']),
    );
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

  // The catalogue used to forbid fret zero, because the neck had no cell to
  // draw an open string in and the note would simply vanish. It has one now.
  it('never asks for a fret below the nut', () => {
    for (const exercise of EXERCISE_CATALOG) {
      expect(exercise.positions.every((position) => position.fret >= 0)).toBe(true);
    }
  });

  it('uses an open string somewhere, now that the neck can show one', () => {
    const openStrings = EXERCISE_CATALOG.filter((exercise) =>
      exercise.positions.some((position) => position.fret === 0),
    );

    expect(openStrings.length).toBeGreaterThan(0);
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

  describe('the repeated-note exercises', () => {
    const repeated = EXERCISE_CATALOG.filter((exercise) => exercise.category === 'repeticao');

    const keysOf = (exercise: (typeof EXERCISE_CATALOG)[number]) =>
      exercise.positions.map((position) => `${position.string}:${position.fret}`);

    function playsASpotMoreThanOnce(exercise: (typeof EXERCISE_CATALOG)[number]): boolean {
      const keys = keysOf(exercise);
      return new Set(keys).size < keys.length;
    }

    function playsASpotTwiceRunning(exercise: (typeof EXERCISE_CATALOG)[number]): boolean {
      const keys = keysOf(exercise);
      return keys.some((key, index) => index > 0 && keys[index - 1] === key);
    }

    it('offers several, since one example proves little', () => {
      expect(repeated.length).toBeGreaterThanOrEqual(6);
    });

    it('comes back to a spot it has already played, in every one of them', () => {
      for (const exercise of repeated) {
        expect(playsASpotMoreThanOnce(exercise)).toBe(true);
      }
    });

    // Two notes running on the same spot and the same spot revisited later are
    // different things to get wrong: the first is what a toggling neck erases
    // outright, the second is what sorting the sequence quietly collapses.
    it('covers the harder case too, the same spot struck twice running', () => {
      expect(repeated.filter(playsASpotTwiceRunning).length).toBeGreaterThanOrEqual(3);
    });

    it('explains each one, since a riff pattern is not self-evident from the frets', () => {
      for (const exercise of repeated) {
        expect(exercise.howTo).toBeTruthy();
      }
    });

    it('stays inside the twelve frets the neck shows by default', () => {
      for (const exercise of repeated) {
        for (const position of exercise.positions) {
          expect(position.fret).toBeLessThanOrEqual(12);
        }
      }
    });
  });
});
