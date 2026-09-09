import { create } from 'zustand';
import type { PlaybackDirection } from '../domain/fretboard/fretboard-model';

interface PlaybackState {
  isPlaying: boolean;
  currentIndex: number | null;
  direction: PlaybackDirection;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentIndex: (currentIndex: number | null) => void;
  setDirection: (direction: PlaybackDirection) => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  isPlaying: false,
  currentIndex: null,
  // The Mizona-first reading of the neck, which is where a scale is started.
  direction: 'sixthToFirst',
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  setDirection: (direction) => set({ direction }),
}));
