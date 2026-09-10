import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Subdivision } from '../domain/music-theory/rhythm';

interface MetronomeState {
  bpm: number;
  subdivision: Subdivision;
  /** Armed by the student. Marks the beat-head notes and lets the click sound during playback. */
  enabled: boolean;
  /** True only while the click is actually sounding, which is only while a sequence plays. */
  isPlaying: boolean;
  currentPulse: number;
  setBpm: (bpm: number) => void;
  setSubdivision: (subdivision: Subdivision) => void;
  setEnabled: (enabled: boolean) => void;
  start: () => void;
  stop: () => void;
  setCurrentPulse: (pulseIndex: number) => void;
}

export const useMetronomeStore = create<MetronomeState>()(
  subscribeWithSelector((set) => ({
    bpm: 100,
    subdivision: 'quarter',
    enabled: false,
    isPlaying: false,
    currentPulse: 0,
    setBpm: (bpm) => set({ bpm }),
    setSubdivision: (subdivision) => set({ subdivision }),
    setEnabled: (enabled) => set({ enabled }),
    start: () => set({ isPlaying: true }),
    stop: () => set({ isPlaying: false, currentPulse: 0 }),
    setCurrentPulse: (pulseIndex) => set({ currentPulse: pulseIndex }),
  })),
);
