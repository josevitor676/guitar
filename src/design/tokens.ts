/**
 * The names every colour in the app is addressed by.
 *
 * The values live in `index.css`, because a theme is a set of values swapped
 * behind one set of names, and CSS is where that swap happens — the class
 * `bg-card` has to keep meaning "the card colour" whichever theme is on.
 * Tailwind therefore compiles to a custom property, and the property is what
 * changes.
 */
export const COLOR_TOKENS = [
  'body',
  'card',
  'surface',
  'accent',
  'accent-soft',
  'accent-dim',
  'text-primary',
  'text-secondary',
  /** Hairline borders: the edge of a card, a chip, a fret. */
  'edge',
  /** A faint fill: inlay dots, string lines. */
  'edge-soft',
  /** A border meant to be seen: a hovered cell, a bar line. */
  'edge-strong',
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

export const COLORS = Object.fromEntries(
  COLOR_TOKENS.map((token) => [token, `var(--color-${token})`]),
) as Record<ColorToken, string>;

/**
 * Space Grotesk carries the interface, and its digits are why: fret numbers,
 * BPM and bar counts sit in columns, and its figures are fixed-width with a
 * slashed zero. The system stack stays behind it so nothing breaks while the
 * font is still loading, or if it never arrives.
 */
export const FONT_STACK = [
  '"Space Grotesk"',
  'ui-sans-serif',
  'system-ui',
  '-apple-system',
  '"Segoe UI"',
  'Roboto',
  'sans-serif',
];
