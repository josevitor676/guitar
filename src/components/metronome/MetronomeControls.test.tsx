import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useMetronomeStore } from '../../state/metronome-store';

vi.mock('../../audio', () => ({
  metronome: { start: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), setSubdivision: vi.fn(), onPulse: () => () => {} },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { MetronomeControls } from './MetronomeControls';

describe('MetronomeControls', () => {
  beforeEach(() => {
    useMetronomeStore.setState({
      bpm: 100,
      subdivision: 'quarter',
      rhythmMode: 'note',
      subdivisionByString: { 1: 'quarter', 2: 'quarter', 3: 'quarter', 4: 'quarter', 5: 'quarter', 6: 'quarter' },
      isPlaying: false,
      currentPulse: 0,
    });
  });

  it('shows the current BPM', () => {
    render(<MetronomeControls />);
    expect(screen.getByText('100 BPM')).toBeInTheDocument();
  });

  it('increases BPM by 5 when the + button is clicked', () => {
    render(<MetronomeControls />);
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(useMetronomeStore.getState().bpm).toBe(105);
  });

  it('decreases BPM by 5 when the - button is clicked', () => {
    render(<MetronomeControls />);
    fireEvent.click(screen.getByRole('button', { name: '-' }));
    expect(useMetronomeStore.getState().bpm).toBe(95);
  });

  it('updates the subdivision when a new one is selected', () => {
    render(<MetronomeControls />);
    fireEvent.change(screen.getByLabelText(/figura r[ií]tmica/i), { target: { value: 'eighth' } });
    expect(useMetronomeStore.getState().subdivision).toBe('eighth');
  });

  it('does not render a metronome start/stop button', () => {
    render(<MetronomeControls />);
    expect(screen.queryByRole('button', { name: /metr[oô]nomo/i })).not.toBeInTheDocument();
  });

  it('shows the single global rhythm-figure selector in "Por nota" mode by default', () => {
    render(<MetronomeControls />);
    expect(screen.getByLabelText(/figura r[ií]tmica/i)).toBeInTheDocument();
    expect(screen.queryAllByRole('combobox')).toHaveLength(1);
  });

  it('switches to six per-string selectors when "Por corda" is clicked', () => {
    render(<MetronomeControls />);
    fireEvent.click(screen.getByRole('button', { name: /por corda/i }));

    expect(useMetronomeStore.getState().rhythmMode).toBe('string');
    expect(screen.getAllByRole('combobox')).toHaveLength(6);
  });

  it('updates only the targeted string\'s subdivision when its selector changes', () => {
    useMetronomeStore.setState({ rhythmMode: 'string' });
    render(<MetronomeControls />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'sixteenth' } });

    const { subdivisionByString } = useMetronomeStore.getState();
    expect(subdivisionByString[1]).toBe('sixteenth');
    expect(subdivisionByString[6]).toBe('quarter');
  });
});
