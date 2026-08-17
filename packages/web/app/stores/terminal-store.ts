import { create } from 'zustand';

export interface TerminalTab {
  id: string;
  title: string;
}

interface TerminalStoreState {
  tabs: TerminalTab[];
  activeTabId: string | null;
  nextTabNumber: number;
  addTab: () => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

function createTab(number: number): TerminalTab {
  return {
    id: crypto.randomUUID(),
    title: `Terminal ${number}`,
  };
}

export const useTerminalStore = create<TerminalStoreState>((set) => {
  const initialTab = createTab(1);

  return {
    tabs: [initialTab],
    activeTabId: initialTab.id,
    nextTabNumber: 2,

    addTab: () =>
      set((state) => {
        const tab = createTab(state.nextTabNumber);

        return {
          tabs: [...state.tabs, tab],
          activeTabId: tab.id,
          nextTabNumber: state.nextTabNumber + 1,
        };
      }),

    removeTab: (id) =>
      set((state) => {
        const index = state.tabs.findIndex((t) => t.id === id);
        if (index === -1) return state;

        const remaining = state.tabs.filter((t) => t.id !== id);

        // If closing the last tab, create a fresh one
        if (remaining.length === 0) {
          const tab = createTab(state.nextTabNumber);

          return {
            tabs: [tab],
            activeTabId: tab.id,
            nextTabNumber: state.nextTabNumber + 1,
          };
        }

        // If closing the active tab, switch to an adjacent tab
        let nextActiveId = state.activeTabId;
        if (state.activeTabId === id) {
          const newIndex = Math.min(index, remaining.length - 1);
          nextActiveId = remaining[newIndex].id;
        }

        return {
          tabs: remaining,
          activeTabId: nextActiveId,
        };
      }),

    setActiveTab: (id) => set({ activeTabId: id }),
  };
});
