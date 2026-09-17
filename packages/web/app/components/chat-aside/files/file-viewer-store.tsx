import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const DEFAULT_FONT_SIZE = 12.5;
export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 18;
export const IMAGE_ZOOM_MIN = 0.25;
export const IMAGE_ZOOM_MAX = 4;
export const IMAGE_ZOOM_STEP = 0.25;

interface TabState {
  openPaths: string[];
  activePath: string | null;
}

const EMPTY_TABS: TabState = { openPaths: [], activePath: null };

interface FileViewerState {
  fontSize: number;
  wrapText: boolean;
  showLineNumbers: boolean;
  imageZoom: number;

  /** Root path → tab state for that workspace. Keeps each workspace's tabs
   *  separate so switching sessions doesn't leak paths across roots. */
  tabsByRoot: Record<string, TabState>;
  /** Which root's tabs are currently rendered. Set by the explorer panel on
   *  mount; drives every selector below. */
  activeRoot: string | null;

  setFontSize: (fontSize: number) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  setWrapText: (wrapText: boolean) => void;
  toggleWrapText: () => void;
  setShowLineNumbers: (showLineNumbers: boolean) => void;
  toggleLineNumbers: () => void;
  reset: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetImageZoom: () => void;
  setImageZoom: (n: number) => void;

  setActiveRoot: (root: string) => void;
  openFile: (path: string, opts?: { background?: boolean }) => void;
  activateTab: (path: string) => void;
  closeTab: (path: string) => void;
  closeAllTabs: () => void;
}

const INITIAL_STATE = {
  fontSize: DEFAULT_FONT_SIZE,
  wrapText: false,
  showLineNumbers: false,
  imageZoom: 1,
  tabsByRoot: {} as Record<string, TabState>,
  activeRoot: null as string | null,
} as const;

/** Read the current root's tab state. Always returns a stable reference. */
function activeTabs(s: FileViewerState): TabState {
  if (!s.activeRoot) return EMPTY_TABS;
  return s.tabsByRoot[s.activeRoot] ?? EMPTY_TABS;
}

/** Produce a new tabsByRoot with the active root's entry replaced. */
function withActiveTabs(
  s: FileViewerState,
  next: TabState,
): Partial<FileViewerState> {
  if (!s.activeRoot) return {};
  return { tabsByRoot: { ...s.tabsByRoot, [s.activeRoot]: next } };
}

export const useFileViewerStore = create<FileViewerState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      // ── Root scoping ────────────────────────────────────────────────
      setActiveRoot(root) {
        if (get().activeRoot === root) return;
        // Ensure an entry exists so selectors see a stable empty object
        // rather than undefined.
        set((s) => ({
          activeRoot: root,
          tabsByRoot: s.tabsByRoot[root]
            ? s.tabsByRoot
            : { ...s.tabsByRoot, [root]: EMPTY_TABS },
        }));
      },

      // ── File opening / tabs (operate on the active root) ────────────
      openFile(path, opts) {
        const { openPaths, activePath } = activeTabs(get());
        const alreadyOpen = openPaths.includes(path);

        if (alreadyOpen) {
          if (opts?.background) return;
          if (activePath === path) return;
          set((s) => withActiveTabs(s, { openPaths, activePath: path }));
          return;
        }

        set((s) =>
          withActiveTabs(s, {
            openPaths: [...openPaths, path],
            activePath: opts?.background ? activePath : path,
          }),
        );
      },

      activateTab(path) {
        const { openPaths, activePath } = activeTabs(get());
        if (!openPaths.includes(path)) return;
        if (activePath === path) return;
        set((s) => withActiveTabs(s, { openPaths, activePath: path }));
      },

      closeTab(path) {
        const { openPaths, activePath } = activeTabs(get());
        const idx = openPaths.indexOf(path);
        if (idx === -1) return;

        const nextOpen = openPaths.filter((p) => p !== path);
        const nextActive =
          activePath !== path
            ? activePath
            : (nextOpen[idx] ?? nextOpen[idx - 1] ?? null);

        set((s) =>
          withActiveTabs(s, { openPaths: nextOpen, activePath: nextActive }),
        );
      },

      closeAllTabs() {
        set((s) => withActiveTabs(s, EMPTY_TABS));
      },

      // ── Image zoom ──────────────────────────────────────────────────
      setImageZoom: (n: number) => set({ imageZoom: n }),

      zoomIn: () =>
        set((s) => ({
          imageZoom: Math.min(
            IMAGE_ZOOM_MAX,
            +(s.imageZoom + IMAGE_ZOOM_STEP).toFixed(2),
          ),
        })),

      zoomOut: () =>
        set((s) => ({
          imageZoom: Math.max(
            IMAGE_ZOOM_MIN,
            +(s.imageZoom - IMAGE_ZOOM_STEP).toFixed(2),
          ),
        })),

      resetImageZoom: () => set({ imageZoom: 1 }),

      // ── Text viewer settings ────────────────────────────────────────
      setFontSize(fontSize) {
        set({
          fontSize: Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, fontSize)),
        });
      },

      increaseFontSize() {
        const next = Math.min(MAX_FONT_SIZE, get().fontSize + 1);
        set({ fontSize: next });
      },

      decreaseFontSize() {
        const next = Math.max(MIN_FONT_SIZE, get().fontSize - 1);
        set({ fontSize: next });
      },

      setWrapText(wrapText) {
        set({ wrapText });
      },

      toggleWrapText() {
        set({ wrapText: !get().wrapText });
      },

      setShowLineNumbers(showLineNumbers) {
        set({ showLineNumbers });
      },

      toggleLineNumbers() {
        set({ showLineNumbers: !get().showLineNumbers });
      },

      reset() {
        set(INITIAL_STATE);
      },
    }),
    {
      name: 'aero:file-viewer',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        fontSize: state.fontSize,
        wrapText: state.wrapText,
        showLineNumbers: state.showLineNumbers,
        imageZoom: state.imageZoom,
        // tabsByRoot / activeRoot are not persisted to localStorage — roots
        // are session-scoped, and persisting them would let one workspace's
        // tabs leak into another on reload.
      }),
      version: 4,
    },
  ),
);

/** Subscribe to the active root's open paths. */
export function useOpenPaths(): readonly string[] {
  return useFileViewerStore((s) => activeTabs(s).openPaths);
}

/** Subscribe to the active root's active path. */
export function useActivePath(): string | null {
  return useFileViewerStore((s) => activeTabs(s).activePath);
}
