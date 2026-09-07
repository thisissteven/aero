import { ReactNode } from 'react';

import { Command } from '@aero/ui';

import { useCommandPaletteStore } from '@/app/components/command-palette/command-palette-store';

export function CommandPaletteDialog({ children }: { children: ReactNode }) {
  const debouncedSearch = useCommandPaletteStore(
    (state) => state.debouncedSearch,
  );

  return (
    <Command.Dialog
      // Bypass client-side filtering since flatItems is pre-filtered
      filter={() => true}
      inputValue={debouncedSearch}
      allowEscape
    >
      {children}
    </Command.Dialog>
  );
}
