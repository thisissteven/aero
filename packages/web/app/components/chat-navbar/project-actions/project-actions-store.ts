import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProjectActionsState {
  selectedAppId: string;
  setSelectedAppId: (appId: string) => void;
}

export const useProjectActionsStore = create<ProjectActionsState>()(
  persist(
    (set) => ({
      selectedAppId: 'finder',
      setSelectedAppId: (appId) => set({ selectedAppId: appId }),
    }),
    {
      name: 'project-actions-preference',
    },
  ),
);
