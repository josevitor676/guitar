import { describe, it, expect } from 'vitest';
import { spell, accidentalFor, semitoneOfPitchClass, spellDegree } from './spelling';

describe('spell', () => {
  it('writes the black keys as sharps or as flats, as asked', () => {
    expect(spell(10, 'sharp')).toBe('A#');
    expect(spell(10, 'flat')).toBe('Bb');
  });

  it('writes the white keys the same either way', () => {
    for (const semitone of [0, 2, 4, 5, 7, 9, 11]) {
      expect(spell(semitone, 'sharp')).toBe(spell(semitone, 'flat'));
    }
  });

  it('wraps around the octave', () => {
    expect(spell(12, 'sharp')).toBe('C');
    expect(spell(-1, 'sharp')).toBe('B');
  });
});

describe('semitoneOfPitchClass', () => {
  it('reads a name written either way', () => {
    expect(semitoneOfPitchClass('A#')).toBe(10);
    expect(semitoneOfPitchClass('Bb')).toBe(10);
    expect(semitoneOfPitchClass('C')).toBe(0);
  });

  it('reads the spellings a twelve-name table has no room for', () => {
    expect(semitoneOfPitchClass('E#')).toBe(5);
    expect(semitoneOfPitchClass('Cb')).toBe(11);
    expect(semitoneOfPitchClass('Bbb')).toBe(9);
  });

  it('reports an unreadable name rather than pretending it is C', () => {
    expect(semitoneOfPitchClass('H')).toBe(-1);
    expect(semitoneOfPitchClass('')).toBe(-1);
    expect(semitoneOfPitchClass('C#m')).toBe(-1);
  });
});

describe('accidentalFor', () => {
  // The key signature decides: F major has one flat, so its fourth degree is
  // Bb. Writing A# there would use the letter A twice and skip B entirely.
  it('uses flats for the flat major keys', () => {
    for (const tonic of ['F', 'Bb', 'Eb', 'Ab', 'Db']) {
      expect(accidentalFor(semitoneOfPitchClass(tonic), 'major')).toBe('flat');
    }
  });

  it('uses sharps for the sharp major keys', () => {
    for (const tonic of ['G', 'D', 'A', 'E', 'B', 'F#']) {
      expect(accidentalFor(semitoneOfPitchClass(tonic), 'major')).toBe('sharp');
    }
  });

  it('treats C, which has neither, as sharp', () => {
    expect(accidentalFor(0, 'major')).toBe('sharp');
  });

  it('follows the minor keys own signatures', () => {
    expect(accidentalFor(semitoneOfPitchClass('D'), 'minor')).toBe('flat');
    expect(accidentalFor(semitoneOfPitchClass('G'), 'minor')).toBe('flat');
    expect(accidentalFor(semitoneOfPitchClass('A'), 'minor')).toBe('sharp');
    expect(accidentalFor(semitoneOfPitchClass('E'), 'minor')).toBe('sharp');
  });

  // Six of each: F# major is the guitarist's spelling, E flat minor the
  // conventional one, and neither follows from the other.
  it('breaks the six-and-six ties the way musicians write them', () => {
    expect(accidentalFor(semitoneOfPitchClass('F#'), 'major')).toBe('sharp');
    expect(accidentalFor(semitoneOfPitchClass('Eb'), 'minor')).toBe('flat');
  });
});

describe('spellDegree', () => {
  it('walks the alphabet, one letter per degree', () => {
    const F_MAJOR = [0, 2, 4, 5, 7, 9, 11];
    const names = F_MAJOR.map((step, degree) => spellDegree('F', degree, (5 + step) % 12));
    expect(names).toEqual(['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);
  });

  // The case a twelve-name table cannot express: F sharp major's seventh is
  // E sharp, which such a table would hand back as F, giving the key two Fs.
  it('writes E# where the key needs it, rather than a second F', () => {
    expect(spellDegree('F#', 6, 5)).toBe('E#');
  });

  it('writes Cb where a flat key needs it, rather than a second B', () => {
    expect(spellDegree('Gb', 3, 11)).toBe('Cb');
  });

  it('falls back to a plain sharp name for a tonic it cannot read', () => {
    expect(spellDegree('H', 0, 10)).toBe('A#');
  });
});
