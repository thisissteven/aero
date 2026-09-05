import { ChevronDown } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useState } from 'react';

import { cn, Command, Popover } from '@aero/ui';

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
import { SearchableModel } from '@/app/lib/model';

export interface WorkspaceModelDropdownProps {
  value?: string | null; // e.g., model ID stored in workspace config
  onChange?: (model: string) => void;
  disabled?: boolean;
  onAddProviderClick?: () => void;
}

export function WorkspaceModelDropdown({
  value,
  onChange,
  disabled = false,
  onAddProviderClick,
}: WorkspaceModelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // No favorites for this picker — favoriteModelIds is simply omitted.
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

  const selectedModelEntry =
    value && searchableModels.length > 0
      ? (searchableModels.find(({ model }) => model.id === value) ?? null)
      : null;

  const selectModel = (entry: SearchableModel) => {
    onChange?.(entry.model.id);
    setIsOpen(false);
  };

  const items = buildModelVirtualItems({
    favoriteModels,
    groupedProviders,
    collapsedGroups,
  });

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger className='flex-1'>
        <button
          disabled={disabled}
          className='text-foreground bg-field hover:bg-field-hover shadow-field flex w-full items-center justify-between gap-1.5 rounded-xl p-2.25'
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
        className='relative overflow-visible p-0'
        placement='top right'
      >
        <div ref={panelRef} className='relative flex items-start'>
          <div className='bg-overlay text-overlay-foreground border-border flex w-80 flex-col overflow-hidden rounded-xl border'>
            {onAddProviderClick && (
              <AddProviderRow onClick={onAddProviderClick} />
            )}

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
                    selectedModelId={selectedModelEntry?.model.id}
                    collapsedGroups={collapsedGroups}
                    onToggleGroup={toggleGroupCollapse}
                    onSelect={selectModel}
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
