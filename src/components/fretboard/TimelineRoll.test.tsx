import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    expect(second).toHaveStyle({ left: '112px' });

    const third = screen.getByTestId('timeline-note-2');
    expect(third).toHaveAttribute('data-string', '3');
    expect(third).toHaveStyle({ left: '184px' });
  });

  it('marks only the note being played as active', () => {
    render(<TimelineRoll timeline={timeline} currentIndex={1} />);

    expect(screen.getByTestId('timeline-note-1')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('timeline-note-0')).toHaveAttribute('data-active', 'false');
  });

  it('parks the playhead at the start before playback and moves it to the active note', () => {
    const { rerender } = render(<TimelineRoll timeline={timeline} currentIndex={null} />);
    expect(screen.getByTestId('timeline-playhead')).toHaveStyle({ left: '40px' });

    rerender(<TimelineRoll timeline={timeline} currentIndex={2} />);
    expect(screen.getByTestId('timeline-playhead')).toHaveStyle({ left: '184px' });
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
});
