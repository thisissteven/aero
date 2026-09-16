import { create } from 'zustand';

interface FileEditState {
  /** Buffered edit text keyed by path. Presence = user has typed in this file. */
  buffers: Map<string, string>;
  /** Last-known on-disk content keyed by path. Used to decide "dirty". */
  diskContents: Map<string, string>;

  setBuffer: (path: string, contents: string) => void;
  setDiskContent: (path: string, contents: string) => void;
  clearBuffer: (path: string) => void;
  clearAll: () => void;
}

export const useFileEditStore = create<FileEditState>((set) => ({
  buffers: new Map(),
  diskContents: new Map(),

  setBuffer(path, contents) {
    set((state) => {
      const next = new Map(state.buffers);
      next.set(path, contents);
      return { buffers: next };
    });
  },

  setDiskContent(path, contents) {
    set((state) => {
      const next = new Map(state.diskContents);
      next.set(path, contents);
      return { diskContents: next };
    });
  },

  clearBuffer(path) {
    set((state) => {
      if (!state.buffers.has(path)) return state;
      const next = new Map(state.buffers);
      next.delete(path);
      return { buffers: next };
    });
  },

  clearAll() {
    set({ buffers: new Map() });
  },
}));

/**
 * True when a path has a buffer that differs from its last-known disk content.
 * Safe before the file loads: if `diskContents` has no entry, we treat the file
 * as clean (nothing to compare against yet).
 */
export function useIsDirty(path: string | null | undefined): boolean {
  return useFileEditStore((s) => {
    if (path == null) return false;
    const buffer = s.buffers.get(path);
    if (buffer == null) return false;
    const disk = s.diskContents.get(path);
    if (disk == null) return false;
    return buffer !== disk;
  });
}
