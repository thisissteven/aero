import { Button, Command, Popover } from '@aero/ui';
import { useEffect, useState } from 'react';

import { ProviderLogo } from '@/app/components/provider-logo';
import { buildModelVirtualItems } from '@/app/features/chat-page/chat-input/models/build-model-virtual-items';
import {
  AddProviderRow,
  ModelEmptyState,
  ModelInfoPanelCard,
  ModelPickerFooter,
  ModelSearchInput,
  ModelVirtualList,
} from '@/app/features/chat-page/chat-input/models/model-picker-parts';
import { useModelDirectory } from '@/app/features/chat-page/chat-input/models/use-model-directory';
import { useModelInfoPanel } from '@/app/features/chat-page/chat-input/models/use-model-info-panel';
import { useModelSelectionSync } from '@/app/features/chat-page/chat-input/models/use-model-selection-sync';
import { getModelKey, SearchableModel } from '@/app/lib/model';

import { useChatSettingsStore } from './chat-settings-store';

export function ModelDropdown() {
  const selectedModel = useChatSettingsStore((state) => state.selectedModel);
  const setSelectedModel = useChatSettingsStore(
    (state) => state.setSelectedModel,
  );
  const favoriteModelIds = useChatSettingsStore(
    (state) => state.favoriteModelIds,
  );
  const toggleFavoriteModel = useChatSettingsStore(
    (state) => state.toggleFavoriteModel,
  );
  const setFavoriteModelIds = useChatSettingsStore(
    (state) => state.setFavoriteModelIds,
  );

  const [isOpen, setIsOpen] = useState(false);

  const {
    searchableModels,
    searchQuery,
    setSearchQuery,
    favoriteModels,
    groupedProviders,
    totalResults,
    collapsedGroups,
    toggleGroupCollapse,
    isModelVisible,
  } = useModelDirectory();

  useModelSelectionSync(searchableModels, {
    selectedModel,
    setSelectedModel,
    favoriteModelIds,
    setFavoriteModelIds,
  });

  const {
    activeModel,
    hoverTop,
    infoSide,
    panelRef,
    activateModel,
    clearIfStale,
  } = useModelInfoPanel();

  useEffect(() => {
    clearIfStale(isModelVisible);
  }, [clearIfStale, isModelVisible]);

  const selectModel = (entry: SearchableModel) => {
    setSelectedModel(entry);
    setIsOpen(false);
  };

  const toggleFavorite = (event: React.MouseEvent, modelKey: string) => {
    event.stopPropagation();
    toggleFavoriteModel(modelKey);
  };

  const items = buildModelVirtualItems({
    favoriteModels,
    groupedProviders,
    collapsedGroups,
  });

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button
        variant='ghost'
        size='sm'
        className='gap-1 rounded-lg pr-2 pl-1.5 text-xs group-data-[disabled=true]/prompt-input:pointer-events-none group-data-[disabled=true]/prompt-input:opacity-60'
      >
        {selectedModel && (
          <ProviderLogo
            providerId={selectedModel.providerId}
            alt={selectedModel.model.name}
            className='size-3.5'
          />
        )}

        {selectedModel?.model.name ?? (
          <span className='text-muted'>Select model</span>
        )}
      </Button>

      <Popover.Content
        className='relative overflow-visible border-0 p-0'
        placement='top right'
      >
        <div ref={panelRef} className='relative flex items-start'>
          {activeModel && (
            <ModelInfoPanelCard
              model={activeModel}
              top={hoverTop}
              side={infoSide}
            />
          )}

          <div className='bg-surface text-overlay-foreground border border-separator rounded-xl flex w-80 flex-col overflow-hidden'>
            <AddProviderRow />

            <Command>
              <Command.Dialog
                filter={() => true}
                className='border-none shadow-none rounded-none'
                allowEscape
              >
                <ModelSearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                />

                {totalResults === 0 ? (
                  <ModelEmptyState />
                ) : (
                  <ModelVirtualList
                    items={items}
                    selectedModelKey={
                      selectedModel ? getModelKey(selectedModel) : undefined
                    }
                    favoriteModelKeys={favoriteModelIds}
                    collapsedGroups={collapsedGroups}
                    onToggleGroup={toggleGroupCollapse}
                    onSelect={selectModel}
                    onToggleFavorite={toggleFavorite}
                    onActivate={activateModel}
                  />
                )}
              </Command.Dialog>
            </Command>

            <ModelPickerFooter />
          </div>
        </div>
      </Popover.Content>
    </Popover>
  );
}
