import type { Articulation } from './articulation';

export type StringNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface FretPosition {
  string: StringNumber;
  fret: number;
  /**
   * How this note is reached from the one before it in a sequence. Only
   * meaningful inside an ordered sequence — a position produced outside one,
   * such as by the scale generator, simply leaves it unset. Comparisons ignore
   * it: two positions are equal when they name the same string and fret.
   */
  articulation?: Articulation;
}

export type Tuning = Record<StringNumber, string>;

export const STANDARD_TUNING: Tuning = {
  6: 'E2',
  5: 'A2',
  4: 'D3',
  3: 'G3',
  2: 'B3',
  1: 'E4',
};
