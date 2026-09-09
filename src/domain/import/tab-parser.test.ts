import { describe, it, expect } from 'vitest';
import { positionsFromTokens } from './tab-parser';
import type { TabSystem, OcrToken } from './image.types';

/** One system with lines at y = 20,30,...,70 — string 1 on top, string 6 at the bottom. */
const system: TabSystem = { lineYs: [20, 30, 40, 50, 60, 70], top: 15, bottom: 75 };

function token(text: string, x: number, y: number): OcrToken {
  return { text, x, y };
}

describe('positionsFromTokens', () => {
  it('returns nothing when there is no system to read', () => {
    expect(positionsFromTokens([token('5', 10, 20)], [])).toEqual([]);
  });

  it('maps a digit on the top line to string 1 and one on the bottom line to string 6', () => {
    const positions = positionsFromTokens([token('5', 10, 20), token('3', 40, 70)], [system]);

    expect(positions).toEqual([
      { string: 1, fret: 5 },
      { string: 6, fret: 3 },
    ]);
  });

  it('orders notes left to right, which is the order they are played', () => {
    const tokens = [token('7', 90, 40), token('3', 10, 40), token('5', 50, 40)];

    expect(positionsFromTokens(tokens, [system]).map((p) => p.fret)).toEqual([3, 5, 7]);
  });

  it('reads a two-digit fret as one number', () => {
    expect(positionsFromTokens([token('12', 10, 30)], [system])).toEqual([{ string: 2, fret: 12 }]);
  });

  it('keeps an open string, fret zero', () => {
    expect(positionsFromTokens([token('0', 10, 50)], [system])).toEqual([{ string: 4, fret: 0 }]);
  });

  it('discards text that is not a fret number, such as a dynamic marking', () => {
    expect(positionsFromTokens([token('mf', 10, 40), token('%', 20, 40)], [system])).toEqual([]);
  });

  it('discards a fret number no guitar neck has', () => {
    expect(positionsFromTokens([token('25', 10, 40)], [system])).toEqual([]);
  });

  it('discards a triplet marking that floats above the system', () => {
    expect(positionsFromTokens([token('3', 10, 2)], [system])).toEqual([]);
  });

  it('discards a digit stranded between two lines', () => {
    expect(positionsFromTokens([token('9', 10, 25)], [system])).toEqual([]);
  });

  it('reads stacked systems from top to bottom, not interleaved by x', () => {
    const lower: TabSystem = { lineYs: [220, 230, 240, 250, 260, 270], top: 215, bottom: 275 };
    const tokens = [token('9', 10, 220), token('1', 80, 20), token('2', 10, 20)];

    const positions = positionsFromTokens(tokens, [system, lower]);

    expect(positions).toEqual([
      { string: 1, fret: 2 },
      { string: 1, fret: 1 },
      { string: 1, fret: 9 },
    ]);
  });

  it('keeps both notes of a chord, lowest string first', () => {
    const positions = positionsFromTokens([token('5', 10, 20), token('7', 11, 70)], [system]);

    expect(positions).toEqual([
      { string: 6, fret: 7 },
      { string: 1, fret: 5 },
    ]);
  });

  it('snaps a digit printed slightly off its line', () => {
    expect(positionsFromTokens([token('8', 10, 42)], [system])).toEqual([{ string: 3, fret: 8 }]);
  });
});

describe('positionsFromTokens with slurs', () => {
  it('reads an h between two digits on one string as a hammer-on', () => {
    const positions = positionsFromTokens(
      [token('3', 10, 70), token('h', 25, 70), token('5', 40, 70)],
      [system],
    );

    expect(positions).toEqual([
      { string: 6, fret: 3 },
      { string: 6, fret: 5, articulation: 'hammerOn' },
    ]);
  });

  it('reads a p as a pull-off', () => {
    const positions = positionsFromTokens(
      [token('7', 10, 70), token('p', 25, 70), token('5', 40, 70)],
      [system],
    );

    expect(positions[1].articulation).toBe('pullOff');
  });

  it('accepts the capital H an OCR sometimes returns', () => {
    const positions = positionsFromTokens(
      [token('3', 10, 70), token('H', 25, 70), token('5', 40, 70)],
      [system],
    );

    expect(positions[1].articulation).toBe('hammerOn');
  });

  it('leaves notes unslurred when no letter sits between them', () => {
    const positions = positionsFromTokens([token('3', 10, 70), token('5', 40, 70)], [system]);

    expect(positions[1].articulation).toBeUndefined();
  });

  it('discards a letter with no note after it', () => {
    const positions = positionsFromTokens([token('3', 10, 70), token('h', 25, 70)], [system]);

    expect(positions).toEqual([{ string: 6, fret: 3 }]);
  });

  it('discards a letter that opens a system, having nothing to slur from', () => {
    const positions = positionsFromTokens([token('h', 10, 70), token('5', 40, 70)], [system]);

    expect(positions).toEqual([{ string: 6, fret: 5 }]);
  });

  it('discards a slur between different strings, which is out of scope', () => {
    const positions = positionsFromTokens(
      [token('3', 10, 70), token('h', 25, 60), token('5', 40, 50)],
      [system],
    );

    expect(positions.every((p) => p.articulation === undefined)).toBe(true);
    expect(positions).toHaveLength(2);
  });

  it('ignores a letter that is not a slur marking', () => {
    const positions = positionsFromTokens(
      [token('3', 10, 70), token('x', 25, 70), token('5', 40, 70)],
      [system],
    );

    expect(positions[1].articulation).toBeUndefined();
  });

  it('slurs several pairs across one line independently', () => {
    const positions = positionsFromTokens(
      [
        token('3', 10, 70),
        token('h', 25, 70),
        token('5', 40, 70),
        token('7', 80, 70),
        token('p', 95, 70),
        token('5', 110, 70),
      ],
      [system],
    );

    expect(positions.map((p) => p.articulation)).toEqual([
      undefined,
      'hammerOn',
      undefined,
      'pullOff',
    ]);
  });
});
