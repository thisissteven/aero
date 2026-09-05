import { useEffect, useState } from 'react';

import { Button, Command, Popover } from '@aero/ui';

import { ProviderLogo } from '@/app/components/provider-logo';
import {
  AddProviderRow,
  buildModelVirtualItems,
  ModelEmptyState,
  ModelInfoPanelCard,
  ModelPickerFooter,
  ModelSearchInput,
  ModelVirtualList,
} from '@/app/features/chat-page/chat-input/models/model-picker-parts';
import { useModelDirectory } from '@/app/features/chat-page/chat-input/models/use-model-directory';
import { useModelInfoPanel } from '@/app/features/chat-page/chat-input/models/use-model-info-panel';
import { useModelSelectionSync } from '@/app/features/chat-page/chat-input/models/use-model-selection-sync';
import { SearchableModel } from '@/app/lib/model';

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
  } = useModelDirectory({ favoriteModelIds });

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
    setSelectedModel({
      id: entry.model.id,
      name: entry.model.name,
      providerId: entry.model.providerID,
    });
    setIsOpen(false);
  };

  const toggleFavorite = (event: React.MouseEvent, modelId: string) => {
    event.stopPropagation();
    toggleFavoriteModel(modelId);
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
        className='gap-1.5 rounded-lg px-2 text-xs group-data-[disabled=true]/prompt-input:pointer-events-none group-data-[disabled=true]/prompt-input:opacity-60'
      >
        {selectedModel && (
          <ProviderLogo
            providerId={selectedModel.providerId}
            alt={selectedModel.name}
            className='size-3.5'
          />
        )}

        {selectedModel?.name ?? (
          <span className='text-muted'>Select model</span>
        )}
      </Button>

      <Popover.Content
        className='relative overflow-visible p-0'
        placement='top right'
      >
        <div ref={panelRef} className='relative flex items-start'>
          <div className='bg-overlay text-overlay-foreground border-border flex w-80 flex-col overflow-hidden rounded-xl border'>
            {/* NOTE: preserved as-is from the original — this button has
                never had an onClick wired up. Pass one in if that was
                meant to open the add-provider flow. */}
            <AddProviderRow />

            <Command>
              <Command.Dialog
                filter={() => true}
                className='rounded-none border-none bg-transparent shadow-none'
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
                    selectedModelId={selectedModel?.id}
                    favoriteModelIds={favoriteModelIds}
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

          {activeModel && (
            <ModelInfoPanelCard
              model={activeModel}
              top={hoverTop}
              side={infoSide}
            />
          )}
        </div>
      </Popover.Content>
    </Popover>
  );
}
