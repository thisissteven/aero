import { Command, Kbd } from '@aero/ui';
import { Magnifier } from '@gravity-ui/icons';

import { useCommandPaletteStore } from '@/app/components/command-palette/command-palette-store';
import { useI18n } from '@/app/hooks/i18n';

export function CommandPaletteInput() {
  const { t } = useI18n();
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
        placeholder={t.commandPalette.searchPlaceholder}
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
