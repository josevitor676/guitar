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
