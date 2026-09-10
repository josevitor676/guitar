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
  appendNote: (position: FretPosition) => void;
  removeAt: (index: number) => void;
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
  // The timeline's counterpart to toggling. A sequence can play the same spot
  // over and over — a riff is usually built that way — so adding never asks
  // whether the note is already there, and removing has to name *which* of
  // them goes, which is the index rather than the string and fret.
  appendNote: (position) =>
    set((state) => ({ selectedNotes: [...state.selectedNotes, position] })),
  removeAt: (index) =>
    set((state) => ({ selectedNotes: state.selectedNotes.filter((_, at) => at !== index) })),

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
