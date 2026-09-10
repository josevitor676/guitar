import { describe, it, expect } from 'vitest';
import { COLORS, FONT_STACK } from './tokens';

describe('COLORS', () => {
  it('uses neutral near-blacks, with the card lifted off the ground', () => {
    expect(COLORS.body).toBe('#121212');
    expect(COLORS.card).toBe('#1B1B1B');
    expect(COLORS.surface).toBe('#262626');
    // The card has to differ from the ground or it stops reading as a card.
    expect(COLORS.card).not.toBe(COLORS.body);
  });

  it('uses pale steel as the accent, with a darker press state and a dim halo', () => {
    expect(COLORS.accent).toBe('#D8DEE4');
    expect(COLORS['accent-soft']).toBe('#B9C2CB');
    expect(COLORS['accent-dim']).toBe('rgba(216, 222, 228, 0.13)');
  });

  it('keeps the accent distinct from plain text, so it still marks what matters', () => {
    expect(COLORS.accent).not.toBe(COLORS['text-primary']);
  });

  it('keeps a neutral secondary text colour', () => {
    expect(COLORS['text-primary']).toBe('#FAFAFA');
    expect(COLORS['text-secondary']).toBe('#8B9096');
  });
});

describe('FONT_STACK', () => {
  it('leads with Space Grotesk and falls back to the system face', () => {
    expect(FONT_STACK[0]).toBe('"Space Grotesk"');
    expect(FONT_STACK).toContain('system-ui');
  });
});
