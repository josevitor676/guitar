import type { FretPosition } from '../music-theory/tuning';

/** No common guitar neck goes past here. */
const HIGHEST_FRET = 24;

/**
 * A pattern walked up the neck: the shape played through where it sits, then
 * played through again a fret further up, and again for each repetition.
 *
 * Repeating the shape whole is what makes it practice. Duplicating each note
 * in place would interleave the positions instead, which is a different
 * exercise and a much harder one to read.
 */
export function extendedSequence(base: FretPosition[], extensions: number): FretPosition[] {
  const passes = Array.from({ length: extensions + 1 }, (_, step) =>
    base.map((position) => ({ ...position, fret: position.fret + step })),
  );
  return passes.flat();
}

/** Whether one more repetition would still land on the neck. */
export function canExtend(base: FretPosition[], extensions: number): boolean {
  if (base.length === 0) return false;
  const highest = Math.max(...base.map((position) => position.fret));
  return highest + extensions + 1 <= HIGHEST_FRET;
}

/**
 * Whether a repetition can be taken back.
 *
 * The pattern itself is not a repetition: emptying the neck is what the clear
 * button is for.
 */
export function canShrink(extensions: number): boolean {
  return extensions > 0;
}
