import type { FretPosition } from '../music-theory/tuning';
import { invertArticulation } from '../music-theory/articulation';

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

/** Whether two sequences are the same notes, in the same order. */
export function sequencesEqual(a: FretPosition[], b: FretPosition[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (position, index) =>
        positionsEqual(position, b[index]) &&
        position.articulation === b[index].articulation,
    )
  );
}

/** Whether any string and fret is played more than once in the sequence. */
export function hasRepeatedPosition(positions: FretPosition[]): boolean {
  const seen = new Set<string>();

  return positions.some((position) => {
    const key = `${position.string}:${position.fret}`;
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
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

/**
 * The selection in the order the neck reads: lowest string first, and each
 * string walked from the nut upward.
 *
 * The grid has no time axis — it is a map of the neck, not a sequence — so
 * playing it back in the order the student happened to click would be
 * arbitrary. Marking the A string before the low E and hearing the A first is
 * what makes it feel wrong. The timeline is the opposite case: there the
 * horizontal axis *is* time, so the marking order is the sequence and must be
 * kept.
 */
export function orderAlongNeck(positions: FretPosition[]): FretPosition[] {
  // A sequence that plays the same spot more than once is a sequence in the
  // strict sense: the grid has one marker per spot and cannot show that the
  // note comes round again, so sorting it would silently discard the order the
  // student built. The grid orders what it is able to represent, and leaves
  // the rest alone.
  if (hasRepeatedPosition(positions)) return [...positions];

  return [...positions]
    .sort((a, b) => {
      // String 6 is the lowest in pitch and the first to be played.
      if (a.string !== b.string) return b.string - a.string;
      return a.fret - b.fret;
    })
    // A slur joins two notes that were next to each other. Reordering breaks
    // that adjacency, so keeping the slurs would claim a technique between
    // notes that no longer touch.
    .map(({ string, fret }) => ({ string, fret }));
}

/**
 * Plays a sequence backwards, moving each slur to the note it now arrives at
 * and swapping its direction: what was a hammer-on climbing is a pull-off
 * coming back down.
 */
function reverseWithArticulations(positions: FretPosition[]): FretPosition[] {
  const reversed = [...positions].reverse();

  return reversed.map((position, index) => {
    const { string, fret } = position;
    // Boundary k in the reversal is the boundary that led *into* the note that
    // now follows it, so its articulation comes from one place further along.
    const incoming = positions[positions.length - index]?.articulation;
    if (index === 0 || !incoming) return { string, fret };
    return { string, fret, articulation: invertArticulation(incoming) };
  });
}

/**
 * Which way through the neck the student wants to practise.
 *
 * Named by the strings rather than by "up" and "down", because those mean
 * opposite things depending on whether you think in pitch or in where the
 * string physically sits: the sixth string is the lowest in pitch and the
 * highest on the instrument.
 */
export type PlaybackDirection = 'sixthToFirst' | 'firstToSixth' | 'roundTrip';

/**
 * Lays the sequence out in the direction being practised.
 *
 * `orderAlongNeck` already runs from the sixth string to the first, so that is
 * the identity case. A round trip turns at the far end without sounding that
 * note twice and finishes where it began, which is how the pattern is drilled.
 */
export function applyDirection(
  positions: FretPosition[],
  direction: PlaybackDirection,
): FretPosition[] {
  if (positions.length < 2) return [...positions];

  switch (direction) {
    case 'firstToSixth':
      return reverseWithArticulations(positions);
    case 'roundTrip':
      return [...positions, ...reverseWithArticulations(positions).slice(1)];
    default:
      return [...positions];
  }
}
