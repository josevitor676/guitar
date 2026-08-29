import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useFretboardStore } from '../../state/fretboard-store';

const toggleNote = vi.fn();

vi.mock('../../audio', () => ({
  sampler: { isLoaded: () => true, playNote: vi.fn() },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { Fretboard } from './Fretboard';

describe('Fretboard', () => {
  beforeEach(() => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [] });
    toggleNote.mockClear();
  });

  it('renders one row per string with the string tuning label (no octave)', () => {
    render(<Fretboard currentIndex={null} />);
    expect(screen.getAllByText('E')).toHaveLength(2);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('G')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('renders a clickable cell for every string/fret combination in range', () => {
    render(<Fretboard currentIndex={null} />);
    // 6 strings x 7 frets (1-7) = 42 fret cells
    expect(screen.getAllByRole('button')).toHaveLength(42);
  });

  it('marks a cell as pressed after it is clicked', async () => {
    render(<Fretboard currentIndex={null} />);
    const cell = screen.getByRole('button', { name: /corda 6, casa 1/i });
    await act(async () => {
      fireEvent.click(cell);
    });
    expect(useFretboardStore.getState().selectedNotes).toEqual([{ string: 6, fret: 1 }]);
  });
});
