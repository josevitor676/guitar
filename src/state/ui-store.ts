import { create } from 'zustand';

export type TabId = 'practice' | 'exercises';

interface UiState {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'practice',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
