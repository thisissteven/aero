import { ReactNode } from 'react';

import { Command } from '@aero/ui';

import { useCommandPaletteStore } from '@/app/components/command-palette/command-palette-store';

export function CommandPaletteDialog({ children }: { children: ReactNode }) {
  const debouncedSearch = useCommandPaletteStore(
    (state) => state.debouncedSearch,
  );

  return (
    <Command.Dialog
      filter={(textValue, query) => {
        if (textValue === '__sentinel__') return true;
        return textValue
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase());
      }}
      inputValue={debouncedSearch}
      allowEscape
    >
      {children}
    </Command.Dialog>
  );
}
