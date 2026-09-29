// app/components/chat-aside/changes/change-diff-panel.tsx
import { Skeleton } from '@aero/ui';
import { useMemo } from 'react';

import { getPierreTheme } from '@/app/components/chat-aside/files/pierre-styles';
import { CodeBlock } from '@/app/components/code-block/code-block';
import { FileTypeIcon } from '@/app/components/file-type-icon';
import { MiddleTruncatePath } from '@/app/components/tool-call-view/middle-truncate-path';
import { useGitDiff, useGitFileDiff } from '@/app/hooks/api/git';
import { useI18n } from '@/app/hooks/i18n';
import { useTheme } from '@/app/providers';

import { buildNewFilePatch, CHANGE_DIFF_UNSAFE_CSS } from './lib';
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
  const { t } = useI18n();
  const { resolvedTheme, colorTheme } = useTheme();
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

  const pierreTheme = useMemo(() => getPierreTheme(colorTheme), [colorTheme]);
  const loading = isNew ? fileLoading : diffLoading;

  if (loading) {
    return (
      <div className='border-separator mt-1 mb-1.5 rounded-md border p-3'>
        <div className='space-y-1.5'>
          <Skeleton className='h-3.5 w-3/4 rounded' />
          <Skeleton className='h-3.5 w-full rounded' />
          <Skeleton className='h-3.5 w-2/3 rounded' />
        </div>
      </div>
    );
  }

  if (!patch.trim()) {
    return (
      <div className='border-separator text-muted mt-1 mb-1.5 flex items-center justify-center rounded-md border py-8 text-xs'>
        {t.changesPanel.noChangesToDisplay}
      </div>
    );
  }

  return (
    <div className='animate-in fade-in-0 mt-1 mb-1.5 duration-150 ease-out motion-reduce:animate-none'>
      <CodeBlock defaultViewMode='unified' className='rounded-md'>
        <CodeBlock.Header className='gap-2 pr-1 pl-2'>
          <div className='flex min-w-0 items-center gap-2 text-xs'>
            <FileTypeIcon filePath={entry.path} />
            <MiddleTruncatePath
              path={entry.path}
              className='text-muted text-xs'
              fileClassName='text-foreground text-xs'
            />
          </div>

          <div className='flex shrink-0 items-center'>
            <CodeBlock.ViewModeButton />
            <CodeBlock.WrapButton />
            <CodeBlock.CopyButton code={patch} />
            <CodeBlock.OpenButton
              aria-label={t.toolCall.openInEditor}
              onClick={() => onOpenFile(entry.path)}
            />
          </div>
        </CodeBlock.Header>

        <CodeBlock.Code
          code=''
          variant='diff'
          patch={patch}
          theme={pierreTheme.light}
          darkTheme={pierreTheme.dark}
          themeType={resolvedTheme}
          unsafeCSS={CHANGE_DIFF_UNSAFE_CSS}
          style={{ maxHeight: '45vh' }}
        />
      </CodeBlock>
    </div>
  );
}
