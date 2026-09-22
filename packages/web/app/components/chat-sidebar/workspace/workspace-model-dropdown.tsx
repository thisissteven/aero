import { Command, cn, Popover } from '@aero/ui';
import { ChevronDown } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useState } from 'react';

import { ProviderLogo } from '@/app/components/provider-logo';
import { useChatSettingsStore } from '@/app/features/chat-page/chat-input/chat-settings-store';
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
import { useModelSelectionSyncFavorites } from '@/app/features/chat-page/chat-input/models/use-model-selection-sync';
import { getModelKey, SearchableModel } from '@/app/lib/model';
import { useTooltipStore } from '@/app/providers/global-tooltip/global-tooltip-store';

export interface WorkspaceModelDropdownProps {
  value?: string | null; // raw model.id stored in workspace config
  onChange?: (model: string) => void;
  disabled?: boolean;
}

export function WorkspaceModelDropdown({
  value,
  onChange,
  disabled = false,
}: WorkspaceModelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hideTooltip = useTooltipStore((state) => state.hideTooltip);

  const favoriteModelIds = useChatSettingsStore(
    (state) => state.favoriteModelIds,
  );

  const toggleFavoriteModel = useChatSettingsStore(
    (state) => state.toggleFavoriteModel,
  );

  const setFavoriteModelIds = useChatSettingsStore(
    (state) => state.setFavoriteModelIds,
  );

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

  // `value` is still the raw model.id from workspace config. If the same
  // model.id exists on multiple providers this picks the first match —
  // acceptable until workspace config stores composite keys.
  const selectedModelEntry =
    value && searchableModels.length > 0
      ? (searchableModels.find(({ model }) => model.id === value) ?? null)
      : null;

  const selectModel = (entry: SearchableModel) => {
    onChange?.(entry.model.id);
    setIsOpen(false);
    hideTooltip();
  };

  const items = buildModelVirtualItems({
    favoriteModels,
    groupedProviders,
    collapsedGroups,
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

  useModelSelectionSyncFavorites(searchableModels, {
    favoriteModelIds,
    setFavoriteModelIds,
  });

  const toggleFavorite = (event: React.MouseEvent, modelKey: string) => {
    event.stopPropagation();
    toggleFavoriteModel(modelKey);
  };

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) hideTooltip();
      }}
    >
      <Popover.Trigger className='flex-1'>
        <button
          disabled={disabled}
          className='text-foreground bg-default/60 hover:bg-default-hover/60 flex w-full items-center justify-between gap-1.5 rounded-xl px-3 py-2 transition'
        >
          <div className='flex items-center gap-1.5'>
            {selectedModelEntry && (
              <ProviderLogo
                providerId={selectedModelEntry.providerId}
                alt={selectedModelEntry.model.name}
                className='size-3.5'
              />
            )}

            {selectedModelEntry?.model.name ?? (
              <span className='text-muted'>No default model selected</span>
            )}
          </div>

          <Icon
            data={ChevronDown}
            className={cn(
              'size-3.5 transition',
              isOpen ? 'rotate-180' : 'rotate-0',
            )}
          />
        </button>
      </Popover.Trigger>

      <Popover.Content
        className='relative overflow-visible p-0 border-0'
        placement='top right'
      >
        <div ref={panelRef} className='relative flex items-start'>
          <div className='bg-surface text-overlay-foreground border border-separator rounded-xl flex w-80 flex-col overflow-hidden'>
            <AddProviderRow />

            <Command>
              <Command.Dialog
                filter={() => true}
                className='border-none rounded-none shadow-none'
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
                      selectedModelEntry
                        ? getModelKey(selectedModelEntry)
                        : undefined
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
