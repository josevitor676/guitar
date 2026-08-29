export type Subdivision = 'quarter' | 'eighth' | 'triplet' | 'sixteenth';

export const SUBDIVISION_DURATIONS: Record<Subdivision, string> = {
  quarter: '4n',
  eighth: '8n',
  triplet: '8t',
  sixteenth: '16n',
};
