import { Command, ToggleButton, Typography } from '@aero/ui';

import {
  defaultSelecedFilters,
  useCommandPaletteStore,
} from '@/app/components/command-palette/command-palette-store';

export function CommandPaletteHeader() {
  const selectedFilters = useCommandPaletteStore(
    (state) => state.selectedFilters,
  );
  const toggleSelectedFilters = useCommandPaletteStore(
    (state) => state.toggleSelectedFilters,
  );
  return (
    <Command.Header>
      <div className='flex flex-wrap items-center gap-1.5 pb-2 pl-2.5'>
        <Typography type='body-sm' className='text-muted'>
          Filters:
        </Typography>
        {defaultSelecedFilters.map((filter) => (
          <ToggleButton
            isSelected={selectedFilters.includes(filter)}
            onChange={() => toggleSelectedFilters(filter)}
            key={filter}
            size='sm'
            className='h-7 px-4 text-xs'
          >
            {filter}
          </ToggleButton>
        ))}
      </div>
    </Command.Header>
  );
}
