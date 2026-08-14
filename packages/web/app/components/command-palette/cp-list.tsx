import { useRef } from 'react';

import { Command } from '@aero/ui';

import { useCommandPaletteStore } from '@/app/components/command-palette/command-palette-store';
import { CommandPaletteListActions } from '@/app/components/command-palette/cp-list-actions';
import { CommandPaletteListSessions } from '@/app/components/command-palette/cp-list-sessions';

export function CommandPaletteList() {
  const listRef = useRef<HTMLDivElement | null>(null);

  const selectedFilters = useCommandPaletteStore(
    (state) => state.selectedFilters,
  );

  const showActions = selectedFilters.includes('Actions');
  const showSessions = selectedFilters.includes('Sessions');

  return (
    <Command.List
      ref={listRef}
      selectionMode='single'
      shouldFocusWrap={false}
      autoFocus='first'
      renderEmptyState={() => (
        <div className='text-muted flex h-16 items-center justify-center text-sm'>
          No files, sessions, and commands match that search.
        </div>
      )}
      className='scroll-py-8'
    >
      {showActions && <CommandPaletteListActions />}
      {showSessions && <CommandPaletteListSessions listRef={listRef} />}
    </Command.List>
  );
}
