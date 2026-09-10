export const COLORS = {
  body: '#121212',
  card: '#1B1B1B',
  surface: '#262626',
  // The accent is lighter than the ground rather than warmer than it, so the
  // press state has to go *down* in brightness where an orange one went down
  // in saturation.
  accent: '#D8DEE4',
  'accent-soft': '#B9C2CB',
  'accent-dim': 'rgba(216, 222, 228, 0.13)',
  'text-primary': '#FAFAFA',
  'text-secondary': '#8B9096',
} as const;

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
