'use client';

import { cn } from '@aero/ui';
import { FileTypeIcon } from '@/app/components/file-type-icon';

export interface FileTabsProps {
  openPaths: readonly string[];
  activePath: string | null;
  onActivate: (path: string) => void;
  onClose: (path: string) => void;
}

function getTabLabel(path: string): string {
  const trimmed = path.endsWith('/') ? path.slice(0, -1) : path;
  return trimmed.split('/').pop() || trimmed;
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
        'border-separator flex shrink-0 items-center gap-1 border-b p-1',
        'scrollbar-thin overflow-x-auto overflow-y-hidden',
      )}
    >
      {openPaths.map((path) => (
        <FileTab
          key={path}
          path={path}
          isActive={path === activePath}
          onActivate={() => onActivate(path)}
          onClose={() => onClose(path)}
        />
      ))}
    </div>
  );
}

interface FileTabProps {
  path: string;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}

function FileTab({ path, isActive, onActivate, onClose }: FileTabProps) {
  const label = getTabLabel(path);
  return (
    <div
      className={cn(
        // Mirrors TreeApp's DefaultTab: `group relative isolate` + overflow
        // hidden, so the gradient + close button can absolutely position on
        // top of the activate surface without eating into the layout.
        'group relative isolate flex h-7 max-w-[200px] shrink-0 items-center overflow-hidden rounded-sm text-xs font-medium transition-colors',
        isActive
          ? 'bg-surface-hover text-foreground'
          : 'text-muted hover:bg-surface-hover hover:text-foreground',
      )}
    >
      <button
        type='button'
        role='tab'
        aria-selected={isActive}
        onClick={onActivate}
        title={path}
        // pr-7 reserves the space the close button occupies so the label
        // never runs under it. The activate button owns the whole tab width,
        // which is what makes the click target predictable.
        className='relative z-0 flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-sm pr-7 pl-2 text-left'
      >
        <FileTypeIcon filePath={label} />
        <span className='block truncate'>{label}</span>
      </button>
      <button
        type='button'
        onClick={onClose}
        title='Close tab'
        aria-label={`Close ${label}`}
        // Absolutely positioned, `z-20`, above the gradient. This is what
        // makes close reliably win the click when it's visible.
        className={cn(
          'text-muted hover:text-foreground absolute top-1/2 right-1 z-20 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded transition-opacity',
          'hover:bg-surface/30 opacity-0',
          'group-hover:opacity-80 group-focus-within:opacity-80 focus:opacity-80',
        )}
      >
        <svg width='10' height='10' viewBox='0 0 10 10' aria-hidden='true'>
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
}
