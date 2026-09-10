import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useChordStore } from '../../state/chord-store';

vi.mock('../../audio', () => ({
  sampler: { isLoaded: () => true, playNote: vi.fn(), playSlurred: vi.fn() },
  metronome: { start: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), setSubdivision: vi.fn(), onPulse: () => () => {} },
  sequencePlayer: { play: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), onNoteChange: () => () => {} },
  glideVoice: { playGlide: vi.fn() },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { ChordPanel } from './ChordPanel';

describe('ChordPanel', () => {
  beforeEach(() => useChordStore.getState().clear());

  const reveal = () => fireEvent.click(screen.getByRole('button', { name: /ver acorde/i }));

  it('asks for a chord before it has one', () => {
    render(<ChordPanel />);

    expect(screen.getByTestId('chord-name')).toHaveTextContent('—');
    expect(screen.getByText(/clique em ver acorde/i)).toBeInTheDocument();
  });

  it('says nothing about the chord until it is asked', () => {
    useChordStore.getState().loadVoicing({ 6: 3, 5: 2, 4: 0, 3: 0, 2: 0, 1: 3 });
    render(<ChordPanel />);

    expect(screen.getByTestId('chord-name')).toHaveTextContent('—');
    expect(screen.queryByRole('button', { name: /^Usar .* nesta posição/ })).not.toBeInTheDocument();
  });

  it('forgets the answer as soon as the shape changes', () => {
    useChordStore.getState().loadVoicing({ 6: 3, 5: 2, 4: 0, 3: 0, 2: 0, 1: 3 });
    render(<ChordPanel />);
    reveal();
    expect(screen.getByTestId('chord-name')).toHaveTextContent('G');

    fireEvent.click(screen.getByRole('button', { name: 'corda 4, casa 2' }));

    expect(screen.getByTestId('chord-name')).toHaveTextContent('—');
  });

  it('says so when the notes form no chord it knows', () => {
    useChordStore.getState().loadVoicing({ 6: 1, 5: 2, 4: 3, 3: 'muted', 2: 'muted', 1: 'muted' });
    render(<ChordPanel />);
    reveal();

    expect(screen.getByTestId('chord-name')).toHaveTextContent(/não reconheci/i);
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
    reveal();

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
    reveal();

    expect(screen.getAllByRole('button', { name: /Usar G.* nesta posição/ }).length).toBeGreaterThan(3);
  });

  it('loads a suggestion onto the neck when it is picked', () => {
    useChordStore.getState().loadVoicing({ 6: 3, 5: 2, 4: 0, 3: 0, 2: 0, 1: 3 });
    render(<ChordPanel />);
    reveal();

    const before = { ...useChordStore.getState().voicing };
    const suggestions = screen.getAllByRole('button', { name: /^Usar .* nesta posição/ });
    fireEvent.click(suggestions[suggestions.length - 1]);

    expect(useChordStore.getState().voicing).not.toEqual(before);
  });

  it('clears the neck', () => {
    useChordStore.getState().loadVoicing({ 6: 3, 5: 2, 4: 0, 3: 0, 2: 0, 1: 3 });
    render(<ChordPanel />);
    reveal();

    fireEvent.click(screen.getByRole('button', { name: /limpar acorde/i }));

    expect(screen.getByTestId('chord-name')).toHaveTextContent('—');
  });

  it('says when a shape is an inversion, and which note is in the bass', () => {
    useChordStore.getState().loadVoicing({ 6: 'muted', 5: 'muted', 4: 0, 3: 0, 2: 0, 1: 3 });
    render(<ChordPanel />);
    reveal();

    expect(screen.getByTestId('chord-name')).toHaveTextContent('G/D');
    expect(screen.getByText(/com D no baixo/i)).toBeInTheDocument();
  });

  describe('fingering and barre', () => {
    it('says where the barre goes when the shape needs one', () => {
      // The F barre chord: index across the first fret.
      useChordStore.getState().loadVoicing({ 6: 1, 5: 3, 4: 3, 3: 2, 2: 1, 1: 1 });
      render(<ChordPanel />);
      reveal();

      expect(screen.getByTestId('barre-hint')).toHaveTextContent('casa 1');
    });

    it('says nothing about a barre for a shape that has none', () => {
      useChordStore.getState().loadVoicing({ 6: 'muted', 5: 3, 4: 2, 3: 0, 2: 1, 1: 0 });
      render(<ChordPanel />);
      reveal();

      expect(screen.queryByTestId('barre-hint')).not.toBeInTheDocument();
    });
  });

  describe('progressions', () => {
    it('names the key the chord belongs to', () => {
      useChordStore.getState().loadVoicing({ 6: 3, 5: 2, 4: 0, 3: 0, 2: 0, 1: 3 });
      render(<ChordPanel />);
      reveal();

      expect(screen.getByText(/G maior/)).toBeInTheDocument();
    });

    it('offers the chords of that key, labelled by degree', () => {
      useChordStore.getState().loadVoicing({ 6: 3, 5: 2, 4: 0, 3: 0, 2: 0, 1: 3 });
      render(<ChordPanel />);
      reveal();

      expect(screen.getByRole('button', { name: /Montar Em, grau vi/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Montar C, grau IV/ })).toBeInTheDocument();
    });

    it('builds a suggested chord on the neck when it is picked', () => {
      useChordStore.getState().loadVoicing({ 6: 3, 5: 2, 4: 0, 3: 0, 2: 0, 1: 3 });
      render(<ChordPanel />);
      reveal();

      fireEvent.click(screen.getByRole('button', { name: /Montar Em, grau vi/ }));
      reveal();

      expect(screen.getByTestId('chord-name')).toHaveTextContent('Em');
    });

    it('reads a dominant seventh as pointing at the key a fourth above', () => {
      // G7, which wants to become C.
      useChordStore.getState().loadVoicing({ 6: 3, 5: 2, 4: 0, 3: 0, 2: 0, 1: 1 });
      render(<ChordPanel />);
      reveal();

      expect(screen.getByTestId('chord-name')).toHaveTextContent('G7');
      expect(screen.getByText(/C maior/)).toBeInTheDocument();
    });

    it('declines to guess a key for a chord that belongs to none', () => {
      // A diminished chord: B-D-F.
      useChordStore.getState().loadVoicing({ 6: 'muted', 5: 2, 4: 3, 3: 4, 2: 3, 1: 'muted' });
      render(<ChordPanel />);
      reveal();

      expect(screen.getByText(/n[ãa]o pertence firmemente a um tom/i)).toBeInTheDocument();
    });
  });

  describe('hearing a suggestion', () => {
    it('offers a listen control on every suggested shape', () => {
      useChordStore.getState().loadVoicing({ 6: 3, 5: 2, 4: 0, 3: 0, 2: 0, 1: 3 });
      render(<ChordPanel />);
      reveal();

      const listen = screen.getAllByRole('button', { name: /Ouvir G.* nesta posição/ });
      const use = screen.getAllByRole('button', { name: /Usar G.* nesta posição/ });
      expect(listen).toHaveLength(use.length);
    });

    it('hears a shape without adopting it', () => {
      useChordStore.getState().loadVoicing({ 6: 3, 5: 2, 4: 0, 3: 0, 2: 0, 1: 3 });
      render(<ChordPanel />);
      reveal();

      const before = { ...useChordStore.getState().voicing };
      const listen = screen.getAllByRole('button', { name: /Ouvir G.* nesta posição/ });
      fireEvent.click(listen[listen.length - 1]);

      expect(useChordStore.getState().voicing).toEqual(before);
    });
  });
});
