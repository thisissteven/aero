import { Magnifier } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { Command } from '@aero/ui';

import {
  ModelPickerList,
  useModelPicker,
} from '@/app/features/chat-page/chat-input/models/use-model-picker';

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
          allowEscape
        >
          <Command.InputGroup className='border-separator border-b'>
            <Command.InputGroup.Prefix>
              <Icon data={Magnifier} className='size-3.5' />
            </Command.InputGroup.Prefix>

            <Command.InputGroup.Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder='Search models or providers'
              className='py-2.5 pr-0 text-sm'
            />

            <Command.InputGroup.ClearButton
              onPress={() => setSearchQuery('')}
            />
          </Command.InputGroup>

          {totalResults === 0 ? (
            <div className='text-muted flex h-24 items-center justify-center text-sm'>
              No models found.
            </div>
          ) : (
            <ModelPickerList
              favoriteModels={favoriteModels}
              groupedProviders={groupedProviders}
              selectedModelId={selectedModel?.model.id}
              favoriteModelIds={favoriteModelIds}
              collapsedGroups={collapsedGroups}
              onToggleGroup={toggleGroupCollapse}
              onSelect={(model) => {
                selectModel(model);
                onModelSelect?.();
              }}
              onFavorite={toggleFavorite}
            />
          )}
        </Command.Dialog>
      </Command>
    </div>
  );
}
