import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OpenInState {
  selectedAppId: string;
  setSelectedAppId: (appId: string) => void;
}

export const useOpenInStore = create<OpenInState>()(
  persist(
    (set) => ({
      selectedAppId: 'finder',
      setSelectedAppId: (appId) => set({ selectedAppId: appId }),
    }),
    {
      name: 'open-in-preference',
    },
  ),
);
