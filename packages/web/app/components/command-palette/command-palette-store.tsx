import { create, StateCreator } from 'zustand';

export const defaultSelectedFilters = [
  'Actions',
  'Workspaces',
  'Files',
  'Sessions',
] as const;

type Filter = (typeof defaultSelectedFilters)[number];

type CommandPaletteStore = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  toggleIsOpen: () => void;

  selectedFilters: Filter[];
  toggleSelectedFilters: (filter: Filter) => void;

  searchValue: string;
  setSearchValue: (searchValue: string) => void;

  debouncedSearch: string;
  setDebouncedSearch: (value: string) => void;
};

const commandPaletteSlice: StateCreator<CommandPaletteStore> = (set) => ({
  isOpen: false,

  setIsOpen: (isOpen) =>
    set({
      isOpen,
    }),

  toggleIsOpen: () =>
    set(({ isOpen }) => ({
      isOpen: !isOpen,
    })),

  selectedFilters: [...defaultSelectedFilters],

  toggleSelectedFilters: (filter) =>
    set(({ selectedFilters }) => ({
      selectedFilters: selectedFilters.includes(filter)
        ? selectedFilters.filter((f) => f !== filter)
        : [...selectedFilters, filter],
    })),

  searchValue: '',

  setSearchValue: (searchValue) =>
    set({
      searchValue,
    }),

  debouncedSearch: '',
  setDebouncedSearch: (debouncedSearch) => set({ debouncedSearch }),
});

export const createCommandPaletteStore = () =>
  create<CommandPaletteStore>(commandPaletteSlice);

export const useCommandPaletteStore = createCommandPaletteStore();
