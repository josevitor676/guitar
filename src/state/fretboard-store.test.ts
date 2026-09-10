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

  describe('appendNote', () => {
    it('adds a note the sequence already contains, which is what makes a repeat', () => {
      const store = useFretboardStore.getState();
      store.appendNote({ string: 5, fret: 7 });
      store.appendNote({ string: 5, fret: 7 });

      expect(useFretboardStore.getState().selectedNotes).toEqual([
        { string: 5, fret: 7 },
        { string: 5, fret: 7 },
      ]);
    });

    it('keeps the order the notes were played in', () => {
      const store = useFretboardStore.getState();
      [7, 5, 7, 5, 7].forEach((fret) => store.appendNote({ string: 5, fret }));

      expect(useFretboardStore.getState().selectedNotes.map((note) => note.fret)).toEqual([
        7, 5, 7, 5, 7,
      ]);
    });
  });

  describe('removeAt', () => {
    it('removes one occurrence rather than every copy of the same spot', () => {
      const store = useFretboardStore.getState();
      [7, 5, 7].forEach((fret) => store.appendNote({ string: 5, fret }));

      store.removeAt(0);

      expect(useFretboardStore.getState().selectedNotes.map((note) => note.fret)).toEqual([5, 7]);
    });

    it('ignores an index that is not in the sequence', () => {
      const store = useFretboardStore.getState();
      store.appendNote({ string: 5, fret: 7 });

      store.removeAt(4);

      expect(useFretboardStore.getState().selectedNotes).toHaveLength(1);
    });
  });

  describe('transposeSelection', () => {
    it('moves the whole sequence along the neck', () => {
      useFretboardStore.getState().loadSequence([
        { string: 6, fret: 3 },
        { string: 5, fret: 5 },
      ]);

      useFretboardStore.getState().transposeSelection(1);

      expect(useFretboardStore.getState().selectedNotes.map((note) => note.fret)).toEqual([4, 6]);
    });

    it('refuses a move that would push a note off the neck, rather than bending the shape', () => {
      useFretboardStore.getState().loadSequence([{ string: 1, fret: 0 }]);

      useFretboardStore.getState().transposeSelection(-1);

      expect(useFretboardStore.getState().selectedNotes).toEqual([{ string: 1, fret: 0 }]);
    });

    it('brings the window with it, so the sequence does not move out of sight', () => {
      useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [] });
      useFretboardStore.getState().loadSequence([{ string: 6, fret: 7 }]);

      useFretboardStore.getState().transposeSelection(1);

      const { minFret, maxFret } = useFretboardStore.getState();
      expect(8).toBeGreaterThanOrEqual(minFret);
      expect(8).toBeLessThanOrEqual(maxFret);
    });
  });

  describe('loadSequence', () => {
    it('slides the window onto the loaded positions instead of leaving them hidden', () => {
      useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [] });

      useFretboardStore.getState().loadSequence([
        { string: 6, fret: 8 },
        { string: 5, fret: 12 },
      ]);

      const { minFret, maxFret, selectedNotes } = useFretboardStore.getState();
      expect(selectedNotes).toHaveLength(2);
      expect(minFret).toBe(8);
      expect(maxFret).toBe(14);
    });

    it('keeps the window the same width when it slides', () => {
      useFretboardStore.setState({ minFret: 1, maxFret: 12, selectedNotes: [] });

      useFretboardStore.getState().loadSequence([{ string: 6, fret: 15 }]);

      const { minFret, maxFret } = useFretboardStore.getState();
      expect(maxFret - minFret + 1).toBe(12);
    });

    it('leaves the visible range alone when the sequence already fits', () => {
      useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [] });

      useFretboardStore.getState().loadSequence([{ string: 6, fret: 3 }]);

      expect(useFretboardStore.getState().maxFret).toBe(7);
    });
  });

  describe('setVisibleSpan', () => {
    it('resizes the window without moving where it starts', () => {
      useFretboardStore.setState({ minFret: 5, maxFret: 11 });

      useFretboardStore.getState().setVisibleSpan(12);

      expect(useFretboardStore.getState()).toMatchObject({ minFret: 5, maxFret: 16 });
    });
  });
});
