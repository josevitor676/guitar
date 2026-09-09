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

/** A twelve-fret neck covers one octave, which is as much as is useful at once. */
export const MAX_VISIBLE_FRETS = 12;
/** Below this the neck stops being playable, so a small screen scrolls instead. */
export const MIN_VISIBLE_FRETS = 4;

/**
 * How many frets fit in the space available, capped at one octave.
 *
 * A width of zero means the neck has not been measured yet — on the first
 * render, or wherever ResizeObserver is unavailable — and the full span is the
 * right assumption there, since it is what a normal screen shows anyway.
 */
export function fretSpanForWidth(availableWidth: number, cellWidth: number, labelWidth: number): number {
  if (availableWidth <= 0) return MAX_VISIBLE_FRETS;

  const fits = Math.floor((availableWidth - labelWidth) / cellWidth);
  return Math.min(MAX_VISIBLE_FRETS, Math.max(MIN_VISIBLE_FRETS, fits));
}

/**
 * Where the visible window should start so a sequence can be seen.
 *
 * The window slides rather than stretching: how many frets are shown is decided
 * by how much room the screen has, so revealing a sequence higher up the neck
 * moves the view instead of squeezing more frets into the same space. A
 * sequence longer than the window shows from its first note.
 */
export function windowStartToReveal(
  positions: FretPosition[],
  minFret: number,
  span: number,
): number {
  if (positions.length === 0) return minFret;

  const frets = positions.map((position) => position.fret);
  // Fret 0 is the open string, which the grid does not draw.
  const lowest = Math.max(1, Math.min(...frets));
  const highest = Math.max(...frets);

  const alreadyVisible = lowest >= minFret && highest <= minFret + span - 1;
  return alreadyVisible ? minFret : lowest;
}
