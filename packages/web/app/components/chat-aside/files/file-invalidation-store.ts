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

/** Subscribe to the version of a specific path. */
export function useFileVersion(path: string | null): number {
  return useFileInvalidationStore((s) => (path ? (s.versions[path] ?? 0) : 0));
}

/** Subscribe to the inflight-write count for a specific path. */
export function usePendingWrites(path: string | null): number {
  return useFileInvalidationStore((s) =>
    path ? (s.pendingWrites[path] ?? 0) : 0,
  );
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
