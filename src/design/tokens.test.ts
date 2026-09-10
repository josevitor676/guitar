import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COLORS, COLOR_TOKENS, FONT_STACK } from './tokens';

// The stylesheet is the source of the theme values, so the test reads the real
// file rather than a copy of them that could drift. It cannot be imported:
// Vitest stubs CSS imports to an empty string unless CSS processing is on.
const stylesheet = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8');


function variablesIn(selector: string): Set<string> {
  const block = stylesheet.slice(stylesheet.indexOf(selector) + selector.length);
  const body = block.slice(0, block.indexOf('}'));
  return new Set([...body.matchAll(/--color-([a-z-]+):/g)].map((match) => match[1]));
}

describe('COLORS', () => {
  it('addresses every colour through a custom property, so a theme can swap it', () => {
    expect(COLORS.card).toBe('var(--color-card)');
    expect(COLORS['text-primary']).toBe('var(--color-text-primary)');
  });
});

describe('the themes', () => {
  it('defines every token in the dark theme, which is the default', () => {
    expect(variablesIn(':root {')).toEqual(new Set(COLOR_TOKENS));
  });

  // A token defined for one theme and forgotten in the other is the classic
  // theming bug: the app looks right until someone switches, and then one
  // colour is left behind from the theme they came from.
  it('defines every one of them again in the light theme', () => {
    expect(variablesIn(":root[data-theme='light'] {")).toEqual(new Set(COLOR_TOKENS));
  });

  it('leaves the app dark before any script has run', () => {
    expect(stylesheet.indexOf(':root {')).toBeLessThan(stylesheet.indexOf("[data-theme='light']"));
  });
});

describe('FONT_STACK', () => {
  it('leads with Space Grotesk and falls back to the system face', () => {
    expect(FONT_STACK[0]).toBe('"Space Grotesk"');
    expect(FONT_STACK).toContain('system-ui');
  });
});
