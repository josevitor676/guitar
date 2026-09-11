import { describe, it, expect } from 'vitest';
import { identifyChord } from './chord-identification';
import { STANDARD_TUNING } from '../music-theory/tuning';
import type { ChordVoicing } from './chord-voicing';

/** Written low string to high, as tablature and chord boxes are read. */
function voicing(six: number | 'x', five: number | 'x', four: number | 'x', three: number | 'x', two: number | 'x', one: number | 'x'): ChordVoicing {
  const at = (v: number | 'x') => (v === 'x' ? ('muted' as const) : v);
  return { 6: at(six), 5: at(five), 4: at(four), 3: at(three), 2: at(two), 1: at(one) };
}

const name = (v: ChordVoicing) => identifyChord(v, STANDARD_TUNING)?.displayName ?? null;

describe('identifyChord', () => {
  it('reads the open shapes every player learns first', () => {
    expect(name(voicing(3, 2, 0, 0, 0, 3))).toBe('G');
    expect(name(voicing('x', 3, 2, 0, 1, 0))).toBe('C');
    expect(name(voicing('x', 'x', 0, 2, 3, 2))).toBe('D');
    expect(name(voicing(0, 2, 2, 1, 0, 0))).toBe('E');
    expect(name(voicing('x', 0, 2, 2, 2, 0))).toBe('A');
  });

  it('tells minor from major', () => {
    expect(name(voicing(0, 2, 2, 0, 0, 0))).toBe('Em');
    expect(name(voicing('x', 0, 2, 2, 1, 0))).toBe('Am');
  });

  it('reads sevenths', () => {
    expect(name(voicing(3, 2, 0, 0, 0, 1))).toBe('G7');
    expect(name(voicing('x', 0, 2, 0, 2, 0))).toBe('A7');
    expect(name(voicing('x', 0, 2, 0, 1, 0))).toBe('Am7');
  });

  it('reads a barre shape up the neck', () => {
    expect(name(voicing(5, 7, 7, 6, 5, 5))).toBe('A');
  });

  it('names an inversion by its bass note', () => {
    // A G chord whose lowest sounding note is B.
    expect(name(voicing('x', 'x', 0, 0, 0, 3))).toBe('G/D');
  });

  it('reads suspended chords rather than forcing a third', () => {
    // Dsus4 is the D shape with the third replaced by G on the top string.
    expect(name(voicing('x', 'x', 0, 2, 3, 3))).toBe('Dsus4');
    expect(name(voicing('x', 'x', 0, 2, 3, 0))).toBe('Dsus2');
    expect(name(voicing('x', 'x', 0, 2, 3, 2))).toBe('D');
  });

  it('reads a power chord as a fifth, with no third to call it major or minor', () => {
    expect(name(voicing(3, 5, 5, 'x', 'x', 'x'))).toBe('G5');
  });

  it('ignores muted strings entirely', () => {
    expect(name(voicing('x', 3, 2, 0, 1, 0))).toBe('C');
    expect(name(voicing('x', 3, 2, 0, 1, 'x'))).toBe('C');
  });

  it('finds nothing on an empty neck', () => {
    expect(name(voicing('x', 'x', 'x', 'x', 'x', 'x'))).toBeNull();
  });

  it('finds nothing in a single note', () => {
    expect(name(voicing(3, 'x', 'x', 'x', 'x', 'x'))).toBeNull();
  });

  it('lets the bass decide between two true readings of the same notes', () => {
    // A-C-E-G is both Am7 and C6; over an A in the bass it is an Am7.
    expect(name(voicing('x', 0, 2, 0, 1, 0))).toBe('Am7');
  });

  it('reports the root and the bass separately for an inversion', () => {
    const chord = identifyChord(voicing('x', 'x', 0, 0, 0, 3), STANDARD_TUNING);

    expect(chord?.root).toBe('G');
    expect(chord?.bass).toBe('D');
    expect(chord?.isInversion).toBe(true);
  });

  it('is not an inversion when the root is in the bass', () => {
    expect(identifyChord(voicing(3, 2, 0, 0, 0, 3), STANDARD_TUNING)?.isInversion).toBe(false);
  });

  describe('how the name is spelled', () => {
    // The B flat major triad: Bb-D-F. Calling it A# would use the letter A
    // twice over and skip B, and no piece of music writes it that way.
    it('writes a flat-key chord with a flat', () => {
      const voicing = { 6: 'muted', 5: 1, 4: 3, 3: 3, 2: 3, 1: 1 } as const;
      expect(identifyChord(voicing, STANDARD_TUNING)?.root).toBe('Bb');
    });

    it('writes a sharp-key chord with a sharp', () => {
      // F# major: F#-A#-C#.
      const voicing = { 6: 2, 5: 4, 4: 4, 3: 3, 2: 2, 1: 2 } as const;
      expect(identifyChord(voicing, STANDARD_TUNING)?.root).toBe('F#');
    });

    it('spells the bass of an inversion the same way as the chord', () => {
      // Eb major over G: an E flat chord, so the bass is written Bb-side too.
      const voicing = { 6: 'muted', 5: 6, 4: 5, 3: 3, 2: 4, 1: 'muted' } as const;
      const chord = identifyChord(voicing, STANDARD_TUNING);
      expect(chord?.root).toBe('Eb');
      expect(chord?.displayName).not.toMatch(/#/);
    });
  });
});
