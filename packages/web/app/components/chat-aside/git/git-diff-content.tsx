// app/components/chat-aside/git/git-diff-content.tsx
import { cn } from '@aero/ui';
import { useMemo } from 'react';

interface GitDiffContentProps {
  diff?: string | null;
  emptyLabel: string;
  className?: string;
}

export function GitDiffContent({
  diff,
  emptyLabel,
  className,
}: GitDiffContentProps) {
  const lines = useMemo(() => (diff ?? '').split('\n'), [diff]);

  if (!diff || !diff.trim()) {
    return (
      <div
        className={cn(
          'text-muted flex h-full items-center justify-center py-8 text-center text-sm',
          className,
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-default/40 scrollbar-thin overflow-auto rounded-md py-2 font-mono text-xs leading-relaxed',
        className,
      )}
    >
      {lines.map((line, i) => {
        const isAddition = line.startsWith('+') && !line.startsWith('+++');
        const isDeletion = line.startsWith('-') && !line.startsWith('---');
        const isHunk = line.startsWith('@@');

        return (
          <div
            key={i}
            className={cn(
              'px-3 whitespace-pre',
              isAddition && 'text-success bg-success/5',
              isDeletion && 'text-danger bg-danger/5',
              isHunk && 'text-accent',
              !isAddition && !isDeletion && !isHunk && 'text-muted',
            )}
          >
            {line || ' '}
          </div>
        );
      })}
    </div>
  );
}
