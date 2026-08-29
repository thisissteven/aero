import { Magnifier } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { Command } from '@aero/ui';

import { ModelGroups, useModelPicker } from './model-dropdown-shared';

interface ModelPickerProps {
  onModelSelect?: () => void;
}

export function ModelPicker({ onModelSelect }: ModelPickerProps) {
  const {
    selectedModel,
    favoriteModelIds,
    searchQuery,
    setSearchQuery,
    collapsedGroups,
    toggleGroupCollapse,
    favoriteModels,
    groupedProviders,
    totalResults,
    selectModel,
    toggleFavorite,
  } = useModelPicker();

  return (
    <div className='flex min-h-0 flex-col'>
      <Command>
        <Command.Dialog
          filter={() => true}
          className='max-w-full rounded-none border-none bg-transparent shadow-none'
        >
          <Command.InputGroup className='border-separator border-b'>
            <Command.InputGroup.Prefix>
              <Icon data={Magnifier} className='size-3.5' />
            </Command.InputGroup.Prefix>

            <Command.InputGroup.Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder='Search models or providers'
              className='py-2.5 text-sm'
            />
          </Command.InputGroup>

          {totalResults === 0 ? (
            <div className='text-muted flex h-24 items-center justify-center text-sm'>
              No models found.
            </div>
          ) : (
            <Command.List className='scroll-py-1 overflow-y-auto p-1 text-xs @md:max-h-72'>
              <ModelGroups
                favoriteModels={favoriteModels}
                groupedProviders={groupedProviders}
                selectedModelId={selectedModel?.id}
                favoriteModelIds={favoriteModelIds}
                collapsedGroups={collapsedGroups}
                onToggleGroup={toggleGroupCollapse}
                onSelect={(model) => {
                  selectModel(model);
                  onModelSelect?.();
                }}
                onFavorite={toggleFavorite}
              />
            </Command.List>
          )}
        </Command.Dialog>
      </Command>
    </div>
  );
}
