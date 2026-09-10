import type { FretPosition } from '../music-theory/tuning';

/** Fret zero is the open string, which is still a playable note. */
const LOWEST_FRET = 0;
/** No common guitar neck goes past here. */
const HIGHEST_FRET = 24;

/**
 * Whether the whole sequence can move that many frets and stay on the neck.
 *
 * All or nothing: clamping the notes that would fall off the end would keep
 * the sequence playable while quietly changing the intervals between its
 * notes, which is no longer the same exercise.
 */
export function canTranspose(positions: FretPosition[], delta: number): boolean {
  if (positions.length === 0) return false;

  return positions.every((position) => {
    const fret = position.fret + delta;
    return fret >= LOWEST_FRET && fret <= HIGHEST_FRET;
  });
}

/**
 * The same shape, moved along the neck.
 *
 * Only the frets move: shifting strings as well would change the intervals,
 * because the gap between the second and third strings is a third where every
 * other gap is a fourth.
 */
export function transpose(positions: FretPosition[], delta: number): FretPosition[] {
  return positions.map((position) => ({ ...position, fret: position.fret + delta }));
}
