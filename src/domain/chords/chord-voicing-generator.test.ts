import { describe, it, expect } from 'vitest';
import { suggestVoicings } from './chord-voicing-generator';
import { identifyChord } from './chord-identification';
import { fingerChord } from './chord-fingering';
import { voicingSpan, voicingKey, ALL_STRINGS, isSounding, lowestFret } from './chord-voicing';
import { STANDARD_TUNING } from '../music-theory/tuning';

const majorOf = (root: string) => suggestVoicings({ root, intervals: [0, 4, 7], tuning: STANDARD_TUNING });

describe('suggestVoicings', () => {
  it('finds ways to play a major chord', () => {
    expect(majorOf('G').length).toBeGreaterThan(4);
  });

  it('only suggests shapes that really are the chord', () => {
    for (const voicing of majorOf('G')) {
      expect(identifyChord(voicing, STANDARD_TUNING)?.root).toBe('G');
    }
  });

  it('never asks the hand to span more than four frets', () => {
    for (const voicing of majorOf('C')) {
      expect(voicingSpan(voicing)).toBeLessThanOrEqual(3);
    }
  });

  it('suggests no shape twice', () => {
    const keys = majorOf('A').map(voicingKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('offers the root in the bass before the inversions', () => {
    const [first] = majorOf('E');
    const lowest = ALL_STRINGS.find((string) => isSounding(first[string]))!;

    expect(identifyChord(first, STANDARD_TUNING)?.isInversion).toBe(false);
    expect(lowest).toBe(6);
  });

  it('finds the open shape for a chord that has one', () => {
    const keys = majorOf('E').map(voicingKey);
    // The open E: every string sounding, 0-2-2-1-0-0 read from the sixth.
    expect(keys).toContain('0,2,2,1,0,0');
  });

  it('sounds at least four strings, since a chord is not two notes', () => {
    for (const voicing of majorOf('D')) {
      const sounding = ALL_STRINGS.filter((string) => isSounding(voicing[string]));
      expect(sounding.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('handles minor and seventh chords too', () => {
    expect(suggestVoicings({ root: 'A', intervals: [0, 3, 7], tuning: STANDARD_TUNING }).length).toBeGreaterThan(3);
    expect(suggestVoicings({ root: 'D', intervals: [0, 4, 7, 10], tuning: STANDARD_TUNING }).length).toBeGreaterThan(3);
  });

  it('returns nothing for a root that is not a note', () => {
    expect(suggestVoicings({ root: 'H', intervals: [0, 4, 7], tuning: STANDARD_TUNING })).toEqual([]);
  });

  it('respects the limit it is given', () => {
    expect(suggestVoicings({ root: 'G', intervals: [0, 4, 7], tuning: STANDARD_TUNING, limit: 5 })).toHaveLength(5);
  });

  it('never lists a reduction of another shape that gains the player nothing', () => {
    const shapes = majorOf('G');
    const bassOf = (voicing: (typeof shapes)[number]) =>
      ALL_STRINGS.find((string) => isSounding(voicing[string]));

    for (const candidate of shapes) {
      for (const other of shapes) {
        if (candidate === other) continue;

        const sameWhereBothSound = ALL_STRINGS.every((string) => {
          const a = candidate[string];
          const b = other[string];
          return !isSounding(a) || (isSounding(b) && a === b);
        });
        const otherSoundsMore = ALL_STRINGS.some(
          (string) => !isSounding(candidate[string]) && isSounding(other[string]),
        );
        if (!sameWhereBothSound || !otherSoundsMore) continue;

        // Dropping strings is allowed to earn a place, but only by changing the
        // bass — and so the chord — or by making the grip genuinely easier.
        const changesTheBass = bassOf(candidate) !== bassOf(other);
        const narrowerBar =
          (fingerChord(other).barre ? 1 : 0) - (fingerChord(candidate).barre ? 1 : 0) > 0;
        const fewerFingers =
          new Set(fingerChord(other).fingers.map((f) => f.finger)).size -
            new Set(fingerChord(candidate).fingers.map((f) => f.finger)).size >=
          1;

        expect(changesTheBass || narrowerBar || fewerFingers).toBe(true);
      }
    }
  });

  it('walks the neck instead of piling up at the first position', () => {
    const positions = new Set(majorOf('G').map((v) => lowestFret(v) ?? 0));

    // The reference this was compared against spreads shapes right up the neck.
    expect(positions.size).toBeGreaterThanOrEqual(5);
  });

  it('still offers the easiest shapes first', () => {
    const [first] = majorOf('G');
    expect(lowestFret(first) ?? 0).toBeLessThanOrEqual(3);
  });

  it('never rings an open string in a shape held up the neck', () => {
    // Fret 15 with three strings ringing open is a G, and it is not a G shape.
    for (const voicing of majorOf('G')) {
      const position = lowestFret(voicing) ?? 0;
      if (position <= 4) continue;

      const hasOpen = ALL_STRINGS.some((string) => voicing[string] === 0);
      expect(hasOpen).toBe(false);
    }
  });

  it('offers the barre shapes a player actually uses', () => {
    const keys = majorOf('G').map(voicingKey);

    // The E-shape barre at the third fret, and the A-shape at the tenth.
    expect(keys).toContain('3,5,5,4,3,3');
    expect(keys.some((key) => key.startsWith('10,10,12,12,12,10'))).toBe(true);
  });

  it('offers the smaller grips beside the barres, not only the six-string ones', () => {
    const keys = majorOf('G').map(voicingKey);

    // Four strings at the third position, and four at the fifth: the shapes a
    // student reaches for long before they can hold a full barre.
    expect(keys).toContain('muted,muted,5,4,3,3');
    expect(keys).toContain('muted,muted,5,7,8,7');
  });

  it('never hides a chord behind its own inversion', () => {
    // x-x-5-4-3-3 has G in the bass; x-5-5-4-3-3 has D. Muting the bass string
    // makes a different chord, so neither can stand in for the other.
    const shapes = majorOf('G');
    const rootPosition = shapes.find((voicing) => voicingKey(voicing) === 'muted,muted,5,4,3,3');

    expect(rootPosition).toBeDefined();
    expect(identifyChord(rootPosition!, STANDARD_TUNING)?.isInversion).toBe(false);
  });

  it('still puts the open shape first, which is the one everybody learns', () => {
    expect(voicingKey(majorOf('G')[0])).toBe('3,2,0,0,0,3');
  });
});
