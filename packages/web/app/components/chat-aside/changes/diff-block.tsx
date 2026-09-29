// app/components/chat-aside/changes/diff-block.tsx
//
// The single-file diff block used by the changes panel, plus a viewer that
// renders a whole (possibly multi-file) patch as a stack of those blocks.
// Shared with the git panel's history and branch-compare dialogs.

import { cn, Skeleton } from '@aero/ui';
import { useMemo } from 'react';

import { getPierreTheme } from '@/app/components/chat-aside/files/pierre-styles';
import { CodeBlock } from '@/app/components/code-block/code-block';
import { FileTypeIcon } from '@/app/components/file-type-icon';
import { MiddleTruncatePath } from '@/app/components/tool-call-view/middle-truncate-path';
import { useI18n } from '@/app/hooks/i18n';
import { useTheme } from '@/app/providers';

import { useDiffViewMode } from './diff-view-context';
import { CHANGE_DIFF_UNSAFE_CSS, splitPatchByFile } from './lib';

/** The Pierre diff body. Must be rendered inside a `<CodeBlock>`. */
export function DiffCode({
  patch,
  fitContent = false,
}: {
  patch: string;
  fitContent?: boolean;
}) {
  const { resolvedTheme, colorTheme } = useTheme();
  const pierreTheme = useMemo(() => getPierreTheme(colorTheme), [colorTheme]);

  return (
    <CodeBlock.Code
      code=''
      variant='diff'
      patch={patch}
      theme={pierreTheme.light}
      darkTheme={pierreTheme.dark}
      themeType={resolvedTheme}
      unsafeCSS={CHANGE_DIFF_UNSAFE_CSS}
      style={fitContent ? undefined : { maxHeight: '45vh' }}
    />
  );
}

export function DiffBlock({
  path,
  patch,
  onOpenFile,
  showHeader = true,
  fitContent = false,
  className,
}: {
  path: string;
  patch: string;
  onOpenFile?: (path: string) => void;
  showHeader?: boolean;
  fitContent?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const { viewMode, setViewMode } = useDiffViewMode();

  return (
    <div
      className={cn(
        'animate-in fade-in-0 duration-150 ease-out motion-reduce:animate-none',
        className,
      )}
    >
      <CodeBlock
        defaultViewMode='unified'
        fitContent={fitContent}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        className={fitContent ? 'rounded-none border-0' : 'rounded-md'}
      >
        {showHeader && (
          <CodeBlock.Header className='gap-2 pl-2 pr-1'>
            <div className='flex min-w-0 items-center gap-2 text-xs'>
              <FileTypeIcon filePath={path} />
              <MiddleTruncatePath
                path={path}
                className='text-muted text-xs'
                fileClassName='text-foreground text-xs'
              />
            </div>

            <div className='flex shrink-0 items-center gap-0'>
              <CodeBlock.ViewModeButton />
              <CodeBlock.WrapButton />
              <CodeBlock.CopyButton code={patch} />
              {onOpenFile && (
                <CodeBlock.OpenButton
                  aria-label={t.toolCall.openInEditor}
                  onClick={() => onOpenFile(path)}
                />
              )}
            </div>
          </CodeBlock.Header>
        )}

        <DiffCode patch={patch} fitContent={fitContent} />
      </CodeBlock>
    </div>
  );
}

export function PatchViewer({
  patch,
  isLoading,
  onOpenFile,
  emptyLabel,
}: {
  patch?: string | null;
  isLoading?: boolean;
  onOpenFile?: (path: string) => void;
  emptyLabel?: string;
}) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className='border-separator rounded-md border p-3'>
        <div className='space-y-1.5'>
          <Skeleton className='h-3.5 w-3/4 rounded' />
          <Skeleton className='h-3.5 w-full rounded' />
          <Skeleton className='h-3.5 w-2/3 rounded' />
        </div>
      </div>
    );
  }

  const files = splitPatchByFile(patch ?? '');

  if (!files.length) {
    return (
      <div className='border-separator text-muted flex items-center justify-center rounded-md border py-8 text-xs'>
        {emptyLabel ?? t.changesPanel.noChangesToDisplay}
      </div>
    );
  }

  return (
    <div className='space-y-1.5'>
      {files.map((file, index) => (
        <DiffBlock
          key={`${file.path}-${index}`}
          path={file.path}
          patch={file.patch}
          onOpenFile={onOpenFile}
        />
      ))}
    </div>
  );
}
