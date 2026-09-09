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

/**
 * The fret range needed to show every position of a sequence.
 *
 * Loading a sequence the student cannot see is the same as loading nothing, so
 * the visible window grows to cover it. It only ever grows: narrowing would
 * hide frets the student had deliberately brought into view.
 */
export function rangeToReveal(
  positions: FretPosition[],
  current: { minFret: number; maxFret: number },
): { minFret: number; maxFret: number } {
  if (positions.length === 0) return current;

  const frets = positions.map((position) => position.fret);

  return {
    // Fret 0 is the open string, which the grid does not draw.
    minFret: Math.max(1, Math.min(current.minFret, ...frets)),
    maxFret: Math.max(current.maxFret, ...frets),
  };
}
