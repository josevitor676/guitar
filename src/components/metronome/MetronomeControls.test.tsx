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
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter', isPlaying: false, currentPulse: 0 });
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
});
