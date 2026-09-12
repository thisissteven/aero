import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FolderPickerStore {
  lastSelectedPath: string;
  setLastSelectedPath: (path: string) => void;
}

export const useFolderPickerStore = create<FolderPickerStore>()(
  persist(
    (set) => ({
      lastSelectedPath: '',
      setLastSelectedPath: (path: string) => set({ lastSelectedPath: path }),
    }),
    {
      name: 'aero-folder-picker-storage',
    },
  ),
);
