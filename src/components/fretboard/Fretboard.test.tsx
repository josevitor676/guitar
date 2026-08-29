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

  it('renders inlay markers only at frets 3, 5, and 7 within the visible range', () => {
    render(<Fretboard currentIndex={null} />);
    expect(screen.getByTestId('inlay-fret-3')).toBeInTheDocument();
    expect(screen.getByTestId('inlay-fret-5')).toBeInTheDocument();
    expect(screen.getByTestId('inlay-fret-7')).toBeInTheDocument();
    expect(screen.queryByTestId('inlay-fret-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('inlay-fret-2')).not.toBeInTheDocument();
  });

  it('applies a glow/ring style to a selected fret marker', () => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [{ string: 6, fret: 1 }] });
    render(<Fretboard currentIndex={null} />);
    const cell = screen.getByRole('button', { name: /corda 6, casa 1/i });
    expect(cell.className).toMatch(/ring-2/);
    expect(cell.className).toMatch(/shadow-/);
  });

  it('applies a stronger glow to the currently highlighted marker during playback', () => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [{ string: 6, fret: 1 }] });
    render(<Fretboard currentIndex={0} />);
    const cell = screen.getByRole('button', { name: /corda 6, casa 1/i });
    expect(cell.className).toMatch(/ring-amber-200/);
  });
});
