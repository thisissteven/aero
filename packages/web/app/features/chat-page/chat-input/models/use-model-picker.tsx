import {
  buildModelVirtualItems,
  ModelEmptyState,
  ModelVirtualList,
} from '@/app/features/chat-page/chat-input/models/model-picker-parts';
import { useModelDirectory } from '@/app/features/chat-page/chat-input/models/use-model-directory';
import { useModelSelectionSync } from '@/app/features/chat-page/chat-input/models/use-model-selection-sync';
import { ModelItem, ProviderGroup, SearchableModel } from '@/app/lib/model';

import { useChatSettingsStore } from '../chat-settings-store';

export function useModelPicker() {
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

  const {
    searchableModels,
    searchQuery,
    setSearchQuery,
    favoriteModels,
    groupedProviders,
    totalResults,
    collapsedGroups,
    toggleGroupCollapse,
  } = useModelDirectory({ favoriteModelIds });

  useModelSelectionSync(searchableModels, {
    selectedModel,
    setSelectedModel,
    favoriteModelIds,
    setFavoriteModelIds,
  });

  const selectModel = (model: ModelItem) => {
    setSelectedModel({
      id: model.id,
      name: model.name,
      providerId: model.providerID,
    });
  };

  const toggleFavorite = (event: React.MouseEvent, modelId: string) => {
    event.stopPropagation();
    toggleFavoriteModel(modelId);
  };

  return {
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
  };
}

export interface ModelPickerListProps {
  favoriteModels: SearchableModel[];
  groupedProviders: ProviderGroup[];
  selectedModelId?: string;
  favoriteModelIds: string[];
  collapsedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
  onSelect: (model: ModelItem) => void;
  onFavorite: (event: React.MouseEvent, modelId: string) => void;
}

/**
 * Self-contained, virtualized replacement for the old `ModelGroups`
 * fragment.
 *
 * IMPORTANT integration change: `ModelGroups` used to return bare
 * `<Command.Group>` children meant to be nested inside a `<Command.List>`
 * that the caller owned. Virtualization needs one component to own the
 * whole flat item list, so `ModelPickerList` renders its own
 * `Virtualizer`/`Command.List` internally — remove any `Command.List` /
 * `Command`/`Command.Dialog` wrapper the call site had around the old
 * `ModelGroups` output, and just render `<ModelPickerList />` where the
 * list used to go.
 */
export function ModelPickerList({
  favoriteModels,
  groupedProviders,
  selectedModelId,
  favoriteModelIds,
  collapsedGroups,
  onToggleGroup,
  onSelect,
  onFavorite,
}: ModelPickerListProps) {
  const items = buildModelVirtualItems({
    favoriteModels,
    groupedProviders,
    collapsedGroups,
  });

  if (items.length === 0) {
    return <ModelEmptyState />;
  }

  return (
    <ModelVirtualList
      items={items}
      selectedModelId={selectedModelId}
      favoriteModelIds={favoriteModelIds}
      collapsedGroups={collapsedGroups}
      onToggleGroup={onToggleGroup}
      onSelect={(entry) => onSelect(entry.model)}
      onToggleFavorite={onFavorite}
    />
  );
}

/**
 * @deprecated Use `ModelPickerList` directly — kept only so existing
 * imports don't break during migration. See the integration note on
 * `ModelPickerList` above; the contract changed (it now owns its own
 * `Command.List`/`Virtualizer`).
 */
export const ModelGroups = ModelPickerList;
