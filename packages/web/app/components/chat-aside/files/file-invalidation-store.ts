import { create } from 'zustand';

interface FileInvalidationState {
  /** path → increasing version. Bumped when a write completes, so cached
   *  readers know to re-read. */
  versions: Record<string, number>;
  /** path → count of inflight writes. A reader must skip its read while
   *  this is > 0, otherwise it races the write and caches a bogus ENOENT. */
  pendingWrites: Record<string, number>;

  beginWrite: (path: string) => void;
  completeWrite: (path: string) => void;
  invalidate: (path: string) => void;
}

export const useFileInvalidationStore = create<FileInvalidationState>(
  (set) => ({
    versions: {},
    pendingWrites: {},

    beginWrite: (path) =>
      set((s) => ({
        pendingWrites: {
          ...s.pendingWrites,
          [path]: (s.pendingWrites[path] ?? 0) + 1,
        },
        versions: { ...s.versions, [path]: (s.versions[path] ?? 0) + 1 },
      })),

    completeWrite: (path) =>
      set((s) => {
        const next = (s.pendingWrites[path] ?? 0) - 1;
        const pendingWrites = { ...s.pendingWrites };
        if (next <= 0) {
          delete pendingWrites[path];
        } else {
          pendingWrites[path] = next;
        }
        return {
          pendingWrites,
          versions: { ...s.versions, [path]: (s.versions[path] ?? 0) + 1 },
        };
      }),

    invalidate: (path) =>
      set((s) => ({
        versions: { ...s.versions, [path]: (s.versions[path] ?? 0) + 1 },
      })),
  }),
);

/** A path plus every ancestor directory, longest first. Used so a mutation
 *  recorded against a directory (e.g. a folder move) also gates/evicts the
 *  cached reads of files nested inside it. */
function pathAndAncestors(path: string): string[] {
  const segments = path.split('/');
  const out: string[] = [];
  for (let i = segments.length; i >= 1; i -= 1) {
    out.push(segments.slice(0, i).join('/'));
  }
  return out;
}

/** Subscribe to the version of a specific path. A bump on any ancestor
 *  directory counts too, so moving/renaming a folder invalidates the files
 *  underneath it. */
export function useFileVersion(path: string | null): number {
  return useFileInvalidationStore((s) => {
    if (!path) return 0;
    let max = 0;
    for (const p of pathAndAncestors(path)) {
      const version = s.versions[p];
      if (version != null && version > max) max = version;
    }
    return max;
  });
}

/** Subscribe to the inflight-write count for a specific path, including
 *  writes armed against any ancestor directory. Holding off while an ancestor
 *  move is in flight prevents caching a bogus ENOENT for its nested files. */
export function usePendingWrites(path: string | null): number {
  return useFileInvalidationStore((s) => {
    if (!path) return 0;
    let total = 0;
    for (const p of pathAndAncestors(path)) {
      total += s.pendingWrites[p] ?? 0;
    }
    return total;
  });
}

export function beginFileWrite(path: string): void {
  useFileInvalidationStore.getState().beginWrite(path);
}

export function completeFileWrite(path: string): void {
  useFileInvalidationStore.getState().completeWrite(path);
}

export function invalidateFile(path: string): void {
  useFileInvalidationStore.getState().invalidate(path);
}
