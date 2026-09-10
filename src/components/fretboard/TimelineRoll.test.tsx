import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { buildTimeline } from '../../domain/playback/timeline-model';
import { TimelineRoll } from './TimelineRoll';

const timeline = buildTimeline(
  [
    { string: 6, fret: 3 },
    { string: 6, fret: 5 },
    { string: 3, fret: 7 },
  ],
  'quarter',
  () => 'quarter',
);

describe('TimelineRoll', () => {
  it('invites the student to build a sequence when nothing is selected', () => {
    render(<TimelineRoll timeline={[]} currentIndex={null} />);
    expect(screen.getByText(/monte uma sequ[eê]ncia/i)).toBeInTheDocument();
  });

  it('renders one labelled row per string', () => {
    render(<TimelineRoll timeline={timeline} currentIndex={null} />);
    expect(screen.getAllByTestId(/^timeline-string-row-/)).toHaveLength(6);
    expect(screen.getByTestId('timeline-string-row-6')).toHaveTextContent('E');
  });

  it('shows the fret number inside each note, not the note name', () => {
    render(<TimelineRoll timeline={timeline} currentIndex={null} />);
    expect(screen.getByTestId('timeline-note-0')).toHaveTextContent('3');
    expect(screen.getByTestId('timeline-note-2')).toHaveTextContent('7');
  });

  it('places each note on its own string row at its onset', () => {
    render(<TimelineRoll timeline={timeline} currentIndex={null} />);

    const second = screen.getByTestId('timeline-note-1');
    expect(second).toHaveAttribute('data-string', '6');
    expect(second).toHaveStyle({ left: '132px' });

    const third = screen.getByTestId('timeline-note-2');
    expect(third).toHaveAttribute('data-string', '3');
    expect(third).toHaveStyle({ left: '204px' });
  });

  it('marks only the note being played as active', () => {
    render(<TimelineRoll timeline={timeline} currentIndex={1} />);

    expect(screen.getByTestId('timeline-note-1')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('timeline-note-0')).toHaveAttribute('data-active', 'false');
  });

  it('parks the playhead at the start before playback and moves it to the active note', () => {
    const { rerender } = render(<TimelineRoll timeline={timeline} currentIndex={null} />);
    expect(screen.getByTestId('timeline-playhead')).toHaveStyle({ left: '60px' });

    rerender(<TimelineRoll timeline={timeline} currentIndex={2} />);
    expect(screen.getByTestId('timeline-playhead')).toHaveStyle({ left: '204px' });
  });

  it('closes every note into its own cell, so three notes get four boundaries', () => {
    render(<TimelineRoll timeline={timeline} currentIndex={null} />);

    expect(screen.getAllByTestId(/^timeline-divider-/)).toHaveLength(timeline.length + 1);
  });

  it('marks the start of each bar more heavily than the beats inside it', () => {
    render(<TimelineRoll timeline={timeline} currentIndex={null} />);

    expect(screen.getByTestId('timeline-divider-0')).toHaveAttribute('data-bar', 'true');
    expect(screen.getByTestId('timeline-divider-1')).toHaveAttribute('data-bar', 'false');
  });

  it('puts the dividers between the notes rather than through them', () => {
    render(<TimelineRoll timeline={timeline} currentIndex={null} />);

    const noteLeft = Number.parseFloat(screen.getByTestId('timeline-note-1').style.left);
    const before = Number.parseFloat(screen.getByTestId('timeline-divider-1').style.left);
    const after = Number.parseFloat(screen.getByTestId('timeline-divider-2').style.left);

    expect(before).toBeLessThan(noteLeft);
    expect(after).toBeGreaterThan(noteLeft);
  });

  it('centers each note in its cell', () => {
    render(<TimelineRoll timeline={timeline} currentIndex={null} />);

    const noteLeft = Number.parseFloat(screen.getByTestId('timeline-note-1').style.left);
    const before = Number.parseFloat(screen.getByTestId('timeline-divider-1').style.left);
    const after = Number.parseFloat(screen.getByTestId('timeline-divider-2').style.left);

    expect((before + after) / 2).toBeCloseTo(noteLeft, 5);
  });

  it('draws no dividers when there is nothing to divide', () => {
    render(<TimelineRoll timeline={[]} currentIndex={null} />);

    expect(screen.queryByTestId(/^timeline-divider-/)).not.toBeInTheDocument();
  });

  it('keeps the notes the same distance apart whatever the rhythmic figure', () => {
    const positions = [
      { string: 6 as const, fret: 3 },
      { string: 6 as const, fret: 5 },
    ];
    const inQuarters = buildTimeline(positions, 'quarter', () => 'quarter');
    const inSixteenths = buildTimeline(positions, 'sixteenth', () => 'sixteenth');

    const { rerender } = render(<TimelineRoll timeline={inQuarters} currentIndex={null} />);
    const quarterGap =
      Number.parseFloat(screen.getByTestId('timeline-note-1').style.left) -
      Number.parseFloat(screen.getByTestId('timeline-note-0').style.left);

    rerender(<TimelineRoll timeline={inSixteenths} currentIndex={null} />);
    const sixteenthGap =
      Number.parseFloat(screen.getByTestId('timeline-note-1').style.left) -
      Number.parseFloat(screen.getByTestId('timeline-note-0').style.left);

    expect(sixteenthGap).toBeCloseTo(quarterGap, 5);
  });

  it('marks the note on a beat head only while the metronome leads', () => {
    render(<TimelineRoll timeline={timeline} currentIndex={null} metronomeOn />);
    expect(screen.getByTestId('timeline-note-0')).toHaveAttribute('data-on-beat', 'true');

    render(<TimelineRoll timeline={timeline} currentIndex={null} />);
    expect(screen.getAllByTestId('timeline-note-0')[1]).toHaveAttribute('data-on-beat', 'false');
  });

  it('draws a slur only where one note is reached from the last', () => {
    const slurred = buildTimeline(
      [
        { string: 6, fret: 3 },
        { string: 6, fret: 5, articulation: 'hammerOn' },
        { string: 6, fret: 7 },
      ],
      'quarter',
      () => 'quarter',
    );

    render(<TimelineRoll timeline={slurred} currentIndex={null} />);

    expect(screen.getByTestId('timeline-slur-1')).toBeInTheDocument();
    expect(screen.queryByTestId('timeline-slur-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('timeline-slur-2')).not.toBeInTheDocument();
  });

  it('labels the slur with the letter tablature prints', () => {
    const slurred = buildTimeline(
      [
        { string: 6, fret: 7 },
        { string: 6, fret: 5, articulation: 'pullOff' },
      ],
      'quarter',
      () => 'quarter',
    );

    render(<TimelineRoll timeline={slurred} currentIndex={null} />);

    expect(screen.getByTestId('timeline-slur-label-1')).toHaveTextContent('p');
  });

  it('draws no slurs at all for a plainly picked sequence', () => {
    render(<TimelineRoll timeline={timeline} currentIndex={null} />);

    expect(screen.queryByTestId(/^timeline-slur-/)).not.toBeInTheDocument();
  });

  it('draws each technique with its own shape, not one shape for all', () => {
    const mixed = buildTimeline(
      [
        { string: 6, fret: 3 },
        { string: 6, fret: 5, articulation: 'hammerOn' },
        { string: 6, fret: 9, articulation: 'slide' },
        { string: 6, fret: 11, articulation: 'bend' },
      ],
      'quarter',
      () => 'quarter',
    );

    render(<TimelineRoll timeline={mixed} currentIndex={null} />);

    expect(screen.getByTestId('timeline-slur-1')).toHaveAttribute('data-articulation', 'hammerOn');
    expect(screen.getByTestId('timeline-slur-2')).toHaveAttribute('data-articulation', 'slide');
    expect(screen.getByTestId('timeline-slur-3')).toHaveAttribute('data-articulation', 'bend');

    // Only the bend is drawn with an arrowhead, since only it rises to a target.
    expect(screen.getByTestId('timeline-slur-3')).toHaveAttribute('marker-end');
    expect(screen.getByTestId('timeline-slur-2')).not.toHaveAttribute('marker-end');
  });

  it('labels a slide and a bend with the marks tablature prints', () => {
    const mixed = buildTimeline(
      [
        { string: 6, fret: 5 },
        { string: 6, fret: 9, articulation: 'slide' },
        { string: 6, fret: 11, articulation: 'bend' },
      ],
      'quarter',
      () => 'quarter',
    );

    render(<TimelineRoll timeline={mixed} currentIndex={null} />);

    expect(screen.getByTestId('timeline-slur-label-1')).toHaveTextContent('sl');
    expect(screen.getByTestId('timeline-slur-label-2')).toHaveTextContent('b');
  });

  describe('removing a note', () => {
    const repeated = buildTimeline(
      [7, 5, 7].map((fret) => ({ string: 5 as const, fret })),
      'quarter',
      () => 'quarter',
    );

    it('reports which occurrence was clicked, not which string and fret', () => {
      const onRemoveNote = vi.fn();
      render(<TimelineRoll timeline={repeated} currentIndex={null} onRemoveNote={onRemoveNote} />);

      fireEvent.click(screen.getByTestId('timeline-note-2'));

      expect(onRemoveNote).toHaveBeenCalledWith(2);
    });

    it('names the occurrence so the two identical notes can be told apart', () => {
      render(<TimelineRoll timeline={repeated} currentIndex={null} onRemoveNote={vi.fn()} />);

      expect(screen.getByTestId('timeline-note-2')).toHaveAccessibleName(
        'remover nota 3: corda 5, casa 7',
      );
    });

    it('is not clickable when the roll is only being watched', () => {
      render(<TimelineRoll timeline={repeated} currentIndex={null} />);

      expect(screen.getByTestId('timeline-note-0').tagName).toBe('DIV');
    });
  });
});
