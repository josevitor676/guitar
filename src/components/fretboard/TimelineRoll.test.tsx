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
});
