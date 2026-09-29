// app/components/chat-aside/changes/change-diff-panel.tsx
import { useMemo } from 'react';

import { useGitDiff, useGitFileDiff } from '@/app/hooks/api/git';

import { PatchViewer } from './diff-block';
import { buildNewFilePatch } from './lib';
import type { ChangeEntry } from './types';

export function ChangeDiffPanel({
  directory,
  entry,
  variant,
  onOpenFile,
}: {
  directory: string;
  entry: ChangeEntry;
  variant: 'staged' | 'working';
  onOpenFile: (path: string) => void;
}) {
  const staged = variant === 'staged';
  const isNew = entry.untracked;

  const { data: diffData, isLoading: diffLoading } = useGitDiff(
    directory,
    entry.path,
    staged,
    { enabled: !isNew },
  );
  const { data: fileData, isLoading: fileLoading } = useGitFileDiff(
    directory,
    entry.path,
    staged,
    { enabled: isNew },
  );

  const patch = useMemo(() => {
    if (isNew) {
      const modified =
        (fileData as { modified?: string } | null | undefined)?.modified ?? '';
      return buildNewFilePatch(entry.path, modified);
    }
    return (diffData as { diff?: string } | null | undefined)?.diff ?? '';
  }, [isNew, entry.path, fileData, diffData]);

  return (
    <div className='mt-1 mb-1.5'>
      <PatchViewer
        patch={patch}
        isLoading={isNew ? fileLoading : diffLoading}
        onOpenFile={onOpenFile}
      />
    </div>
  );
}
