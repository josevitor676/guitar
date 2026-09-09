import { create } from 'zustand';

export type TabId = 'practice' | 'exercises';
export type FretboardView = 'grid' | 'timeline';

interface UiState {
  activeTab: TabId;
  fretboardView: FretboardView;
  setActiveTab: (tab: TabId) => void;
  setFretboardView: (view: FretboardView) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'practice',
  fretboardView: 'grid',
  setActiveTab: (tab) => set({ activeTab: tab }),
  setFretboardView: (view) => set({ fretboardView: view }),
}));
