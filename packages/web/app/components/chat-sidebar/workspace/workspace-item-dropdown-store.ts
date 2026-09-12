import { create } from 'zustand';

interface WorkspaceItemDropdownState {
  dropdownOpen: string;
  setDropdownOpen: (open: string) => void;
}

export const useWorkspaceItemDropdownStore = create<WorkspaceItemDropdownState>(
  (set) => ({
    dropdownOpen: '',
    setDropdownOpen: (open) => set({ dropdownOpen: open }),
  }),
);
