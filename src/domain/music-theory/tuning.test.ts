import { describe, it, expect } from 'vitest';
import { STANDARD_TUNING } from './tuning';

describe('STANDARD_TUNING', () => {
  it('maps string 6 to low E2 and string 1 to high E4', () => {
    expect(STANDARD_TUNING[6]).toBe('E2');
    expect(STANDARD_TUNING[1]).toBe('E4');
  });

  it('defines all six strings in standard EADGBE tuning', () => {
    expect(STANDARD_TUNING).toEqual({
      6: 'E2',
      5: 'A2',
      4: 'D3',
      3: 'G3',
      2: 'B3',
      1: 'E4',
    });
  });
});
