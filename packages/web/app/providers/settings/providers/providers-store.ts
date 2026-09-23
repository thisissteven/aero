// providers-store.ts
import { create } from 'zustand';

type ViewMode = 'details' | 'connect';
type MobilePanel = 'list' | 'detail';

interface ProvidersState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedProviderId: string | null;
  setSelectedProviderId: (id: string | null) => void;
  mobilePanel: MobilePanel;
  setMobilePanel: (panel: MobilePanel) => void;
}

export const useProvidersStore = create<ProvidersState>((set) => ({
  viewMode: 'details',
  setViewMode: (viewMode) => set({ viewMode }),
  selectedProviderId: null,
  setSelectedProviderId: (id) => set({ selectedProviderId: id }),
  mobilePanel: 'list',
  setMobilePanel: (mobilePanel) => set({ mobilePanel }),
}));
