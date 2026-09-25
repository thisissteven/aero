import { Command, ToggleButton, Typography } from '@aero/ui';

import {
  defaultSelectedFilters,
  useCommandPaletteStore,
} from '@/app/components/command-palette/command-palette-store';
import { useI18n } from '@/app/hooks/i18n';

export function CommandPaletteHeader() {
  const { t } = useI18n();
  const selectedFilters = useCommandPaletteStore(
    (state) => state.selectedFilters,
  );
  const toggleSelectedFilters = useCommandPaletteStore(
    (state) => state.toggleSelectedFilters,
  );

  const filterLabels: Record<(typeof defaultSelectedFilters)[number], string> =
    {
      Actions: t.common.actions,
      Files: t.common.files,
      Sessions: t.commandPalette.sessions,
    };

  return (
    <Command.Header>
      <div className='flex flex-wrap items-center gap-1.5 pb-2 pl-2.5'>
        <Typography type='body-sm' className='text-muted'>
          {t.commandPalette.filters}
        </Typography>
        {defaultSelectedFilters.map((filter) => (
          <ToggleButton
            isSelected={selectedFilters.includes(filter)}
            onChange={() => toggleSelectedFilters(filter)}
            key={filter}
            size='sm'
            className='h-6 px-3 text-xs'
          >
            {filterLabels[filter]}
          </ToggleButton>
        ))}
      </div>
    </Command.Header>
  );
}
