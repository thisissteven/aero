import { useModelDirectory } from '@/app/features/chat-page/chat-input/models/use-model-directory';
import { useModelSelectionSync } from '@/app/features/chat-page/chat-input/models/use-model-selection-sync';
import { SearchableModel } from '@/app/lib/model';

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
  } = useModelDirectory();

  useModelSelectionSync(searchableModels, {
    selectedModel,
    setSelectedModel,
    favoriteModelIds,
    setFavoriteModelIds,
  });

  const selectModel = (model: SearchableModel) => {
    setSelectedModel(model);
  };

  const toggleFavorite = (event: React.MouseEvent, modelKey: string) => {
    event.stopPropagation();
    toggleFavoriteModel(modelKey);
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
