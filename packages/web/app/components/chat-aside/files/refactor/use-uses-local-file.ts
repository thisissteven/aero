import type { FileContents } from '@pierre/diffs';
import type { RefObject } from 'react';

// True when the active tab shows its locally edited file rather than the host's:
// the path is unsaved, or it was saved and the host has not yet replaced the
// file object it held at save time. Kept in its own hook because the render-time
// ref read is deliberate; the boundary lets TreeApp stay compilable.
export function useUsesLocalFile(
  activePath: string | null,
  activeHostFile: FileContents | undefined,
  unsavedPaths: ReadonlySet<string>,
  hostFilesAtSaveByPathRef: RefObject<Map<string, FileContents | undefined>>,
): boolean {
  /* oxlint-disable react/refs -- isolate the existing render-time host acknowledgement snapshot */
  const usesLocalFile =
    activePath != null &&
    (unsavedPaths.has(activePath) ||
      (hostFilesAtSaveByPathRef.current.has(activePath) &&
        hostFilesAtSaveByPathRef.current.get(activePath) === activeHostFile));
  /* oxlint-enable react/refs */

  return usesLocalFile;
}
