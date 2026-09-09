import { describe, it, expect } from 'vitest';
import {
  invertArticulation,
  ARTICULATION_SHORT_LABEL,
  isGliding,
  glideSecondsFor,
} from './articulation';

describe('invertArticulation', () => {
  it('turns a hammer-on into the pull-off it becomes when played backwards', () => {
    expect(invertArticulation('hammerOn')).toBe('pullOff');
  });

  it('turns a pull-off back into a hammer-on', () => {
    expect(invertArticulation('pullOff')).toBe('hammerOn');
  });

  it('is its own inverse', () => {
    expect(invertArticulation(invertArticulation('hammerOn'))).toBe('hammerOn');
  });

  it('leaves a slide and a bend alone, since their direction comes from the pitches', () => {
    expect(invertArticulation('slide')).toBe('slide');
    expect(invertArticulation('bend')).toBe('bend');
  });
});

describe('ARTICULATION_SHORT_LABEL', () => {
  it('uses the letters tablature already prints', () => {
    expect(ARTICULATION_SHORT_LABEL.hammerOn).toBe('h');
    expect(ARTICULATION_SHORT_LABEL.pullOff).toBe('p');
  });
});

describe('isGliding', () => {
  it('is true for the articulations that move the pitch', () => {
    expect(isGliding('slide')).toBe(true);
    expect(isGliding('bend')).toBe(true);
  });

  it('is false for the ones that strike the string', () => {
    expect(isGliding('hammerOn')).toBe(false);
    expect(isGliding('pullOff')).toBe(false);
  });
});

describe('glideSecondsFor', () => {
  it('gives a bend most of the note, because it is an expressive movement', () => {
    expect(glideSecondsFor('bend', 1)).toBeCloseTo(0.55, 5);
  });

  it('makes a slide fast, and never slower than a short hand movement', () => {
    expect(glideSecondsFor('slide', 1)).toBeCloseTo(0.09, 5);
  });

  it('shortens the slide further when the note itself is very short', () => {
    expect(glideSecondsFor('slide', 0.1)).toBeCloseTo(0.035, 5);
  });

  it('is instant for anything that is struck rather than glided', () => {
    expect(glideSecondsFor('hammerOn', 1)).toBe(0);
    expect(glideSecondsFor('pullOff', 1)).toBe(0);
  });
});
