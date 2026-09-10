import type { FretPosition } from '../music-theory/tuning';
import type { Subdivision } from '../music-theory/rhythm';
import { SUBDIVISION_LABELS } from '../music-theory/rhythm';

export interface TabSheet {
  title: string;
  bpm: number;
  subdivision: Subdivision;
  positions: FretPosition[];
}

/**
 * Notes per line. A sheet that never wrapped would grow sideways without end,
 * and a two-hundred-note drill would print as a single unreadable ribbon.
 */
export const NOTES_PER_SYSTEM = 16;

const STRING_COUNT = 6;
const LINE_GAP = 28;
const NOTE_GAP = 48;
const LEFT_PAD = 96;
const RIGHT_PAD = 40;
const SYSTEM_GAP = 46;
const HEADER_HEIGHT = 78;

export type Align = 'left' | 'center';

export type DrawItem =
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number }
  /** Paper-coloured, used to clear the string line behind a number. */
  | { kind: 'erase'; x: number; y: number; width: number; height: number }
  | { kind: 'text'; x: number; y: number; text: string; size: number; align: Align; bold?: boolean }
  /** Marks a string line so a reader — or a test — can count them. */
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; string: number };

export interface TabLayout {
  width: number;
  height: number;
  items: DrawItem[];
}

export function splitIntoSystems(positions: FretPosition[], perSystem: number): FretPosition[][] {
  const systems: FretPosition[][] = [];
  for (let at = 0; at < positions.length; at += perSystem) {
    systems.push(positions.slice(at, at + perSystem));
  }
  return systems;
}

/**
 * The mark tablature prints between two frets. A slide is written by the
 * direction it travels, and the two fret numbers already say which way that is.
 */
export function slurMark(position: FretPosition, previous: FretPosition | undefined): string | null {
  switch (position.articulation) {
    case 'hammerOn':
      return 'h';
    case 'pullOff':
      return 'p';
    case 'bend':
      return 'b';
    case 'slide':
      return previous && position.fret < previous.fret ? '\\' : '/';
    default:
      return null;
  }
}

/**
 * Where every line and every character goes, in one coordinate space, with y
 * growing downward as a screen does.
 *
 * Layout is separated from drawing because the sheet is rendered twice — as
 * SVG for the screen and an image, and as PDF for the printer. Two renderers
 * measuring independently would drift, and the drift would only show up on
 * paper.
 */
export function layoutTabSheet(sheet: TabSheet, perSystem: number = NOTES_PER_SYSTEM): TabLayout {
  const systems = splitIntoSystems(sheet.positions, perSystem);
  const longest = systems.reduce((most, system) => Math.max(most, system.length), 0);
  const width = LEFT_PAD + Math.max(longest - 1, 0) * NOTE_GAP + RIGHT_PAD;
  const systemHeight = (STRING_COUNT - 1) * LINE_GAP + SYSTEM_GAP;
  const height = HEADER_HEIGHT + Math.max(systems.length, 1) * systemHeight;

  const items: DrawItem[] = [
    { kind: 'text', x: 24, y: 34, text: sheet.title, size: 21, align: 'left', bold: true },
    {
      kind: 'text',
      x: 24,
      y: 56,
      // Tablature without a tempo says which notes to play and nothing about
      // how, which is the half a student needs most a week later.
      text: `${sheet.bpm} BPM · ${SUBDIVISION_LABELS[sheet.subdivision]} · ${sheet.positions.length} notas`,
      size: 14,
      align: 'left',
    },
  ];

  systems.forEach((notes, systemIndex) => {
    const top = HEADER_HEIGHT + systemIndex * systemHeight;

    for (let i = 0; i < STRING_COUNT; i += 1) {
      const y = top + i * LINE_GAP;
      items.push({ kind: 'line', x1: 24, y1: y, x2: width - 24, y2: y, string: i + 1 });
    }

    ['T', 'A', 'B'].forEach((letter, i) => {
      // On a line, not between two: the letter takes the line's place, so
      // clearing the paper behind it reads as intended rather than as a gap.
      const y = top + i * 2 * LINE_GAP;
      items.push({ kind: 'erase', x: 36, y: y - 11, width: 20, height: 22 });
      items.push({ kind: 'text', x: 40, y: y + 6, text: letter, size: 17, align: 'left' });
    });

    notes.forEach((position, index) => {
      const x = LEFT_PAD + index * NOTE_GAP;
      const y = top + (position.string - 1) * LINE_GAP;
      const text = String(position.fret);
      const half = text.length * 7 + 4;

      const slur = index === 0 ? null : slurMark(position, notes[index - 1]);
      if (slur) {
        const between = x - NOTE_GAP / 2;
        items.push({ kind: 'erase', x: between - 8, y: y - 10, width: 16, height: 20 });
        items.push({ kind: 'text', x: between, y: y + 6, text: slur, size: 16, align: 'center' });
      }

      // The line is erased behind the digit, the way printed tablature does it.
      items.push({ kind: 'erase', x: x - half, y: y - 11, width: half * 2, height: 22 });
      items.push({ kind: 'text', x, y: y + 7, text, size: 21, align: 'center' });
    });
  });

  return { width, height, items };
}
