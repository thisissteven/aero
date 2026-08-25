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
   * Current URL shown in the browser pane.
   */
  url: string;

  /**
   * Address bar value.
   */
  draftUrl: string;

  /**
   * Base URL used to create the current preview target.
   *
   * This changes only when the user enters a new base URL.
   */
  loadedUrl: string;

  /**
   * Exact current URL inside the preview.
   *
   * This changes during CSR navigation.
   */
  currentUrl: string;

  /**
   * Persistent browser-tab history.
   */
  history: string[];
  historyIndex: number;

  /**
   * Actual iframe history state reported by the bridge.
   */
  canGoBack: boolean;
  canGoForward: boolean;

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

  /**
   * User entered a new URL in the address bar.
   */
  navigate: (id: string, url: string, options?: NavigateOptions) => void;

  /**
   * The iframe navigated itself.
   *
   * This updates the address bar/history but DOES NOT
   * change loadedUrl.
   */
  syncNavigation: (id: string, url: string) => void;

  /**
   * Actual iframe Back/Forward state.
   */
  setIframeHistoryState: (
    id: string,
    state: {
      canGoBack: boolean;
      canGoForward: boolean;
    },
  ) => void;

  /**
   * Only used when explicitly restoring parent history.
   *
   * BrowserPane Back/Forward should normally use the iframe.
   */
  goToHistory: (id: string, index: number) => void;

  reload: (id: string) => void;

  setLoading: (id: string, value: boolean) => void;

  setProxyState: (id: string, value: PreviewProxyState) => void;

  setInspecting: (id: string, value: boolean) => void;

  setHoverTarget: (id: string, value: PreviewElementMetadata | null) => void;

  updateTab: (id: string, patch: Partial<Pick<BrowserTab, 'title'>>) => void;
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
    currentUrl: url,

    history: url ? [url] : [],
    historyIndex: url ? 0 : -1,

    canGoBack: false,
    canGoForward: false,

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

          /*
           * This is only for callers explicitly reporting
           * an iframe navigation.
           */
          if (options?.inFrame) {
            return {
              ...tab,
              url,
              draftUrl: url,
              currentUrl: url,
              isLoading: false,
            };
          }

          /*
           * Empty navigation.
           */
          if (!url) {
            return {
              ...tab,
              url: '',
              draftUrl: '',
              loadedUrl: '',
              currentUrl: '',
              history: [],
              historyIndex: -1,
              canGoBack: false,
              canGoForward: false,
              isLoading: false,
              proxyState: {
                status: 'idle',
              },
              hoverTarget: null,
              isInspecting: false,
            };
          }

          /*
           * Replace current history entry.
           */
          if (options?.replaceHistory) {
            const history = tab.history.length > 0 ? [...tab.history] : [url];

            const nextIndex = tab.historyIndex >= 0 ? tab.historyIndex : 0;

            history[nextIndex] = url;

            return {
              ...tab,
              url,
              draftUrl: url,
              loadedUrl: url,
              currentUrl: url,
              history,
              historyIndex: nextIndex,
              canGoBack: nextIndex > 0,
              canGoForward: nextIndex < history.length - 1,
              isLoading: true,
              proxyState: {
                status: 'idle',
              },
              hoverTarget: null,
              isInspecting: false,
            };
          }

          /*
           * Normal top-level navigation.
           *
           * Preserve the existing browser-tab history,
           * but discard its forward branch.
           */
          const kept =
            tab.historyIndex >= 0
              ? tab.history.slice(0, tab.historyIndex + 1)
              : [];

          if (kept[kept.length - 1] === url) {
            const index = kept.length - 1;

            return {
              ...tab,
              url,
              draftUrl: url,
              loadedUrl: url,
              currentUrl: url,
              history: kept,
              historyIndex: index,
              canGoBack: index > 0,
              canGoForward: false,
              isLoading: true,
              proxyState: {
                status: 'idle',
              },
              hoverTarget: null,
              isInspecting: false,
            };
          }

          const history = [...kept, url];
          const nextIndex = history.length - 1;

          return {
            ...tab,
            url,
            draftUrl: url,
            loadedUrl: url,
            currentUrl: url,
            history,
            historyIndex: nextIndex,
            canGoBack: nextIndex > 0,
            canGoForward: false,
            isLoading: true,
            proxyState: {
              status: 'idle',
            },
            hoverTarget: null,
            isInspecting: false,
          };
        }),
      })),

    /*
     * CSR navigation inside the existing iframe.
     *
     * IMPORTANT:
     * loadedUrl never changes here.
     */
    syncNavigation: (id, url) =>
      set((state) => ({
        tabs: state.tabs.map((tab) => {
          if (tab.id !== id) {
            return tab;
          }

          const existingIndex = tab.history.indexOf(url);

          /*
           * Existing history entry:
           * usually Back/Forward.
           */
          if (existingIndex >= 0) {
            return {
              ...tab,
              url,
              draftUrl: url,
              currentUrl: url,
              historyIndex: existingIndex,
              isLoading: false,
            };
          }

          /*
           * New SPA navigation.
           */
          const kept =
            tab.historyIndex >= 0
              ? tab.history.slice(0, tab.historyIndex + 1)
              : [];

          const history = [...kept, url];
          const index = history.length - 1;

          return {
            ...tab,
            url,
            draftUrl: url,
            currentUrl: url,
            history,
            historyIndex: index,
            canGoBack: index > 0,
            canGoForward: false,
            isLoading: false,
          };
        }),
      })),

    setIframeHistoryState: (id, historyState) =>
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === id
            ? {
                ...tab,
                canGoBack: historyState.canGoBack,
                canGoForward: historyState.canGoForward,
              }
            : tab,
        ),
      })),

    /*
     * Explicit parent-side history restoration.
     *
     * This intentionally updates loadedUrl because this is
     * a full preview reload, not an iframe CSR navigation.
     */
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
            currentUrl: nextUrl,
            historyIndex: index,
            canGoBack: index > 0,
            canGoForward: index < tab.history.length - 1,
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
