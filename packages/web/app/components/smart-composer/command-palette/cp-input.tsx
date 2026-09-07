import { Magnifier } from '@gravity-ui/icons';

import { Command, Kbd } from '@aero/ui';

import { useCommandPaletteStore } from '@/app/components/command-palette/command-palette-store';

export function CommandPaletteInput() {
  const searchValue = useCommandPaletteStore((state) => state.searchValue);
  const setSearchValue = useCommandPaletteStore(
    (state) => state.setSearchValue,
  );

  return (
    <Command.InputGroup>
      <Command.InputGroup.Prefix>
        <Magnifier />
      </Command.InputGroup.Prefix>

      <Command.InputGroup.Input
        placeholder='Search for files, sessions, and actions'
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        autoFocus
      />

      <Command.InputGroup.ClearButton onClick={() => setSearchValue('')} />

      <Command.InputGroup.Suffix>
        <Kbd className='text-xs'>
          <Kbd.Content>Esc</Kbd.Content>
        </Kbd>
      </Command.InputGroup.Suffix>
    </Command.InputGroup>
  );
}
