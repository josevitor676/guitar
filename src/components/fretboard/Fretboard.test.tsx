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

  it('renders a hollow outline (no accent fill) for a selected fret marker', () => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [{ string: 6, fret: 1 }] });
    render(<Fretboard currentIndex={null} />);
    const cell = screen.getByRole('button', { name: /corda 6, casa 1/i });
    const circle = cell.querySelector('span');
    expect(circle?.className).toMatch(/border-edge-strong/);
    expect(circle?.className).not.toMatch(/bg-accent/);
  });

  it('fills the currently highlighted marker with the accent color during playback', () => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [{ string: 6, fret: 1 }] });
    render(<Fretboard currentIndex={0} />);
    const cell = screen.getByRole('button', { name: /corda 6, casa 1/i });
    const circle = cell.querySelector('span');
    expect(circle?.className).toMatch(/bg-accent/);
    expect(circle?.className).toMatch(/ring-accent-dim/);
  });

  it('renders the fret marker as a circular button', () => {
    render(<Fretboard currentIndex={null} />);
    const cell = screen.getByRole('button', { name: /corda 6, casa 1/i });
    const circle = cell.querySelector('span');
    expect(circle?.className).toMatch(/rounded-full/);
  });

  it('renders string 1 (high E) on top and string 6 (low E) on the bottom', () => {
    render(<Fretboard currentIndex={null} />);
    const cells = screen.getAllByRole('button', { name: /corda \d, casa 1$/ });
    expect(cells.map((cell) => cell.getAttribute('aria-label'))).toEqual([
      'corda 1, casa 1',
      'corda 2, casa 1',
      'corda 3, casa 1',
      'corda 4, casa 1',
      'corda 5, casa 1',
      'corda 6, casa 1',
    ]);
  });

  it('renders each string line centered vertically in its row, not at the row edge', () => {
    render(<Fretboard currentIndex={null} />);
    const line = screen.getByTestId('string-line-1');
    expect(line.className).toMatch(/top-1\/2/);
    expect(line.className).toMatch(/-translate-y-1\/2/);
  });

  it('renders a fret-number header row above the grid', () => {
    render(<Fretboard currentIndex={null} />);
    expect(screen.getByTestId('fret-number-1')).toHaveTextContent('1');
    expect(screen.getByTestId('fret-number-7')).toHaveTextContent('7');
  });

  it('marks the twelfth fret with the double dot that stands for the octave', () => {
    useFretboardStore.setState({ minFret: 1, maxFret: 12, selectedNotes: [] });
    render(<Fretboard currentIndex={null} />);

    expect(screen.getByTestId('inlay-fret-12').children).toHaveLength(2);
  });

  it('marks every other position with a single dot', () => {
    useFretboardStore.setState({ minFret: 1, maxFret: 12, selectedNotes: [] });
    render(<Fretboard currentIndex={null} />);

    for (const fret of [3, 5, 7, 9]) {
      expect(screen.getByTestId(`inlay-fret-${fret}`).children).toHaveLength(1);
    }
  });

  describe('in append mode', () => {
    it('adds the note again instead of clearing it, so a riff can repeat a spot', async () => {
      render(<Fretboard currentIndex={null} mode="append" />);
      const cell = screen.getByRole('button', { name: /corda 5, casa 7/i });

      await act(async () => {
        fireEvent.click(cell);
      });
      await act(async () => {
        fireEvent.click(cell);
      });

      expect(useFretboardStore.getState().selectedNotes).toEqual([
        { string: 5, fret: 7 },
        { string: 5, fret: 7 },
      ]);
    });

    it('shows how many times a spot is played, so the neck does not look unchanged', () => {
      useFretboardStore.setState({
        selectedNotes: [7, 7, 7].map((fret) => ({ string: 5, fret })),
      });
      render(<Fretboard currentIndex={null} mode="append" />);

      expect(screen.getByTestId('repeat-count-5-7')).toHaveTextContent('3');
    });

    it('leaves a spot played once without a count, which would only be noise', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 5, fret: 7 }] });
      render(<Fretboard currentIndex={null} mode="append" />);

      expect(screen.queryByTestId('repeat-count-5-7')).not.toBeInTheDocument();
    });
  });
});
