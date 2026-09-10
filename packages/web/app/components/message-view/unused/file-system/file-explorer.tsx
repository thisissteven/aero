import {
  FileTree,
  useFileTreeSearch,
  useFileTreeSelection,
} from '@pierre/trees/react';
import { useCallback, useEffect, useState } from 'react';

import { UseLazyFileTreeResult } from '@/app/components/message-view/unused/file-system/use-lazy-file-tree';

export interface FileExplorerProps extends UseLazyFileTreeResult {
  onOpenFile: (path: string) => void;
  className?: string;
}

export function FileExplorer({
  model,
  socket,
  error,
  onOpenFile,
  className,
}: FileExplorerProps) {
  const search = useFileTreeSearch(model);
  const selectedPaths = useFileTreeSelection(model);
  const [searchingAll, setSearchingAll] = useState(false);

  useEffect(() => {
    if (selectedPaths.length !== 1) return;
    const path = selectedPaths[0];
    const item = model.getItem(path);

    // Only fire onOpenFile for files; let @pierre/trees handle directory expansion natively
    if (item && !item.isDirectory()) {
      const cleanPath = path.replace(/\/$/, '');
      onOpenFile(cleanPath);
    }
  }, [selectedPaths, model, onOpenFile]);

  const searchEverywhere = useCallback(async () => {
    if (!search.value) return;
    setSearchingAll(true);
    try {
      const newPaths = new Set<string>();
      await socket.search(search.value, (batch) => {
        for (const p of batch) newPaths.add(p);
      });
      if (newPaths.size > 0) {
        model.batch(
          Array.from(newPaths, (path) => ({ type: 'add' as const, path })),
        );
      }
    } finally {
      setSearchingAll(false);
    }
  }, [model, socket, search.value]);

  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div style={{ display: 'flex', gap: 4, padding: 8 }}>
        <input
          value={search.value}
          onChange={(e) => search.setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void searchEverywhere();
          }}
          placeholder='Search files…'
          style={{ flex: 1 }}
        />
        <button
          type='button'
          onClick={() => void searchEverywhere()}
          disabled={searchingAll}
        >
          {searchingAll ? '…' : 'All'}
        </button>
      </div>

      {error && (
        <div
          style={{
            color: 'var(--danger, #d33)',
            fontSize: 12,
            padding: '0 8px 8px',
          }}
        >
          {error}
        </div>
      )}

      <FileTree
        model={model}
        className='rounded-lg border'
        style={{ flex: 1, minHeight: 0 }}
      />
    </div>
  );
}
