import { create } from 'zustand';

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  createdAt: number;
}

interface BrowserStoreState {
  tabs: BrowserTab[];
  activeTabId: string | null;
}

interface BrowserStoreActions {
  addTab: (url?: string) => string;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (
    id: string,
    patch: Partial<Pick<BrowserTab, 'title' | 'url'>>,
  ) => void;
}

type BrowserStore = BrowserStoreState & { actions: BrowserStoreActions };

function createTab(url = ''): BrowserTab {
  return {
    id: crypto.randomUUID(),
    title: url || 'New Tab',
    url,
    createdAt: Date.now(),
  };
}

export const useBrowserStore = create<BrowserStore>()((set, get) => ({
  tabs: [],
  activeTabId: null,

  actions: {
    addTab: (url) => {
      const tab = createTab(url);
      set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }));
      return tab.id;
    },

    removeTab: (id) => {
      set((state) => {
        const tabs = state.tabs.filter((t) => t.id !== id);
        let activeTabId = state.activeTabId;
        if (activeTabId === id) {
          const removedIndex = state.tabs.findIndex((t) => t.id === id);
          activeTabId =
            tabs[Math.max(0, removedIndex - 1)]?.id ?? tabs[0]?.id ?? null;
        }
        return { tabs, activeTabId };
      });
    },

    setActiveTab: (id) => set({ activeTabId: id }),

    updateTab: (id, patch) => {
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
    },
  },
}));

export const useBrowserTabs = () => useBrowserStore((s) => s.tabs);
export const useActiveBrowserTabId = () =>
  useBrowserStore((s) => s.activeTabId);
export const useBrowserActions = () => useBrowserStore((s) => s.actions);
