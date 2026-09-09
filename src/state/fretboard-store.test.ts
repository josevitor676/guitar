import { describe, it, expect, beforeEach } from 'vitest';
import { useFretboardStore } from './fretboard-store';

describe('useFretboardStore', () => {
  beforeEach(() => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [] });
  });

  it('starts with the default 1-7 fret range and no selected notes', () => {
    const state = useFretboardStore.getState();
    expect(state.minFret).toBe(1);
    expect(state.maxFret).toBe(7);
    expect(state.selectedNotes).toEqual([]);
  });

  it('appends a position to selectedNotes on first toggle', () => {
    useFretboardStore.getState().toggleNote({ string: 6, fret: 1 });
    expect(useFretboardStore.getState().selectedNotes).toEqual([{ string: 6, fret: 1 }]);
  });

  it('removes a position on second toggle of the same spot', () => {
    useFretboardStore.getState().toggleNote({ string: 6, fret: 1 });
    useFretboardStore.getState().toggleNote({ string: 6, fret: 1 });
    expect(useFretboardStore.getState().selectedNotes).toEqual([]);
  });

  it('preserves click order across non-adjacent strings/frets', () => {
    const store = useFretboardStore.getState();
    store.toggleNote({ string: 6, fret: 1 });
    store.toggleNote({ string: 5, fret: 2 });
    store.toggleNote({ string: 4, fret: 3 });
    expect(useFretboardStore.getState().selectedNotes).toEqual([
      { string: 6, fret: 1 },
      { string: 5, fret: 2 },
      { string: 4, fret: 3 },
    ]);
  });

  it('updates the visible fret range via setFretRange', () => {
    useFretboardStore.getState().setFretRange(5, 12);
    expect(useFretboardStore.getState().minFret).toBe(5);
    expect(useFretboardStore.getState().maxFret).toBe(12);
  });

  it('clears all selected notes via clearSelection', () => {
    const store = useFretboardStore.getState();
    store.toggleNote({ string: 6, fret: 1 });
    store.clearSelection();
    expect(useFretboardStore.getState().selectedNotes).toEqual([]);
  });

  it('replaces the sequence wholesale via loadSequence', () => {
    const store = useFretboardStore.getState();
    store.toggleNote({ string: 6, fret: 1 });
    store.loadSequence([
      { string: 1, fret: 0 },
      { string: 2, fret: 1 },
    ]);
    expect(useFretboardStore.getState().selectedNotes).toEqual([
      { string: 1, fret: 0 },
      { string: 2, fret: 1 },
    ]);
  });

  it('keeps both positions selected when they produce the same note name at different frets/strings (F# on string 6 fret 2, and F# on string 1 fret 2)', () => {
    const store = useFretboardStore.getState();
    store.toggleNote({ string: 6, fret: 2 }); // F#2
    store.toggleNote({ string: 1, fret: 2 }); // F#4
    expect(useFretboardStore.getState().selectedNotes).toEqual([
      { string: 6, fret: 2 },
      { string: 1, fret: 2 },
    ]);
  });

  describe('loadSequence', () => {
    it('brings the loaded positions into view instead of leaving them hidden', () => {
      useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [] });

      useFretboardStore.getState().loadSequence([
        { string: 6, fret: 8 },
        { string: 5, fret: 12 },
      ]);

      const { minFret, maxFret, selectedNotes } = useFretboardStore.getState();
      expect(selectedNotes).toHaveLength(2);
      expect(minFret).toBe(1);
      expect(maxFret).toBeGreaterThanOrEqual(12);
    });

    it('leaves the visible range alone when the sequence already fits', () => {
      useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [] });

      useFretboardStore.getState().loadSequence([{ string: 6, fret: 3 }]);

      expect(useFretboardStore.getState().maxFret).toBe(7);
    });
  });
});
