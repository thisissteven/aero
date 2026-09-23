// providers-store.ts
import { create } from 'zustand';

type ViewMode = 'details' | 'connect';

interface ProvidersState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedProviderId: string | null;
  setSelectedProviderId: (id: string | null) => void;
}

export const useProvidersStore = create<ProvidersState>((set) => ({
  viewMode: 'details',
  setViewMode: (viewMode) => set({ viewMode }),
  selectedProviderId: null,
  setSelectedProviderId: (id) => set({ selectedProviderId: id }),
}));
