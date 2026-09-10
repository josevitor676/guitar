import { describe, it, expect } from 'vitest';
import { keyForChord, diatonicChords, progressionsFor } from './progressions';

describe('keyForChord', () => {
  it('reads a major chord as the home of its own key', () => {
    expect(keyForChord('G', '')).toEqual({ tonic: 'G', mode: 'major' });
  });

  it('reads a minor chord as the home of its minor key', () => {
    expect(keyForChord('A', 'm')).toEqual({ tonic: 'A', mode: 'minor' });
  });

  it('reads a dominant seventh as the V of the key it wants to resolve to', () => {
    // G7 is not the home of anything; it is the chord that wants to become C.
    expect(keyForChord('G', '7')).toEqual({ tonic: 'C', mode: 'major' });
    expect(keyForChord('E', '7')).toEqual({ tonic: 'A', mode: 'major' });
  });

  it('treats a major seventh as major and a minor seventh as minor', () => {
    expect(keyForChord('C', 'maj7')?.mode).toBe('major');
    expect(keyForChord('C', 'm7')?.mode).toBe('minor');
  });

  it('refuses to guess for chords that belong to no key firmly', () => {
    expect(keyForChord('B', 'dim')).toBeNull();
    expect(keyForChord('C', 'aug')).toBeNull();
  });
});

describe('diatonicChords', () => {
  it('builds the family of C major, which has no sharps', () => {
    const family = diatonicChords({ tonic: 'C', mode: 'major' });

    expect(family.map((chord) => `${chord.root}${chord.symbol}`)).toEqual([
      'C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim',
    ]);
  });

  it('builds the family of A minor, which is the same notes seen from A', () => {
    const family = diatonicChords({ tonic: 'A', mode: 'minor' });

    expect(family.map((chord) => `${chord.root}${chord.symbol}`)).toEqual([
      'Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G',
    ]);
  });

  it('labels the degrees the way harmony writes them', () => {
    expect(diatonicChords({ tonic: 'G', mode: 'major' }).map((c) => c.degree)).toEqual([
      'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°',
    ]);
  });
});

describe('progressionsFor', () => {
  it('writes the pop progression in the key it was asked for', () => {
    const pop = progressionsFor({ tonic: 'G', mode: 'major' }).find((p) => p.name === 'Pop');

    expect(pop?.chords.map((c) => `${c.root}${c.symbol}`)).toEqual(['G', 'D', 'Em', 'C']);
  });

  it('writes the jazz turnaround in the key it was asked for', () => {
    const jazz = progressionsFor({ tonic: 'C', mode: 'major' }).find((p) => p.name === 'Jazz');

    expect(jazz?.chords.map((c) => `${c.root}${c.symbol}`)).toEqual(['Dm', 'G', 'C']);
  });

  it('offers different progressions in a minor key', () => {
    const minor = progressionsFor({ tonic: 'A', mode: 'minor' });

    expect(minor.length).toBeGreaterThan(1);
    expect(minor.every((p) => p.chords.length === p.degrees.length)).toBe(true);
  });

  it('never leaves a degree it could not build', () => {
    for (const mode of ['major', 'minor'] as const) {
      for (const progression of progressionsFor({ tonic: 'D', mode })) {
        expect(progression.chords).toHaveLength(progression.degrees.length);
      }
    }
  });
});
