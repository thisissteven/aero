'use client';

import { cn } from '@aero/ui';

export interface FileTabsProps {
  openPaths: readonly string[];
  activePath: string | null;
  onActivate: (path: string) => void;
  onClose: (path: string) => void;
}

export function FileTabs({
  openPaths,
  activePath,
  onActivate,
  onClose,
}: FileTabsProps) {
  return (
    <div
      role='tablist'
      className={cn(
        'scrollbar-thin border-separator flex h-10 shrink-0 items-center gap-1',
        'overflow-x-auto overflow-y-hidden border-b p-1',
      )}
    >
      {openPaths.map((path) => {
        const isActive = path === activePath;
        const name = path.split('/').pop() || path;
        return (
          <div
            key={path}
            className={cn(
              isActive
                ? 'bg-default/60 text-foreground flex items-center gap-2 rounded-md pl-3 pr-1 py-1.5 text-sm'
                : 'text-muted hover:bg-default/60 hover:text-foreground flex items-center gap-2 rounded-md px-3 py-1.5 text-sm',
            )}
          >
            <button
              type='button'
              role='tab'
              aria-selected={isActive}
              onClick={() => onActivate(path)}
              className='min-w-0 flex-1 truncate text-left'
              title={path}
            >
              {name}
            </button>
            <button
              type='button'
              onClick={() => onClose(path)}
              aria-label={`Close ${name}`}
              className={cn(
                'text-muted hover:bg-surface-hover hover:text-foreground flex h-5 w-5 shrink-0',
                'items-center justify-center rounded opacity-0 transition-opacity',
                'group-hover:opacity-100 focus-visible:opacity-100',
                isActive && 'opacity-60',
              )}
            >
              <svg
                width='10'
                height='10'
                viewBox='0 0 10 10'
                aria-hidden='true'
              >
                <path
                  d='M1 1l8 8M9 1L1 9'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
