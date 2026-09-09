import { describe, it, expect } from 'vitest';
import { invertArticulation, ARTICULATION_SHORT_LABEL } from './articulation';

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
});

describe('ARTICULATION_SHORT_LABEL', () => {
  it('uses the letters tablature already prints', () => {
    expect(ARTICULATION_SHORT_LABEL.hammerOn).toBe('h');
    expect(ARTICULATION_SHORT_LABEL.pullOff).toBe('p');
  });
});
