import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Subdivision } from '../domain/music-theory/rhythm';
import type { StringNumber } from '../domain/music-theory/tuning';

export type RhythmMode = 'note' | 'string';

interface MetronomeState {
  bpm: number;
  subdivision: Subdivision;
  rhythmMode: RhythmMode;
  subdivisionByString: Record<StringNumber, Subdivision>;
  isPlaying: boolean;
  currentPulse: number;
  setBpm: (bpm: number) => void;
  setSubdivision: (subdivision: Subdivision) => void;
  setRhythmMode: (mode: RhythmMode) => void;
  setStringSubdivision: (string: StringNumber, subdivision: Subdivision) => void;
  start: () => void;
  stop: () => void;
  setCurrentPulse: (pulseIndex: number) => void;
}

const DEFAULT_SUBDIVISION_BY_STRING: Record<StringNumber, Subdivision> = {
  1: 'quarter',
  2: 'quarter',
  3: 'quarter',
  4: 'quarter',
  5: 'quarter',
  6: 'quarter',
};

export const useMetronomeStore = create<MetronomeState>()(
  subscribeWithSelector((set) => ({
    bpm: 100,
    subdivision: 'quarter',
    rhythmMode: 'note',
    subdivisionByString: DEFAULT_SUBDIVISION_BY_STRING,
    isPlaying: false,
    currentPulse: 0,
    setBpm: (bpm) => set({ bpm }),
    setSubdivision: (subdivision) => set({ subdivision }),
    setRhythmMode: (rhythmMode) => set({ rhythmMode }),
    setStringSubdivision: (string, subdivision) =>
      set((state) => ({
        subdivisionByString: { ...state.subdivisionByString, [string]: subdivision },
      })),
    start: () => set({ isPlaying: true }),
    stop: () => set({ isPlaying: false, currentPulse: 0 }),
    setCurrentPulse: (pulseIndex) => set({ currentPulse: pulseIndex }),
  })),
);
