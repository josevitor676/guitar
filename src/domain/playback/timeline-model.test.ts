import { describe, it, expect } from 'vitest';
import { buildTimeline, timelineLengthInBeats } from './timeline-model';
import type { FretPosition } from '../music-theory/tuning';

const positions: FretPosition[] = [
  { string: 6, fret: 3 },
  { string: 6, fret: 5 },
  { string: 5, fret: 3 },
];

const allQuarters = () => 'quarter' as const;

describe('buildTimeline', () => {
  it('returns an empty timeline for an empty selection', () => {
    expect(buildTimeline([], 'quarter', allQuarters)).toEqual([]);
  });

  it('spaces notes evenly by the global subdivision and keeps the selection order', () => {
    const timeline = buildTimeline(positions, 'eighth', allQuarters);

    expect(timeline.map((note) => note.startBeat)).toEqual([0, 0.5, 1]);
    expect(timeline.map((note) => note.index)).toEqual([0, 1, 2]);
    expect(timeline.map((note) => note.position)).toEqual(positions);
  });

  it('resolves each note duration through the callback', () => {
    const timeline = buildTimeline(positions, 'quarter', (position) =>
      position.string === 6 ? 'sixteenth' : 'quarter',
    );

    expect(timeline.map((note) => note.durationBeats)).toEqual([0.25, 0.25, 1]);
  });

  it('never lets the per-note duration change the spacing between notes', () => {
    const spacedByQuarters = buildTimeline(positions, 'quarter', allQuarters);
    const sameSpacingShorterNotes = buildTimeline(positions, 'quarter', () => 'sixteenth');

    expect(sameSpacingShorterNotes.map((note) => note.startBeat)).toEqual(
      spacedByQuarters.map((note) => note.startBeat),
    );
  });
});

describe('timelineLengthInBeats', () => {
  it('is zero for an empty timeline', () => {
    expect(timelineLengthInBeats([])).toBe(0);
  });

  it('spans from the first onset to the end of the last note', () => {
    const timeline = buildTimeline(positions, 'quarter', allQuarters);
    expect(timelineLengthInBeats(timeline)).toBe(3);
  });

  it('accounts for a final note that sustains past its slot', () => {
    const timeline = buildTimeline(positions, 'eighth', allQuarters);
    expect(timelineLengthInBeats(timeline)).toBe(2);
  });
});
