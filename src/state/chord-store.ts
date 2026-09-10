import { create } from 'zustand';
import type { StringNumber } from '../domain/music-theory/tuning';
import type { ChordVoicing, StringPlay } from '../domain/chords/chord-voicing';
import { SILENT_VOICING } from '../domain/chords/chord-voicing';

interface ChordState {
  voicing: ChordVoicing;
  /** Sets one string, replacing whatever it was doing. A string sounds one note. */
  setString: (string: StringNumber, play: StringPlay) => void;
  /** Puts the fret on the string, or takes it off if it was already there. */
  toggleFret: (string: StringNumber, fret: number) => void;
  loadVoicing: (voicing: ChordVoicing) => void;
  clear: () => void;
}

export const useChordStore = create<ChordState>((set, get) => ({
  voicing: { ...SILENT_VOICING },

  setString: (string, play) => set((state) => ({ voicing: { ...state.voicing, [string]: play } })),

  toggleFret: (string, fret) => {
    const current = get().voicing[string];
    set((state) => ({
      voicing: { ...state.voicing, [string]: current === fret ? 'muted' : fret },
    }));
  },

  loadVoicing: (voicing) => set({ voicing: { ...voicing } }),
  clear: () => set({ voicing: { ...SILENT_VOICING } }),
}));
