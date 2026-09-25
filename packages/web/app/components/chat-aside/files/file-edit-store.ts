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

  /** Remap buffered edits and last-known disk contents when a file or folder
   *  is renamed or moved. Maps descendants when `from` is a directory so an
   *  unsaved buffer under a moved folder follows it. */
  renamePath: (from: string, to: string) => void;
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

  renamePath(from, to) {
    const fromClean = from.endsWith('/') ? from.slice(0, -1) : from;
    const toClean = to.endsWith('/') ? to.slice(0, -1) : to;
    if (fromClean === toClean) return;

    const prefix = `${fromClean}/`;
    const mapPath = (p: string): string => {
      if (p === fromClean) return toClean;
      if (p.startsWith(prefix)) return toClean + p.slice(fromClean.length);
      return p;
    };

    set((state) => {
      const remap = (map: Map<string, string>): Map<string, string> => {
        let changed = false;
        const next = new Map<string, string>();
        for (const [p, value] of map) {
          const nextPath = mapPath(p);
          if (nextPath !== p) changed = true;
          next.set(nextPath, value);
        }
        return changed ? next : map;
      };

      const buffers = remap(state.buffers);
      const diskContents = remap(state.diskContents);
      if (buffers === state.buffers && diskContents === state.diskContents) {
        return state;
      }
      return { buffers, diskContents };
    });
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
