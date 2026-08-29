export type StringNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface FretPosition {
  string: StringNumber;
  fret: number;
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
