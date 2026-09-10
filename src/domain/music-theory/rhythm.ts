export type Subdivision = 'quarter' | 'eighth' | 'triplet' | 'sixteenth';

export const SUBDIVISION_DURATIONS: Record<Subdivision, string> = {
  quarter: '4n',
  eighth: '8n',
  triplet: '8t',
  sixteenth: '16n',
};

export const SUBDIVISION_BEATS: Record<Subdivision, number> = {
  quarter: 1,
  eighth: 0.5,
  triplet: 1 / 3,
  sixteenth: 0.25,
};

/**
 * What each figure is called in Portuguese. It lives here rather than in the
 * metronome's dropdown because the exported sheet prints the same word, and a
 * sheet that disagreed with the screen about the figure would be worse than
 * one that named no figure at all.
 */
export const SUBDIVISION_LABELS: Record<Subdivision, string> = {
  quarter: 'Semínima',
  eighth: 'Colcheia',
  triplet: 'Tercina',
  sixteenth: 'Semicolcheia',
};
