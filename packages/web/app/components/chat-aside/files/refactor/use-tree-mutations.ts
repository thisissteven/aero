import type { ContextMenuItem, FileTree as FileTreeModel } from '@pierre/trees';
import { useMemo } from 'react';
import { getUniquePath } from '@/app/components/chat-aside/files/refactor/tree-app-utils';

interface UseTreeMutationsOptions {
  model: FileTreeModel;
  newFileTemplateName: string;
  newFolderTemplateName: string;
}

interface TreeMutations {
  addEntry(targetDirectoryPath: string, kind: 'file' | 'folder'): void;
  remove(item: ContextMenuItem): void;
  rename(item: ContextMenuItem): void;
}

// Builds the new file/folder mutations TreeApp uses for both the project
// header buttons and the context menu. Both creators add the path then
// immediately enter rename mode so the user names the entry inline rather than
// living with a "untitled" placeholder.
export function useTreeMutations({
  model,
  newFileTemplateName,
  newFolderTemplateName,
}: UseTreeMutationsOptions): TreeMutations {
  return useMemo<TreeMutations>(
    () => ({
      addEntry(targetDirectoryPath, kind) {
        const template =
          kind === 'folder' ? `${newFolderTemplateName}/` : newFileTemplateName;
        const nextPath = getUniquePath(
          model,
          `${targetDirectoryPath}${template}`,
        );
        model.add(nextPath);
        // Drop straight into rename mode so the user types the real name.
        model.startRenaming(nextPath, {
          removeIfCanceled: true,
        });
      },
      remove(item) {
        model.remove(
          item.path,
          item.kind === 'directory' ? { recursive: true } : undefined,
        );
      },
      rename(item) {
        model.startRenaming(item.path);
      },
    }),
    [model, newFileTemplateName, newFolderTemplateName],
  );
}
