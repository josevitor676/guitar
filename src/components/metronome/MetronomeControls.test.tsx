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
      isPlaying: false,
      currentPulse: 0,
    });
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
});
