import { useFileViewerStore } from '@/app/components/chat-aside/files/file-viewer-store';

/**
 * Open a file, waiting until the explorer panel has mounted and had a beat
 * for its initial directory listing to land.
 *
 * `openFile` silently no-ops if `activeRoot` isn't set yet (the store has no
 * root to attribute the tab to), so we poll for it first. Once it's set, we
 * delay briefly to let the tree's listing resolve and its rows render, then
 * open.
 */
export function openFileWhenReady(
  path: string,
  opts?: { background?: boolean },
): void {
  const store = useFileViewerStore;
  const startedAt = Date.now();
  const GRACE_MS = 300;
  const MAX_WAIT_MS = 10_000;

  const poll = () => {
    const s = store.getState();

    if (s.activeRoot) {
      // Root is set. Give the tree its grace period, then open. The tab
      // and pane work immediately regardless of whether the tree has
      // rendered its row yet.
      setTimeout(() => {
        store.getState().openFile(path, opts);
      }, GRACE_MS);
      return;
    }

    if (Date.now() - startedAt >= MAX_WAIT_MS) {
      // Panel never mounted. Open anyway — it'll no-op if there's still no
      // root, but at least we don't hang the caller.
      store.getState().openFile(path, opts);
      return;
    }

    setTimeout(poll, 50);
  };

  poll();
}
