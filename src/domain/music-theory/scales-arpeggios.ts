import type { FretPosition, Tuning, StringNumber } from './tuning';
import { getNoteAt, noteNameToMidi } from './notes';

export const SCALE_PATTERNS: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
};

export const ARPEGGIO_PATTERNS: Record<string, number[]> = {
  majorTriad: [0, 4, 7],
  minorTriad: [0, 3, 7],
  dominant7: [0, 4, 7, 10],
};

const ALL_STRINGS: StringNumber[] = [6, 5, 4, 3, 2, 1];

export function generatePositionsForPattern(
  tuning: Tuning,
  rootPitchClass: string,
  intervals: number[],
  fretRange: { minFret: number; maxFret: number },
): FretPosition[] {
  const rootSemitone = noteNameToMidi(`${rootPitchClass}0`) % 12;
  const allowedSemitones = new Set(intervals.map((interval) => (rootSemitone + interval) % 12));

  const positions: FretPosition[] = [];
  for (const string of ALL_STRINGS) {
    for (let fret = fretRange.minFret; fret <= fretRange.maxFret; fret += 1) {
      const position = { string, fret };
      const note = getNoteAt(tuning, position);
      const noteSemitone = note.midi % 12;
      if (allowedSemitones.has(noteSemitone)) {
        positions.push(position);
      }
    }
  }
  return positions;
}
