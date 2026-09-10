import { describe, it, expect } from 'vitest';
import { fingerChord } from './chord-fingering';
import type { ChordVoicing } from './chord-voicing';

function voicing(six: number | 'x', five: number | 'x', four: number | 'x', three: number | 'x', two: number | 'x', one: number | 'x'): ChordVoicing {
  const at = (v: number | 'x') => (v === 'x' ? ('muted' as const) : v);
  return { 6: at(six), 5: at(five), 4: at(four), 3: at(three), 2: at(two), 1: at(one) };
}

const fingersOf = (v: ChordVoicing) =>
  Object.fromEntries(fingerChord(v).fingers.map((f) => [`${f.string}:${f.fret}`, f.finger]));

describe('fingerChord', () => {
  it('fingers the open C the way it is taught', () => {
    // Index on the B string, middle on the D string, ring on the A string.
    expect(fingersOf(voicing('x', 3, 2, 0, 1, 0))).toEqual({ '2:1': 1, '4:2': 2, '5:3': 3 });
  });

  it('fingers the open E the way it is taught', () => {
    expect(fingersOf(voicing(0, 2, 2, 1, 0, 0))).toEqual({ '3:1': 1, '5:2': 2, '4:2': 3 });
  });

  it('fingers the open G the way it is taught', () => {
    expect(fingersOf(voicing(3, 2, 0, 0, 0, 3))).toEqual({ '5:2': 1, '6:3': 2, '1:3': 3 });
  });

  it('gives open and muted strings no finger at all', () => {
    const fingered = fingerChord(voicing('x', 3, 2, 0, 1, 0));

    expect(fingered.fingers.map((f) => f.string)).not.toContain(3);
    expect(fingered.fingers.map((f) => f.string)).not.toContain(6);
  });

  it('finds the barre in an F shape and gives it the index finger', () => {
    const fingered = fingerChord(voicing(1, 3, 3, 2, 1, 1));

    expect(fingered.barre).toEqual({ fret: 1, fromString: 6, toString: 1, finger: 1 });
  });

  it('fingers the notes above an F barre with the remaining fingers', () => {
    expect(fingersOf(voicing(1, 3, 3, 2, 1, 1))).toMatchObject({ '3:2': 2, '5:3': 3, '4:3': 4 });
  });

  it('finds no barre when the lowest fret touches only one string', () => {
    expect(fingerChord(voicing('x', 3, 2, 0, 1, 0)).barre).toBeNull();
  });

  it('finds no barre when nothing is fretted above the lowest fret', () => {
    // A shape held flat across one fret is a barre in the hand, but there is
    // nothing above it, so the whole shape is that one finger and drawing a
    // separate bar would say nothing extra.
    expect(fingerChord(voicing(5, 5, 5, 5, 5, 5)).barre).not.toBeNull();
  });

  it('leaves a shape with no fretted notes unfingered', () => {
    const fingered = fingerChord(voicing(0, 0, 0, 0, 0, 0));

    expect(fingered.fingers).toEqual([]);
    expect(fingered.barre).toBeNull();
  });

  it('never asks for a fifth finger', () => {
    for (const shape of [voicing(1, 3, 3, 2, 1, 1), voicing(3, 2, 0, 0, 0, 3), voicing(5, 7, 7, 6, 5, 5)]) {
      for (const { finger } of fingerChord(shape).fingers) {
        expect(finger).toBeGreaterThanOrEqual(1);
        expect(finger).toBeLessThanOrEqual(4);
      }
    }
  });
});
