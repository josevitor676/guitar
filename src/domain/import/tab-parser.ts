import type { FretPosition, StringNumber } from '../music-theory/tuning';
import type { OcrToken, TabSystem } from './image.types';

/** No common guitar neck goes past the 24th fret, so anything higher is noise. */
const MAX_FRET = 24;
/**
 * A digit further than this from its line, in spacings, is not on that line.
 * It must stay below 0.5: the greatest possible distance to the nearest of
 * evenly spaced lines is half a spacing, so any threshold at or above 0.5
 * would accept every token and never reject a digit stranded between lines.
 */
const MAX_LINE_DISTANCE_RATIO = 0.35;
/** Digits closer than this in x, in spacings, are one chord rather than two notes. */
const CHORD_X_RATIO = 0.4;

interface PlacedNote {
  systemIndex: number;
  x: number;
  position: FretPosition;
}

function parseFret(text: string): number | null {
  if (!/^\d{1,2}$/.test(text)) return null;
  const fret = Number(text);
  return fret <= MAX_FRET ? fret : null;
}

function spacingOf(system: TabSystem): number {
  return (system.lineYs[system.lineYs.length - 1] - system.lineYs[0]) / (system.lineYs.length - 1);
}

/** The nearest line, or null when the token floats between lines. */
function stringForY(system: TabSystem, y: number): StringNumber | null {
  let nearestIndex = 0;
  let nearestDistance = Infinity;

  system.lineYs.forEach((lineY, index) => {
    const distance = Math.abs(lineY - y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  if (nearestDistance > spacingOf(system) * MAX_LINE_DISTANCE_RATIO) return null;

  // The top line is string 1 (high E); the bottom line is string 6.
  return (nearestIndex + 1) as StringNumber;
}

/**
 * Turns the digits the OCR read into a playable sequence.
 *
 * Every token that is not a fret number, or that falls outside a system's
 * capture band, is dropped — which is how triplet marks, dynamics, and anything
 * printed on the musical staff are excluded without ever being interpreted.
 */
export function positionsFromTokens(tokens: OcrToken[], systems: TabSystem[]): FretPosition[] {
  const placed: PlacedNote[] = [];

  for (const token of tokens) {
    const fret = parseFret(token.text);
    if (fret === null) continue;

    const systemIndex = systems.findIndex((system) => token.y >= system.top && token.y <= system.bottom);
    if (systemIndex === -1) continue;

    const string = stringForY(systems[systemIndex], token.y);
    if (string === null) continue;

    placed.push({ systemIndex, x: token.x, position: { string, fret } });
  }

  placed.sort((a, b) => {
    if (a.systemIndex !== b.systemIndex) return a.systemIndex - b.systemIndex;

    // Notes struck together are a chord; chords are out of scope, so they are
    // rolled from the lowest string up rather than dropped.
    const spacing = spacingOf(systems[a.systemIndex]);
    if (Math.abs(a.x - b.x) <= spacing * CHORD_X_RATIO) {
      return b.position.string - a.position.string;
    }

    return a.x - b.x;
  });

  return placed.map((note) => note.position);
}
