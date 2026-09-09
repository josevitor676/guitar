import { create } from 'zustand';
import type { FretPosition } from '../domain/music-theory/tuning';
import { positionsEqual, windowStartToReveal } from '../domain/fretboard/fretboard-model';

interface FretboardState {
  minFret: number;
  maxFret: number;
  selectedNotes: FretPosition[];
  setFretRange: (minFret: number, maxFret: number) => void;
  setVisibleSpan: (span: number) => void;
  toggleNote: (position: FretPosition) => void;
  clearSelection: () => void;
  loadSequence: (positions: FretPosition[]) => void;
}

export const useFretboardStore = create<FretboardState>((set) => ({
  minFret: 1,
  maxFret: 7,
  selectedNotes: [],
  setFretRange: (minFret, maxFret) => set({ minFret, maxFret }),

  // How many frets are shown is the screen's call, not the student's; paging
  // moves the window, and this resizes it without moving where it starts.
  setVisibleSpan: (span) => set((state) => ({ maxFret: state.minFret + span - 1 })),
  toggleNote: (position) =>
    set((state) => {
      const exists = state.selectedNotes.some((note) => positionsEqual(note, position));
      return {
        selectedNotes: exists
          ? state.selectedNotes.filter((note) => !positionsEqual(note, position))
          : [...state.selectedNotes, position],
      };
    }),
  clearSelection: () => set({ selectedNotes: [] }),
  // Loading also reveals: a sequence outside the visible frets would otherwise
  // play while the neck looks empty. The window slides, keeping its width.
  loadSequence: (positions) =>
    set((state) => {
      const span = state.maxFret - state.minFret + 1;
      const minFret = windowStartToReveal(positions, state.minFret, span);
      return { selectedNotes: positions, minFret, maxFret: minFret + span - 1 };
    }),
}));
