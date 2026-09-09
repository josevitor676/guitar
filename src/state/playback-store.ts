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
  direction: 'up',
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  setDirection: (direction) => set({ direction }),
}));
