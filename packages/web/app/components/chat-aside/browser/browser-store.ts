// browser-store.ts

import { create } from 'zustand';

export interface PreviewElementMetadata {
  tag: string;
  id?: string;
  classes: string[];
  text: string;
  selector: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export type PreviewProxyState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready';
      previewOrigin: string;
      expiresAt: number;
    }
  | {
      status: 'error';
      message: string;
    };

export interface BrowserTab {
  id: string;
  title: string;

  /**
   * URL currently represented by the browser tab.
   */
  url: string;

  /**
   * Value currently typed into the address bar.
   */
  draftUrl: string;

  /**
   * URL originally loaded into the iframe.
   *
   * This intentionally differs from `url`: an SPA can
   * navigate internally without causing the iframe itself
   * to be recreated.
   */
  loadedUrl: string;

  history: string[];
  historyIndex: number;

  reloadNonce: number;
  isLoading: boolean;

  isInspecting: boolean;
  hoverTarget: PreviewElementMetadata | null;

  proxyState: PreviewProxyState;

  createdAt: number;
}

interface NavigateOptions {
  replaceHistory?: boolean;
  inFrame?: boolean;
}

interface BrowserStoreActions {
  addTab: (url?: string) => string;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;

  setDraftUrl: (id: string, value: string) => void;

  navigate: (id: string, url: string, options?: NavigateOptions) => void;

  goToHistory: (id: string, index: number) => void;

  reload: (id: string) => void;

  setLoading: (id: string, value: boolean) => void;

  setProxyState: (id: string, value: PreviewProxyState) => void;

  setInspecting: (id: string, value: boolean) => void;

  setHoverTarget: (id: string, value: PreviewElementMetadata | null) => void;

  updateTab: (
    id: string,
    patch: Partial<Pick<BrowserTab, 'title' | 'url'>>,
  ) => void;
}

type BrowserStore = {
  tabs: BrowserTab[];
  activeTabId: string | null;
  actions: BrowserStoreActions;
};

function createTab(url = ''): BrowserTab {
  return {
    id: crypto.randomUUID(),
    title: url || 'New Tab',

    url,
    draftUrl: url,
    loadedUrl: url,

    history: url ? [url] : [],
    historyIndex: url ? 0 : -1,

    reloadNonce: 0,
    isLoading: false,

    isInspecting: false,
    hoverTarget: null,

    proxyState: {
      status: 'idle',
    },

    createdAt: Date.now(),
  };
}

