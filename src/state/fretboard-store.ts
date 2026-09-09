import { create } from 'zustand';
import type { FretPosition } from '../domain/music-theory/tuning';
import { positionsEqual, rangeToReveal } from '../domain/fretboard/fretboard-model';

interface FretboardState {
  minFret: number;
  maxFret: number;
  selectedNotes: FretPosition[];
  setFretRange: (minFret: number, maxFret: number) => void;
  toggleNote: (position: FretPosition) => void;
  clearSelection: () => void;
  loadSequence: (positions: FretPosition[]) => void;
}

export const useFretboardStore = create<FretboardState>((set) => ({
  minFret: 1,
  maxFret: 7,
  selectedNotes: [],
  setFretRange: (minFret, maxFret) => set({ minFret, maxFret }),
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
  // play while the neck looks empty.
  loadSequence: (positions) =>
    set((state) => ({
      selectedNotes: positions,
      ...rangeToReveal(positions, { minFret: state.minFret, maxFret: state.maxFret }),
    })),
}));
