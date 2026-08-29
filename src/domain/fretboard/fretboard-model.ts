import type { FretPosition } from '../music-theory/tuning';

export function isValidPosition(
  position: FretPosition,
  fretRange: { minFret: number; maxFret: number },
): boolean {
  const validString = position.string >= 1 && position.string <= 6;
  const validFret = position.fret >= fretRange.minFret && position.fret <= fretRange.maxFret;
  return validString && validFret;
}

export function positionsEqual(a: FretPosition, b: FretPosition): boolean {
  return a.string === b.string && a.fret === b.fret;
}
