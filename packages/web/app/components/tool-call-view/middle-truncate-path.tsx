import { useMemo } from 'react';

import { cn } from '@aero/ui';

import { normalizePath } from '@/server/shared';

export function MiddleTruncatePath({
  path,
  className,
  fileClassName,
}: {
  path: string;
  className?: string;
  fileClassName?: string;
}) {
  const normalized = useMemo(() => normalizePath(path), [path]);
  const lastSlashIndex = normalized.lastIndexOf('/');

  if (lastSlashIndex === -1) {
    return (
      <span className={cn('truncate', className, fileClassName)}>
        {normalized}
      </span>
    );
  }

  const dir = normalized.slice(0, lastSlashIndex);
  const file = normalized.slice(lastSlashIndex); // Includes leading '/'

  return (
    <span
      className={cn('inline-flex max-w-full min-w-0 items-center', className)}
    >
      <span className='shrink truncate'>{dir}</span>
      <span className='shrink-0'>
        <span className={cn('text-foreground/80', fileClassName)}>
          {file[0]}
        </span>
        <span className={cn('text-foreground/80', fileClassName)}>
          {file.slice(1, file.length)}
        </span>
      </span>
    </span>
  );
}
