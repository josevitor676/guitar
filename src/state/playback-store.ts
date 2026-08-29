import { create } from 'zustand';

interface PlaybackState {
  isPlaying: boolean;
  currentIndex: number | null;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentIndex: (currentIndex: number | null) => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  isPlaying: false,
  currentIndex: null,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
}));
