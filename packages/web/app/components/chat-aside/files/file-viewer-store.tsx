import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const DEFAULT_FONT_SIZE = 12.5;
export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 18;
export const IMAGE_ZOOM_MIN = 0.25;
export const IMAGE_ZOOM_MAX = 4;
export const IMAGE_ZOOM_STEP = 0.25;

interface FileViewerState {
  fontSize: number;
  wrapText: boolean;
  showLineNumbers: boolean;
  imageZoom: number;
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
}

const INITIAL_STATE = {
  fontSize: DEFAULT_FONT_SIZE,
  wrapText: false,
  showLineNumbers: false,
  imageZoom: 1,
} as const;

export const useFileViewerStore = create<FileViewerState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

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
      // Only persist the values, not the action functions. Zustand's default
      // serialization would drop functions anyway, but being explicit keeps
      // the storage payload readable and future-proof against adding derived
      // state.
      partialize: (state) => ({
        fontSize: state.fontSize,
        wrapText: state.wrapText,
        showLineNumbers: state.showLineNumbers,
      }),
      version: 1,
    },
  ),
);
