'use client';

import { cn } from '@aero/ui';
import { memo } from 'react';
import { useIsDirty } from '@/app/components/chat-aside/files/file-edit-store';
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

export const FileTabs = memo(function FileTabs({
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
});

interface FileTabProps {
  path: string;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}

function FileTab({ path, isActive, onActivate, onClose }: FileTabProps) {
  const label = getTabLabel(path);
  const isUnsaved = useIsDirty(path);

  return (
    <div
      className={cn(
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
        title={isUnsaved ? `${path} (unsaved)` : path}
        // pr-7 reserves the right slot for the dot / X. Neither element
        // needs to be inside the activate button, so the button is free to
        // span the full width minus that slot.
        className='relative z-0 flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-sm pr-7 pl-2 text-left'
      >
        <FileTypeIcon filePath={label} />
        <span className='block truncate'>{label}</span>
      </button>

      {/*
        Slot: the dirty dot and the close X share the same right-hand
        position. The dot is the resting state (only when dirty); the X
        crossfades in on hover / focus and takes the slot. That's the
        "swap" — nothing moves, one control fades out while the other
        fades in over it.
      */}
      {isUnsaved && (
        <span
          aria-hidden='true'
          title='Unsaved changes'
          className={cn(
            'bg-accent pointer-events-none absolute top-1/2 right-2.75 z-10 h-1.5 w-1.5 -translate-y-1/2 rounded-full',
            'transition-opacity duration-150 ',
            'group-hover:opacity-0 group-focus-within:opacity-0',
          )}
        />
      )}

      <button
        type='button'
        onClick={onClose}
        title='Close tab'
        aria-label={`Close ${label}`}
        className={cn(
          'text-muted absolute top-1/2 right-1 z-20 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded',
          'transition-opacity duration-150',
          'hover:bg-surface hover:text-foreground',
          // Hidden and non-interactive by default. Pointer events re-enable
          // together with opacity so a stray click on the right edge of an
          // unhovered tab activates the tab instead of closing it.
          'pointer-events-none opacity-0',
          'group-hover:pointer-events-auto group-hover:opacity-80',
          'group-focus-within:pointer-events-auto group-focus-within:opacity-80',
          'focus:pointer-events-auto focus:opacity-100',
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
