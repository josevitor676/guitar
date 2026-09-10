import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useChordStore } from '../../state/chord-store';

vi.mock('../../audio', () => ({
  sampler: { isLoaded: () => true, playNote: vi.fn(), playSlurred: vi.fn() },
  metronome: { start: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), setSubdivision: vi.fn(), onPulse: () => () => {} },
  sequencePlayer: { play: vi.fn(), stop: vi.fn(), onNoteChange: () => () => {} },
  glideVoice: { playGlide: vi.fn() },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { ChordPanel } from './ChordPanel';

describe('ChordPanel', () => {
  beforeEach(() => useChordStore.getState().clear());

  it('asks for a chord before it has one', () => {
    render(<ChordPanel />);

    expect(screen.getByTestId('chord-name')).toHaveTextContent('—');
    expect(screen.getByText(/monte um acorde no bra[cç]o/i)).toBeInTheDocument();
  });

  it('names the chord as the student builds it', () => {
    render(<ChordPanel />);

    // The open G: 3-2-0-0-0-3 from the sixth string up.
    fireEvent.click(screen.getByRole('button', { name: 'corda 6, casa 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'corda 5, casa 2' }));
    fireEvent.click(screen.getByRole('button', { name: /corda 4:/ }));
    fireEvent.click(screen.getByRole('button', { name: /corda 3:/ }));
    fireEvent.click(screen.getByRole('button', { name: /corda 2:/ }));
    fireEvent.click(screen.getByRole('button', { name: 'corda 1, casa 3' }));

    expect(screen.getByTestId('chord-name')).toHaveTextContent('G');
  });

  it('lets a string be set open and muted again', () => {
    render(<ChordPanel />);

    fireEvent.click(screen.getByRole('button', { name: /corda 5:/ }));
    expect(useChordStore.getState().voicing[5]).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: /corda 5:/ }));
    expect(useChordStore.getState().voicing[5]).toBe('muted');
  });

  it('replaces the note on a string rather than stacking two', () => {
    render(<ChordPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'corda 6, casa 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'corda 6, casa 5' }));

    expect(useChordStore.getState().voicing[6]).toBe(5);
  });

  it('offers other positions once it knows the chord', () => {
    useChordStore.getState().loadVoicing({ 6: 3, 5: 2, 4: 0, 3: 0, 2: 0, 1: 3 });
    render(<ChordPanel />);

    expect(screen.getAllByRole('button', { name: /Usar G.* nesta posição/ }).length).toBeGreaterThan(3);
  });

  it('loads a suggestion onto the neck when it is picked', () => {
    useChordStore.getState().loadVoicing({ 6: 3, 5: 2, 4: 0, 3: 0, 2: 0, 1: 3 });
    render(<ChordPanel />);

    const before = { ...useChordStore.getState().voicing };
    const suggestions = screen.getAllByRole('button', { name: /nesta posição/ });
    fireEvent.click(suggestions[suggestions.length - 1]);

    expect(useChordStore.getState().voicing).not.toEqual(before);
  });

  it('clears the neck', () => {
    useChordStore.getState().loadVoicing({ 6: 3, 5: 2, 4: 0, 3: 0, 2: 0, 1: 3 });
    render(<ChordPanel />);

    fireEvent.click(screen.getByRole('button', { name: /limpar acorde/i }));

    expect(screen.getByTestId('chord-name')).toHaveTextContent('—');
  });

  it('says when a shape is an inversion, and which note is in the bass', () => {
    useChordStore.getState().loadVoicing({ 6: 'muted', 5: 'muted', 4: 0, 3: 0, 2: 0, 1: 3 });
    render(<ChordPanel />);

    expect(screen.getByTestId('chord-name')).toHaveTextContent('G/D');
    expect(screen.getByText(/com D no baixo/i)).toBeInTheDocument();
  });
});
