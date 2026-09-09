import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Subdivision } from '../domain/music-theory/rhythm';

interface MetronomeState {
  bpm: number;
  subdivision: Subdivision;
  isPlaying: boolean;
  currentPulse: number;
  setBpm: (bpm: number) => void;
  setSubdivision: (subdivision: Subdivision) => void;
  start: () => void;
  stop: () => void;
  setCurrentPulse: (pulseIndex: number) => void;
}

export const useMetronomeStore = create<MetronomeState>()(
  subscribeWithSelector((set) => ({
    bpm: 100,
    subdivision: 'quarter',
    isPlaying: false,
    currentPulse: 0,
    setBpm: (bpm) => set({ bpm }),
    setSubdivision: (subdivision) => set({ subdivision }),
    start: () => set({ isPlaying: true }),
    stop: () => set({ isPlaying: false, currentPulse: 0 }),
    setCurrentPulse: (pulseIndex) => set({ currentPulse: pulseIndex }),
  })),
);
