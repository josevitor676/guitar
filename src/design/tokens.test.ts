import { describe, it, expect } from 'vitest';
import { COLORS } from './tokens';

describe('COLORS', () => {
  it('uses the warm near-black backgrounds instead of the old neutral greys', () => {
    expect(COLORS.body).toBe('#0E0C0B');
    expect(COLORS.card).toBe('#17130F');
    expect(COLORS.surface).toBe('#241D18');
  });

  it('uses orange as the accent, with a softer press state and a dim halo', () => {
    expect(COLORS.accent).toBe('#FF7A18');
    expect(COLORS['accent-soft']).toBe('#C25A20');
    expect(COLORS['accent-dim']).toBe('rgba(255, 122, 24, 0.16)');
  });

  it('keeps warm text colors', () => {
    expect(COLORS['text-primary']).toBe('#FAFAFA');
    expect(COLORS['text-secondary']).toBe('#A6968B');
  });
});