export const useBrowserStore = create<BrowserStore>()((set) => ({
  tabs: [],
  activeTabId: null,

  actions: {
    addTab: (url = '') => {
      const tab = createTab(url);

      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
      }));

      return tab.id;
    },

    removeTab: (id) => {
      set((state) => {
        const removedIndex = state.tabs.findIndex((tab) => tab.id === id);

        const tabs = state.tabs.filter((tab) => tab.id !== id);

        let activeTabId = state.activeTabId;

        if (activeTabId === id) {
          activeTabId =
            tabs[Math.max(0, removedIndex - 1)]?.id ?? tabs[0]?.id ?? null;
        }

        return {
          tabs,
          activeTabId,
        };
      });
    },

    setActiveTab: (id) =>
      set({
        activeTabId: id,
      }),

    setDraftUrl: (id, value) =>
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === id
            ? {
                ...tab,
                draftUrl: value,
              }
            : tab,
        ),
      })),

    navigate: (id, url, options) =>
      set((state) => ({
        tabs: state.tabs.map((tab) => {
          if (tab.id !== id) {
            return tab;
          }

          const nextUrl = url;

          const nextDraft = nextUrl;

          /*
           * Internal iframe navigation:
           *
           * The remote app has already navigated itself.
           * Do NOT change loadedUrl, otherwise React would
           * recreate the iframe.
           */
          if (options?.inFrame) {
            if (!nextUrl) {
              return {
                ...tab,
                url: '',
                draftUrl: '',
                isLoading: false,
                hoverTarget: null,
                isInspecting: false,
              };
            }

            if (options.replaceHistory) {
              return {
                ...tab,
                url: nextUrl,
                draftUrl: nextUrl,
                isLoading: false,
              };
            }

            const kept =
              tab.historyIndex >= 0
                ? tab.history.slice(0, tab.historyIndex + 1)
                : [];

            if (kept[kept.length - 1] === nextUrl) {
              return {
                ...tab,
                url: nextUrl,
                draftUrl: nextUrl,
                historyIndex: kept.length - 1,
                isLoading: false,
              };
            }

            const history = [...kept, nextUrl];

            return {
              ...tab,
              url: nextUrl,
              draftUrl: nextUrl,
              history,
              historyIndex: history.length - 1,
              isLoading: false,
            };
          }

          /*
           * New top-level browser navigation:
           *
           * This is what should replace the iframe.
           */
          if (!nextUrl) {
            return {
              ...tab,
              url: '',
              draftUrl: '',
              loadedUrl: '',
              history: [],
              historyIndex: -1,
              isLoading: false,
              proxyState: {
                status: 'idle',
              },
              hoverTarget: null,
              isInspecting: false,
            };
          }

          if (options?.replaceHistory) {
            return {
              ...tab,
              url: nextUrl,
              draftUrl: nextUrl,
              loadedUrl: nextUrl,
              isLoading: true,
              proxyState: {
                status: 'idle',
              },
              hoverTarget: null,
              isInspecting: false,
            };
          }

          const kept =
            tab.historyIndex >= 0
              ? tab.history.slice(0, tab.historyIndex + 1)
              : [];

          if (kept[kept.length - 1] === nextUrl) {
            return {
              ...tab,
              url: nextUrl,
              draftUrl: nextUrl,
              loadedUrl: nextUrl,
              historyIndex: kept.length - 1,
              isLoading: true,
              proxyState: {
                status: 'idle',
              },
              hoverTarget: null,
              isInspecting: false,
            };
          }

          const history = [...kept, nextUrl];

          return {
            ...tab,
            url: nextUrl,
            draftUrl: nextUrl,
            loadedUrl: nextUrl,
            history,
            historyIndex: history.length - 1,
            isLoading: true,
            proxyState: {
              status: 'idle',
            },
            hoverTarget: null,
            isInspecting: false,
          };
        }),
      })),

    goToHistory: (id, index) =>
      set((state) => ({
        tabs: state.tabs.map((tab) => {
          if (tab.id !== id) {
            return tab;
          }

          const nextUrl = tab.history[index];

          if (!nextUrl) {
            return tab;
          }

          return {
            ...tab,
            url: nextUrl,
            draftUrl: nextUrl,
            loadedUrl: nextUrl,
            historyIndex: index,
            isLoading: true,
            proxyState: {
              status: 'idle',
            },
            hoverTarget: null,
            isInspecting: false,
            reloadNonce: tab.reloadNonce + 1,
          };
        }),
      })),

    reload: (id) =>
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === id
            ? {
                ...tab,
                reloadNonce: tab.reloadNonce + 1,
                isLoading: true,
              }
            : tab,
        ),
      })),

    setLoading: (id, value) =>
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === id
            ? {
                ...tab,
                isLoading: value,
              }
            : tab,
        ),
      })),

    setProxyState: (id, value) =>
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === id
            ? {
                ...tab,
                proxyState: value,
              }
            : tab,
        ),
      })),

    setInspecting: (id, value) =>
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === id
            ? {
                ...tab,
                isInspecting: value,
                hoverTarget: value ? tab.hoverTarget : null,
              }
            : tab,
        ),
      })),

    setHoverTarget: (id, value) =>
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === id
            ? {
                ...tab,
                hoverTarget: value,
              }
            : tab,
        ),
      })),

    updateTab: (id, patch) =>
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === id
            ? {
                ...tab,
                ...patch,
              }
            : tab,
        ),
      })),
  },
}));

export const useBrowserTabs = () => useBrowserStore((state) => state.tabs);

export const useActiveBrowserTabId = () =>
  useBrowserStore((state) => state.activeTabId);

export const useBrowserTab = (id: string) =>
  useBrowserStore((state) => state.tabs.find((tab) => tab.id === id));

export const useBrowserActions = () =>
  useBrowserStore((state) => state.actions);
