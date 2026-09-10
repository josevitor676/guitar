import { create } from 'zustand';
import type { FretPosition } from '../domain/music-theory/tuning';
import { positionsEqual, windowStartToReveal } from '../domain/fretboard/fretboard-model';
import { extendedSequence, canExtend, canShrink } from '../domain/fretboard/neck-pattern';

interface FretboardState {
  minFret: number;
  maxFret: number;
  selectedNotes: FretPosition[];
  setFretRange: (minFret: number, maxFret: number) => void;
  setVisibleSpan: (span: number) => void;
  toggleNote: (position: FretPosition) => void;
  appendNote: (position: FretPosition) => void;
  removeAt: (index: number) => void;
  /**
   * The shape the repetitions are built from. It is whatever was last put on
   * the neck deliberately — loaded, or edited by hand — and never includes
   * the repetitions themselves.
   */
  patternBase: FretPosition[];
  patternExtensions: number;
  /** Adds (+1) or takes back (-1) one repetition a fret further up. */
  extendPattern: (delta: number) => void;
  clearSelection: () => void;
  loadSequence: (positions: FretPosition[]) => void;
}

export const useFretboardStore = create<FretboardState>((set) => ({
  minFret: 1,
  maxFret: 7,
  selectedNotes: [],
  patternBase: [],
  patternExtensions: 0,
  setFretRange: (minFret, maxFret) => set({ minFret, maxFret }),

  // How many frets are shown is the screen's call, not the student's; paging
  // moves the window, and this resizes it without moving where it starts.
  setVisibleSpan: (span) => set((state) => ({ maxFret: state.minFret + span - 1 })),
  toggleNote: (position) =>
    set((state) => {
      const exists = state.selectedNotes.some((note) => positionsEqual(note, position));
      const selectedNotes = exists
        ? state.selectedNotes.filter((note) => !positionsEqual(note, position))
        : [...state.selectedNotes, position];
      return { selectedNotes, patternBase: selectedNotes, patternExtensions: 0 };
    }),
  // The timeline's counterpart to toggling. A sequence can play the same spot
  // over and over — a riff is usually built that way — so adding never asks
  // whether the note is already there, and removing has to name *which* of
  // them goes, which is the index rather than the string and fret.
  appendNote: (position) =>
    set((state) => {
      const selectedNotes = [...state.selectedNotes, position];
      return { selectedNotes, patternBase: selectedNotes, patternExtensions: 0 };
    }),
  removeAt: (index) =>
    set((state) => {
      const selectedNotes = state.selectedNotes.filter((_, at) => at !== index);
      return { selectedNotes, patternBase: selectedNotes, patternExtensions: 0 };
    }),

  // The window follows the notes: a repetition four frets further up is no
  // use if the neck keeps showing where the pattern started.
  extendPattern: (delta) =>
    set((state) => {
      const { patternBase, patternExtensions } = state;
      const allowed =
        delta > 0 ? canExtend(patternBase, patternExtensions) : canShrink(patternExtensions);
      if (!allowed) return {};

      const patternExtensionsNext = patternExtensions + delta;
      const selectedNotes = extendedSequence(patternBase, patternExtensionsNext);
      const span = state.maxFret - state.minFret + 1;
      const minFret = windowStartToReveal(selectedNotes, state.minFret, span);
      return { selectedNotes, patternExtensions: patternExtensionsNext, minFret, maxFret: minFret + span - 1 };
    }),

  clearSelection: () => set({ selectedNotes: [], patternBase: [], patternExtensions: 0 }),
  // Loading also reveals: a sequence outside the visible frets would otherwise
  // play while the neck looks empty. The window slides, keeping its width.
  loadSequence: (positions) =>
    set((state) => {
      const span = state.maxFret - state.minFret + 1;
      const minFret = windowStartToReveal(positions, state.minFret, span);
      return {
        selectedNotes: positions,
        patternBase: positions,
        patternExtensions: 0,
        minFret,
        maxFret: minFret + span - 1,
      };
    }),
}));
