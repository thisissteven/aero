import { useEffect } from 'react';

import { Command } from '@aero/ui';

import { useCommandPaletteStore } from '@/app/components/command-palette/command-palette-store';
import { CommandPaletteContainer } from '@/app/components/command-palette/cp-container';
import { CommandPaletteDebounceSync } from '@/app/components/command-palette/cp-debounce-sync';
import { CommandPaletteDialog } from '@/app/components/command-palette/cp-dialog';
import { CommandPaletteFooter } from '@/app/components/command-palette/cp-footer';
import { CommandPaletteHeader } from '@/app/components/command-palette/cp-header';
import { CommandPaletteInput } from '@/app/components/command-palette/cp-input';
import { CommandPaletteList } from '@/app/components/command-palette/cp-list';

export interface CommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (callback: () => void) => void;
}

export function CommandPalette() {
  const toggleIsSearchOpen = useCommandPaletteStore(
    (state) => state.toggleIsOpen,
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac =
        typeof navigator !== 'undefined' &&
        /Mac|iPhone|iPad/.test(navigator.platform);

      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault();
        toggleIsSearchOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleIsSearchOpen]);

  return (
    <Command>
      <CommandPaletteDebounceSync />
      <CommandPaletteContainer>
        <CommandPaletteDialog>
          <CommandPaletteInput />
          <CommandPaletteHeader />
          <CommandPaletteList />
          <CommandPaletteFooter />
        </CommandPaletteDialog>
      </CommandPaletteContainer>
    </Command>
  );
}
