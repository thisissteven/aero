import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PanelActionsState {
  selectedAppId: string;
  setSelectedAppId: (appId: string) => void;
}

export const usePanelActionsStore = create<PanelActionsState>()(
  persist(
    (set) => ({
      selectedAppId: 'finder',
      setSelectedAppId: (appId) => set({ selectedAppId: appId }),
    }),
    {
      name: 'panel-actions-preference',
    },
  ),
);
